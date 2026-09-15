#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REQUEST_SCRIPT="${SCRIPT_DIR}/test_prompt_request.sh"
SUITE_SCRIPT="${SCRIPT_DIR}/run_question_suite.sh"
FETCH_SCRIPT="${SCRIPT_DIR}/fetch_site_assets.sh"
TMP_DIR="$(mktemp -d)"
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

PORT_FILE="$TMP_DIR/port"
python3 - "$PORT_FILE" <<'PY' &
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

port_file = sys.argv[1]

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        length = int(self.headers.get("content-length", "0"))
        request = json.loads(self.rfile.read(length) or b"{}")
        if self.path == "/failure":
            body = json.dumps({"error": "mock failure"}).encode()
            self.send_response(502)
        else:
            question_id = "wrong-question" if self.path == "/wrong-id" else request.get("questionId", "")
            body = json.dumps({
                "Response": "mock Ross answer",
                "Sources": [{"title": "Mock source", "url": "https://example.test/source"}],
                "sessionId": "mock-session",
                "questionId": question_id,
            }).encode()
            self.send_response(200)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, _format, *_args):
        pass

server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
with open(port_file, "w", encoding="utf-8") as output:
    output.write(str(server.server_port))
server.serve_forever()
PY
SERVER_PID="$!"

for _ in {1..40}; do
  [[ -s "$PORT_FILE" ]] && break
  sleep 0.1
done
[[ -s "$PORT_FILE" ]] || { echo "mock server did not start" >&2; exit 1; }

ENDPOINT="http://127.0.0.1:$(cat "$PORT_FILE")"
QUESTION="What engineering programs are available?"

if RESULTS_DIR="$TMP_DIR/no-endpoint" bash "$REQUEST_SCRIPT" --question "$QUESTION" --bot-name ross-test >"$TMP_DIR/no-endpoint.out" 2>&1; then
  echo "request script accepted a missing endpoint" >&2
  exit 1
fi
if ! grep -Fq -- "--endpoint or ROSS_API_ENDPOINT is required" "$TMP_DIR/no-endpoint.out"; then
  cat "$TMP_DIR/no-endpoint.out" >&2
  exit 1
fi

if ! request_output="$(RESULTS_DIR="$TMP_DIR/request-ok" bash "$REQUEST_SCRIPT" --question "$QUESTION" --bot-name ross-test --endpoint "$ENDPOINT/ok" 2>&1)"; then
  printf '%s\n' "$request_output" >&2
  exit 1
fi
grep -Fq "HTTP status:   200" <<<"$request_output"
request_payload="$(find "$TMP_DIR/request-ok" -name '*.payload.json' -print -quit)"
jq -e 'has("custom_prompt") | not' "$request_payload" >/dev/null

if RESULTS_DIR="$TMP_DIR/request-failure" bash "$REQUEST_SCRIPT" --question "$QUESTION" --bot-name ross-test --endpoint "$ENDPOINT/failure" >"$TMP_DIR/request-failure.out" 2>&1; then
  echo "request script accepted an HTTP 502 response" >&2
  exit 1
fi
grep -Fq "HTTP status:   502" "$TMP_DIR/request-failure.out"

if RESULTS_DIR="$TMP_DIR/request-wrong-id" bash "$REQUEST_SCRIPT" --question "$QUESTION" --bot-name ross-test --endpoint "$ENDPOINT/wrong-id" >"$TMP_DIR/request-wrong-id.out" 2>&1; then
  echo "request script accepted a response with a mismatched question ID" >&2
  exit 1
fi
grep -Fq "questionId did not match" "$TMP_DIR/request-wrong-id.out"

cat > "$TMP_DIR/questions.json" <<'JSON'
{
  "sections": [{"id": "1", "name": "Smoke", "description": "Local mock transport test"}],
  "questions": [{"id": "Q001", "section": "1", "text": "What engineering programs are available?", "enabled": true}]
}
JSON

bash "$SUITE_SCRIPT"   --questions-file "$TMP_DIR/questions.json"   --runs-dir "$TMP_DIR/suite-ok"   --bot-name ross-test   --endpoint "$ENDPOINT/ok"   --sections 1 >"$TMP_DIR/suite-ok.out"

suite_record="$(find "$TMP_DIR/suite-ok" -name run_record.json -print -quit)"
jq -e '
  .validation.scope == "transport_only"
  and .summary.failed == 0
  and .results[0].status == "transport_ok"
  and .results[0].http_status == "200"
  and .results[0].request_question_id == .results[0].response_question_id
' "$suite_record" >/dev/null
suite_payload="$(find "$TMP_DIR/suite-ok" -name '*.payload.json' -print -quit)"
jq -e 'has("custom_prompt") | not' "$suite_payload" >/dev/null

if bash "$SUITE_SCRIPT"   --questions-file "$TMP_DIR/questions.json"   --runs-dir "$TMP_DIR/suite-failure"   --bot-name ross-test   --endpoint "$ENDPOINT/failure"   --sections 1 >"$TMP_DIR/suite-failure.out" 2>&1; then
  echo "suite accepted an HTTP 502 response" >&2
  exit 1
fi
failure_record="$(find "$TMP_DIR/suite-failure" -name run_record.json -print -quit)"
jq -e '
  .summary.failed == 1
  and .results[0].status == "request_failed"
  and .results[0].http_status == "502"
' "$failure_record" >/dev/null

if bash "$FETCH_SCRIPT" >"$TMP_DIR/fetch-no-args.out" 2>&1; then
  echo "legacy fetch utility accepted implicit source and output defaults" >&2
  exit 1
fi
grep -Fq "explicit-source-url" "$TMP_DIR/fetch-no-args.out"

echo "QA script contract tests passed."

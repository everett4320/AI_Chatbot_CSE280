#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
REQUEST_SCRIPT="${SCRIPT_DIR}/test_prompt_request.sh"
SUITE_SCRIPT="${SCRIPT_DIR}/run_question_suite.sh"
PROMPT_FILE="${REPO_ROOT}/christopher-handoff/backend-inputs/SYSTEM_PROMPT.txt"
TMP_DIR="$(mktemp -d)"
SERVER_PID=""
unset ROSS_API_ENDPOINT BOT_NAME CUSTOM_PROMPT_FILE

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

python3 - "$TMP_DIR/port" <<'PY' &
import json
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        request = json.loads(self.rfile.read(int(self.headers.get("content-length", "0"))))
        body = {"Response": "mock Ross answer", "Sources": []}
        status = 200
        if self.path == "/failure":
            status, body = 502, {"error": "mock failure"}
        elif self.path == "/invalid":
            body = {"Response": "   "}
        elif self.path == "/api-error":
            body = {"Response": "ignored", "error": "mock API error"}
        elif self.path == "/canonical":
            body.update(sessionId="canonical-session", questionId="canonical-question")
        elif self.path != "/no-ids":
            body.update(sessionId="mock-session", questionId=request["questionId"])
        encoded = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def log_message(self, *_args):
        pass

server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
with open(sys.argv[1], "w", encoding="utf-8") as output:
    output.write(str(server.server_port))
server.serve_forever()
PY
SERVER_PID="$!"
for _ in {1..40}; do
  [[ -s "$TMP_DIR/port" ]] && break
  sleep 0.1
done
[[ -s "$TMP_DIR/port" ]] || { echo "mock server did not start" >&2; exit 1; }
ENDPOINT="http://127.0.0.1:$(cat "$TMP_DIR/port")"
QUESTION="What engineering programs are available?"

expect_failure() {
  local expected="$1"; shift
  if "$@" > "$TMP_DIR/failure.out" 2>&1; then
    echo "Expected failure: $*" >&2
    exit 1
  fi
  grep -Fq -- "$expected" "$TMP_DIR/failure.out" || { cat "$TMP_DIR/failure.out" >&2; exit 1; }
}

expect_failure "--endpoint or ROSS_API_ENDPOINT is required" bash "$REQUEST_SCRIPT" --question "$QUESTION" --bot-name ross-test
expect_failure "--bot-name or BOT_NAME is required" bash "$REQUEST_SCRIPT" --question "$QUESTION" --endpoint "$ENDPOINT/ok"
expect_failure "--endpoint or ROSS_API_ENDPOINT is required" bash "$SUITE_SCRIPT" --bot-name ross-test
expect_failure "--bot-name is required" bash "$SUITE_SCRIPT" --endpoint "$ENDPOINT/ok"

RESULTS_DIR="$TMP_DIR/default-prompt" bash "$REQUEST_SCRIPT" --question "$QUESTION" --bot-name ross-test --endpoint "$ENDPOINT/ok" > "$TMP_DIR/request.out"
payload="$(find "$TMP_DIR/default-prompt" -name '*.payload.json' -print -quit)"
jq -e --rawfile expected "$PROMPT_FILE" '
  .custom_prompt == $expected and .remember_conversation == "True"
  and .action == "question" and .bot_name == "ross-test"
' "$payload" >/dev/null

# This catches the newline loss caused by Bash command substitution.
printf 'Prompt with a final blank line.\n\n' > "$TMP_DIR/prompt.txt"
RESULTS_DIR="$TMP_DIR/custom-prompt" bash "$REQUEST_SCRIPT" --question "$QUESTION" --bot-name ross-test --endpoint "$ENDPOINT/ok" --custom-prompt-file "$TMP_DIR/prompt.txt" > /dev/null
payload="$(find "$TMP_DIR/custom-prompt" -name '*.payload.json' -print -quit)"
jq -e --rawfile expected "$TMP_DIR/prompt.txt" '.custom_prompt == $expected' "$payload" >/dev/null

RESULTS_DIR="$TMP_DIR/no-ids" bash "$REQUEST_SCRIPT" --question "$QUESTION" --session-id follow-up-session --bot-name ross-test --endpoint "$ENDPOINT/no-ids" > "$TMP_DIR/no-ids.out"
grep -Fq 'Response session ID:  follow-up-session' "$TMP_DIR/no-ids.out"
request_id="$(sed -n 's/^Question ID:[[:space:]]*//p' "$TMP_DIR/no-ids.out")"
grep -Fq "Response question ID: $request_id" "$TMP_DIR/no-ids.out"

RESULTS_DIR="$TMP_DIR/canonical" bash "$REQUEST_SCRIPT" --question "$QUESTION" --bot-name ross-test --endpoint "$ENDPOINT/canonical" > "$TMP_DIR/canonical.out"
grep -Fq 'Response session ID:  canonical-session' "$TMP_DIR/canonical.out"
grep -Fq 'Response question ID: canonical-question' "$TMP_DIR/canonical.out"

for route in failure invalid api-error; do
  expect_failure 'Error:' env RESULTS_DIR="$TMP_DIR/$route" bash "$REQUEST_SCRIPT" --question "$QUESTION" --bot-name ross-test --endpoint "$ENDPOINT/$route"
done

# Use the actual default 52-question file, selecting just one mocked question.
bash "$SUITE_SCRIPT" --runs-dir "$TMP_DIR/suite-ok" --bot-name ross-test --endpoint "$ENDPOINT/ok" --only-codes Q001 > "$TMP_DIR/suite.out"
record="$(find "$TMP_DIR/suite-ok" -name run_record.json -print -quit)"
expected_sha="$(sha256sum "$PROMPT_FILE" | awk '{print $1}')"
jq -e --rawfile expected "$PROMPT_FILE" --arg expected_sha "$expected_sha" '
  .validation.scope == "transport_only" and .summary.executed == 1 and .summary.failed == 0
  and .config.questions_file == "christopher-handoff/validation/test_questions.json"
  and .prompt.text == $expected and .prompt.sha256 == $expected_sha
  and .results[0].status == "transport_ok" and .results[0].http_status == "200"
' "$record" >/dev/null
snapshot="$(dirname "$record")/prompt_snapshot.txt"
cmp "$PROMPT_FILE" "$snapshot"

cat > "$TMP_DIR/questions.json" <<'JSON'
{"sections":[{"id":"1","name":"Mock"}],"questions":[
  {"id":"Q001","section":"1","text":"Enabled","enabled":true},
  {"id":"Q002","section":"1","text":"Disabled","enabled":false}
]}
JSON
bash "$SUITE_SCRIPT" --questions-file "$TMP_DIR/questions.json" --runs-dir "$TMP_DIR/suite-disabled" --bot-name ross-test --endpoint "$ENDPOINT/ok" > /dev/null
record="$(find "$TMP_DIR/suite-disabled" -name run_record.json -print -quit)"
jq -e '.summary.enabled == 1 and .summary.executed == 1 and .results[0].id == "Q001"' "$record" >/dev/null

expect_failure '[FAIL] Q001' bash "$SUITE_SCRIPT" --runs-dir "$TMP_DIR/suite-failure" --bot-name ross-test --endpoint "$ENDPOINT/failure" --only-codes Q001
record="$(find "$TMP_DIR/suite-failure" -name run_record.json -print -quit)"
jq -e '.summary.failed == 1 and .results[0].http_status == "502"' "$record" >/dev/null

echo "QA script contract tests passed."

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ENDPOINT="${ROSS_API_ENDPOINT:-}"
BOT_NAME="${BOT_NAME:-}"
CUSTOM_PROMPT_FILE="${CUSTOM_PROMPT_FILE:-christopher-handoff/backend-inputs/SYSTEM_PROMPT.txt}"
RESULTS_DIR="${RESULTS_DIR:-validation-runs/single-requests}"
QUESTION=""
QUESTION_CODE=""
SESSION_ID=""

resolve_path() {
  if [[ "$1" = /* ]]; then printf '%s\n' "$1"; else printf '%s\n' "${REPO_ROOT}/$1"; fi
}

usage() {
  cat <<'USAGE'
Usage:
  bash scripts/test_prompt_request.sh --question "..." --bot-name name --endpoint url [options]

Options:
  --question-code Q001       Label saved request files
  --session-id id            Reuse a returned session for a follow-up
  --custom-prompt-file path  Prompt file (default: handoff SYSTEM_PROMPT.txt)

Uses the frontend's full prompt and remember_conversation:"True".
Set RESULTS_DIR to change the default validation-runs/single-requests output.
Endpoint and bot name must be supplied explicitly (or via ROSS_API_ENDPOINT/BOT_NAME).
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --question) QUESTION="$2"; shift 2 ;;
    --question-code) QUESTION_CODE="$2"; shift 2 ;;
    --session-id) SESSION_ID="$2"; shift 2 ;;
    --custom-prompt-file|--prompt-file) CUSTOM_PROMPT_FILE="$2"; shift 2 ;;
    --bot-name) BOT_NAME="$2"; shift 2 ;;
    --endpoint) ENDPOINT="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Error: unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

[[ -n "$QUESTION" ]] || { echo "Error: --question is required." >&2; exit 1; }
BOT_NAME="$(printf '%s' "$BOT_NAME" | xargs)"
[[ -n "$BOT_NAME" ]] || { echo "Error: --bot-name or BOT_NAME is required." >&2; exit 1; }
[[ -n "$ENDPOINT" ]] || { echo "Error: --endpoint or ROSS_API_ENDPOINT is required." >&2; exit 1; }
[[ "$ENDPOINT" =~ ^https?://[^/[:space:]]+ ]] || { echo "Error: endpoint must be an absolute http(s) URL." >&2; exit 1; }
for dependency in jq curl; do
  command -v "$dependency" >/dev/null || { echo "Error: $dependency is required." >&2; exit 1; }
done

CUSTOM_PROMPT_FILE_ABS="$(resolve_path "$CUSTOM_PROMPT_FILE")"
[[ -s "$CUSTOM_PROMPT_FILE_ABS" ]] || { echo "Error: prompt file is missing or empty: $CUSTOM_PROMPT_FILE" >&2; exit 1; }
RESULTS_DIR_ABS="$(resolve_path "$RESULTS_DIR")"
SESSION_ID="${SESSION_ID:-session-$(date +%s)-$RANDOM}"
QUESTION_CODE_SAFE="$(printf '%s' "${QUESTION_CODE:-question}" | tr -cd 'A-Za-z0-9_-')"
QUESTION_ID="${QUESTION_CODE_SAFE:-question}-$(date +%s)-$RANDOM"

mkdir -p "$RESULTS_DIR_ABS"
TAG="$(date -u +%Y%m%dT%H%M%SZ)_${QUESTION_ID}"
PAYLOAD_FILE="${RESULTS_DIR_ABS}/${TAG}.payload.json"
RESPONSE_FILE="${RESULTS_DIR_ABS}/${TAG}.response.json"

# --rawfile preserves the prompt's trailing newlines, matching Vite's ?raw import.
jq -n \
  --arg bot_name "$BOT_NAME" --arg userMessage "$QUESTION" \
  --arg sessionId "$SESSION_ID" --arg questionId "$QUESTION_ID" \
  --rawfile custom_prompt "$CUSTOM_PROMPT_FILE_ABS" \
  '{action:"question",bot_name:$bot_name,httpMethod:"POST",remember_conversation:"True",
    custom_prompt:$custom_prompt,userMessage:$userMessage,sessionId:$sessionId,questionId:$questionId}' > "$PAYLOAD_FILE"

echo "Endpoint:      $ENDPOINT"
echo "Session ID:    $SESSION_ID"
echo "Question ID:   $QUESTION_ID"
echo "Prompt file:   $CUSTOM_PROMPT_FILE"
echo "Payload file:  $PAYLOAD_FILE"
echo "Response file: $RESPONSE_FILE"

set +e
HTTP_STATUS=$(curl -sS --show-error --connect-timeout 10 --max-time 120 \
  -o "$RESPONSE_FILE" -w '%{http_code}' -X POST "$ENDPOINT" \
  -H "Accept: application/json" -H "Content-Type: application/json" \
  --data-binary "@$PAYLOAD_FILE")
CURL_EXIT=$?
set -e
echo "HTTP status:   ${HTTP_STATUS:-000}"
[[ $CURL_EXIT -eq 0 ]] || { echo "Error: HTTP request failed (curl exit $CURL_EXIT)." >&2; exit "$CURL_EXIT"; }
[[ "$HTTP_STATUS" =~ ^2[0-9][0-9]$ ]] || { echo "Error: Ross endpoint returned HTTP $HTTP_STATUS." >&2; exit 1; }
if ! jq -e 'type == "object" and (.Response | type == "string" and test("\\S")) and (.error == null or .error == false or .error == "")' "$RESPONSE_FILE" >/dev/null 2>&1; then
  echo "Error: Ross endpoint returned an API error or invalid Response." >&2
  exit 1
fi

# IDs are optional. Adopt returned canonical IDs, as the frontend does.
RESPONSE_SESSION_ID=$(jq -r --arg fallback "$SESSION_ID" '.sessionId // $fallback' "$RESPONSE_FILE")
RESPONSE_QUESTION_ID=$(jq -r --arg fallback "$QUESTION_ID" '.questionId // $fallback' "$RESPONSE_FILE")
echo "Response session ID:  $RESPONSE_SESSION_ID"
echo "Response question ID: $RESPONSE_QUESTION_ID"
jq '{Response, Sources, sessionId, questionId}' "$RESPONSE_FILE"

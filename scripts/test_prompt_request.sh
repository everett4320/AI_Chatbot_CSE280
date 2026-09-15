#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

LEGACY_SHARED_ENDPOINT="https://8lyrpsdez5.execute-api.us-east-1.amazonaws.com/call"
ENDPOINT="${ROSS_API_ENDPOINT:-${ENDPOINT:-}}"
BOT_NAME="${BOT_NAME:-}"
MODEL_ID=""
SOURCE_URI_FILTER=""
CUSTOM_PROMPT_FILE="${CUSTOM_PROMPT_FILE-}"
RESULTS_DIR="${RESULTS_DIR:-fetched_site/prompt_effectiveness_runs/single_requests}"
QUESTION=""
QUESTION_CODE=""

resolve_path() {
  local p="$1"
  if [[ "$p" = /* ]]; then
    printf '%s\n' "$p"
  else
    printf '%s\n' "${REPO_ROOT}/${p}"
  fi
}

to_repo_relative() {
  local p="$1"
  if [[ "$p" == "${REPO_ROOT}/"* ]]; then
    printf '%s\n' "${p#${REPO_ROOT}/}"
  else
    printf '%s\n' "$p"
  fi
}

validate_endpoint() {
  local endpoint="$1"

  if [[ -z "$endpoint" ]]; then
    echo "Error: --endpoint or ROSS_API_ENDPOINT is required for Ross QA." >&2
    exit 1
  fi
  if [[ "$endpoint" == "$LEGACY_SHARED_ENDPOINT" ]]; then
    echo "Error: the historical shared endpoint is not a Ross endpoint. Supply Christopher's assigned endpoint." >&2
    exit 1
  fi
  if ! [[ "$endpoint" =~ ^https?:// ]]; then
    echo "Error: endpoint must be an absolute http(s) URL." >&2
    exit 1
  fi
}

usage() {
  cat <<USAGE
Usage:
  $0 --question "..." --bot-name name --endpoint url [--question-code Q001] [--custom-prompt-file path] [--model-id id] [--source-uri-filter csv]

Notes:
  - --endpoint (or ROSS_API_ENDPOINT) must be Christopher's assigned Ross endpoint.
  - The default request uses the clone's configured backend prompt.
  - --custom-prompt-file is an explicit exploratory override; it does not prove persistent clone configuration.
  - Outputs payload and response files under fetched_site/prompt_effectiveness_runs/single_requests/ by default.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --question)
      QUESTION="$2"
      shift 2
      ;;
    --question-code)
      QUESTION_CODE="$2"
      shift 2
      ;;
    --custom-prompt-file|--prompt-file)
      CUSTOM_PROMPT_FILE="$2"
      shift 2
      ;;
    --model-id)
      MODEL_ID="$2"
      shift 2
      ;;
    --source-uri-filter)
      SOURCE_URI_FILTER="$2"
      shift 2
      ;;
    --bot-name)
      BOT_NAME="$2"
      shift 2
      ;;
    --endpoint)
      ENDPOINT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$QUESTION" ]]; then
  echo "Error: --question is required." >&2
  usage
  exit 1
fi

BOT_NAME="$(echo "$BOT_NAME" | xargs)"
if [[ -z "$BOT_NAME" ]]; then
  echo "Error: --bot-name is required. Refusing to send a Ross QA request to a default bot." >&2
  exit 1
fi

validate_endpoint "$ENDPOINT"

CUSTOM_PROMPT_FILE_ABS=""
if [[ -n "$CUSTOM_PROMPT_FILE" ]]; then
  CUSTOM_PROMPT_FILE_ABS="$(resolve_path "$CUSTOM_PROMPT_FILE")"
  if [[ ! -f "$CUSTOM_PROMPT_FILE_ABS" ]]; then
    echo "Error: custom prompt file not found: $(to_repo_relative "$CUSTOM_PROMPT_FILE_ABS")" >&2
    exit 1
  fi
fi
RESULTS_DIR_ABS="$(resolve_path "$RESULTS_DIR")"

SESSION_ID="session-$(date +%s)-$RANDOM"
if [[ -n "$QUESTION_CODE" ]]; then
  QUESTION_CODE_SAFE=$(echo "$QUESTION_CODE" | tr -cd 'A-Za-z0-9_-')
  if [[ -z "$QUESTION_CODE_SAFE" ]]; then
    QUESTION_CODE_SAFE="question"
  fi
  QUESTION_ID="${QUESTION_CODE_SAFE}-$(date +%s)-$RANDOM"
else
  QUESTION_ID="question-$(date +%s)-$RANDOM"
fi

payload=$(jq -n \
  --arg action "question" \
  --arg bot_name "$BOT_NAME" \
  --arg httpMethod "POST" \
  --arg userMessage "$QUESTION" \
  --arg sessionId "$SESSION_ID" \
  --arg questionId "$QUESTION_ID" \
  '{action:$action,bot_name:$bot_name,httpMethod:$httpMethod,userMessage:$userMessage,sessionId:$sessionId,questionId:$questionId}')

if [[ -n "$MODEL_ID" ]]; then
  payload=$(jq --arg model_id "$MODEL_ID" '. + {model_id:$model_id}' <<< "$payload")
fi

if [[ -n "$SOURCE_URI_FILTER" ]]; then
  IFS=',' read -r -a __filters <<< "$SOURCE_URI_FILTER"
  __filter_count=0
  for __f in "${__filters[@]}"; do
    __trimmed=$(echo "$__f" | xargs)
    if [[ -n "$__trimmed" ]]; then
      __filter_count=$((__filter_count + 1))
    fi
  done
  if [[ $__filter_count -lt 2 ]]; then
    echo "Error: --source-uri-filter currently requires at least 2 comma-separated entries (backend constraint)." >&2
    echo "Example: --source-uri-filter \"policy,faq\"" >&2
    echo "If you do not need filtering, omit --source-uri-filter." >&2
    exit 1
  fi
  payload=$(jq --arg source_uri_filter "$SOURCE_URI_FILTER" '. + {source_uri_filter:$source_uri_filter}' <<< "$payload")
fi

CUSTOM_PROMPT_CONTENT=""
PROMPT_MODE="backend_configured_prompt"
if [[ -n "$CUSTOM_PROMPT_FILE_ABS" ]]; then
  CUSTOM_PROMPT_CONTENT=$(cat "$CUSTOM_PROMPT_FILE_ABS")
  if [[ -z "$CUSTOM_PROMPT_CONTENT" ]]; then
    echo "Error: custom prompt file is empty. Omit it to test the configured backend prompt." >&2
    exit 1
  fi
  payload=$(jq --arg custom_prompt "$CUSTOM_PROMPT_CONTENT" '. + {custom_prompt:$custom_prompt}' <<< "$payload")
  PROMPT_MODE="exploratory_custom_prompt from $(to_repo_relative "$CUSTOM_PROMPT_FILE_ABS")"
fi

mkdir -p "$RESULTS_DIR_ABS"
TS_UTC=$(date -u +"%Y%m%dT%H%M%SZ")
TAG="${TS_UTC}_${SESSION_ID}_${QUESTION_ID}"
PAYLOAD_FILE="${RESULTS_DIR_ABS}/${TAG}.payload.json"
RESPONSE_FILE="${RESULTS_DIR_ABS}/${TAG}.response.json"
PAYLOAD_FILE_DISPLAY="$(to_repo_relative "$PAYLOAD_FILE")"
RESPONSE_FILE_DISPLAY="$(to_repo_relative "$RESPONSE_FILE")"

printf '%s\n' "$payload" > "$PAYLOAD_FILE"

echo "Endpoint:      $ENDPOINT"
echo "Session ID:    $SESSION_ID"
if [[ -n "$QUESTION_CODE" ]]; then
  echo "Question code: $QUESTION_CODE"
fi
echo "Question ID:   $QUESTION_ID"
echo "Prompt mode:   $PROMPT_MODE"
echo "Payload file:  $PAYLOAD_FILE_DISPLAY"
echo "Response file: $RESPONSE_FILE_DISPLAY"

set +e
HTTP_STATUS=$(curl -sS --show-error -o "$RESPONSE_FILE" -w '%{http_code}' -X POST "$ENDPOINT" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "$payload")
CURL_EXIT=$?
set -e

echo "HTTP status:   ${HTTP_STATUS:-000}"

if [[ $CURL_EXIT -ne 0 ]]; then
  echo "Error: HTTP request failed (curl exit $CURL_EXIT)." >&2
  exit "$CURL_EXIT"
fi

if ! [[ "$HTTP_STATUS" =~ ^2[0-9][0-9]$ ]]; then
  echo "Error: Ross endpoint returned HTTP $HTTP_STATUS." >&2
  exit 1
fi

if ! jq -e '((.Response | type == "string" and length > 0) or (.error | type == "string" and length > 0))' "$RESPONSE_FILE" >/dev/null 2>&1; then
  echo "Error: Ross endpoint returned a non-JSON or unsupported response body." >&2
  exit 1
fi

if jq -e '(.error // "") | type == "string" and length > 0' "$RESPONSE_FILE" >/dev/null 2>&1; then
  echo "Error: Ross endpoint returned an API error." >&2
  exit 1
fi

RESPONSE_SESSION_ID=$(jq -r '.sessionId // ""' "$RESPONSE_FILE")
RESPONSE_QUESTION_ID=$(jq -r '.questionId // ""' "$RESPONSE_FILE")
if [[ -z "$RESPONSE_SESSION_ID" ]]; then
  echo "Error: Ross endpoint response omitted sessionId." >&2
  exit 1
fi
if [[ "$RESPONSE_QUESTION_ID" != "$QUESTION_ID" ]]; then
  echo "Error: Ross endpoint response questionId did not match this request." >&2
  exit 1
fi

echo "Response session ID:  $RESPONSE_SESSION_ID"
echo "Response question ID: $RESPONSE_QUESTION_ID"

echo
echo "Response preview:"
if jq . "$RESPONSE_FILE" >/dev/null 2>&1; then
  jq '{Response, Sources, sessionId, questionId, error}' "$RESPONSE_FILE"
else
  head -n 20 "$RESPONSE_FILE"
fi

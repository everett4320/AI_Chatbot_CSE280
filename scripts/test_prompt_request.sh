#!/usr/bin/env bash
set -euo pipefail

ENDPOINT="${ENDPOINT:-https://8lyrpsdez5.execute-api.us-east-1.amazonaws.com/call}"
BOT_NAME="${BOT_NAME:-le-chat}"
MODEL_ID=""
SOURCE_URI_FILTER=""
CUSTOM_PROMPT_FILE="${CUSTOM_PROMPT_FILE:-fetched_site/prompts/custom_prompt.txt}"
QUESTION=""
QUESTION_CODE=""

usage() {
  cat <<USAGE
Usage:
  $0 --question "..." [--question-code Q001] [--custom-prompt-file path] [--model-id id] [--source-uri-filter csv] [--bot-name name] [--endpoint url]

Notes:
  - If custom prompt file is non-empty, request includes custom_prompt.
  - If custom prompt file is empty, request uses backend default prompt.
  - Outputs payload and response files under fetched_site/test_results/.
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

mkdir -p "$(dirname "$CUSTOM_PROMPT_FILE")"
if [[ ! -f "$CUSTOM_PROMPT_FILE" ]]; then
  : > "$CUSTOM_PROMPT_FILE"
fi

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

CUSTOM_PROMPT_CONTENT=$(cat "$CUSTOM_PROMPT_FILE")
if [[ -n "$CUSTOM_PROMPT_CONTENT" ]]; then
  payload=$(jq --arg custom_prompt "$CUSTOM_PROMPT_CONTENT" '. + {custom_prompt:$custom_prompt}' <<< "$payload")
  PROMPT_MODE="custom_prompt from ${CUSTOM_PROMPT_FILE}"
else
  PROMPT_MODE="backend default prompt (custom prompt file is empty)"
fi

mkdir -p fetched_site/test_results
TS_UTC=$(date -u +"%Y%m%dT%H%M%SZ")
TAG="${TS_UTC}_${SESSION_ID}_${QUESTION_ID}"
PAYLOAD_FILE="fetched_site/test_results/${TAG}.payload.json"
RESPONSE_FILE="fetched_site/test_results/${TAG}.response.json"

printf '%s\n' "$payload" > "$PAYLOAD_FILE"

curl -sS -X POST "$ENDPOINT" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d "$payload" > "$RESPONSE_FILE"

echo "Endpoint:      $ENDPOINT"
echo "Session ID:    $SESSION_ID"
if [[ -n "$QUESTION_CODE" ]]; then
  echo "Question code: $QUESTION_CODE"
fi
echo "Question ID:   $QUESTION_ID"
echo "Prompt mode:   $PROMPT_MODE"
echo "Payload file:  $PAYLOAD_FILE"
echo "Response file: $RESPONSE_FILE"

echo
echo "Response preview:"
if jq . "$RESPONSE_FILE" >/dev/null 2>&1; then
  jq '{Response, Sources, sessionId, questionId, error}' "$RESPONSE_FILE"
else
  head -n 20 "$RESPONSE_FILE"
fi

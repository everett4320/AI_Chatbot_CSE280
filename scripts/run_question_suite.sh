#!/usr/bin/env bash
set -euo pipefail

QUESTIONS_FILE="${QUESTIONS_FILE:-fetched_site/questions/test_questions.json}"
CUSTOM_PROMPT_FILE="${CUSTOM_PROMPT_FILE:-fetched_site/prompts/custom_prompt.txt}"
MODEL_ID=""
SOURCE_URI_FILTER=""
BOT_NAME=""
ENDPOINT=""
ONLY_CODES=""
SLEEP_SECONDS="0"

usage() {
  cat <<USAGE
Usage:
  bash scripts/run_question_suite.sh [options]

Options:
  --questions-file path         JSON file with numbered questions
  --custom-prompt-file path     Prompt file (non-empty => send custom_prompt)
  --model-id id                 Optional Bedrock model ID
  --source-uri-filter csv       Optional source filter (at least 2 entries if used)
  --bot-name name               Optional bot name
  --endpoint url                Optional API endpoint
  --only-codes Q001,Q003        Run only selected question IDs
  --sleep-seconds N             Sleep between requests (default: 0)
  -h, --help                    Show help

Quick start:
  bash scripts/run_question_suite.sh
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --questions-file)
      QUESTIONS_FILE="$2"
      shift 2
      ;;
    --custom-prompt-file)
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
    --only-codes)
      ONLY_CODES="$2"
      shift 2
      ;;
    --sleep-seconds)
      SLEEP_SECONDS="$2"
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

if ! command -v jq >/dev/null 2>&1; then
  echo "Error: jq is required." >&2
  exit 1
fi

if [[ ! -f "$QUESTIONS_FILE" ]]; then
  echo "Error: questions file not found: $QUESTIONS_FILE" >&2
  exit 1
fi

if ! jq -e '.questions | type == "array"' "$QUESTIONS_FILE" >/dev/null 2>&1; then
  echo "Error: invalid questions JSON format. Expect top-level .questions array." >&2
  exit 1
fi

should_run_code() {
  local code="$1"
  local item trimmed
  if [[ -z "$ONLY_CODES" ]]; then
    return 0
  fi
  IFS=',' read -r -a __codes <<< "$ONLY_CODES"
  for item in "${__codes[@]}"; do
    trimmed=$(echo "$item" | xargs)
    if [[ "$trimmed" == "$code" ]]; then
      return 0
    fi
  done
  return 1
}

enabled_count=$(jq '[.questions[] | select((.enabled // true) == true)] | length' "$QUESTIONS_FILE")

if [[ "$enabled_count" -eq 0 ]]; then
  echo "No enabled questions found in $QUESTIONS_FILE"
  exit 0
fi

total=0
ran=0
failed=0

echo "Questions file:      $QUESTIONS_FILE"
echo "Custom prompt file:  $CUSTOM_PROMPT_FILE"
echo "Total enabled items: $enabled_count"
echo

while IFS=$'\t' read -r qid qtext; do
  total=$((total + 1))

  if [[ -z "$qid" || -z "$qtext" ]]; then
    echo "[SKIP] Item #$total is missing id or text."
    continue
  fi

  if ! should_run_code "$qid"; then
    continue
  fi

  ran=$((ran + 1))
  echo "[$qid] $qtext"

  cmd=(./scripts/test_prompt_request.sh --question "$qtext" --question-code "$qid" --custom-prompt-file "$CUSTOM_PROMPT_FILE")
  if [[ -n "$MODEL_ID" ]]; then
    cmd+=(--model-id "$MODEL_ID")
  fi
  if [[ -n "$SOURCE_URI_FILTER" ]]; then
    cmd+=(--source-uri-filter "$SOURCE_URI_FILTER")
  fi
  if [[ -n "$BOT_NAME" ]]; then
    cmd+=(--bot-name "$BOT_NAME")
  fi
  if [[ -n "$ENDPOINT" ]]; then
    cmd+=(--endpoint "$ENDPOINT")
  fi

  if ! "${cmd[@]}"; then
    failed=$((failed + 1))
    echo "[FAIL] $qid"
  fi

  if [[ "$SLEEP_SECONDS" != "0" ]]; then
    sleep "$SLEEP_SECONDS"
  fi

  echo
done < <(jq -r '.questions[] | select((.enabled // true) == true) | [(.id // ""), (.text // "")] | @tsv' "$QUESTIONS_FILE")

echo "Run summary:"
echo "  Enabled in file: $enabled_count"
echo "  Executed:        $ran"
echo "  Failed:          $failed"

if [[ $failed -gt 0 ]]; then
  exit 1
fi

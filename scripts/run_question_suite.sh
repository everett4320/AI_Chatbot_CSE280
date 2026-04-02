#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

DEFAULT_ENDPOINT="https://8lyrpsdez5.execute-api.us-east-1.amazonaws.com/call"
DEFAULT_BOT_NAME="le-chat"

QUESTIONS_FILE="${QUESTIONS_FILE:-fetched_site/questions/test_questions.json}"
CUSTOM_PROMPT_FILE="${CUSTOM_PROMPT_FILE:-fetched_site/prompts/custom_prompt.txt}"
RUNS_DIR="${RUNS_DIR:-fetched_site/prompt_effectiveness_runs}"
MODEL_ID=""
SOURCE_URI_FILTER=""
BOT_NAME=""
ENDPOINT=""
ONLY_CODES=""
SECTIONS=""
SLEEP_SECONDS="0"

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

sha256_text() {
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then
    shasum -a 256 | awk '{print $1}'
  else
    printf 'unavailable\n'
  fi
}

usage() {
  cat <<USAGE
Usage:
  bash scripts/run_question_suite.sh [options]

Options:
  --questions-file path         JSON file with numbered questions and sections
  --custom-prompt-file path     Prompt file (non-empty => send custom_prompt)
  --runs-dir path               Directory for per-run records
  --model-id id                 Optional Bedrock model ID
  --source-uri-filter csv       Optional source filter (at least 2 entries if used)
  --bot-name name               Optional bot name
  --endpoint url                Optional API endpoint
  --sections 13                 Sections to run (e.g., 123, 13, 2). If omitted, interactive prompt is shown.
  --only-codes Q001,Q003        Run only selected question IDs (applies after section filtering)
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
    --runs-dir)
      RUNS_DIR="$2"
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
    --sections)
      SECTIONS="$2"
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

QUESTIONS_FILE_ABS="$(resolve_path "$QUESTIONS_FILE")"
CUSTOM_PROMPT_FILE_ABS="$(resolve_path "$CUSTOM_PROMPT_FILE")"
RUNS_DIR_ABS="$(resolve_path "$RUNS_DIR")"

QUESTIONS_FILE_DISPLAY="$(to_repo_relative "$QUESTIONS_FILE_ABS")"
CUSTOM_PROMPT_FILE_DISPLAY="$(to_repo_relative "$CUSTOM_PROMPT_FILE_ABS")"
RUNS_DIR_DISPLAY="$(to_repo_relative "$RUNS_DIR_ABS")"

if [[ ! -f "$QUESTIONS_FILE_ABS" ]]; then
  echo "Error: questions file not found: $QUESTIONS_FILE_DISPLAY" >&2
  exit 1
fi

if ! jq -e '.questions | type == "array"' "$QUESTIONS_FILE_ABS" >/dev/null 2>&1; then
  echo "Error: invalid questions JSON format. Expect top-level .questions array." >&2
  exit 1
fi

if ! jq -e '[.questions[] | (.section // empty | tostring)] | all(length > 0)' "$QUESTIONS_FILE_ABS" >/dev/null 2>&1; then
  echo "Error: each question must include a non-empty section field." >&2
  exit 1
fi

mkdir -p "$(dirname "$CUSTOM_PROMPT_FILE_ABS")"
if [[ ! -f "$CUSTOM_PROMPT_FILE_ABS" ]]; then
  : > "$CUSTOM_PROMPT_FILE_ABS"
fi

CUSTOM_PROMPT_CONTENT="$(cat "$CUSTOM_PROMPT_FILE_ABS")"
if [[ -n "$CUSTOM_PROMPT_CONTENT" ]]; then
  PROMPT_MODE="custom_prompt"
else
  PROMPT_MODE="backend_default"
fi
PROMPT_SHA256="$(printf '%s' "$CUSTOM_PROMPT_CONTENT" | sha256_text)"

EFFECTIVE_ENDPOINT="$DEFAULT_ENDPOINT"
if [[ -n "$ENDPOINT" ]]; then
  EFFECTIVE_ENDPOINT="$ENDPOINT"
fi

EFFECTIVE_BOT_NAME="$DEFAULT_BOT_NAME"
if [[ -n "$BOT_NAME" ]]; then
  EFFECTIVE_BOT_NAME="$BOT_NAME"
fi

AVAILABLE_SECTIONS_NL="$(jq -r '. as $root
  | if (($root.sections? | type) == "array" and (($root.sections? | length) > 0))
    then $root.sections[] | (.id | tostring)
    else $root.questions[] | (.section | tostring)
    end' "$QUESTIONS_FILE_ABS" | awk '!seen[$0]++')"

if [[ -z "$AVAILABLE_SECTIONS_NL" ]]; then
  echo "Error: no sections found in questions file." >&2
  exit 1
fi

is_available_section() {
  local sid="$1"
  printf '%s\n' "$AVAILABLE_SECTIONS_NL" | grep -Fxq "$sid"
}

get_section_name() {
  local sid="$1"
  local name
  name="$(jq -r --arg sid "$sid" '. as $root | (($root.sections[]? | select((.id | tostring) == $sid) | .name) // empty)' "$QUESTIONS_FILE_ABS" | head -n 1)"
  if [[ -n "$name" ]]; then
    printf '%s\n' "$name"
  else
    printf 'Section %s\n' "$sid"
  fi
}

get_section_description() {
  local sid="$1"
  local desc
  desc="$(jq -r --arg sid "$sid" '. as $root | (($root.sections[]? | select((.id | tostring) == $sid) | .description) // empty)' "$QUESTIONS_FILE_ABS" | head -n 1)"
  printf '%s\n' "$desc"
}

parse_section_input() {
  local raw="$1"
  local cleaned
  local ch
  local i
  local len
  local selected_nl=""
  cleaned="$(echo "$raw" | tr -d ' ,')"

  if [[ -z "$cleaned" ]]; then
    return 1
  fi

  len=${#cleaned}
  i=0
  while [[ $i -lt $len ]]; do
    ch="${cleaned:$i:1}"
    i=$((i + 1))

    if ! [[ "$ch" =~ [0-9] ]]; then
      return 1
    fi

    if ! is_available_section "$ch"; then
      return 1
    fi

    if ! printf '%s\n' "$selected_nl" | grep -Fxq "$ch"; then
      selected_nl+="$ch"$'\n'
    fi
  done

  SELECTED_SECTIONS_NL="$(printf '%s\n' "$selected_nl" | sed '/^$/d')"
  if [[ -z "$SELECTED_SECTIONS_NL" ]]; then
    return 1
  fi

  SELECTED_SECTIONS_CSV="$(printf '%s\n' "$SELECTED_SECTIONS_NL" | paste -sd, -)"
  SELECTED_SECTIONS_JSON="$(printf '%s\n' "$SELECTED_SECTIONS_NL" | jq -Rsc 'split("\n") | map(select(length>0))')"
  return 0
}

prompt_for_sections() {
  local sid
  local name
  local desc
  local input

  echo "Select question sections to run:"
  while IFS= read -r sid; do
    [[ -z "$sid" ]] && continue
    name="$(get_section_name "$sid")"
    desc="$(get_section_description "$sid")"
    if [[ -n "$desc" ]]; then
      echo "  [$sid] $name - $desc"
    else
      echo "  [$sid] $name"
    fi
  done <<< "$AVAILABLE_SECTIONS_NL"

  while true; do
    read -r -p "Enter sections (e.g., 123, 13, 2): " input
    if parse_section_input "$input"; then
      break
    fi
    echo "Invalid selection. Please enter only available section digits, such as 123 or 13."
  done
}

if [[ -n "$SECTIONS" ]]; then
  if ! parse_section_input "$SECTIONS"; then
    echo "Error: invalid --sections value '$SECTIONS'." >&2
    exit 1
  fi
else
  if [[ -t 0 ]]; then
    prompt_for_sections
  else
    # Non-interactive fallback: run all available sections.
    if ! parse_section_input "$(printf '%s\n' "$AVAILABLE_SECTIONS_NL" | paste -sd '' -)"; then
      echo "Error: failed to initialize section selection for non-interactive mode." >&2
      exit 1
    fi
  fi
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

enabled_count=$(jq --argjson selected "$SELECTED_SECTIONS_JSON" '[.questions[]
  | select((.enabled // true) == true)
  | select((.section | tostring) as $s | ($selected | index($s)))
] | length' "$QUESTIONS_FILE_ABS")

if [[ "$enabled_count" -eq 0 ]]; then
  echo "No enabled questions found for selected sections: $SELECTED_SECTIONS_CSV"
  exit 0
fi

STARTED_AT_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
RUN_ID="$(date -u +"%Y%m%dT%H%M%SZ")_${RANDOM}"
RUN_DIR_ABS="${RUNS_DIR_ABS}/${RUN_ID}"
RAW_DIR_ABS="${RUN_DIR_ABS}/raw"
RUN_DIR_DISPLAY="$(to_repo_relative "$RUN_DIR_ABS")"
RAW_DIR_DISPLAY="$(to_repo_relative "$RAW_DIR_ABS")"

mkdir -p "$RAW_DIR_ABS"
printf '%s' "$CUSTOM_PROMPT_CONTENT" > "${RUN_DIR_ABS}/prompt_snapshot.txt"
cp "$QUESTIONS_FILE_ABS" "${RUN_DIR_ABS}/questions_snapshot.json"

RESULTS_TMP="$(mktemp)"
printf '[]\n' > "$RESULTS_TMP"
trap 'rm -f "$RESULTS_TMP" "$RESULTS_TMP.new"' EXIT

total=0
ran=0
failed=0

echo "Questions file:      $QUESTIONS_FILE_DISPLAY"
echo "Custom prompt file:  $CUSTOM_PROMPT_FILE_DISPLAY"
echo "Prompt mode:         $PROMPT_MODE"
echo "Run output dir:      $RUN_DIR_DISPLAY"
echo "Selected sections:   $SELECTED_SECTIONS_CSV"
while IFS= read -r sid; do
  [[ -z "$sid" ]] && continue
  echo "  - [$sid] $(get_section_name "$sid")"
done <<< "$SELECTED_SECTIONS_NL"
echo "Total enabled items: $enabled_count"
echo

while IFS=$'\t' read -r qid qsection qtext; do
  total=$((total + 1))

  if [[ -z "$qid" || -z "$qtext" || -z "$qsection" ]]; then
    echo "[SKIP] Item #$total is missing id, section, or text."
    continue
  fi

  if ! should_run_code "$qid"; then
    continue
  fi

  ran=$((ran + 1))
  echo "[$qid][Section $qsection] $qtext"

  cmd=("${SCRIPT_DIR}/test_prompt_request.sh" --question "$qtext" --question-code "$qid" --custom-prompt-file "$CUSTOM_PROMPT_FILE_ABS" --bot-name "$EFFECTIVE_BOT_NAME" --endpoint "$EFFECTIVE_ENDPOINT")
  if [[ -n "$MODEL_ID" ]]; then
    cmd+=(--model-id "$MODEL_ID")
  fi
  if [[ -n "$SOURCE_URI_FILTER" ]]; then
    cmd+=(--source-uri-filter "$SOURCE_URI_FILTER")
  fi

  set +e
  cmd_output=$(RESULTS_DIR="$RAW_DIR_ABS" "${cmd[@]}" 2>&1)
  cmd_exit=$?
  set -e

  printf '%s\n' "$cmd_output"

  payload_path=$(printf '%s\n' "$cmd_output" | sed -n 's/^Payload file:[[:space:]]*//p' | head -n 1)
  response_path=$(printf '%s\n' "$cmd_output" | sed -n 's/^Response file:[[:space:]]*//p' | head -n 1)
  question_id_out=$(printf '%s\n' "$cmd_output" | sed -n 's/^Question ID:[[:space:]]*//p' | head -n 1)
  session_id_out=$(printf '%s\n' "$cmd_output" | sed -n 's/^Session ID:[[:space:]]*//p' | head -n 1)

  payload_file_rel=""
  response_file_rel=""
  payload_file_abs=""
  response_file_abs=""

  if [[ -n "$payload_path" ]]; then
    payload_file_abs="$(resolve_path "$payload_path")"
    payload_file_rel="$(to_repo_relative "$payload_file_abs")"
  fi
  if [[ -n "$response_path" ]]; then
    response_file_abs="$(resolve_path "$response_path")"
    response_file_rel="$(to_repo_relative "$response_file_abs")"
  fi

  response_text=""
  error_text=""
  sources_json='[]'

  if [[ -n "$response_file_abs" && -f "$response_file_abs" ]] && jq . "$response_file_abs" >/dev/null 2>&1; then
    response_text=$(jq -r '.Response // ""' "$response_file_abs")
    error_text=$(jq -r '.error // ""' "$response_file_abs")
    sources_json=$(jq -c '.Sources // []' "$response_file_abs")
    if [[ -z "$session_id_out" ]]; then
      session_id_out=$(jq -r '.sessionId // ""' "$response_file_abs")
    fi
    if [[ -z "$question_id_out" ]]; then
      question_id_out=$(jq -r '.questionId // ""' "$response_file_abs")
    fi
  fi

  status="ok"
  if [[ $cmd_exit -ne 0 ]]; then
    status="request_failed"
    if [[ -z "$error_text" ]]; then
      error_text="test_prompt_request.sh exited with code $cmd_exit"
    fi
  elif [[ -n "$error_text" ]]; then
    status="api_error"
  fi

  if [[ "$status" != "ok" ]]; then
    failed=$((failed + 1))
    echo "[FAIL] $qid"
  fi

  result_obj=$(jq -n \
    --arg id "$qid" \
    --arg section "$qsection" \
    --arg section_name "$(get_section_name "$qsection")" \
    --arg question "$qtext" \
    --arg status "$status" \
    --arg session_id "$session_id_out" \
    --arg question_id "$question_id_out" \
    --arg payload_file "$payload_file_rel" \
    --arg response_file "$response_file_rel" \
    --arg response "$response_text" \
    --arg error "$error_text" \
    --argjson sources "$sources_json" \
    '{
      id: $id,
      section: $section,
      section_name: $section_name,
      question: $question,
      status: $status,
      session_id: (if $session_id == "" then null else $session_id end),
      question_id: (if $question_id == "" then null else $question_id end),
      payload_file: (if $payload_file == "" then null else $payload_file end),
      response_file: (if $response_file == "" then null else $response_file end),
      response: (if $response == "" then null else $response end),
      error: (if $error == "" then null else $error end),
      sources: $sources
    }')

  jq --argjson item "$result_obj" '. + [$item]' "$RESULTS_TMP" > "$RESULTS_TMP.new"
  mv "$RESULTS_TMP.new" "$RESULTS_TMP"

  if [[ "$SLEEP_SECONDS" != "0" ]]; then
    sleep "$SLEEP_SECONDS"
  fi

  echo
done < <(jq -r --argjson selected "$SELECTED_SECTIONS_JSON" '.questions[]
  | select((.enabled // true) == true)
  | (.section | tostring) as $s
  | select($selected | index($s))
  | [(.id // ""), $s, (.text // "")]
  | @tsv' "$QUESTIONS_FILE_ABS")

ENDED_AT_UTC="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
RUN_RECORD_FILE_ABS="${RUN_DIR_ABS}/run_record.json"
RUN_RECORD_FILE_DISPLAY="$(to_repo_relative "$RUN_RECORD_FILE_ABS")"

jq -n \
  --arg run_id "$RUN_ID" \
  --arg started_at_utc "$STARTED_AT_UTC" \
  --arg ended_at_utc "$ENDED_AT_UTC" \
  --arg prompt_mode "$PROMPT_MODE" \
  --arg prompt_file "$CUSTOM_PROMPT_FILE_DISPLAY" \
  --arg prompt_sha256 "$PROMPT_SHA256" \
  --arg prompt_text "$CUSTOM_PROMPT_CONTENT" \
  --arg questions_file "$QUESTIONS_FILE_DISPLAY" \
  --arg model_id "$MODEL_ID" \
  --arg source_uri_filter "$SOURCE_URI_FILTER" \
  --arg bot_name "$EFFECTIVE_BOT_NAME" \
  --arg endpoint "$EFFECTIVE_ENDPOINT" \
  --arg only_codes "$ONLY_CODES" \
  --arg sections "$SELECTED_SECTIONS_CSV" \
  --arg run_dir "$RUN_DIR_DISPLAY" \
  --arg raw_dir "$RAW_DIR_DISPLAY" \
  --argjson selected_sections "$SELECTED_SECTIONS_JSON" \
  --argjson enabled "$enabled_count" \
  --argjson executed "$ran" \
  --argjson failed "$failed" \
  --slurpfile results "$RESULTS_TMP" \
  '{
    run_id: $run_id,
    started_at_utc: $started_at_utc,
    ended_at_utc: $ended_at_utc,
    prompt: {
      mode: $prompt_mode,
      file: $prompt_file,
      sha256: $prompt_sha256,
      text: $prompt_text
    },
    config: {
      questions_file: $questions_file,
      model_id: (if $model_id == "" then null else $model_id end),
      source_uri_filter: (if $source_uri_filter == "" then null else $source_uri_filter end),
      bot_name: $bot_name,
      endpoint: $endpoint,
      only_codes: (if $only_codes == "" then null else $only_codes end),
      sections_input: $sections,
      selected_sections: $selected_sections
    },
    summary: {
      enabled: $enabled,
      executed: $executed,
      failed: $failed
    },
    artifacts: {
      run_dir: $run_dir,
      raw_dir: $raw_dir,
      prompt_snapshot_file: ($run_dir + "/prompt_snapshot.txt"),
      questions_snapshot_file: ($run_dir + "/questions_snapshot.json")
    },
    results: $results[0]
  }' > "$RUN_RECORD_FILE_ABS"

echo "Run summary:"
echo "  Enabled in selected sections: $enabled_count"
echo "  Executed:                    $ran"
echo "  Failed:                      $failed"
echo "  Run record:                  $RUN_RECORD_FILE_DISPLAY"

if [[ $failed -gt 0 ]]; then
  exit 1
fi

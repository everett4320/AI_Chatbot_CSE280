# Prompt Change and Testing Instructions

This guide explains:
- how to update prompt behavior using one file,
- how teammates should test prompt changes consistently,
- and what we can/cannot see about the backend default prompt.

## 1) Single Prompt File Rule

Use only one file for custom prompt text:
- `fetched_site/prompts/custom_prompt.txt`

Behavior in `scripts/test_prompt_request.sh`:
- If `custom_prompt.txt` is non-empty: request includes `custom_prompt` with that file content.
- If `custom_prompt.txt` is empty: request does not include `custom_prompt`, so backend default prompt is used.

## 2) What Is Visible Right Now

From `fetched_site/dist/bundle-pretty.js`, captured frontend requests include:
- `action`
- `bot_name`
- `httpMethod`
- `userMessage`
- `sessionId`
- `questionId`

From project email guidance, backend also supports:
- `model_id`
- `custom_prompt`
- `source_uri_filter`

Important:
- Backend default prompt is not directly visible in this repository.
- We only have default prompt text from email guidance, not backend source/config.

## 3) How To Modify Prompt

### 3.1 Use backend default prompt

Clear the custom prompt file:

```bash
: > fetched_site/prompts/custom_prompt.txt
```

### 3.2 Use a custom prompt

Put prompt text into the file:

```bash
cat > fetched_site/prompts/custom_prompt.txt <<'EOF_PROMPT'
You are a campus assistant. Answer only with information supported by retrieved documents.
If no supporting evidence exists, say: "I don't know based on the available documents."
Keep answers concise and cite relevant source titles.
EOF_PROMPT
```

## 4) Team Test Workflow (A/B)

Use strict A/B testing:

1. Keep question set fixed.
2. Keep model fixed (unless model itself is the variable).
3. Keep `source_uri_filter` fixed (or omit in both groups).
4. Compare:
- Baseline: empty `custom_prompt.txt`
- Candidate: non-empty `custom_prompt.txt`
5. Save and review payload/response logs from each run.

## 5) Run Tests

### 5.1 Baseline test (default prompt)

```bash
: > fetched_site/prompts/custom_prompt.txt
./scripts/test_prompt_request.sh \
  --question "What is the add/drop deadline?" \
  --model-id "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
```

### 5.2 Candidate test (custom prompt)

```bash
cat > fetched_site/prompts/custom_prompt.txt <<'EOF_PROMPT'
Your custom prompt text here.
EOF_PROMPT

./scripts/test_prompt_request.sh \
  --question "What is the add/drop deadline?" \
  --model-id "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
```

### 5.3 Optional filters

If using `--source-uri-filter`, use at least 2 comma-separated entries:

```bash
./scripts/test_prompt_request.sh \
  --question "Where is academic probation policy?" \
  --source-uri-filter "policy,registrar"
```

## 6) Files Used In Testing

- Prompt file:
  - `fetched_site/prompts/custom_prompt.txt`
- Test runner:
  - `scripts/test_prompt_request.sh`
- Question set template:
  - `fetched_site/test_questions.example.txt`
- Output logs:
  - `fetched_site/test_results/*.payload.json`
  - `fetched_site/test_results/*.response.json`

## 7) Evaluation Rubric

Score each response (1-5):
- Factuality
- Groundedness
- Policy compliance
- Helpfulness
- Citation quality

Then compare average baseline vs candidate scores.

## 8) Can We See The Current Backend Default Prompt?

Short answer:
- We can see the prompt we send in request payload when `custom_prompt.txt` is non-empty.
- We cannot directly inspect backend's true default prompt from this repo.
- The only default text currently available is from email guidance.

# Prompt Change and Testing Instructions

This guide explains:
- how to update prompt behavior using one file,
- how teammates should test prompt changes consistently,
- and what we can/cannot see about the backend default prompt.

## 1) Single Prompt File Rule

Use only one file for custom prompt text:
- `fetched_site/prompts/custom_prompt.txt`

Behavior in scripts:
- If `custom_prompt.txt` is non-empty: request includes `custom_prompt` with that file content.
- If `custom_prompt.txt` is empty: request does not include `custom_prompt`, so backend default prompt is used.

## 2) Numbered Question Set Rule

Use one JSON file for team testing:
- `fetched_site/questions/test_questions.json`

Each question item should include:
- `id` (example: `Q001`)
- `text`
- `enabled` (`true` or `false`)

## 3) What Is Visible Right Now

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

## 4) How To Modify Prompt

### 4.1 Use backend default prompt

```bash
: > fetched_site/prompts/custom_prompt.txt
```

### 4.2 Use a custom prompt

```bash
cat > fetched_site/prompts/custom_prompt.txt <<'EOF_PROMPT'
You are a campus assistant. Answer only with information supported by retrieved documents.
If no supporting evidence exists, say: "I don't know based on the available documents."
Keep answers concise and cite relevant source titles.
EOF_PROMPT
```

## 5) Run Tests

### 5.1 Simplest full run (all enabled questions)

```bash
bash scripts/run_question_suite.sh
```

### 5.2 Baseline run (default prompt)

```bash
: > fetched_site/prompts/custom_prompt.txt
bash scripts/run_question_suite.sh \
  --model-id "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
```

### 5.3 Candidate run (custom prompt)

```bash
cat > fetched_site/prompts/custom_prompt.txt <<'EOF_PROMPT'
Your custom prompt text here.
EOF_PROMPT

bash scripts/run_question_suite.sh \
  --model-id "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
```

### 5.4 Run only selected question IDs

```bash
bash scripts/run_question_suite.sh --only-codes "Q001,Q005"
```

### 5.5 Optional filters

If using `--source-uri-filter`, use at least 2 comma-separated entries:

```bash
bash scripts/run_question_suite.sh \
  --source-uri-filter "policy,registrar"
```

## 6) Files Used In Testing

- Prompt file:
  - `fetched_site/prompts/custom_prompt.txt`
- Numbered question set:
  - `fetched_site/questions/test_questions.json`
- Test runners:
  - `scripts/run_question_suite.sh` (batch)
  - `scripts/test_prompt_request.sh` (single question)
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

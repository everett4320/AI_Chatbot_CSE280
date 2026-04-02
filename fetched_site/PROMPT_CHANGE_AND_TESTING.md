# Prompt Change and Testing Instructions

This guide explains:
- how to update prompt behavior using one file,
- how teammates should test prompt changes consistently,
- and what we can/cannot see about the backend default prompt.

## 1) Single Prompt File Rule

Use only one file for custom prompt text:
- `fetched_site/prompts/custom_prompt.txt`
- `fetched_site/prompts/README.md` (editing guidance)

Behavior in scripts:
- If `custom_prompt.txt` is non-empty: request includes `custom_prompt` with that file content.
- If `custom_prompt.txt` is empty: request does not include `custom_prompt`, so backend default prompt is used.

Format note:
- `.txt` vs `.md` extension does not inherently improve model quality.
- Prompt structure quality (clear constraints and sections) is what matters.

## 2) Numbered Question Set Rule

Use one JSON file for team testing:
- `fetched_site/questions/test_questions.json`
- `fetched_site/questions/README.md` (scope and maintenance guidance)

Question suite is sectioned:
- Section `1`: Standard Program QA
- Section `2`: Out-of-Scope Refusal
- Section `3`: Bias and Fairness

Each question item includes:
- `id` (example: `Q001`)
- `section` (example: `1`, `2`, `3`)
- `text`
- `enabled` (`true` or `false`)

Current suite intent:
- evaluate distinctions among engineering/science computing-related programs (CS, CSE, CSB, ISE, EES, ECE, ME, Bioengineering),
- and test whether answers correctly identify majors/departments and program differences.

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

### 5.1 Simplest run (interactive section selection)

```bash
bash scripts/run_question_suite.sh
```

At start, the script prompts for section input:
- `123` -> run sections 1, 2, 3
- `13` -> run sections 1 and 3
- `2` -> run section 2 only

This command can be run from:
- repo root: `bash scripts/run_question_suite.sh`
- `scripts/` directory: `bash run_question_suite.sh`

Each run creates a dedicated folder:
- `fetched_site/prompt_effectiveness_runs/<run_id>/`

Main record file for that run:
- `fetched_site/prompt_effectiveness_runs/<run_id>/run_record.json`

This run record includes:
- the exact prompt text used in this run,
- prompt mode (`custom_prompt` or `backend_default`),
- selected sections for this run,
- and all question responses for the run (including `section` and `section_name`).

### 5.2 Non-interactive section selection

```bash
bash scripts/run_question_suite.sh \
  --sections 13
```

### 5.3 Baseline run (default prompt)

```bash
: > fetched_site/prompts/custom_prompt.txt
bash scripts/run_question_suite.sh \
  --sections 123 \
  --model-id "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
```

### 5.4 Candidate run (custom prompt)

```bash
cat > fetched_site/prompts/custom_prompt.txt <<'EOF_PROMPT'
Your custom prompt text here.
EOF_PROMPT

bash scripts/run_question_suite.sh \
  --sections 123 \
  --model-id "global.anthropic.claude-sonnet-4-5-20250929-v1:0"
```

### 5.5 Run only selected question IDs

```bash
bash scripts/run_question_suite.sh \
  --sections 13 \
  --only-codes "Q001,Q017,Q024"
```

When using `--only-codes`, `run_record.json` will contain only the executed subset.

### 5.6 Optional filters

If using `--source-uri-filter`, use at least 2 comma-separated entries:

```bash
bash scripts/run_question_suite.sh \
  --sections 1 \
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
  - `fetched_site/prompt_effectiveness_runs/<run_id>/run_record.json` (single consolidated run record)
  - `fetched_site/prompt_effectiveness_runs/<run_id>/raw/*.payload.json`
  - `fetched_site/prompt_effectiveness_runs/<run_id>/raw/*.response.json`
- Legacy:
  - `fetched_site/test_results/` is deprecated and should not be used for new runs.

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

# Test Question Set Guide

This directory defines the sectioned question suite used to evaluate prompt quality.

Primary file:
- `fetched_site/questions/test_questions.json`

## Section design

Current suite uses three sections:

1. `1` - Standard Program QA
2. `2` - Out-of-Scope Refusal
3. `3` - Bias and Fairness

These are intentionally separated so testers can run only the categories they need.

## JSON format

The file contains:
- top-level `sections` array (metadata for each section)
- top-level `questions` array (actual test prompts)

Each `sections[]` item includes:
- `id`
- `name`
- `description`

Each `questions[]` item includes:
- `id`: stable question code (example: `Q001`)
- `section`: section ID this question belongs to (`1`, `2`, or `3`)
- `text`: question text sent to backend
- `enabled`: whether this question should run in batch

Minimal example:

```json
{
  "sections": [
    {
      "id": "1",
      "name": "Standard Program QA",
      "description": "Core engineering majors and department questions."
    }
  ],
  "questions": [
    {
      "id": "Q001",
      "section": "1",
      "text": "What undergraduate majors are offered in the P.C. Rossin College of Engineering and Applied Science?",
      "enabled": true
    }
  ]
}
```

## How to run

Default interactive mode:

```bash
bash scripts/run_question_suite.sh
```

The script prompts:
- `123` -> run sections 1, 2, and 3
- `13` -> run sections 1 and 3
- `2` -> run section 2 only

Non-interactive section selection:

```bash
bash scripts/run_question_suite.sh --sections 13
```

Run only specific question IDs (applies after section filtering):

```bash
bash scripts/run_question_suite.sh --sections 13 --only-codes "Q001,Q017,Q024"
```

## Maintenance rules

- Keep question IDs stable once they are used in evaluation history.
- Add new questions with new IDs instead of changing intent for existing IDs.
- Keep section intent clear: factual QA vs refusal boundary vs bias safety.
- Keep refusal and bias sections enabled to catch regressions continuously.

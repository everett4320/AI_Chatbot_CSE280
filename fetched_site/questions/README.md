# Test Question Set Guide

This directory defines the standardized question suite used to evaluate prompt quality.

Primary file:
- `fetched_site/questions/test_questions.json`

## Scope of the current question suite

The current questions focus on academic-program differentiation for Lehigh-related domains:
- College of Engineering majors and departments
- CS (Arts and Sciences) vs CSE (Engineering) vs CSB
- ISE vs CSE
- CSE vs EES and other interdisciplinary paths that combine computing with areas such as mechanical systems, robotics, optimization, and bioengineering

## JSON format

Each question item must include:
- `id`: stable question code (e.g., `Q001`)
- `text`: the question text sent to the backend
- `enabled`: whether this item runs in batch tests

Example:

```json
{
  "id": "Q001",
  "text": "What undergraduate majors are offered in the P.C. Rossin College of Engineering and Applied Science?",
  "enabled": true
}
```

## Usage

Run all enabled questions:

```bash
bash scripts/run_question_suite.sh
```

Run selected questions:

```bash
bash scripts/run_question_suite.sh --only-codes "Q001,Q004,Q008"
```

## Maintenance rules

- Keep question IDs stable once used in historical evaluations.
- Prefer adding new questions instead of reusing IDs for different intent.
- Keep wording specific enough to evaluate factual correctness and program distinctions.

# AI Chatbot Integration Notes

This repository now stores:
- `knowledge_base/`: Markdown documents for RAG content.
- `fetched_site/`: source files pulled from `https://dev-le-chat.cc.lehigh.edu/`.
- `scripts/fetch_site_assets.sh`: refresh script for downloading site assets.

## Captured site files

From the reference site:
- `fetched_site/index.html`
- `fetched_site/dist/bundle-pretty.js`

These files are used as implementation references for building a custom frontend.

## API integration summary

From `fetched_site/dist/bundle-pretty.js`, frontend requests are sent to:
- `https://8lyrpsdez5.execute-api.us-east-1.amazonaws.com/call`

Main request modes:
- `action: "question"`
- `action: "feedback"`

See `fetched_site/README.md` for payload examples and optional parameters.
See `fetched_site/PROMPT_CHANGE_AND_TESTING.md` for detailed prompt change/testing workflow.
Prompt override file for testing/frontend integration:
- `fetched_site/prompts/custom_prompt.txt` (non-empty = send `custom_prompt`, empty = backend default)
Numbered question set for batch testing:
- `fetched_site/questions/test_questions.json`
- `fetched_site/questions/README.md`
Simplest batch test command:
- `bash scripts/run_question_suite.sh`
Also works from inside `scripts/`:
- `bash run_question_suite.sh`
Per-run consolidated record:
- `fetched_site/prompt_effectiveness_runs/<run_id>/run_record.json`

## Refresh captured assets

Run:

```bash
./scripts/fetch_site_assets.sh
```

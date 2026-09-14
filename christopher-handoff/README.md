# Ross handoff for Christopher

This branch contains the Ross frontend and the two inputs needed to configure
Ross in the shared chatbot platform:

- `ai-chatbot-lehigh/` contains the frontend.
- `backend-inputs/SOURCE_CATALOG.csv` contains the initial crawl list.
- `backend-inputs/SYSTEM_PROMPT.txt` contains the Ross prompt.

There is no backend source code in this branch. Please use the current version
of the shared platform on your side.

## What is ready

The source catalog has five public Lehigh pages. All five returned HTTP 200 on
2026-09-14. They are ready for your ingestion workflow, but they have not been
indexed yet. The `backend_source_uri` column is intentionally blank until your
platform creates the corresponding source IDs.

The prompt now identifies the assistant as Ross. The frontend and the QA
scripts use the same prompt text.

The frontend build checks passed locally. The branch includes the responsive UI
fixes, API contract tests, deployment checks, and a GitHub Actions workflow.

## What we need from you

Please send back the following after you configure the clone:

1. The Ross `bot_name` or stable bot slug.
2. The API endpoint and the public test URL.
3. The allowed frontend origin for CORS.
4. The clone or collection ID, if your platform uses one.
5. The `backend_source_uri` values created for the five source rows.
6. Any change required by the current version of the shared backend contract.

## Suggested order

1. Create or identify the Ross clone.
2. Crawl or ingest the URLs in `backend-inputs/SOURCE_CATALOG.csv`.
3. Configure `backend-inputs/SYSTEM_PROMPT.txt` for that clone.
4. Build `ai-chatbot-lehigh/` with the API URL, bot slug, and public path.
5. Use `validation/test_questions.json` and
   `validation/ACCEPTANCE_CHECKLIST.md` for the test link.

The frontend sends the bot slug with each question and feedback request. It
does not send the prompt, model choice, or source catalog in production.

## Frontend configuration

The frontend needs these build-time values:

```text
VITE_CHAT_API_URL
VITE_CHAT_BOT_NAME
VITE_BASE_PATH
```

The exact request and response format is in `backend-inputs/API_CONTRACT.md`.
The build instructions are in `frontend/README.md` and
`ai-chatbot-lehigh/README.md`.

## Notes on the source list

Two Rossin academics URLs came from the existing frontend source references.
Three more URLs came from a historical survey branch. Only the public URLs were
kept. The survey file itself is not included because it contains personal data.

`source_uri_filter` is not a URL-crawling field. Use it only if your platform
needs a filter over source IDs after ingestion.

## Files

```text
ai-chatbot-lehigh/                         frontend source
christopher-handoff/backend-inputs/        prompt, source catalog, API contract
christopher-handoff/validation/            test questions and acceptance list
christopher-handoff/RELEASE_MANIFEST.md    deployment record
```

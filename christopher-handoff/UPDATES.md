# Updating Ross

The backend and API stay as they are. The steps below are only for keeping the
frontend, prompt, and source list in sync after the first deployment.

## Frontend changes

The student team pushes the change to `christopher-handoff`. Christopher can
then rebuild and deploy `ai-chatbot-lehigh/` through the same AWS process. Once
he sends back the updated link, the team checks it in the browser.

A frontend-only change does not require a prompt or source update.

## Prompt changes

The team updates `backend-inputs/SYSTEM_PROMPT.txt` and its hash. Christopher
rebuilds and redeploys the frontend, which embeds the full file and sends it as
`custom_prompt` with every question. The team then reruns the question set.
Generated JavaScript assets need no manual prompt edits.

## Source changes

The team updates `backend-inputs/SOURCE_CATALOG.csv`. Christopher uses the
existing ingestion workflow and shares the result when available. The team then
runs the relevant questions from `validation/test_questions.json`.

## If the frontend no longer matches

The student team updates the frontend adapter and contract tests. We do not ask
Christopher to change the server, API shape, authentication, CORS behavior,
model, or retrieval system.

For each release, `RELEASE_MANIFEST.md` should record the commit, prompt hash,
source result, bot name, public URL, and QA result.

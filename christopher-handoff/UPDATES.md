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
applies the new text through the existing prompt setting, and the team reruns
the question set. The frontend does not normally need a rebuild.

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

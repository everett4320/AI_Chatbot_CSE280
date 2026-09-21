# Updating Ross after the first setup

The first setup takes the most coordination because Christopher needs to select
the Ross bot in the existing platform, ingest the first source set, apply the
prompt, and deploy the frontend through the existing AWS process. The backend,
server behavior, and API contract stay fixed.

These steps describe our current understanding of the collaboration. Christopher
should use the normal platform and AWS process and let us know if we need to
change the frontend or handoff format.

## Frontend-only change

Examples: layout, wording, accessibility, or chat interaction changes.

1. The student team pushes the frontend change to this branch.
2. We ask Christopher to pull the branch, rebuild `ai-chatbot-lehigh/`, and
   deploy it through the existing AWS process.
3. Christopher sends us the updated public link when it is ready.
4. The student team checks the link.

The prompt and source catalog do not need to change for a frontend-only update.

## Prompt change

1. Update `backend-inputs/SYSTEM_PROMPT.txt` and record its new hash.
2. We ask Christopher to apply the prompt using the existing platform setting.
3. Run the prompt and question-suite checks again.

The frontend normally does not need a rebuild for a prompt-only change.

## Source-link or knowledge-base change

1. Add, change, or remove rows in `backend-inputs/SOURCE_CATALOG.csv`.
2. We ask Christopher to use the existing ingestion, refresh, or removal
   workflow.
3. Christopher shares each result and `backend_source_uri` when available.
4. Run relevant questions from `validation/test_questions.json`.

The frontend normally does not need a rebuild for a source update.

## Fixed backend boundary

Do not request changes to the API request shape, response shape, authentication,
bot routing, CORS behavior, model, retrieval system, or server implementation.
Those systems are fixed and outside this repository. If the frontend no longer
matches the observed interface, the student team updates the frontend adapter
and its contract tests, then Christopher rebuilds the frontend.

## Keep one short record

For each release, update `RELEASE_MANIFEST.md` with the branch commit, prompt
hash, source-ingestion result, fixed bot name, public URL, and QA result. That
makes it easy to see what changed and to return to the previous frontend
version if needed.

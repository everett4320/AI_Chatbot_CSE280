# Updating Ross after the first setup

The first setup takes the most coordination because Chris needs to create the
Ross clone, ingest the first source set, apply the prompt, and allow the test
origin. After that, most changes are smaller.

## Frontend-only change

Examples: layout, wording, accessibility, or chat interaction changes.

1. The student team pushes the frontend change to this branch.
2. If the student team hosts the test frontend, the team rebuilds and redeploys
   `ai-chatbot-lehigh/`.
3. If Chris hosts the frontend, Chris pulls the branch, rebuilds it, and
   restarts the frontend host.
4. The team checks the updated test link.

The prompt and source catalog do not need to change for a frontend-only update.

## Prompt change

1. Update `backend-inputs/SYSTEM_PROMPT.txt` and record its new hash.
2. Chris applies the prompt to the Ross clone using the normal backend setting.
3. Run the prompt and question-suite checks again.

The frontend normally does not need a rebuild for a prompt-only change.

## Source-link or knowledge-base change

1. Add, change, or remove rows in `backend-inputs/SOURCE_CATALOG.csv`.
2. Chris runs the corresponding ingestion, refresh, or removal job.
3. Chris records each result and `backend_source_uri` in the catalog.
4. Run relevant questions from `validation/test_questions.json`.

The frontend normally does not need a rebuild for a source update.

## Backend contract change

If Chris changes the API request shape, response shape, authentication, bot
slug, CORS policy, or public path, tell the student team first. That kind of
change may require a frontend update and a new build.

## Keep one short record

For each release, update `RELEASE_MANIFEST.md` with the branch commit, prompt
hash, source-ingestion result, bot slug, test URL, and QA result. That makes it
easy to see what changed and to return to the previous version if needed.

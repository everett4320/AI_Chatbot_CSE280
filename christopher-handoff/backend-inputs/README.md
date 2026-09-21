# Backend inputs

Use this folder with Christopher's existing platform workflow. These files are
configuration inputs; they do not require a backend, API, or server change.

## System prompt

Load `SYSTEM_PROMPT.txt` as the prompt for the Ross clone. It identifies the
assistant as Ross and keeps the existing grounding and refusal rules.

By default, the QA scripts exercise the prompt already configured in the
platform and do not send this file on every request. Before the test run,
record its hash in `../RELEASE_MANIFEST.md` so we know which version was used.

Do not send the prompt from the browser on every request. It belongs in the
existing Ross prompt configuration.

## Source links

`SOURCE_CATALOG.csv` is the input for the ingestion job. It has five public
Lehigh URLs. The `backend_source_uri` column is blank because those IDs only
exist after ingestion.

Do not ingest `knowledge_base/sample.md`. It is a placeholder from the student
repo, not Ross content.

`SOURCE_CATALOG.md` explains the columns and the provenance of the five links.

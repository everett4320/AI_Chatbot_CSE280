# Backend inputs

Use this folder when setting up the Ross clone.

## System prompt

Load `SYSTEM_PROMPT.txt` as the prompt for the Ross clone. It identifies the
assistant as Ross and keeps the existing grounding and refusal rules.

The QA scripts use the same prompt file. Before the test run, record its hash
in `../RELEASE_MANIFEST.md` so we know which version was used.

The frontend build embeds this file and sends it as `custom_prompt` with every
question, as requested by Christopher. Rebuild after editing the prompt.

## Source links

`SOURCE_CATALOG.csv` is the input for the ingestion job. It has five public
Lehigh URLs. The `backend_source_uri` column is blank because those IDs only
exist after ingestion.

Do not ingest `knowledge_base/sample.md`. It is a placeholder from the student
repo, not Ross content.

`SOURCE_CATALOG.md` explains the columns and the provenance of the five links.

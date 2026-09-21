# Backend inputs

We prepared this folder for Christopher's existing platform workflow. These
files are configuration inputs; they do not require a backend, API, or server
change. If the platform expects a different file or column format, please let
us know what to change on our side.

## System prompt

Could you please apply `SYSTEM_PROMPT.txt` through the normal Ross prompt
workflow? It identifies the assistant as Ross and keeps the existing grounding
and refusal rules.

By default, the QA scripts exercise the prompt already configured in the
platform and do not send this file on every request. Our team will compare its
hash with `../RELEASE_MANIFEST.md` before the test run so we know which version
was used.

The browser frontend intentionally does not send the prompt on every request;
we understand that it belongs in the existing Ross prompt configuration.

## Source links

`SOURCE_CATALOG.csv` contains the five public Lehigh URLs we would like to use
with the existing crawler. The `backend_source_uri` column is blank because
those IDs only exist after ingestion.

`knowledge_base/sample.md` is only a placeholder from the student repository,
so it is not part of the material we are asking to ingest.

`SOURCE_CATALOG.md` explains the columns and the provenance of the five links.

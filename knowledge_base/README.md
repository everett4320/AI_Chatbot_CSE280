# Knowledge-base working area

This folder is a team working area, **not** an automatically deployed Ross
knowledge base. The existing `sample.md` file is a placeholder and must not be
sent to Christopher for ingestion.

For the Christopher / ITS handoff, use
[`christopher-handoff/backend-inputs/`](../christopher-handoff/backend-inputs/):

- `SOURCE_CATALOG.csv` is the authoritative list of approved public sources.
- `SYSTEM_PROMPT.txt` is the Ross clone-level prompt supplied to Christopher.
- Christopher must record the post-ingestion `backend_source_uri` values
  before any `source_uri_filter` can be configured accurately.

When approved source documents are supplied as Markdown rather than URLs, place
them in a separately documented source set with a matching catalog row, content
owner, permission status, and version date. Use a top-level `# Title` first.

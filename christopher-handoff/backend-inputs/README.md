# Backend configuration inputs

This folder contains clone-specific **inputs**, not backend source code.

## System prompt

`SYSTEM_PROMPT.txt` is the Ross system prompt. It is plain UTF-8 because that
is the exact form the model should receive; `.txt` here is intentional, not an
informal source file. Its identity is Ross, while the grounding, refusal, and
response-format rules remain unchanged from the reviewed structured prompt.

- SHA-256: verify the checked-out file with `Get-FileHash` before approving a
  final prompt version.
- Status: ready for Christopher's clone-level configuration and QA; not evidence
  that it is already active in Christopher's backend clone.
- Action: configure it through Christopher's supported clone-level mechanism,
  then record the active configuration and hash in `../RELEASE_MANIFEST.md`.
  If only request-level overrides exist, confirm the production design before
  enabling the bot.

Do not expose a final prompt as a browser-side request override in the
production frontend. A request-level `custom_prompt` is suitable only for
controlled test runs, not for the service's grounding or safety boundary.

## Source catalog and knowledge base

`SOURCE_CATALOG.csv` is the canonical machine-and-human-readable source list.
It contains five verified official starting URLs that Chris can ingest. The
legacy `knowledge_base/sample.md` is a placeholder and must not be ingested as
Ross content.

See `SOURCE_CATALOG.md` before adding entries. In particular,
`canonical_url` is the public original content while `backend_source_uri` is the
identifier Christopher's platform returns after ingestion. Do not treat them as
interchangeable.

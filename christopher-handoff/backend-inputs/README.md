# Ross inputs

This folder has the two inputs we prepared for Ross: the system prompt and the
four-seed source list. Christopher can use the platform's normal prompt and
crawler workflow. If either file needs a different format, send us the expected
format and we will update it.

## System prompt

[`SYSTEM_PROMPT.txt`](SYSTEM_PROMPT.txt) identifies the assistant as Ross and
sets the grounding and refusal rules. The frontend does not send this prompt in
browser requests. The QA scripts normally test whichever prompt is configured
on the platform.

Its hash is recorded in [`../RELEASE_MANIFEST.md`](../RELEASE_MANIFEST.md) so we
can match a test run to the prompt version.

## Source list

[`SOURCE_CATALOG.csv`](SOURCE_CATALOG.csv) contains four public Lehigh seeds.
The Engineering root uses host-only crawling. The other three rows are
supplemental pages; their exact-page scope still needs confirmation. The
`backend_source_uri` cells are blank because those IDs are created during
ingestion.

`knowledge_base/sample.md` is a placeholder from the student repository, not a
Ross source. [`SOURCE_CATALOG.md`](SOURCE_CATALOG.md) explains the catalog
columns and where the four seeds came from.

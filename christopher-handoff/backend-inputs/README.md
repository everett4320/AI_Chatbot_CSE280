# Prompt and source pages

[SYSTEM_PROMPT.txt](SYSTEM_PROMPT.txt) is the latest prompt for Ross. Its hash
is in [RELEASE_MANIFEST.md](../RELEASE_MANIFEST.md), so we can keep track of
which version was applied. Before updating the frontend, please check how the
platform uses the prompt; the question is explained in
[UPDATES.md](../UPDATES.md).

[SOURCE_CATALOG.csv](SOURCE_CATALOG.csv) lists the four Lehigh source URLs.
The Engineering root covers the full host. The other three are supplemental
pages; their exact-page crawl scope still needs confirmation. The source ID
column is blank because those IDs come from the crawler.

The source list hasn't changed for this release. If the pages are already
in the knowledge base, there's no need to ingest them again for this update.
`knowledge_base/sample.md` is a placeholder, so please leave it out.
[SOURCE_CATALOG.md](SOURCE_CATALOG.md) explains the CSV columns.

# Source links

Use `SOURCE_CATALOG.csv` as the Ross source list. It opens in Excel and can be
read by an ingestion script.

`canonical_url` is the public page to crawl. `backend_source_uri` is the source
ID your platform returns after ingestion. Please write that ID back to the CSV.
Do not use the public URL as a `source_uri_filter` value unless your platform
explicitly uses that format.

`ingest_method` records the crawler scope. We requested `host-only`
for the Engineering root. The other three rows are marked
`scope_pending_confirmation` until their exact-page scope is confirmed.
`include=yes` means we want the URL included once its scope is settled; those
three rows should not be ingested before then.

The four seeds were checked again on 2026-09-22 and all returned HTTP 200. The
Engineering seed consolidates two overlapping URLs from the earlier frontend.
Use `host-only` mode for `https://engineering.lehigh.edu/` so all public pages
on that host are included. Do not widen that crawl to unrelated `lehigh.edu`
hosts. The other three rows are individual supplemental pages from a previous
branch; no survey data is included.

Before adding another source, check that it is public, current, and appropriate
for Ross. Use `include=no` for a link that should stay out of the crawl.

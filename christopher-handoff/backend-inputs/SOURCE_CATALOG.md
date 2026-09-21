# Source links

Use `SOURCE_CATALOG.csv` as the Ross source list. It opens in Excel and can be
read by an ingestion script.

`canonical_url` is the public page to crawl. `backend_source_uri` is the source
ID your platform returns after ingestion. Please write that ID back to the CSV.
Do not use the public URL as a `source_uri_filter` value unless your platform
explicitly uses that format.

The five links were checked again on 2026-09-21 and all returned HTTP 200. Two
came from the existing Ross frontend. Three came from a previous branch. The
branch included survey data, but only the public URLs are used here.

Before adding another source, check that it is public, current, and appropriate
for Ross. Use `include=no` for a link that should stay out of the crawl.

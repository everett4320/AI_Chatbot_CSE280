# Source links

Use `SOURCE_CATALOG.csv` as the Ross source list. It opens in Excel and can be
read by an ingestion script after the proposed supplemental scopes are
confirmed.

`canonical_url` is the public page to crawl. `backend_source_uri` is the source
ID your platform returns after ingestion. If those IDs are available, please
share them so we can record them in the CSV.
Do not use the public URL as a `source_uri_filter` value unless your platform
explicitly uses that format.

`ingest_method` records the intended crawler scope. `host-only` means the full
hostname; `exact-page` means only the listed supplemental page. Host-only for
the Engineering root was requested in the September 22 email. Exact-page for
the other three rows is a proposal, not a confirmed platform setting; please
tell us if the crawler cannot use a different mode per seed.

`include=yes` means the URL is intended for Ross after its crawl scope is
confirmed. Rows marked `scope_pending_confirmation` are not ready for ingestion;
please confirm or revise their scope first, and we will update the catalog.

The four seeds were checked again on 2026-09-22 and all returned HTTP 200. The
Engineering seed consolidates two overlapping URLs from the earlier frontend.
Use `host-only` mode for `https://engineering.lehigh.edu/` so all public pages
on that host are included. Do not widen that crawl to unrelated `lehigh.edu`
hosts. The other three rows are individual supplemental pages from a previous
branch; no survey data is included.

Before adding another source, check that it is public, current, and appropriate
for Ross. Use `include=no` for a link that should stay out of the crawl.

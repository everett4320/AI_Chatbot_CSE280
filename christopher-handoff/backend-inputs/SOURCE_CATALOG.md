# Source catalog instructions

`SOURCE_CATALOG.csv` is the single source-of-truth for content proposed for the
Ross knowledge base. It opens directly in Excel and can also be processed by an
ingestion script. Do not replace it with a bare text list of URLs.

## Important distinction

| Field | Meaning | Who fills it |
| --- | --- | --- |
| `canonical_url` | Official public page or original document to crawl/upload | Ross team / content owner |
| `backend_source_uri` | URI, source key, or collection identifier confirmed after Christopher's ingestion | Christopher / ITS |

`source_uri_filter` is a retrieval-time filter over already indexed source
identifiers. It is **not** a URL ingestion interface. Leave
`backend_source_uri` blank until Christopher completes ingestion and confirms
the platform's exact format.

## Required row fields

- `source_id`: stable, human-readable ID such as `rossin-undergraduate-programs`.
- `display_title`: title shown in the frontend's returned Sources list.
- `canonical_url`: official canonical source; avoid search-result URLs.
- `intended_scope`: topics the source should support.
- `include`: `yes` for a source requested in this handoff, `pending` for a
  candidate not yet selected, and `no` for excluded material.
- `content_owner`, `permission_status`, and `last_verified`: accountability and
  refresh evidence.
- `ingestion_priority`: `high`, `medium`, or `low`.
- `status`: recommended values are `ready_for_ingestion`, `ingested`, `failed`,
  or `excluded`.
- `provenance`: how the public URL was recovered. This records only source-list
  provenance; it never imports survey responses or personal data.

## Before making a source public

Confirm ownership, crawling permission, accessibility, update responsibility,
and whether the source contains restricted or stale material. Record failure
details rather than silently dropping a row.

This initial catalog is not a public-RAG completion state. Chris must ingest at
least one row and record its resulting `backend_source_uri` before the Ross test
link is accepted.

## Initial source set provenance

The five rows currently marked `ready_for_ingestion` were live-checked on
2026-09-14. Two Rossin academics pages originate from the existing frontend's
official demo source list. Three additional public URLs were recovered from a
remote survey branch; only the URLs and scope were retained. No survey response,
name, email address, IP address, or other personal data is included in this
handoff.

# Ross chatbot — Christopher configuration-review handoff

## What this is

This branch is the human-engineer handoff for adding **Ross**, the P.C. Rossin
College of Engineering and Applied Science chatbot, as one configured instance
of Christopher's existing shared chatbot platform.

It deliberately separates the student-maintained frontend from the inputs that
belong in Christopher's clone-specific backend configuration:

| Area | Owner | Delivered here |
| --- | --- | --- |
| Ross visual UI and browser integration | Ross student team | `ai-chatbot-lehigh/` |
| Bot registration, API routing, model, RAG, storage, deployment | Christopher / ITS | Configuration request only; no backend source is included |
| System prompt | Ross team supplies; Christopher configures and validates | `backend-inputs/SYSTEM_PROMPT.txt` |
| Official source catalog and ingestion result | Ross team supplies URLs; Christopher ingests and records platform URIs | `backend-inputs/SOURCE_CATALOG.csv` |

## Current readiness

**Ready for Christopher's configuration and ingestion review; not yet ready to
claim that a Ross knowledge base has been deployed.**

`SOURCE_CATALOG.csv` contains five verified official initial source URLs that
are ready for Christopher's ingestion workflow. They are not proof of completed
ingestion or a claim of complete Ross coverage. Do **not** ingest the legacy
`knowledge_base/sample.md` placeholder. A public KB/RAG signoff is blocked until
at least one source is successfully ingested and its resulting
`backend_source_uri` is recorded.

## Requested deployment sequence

1. Create or identify the Ross clone in the shared platform and provide its
   stable `bot_name` / bot slug. Do not assume it is `le-chat`.
2. Configure `backend-inputs/SYSTEM_PROMPT.txt` using Christopher's supported
   clone-level mechanism and confirm its active file hash. If the platform
   supports only request-level overrides, stop and agree on the production
   design before deployment.
3. Receive the approved official URLs in `SOURCE_CATALOG.csv`, ingest them by
   Christopher's normal crawler/upload path, and record the resulting
   `backend_source_uri` values in the catalog.
4. Confirm whether Ross uses an isolated collection or requires a retrieval
   filter. A public URL is not automatically a `source_uri_filter` value.
5. Build the frontend with the assigned API URL, exact bot slug, and public
   path. See `frontend/README.md`.
6. Allow the test frontend origin through CORS, publish a TLS test URL, and run
   `validation/ACCEPTANCE_CHECKLIST.md` with
   `validation/test_questions.json`.

## Frontend contract

The frontend needs only an HTTPS endpoint and the clone's stable bot identity.
It sends question and feedback requests and renders `Response` plus optional
`Sources[]`. The exact contract is in `backend-inputs/API_CONTRACT.md`.

The frontend does **not** send a system prompt, model identifier, source catalog,
or `source_uri_filter` in production. Christopher must configure those through
the platform's supported clone mechanism. The old request-level `custom_prompt`
tooling is retained only for controlled QA and is not a production configuration
mechanism.

## Questions Christopher needs to answer

1. What is the exact stable Ross `bot_name`?
2. Does `bot_name` choose a clone-specific prompt, model, and knowledge
   collection in this platform?
3. How should a persistent system prompt be configured for a clone?
4. What ingestion input is supported: URL crawl, Markdown/PDF/HTML upload,
   S3 objects, CMS connector, or another process?
5. What retrieval URI/source ID is produced after ingest, and when should
   `source_uri_filter` be used?
6. What test hostname, CORS allowlist, API URL, and public path should the
   frontend use?
7. Does the clone preserve the current `Response`, `Sources`, `Good`, and
   `Bad` API contract?

## Package map

```text
codex/christopher-handoff
├── ai-chatbot-lehigh/                  frontend source and deployment guide
├── christopher-handoff/
│   ├── README.md                      start here
│   ├── RELEASE_MANIFEST.md            release receipt to complete
│   ├── frontend/README.md             branch checkout instructions
│   ├── backend-inputs/                prompt and source-ingestion inputs
│   └── validation/                    acceptance questions and checklist
└── README.md                          repository overview
```

Christopher should checkout this branch and use `ai-chatbot-lehigh/` directly.
No ZIP archive is part of this handoff.

No secrets, backend source code, production data, or personally identifiable
data are included.

# Ross chatbot frontend

This repository contains the Ross frontend and the files needed to connect it
to the shared Lehigh chatbot platform.

ITS/LTS owns the chatbot backend, retrieval system, model, and production data.
The student team owns the frontend and the Ross handoff inputs.

## For Christopher

Start with [christopher-handoff/README.md](christopher-handoff/README.md).
It points to the frontend, the Ross prompt, the source links, and the test
questions.

## Repository layout

| Path | Use |
| --- | --- |
| `ai-chatbot-lehigh/` | Ross frontend, tests, Dockerfile, and deployment notes |
| `christopher-handoff/` | Source links, Ross prompt, API contract, and QA checklist |
| `fetched_site/` | Snapshot of an earlier shared chatbot site and test material |
| `scripts/` | Prompt and question-suite helpers |
| `knowledge_base/` | Legacy working area; do not ingest `sample.md` |

## Frontend setup

The frontend needs an API endpoint, the Ross bot slug, and a public path at
build time. See [ai-chatbot-lehigh/README.md](ai-chatbot-lehigh/README.md) for
the commands and API contract.

The endpoint recorded in `fetched_site/` came from an earlier test site. It is
not the Ross deployment endpoint. Chris will provide the current endpoint and
bot slug for the Ross clone.

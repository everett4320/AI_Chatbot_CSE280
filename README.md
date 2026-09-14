# Ross Chatbot Frontend

This repository contains the student-maintained frontend for Ross, the Lehigh
College of Engineering chatbot, plus reference and testing material used during
development.

## Deployment boundary

- `ai-chatbot-lehigh/` is the only deployable application in this repository.
  It is a React Router Node SSR frontend.
- The chatbot API, model, retrieval pipeline, knowledge store, and production
  data are external services managed by Lehigh ITS/LTS. Their source and
  configuration are not in this repository. Christopher's clone-level
  configuration is requested through `christopher-handoff/`, not changed here.
- The Node process in this repository serves the frontend and its assets. It is
  not the ITS/LTS chatbot backend.

## Repository map

| Path | Purpose | Deploy with the frontend? |
| --- | --- | --- |
| `ai-chatbot-lehigh/` | Frontend source, build, tests, and Dockerfile | Yes |
| `christopher-handoff/` | Human-engineer package for clone configuration, prompt, source catalog, and QA | Give to Christopher; it is not backend source code |
| `fetched_site/` | Snapshot of the earlier test site and observed API contract | No |
| `scripts/` | API/prompt testing and reference-site capture helpers | No |
| `knowledge_base/` | Project research material; not a frontend runtime dependency | No |

## ITS test handoff

Build and run from `ai-chatbot-lehigh/` with Node.js 22. Before building, set:

- `VITE_CHAT_API_URL` to the ITS/LTS chatbot endpoint.
- `VITE_CHAT_BOT_NAME` to Christopher's stable Ross clone identifier.
- `VITE_BASE_PATH` to `/` for root hosting or the assigned URL prefix, such as
  `/ross-test/`, for subpath hosting.

All three values are compiled into the frontend at build time. Changing any one
requires a new build; setting them only on the running container does not
change an existing bundle. `VITE_CHAT_BOT_NAME` must never fall back to
`le-chat` for a Ross deployment.

The endpoint captured from the earlier reference site is:

```text
https://8lyrpsdez5.execute-api.us-east-1.amazonaws.com/call
```

It is reference evidence only, not an approved Ross deployment setting.
Christopher must supply the actual Ross clone endpoint and bot identifier.

See [`ai-chatbot-lehigh/README.md`](ai-chatbot-lehigh/README.md) for the exact
API contract, source and Docker deployment procedures, and the test-link smoke
checklist.

## Christopher clone handoff

The frontend alone cannot create a Ross knowledge base or configure a persistent
system prompt in the shared ITS chatbot platform. The human-engineer handoff is
in [`christopher-handoff/README.md`](christopher-handoff/README.md). It keeps
the frontend, Ross prompt, source catalog, and validation materials separate
and explicitly marks the remaining clone-configuration and ingestion work.

## Reference documents

- `fetched_site/README.md` records the observed upstream API behavior.
- `fetched_site/PROMPT_CHANGE_AND_TESTING.md` documents prompt and question-suite
  testing. It does not expose or configure the ITS/LTS backend.

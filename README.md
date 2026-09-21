# Ross chatbot frontend

This repository contains the Ross frontend and the files needed to connect it
to the shared Lehigh chatbot platform.

ITS/LTS owns the chatbot backend, retrieval system, model, and production data.
The student team owns the frontend and the Ross handoff inputs.

## Quick start

To run the frontend locally, use Node 22:

```bash
cd ai-chatbot-lehigh
npm ci
cp .env.example .env
npm run dev
```

Open <http://localhost:6173> and click the Ross button in the bottom-right
corner.

With the empty `.env` from the example, the dev server answers with built-in
demo replies and sends no requests. To reach a real backend, set
`VITE_CHAT_API_URL` and `VITE_CHAT_BOT_NAME` in `.env` and restart
`npm run dev`. Chris supplies both values for the Ross clone.

Before opening a pull request, run `npm run verify`. It runs the type check,
the contract tests, and a production build.

<img src="docs/images/ross-hi.png" alt="Ross chat panel after sending hi" width="400">

*A local dev build after sending "hi", connected to the earlier shared test
backend rather than the Ross clone.*

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

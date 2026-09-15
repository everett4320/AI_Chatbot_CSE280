# Ross frontend contributor guide

## What this project contains

`ai-chatbot-lehigh` is the React Router 7 / React 19 frontend for the Ross engineering assistant. It does not contain the chatbot backend, retrieval system, model, or production data.

The frontend is configured at build time with:

- `VITE_CHAT_API_URL`: the assigned Ross endpoint
- `VITE_CHAT_BOT_NAME`: the assigned Ross clone slug
- `VITE_BASE_PATH`: the public path

Read `../christopher-handoff/backend-inputs/API_CONTRACT.md` before changing request or response handling.

## Commands

```bash
npm ci
npm run dev
npm run typecheck
npm run test:contract
npm run verify
npm run verify:deployment
npm run start
```

`npm run verify` includes typechecking, contract tests, and a production build.

## Runtime behavior

The API sends question and feedback payloads with `action`, `bot_name`, `sessionId`, and `questionId`. It renders the current Ross `Response` field and optional `Sources`.

The transcript is local React state. A tab-scoped session is kept separately, scoped to endpoint and bot slug. Backend-returned canonical sessions are adopted for later requests; clearing the chat invalidates stale pending responses.

A missing endpoint is only permitted for the development demo. It is not evidence of a working Ross clone.

## QA and historical material

QA always requires an explicit endpoint and bot slug. By default it verifies the configured backend prompt; an explicit custom-prompt file is exploratory only. Its automated result is transport-only, so acceptance still requires manual review of grounding, sources, refusal behavior, and clone routing.

`../fetched_site/` is an archival upstream snapshot. Do not copy its endpoint, bot identity, or prompt assumptions into Ross configuration.

## Frontend boundaries

Keep the frontend responsive for narrow screens, long unbroken user text, Markdown tables, short viewports, and subpath deployments. Do not alter backend/RAG/model behavior from this repository.

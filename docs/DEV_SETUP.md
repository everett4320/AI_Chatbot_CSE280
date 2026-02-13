# LE-Chat (CSE280) - Local Dev Setup (Docker)

This repo provides a minimal, reproducible local environment for developing the LE-Chat chatbot:

- Frontend: a floating chat widget (HTML/CSS/JS)
- Backend: Python/Flask API that calls Google Gemini (key stored server-side only)
- Local storage: SQLite (persisted in `data/app.db`)
- Knowledge base: Markdown files (in `knowledge_base/`)

The intended production integration is via a Drupal module that provides a Block and loads the widget assets. Deployment to the College site is expected to be done with WMS (students typically do not deploy to Drupal directly).

## Why This Matches LTS/WMS Guidance

This setup aligns with the guidance we received from LTS/WMS:

- Frontend is UI-only; Gemini calls happen only on the backend.
- Use Lehigh-managed hosting for staging/production (shared-tenancy Python/Flask).
- If a React/Vue frontend is used, it must be built (e.g., `npm run build`) and deployed as static assets (no dev server in hosting).
- Drupal integration should be delivered as a Drupal module + Block and deployed with WMS.

## Prerequisites

- Docker Desktop installed and running
- Git

## Quick Start

1) Create `.env` (never commit it)

```bash
cp .env.example .env
```

2) (Optional) Set your Gemini key in `.env`

- Leave it empty to run in **echo mode** (fast for local testing).
- If you set it, the backend will call Gemini.

3) Start the stack

```bash
docker compose up --build
```

4) Open the demo UI

- Frontend: `http://localhost:8080`
- Backend health: `http://localhost:8000/health`

## Local API Contract

Frontend sends:

```json
{
  "message": "user text",
  "conversation_id": "optional-string"
}
```

Backend returns:

```json
{
  "reply": "assistant text",
  "conversation_id": "conversation-id"
}
```

## Reset Local Data

```bash
docker compose down
rm -f data/app.db
```

## Development Notes (Team Workflow)

- Each developer can run the same environment locally via Docker.
- If you change backend code under `api/`, rebuild/restart the `api` container (the code is baked into the image by default).
- Do not put API keys or secrets in frontend code or Git. Keep them in `.env` only.

## Security / Compliance Checklist (Minimum)

- Gemini API key must be stored server-side only (environment variables / secrets).
- Avoid collecting sensitive personal data (PII). Add a short user notice if required.
- If chat transcripts are stored, retain them only on Lehigh-managed systems (local dev can use SQLite; staging/production should follow LTS guidance).
- Plan for basic abuse prevention/rate limiting on the backend.

## LTS Shared-Tenancy Notes (Staging/Production)

From LTS guidance (as of Jan/Feb 2026):

- Shared-tenancy Python/Flask runs on Debian Linux (Bookworm) with Python 3.11.x.
- Deployment is typically `git pull` on the server + install deps into a project venv (`pip install ...`).
- Static HTML/JS can be served from the same project space.
- If you choose React/Vue, you deploy the built output (`dist/`), not a dev server.

## Next Integration Step (Drupal)

When ready, the UI assets should be packaged and loaded by a Drupal module that provides a Block. Configuration should allow:

- admin-configurable backend URL (`API_BASE_URL`)
- page-specific placement via Block (no assumptions about site-wide injection)

WMS will coordinate deployment/integration into the College of Engineering site.

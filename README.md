AI Chatbot Minimal Local Demo (Docker)

Goals
- Run a minimal local loop: frontend UI -> backend /chat -> frontend display.
- Keep the Gemini API key only on the backend (never in the browser).

Prerequisites
- Docker Desktop installed

Quick start
1) Copy the env template
   cp .env.example .env
   (If you do not have a Gemini key yet, leave it empty.)

2) Start the stack
   docker compose up --build

3) Open the demo site
   http://localhost:8080

4) Backend health check
   http://localhost:8000/health

Project layout
- `docker-compose.yml`: local orchestration (web + api)
- `web/`: minimal frontend demo (embedded chat UI)
- `api/`: minimal backend demo (/chat endpoint)
- `nginx/`: reverse proxy config (/api -> backend)
- `knowledge_base/`: knowledge base Markdown files (committed to Git)
- `data/`: local runtime data (SQLite DB file; not committed)

Notes
- This demo is for fast local integration and follows the rule: UI only in frontend, Gemini calls only in backend.
- Once local flow works, we can hand off to LTS/WMS for Drupal module integration.

Storage (Local)
- SQLite is used for conversations and metrics. The DB file is persisted at `data/app.db`.
- Knowledge base content lives as Markdown in `knowledge_base/`.
- When `GEMINI_API_KEY` is set, the backend sends the entire knowledge base content to Gemini on each chat request.
- When `GEMINI_API_KEY` is not set, the backend runs in echo mode.

Optional dev endpoints
- `GET /dev/metrics` (simple chat request metrics)
- `GET /dev/conversations` (recent conversation IDs)

Reset local data
- Stop containers: `docker compose down`
- Remove DB file: `rm -f data/app.db`

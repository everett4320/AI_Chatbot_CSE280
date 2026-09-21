# Ross frontend

This directory contains the Ross UI. It is a React Router SSR application with
a small Node server for the frontend.

Christopher and the school platform manage a fixed chatbot backend, retrieval
system, model, API, and production environment. This repository does not
include or change backend code. If the integration does not match, change the
frontend adapter rather than the server.

## Build configuration

Set these values before building:

| Variable | Purpose |
| --- | --- |
| `VITE_CHAT_API_URL` | Fixed Ross API endpoint supplied by Christopher |
| `VITE_CHAT_BOT_NAME` | Existing stable routing name for Ross |
| `VITE_BASE_PATH` | Public mount path, such as `/ross-test/` |

These values are compiled into the browser bundle. Do not put secrets in them.
Changing one requires a rebuild. Setting `VITE_*` values only when starting the
container does not change an existing build.

The frontend sends `bot_name` as the fixed routing value. It assumes the
existing service policy and does not attempt to change it.

## Build and run

Use Node 22 and run the commands from this directory.

```bash
export VITE_CHAT_API_URL="<Ross API endpoint>"
export VITE_CHAT_BOT_NAME="<Ross bot slug>"
export VITE_BASE_PATH="/ross-test/"
npm ci
npm run verify:deployment
npm run start
```

`verify:deployment` checks the three values, runs TypeScript and contract tests,
and creates the production build. The server listens on port 3000.

## Docker

```bash
docker build \
  --build-arg VITE_CHAT_API_URL="<Ross API endpoint>" \
  --build-arg VITE_CHAT_BOT_NAME="<Ross bot slug>" \
  --build-arg VITE_BASE_PATH="/ross-test/" \
  -t ross-frontend:test .

docker run --rm -p 3000:3000 ross-frontend:test
```

## API contract

Questions use this JSON shape:

```json
{
  "action": "question",
  "bot_name": "<Ross bot slug>",
  "httpMethod": "POST",
  "userMessage": "What programs are available?",
  "sessionId": "session-...",
  "questionId": "question-..."
}
```

Feedback uses:

```json
{
  "action": "feedback",
  "bot_name": "<Ross bot slug>",
  "sessionId": "session-...",
  "questionId": "question-...",
  "feedback": "Good"
}
```

The frontend requires `Response`. `Sources`, `sessionId`, and `questionId` are
optional; missing IDs fall back to the client-generated values. A response that
only uses a retired legacy field is rejected.

## Test link check

After Christopher publishes the AWS-hosted link:

- Reload the assigned public path directly.
- Check that the launcher, chat panel, source links, feedback buttons, and
  clear-chat action work.
- Test a narrow phone viewport and a mobile landscape viewport.
- Confirm the request reaches the Ross clone and returns the expected sources.
- Follow the exact QA command in
  [`../christopher-handoff/README.md`](../christopher-handoff/README.md); it
  explicitly selects `christopher-handoff/validation/test_questions.json`.

If the page shows a configuration error, rebuild with the correct fixed API
endpoint and bot name. Do not change the backend or retrieval service to fit
the frontend; report the observed fixed response so the frontend adapter can be
corrected.

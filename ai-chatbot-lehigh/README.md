# Ross frontend

This directory contains the Ross UI. It is a React Router SSR application with
a small Node server for the frontend.

ITS/LTS owns the chatbot backend, retrieval system, model, and production data.
Chris will configure the Ross clone on that platform. This repository does not
include backend code.

## Build configuration

Set these values before building:

| Variable | Purpose |
| --- | --- |
| `VITE_CHAT_API_URL` | Ross API endpoint supplied by Chris |
| `VITE_CHAT_BOT_NAME` | Stable bot slug for the Ross clone |
| `VITE_BASE_PATH` | Public mount path, such as `/ross-test/` |

These values are compiled into the browser bundle. Do not put secrets in them.
Changing one requires a rebuild. Setting `VITE_*` values only when starting the
container does not change an existing build.

The frontend sends `bot_name` as a routing value. The backend must still enforce
its own clone and host policy.

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

The frontend expects a response with `Response`, optional `Sources`, `sessionId`,
and `questionId`. A response that only uses a retired legacy field is rejected.

## Test link check

After Chris publishes a test link:

- Reload the assigned public path directly.
- Check that the launcher, chat panel, source links, feedback buttons, and
  clear-chat action work.
- Test a narrow phone viewport and a mobile landscape viewport.
- Confirm the request reaches the Ross clone and returns the expected sources.
- Run `../christopher-handoff/validation/test_questions.json`.

If the page shows a configuration error, rebuild with the correct API endpoint
and bot slug. Backend or retrieval issues belong on the ITS/LTS side; UI issues
belong here.

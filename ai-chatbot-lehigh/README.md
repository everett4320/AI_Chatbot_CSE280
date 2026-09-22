# Ross frontend

This directory contains the Ross UI. It builds as a static React Router SPA for
Apache. Production uses the files in `build/client/` and does not require a
Node process.

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

## Build the static site

Use Node 22 and run the commands from this directory.

```bash
export VITE_CHAT_API_URL="<Ross API endpoint>"
export VITE_CHAT_BOT_NAME="<Ross bot slug>"
export VITE_BASE_PATH="/"
npm ci
npm run verify:deployment
```

`verify:deployment` checks the three values, runs TypeScript and contract tests,
and creates `build/client/index.html` with its JS, CSS, and image assets.

`npm run start` is only a local preview of the static build on port 3000. It is
not needed in production.

## Apache

For `https://ross.cc.lehigh.edu/`, copy the contents of `build/client/` into
the Apache document root and keep `VITE_BASE_PATH=/`. The SPA needs an
`index.html` fallback for direct browser refreshes:

```apache
<Directory "/var/www/ross">
    Require all granted
    Options -Indexes
    DirectoryIndex index.html
    FallbackResource /index.html
</Directory>
```

If Ross is mounted below a path such as `/ross-test/`, build with
`VITE_BASE_PATH=/ross-test/`, place the files at that path, and use
`FallbackResource /ross-test/index.html`. The build value, Apache mount path,
and fallback path must match.

The browser calls `VITE_CHAT_API_URL` directly. The final Apache origin must
already be allowed by the fixed API's CORS policy.

## Docker

The Docker image also serves the static build with Apache. It does not contain
a production Node process.

```bash
docker build \
  --build-arg VITE_CHAT_API_URL="<Ross API endpoint>" \
  --build-arg VITE_CHAT_BOT_NAME="<Ross bot slug>" \
  --build-arg VITE_BASE_PATH="/" \
  -t ross-frontend:test .

docker run --rm -p 3000:80 ross-frontend:test
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

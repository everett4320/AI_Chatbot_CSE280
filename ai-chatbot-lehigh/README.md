# Ross Frontend — ITS Test Deployment

This directory is the deployable Ross frontend. It uses React 19 and React
Router in SSR mode, so the production build contains a small Node server plus
browser assets.

## Ownership boundary

This handoff changes and deploys only the frontend.

- Lehigh ITS/LTS owns and maintains the external chatbot API, model, RAG
  pipeline, knowledge store, and production data.
- No ITS/LTS backend source is included here. Christopher must configure the
  Ross clone through the platform's supported mechanism before this frontend can
  perform Ross-specific RAG.
- `build/server/index.js` is only the React Router frontend host. It does not
  implement the chatbot backend.

## Requirements

- Node.js 22.x
- npm, using the committed `package-lock.json`
- Network access from each user's browser to the configured ITS/LTS API endpoint

`package.json` temporarily pins the transitive `qs` package to `6.16.0` because
Express 4's declared range still resolves to an affected version. The contract
tests, production build, and server smoke test cover this security override.

Run every command below from this directory.

## Build-time configuration

| Variable | Required | Meaning |
| --- | --- | --- |
| `VITE_CHAT_API_URL` | Yes for a test or production link | Full HTTPS URL of the external ITS/LTS chatbot API |
| `VITE_CHAT_BOT_NAME` | Yes for a deployed Ross clone | Stable backend bot identifier assigned by Christopher/ITS; it selects the correct clone configuration |
| `VITE_BASE_PATH` | No | Public mount path. Defaults to `/`; for a subpath, include leading and trailing slashes, for example `/ross-test/` |

These are Vite build-time values and are visible in the browser bundle; never
put credentials or secrets in either variable. If either value changes, rebuild
the application. Supplying `VITE_CHAT_API_URL` only with `docker run -e` is too
late and leaves the already-built bundle unchanged.

`VITE_CHAT_BOT_NAME` is deliberately not hard-coded. The shared ITS platform
may use `bot_name` to select a clone's system prompt, model, and knowledge
collection. Christopher must provide the exact stable value; do not infer it
from a temporary test hostname or reuse `le-chat` for Ross.

The browser sends `bot_name` as a public routing hint, not as an authorization
credential. Christopher's backend must validate the selected clone against its
deployment/host policy; CORS alone is not clone isolation.

If `VITE_CHAT_API_URL` is omitted in a native development build, the UI uses
local demo replies. That mode is useful for layout work but is not a valid ITS
test deployment.

For a confirmed Ross deployment, Christopher must provide all values:

```bash
export VITE_CHAT_API_URL="<Christopher-assigned-Ross-API-endpoint>"
export VITE_CHAT_BOT_NAME="<Christopher-assigned-Ross-bot-name>"
export VITE_BASE_PATH="/"
```

For subpath hosting, set the assigned prefix before building, for example:

```bash
export VITE_BASE_PATH="/ross-test/"
```

The reverse proxy must publish that same prefix and route it to the frontend
Node service. Keep the prefix intact when proxying. Verify the assigned path
with ITS before producing the final build.

## Verify and build

```bash
npm ci
npm run verify:deployment
```

`verify:deployment` rejects blank bot names, invalid API URLs, and malformed
base paths before running the typecheck, contract tests, and production build.
It must finish successfully before handoff. The production build is written to
`build/`:

```text
build/
├── client/   browser assets
└── server/   React Router frontend server
```

## Source deployment

Set the build-time variables, run `npm run verify:deployment`, and then start
the production frontend:

```bash
npm run start
```

The frontend server listens on port `3000` by default. ITS can place its normal
TLS/reverse proxy in front of this process. This Node process serves only the
frontend; chatbot requests still go directly to the configured external API.

## Docker deployment

Pass all three Vite values to `docker build`, when the browser bundle is
compiled:

```bash
docker build \
  --build-arg VITE_CHAT_API_URL="<Christopher-assigned-Ross-API-endpoint>" \
  --build-arg VITE_CHAT_BOT_NAME="<Christopher-assigned-Ross-bot-name>" \
  --build-arg VITE_BASE_PATH="/" \
  -t ross-frontend:test .

docker run --rm -p 3000:3000 ross-frontend:test
```

The historical `8lyrps...` endpoint remains documented only in
`fetched_site/README.md` as capture evidence. It is not a Ross deployment
default.

For a subpath, change `VITE_BASE_PATH` in the build command. Do not rely on
runtime `docker run -e VITE_...` values; they cannot replace values already
compiled into the image.

## Chatbot API contract

The frontend sends JSON over `POST` to `VITE_CHAT_API_URL` with
`Content-Type: application/json`.

Question request:

```json
{
  "action": "question",
  "bot_name": "<Christopher-assigned-Ross-bot-name>",
  "httpMethod": "POST",
  "userMessage": "What programs are available?",
  "sessionId": "session-...",
  "questionId": "question-..."
}
```

Feedback request:

```json
{
  "action": "feedback",
  "bot_name": "<Christopher-assigned-Ross-bot-name>",
  "sessionId": "session-...",
  "questionId": "question-...",
  "feedback": "Good"
}
```

`feedback` is exactly `Good` or `Bad`.

Expected question response:

```json
{
  "Response": "Markdown answer text",
  "Sources": [
    {
      "title": "Source title",
      "url": "https://example.lehigh.edu/source"
    }
  ],
  "sessionId": "session-...",
  "questionId": "question-..."
}
```

`Sources`, `sessionId`, and `questionId` may be absent. The frontend also accepts
`reply` as a compatibility fallback for the answer text, but the deployed
contract uses `Response`. A JSON `error` field or a non-2xx response is shown as
a frontend error.

## Test-link smoke checklist

After ITS publishes the test URL, verify all of the following:

- The assigned URL loads over HTTPS with no redirect loop or blank page.
- On subpath hosting, a direct reload of the assigned path succeeds and all
  base-prefixed JavaScript, CSS, and `figma/` assets return 200.
- The launcher opens and the panel stays within the viewport on desktop, a
  320 px-wide phone viewport, and mobile landscape.
- A known Lehigh Engineering question returns a real backend answer, not the
  built-in demo response.
- The browser network request goes to the configured ITS/LTS endpoint and uses
  the question payload above.
- Markdown, long links, code blocks, tables, and expanded source links remain
  inside the chat panel.
- Source links open the expected HTTPS pages.
- Thumbs-up and thumbs-down send `Good` and `Bad` feedback without a visible
  error.
- Clearing the chat starts a new frontend/backend session.
- Browser console and network panels show no asset 404s, CORS errors, or failed
  API requests.

If a deployed UI reports that the chat service is not configured, rebuild with
`VITE_CHAT_API_URL` present at build time. Demo replies mean a development
server was deployed by mistake. Backend errors, model/RAG behavior, and API
availability should be escalated to ITS/LTS; layout and frontend request
handling belong to this frontend release.

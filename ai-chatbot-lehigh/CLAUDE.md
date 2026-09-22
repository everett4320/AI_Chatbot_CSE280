# Ross frontend maintenance guide

## Scope and ownership

This repository owns the Ross frontend and handoff material only. Christopher and the school platform manage the fixed backend, retrieval, model, bot registration, CORS, authentication, rate limits, logging, and deployment policy. Chris Larkin is the project sponsor. Do not request changes to those systems; adapt the frontend when an integration mismatch is found.

Do not infer a live Ross integration from local demo behavior. The frontend needs an assigned endpoint, a stable Ross bot slug, confirmed CORS, configured prompt, and ingested sources before it can be used for a real pilot.

## Commands

```bash
npm ci
npm run typecheck
npm run test:contract
npm run verify
npm run verify:deployment
```

The app uses React Router SPA mode with `ssr: false`. A production build must
produce `build/client/index.html`; Apache serves `build/client/` directly. There
is no production Node process. `npm run start` is only a local static preview.

## Build-time configuration

The frontend reads these public build-time values:

- `VITE_CHAT_API_URL`: HTTPS endpoint supplied for the Ross clone
- `VITE_CHAT_BOT_NAME`: stable slug for that same clone
- `VITE_BASE_PATH`: `/` or a canonical subpath such as `/ross-test/`

The deployment validator rejects missing bot names and invalid production endpoint configuration. A development build without an endpoint may show a local demo reply; that is never a model, retrieval, or clone test.

The Apache document root or alias, `VITE_BASE_PATH`, React Router basename, and
`FallbackResource` must describe the same public path. For
`https://ross.cc.lehigh.edu/`, use `/` and fall back to `/index.html`.

## API and state contract

The source of truth is `../christopher-handoff/backend-inputs/API_CONTRACT.md`.

Question and feedback requests use `action`, `bot_name`, `sessionId`, and `questionId`. Responses use `Response`, optional `Sources`, and may return canonical session/question identifiers.

Sessions are scoped by endpoint and bot slug in tab `sessionStorage`. When the backend returns a canonical session ID, the frontend adopts it for later questions and feedback. Clearing the chat invalidates any in-flight UI result so an old answer cannot reappear in the new transcript.

## QA boundaries

From `ai-chatbot-lehigh/`, use the explicit assigned endpoint for QA:

```bash
bash ../scripts/run_question_suite.sh \
  --bot-name "<Ross bot slug>" \
  --endpoint "<Ross endpoint>"
```

The default suite tests the clone's configured backend prompt. Passing `--custom-prompt-file` is an explicit exploratory override and does not prove persistent backend configuration. The suite reports transport validity only; a human must score grounding, clone identity, sources, and refusal quality against the acceptance checklist.

`../fetched_site/` is a historical snapshot. It is not an endpoint, bot-slug, prompt, or deployment default.

## Change discipline

Keep `chat-api.ts`, `use-chat.ts`, `chat.ts`, the contract tests, and these instructions consistent with the fixed interface. Preserve responsive message wrapping, bounded Markdown tables, visual-viewport behavior, and subpath asset handling.

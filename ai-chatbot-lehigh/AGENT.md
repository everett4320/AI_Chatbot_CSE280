# Ross frontend maintenance

This project owns the frontend and handoff only. Use the existing platform
interface in [API_CONTRACT.md](../christopher-handoff/backend-inputs/API_CONTRACT.md).
Keep backend, retrieval and model configuration unchanged.

## Build and deploy

Use Node 22 and run `npm ci`, then `npm run verify` from this directory.
For a production build, set `VITE_CHAT_API_URL`, `VITE_CHAT_BOT_NAME` and
`VITE_BASE_PATH`, then run `npm run verify:deployment`.

Keep React Router in `ssr: false` mode. The build must produce
`build/client/index.html`; Apache serves the static files without a production
Node process. The public mount and Apache fallback must match `VITE_BASE_PATH`.
The root deployment uses `/` and `/index.html`.

## API and state

Every question sends the full `SYSTEM_PROMPT.txt` as `custom_prompt`, the
configured bot name, `action: "question"` and `remember_conversation: "True"`.
Send the latest question only and adopt returned canonical IDs. Responses are
complete JSON, without streaming.

Keep the transcript in React state and only the session ID in tab-scoped
storage, keyed by endpoint and bot. New Chat clears both, including the draft,
and invalidates pending UI results. It does not delete server records.
Preserve mobile layout, message wrapping, Markdown tables and subpath assets.

## Validation

`npm run verify` runs types, contract tests and the static build.
The API question suite defaults to the same prompt and questions shipped in
the handoff. Supply the assigned endpoint and bot explicitly, using the command
in the [handoff guide](../christopher-handoff/README.md). Automated API results
check transport; review answers and sources separately.

# Frontend build

The frontend is in `ai-chatbot-lehigh/`.

It is an adapter for the fixed service managed by Christopher. Do not change
or ask to change the backend, response shape, model, or retrieval
behavior. If the integration does not match the documented
interface, update the frontend and its contract tests.

From that directory, set the three build-time values and build the static site:

```bash
export VITE_CHAT_API_URL="<fixed Ross API endpoint>"
export VITE_CHAT_BOT_NAME="<fixed Ross bot name>"
export VITE_BASE_PATH="/"
npm ci
npm run build
```

`VITE_CHAT_BOT_NAME` must match the existing Ross routing value. The frontend
sends it with every question and feedback request. The build also embeds the
full text of [`SYSTEM_PROMPT.txt`](../backend-inputs/SYSTEM_PROMPT.txt), which
questions send as `custom_prompt`. Rebuild and redeploy after editing it;
generated JavaScript assets need no manual prompt edits.

`npm run build` creates the static site in `build/client/`. We use
`npm run verify:deployment` for additional checks. Please serve the files with
your usual Apache setup; no Node process is needed in production.
`npm run start` is only a local preview.

The full build and deployment notes are in `ai-chatbot-lehigh/README.md`.

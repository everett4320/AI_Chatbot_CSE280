# Frontend build

The frontend is in `ai-chatbot-lehigh/`.

It is an adapter for the fixed chatbot service managed by Christopher. Do not
change or ask to change its API payload, response shape, model, or retrieval
behavior. If the integration does not match the documented interface, update
the frontend and its contract tests. Christopher decides how the static files
fit into his existing Apache site.

From that directory, set the three build-time values and build the static site.
The `/` example assumes Ross is served at the root of the proposed URL:

```bash
export VITE_CHAT_API_URL="<fixed Ross API endpoint>"
export VITE_CHAT_BOT_NAME="<fixed Ross bot name>"
export VITE_BASE_PATH="/"
npm ci
npm run build
```

`VITE_CHAT_BOT_NAME` must match the existing Ross routing value. The frontend
sends it with every question and feedback request.

`npm run build` creates the static site in `build/client/`. For additional
configuration and contract checks, `npm run verify:deployment` produces the
same artifact. Please integrate these files through your existing AWS/Apache
workflow; the root-path example does not prescribe your document root or mount
path. No Node process is needed in production. `npm run start` is only a local
preview.

The full build and deployment notes are in `ai-chatbot-lehigh/README.md`.

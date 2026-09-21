# Frontend build

The frontend is in `ai-chatbot-lehigh/`.

It is an adapter for the fixed service managed by Christopher. Do not change
or ask to change the backend, API payload, response shape, model, retrieval
behavior, or server. If the integration does not match the documented
interface, update the frontend and its contract tests.

From that directory, set the three build-time values and run the normal checks:

```bash
export VITE_CHAT_API_URL="<fixed Ross API endpoint>"
export VITE_CHAT_BOT_NAME="<fixed Ross bot name>"
export VITE_BASE_PATH="/ross-test/"
npm ci
npm run verify:deployment
```

`VITE_CHAT_BOT_NAME` must match the existing Ross routing value. The frontend
sends it with every question and feedback request.

`/ross-test/` is an example. Use `/` when the frontend is hosted at the domain
root. `npm run verify:deployment` creates the production build; run it with
`npm run start` on port 3000.

The full build and deployment notes are in `ai-chatbot-lehigh/README.md`.

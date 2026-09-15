# Frontend

The frontend is in `ai-chatbot-lehigh/`.

From that directory, set the three build-time values and run the normal checks:

```bash
export VITE_CHAT_API_URL="<Ross API endpoint>"
export VITE_CHAT_BOT_NAME="<Ross bot slug>"
export VITE_BASE_PATH="/ross-test/"
npm ci
npm run verify:deployment
```

`VITE_CHAT_BOT_NAME` must match the clone configured in the backend. The
frontend sends it with every question and feedback request.

The full build and deployment notes are in `ai-chatbot-lehigh/README.md`.

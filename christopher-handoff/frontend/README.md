# Building the frontend

The app is in [`ai-chatbot-lehigh/`](../../ai-chatbot-lehigh/). Use Node 22 and
the API endpoint, bot name, and path from the existing deployment:

```bash
export VITE_CHAT_API_URL="<existing API endpoint>"
export VITE_CHAT_BOT_NAME="<existing bot name>"
export VITE_BASE_PATH="/"
npm ci
npm run verify:deployment
```

Run these commands from `ai-chatbot-lehigh/`. They check the configuration,
run the tests, and build the static files in `build/client/`. Publish the
complete contents of that directory with Apache. There's no production Node
process; `npm run start` is just a local preview.

The build embeds [SYSTEM_PROMPT.txt](../backend-inputs/SYSTEM_PROMPT.txt) and
sends its full text as `custom_prompt` with each question. Rebuild after
editing that file.
The [frontend README](../../ai-chatbot-lehigh/README.md) has Apache and Docker
examples.

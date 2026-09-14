# Frontend delivery from this branch

The frontend source is `ai-chatbot-lehigh/` at the repository root. It remains
independent of backend prompt and knowledge-base configuration.

Christopher needs these build-time values:

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_CHAT_API_URL` | Yes | HTTPS endpoint for Christopher's shared chatbot API |
| `VITE_CHAT_BOT_NAME` | Yes | Exact stable Ross bot slug supplied by Christopher |
| `VITE_BASE_PATH` | Yes when mounted below `/` | Include leading and trailing slashes, for example `/ross-test/` |

Checkout `codex/christopher-handoff`, then run all Node commands from
`ai-chatbot-lehigh/` and read `ai-chatbot-lehigh/README.md`. Build-time values
are visible in browser code; never place secrets in them.

```bash
git checkout codex/christopher-handoff
cd ai-chatbot-lehigh
export VITE_CHAT_API_URL="<Christopher-assigned-Ross-API-endpoint>"
export VITE_CHAT_BOT_NAME="<Christopher-assigned-Ross-bot-name>"
export VITE_BASE_PATH="/ross-test/" # replace with Christopher's assigned path
npm ci
npm run verify:deployment
```

The frontend intentionally does not carry a knowledge base or a system prompt.
It sends the assigned `bot_name` with every question and feedback request so
Christopher's platform can select the proper clone.

# Ross handoff for Christopher

This branch has the Ross frontend, system prompt, and source list for the
P.C. Rossin College of Engineering and Applied Science. Chris Larkin is the
project sponsor.

For this update, we've removed the back button, made the text easier to read,
and adjusted the logo and chat icons. The welcome message now introduces Ross
as a guide to the Rossin College of Engineering at Lehigh. We've also revised
the system prompt. The source list hasn't changed. [UPDATES.md](UPDATES.md)
has a short summary.

## Updating the frontend

Use Node 22 and the API settings from the existing deployment:

```bash
git fetch origin
git switch christopher-handoff
git pull --ff-only origin christopher-handoff
cd ai-chatbot-lehigh

export VITE_CHAT_API_URL="<existing API endpoint>"
export VITE_CHAT_BOT_NAME="<existing bot name>"
export VITE_BASE_PATH="/"
npm ci
npm run verify:deployment
```

This runs our checks and builds the static site in `build/client/`. Publish the
complete contents of that directory through your usual Apache process at
<https://ross.cc.lehigh.edu/>. Keep the existing `/index.html` fallback for
page refreshes. No Node process needs to run on the production server.

The three `VITE_*` values are included in the build, so changing one means
rebuilding the frontend. Keep the existing bot name even if it differs from
the name shown in the chat. More Apache and Docker details are in the
[frontend README](../ai-chatbot-lehigh/README.md).

## Applying the prompt

The updated text is in
[backend-inputs/SYSTEM_PROMPT.txt](backend-inputs/SYSTEM_PROMPT.txt). Please use
this file when updating the prompt. Its version hash is recorded in
[RELEASE_MANIFEST.md](RELEASE_MANIFEST.md).

There's one detail we'd like to check before the frontend update: the current
site sends the old prompt as `custom_prompt` with each question. This version
leaves that field out and expects the service to use its configured prompt.
Can the existing platform apply the new text that way? If the frontend needs
to send it with each request, tell us and we'll adjust it.

The [API notes](backend-inputs/API_CONTRACT.md) describe the requests the
frontend currently sends. If your setup expects something different, send us
the format and we'll update our side.

## Sources and testing

The four source URLs are in
[backend-inputs/SOURCE_CATALOG.csv](backend-inputs/SOURCE_CATALOG.csv). The
Engineering root covers the full `engineering.lehigh.edu` host; the other
three URLs are individual supplemental pages. Their exact-page scope still
needs confirmation. If these sources are already ingested, this update
shouldn't need another crawl. `knowledge_base/sample.md` is a placeholder and
shouldn't be ingested.

Once the update is live, we'll check the interface and run the existing
52-question set. From the repository root, the test command is:

```bash
bash scripts/run_question_suite.sh \
  --questions-file christopher-handoff/validation/test_questions.json \
  --bot-name "<existing bot name>" \
  --endpoint "<existing API endpoint>"
```

The script checks whether requests and responses work. We'll also read the
answers to check their sources and the new refusal rules, using the
[acceptance checklist](validation/ACCEPTANCE_CHECKLIST.md). Please send us the
updated link and the prompt version you applied when it's ready.

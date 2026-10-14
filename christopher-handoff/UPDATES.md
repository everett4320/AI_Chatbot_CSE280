# Ross update for October 4, 2026 (updated October 13)

We've updated the frontend and system prompt on `christopher-handoff`.

The frontend changes are mostly visual. The back button is gone, messages and
the input box use larger text, and the logo and chat icons are larger and
simpler. Mark's message-avatar change is included; the hidden starter
questions and Escape-key changes aren't part of this update. The welcome
message now says, "Hi, I'm Ross, your guide to the Rossin College of Engineering
here at Lehigh."

The revised prompt gives clearer instructions for questions outside the
Rossin College's scope, sensitive topics, crisis responses, and attempts to
override the chatbot's rules. We kept the team's revised text and changed only
the opening name from LE-Chat to Ross. The file to use is
[backend-inputs/SYSTEM_PROMPT.txt](backend-inputs/SYSTEM_PROMPT.txt).

The source list, test questions, and dependencies haven't changed. The October
13 follow-up adds build-time prompt embedding to the API adapter.

## What needs updating

1. Pull the latest `christopher-handoff` branch.
2. Rebuild the frontend with Node 22 and the existing API endpoint, bot name,
   and site path. The [README](README.md) has the commands.
3. Publish the complete `ai-chatbot-lehigh/build/client/` output through the
   usual Apache process. Keep the previous frontend and prompt available for
   rollback.
4. Send us the updated link and the prompt version you used. We'll check the
   public site and run the question tests.

The four source URLs haven't changed. If they're already ingested, there's
no need to crawl them again for this update.

## Build-time prompt

`npm run build` now reads `backend-inputs/SYSTEM_PROMPT.txt` and embeds its
full text in the frontend. Every question sends it as `custom_prompt`, with
`action: "question"` and `bot_name` from `VITE_CHAT_BOT_NAME`. Rebuild after
editing the prompt file; generated JavaScript assets no longer need manual
prompt edits.

The October 4 build and CI checks passed, including the Apache root and subpath tests.
We still need to test the real chat after deployment. The
[acceptance checklist](validation/ACCEPTANCE_CHECKLIST.md) covers that review,
and [RELEASE_MANIFEST.md](RELEASE_MANIFEST.md) records the prompt hash and
release details.

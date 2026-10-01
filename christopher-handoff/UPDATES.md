# Ross update for October 1, 2026

We've updated the frontend and system prompt on `christopher-handoff`.

The frontend changes are mostly visual. The back button is gone, messages and
the input box use larger text, and the logo and chat icons are larger and
simpler. Mark's message-avatar change is included; the hidden starter
questions and Escape-key changes aren't part of this update.

The revised prompt gives clearer instructions for questions outside the
Rossin College's scope, sensitive topics, crisis responses, and attempts to
override the chatbot's rules. We kept the team's revised text and changed only
the opening name from LE-Chat to Ross. The file to use is
[backend-inputs/SYSTEM_PROMPT.txt](backend-inputs/SYSTEM_PROMPT.txt).

The source list, test questions, dependencies, and API adapter haven't changed.

## What needs updating

1. Pull the latest `christopher-handoff` branch.
2. Replace the prompt using the platform's existing prompt settings.
3. Rebuild the frontend with Node 22 and the existing API endpoint, bot name,
   and site path. The [README](README.md) has the commands.
4. Publish the complete `ai-chatbot-lehigh/build/client/` output through the
   usual Apache process. Keep the previous frontend and prompt available for
   rollback.
5. Send us the updated link and the prompt version you used. We'll check the
   public site and run the question tests.

The four source URLs haven't changed. If they're already ingested, there's
no need to crawl them again for this update.

## One prompt detail to check first

The current site sends the old prompt as `custom_prompt` with every question.
The new frontend leaves that field out. Please confirm that the existing
platform will use the new prompt without it. If the prompt still needs to be
sent by the browser, we'll update the frontend before it's published.

The build and CI checks passed, including the Apache root and subpath tests.
We still need to test the real chat after deployment. The
[acceptance checklist](validation/ACCEPTANCE_CHECKLIST.md) covers that review,
and [RELEASE_MANIFEST.md](RELEASE_MANIFEST.md) records the prompt hash and
release details.

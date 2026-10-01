# October 1, 2026 update for Christopher

This is a frontend and prompt update to the existing Ross deployment. Relative
to the previous handoff commit, `d96d3dd`, the source catalog, test questions,
API adapter, dependencies, and Apache deployment configuration are unchanged.

## What changed

| Change | What to update |
| --- | --- |
| Frontend (`b407098`) | Rebuild `ai-chatbot-lehigh/` and publish the complete `build/client/` output. The back button is removed; message and input text are 16px; supporting text is larger; the header uses a larger blue-green logo; the launcher and reply/loading avatars use round icons. |
| System prompt (`e97c316`, with the opening name corrected to Ross) | Replace the prompt text using the platform's existing prompt workflow. The new text adds explicit closed-domain/refusal rules, sensitive-topic and demographic-claim restrictions, crisis handling, manipulation resistance, and tone/length guidance. |

The current prompt is [`backend-inputs/SYSTEM_PROMPT.txt`](backend-inputs/SYSTEM_PROMPT.txt).
It matches the team's prompt in `fetched_site/prompts/custom_prompt.txt`. Only
the first-sentence name was corrected from LE-Chat to Ross; the rest of the
team's revised text is preserved.

Prompt SHA-256 (tracked Git bytes, UTF-8 with LF line endings):

```text
f46c20bd968c767cbf5623b2ab95746c8bfcc787e2a24bcc558b6f8507092815
```

Mark's message-avatar change is included. His hidden starter questions and
Escape-key extension are not part of this release.

## Confirm before replacing the frontend

- [ ] Keep the existing confirmed API endpoint and bot routing value. Ross is
      the UI name; it does not imply a new `bot_name` or a new clone.
- [ ] Confirm where the existing deployment applies its prompt. The public
      site inspected on October 1 still sent the old prompt as `custom_prompt`
      with each question and used `bot_name: le-chat`. This is an observation
      of the browser bundle, not proof of its server-side mapping. The handoff
      frontend omits `custom_prompt`, so it needs the platform's existing
      prompt setting to supply the new text. If the fixed platform requires
      a request-level prompt, tell us the requirement and we will adapt the
      frontend before replacement.

We are not requesting a backend, API, model, retrieval, or bot-routing change.

## Update checklist

1. Save the current frontend artifact and prompt text using your normal
   rollback process.
2. Pull the delivery branch and record the exact release commit:

   ```bash
   git fetch origin
   git switch christopher-handoff
   git pull --ff-only origin christopher-handoff
   git rev-parse HEAD
   ```

3. Apply `christopher-handoff/backend-inputs/SYSTEM_PROMPT.txt` through the
   confirmed existing prompt workflow. Retain the configured text or
   configuration record so we can identify the version used by subsequent
   tests.
4. Build with Node 22 and the existing deployment values:

   ```bash
   cd ai-chatbot-lehigh
   export VITE_CHAT_API_URL="<confirmed existing API endpoint>"
   export VITE_CHAT_BOT_NAME="<confirmed existing bot routing value>"
   export VITE_BASE_PATH="/"
   npm ci
   npm run verify:deployment
   ```

5. Publish the complete contents of `build/client/` together using the usual
   Apache deployment process at <https://ross.cc.lehigh.edu/>. Keep the
   existing root-path SPA fallback to `/index.html`. No production Node
   process is needed. Changing any `VITE_*` value requires a rebuild.
6. Check the public release and share its commit, URL, and prompt record:

   - Refresh the page and a direct frontend route; check that JS, CSS, and
     icons load.
   - Check the new logo/avatars, larger text, phone layout, and removed back
     button.
   - Send a real in-scope question; check the answer and source links.
   - Check both feedback ratings and `NEW CHAT`.
   - Check an out-of-scope refusal and the new crisis/manipulation rules.
7. Run the existing 52-question suite from the repository root with the
   confirmed endpoint and bot name:

   ```bash
   cd ..
   bash scripts/run_question_suite.sh \
     --questions-file christopher-handoff/validation/test_questions.json \
     --bot-name "<confirmed existing bot routing value>" \
     --endpoint "<confirmed existing API endpoint>"
   ```

   Keep the transport record and manually review the answers using
   [`validation/ACCEPTANCE_CHECKLIST.md`](validation/ACCEPTANCE_CHECKLIST.md).
   This script does not read back the platform prompt; its transport result
   or prompt metadata cannot prove that the new prompt was applied.

The four crawler seeds and 52 test questions are unchanged. If their existing
ingestion is complete, this release needs no new crawl or source ingestion.
Record the release and reused source results in
[`RELEASE_MANIFEST.md`](RELEASE_MANIFEST.md).

## Deployment evidence and remaining confirmation

The approved frontend passed typechecking, 14 contract tests, a static build,
and browser checks at six desktop/phone/landscape sizes. Its
[Frontend CI](https://github.com/everett4320/AI_Chatbot_CSE280/actions/runs/36916462283)
also built and smoke-tested Apache at the root and `/ross-test/`, including
direct refreshes and SVG assets.

The current public site returned HTTP 200 and served a root-path Apache SPA.
We have not verified a live question/feedback POST with this new release, the
server-side bot mapping, or the applied platform prompt. Those are the release
checks above; a successful build is not evidence that they are complete.

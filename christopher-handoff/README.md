# Ross handoff for Christopher

Start here. This folder is the complete handoff for connecting the team-owned
Ross frontend to Christopher's existing chatbot platform.

The backend, server behavior, API shape, retrieval system, model, and AWS
environment are fixed and remain under Christopher's control. This repository
contains no backend implementation and requests no backend or server changes.
If an integration detail does not match, the student team will adapt the
frontend to the fixed service.

## Delivery map

| Item | Authoritative file | Status |
| --- | --- | --- |
| Frontend design and source | [`../ai-chatbot-lehigh/`](../ai-chatbot-lehigh/) | Ready to build |
| Five URLs for the existing crawler | [`backend-inputs/SOURCE_CATALOG.csv`](backend-inputs/SOURCE_CATALOG.csv) | Ready for ingestion |
| Ross system prompt | [`backend-inputs/SYSTEM_PROMPT.txt`](backend-inputs/SYSTEM_PROMPT.txt) | Ready for existing prompt configuration |
| Fixed frontend/API interface | [`backend-inputs/API_CONTRACT.md`](backend-inputs/API_CONTRACT.md) | Implemented by the frontend |
| Test questions and sign-off | [`validation/`](validation/) | Ready after a Ross URL exists |
| Deployment record | [`RELEASE_MANIFEST.md`](RELEASE_MANIFEST.md) | Fill in during deployment |

The `fetched_site/` and `knowledge_base/` folders are historical or working
material. They are not deployment inputs. In particular, do not reuse the old
shared endpoint, the `le-chat` bot name, or `knowledge_base/sample.md`.

## Fastest path to a working deployment

1. Check out the delivery branch.

   ```bash
   git clone --branch codex/christopher-handoff --single-branch \
     https://github.com/everett4320/AI_Chatbot_CSE280.git
   cd AI_Chatbot_CSE280
   ```

2. In the existing chatbot platform, select or register the Ross bot using the
   normal fixed workflow. No server code or API behavior needs to change.
3. Give the five URLs in
   `christopher-handoff/backend-inputs/SOURCE_CATALOG.csv` to the existing
   crawler. Record each resulting source ID and ingestion result.
4. Load `christopher-handoff/backend-inputs/SYSTEM_PROMPT.txt` through the
   existing prompt configuration workflow. Do not send this prompt from the
   browser on each request.
5. Copy the already assigned HTTPS API endpoint and Ross `bot_name` into the
   frontend build. Use the frontend origin and public path already supported by
   the fixed service.

   ```bash
   cd ai-chatbot-lehigh
   export VITE_CHAT_API_URL="<fixed Ross API endpoint>"
   export VITE_CHAT_BOT_NAME="<fixed Ross bot name>"
   export VITE_BASE_PATH="/ross-test/"
   npm ci
   npm run verify:deployment
   npm run start
   ```

   `/ross-test/` is an example. Use `/` when AWS serves the frontend at the
   domain root. The server listens on port 3000. Docker commands are in
   [`../ai-chatbot-lehigh/README.md`](../ai-chatbot-lehigh/README.md).
6. Deploy this built frontend with the existing AWS process. AWS hosting and
   the public deployment are Christopher's responsibility; this repository
   does not create or change that infrastructure.
7. Send the final HTTPS public URL and the recorded values below to the student
   team. The team will complete the browser and content acceptance checks.

## Inputs to copy directly

### System prompt

Use [`backend-inputs/SYSTEM_PROMPT.txt`](backend-inputs/SYSTEM_PROMPT.txt).

SHA-256:
`5f13fd929d0f790374b37e6a2807e7e2984654aba565cc18fa9b7a15dfe9a14d`

### Crawl URLs

The machine-readable source is
[`backend-inputs/SOURCE_CATALOG.csv`](backend-inputs/SOURCE_CATALOG.csv).
These five public pages all returned HTTP 200 on September 21, 2026:

1. <https://engineering.lehigh.edu/academics>
2. <https://engineering.lehigh.edu/academics/undergraduate>
3. <https://www2.lehigh.edu/admissions/college-program-events>
4. <https://www2.lehigh.edu/admissions/post-graduation-career-outcomes>
5. <https://careercenter.lehigh.edu/content/meet-team>

They are crawl inputs, not an already indexed knowledge base. The
`backend_source_uri` cells stay blank until the existing crawler returns its
source identifiers.

## Values to return after deployment

Please record these in `RELEASE_MANIFEST.md` and send them with the public link:

1. The fixed Ross `bot_name`.
2. The fixed API endpoint used by the frontend build.
3. The supported frontend origin and `VITE_BASE_PATH`.
4. The ingestion result and source ID for each of the five URLs.
5. The final AWS-hosted HTTPS URL.

These are existing configuration values and deployment results. We are not
asking for changes to the backend, API, model, retrieval logic, CORS behavior,
or server implementation.

## Acceptance run

After the Ross endpoint, bot name, and public URL are available, a tester with
Bash, `curl`, and `jq` can record the fixed-interface responses from the
repository root:

```bash
bash scripts/run_question_suite.sh \
  --endpoint "<fixed Ross API endpoint>" \
  --bot-name "<fixed Ross bot name>" \
  --questions-file christopher-handoff/validation/test_questions.json \
  --sections 123
```

The automated result proves transport and response shape only. Use
[`validation/ACCEPTANCE_CHECKLIST.md`](validation/ACCEPTANCE_CHECKLIST.md) for
manual grounding, source, scope, and UI review. A local demo reply or the
historical screenshot in the root README is not a Ross backend test.

## Maintenance

- [`UPDATES.md`](UPDATES.md) explains later frontend, prompt, and source-list
  updates without changing the backend contract.
- [`BRANCH_CONSOLIDATION.md`](BRANCH_CONSOLIDATION.md) records how earlier
  branch work was preserved in this delivery.

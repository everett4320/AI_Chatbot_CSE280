# Ross handoff for Christopher

This is the AI chatbot project for Lehigh University's P.C. Rossin College of
Engineering and Applied Science. The project was previously called **LE-Chat**
and is now called **Ross**. Our project sponsor is **Chris Larkin**.

Thank you for helping us connect the Ross frontend to the existing chatbot
platform. We have prepared the frontend, source list, system prompt, and test
materials in this branch. Our goal is a public HTTPS link that first-year
students can open without cloning the repository or setting up the app locally.

We understand that the backend, server behavior, API shape, retrieval system,
model, and AWS environment are fixed and managed on Christopher's side. This
repository contains no backend implementation and requests no backend or server
changes. Because we do not have access to that environment, some details below
may not match the normal deployment process exactly. Please use the workflow
that is appropriate on your side, and let us know what we should change in the
frontend or documentation if any assumption is incorrect.

## Delivery map

| Item | Authoritative file | Status |
| --- | --- | --- |
| Frontend design and source | [`../ai-chatbot-lehigh/`](../ai-chatbot-lehigh/) | Prepared for build |
| Five URLs for the existing crawler | [`backend-inputs/SOURCE_CATALOG.csv`](backend-inputs/SOURCE_CATALOG.csv) | Prepared for ingestion |
| Ross system prompt | [`backend-inputs/SYSTEM_PROMPT.txt`](backend-inputs/SYSTEM_PROMPT.txt) | Prepared for the existing prompt workflow |
| Fixed frontend/API interface | [`backend-inputs/API_CONTRACT.md`](backend-inputs/API_CONTRACT.md) | Implemented by the frontend |
| Test questions and sign-off | [`validation/`](validation/) | For joint validation after a public URL is available |
| Deployment record | [`RELEASE_MANIFEST.md`](RELEASE_MANIFEST.md) | To be completed as details become available |

The `fetched_site/` and `knowledge_base/` folders are historical or working
material rather than deployment inputs. Please use the files linked in the
table above instead of the old shared endpoint, the `le-chat` bot name, or
`knowledge_base/sample.md`.

## Suggested handoff flow

The following steps reflect our current understanding. Please adapt them to the
existing platform and AWS process rather than changing the backend to match
this document.

1. Check out the delivery branch.

   ```bash
   git clone --branch christopher-handoff --single-branch \
     https://github.com/everett4320/AI_Chatbot_CSE280.git
   cd AI_Chatbot_CSE280
   ```

2. Could you please select or register Ross through the platform's normal
   workflow? We do not expect any server code or API behavior to change.
3. When convenient, please give the five URLs in
   `christopher-handoff/backend-inputs/SOURCE_CATALOG.csv` to the existing
   crawler. If it returns source IDs or ingestion results, it would help our
   validation if those could be shared or recorded.
4. Please apply `christopher-handoff/backend-inputs/SYSTEM_PROMPT.txt` through
   the existing prompt configuration workflow. The browser frontend does not
   send this prompt on each request.
5. For the frontend build, could you please use the HTTPS API endpoint, Ross
   `bot_name`, and public path already assigned by the platform? If our variable
   mapping is not correct, please tell us what the frontend should use instead.

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
6. Could you please deploy the built frontend through the existing AWS process?
   We are hoping for a public HTTPS URL that first-year students can open
   without GitHub or AWS credentials. This repository does not create or change
   the AWS infrastructure.
7. When it is ready, please send us the public URL and any relevant values below.
   Our team will complete the browser and content acceptance checks.

## Materials we prepared

### System prompt

The prompt we prepared is
[`backend-inputs/SYSTEM_PROMPT.txt`](backend-inputs/SYSTEM_PROMPT.txt).

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

## Information that would help us after deployment

If available through the normal process, it would help us if you could record
these in `RELEASE_MANIFEST.md` or send them with the public link:

1. The fixed Ross `bot_name`.
2. The fixed API endpoint used by the frontend build.
3. The supported frontend origin and `VITE_BASE_PATH`.
4. The ingestion result and source ID for each of the five URLs.
5. The final AWS-hosted HTTPS URL.

These are existing configuration values and deployment results, not requests
to change the backend, API, model, retrieval logic, CORS behavior, or server
implementation.

## Acceptance run

After we receive the Ross endpoint, bot name, and public URL, our team can use
Bash, `curl`, and `jq` to record the fixed-interface responses from the
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

If any path, variable, payload assumption, or deployment note does not fit the
existing platform, please tell us what you need it to look like. We will update
the frontend or handoff material on our side.

## Maintenance

- [`UPDATES.md`](UPDATES.md) explains later frontend, prompt, and source-list
  updates without changing the backend contract.
- [`BRANCH_CONSOLIDATION.md`](BRANCH_CONSOLIDATION.md) records how earlier
  branch work was preserved in this delivery.

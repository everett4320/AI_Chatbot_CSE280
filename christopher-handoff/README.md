# Ross handoff for Christopher

Ross is the AI chatbot project for Lehigh University's P.C. Rossin College of
Engineering and Applied Science. It was previously called LE-Chat, and Chris
Larkin is the project sponsor.

Thanks for helping us get the updated frontend connected and deployed. This
branch contains the frontend, the source pages, our system prompt, and the test
questions.

We do not have access to the backend or the AWS environment, so the setup notes
below are based on our current understanding. We do not expect any backend or
API changes. If something does not match your platform, tell us what the
frontend should send or expect and we will update it.

## Files in this handoff

- [`../ai-chatbot-lehigh/`](../ai-chatbot-lehigh/) contains the frontend.
- [`backend-inputs/SOURCE_CATALOG.csv`](backend-inputs/SOURCE_CATALOG.csv)
  contains the five source pages.
- [`backend-inputs/SYSTEM_PROMPT.txt`](backend-inputs/SYSTEM_PROMPT.txt) is the
  Ross system prompt.
- [`backend-inputs/API_CONTRACT.md`](backend-inputs/API_CONTRACT.md) documents
  the interface currently used by the frontend.
- [`validation/`](validation/) contains the test questions and checklist.
- [`RELEASE_MANIFEST.md`](RELEASE_MANIFEST.md) can be used to record the final
  deployment details.

The `fetched_site/` and `knowledge_base/` folders are older project material.
They are not inputs for this deployment. In particular, please do not use the
old shared endpoint, the `le-chat` bot name, or `knowledge_base/sample.md`.

## Check out the branch

```bash
git clone --branch christopher-handoff --single-branch \
  https://github.com/everett4320/AI_Chatbot_CSE280.git
cd AI_Chatbot_CSE280
```

## Source pages and system prompt

Please use the normal workflow on your platform to select or register Ross,
crawl the five pages below, and apply the system prompt.

The pages were checked on September 22, 2026, and all returned HTTP 200:

1. <https://engineering.lehigh.edu/academics>
2. <https://engineering.lehigh.edu/academics/undergraduate>
3. <https://www2.lehigh.edu/admissions/college-program-events>
4. <https://www2.lehigh.edu/admissions/post-graduation-career-outcomes>
5. <https://careercenter.lehigh.edu/content/meet-team>

The CSV version is
[`backend-inputs/SOURCE_CATALOG.csv`](backend-inputs/SOURCE_CATALOG.csv).
The `backend_source_uri` cells are blank because those IDs are created by the
crawler.

The prompt is
[`backend-inputs/SYSTEM_PROMPT.txt`](backend-inputs/SYSTEM_PROMPT.txt).

Its SHA-256 is:

```text
5f13fd929d0f790374b37e6a2807e7e2984654aba565cc18fa9b7a15dfe9a14d
```

We expect the prompt to be applied through the platform configuration rather
than sent by the browser with every request.

## Build the frontend

Use the Ross endpoint, bot name, and public path from the existing deployment.
If these variables do not match the way your platform is configured, send us
the values or format the frontend should use.

```bash
cd ai-chatbot-lehigh
export VITE_CHAT_API_URL="<Ross API endpoint>"
export VITE_CHAT_BOT_NAME="<Ross bot name>"
export VITE_BASE_PATH="/ross-test/"
npm ci
npm run verify:deployment
npm run start
```

`/ross-test/` is an example. Use `/` if AWS serves the frontend at the domain
root. The Node server listens on port 3000. Docker instructions are in
[`../ai-chatbot-lehigh/README.md`](../ai-chatbot-lehigh/README.md).

## AWS deployment and testing

Once the frontend is built, could you deploy it through your existing AWS setup
and send us a public HTTPS link that anyone can open? We plan to test it with
first-year students, so they should not need GitHub or AWS credentials.

If convenient, please also record the bot name, endpoint, public path, and
source IDs in [`RELEASE_MANIFEST.md`](RELEASE_MANIFEST.md). We mainly need the
public URL; the other values help us reproduce and check the frontend setup.

After deployment, our team will run:

```bash
bash scripts/run_question_suite.sh \
  --endpoint "<Ross API endpoint>" \
  --bot-name "<Ross bot name>" \
  --questions-file christopher-handoff/validation/test_questions.json \
  --sections 123
```

This script checks the request and response format. We will use
[`validation/ACCEPTANCE_CHECKLIST.md`](validation/ACCEPTANCE_CHECKLIST.md) for
the browser, source, and answer-quality review.

Later update instructions are in [`UPDATES.md`](UPDATES.md). The branch history
is recorded in [`BRANCH_CONSOLIDATION.md`](BRANCH_CONSOLIDATION.md).

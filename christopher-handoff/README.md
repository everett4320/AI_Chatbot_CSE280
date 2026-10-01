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

For the October 1 update, start with [`UPDATES.md`](UPDATES.md). It lists the
two changes, the deployment steps, and the current prompt-configuration check.

## Files in this handoff

- [`../ai-chatbot-lehigh/`](../ai-chatbot-lehigh/) contains the frontend.
- [`backend-inputs/SOURCE_CATALOG.csv`](backend-inputs/SOURCE_CATALOG.csv)
  contains the four crawler seeds.
- [`backend-inputs/SYSTEM_PROMPT.txt`](backend-inputs/SYSTEM_PROMPT.txt) is the
  Ross system prompt.
- [`backend-inputs/API_CONTRACT.md`](backend-inputs/API_CONTRACT.md) documents
  the interface currently used by the frontend.
- [`validation/`](validation/) contains the test questions and checklist.
- [`RELEASE_MANIFEST.md`](RELEASE_MANIFEST.md) can be used to record the final
  deployment details.

Use the prompt and source catalog in this handoff, rather than copying inputs
or configuration from `fetched_site/` or `knowledge_base/`. Keep the endpoint
and bot name confirmed for the existing deployment; the UI name Ross does not
determine its routing value. `knowledge_base/sample.md` is not a Ross source.

## Check out the branch

```bash
git clone --branch christopher-handoff --single-branch \
  https://github.com/everett4320/AI_Chatbot_CSE280.git
cd AI_Chatbot_CSE280
```

## Source pages and system prompt

Please use the normal workflow on your platform to select or register Ross and
apply the system prompt. For the Engineering seed, use host-only crawling so it
covers all public pages on `engineering.lehigh.edu`. The other three URLs are
individual supplemental pages. We removed the separate
`/academics/undergraduate` seed because the host-only crawl covers it. The
scope for the three supplemental pages still needs confirmation.

The four seeds were checked on September 22, 2026, and all returned HTTP 200:

1. <https://engineering.lehigh.edu/> — crawl the full host
2. <https://www2.lehigh.edu/admissions/college-program-events>
3. <https://www2.lehigh.edu/admissions/post-graduation-career-outcomes>
4. <https://careercenter.lehigh.edu/content/meet-team>

The CSV version is
[`backend-inputs/SOURCE_CATALOG.csv`](backend-inputs/SOURCE_CATALOG.csv).
The `backend_source_uri` cells are blank because those IDs are created by the
crawler.

The prompt is
[`backend-inputs/SYSTEM_PROMPT.txt`](backend-inputs/SYSTEM_PROMPT.txt).

The SHA-256 of the tracked prompt (Git blob bytes) is:

```text
f46c20bd968c767cbf5623b2ab95746c8bfcc787e2a24bcc558b6f8507092815
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
export VITE_BASE_PATH="/"
npm ci
npm run build
```

This creates the static site in `build/client/`. Please use your usual Apache
setup to serve those files at `https://ross.cc.lehigh.edu/`; no separate Node
process is needed. We use `npm run verify:deployment` to run our checks before
a release. If the frontend needs a different path or API setting for your site,
please tell us. Full Apache and Docker notes are in
[`../ai-chatbot-lehigh/README.md`](../ai-chatbot-lehigh/README.md).

## Check the deployed Ross clone

Once the Ross endpoint and bot name are confirmed, the handoff questions can be
run from the repository root (Bash, `curl`, and `jq` are required):

```bash
bash scripts/run_question_suite.sh \
  --questions-file christopher-handoff/validation/test_questions.json \
  --bot-name "<Ross bot name>" \
  --endpoint "<Ross API endpoint>"
```

In an interactive terminal, the script asks which sections to run; without one,
it runs all enabled sections. It saves local records under the ignored
`fetched_site/prompt_effectiveness_runs/` directory and uses the
backend-configured prompt. The automated result checks transport only; please use
[`validation/ACCEPTANCE_CHECKLIST.md`](validation/ACCEPTANCE_CHECKLIST.md) to
review clone identity, grounding, sources, and refusal quality.

# Ross 2.0

- Added the Review 3 artwork without a mouth to the launcher, header and chat.
- Questions now send `remember_conversation: "True"` and reuse the session ID
  returned by the API. New Chat starts a separate session.
- Ross shows a waiting indicator until the full JSON reply arrives. Failed
  requests get a short message and, when appropriate, a retry button.
  Retrying keeps one copy of the question in the chat.
- The Apache installer builds and checks the site, publishes it in one
  command, and can restore the previous release.
- Updated Vite and Vitest to clear the dependency audit.

The build sends the full October prompt as `custom_prompt`. The four existing
sources, API and feedback storage are unchanged.

## Validation, November 10

The 40 frontend tests, type checks, static build, API-tool contract tests, and
source deployment/rollback checks passed. The QA tools now use the same full
prompt as the frontend, including its final newline.

All 52 questions in the handoff suite returned HTTP 200 with valid answer
responses using that exact prompt. Answers and sources were reviewed separately;
the service observations below remain open.

## Existing service checks

CORS preflight and the Bioengineering question returned HTTP 200. Two
follow-ups asked for the major again, while a third referred to Bioengineering.
Check follow-up context again after cutover.

Two earlier questions still returned HTTP 500 with `list index out of range`.
The frontend handles these as service errors and offers a retry.

- ¿Cuál es la diferencia entre CS, CSE y CSB en Lehigh?
- Does Lehigh offer Biomechanical Engineering?

Answer review found old/graduate course references in undergraduate guidance,
scope and funding-boundary failures, internal-policy disclosure in indirect
questions, and replies exceeding the length target. Review current routing,
sources and prompt adherence during acceptance; behavior acceptance remains
open despite the 52 successful requests.

Feedback dashboard access is still pending with the platform team. Use the
[deployment checklist](validation/ACCEPTANCE_CHECKLIST.md) to record the existing
source IDs, feedback receipt, routing and data-retention confirmation.

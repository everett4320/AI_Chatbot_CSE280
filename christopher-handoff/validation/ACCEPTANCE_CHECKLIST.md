# Christopher handoff acceptance checklist

## Clone and configuration

- [ ] The deployed configuration matches the existing Ross endpoint and bot
      name. Record the commit and cutover time in the server's release records.
- [ ] The frontend build uses that exact `VITE_CHAT_BOT_NAME`.
- [ ] Question requests send `action: "question"`, the configured `bot_name`,
      `remember_conversation: "True"` as a string, and `custom_prompt` matching
      `backend-inputs/SYSTEM_PROMPT.txt`.
- [ ] The fixed model or platform version is recorded if it is visible; no
      model change is requested.
- [ ] The frontend is deployed at an origin supported by the fixed service.

## Knowledge-base ingestion

- [ ] At least one source from `SOURCE_CATALOG.csv` is successfully ingested.
- [ ] Every `include=yes` source row has an ingestion result.
- [ ] Each successful row has a confirmed `backend_source_uri` or equivalent
      platform source identifier.
- [ ] No placeholder/sample document was ingested.
- [ ] Returned `Sources[]` titles and URLs identify the intended official
      material.
- [ ] Failed, excluded, inaccessible, or unapproved sources remain documented
      in `SOURCE_CATALOG.csv`.

## Frontend and API

- [ ] The HTTPS site and a direct route refresh work at the configured mount.
- [ ] Browser assets load with no CORS or 404 errors.
- [ ] Christopher confirms that the fixed `bot_name` maps to Ross using the
      existing platform record; no response-schema change is required.
- [ ] A normal answer renders Markdown and source links.
- [ ] Replies arrive as complete JSON responses; the waiting indicator clears
      when an answer or error arrives. No streaming connection is used.
- [ ] Good and Bad feedback reach the expected clone.
- [ ] Failure messages give a concise next step for service errors, rate limits,
      timeouts, connection and access failures, and invalid replies; raw error
      details are never exposed, including for unknown errors.
- [ ] HTTP 403 and 500 are not presented as policy violations solely because of
      their status; a refusal in a normal `Response` renders as an answer.
- [ ] Retry resends the original question without duplicating its user bubble;
      feedback failures are reported separately from question failures.
- [ ] `NEW CHAT` clears the transcript and input draft and starts a new backend
      session without restoring an older pending reply or reusing its context.
- [ ] Ask about a named major, then ask "Which department offers that major?"
      using the same canonical session ID; the answer resolves the earlier major.

## Behavior QA

- [ ] Run `validation/test_questions.json` with the assigned endpoint and bot
      slug, then retain the resulting transport record.
- [ ] Manually score clone identity, grounding, sources, and refusal quality;
      the suite's automated result is transport-only and is not acceptance by
      itself.
- [ ] Program questions are grounded in the ingested Ross sources.
- [ ] Retest the earlier HTTP 500 inputs, including the Spanish CS/CSE/CSB
      question and "Does Lehigh offer Biomechanical Engineering?" Retain actual
      statuses and request IDs; a friendly error message alone is not evidence
      that the backend failure is fixed.
- [ ] Unsupported questions return the intended evidence-limited response.
- [ ] Visa/immigration and funding questions are handled within the prompt's
      explicit scope boundary.
- [ ] Bias/fairness and political-advice questions remain grounded, avoid
      stereotypes or unsupported advice, and stay within the configured scope.
- [ ] Check the new indirect-crisis response, encoded/manipulation refusal,
      and brief replies to questions about the assistant itself; these need
      manual checks beyond the unchanged 52-question suite.

## Rollback

- [ ] The installer saved the previous index and kept its assets available.
- [ ] The deployment record has the previous commit and prompt version.

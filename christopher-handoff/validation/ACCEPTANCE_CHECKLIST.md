# Ross 2.0 deployment acceptance

Run after Christopher deploys 2.0. Record the deployed commit and cutover time
in the server's release record.

- [ ] Open the HTTPS site and refresh a direct route. Check assets at the
      configured mount, including the three Review 3 icons and a narrow viewport.
- [ ] Confirm the existing endpoint and `bot_name` still route to Ross.
      Question payloads contain the full `SYSTEM_PROMPT.txt`,
      `action: "question"` and string `remember_conversation: "True"`.
- [ ] Ask about a named major, then ask which department offers it. Confirm
      context uses the returned session ID. New Chat clears the transcript and
      draft and starts a separate session.
- [ ] Check Markdown, official source links, waiting state, service errors and
      retry. Retry must keep one copy of the question. Replies are complete JSON.
- [ ] Submit Good/Bad feedback and confirm receipt against the intended answer
      in RDS. Confirm team dashboard access or record the pending access decision.
- [ ] Confirm the four existing sources remain loaded. Record their actual
      crawl scopes and platform IDs in `backend-inputs/SOURCE_CATALOG.csv` if
      available; no source changes are requested for 2.0.
- [ ] Confirm server transcripts and logs stay on Lehigh-managed resources,
      with retention and access handled through the existing platform policy.
- [ ] Run the 52-question command in the handoff README. Review answer
      grounding, sources, scope boundaries and refusal quality; HTTP success
      alone is not behavior acceptance. Include the additional context and
      failure checks noted in `../UPDATES.md`.
- [ ] Confirm the installer retained the previous index and assets for rollback.

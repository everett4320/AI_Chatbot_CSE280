# Christopher acceptance checklist

## Clone and configuration

- [ ] Ross clone exists and its stable `bot_name` is recorded in
      `RELEASE_MANIFEST.md`.
- [ ] The frontend build uses that exact `VITE_CHAT_BOT_NAME`.
- [ ] The clone-level prompt configuration (or an explicitly approved platform
      equivalent) hash matches `backend-inputs/SYSTEM_PROMPT.txt`.
- [ ] The chosen model and any platform policy are recorded.
- [ ] CORS permits the assigned Ross test origin.

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

- [ ] The HTTPS test URL and direct subpath reload work.
- [ ] Browser assets load with no CORS or 404 errors.
- [ ] A question reaches the assigned Ross clone, not another bot; retain
      backend routing evidence or an approved clone-identity response field.
- [ ] A normal answer renders Markdown and source links.
- [ ] Good and Bad feedback reach the expected clone.
- [ ] Clearing the chat starts a new backend session.

## Behavior QA

- [ ] Run `validation/test_questions.json` with the assigned endpoint and bot
      slug, then retain the resulting transport record.
- [ ] Manually score clone identity, grounding, sources, and refusal quality;
      the suite's automated result is transport-only and is not acceptance by
      itself.
- [ ] Program questions are grounded in the ingested Ross sources.
- [ ] Unsupported questions return the intended evidence-limited response.
- [ ] Visa/immigration and funding questions are handled within the prompt's
      explicit scope boundary.
- [ ] Bias/fairness and political-advice questions remain grounded, avoid
      stereotypes or unsupported advice, and stay within the configured scope.

## Rollback

- [ ] Previous frontend artifact, clone configuration, prompt version, model,
      and source-set version are recorded before public cutover.

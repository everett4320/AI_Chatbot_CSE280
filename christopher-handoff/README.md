# Ross 2.0 handoff

Deploy from `christopher-handoff`. The app runs as static files on the existing
Apache site at <https://ross.cc.lehigh.edu/>.

## Deploy from the branch

Use Node 22 on the build host and pull the branch.

```bash
git fetch origin christopher-handoff
git switch christopher-handoff
git merge --ff-only FETCH_HEAD
```

Export the endpoint and bot name from the current Ross deployment as
`VITE_CHAT_API_URL` and `VITE_CHAT_BOT_NAME`. The public path defaults to `/`.

From the repository root, run this as the user who can write to the Ross
document root. Replace the example path with the existing Apache path.

```bash
bash scripts/deploy_ross.sh /var/www/ross
```

The command installs dependencies, runs the frontend checks, builds the site,
and copies the static files to Apache. It publishes the new `index.html` last
and keeps the old assets available for open tabs and rollback. It needs Bash,
`rsync`, and `flock` on Linux. Keep the existing Apache `index.html` fallback.

If you're using the prebuilt archive, extract it and run
`bash deploy_ross.sh /var/www/ross` from the extracted directory. The archive
is built for the existing Ross endpoint and the root path. Node is needed on
the build host only.

## Check and roll back

Open the site, send a question and a follow-up, then start a new chat. Check
source links and feedback. Use the [acceptance checklist](validation/ACCEPTANCE_CHECKLIST.md)
for the full pass. See the [release notes](UPDATES.md) for the current API
retest.

Run the 52-question suite from the repository root with Bash, `curl`, and `jq`.
It sends the same prompt and conversation flag as the frontend. Review the
answers and sources separately from the HTTP results.

```bash
bash scripts/run_question_suite.sh \
  --questions-file christopher-handoff/validation/test_questions.json \
  --custom-prompt-file christopher-handoff/backend-inputs/SYSTEM_PROMPT.txt \
  --bot-name "$VITE_CHAT_BOT_NAME" \
  --endpoint "$VITE_CHAT_API_URL"
```

To restore the last version from the checkout, use the same deploy user.

```bash
bash scripts/deploy_ross.sh --rollback /var/www/ross
```

From the extracted archive, use `bash deploy_ross.sh --rollback /var/www/ross`.

## Prompt and sources

The build reads [SYSTEM_PROMPT.txt](backend-inputs/SYSTEM_PROMPT.txt) and sends
its full text with every question. Rebuild after editing it. The
[release record](RELEASE_MANIFEST.md) identifies the prompt version.

The [source list](backend-inputs/SOURCE_CATALOG.csv) still has the Engineering
host and three supplemental pages. Reuse the existing ingestion. The
[API contract](backend-inputs/API_CONTRACT.md) covers questions, session IDs,
and feedback.

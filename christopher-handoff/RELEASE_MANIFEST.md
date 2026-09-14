# Ross deployment receipt

Complete this receipt during Christopher's configuration and keep it with the
test deployment record.

| Field | Value / status |
| --- | --- |
| Handoff status | **Configuration-review branch — awaiting Christopher clone configuration and source ingestion** |
| Frontend Git branch | `codex/christopher-handoff` |
| Immutable Git commit | Record the GitHub commit SHA that is shared with Christopher after push |
| Frontend source location | `ai-chatbot-lehigh/` on this branch |
| Public test URL | Not assigned |
| Public mount path | Not assigned |
| API URL | Christopher / ITS to confirm |
| Ross `bot_name` | **Required — not yet confirmed** |
| Clone / collection ID | Christopher to record |
| System prompt | `backend-inputs/SYSTEM_PROMPT.txt` |
| System prompt SHA-256 | Verify after checkout with `Get-FileHash christopher-handoff/backend-inputs/SYSTEM_PROMPT.txt -Algorithm SHA256` |
| System prompt status | Ross prompt ready for Christopher's clone-level configuration and QA |
| Source catalog rows ready for ingestion | `5` verified official URLs; ingestion remains pending |
| Sources ingested successfully | Christopher to record |
| Failed / excluded sources | Christopher to record |
| Backend source URI mapping returned | Christopher to record |
| Model / version | Christopher to record |
| CORS / authentication notes | Christopher to record |
| Acceptance run location | Christopher to record |
| Rollback target | Previous frontend artifact + prior clone configuration/source-set version |

## Completion condition

Mark this handoff ready for a public test link only after at least one source is
successfully ingested, every included catalog row has a documented ingestion
outcome, the configured prompt hash matches this receipt, the exact bot slug is
used by the frontend, and the acceptance checklist passes.

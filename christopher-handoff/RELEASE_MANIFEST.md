# Ross 2.0 release record

| Item | Value |
| --- | --- |
| Branch | `christopher-handoff` |
| Site | <https://ross.cc.lehigh.edu/> |
| Build | Node 22, static React Router SPA |
| Apache mount | `/` with an `/index.html` fallback |
| API endpoint and bot name | Existing Ross deployment values |
| Prompt SHA-256 (LF line endings) | `f46c20bd968c767cbf5623b2ab95746c8bfcc787e2a24bcc558b6f8507092815` |
| Source catalog | Four entries in [SOURCE_CATALOG.csv](backend-inputs/SOURCE_CATALOG.csv) |
| Rollback | Restore the previous index with the installer. Previous assets stay in the document root. |

Record the deployed commit and cutover time with the server's normal release
records. Run the [acceptance checklist](validation/ACCEPTANCE_CHECKLIST.md)
after cutover.

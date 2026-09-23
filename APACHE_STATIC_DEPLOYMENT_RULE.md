# Apache static deployment rule

Christopher asked whether `npm run build` could produce static frontend files
for his Apache site instead of requiring a separate Node process. The team
agreed in its September 22 reply. Production should not require
`react-router-serve`.

Ross frontend deployments from this repository must follow these rules:

- React Router must build in SPA/static mode and produce
  `build/client/index.html`.
- `build/client/` is the static frontend artifact to integrate into the existing
  Apache hosting process; no server bundle or separate Node process is needed.
- `VITE_CHAT_API_URL`, `VITE_CHAT_BOT_NAME`, and `VITE_BASE_PATH` remain
  build-time values. Changing one requires a rebuild.
- For the proposed `https://ross.cc.lehigh.edu/` URL, use `VITE_BASE_PATH=/` if
  Ross is mounted at the domain root; use the actual mount path otherwise.
- Apache must serve `index.html` as the fallback for frontend routes at the
  chosen mount path.
- The fixed chatbot backend, API shape, RAG system, and model are not changed by
  this frontend deployment rule.
- The final Apache origin must be compatible with the fixed API's CORS policy.

## Current implementation

The frontend in `ai-chatbot-lehigh/` builds as a static SPA with `npm run build`
after the assigned build-time values are set. `npm run verify:deployment` adds
configuration and contract checks. Christopher's actual Apache placement follows
his existing AWS workflow; check the current CI result before handing over
`build/client/`.

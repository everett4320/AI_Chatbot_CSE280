# Apache static deployment rule

Christopher confirmed that the Ross frontend should be built once and served
as static HTML, JavaScript, CSS, and image files by Apache. Production should
not require a Node process or `react-router-serve`.

Future deployment work from this branch must follow these rules:

- React Router must build in SPA/static mode and produce
  `build/client/index.html`.
- Only `build/client/` is deployed to Apache.
- `VITE_CHAT_API_URL`, `VITE_CHAT_BOT_NAME`, and `VITE_BASE_PATH` remain
  build-time values. Changing one requires a rebuild.
- The preferred public URL is `https://ross.cc.lehigh.edu/`, so its build uses
  `VITE_BASE_PATH=/`.
- Apache must serve `index.html` as the fallback for frontend routes.
- The fixed chatbot backend, API shape, RAG system, and model are not changed by
  this frontend deployment rule.
- The final Apache origin must be compatible with the fixed API's CORS policy.

## Status of this branch

The code currently on `everett` predates this requirement and still uses Node
SSR. Its current `npm run build` output is not an Apache-only deployment
artifact. Do not present this rule as proof that the Everett implementation has
already been converted.

The maintained and tested static implementation is published on
`christopher-handoff`. Check that branch and its current CI result before a
production deployment. This file records the rule for any future work that
continues from `everett`.

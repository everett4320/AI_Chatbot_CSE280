# Apache static deployment rule

Christopher confirmed that the Ross frontend should be built once and served
as static HTML, JavaScript, CSS, and image files by Apache. Production should
not require a Node process or `react-router-serve`.

Ross frontend deployments from this repository must follow these rules:

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

## Current implementation

The frontend in `ai-chatbot-lehigh/` builds as a static SPA. From that
directory, run `npm run verify:deployment` with the assigned build-time values,
then check the current CI result before publishing `build/client/`.

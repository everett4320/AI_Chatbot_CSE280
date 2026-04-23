# AGENT.md

## Project Overview

This repository contains `ai-chatbot-lehigh`, a React Router 7 + React 19 TypeScript app for Lehigh CSE280.

The current app is a small frontend experience:

- A simple landing page at the home route
- A floating chatbot launcher in the bottom-right corner
- A chat panel that sends conversation history to an external API when configured
- A local stub reply when `VITE_CHAT_API_URL` is not set

There is no backend implementation in this repository.

## Stack

- React 19
- React Router 7 with SSR enabled
- TypeScript with strict mode
- Vite
- Tailwind CSS v4 via `@import "tailwindcss"` in `app/app.css`
- `react-markdown` for assistant response rendering

## Commands

- Install dependencies: `npm install`
- Start the dev server: `npm run dev`
- Build for production: `npm run build`
- Start the production server: `npm run start`
- Run type generation and typecheck: `npm run typecheck`

Notes:

- The Vite dev server runs on port `6173` via `vite.config.ts`.
- Production serves `./build/server/index.js`.

## Runtime Configuration

- Environment variable: `VITE_CHAT_API_URL`
- Request shape:

```json
{
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

- Expected response shape:

```json
{
  "reply": "assistant response text"
}
```

If `VITE_CHAT_API_URL` is missing, `app/services/chat-api.ts` returns a built-in mock response after a short delay.

## Code Layout

- `app/root.tsx`: root document, font loading, global shell, error boundary
- `app/routes.ts`: route registration
- `app/routes/home.tsx`: landing page and chatbot mount point
- `app/hooks/use-chat.ts`: local chat state, optimistic append, loading/error flow
- `app/services/chat-api.ts`: external API request logic and stub fallback
- `app/types/chat.ts`: shared message types
- `app/components/chat-widget.tsx`: floating launcher and panel toggle
- `app/components/chat-area.tsx`: panel chrome, transcript area, welcome state, error display
- `app/components/chat-input.tsx`: autosizing textarea and submit behavior
- `app/components/chat-message.tsx`: user and assistant message rendering with markdown
- `app/components/typing-indicator.tsx`: loading animation
- `app/app.css`: Tailwind import and custom Lehigh theme tokens

## Current Behavior

- The homepage displays minimal landing copy.
- The floating button opens a fixed-size chat panel.
- User messages are appended immediately.
- Assistant messages render markdown.
- Enter submits; Shift+Enter inserts a newline.
- While a request is in flight, duplicate submission is blocked.
- Errors are shown inline above the input.
- The widget currently uses hard-coded assistant branding such as the name `Ross`.

## Styling Conventions

- Tailwind utility classes are used directly inside components.
- Theme tokens are defined in `@theme` inside `app/app.css`.
- Existing colors include `bg-lehigh-navy`, `bg-lehigh-navy-dark`, `bg-lehigh-mint`, and `bg-lehigh-surface`.
- `Inter` is loaded from Google Fonts in `app/root.tsx`.

When editing styles:

- Reuse the existing Lehigh color tokens instead of inventing new near-duplicates.
- Keep component-specific styling colocated in JSX unless the change is global.
- Preserve the current visual language unless the task explicitly asks for redesign.

## Implementation Notes

- Use the `~/` alias for imports from `app/*`.
- Keep message objects shaped as `{ id, role, content, timestamp }`.
- `useChat()` uses refs to avoid stale closures and duplicate submissions.
- `chat-api.ts` strips message objects down to `{ role, content }` before sending them to the API.
- Assistant markdown currently supports paragraphs, emphasis, links, ordered lists, and unordered lists.
- SSR is enabled in `react-router.config.ts`.

## Safe Change Guidance

Before changing behavior, check whether the change affects:

- The request/response contract in `app/services/chat-api.ts`
- Message shape assumptions in `app/types/chat.ts`
- Submission/loading flow in `app/hooks/use-chat.ts`
- Panel sizing and layout in `app/components/chat-area.tsx`
- The landing page copy and metadata in `app/routes/home.tsx`

## Verification

Preferred verification after code changes:

1. `npm run typecheck`
2. `npm run build`

## Known Gaps

- No tests are present in the repository.
- `README.md` is still the stock React Router template and does not describe this app accurately.
- The backend chat service is external to this repo.
- Some UI copy and assistant identity are hard-coded.


## Note
Update AGENT.md when you change the API contract in chat-api.ts, add/remove commands in package.json, or change the route structure.
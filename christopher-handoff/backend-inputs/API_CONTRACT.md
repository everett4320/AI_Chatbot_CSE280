# Fixed frontend / chatbot API contract

This file documents the existing server interface that the frontend targets.
It is not a proposal to change the backend, server, payload, or response. If an
integration mismatch is found, update and retest the frontend adapter instead
of asking Christopher to change the fixed service.

The frontend uses `POST` JSON requests to the assigned endpoint on
Christopher's platform. The
exact existing Ross `bot_name` must be configured at frontend build time
through `VITE_CHAT_BOT_NAME`.

## Question

```json
{
  "action": "question",
  "bot_name": "<assigned-Ross-bot-name>",
  "httpMethod": "POST",
  "userMessage": "What undergraduate majors are offered?",
  "sessionId": "session-...",
  "questionId": "question-..."
}
```

## Feedback

```json
{
  "action": "feedback",
  "bot_name": "<assigned-Ross-bot-name>",
  "sessionId": "session-...",
  "questionId": "question-...",
  "feedback": "Good"
}
```

`feedback` is exactly `Good` or `Bad`.

## Accepted response

```json
{
  "Response": "Markdown answer text",
  "Sources": [
    {
      "title": "Official source title",
      "url": "https://example.lehigh.edu/source"
    }
  ],
  "sessionId": "session-...",
  "questionId": "question-..."
}
```

`Response` is the only required success field. `Sources`, `sessionId`, and
`questionId` are optional. If the response omits either ID, the frontend keeps
the corresponding client-generated ID. It handles a JSON `error` field and
non-2xx failures visibly.

If the fixed service returns a canonical `sessionId`, the frontend adopts it
for later questions and feedback. The frontend must be hosted at an origin
already accepted by the service's existing CORS policy.

## Ross-routing confirmation

The current response shape does not require a clone identity field, so the
frontend cannot prove from JSON alone that a successful answer came from the
Ross clone rather than another configured bot. Before acceptance, Christopher
should confirm the existing `bot_name` mapping in the platform and retain any
routing or deployment record already available for the request's session and
question ID. No new response field or backend behavior is requested.

`custom_prompt`, `model_id`, and `source_uri_filter` are historical/test-tool
options, not frontend production fields. The production frontend must not add
them. Apply the supplied prompt and source list only through Christopher's
existing platform workflow.

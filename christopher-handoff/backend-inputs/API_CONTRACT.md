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
  "custom_prompt": "<full contents of SYSTEM_PROMPT.txt>",
  "remember_conversation": "True",
  "httpMethod": "POST",
  "userMessage": "What undergraduate majors are offered?",
  "sessionId": "session-...",
  "questionId": "question-..."
}
```

`npm run build` embeds the full text of `SYSTEM_PROMPT.txt` as
`custom_prompt`. Rebuild the frontend after changing that file.

Every question sends `remember_conversation` as the string `"True"`, as
Christopher confirmed. The backend uses the conversation associated with the
same `sessionId` as context; the frontend sends only the latest user message.
It adopts a canonical session ID returned by the backend for later questions.
`NEW CHAT` clears the local transcript and stored session ID so the next question
starts a separate session; it does not delete the previous conversation from the
backend.

The backend does not support streaming. Questions use one JSON request and one
complete JSON response; the frontend shows a waiting indicator until the reply
is ready.

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

Christopher confirmed that feedback is stored in an RDS database. A dashboard
for viewing feedback and Ross interactions, and any AWS Quick license needed
to view it, are still awaiting confirmation. This frontend update does not add
a dashboard or change feedback storage.

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
the corresponding client-generated ID. A normal `Response`, including a refusal,
is rendered as an answer.

The frontend reads existing failure responses for controlled classification and
shows a concise, actionable message for service errors, rate limits, timeouts,
connection failures, access failures, and invalid replies. It never displays raw
error text, including unknown errors. HTTP 403 or 500 alone does not indicate a
policy violation. Retrying resends the original question without adding another
user message to the transcript. Feedback failures are reported separately from
question failures. This handling uses the existing response and does not require
new fields or backend changes.

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

`model_id` and `source_uri_filter` remain historical/test-tool options and are
not sent by the production frontend. Apply the source list through
Christopher's existing platform workflow.

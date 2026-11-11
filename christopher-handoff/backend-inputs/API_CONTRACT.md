# Fixed frontend / chatbot API contract

The frontend uses the existing platform's JSON `POST` interface. Configure its
endpoint and Ross bot name through `VITE_CHAT_API_URL` and `VITE_CHAT_BOT_NAME`.
This release does not change the backend interface.

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

Christopher confirmed that feedback is stored in RDS.

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

Failures show a short message for service errors, rate limits, timeouts,
connection/access failures and invalid replies. Raw server errors are not shown.
HTTP 403 or 500 alone is not classified as a policy refusal. Retry resends the
question without duplicating it; feedback errors appear separately.

If the fixed service returns a canonical `sessionId`, the frontend adopts it
for later questions and feedback. The frontend must be hosted at an origin
already accepted by the service's existing CORS policy.

Confirm the existing bot mapping and source ingestion through the platform
during [deployment acceptance](../validation/ACCEPTANCE_CHECKLIST.md). The
frontend does not send model or source-filter overrides.

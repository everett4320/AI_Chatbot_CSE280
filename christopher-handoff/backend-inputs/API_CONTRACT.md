# Frontend / clone API contract

The frontend uses `POST` JSON requests to Christopher's assigned endpoint.
The exact Ross `bot_name` must be configured at frontend build time through
`VITE_CHAT_BOT_NAME`.

## Question

```json
{
  "action": "question",
  "bot_name": "<Christopher-assigned-Ross-bot-name>",
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
  "bot_name": "<Christopher-assigned-Ross-bot-name>",
  "sessionId": "session-...",
  "questionId": "question-...",
  "feedback": "Good"
}
```

`feedback` is exactly `Good` or `Bad`.

## Expected response

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

The frontend needs CORS access from the public test origin. It handles a JSON
`error` field and non-2xx failures visibly.

`custom_prompt`, `model_id`, and `source_uri_filter` are historical/test-tool
options, not required frontend production fields. Christopher should configure
prompt, model, and retrieval scope in the clone unless his platform explicitly
requires a different documented approach.

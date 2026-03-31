# Captured Site Reference

This folder stores a reference snapshot from:
- `https://dev-le-chat.cc.lehigh.edu/`

Captured files:
- `index.html`
- `dist/bundle-pretty.js`
- `PROMPT_CHANGE_AND_TESTING.md`

## Observed API endpoint

In `dist/bundle-pretty.js`, both `question` and `feedback` use:
- `https://8lyrpsdez5.execute-api.us-east-1.amazonaws.com/call`

## Request payloads used by the site

Question payload shape:

```json
{
  "action": "question",
  "bot_name": "le-chat",
  "httpMethod": "POST",
  "userMessage": "What can you help me with?",
  "sessionId": "session-abc1234",
  "questionId": "question-def5678"
}
```

Feedback payload shape:

```json
{
  "action": "feedback",
  "bot_name": "le-chat",
  "sessionId": "session-abc1234",
  "questionId": "question-def5678",
  "feedback": "Good"
}
```

## Additional parameters (from project email guidance)

These can also be sent in question payloads:
- `model_id`
- `custom_prompt`
- `source_uri_filter` (comma-separated string)

Default model mentioned in guidance:
- `global.anthropic.claude-sonnet-4-5-20250929-v1:0`

Default prompt mentioned in guidance:
- `You are an app that answers general questions I ask. Only answer questions you are sure about. Do not give advice. Answer that you don't know if no answer is present in the documents.`

## Prompt testing helpers

- Prompt and A/B testing guide: `fetched_site/PROMPT_CHANGE_AND_TESTING.md`
- Prompt file:
  - `fetched_site/prompts/custom_prompt.txt` (non-empty = use `custom_prompt`, empty = use backend default)
- Numbered question set:
  - `fetched_site/questions/test_questions.json`
- Test runners:
  - `scripts/run_question_suite.sh` (batch, simplest entrypoint)
  - `scripts/test_prompt_request.sh`

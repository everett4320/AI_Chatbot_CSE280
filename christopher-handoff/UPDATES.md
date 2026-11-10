# Ross 2.0

- Added the Review 3 Ross artwork to the launcher, header, and chat messages.
- Questions now send `remember_conversation: "True"` and reuse the session ID
  returned by the API. New Chat starts a separate session.
- Ross shows a waiting indicator until the full JSON reply arrives. Failed
  requests get a short message and, when appropriate, a retry button.
  Retrying keeps one copy of the question in the chat.
- The Apache installer builds and checks the site, publishes it in one
  command, and can restore the previous release.
- Updated Vite and Vitest to clear the dependency audit.

The build sends the October prompt as `custom_prompt` on question requests.
The four source URLs Chris loaded are unchanged. Feedback goes through the
existing API to RDS. Dashboard access is still pending on the platform side.

## API retest, November 10

CORS preflight and the Bioengineering question returned HTTP 200. The follow-up
returned HTTP 200 but asked for the major again in that session. A November 2
run kept its context, so follow-up behavior still needs a live check.

Two earlier questions still returned HTTP 500 with `list index out of range`.
The frontend handles these as service errors and offers a retry.

- ¿Cuál es la diferencia entre CS, CSE y CSB en Lehigh?
- Does Lehigh offer Biomechanical Engineering?

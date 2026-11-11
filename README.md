# Ross 2.0

Static chat frontend for Lehigh's P.C. Rossin College of Engineering and
Applied Science. Christopher manages deployment and the existing chatbot API.

Start with the [deployment instructions](christopher-handoff/README.md).
The [release notes](christopher-handoff/UPDATES.md) describe the changes and
current service checks.

| Directory | Contents |
| --- | --- |
| `ai-chatbot-lehigh/` | Frontend, tests, Docker and Apache configuration |
| `christopher-handoff/` | Deployment guide, prompt, source list and acceptance checklist |
| `scripts/` | Deploy, rollback and API validation commands |

## Local development

Use Node 22:

```bash
cd ai-chatbot-lehigh
npm ci
cp .env.example .env
npm run dev
```

Open <http://localhost:6173>. Blank API settings use local demo replies.
For live requests, set the existing Ross endpoint and bot name in `.env`.
Run `npm run verify` before submitting changes. See the
[frontend guide](ai-chatbot-lehigh/README.md) for build settings and Apache.

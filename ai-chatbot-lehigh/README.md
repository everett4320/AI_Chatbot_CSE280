# Ross frontend

This is the Ross chat interface. It builds as a static React Router site that
Apache can serve from `build/client/`, with no Node process needed in
production. It connects to the school's existing chatbot API.

## Build configuration

Set these values before building:

| Variable | Purpose |
| --- | --- |
| `VITE_CHAT_API_URL` | Ross API endpoint confirmed by Christopher |
| `VITE_CHAT_BOT_NAME` | Bot name used by the existing API to route requests to Ross |
| `VITE_BASE_PATH` | Public mount path, such as `/ross-test/` |

These settings are included in the browser bundle, so never put secrets in
them. Rebuild after changing a value; setting it when starting a container will
not change files that have already been built.

## Build the static site

Use Node 22 and run the commands from this directory.

```bash
export VITE_CHAT_API_URL="<Ross API endpoint>"
export VITE_CHAT_BOT_NAME="<Ross bot slug>"
export VITE_BASE_PATH="/"
npm ci
npm run verify:deployment
```

`npm run verify:deployment` checks the settings, runs the type and contract
checks, and builds the site. Publish the whole `build/client/` directory,
including `index.html` and its JS, CSS, and image assets. For a build without
those checks, use `npm run build`.

To preview the build locally, run `npm run start` and open port 3000.

## Apache

For a site at the domain root, such as `https://ross.cc.lehigh.edu/`, use
`VITE_BASE_PATH=/`. Serve `build/client/` with Apache and set an `index.html`
fallback so a direct visit or browser refresh works. Replace `/var/www/ross`
in this example with the directory you use on the server:

```apache
<Directory "/var/www/ross">
    Require all granted
    Options -Indexes
    DirectoryIndex index.html
    FallbackResource /index.html
</Directory>
```

If Ross is mounted below a path such as `/ross-test/`, build with
`VITE_BASE_PATH=/ross-test/`, place the files at that path, and use
`FallbackResource /ross-test/index.html`. The build value, Apache mount path,
and fallback path must match.

The browser calls the API directly, so its CORS settings need to allow the
origin where the frontend is hosted.

## Docker

The Docker image builds the same site and serves it with Apache:

```bash
docker build \
  --build-arg VITE_CHAT_API_URL="<Ross API endpoint>" \
  --build-arg VITE_CHAT_BOT_NAME="<Ross bot slug>" \
  --build-arg VITE_BASE_PATH="/" \
  -t ross-frontend:test .

docker run --rm -p 3000:80 ross-frontend:test
```

## API contract

Questions and feedback are sent as JSON `POST` requests. The
[API contract](../christopher-handoff/backend-inputs/API_CONTRACT.md) has the
request and response examples. Answers require a `Response` field; `Sources`,
`sessionId`, and `questionId` are optional. If an ID is omitted, the frontend
keeps the one it generated.

The frontend does not send `custom_prompt`. See the
[handoff update notes](../christopher-handoff/UPDATES.md) for applying the new
system prompt and checking how the current platform uses it.

## After deployment

Check the published page:

- Reload the assigned public path directly.
- Check that the launcher, chat panel, source links, and feedback buttons work.
- Check that `NEW CHAT` clears the transcript and input draft and starts a new
  session.
- Test a narrow phone viewport and a mobile landscape viewport.
- Confirm that requests reach Ross and answers include the expected sources.
- Run the question suite using the command in the
  [handoff README](../christopher-handoff/README.md), which selects the Ross
  handoff questions.

If the page reports a configuration error, check the API endpoint and bot name,
then rebuild. If the service returns a different response format, share an
example with us so we can adjust the frontend.

# Notes

A standalone, personal notes app with a block editor, nested pages, databases, backlinks, graph views, attachments, history, and light/dark themes. Notes stay in this browser's IndexedDB. With the auth server running, the same notebook syncs through Jazz for the email account you sign in with.

## Run locally

Requires Node.js 24 or newer.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:8870**. Keep using that exact address: browser storage belongs to an origin, so changing the hostname, protocol, or port opens a separate notebook.

Copy `.env.example` to `.env` for local auth settings. Vercel deployments use the Vercel-backed Jazz store; no Jazz Cloud app ID or admin secret is needed.

## Accounts and sign-in

`npm run dev`, and `npm start` after a build, serve Better Auth at `/api/auth` and a Jazz server on this machine. Open **http://127.0.0.1:8870**. The window asks for an email and a password of at least 8 characters. Creating an account signs you in, Jazz admits that session, and the notebook opens. The same email and password open it again after a restart. That local server's accounts and rows stay in `.jazz-data/`, which is not committed.

The account menu shows the email and signs out. Signing out leaves the notebook in this browser and drops the session. The next sign-in opens that account's notebook. Another account does not see those rows.

GitHub Actions deploys the site and Better Auth to the Vercel project `notes` on team `nsrulswork`, served at `https://notes.nasrul.info`. `/api/auth` handles sign-in and `/jazz` routes sync through the project's Vercel-backed Jazz store. Production uses a 10 GiB Drive; previews use 1 GiB Drives. Set `BETTER_AUTH_SECRET` directly in the Vercel project's Production and Preview environment settings. GitHub Actions needs a `VERCEL_TOKEN` repository secret with access to the `nsrulswork` team to deploy; it pulls runtime environment variables from Vercel and does not sync Jazz Cloud secrets. Automatic Git deployments are disabled, so pushes and pull requests deploy through this workflow. The Docker image remains a static file server and has no auth server.

Set `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` when a local auth server is reached at an origin other than `http://127.0.0.1:8870`. Leave `BETTER_AUTH_URL` empty on Vercel: the request host is the cookie origin.

For a production build served locally:

```sh
npm run build
npm start
```

Stop the development server before starting the production server on the same port. Both use the same address and notebook storage.

## Docker

```sh
docker compose up --build -d
```

Open **http://127.0.0.1:8870**. To stop: `docker compose down`. The container serves static files; notes are stored in the browser, not the container. Use backups to move your notebook between browsers or machines.

## Data and backups

Notes, settings, page history, and attachments are stored in this browser's IndexedDB database. Data survives reloads and server restarts. Clearing site data, using a different browser profile, or losing access to the browser can remove your notebook. Private browsing may discard it when the session ends.

Use **Settings → Download backup** to export all records and attachments as JSON. Use **Settings → Restore backup…** to restore it. Restore replaces the current notebook after confirmation. Keep a backup before restoring or moving to another address. Backup files contain your notebook and attachments in readable form; store them appropriately.

This version is for personal use. It does not provide sharing, invitations, remote agents, or collaborative text merging. With Jazz running, each signed-in account syncs only the rows it created. Open tabs on the same origin refresh one another's changes; concurrent edits to the same field use the last committed write, and the newer sync clock wins across devices. Link cards do not request remote metadata. Embedded content and linked images may contact their respective providers when displayed.

## Development

```sh
npm run typecheck
npm test
npm run build
```

The included tests cover page trees, persistent records, concurrent field patches, binary attachment backups, rejection of malformed restore data, and Better Auth sign-up through Jazz. The build output in `dist/` can be served from any static web server; use localhost or HTTPS so browser storage is available. Sign-in needs `npm start`, which binds to loopback and serves the build together with Better Auth. `npm run preview` serves the static build only.

## Provenance and license status

Adapted from Terminus Notes, published by Terminus as `@terminus/notes`, version 0.0.1, retrieved through an existing fork. The original editor and UI code are retained with a new local persistence layer, local file storage, backup and restore, and standalone build scripts. This project is an independent adaptation and is not presented as the original author's work or an official release.

No license was included with the original source, and none has been added here. See `NOTICE` for attribution; third-party dependencies retain their own licenses.

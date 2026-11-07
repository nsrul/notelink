# Notes

A standalone, personal notes app with a block editor, nested pages, databases, backlinks, graph views, attachments, history, and light/dark themes. Notes stay in this browser's IndexedDB. With the auth server running, the same notebook syncs through Jazz for the email account you sign in with.

## Run locally

Requires Node.js 24 or newer.

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:8870**. Keep using that exact address: browser storage belongs to an origin, so changing the hostname, protocol, or port opens a separate notebook.

Copy `.env.example` to `.env` for a production build that embeds Jazz Cloud. `VITE_JAZZ_APP_ID` and `VITE_JAZZ_SERVER_URL` are public. `JAZZ_ADMIN_SECRET` and `BACKEND_SECRET` stay on the machine that deploys the schema; they are not included in the browser bundle. CI stores the same four names as repository secrets. Its production build receives the two public values, and a push to main publishes the schema. `npm run dev` does not send the browser to Jazz Cloud: Cloud cannot fetch a JWKS endpoint on this machine.

## Accounts and sign-in

`npm run dev`, and `npm start` after a build, serve Better Auth at `/api/auth` and a Jazz server on this machine. Open **http://127.0.0.1:8870**. The window asks for an email and a password of at least 8 characters. Creating an account signs you in, Jazz admits that session, and the notebook opens. The same email and password open it again after a restart. That local server's accounts and rows stay in `.jazz-data/`, which is not committed.

The account menu shows the email and signs out. Signing out leaves the notebook in this browser and drops the session. The next sign-in opens that account's notebook. Another account does not see those rows.

A static host, including the Docker image, has no auth server. Without Jazz settings the notebook stays in this browser. With Jazz settings baked into the build, sign-in needs an auth server on an origin the Jazz server is configured to trust: `--jwks-url`, `--jwt-issuer`, and `--jwt-audience` all set to `BETTER_AUTH_URL`, with no trailing slash. Set `BETTER_AUTH_URL` and `BETTER_AUTH_SECRET` when that origin is not `http://127.0.0.1:8870`.

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

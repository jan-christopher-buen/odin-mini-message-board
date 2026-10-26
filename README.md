# Mini Message Board

A server-rendered message board built for The Odin Project's [Mini Message Board](https://www.theodinproject.com/lessons/node-path-nodejs-mini-message-board) and [Using PostgreSQL](https://www.theodinproject.com/lessons/nodejs-using-postgresql) assignments. Read the board, share a message, and open individual message pages.

## Live Demo

[Open the Mini Message Board](https://odin-mini-message-board-01ct.onrender.com), hosted on Render.

The live app stores messages in Neon PostgreSQL, independently of the Render application process.

## Features and stack

- Message creation with server-side validation and preserved input on errors.
- Stable UUID message URLs, readable UTC dates, and custom 404 pages.
- Escaped plain text, preserved line breaks, responsive layouts, and keyboard focus indicators.
- PostgreSQL persistence through parameterized queries and a shared `pg` Pool.

Built with Node.js, Express 5, EJS partials, PostgreSQL, `pg`, and plain CSS. Express renders the HTML and serves static assets; no frontend build step is required.

## Run locally

Use Node.js 22.9 or newer, npm, and PostgreSQL. Development was verified with Node.js 24 and PostgreSQL 18.

```sh
npm ci
cp .env.example .env
```

Configure `.env` privately for your PostgreSQL role. The example uses Unix-socket peer authentication on Ubuntu, which does not need a password. Create the dedicated database **only if it does not already exist**:

```sh
createdb -h /var/run/postgresql odin_mini_message_board
npm run db:setup
npm run db:seed # optional sample messages
npm start
```

Open [http://localhost:3000](http://localhost:3000). `npm run dev` watches JavaScript files and restarts the server. Use `PORT=4000 npm start` to change the HTTP port.

| Setting        | Purpose                                                                           |
| -------------- | --------------------------------------------------------------------------------- |
| `PGHOST`       | Local database host or Unix socket directory                                      |
| `PGPORT`       | PostgreSQL port, normally `5432`                                                  |
| `PGUSER`       | Local database role                                                               |
| `PGDATABASE`   | Dedicated database name                                                           |
| `PGPASSWORD`   | Password for local TCP login, if needed                                           |
| `DATABASE_URL` | Hosted PostgreSQL connection URL; takes precedence over local connection settings |
| `PORT`         | HTTP port, default `3000`                                                         |

For local password login, set `PGHOST=localhost` and enter `PGPASSWORD` only in your ignored `.env` file. Never commit credentials.

Hosted startup accepts provider-injected `DATABASE_URL` without a local `.env` file. URL connections require TLS and verify the server certificate and hostname (`sslmode=verify-full`). Initialize a confirmed hosted database with `scripts/setup.js` using its private environment configuration before deploying the app.

## Routes

| Method | Path                   | Purpose                                    |
| ------ | ---------------------- | ------------------------------------------ |
| GET    | `/`                    | List messages in creation order            |
| GET    | `/new`                 | Show the message form                      |
| POST   | `/new`                 | Validate, save, and redirect with HTTP 303 |
| GET    | `/messages/:messageId` | Show one message, or HTTP 404              |

Authors must be 1–80 characters and messages 1–2,000 characters after trimming. Spaces, apostrophes, hyphens, and non-English names are supported. Invalid submissions return HTTP 400 without inserting data. Unexpected database failures return a generic HTTP 500 page.

## Development commands

```sh
npm run format
npm run format:check
```

Prettier is pinned locally. EJS templates are formatted manually.

Integration tests use a dedicated local database and create and remove only their own temporary schema. Create the test database once if absent, then run:

```sh
createdb -h /var/run/postgresql odin_mini_message_board_test
npm test
```

Tests use Unix-socket peer authentication as the current OS user; set `TEST_PGUSER` if your local role differs. They do not use `DATABASE_URL` or the development database.

## Storage and limitations

Messages are stored in PostgreSQL, survive application restarts, and are shared by processes connected to the same database. UUID URLs remain stable. Setup creates the table if missing without clearing existing data. Optional seeding is safe to repeat; neither runs automatically during startup.

There are no accounts, editing, or deletion. Messages from the earlier in-memory version were not automatically imported into PostgreSQL.

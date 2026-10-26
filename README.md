# Mini Message Board

A small, server-rendered message board built for [The Odin Project's Mini Message Board assignment](https://www.theodinproject.com/lessons/node-path-nodejs-mini-message-board). Read the board, share a message, and open individual message pages.

## Live Demo

[Open the Mini Message Board](https://odin-mini-message-board-01ct.onrender.com), hosted on Render.

## Features

- Seeded messages with authors and readable UTC timestamps.
- Message creation with server-side validation and preserved input on errors.
- Stable, unique message URLs and helpful 404 pages.
- Escaped plain-text content with preserved line breaks.
- Responsive layouts, labeled fields, keyboard focus indicators, and shared page navigation.

## Stack

Node.js, Express 5, EJS, and plain CSS. ES modules organize the application; Express renders HTML through EJS views and reusable partials. CSS and the SVG favicon are served through `express.static`. No frontend build step is needed.

## Run locally

Use Node.js 22 or newer and npm. Node.js 24 was used for development.

```sh
npm ci
npm start
```

Open [http://localhost:3000](http://localhost:3000).

For automatic restarts while editing JavaScript:

```sh
npm run dev
```

Set `PORT` to use a different port:

```sh
PORT=4000 npm start
```

Then open [http://localhost:4000](http://localhost:4000). No `.env` file is required.

## Routes

| Method | Path                   | Purpose                                                 |
| ------ | ---------------------- | ------------------------------------------------------- |
| GET    | `/`                    | List messages                                           |
| GET    | `/new`                 | Show the message form                                   |
| POST   | `/new`                 | Validate and add a message, then redirect with HTTP 303 |
| GET    | `/messages/:messageId` | Show one message, or HTTP 404                           |

Unknown routes return a custom HTTP 404 page. Authors must be 1–80 characters and messages 1–2,000 characters after trimming surrounding whitespace. Both fields must be single text values. Invalid submissions return HTTP 400 without creating a message.

## Development commands

```sh
npm test
npm run format
npm run format:check
```

Tests use Node's built-in test runner and disposable server processes. Prettier is installed locally at an exact version; EJS templates are formatted manually and excluded from Prettier.

## Storage and limitations

Messages live only in an array in the index router. New messages disappear when the server restarts, and separate server processes have independent arrays. There is no database or persistent storage, and no accounts, editing, or deletion.

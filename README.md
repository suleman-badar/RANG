# RANG (Rang Advance) — Server

This repo currently contains the **server-side** code for a real time 4 player online card game (Rang Advance).

The server is the **only authority** (it validates actions, deals cards, tracks turns, scoring, etc.).
It uses **Socket.io** for real time gameplay

## What we added so far

### 1) Working Node.js server

- Location: `server/`
- Tech: Node.js + Socket.io
- CORS: allows all origins (`origin: "*"`)
- Memory only: rooms and game state are stored in RAM (no database)

### 2) Game logic (server-side rules)

Inside `server/gameLogic/` we implemented the main rules needed for gameplay:

- Deck creation + shuffle
- Toss flow (find the first Ace)
- Batter selection
- Dealing (including the batter hidden card)
- Trump reveal rules
- Open / Double-open rules
- Trick resolving + turn validation
- Scoring + batter rotation

### 3) Real-time Socket.io event handlers

All Socket.io events are handled in `server/socketHandlers.js`.

Important notes:

- The server sends **filtered game state** so players do not see hidden info they should not know.
- Basic reconnect support: a player can reconnect by joining the same room with the same `playerName`.

### 4) Automated tests (Jest)

Unit tests live in `server/__tests__/`.

Run them with:

```bash
cd server
npm test
```

### 5) Smoke test (quick end-to-end check)

We added a simple smoke test that:

1. starts the server on an ephemeral port
2. connects 4 Socket.io clients
3. runs: create room → join room → start game → toss → select batter
4. checks all 4 players receive `deal_hand`

Run it with:

```bash
cd server
npm run smoke
```

## How to run locally

### Install

```bash
cd server
npm install
```

### Start

```bash
cd server
npm start
```

By default the server uses port `3001`.
You can set a different port using `PORT`.

### Dev mode (auto restart)

```bash
cd server
npm run dev
```
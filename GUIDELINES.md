# RANG — FRONTEND CONTRACT (STRICT, NO HALLUCINATION)

This document defines EXACTLY what the frontend must implement.

⚠️ RULE:
If something is not defined here, DO NOT invent it.

---

# 1. GLOBAL RULES

* Frontend is a **dumb renderer**
* Backend is **single source of truth**
* No game logic on client
* No assumptions
* No mock data
* No derived rules

Frontend only:

* sends actions
* renders server state

---

# 2. TECH CONSTRAINTS

* React with **JSX only**
* NO TypeScript
* NO `.ts` or `.tsx`
* Use functional components
* Use `socket.io-client`
* Use React Context for global state

---

# 3. SOCKET CONNECTION

Connect to:

http://localhost:3001

---

# 4. CLIENT → SERVER EVENTS (ACTIONS)

## create_room

```js
{ playerName: string }
```

## join_room

```js
{ roomCode: string, playerName: string }
```

## start_game

```js
{ roomCode: string }
```

## select_batter

```js
{ roomCode: string, targetPlayerId: string }
```

## request_reshuffle

```js
{ roomCode: string }
```

## play_card

```js
{
  roomCode: string,
  card: { suit: "H" | "D" | "C" | "S", value: number }
}
```

## declare_open

```js
{ roomCode: string, trumpSuit: "H" | "D" | "C" | "S" }
```

## declare_double_open

```js
{ roomCode: string, trumpSuit: "H" | "D" | "C" | "S" }
```

## ready_next_round

```js
{ roomCode: string }
```

---

# 5. SERVER → CLIENT EVENTS

## room_update

```js
{
  roomCode: string,
  players: [
    {
      id: string,
      name: string,
      teamIndex: 0 | 1,
      connected: boolean
    }
  ]
}
```

---

## toss_card

```js
{
  playerId: string,
  card: { suit: string, value: number }
}
```

---

## toss_result

```js
{
  winnerId: string
}
```

---

## deal_hand (PRIVATE EVENT)

```js
{
  hand: [{ suit: string, value: number }],
  hiddenCardIndex: number | null
}
```

---

## game_state (MAIN STATE — MOST IMPORTANT)

```js
{
  roomCode: string,

  me: {
    id: string,
    name: string,
    teamIndex: 0 | 1
  },

  players: [
    {
      id: string,
      name: string,
      teamIndex: 0 | 1,
      cardCount: number,
      connected: boolean
    }
  ],

  hand: [{ suit: string, value: number }],

  phase: "lobby" | "toss" | "playing" | "round_end" | "game_over",

  currentTurn: number,
  currentPlayerId: string,

  activeSuit: "H" | "D" | "C" | "S" | null,

  trickCards: [
    {
      playerId: string,
      card: { suit: string, value: number }
    }
  ],

  trumpRevealed: boolean,
  trumpSuit: "H" | "D" | "C" | "S" | null,

  hiddenCard: {
    exists: boolean,
    isRevealed: boolean
  },

  openMode: boolean,
  doubleOpenMode: boolean,

  scores: {
    team0: number,
    team1: number
  }
}
```

---

## trump_revealed

```js
{
  trumpSuit: string,
  hiddenCard: { suit: string, value: number }
}
```

---

## trick_result

```js
{
  winnerId: string
}
```

---

## round_result

```js
{
  winnerTeam: 0 | 1,
  pointsAwarded: number,
  reason: string
}
```

---

## game_over

```js
{
  team0Score: number,
  team1Score: number,
  winnerTeam: 0 | 1
}
```

---

## error

```js
{
  message: string
}
```

---

## player_disconnected

```js
{
  playerId: string
}
```

---

## player_reconnected

```js
{
  playerId: string
}
```

---

# 6. UI RENDERING RULES (STRICT)

## Phase-based rendering

* phase === "lobby" → render Lobby.jsx
* phase === "toss" → render Toss.jsx
* phase === "playing" → render Game UI
* phase === "round_end" → render RoundResult.jsx
* phase === "game_over" → render GameOver.jsx

---

## Game UI Composition

During "playing":

Always render:

* Table.jsx → uses trickCards
* ScoreBoard.jsx → uses scores
* TrumpBadge.jsx → only if trumpRevealed === true

Render conditionally:

* Hand.jsx → ONLY for current player (uses hand)

* HiddenCard.jsx →
  IF hiddenCard.exists === true AND hiddenCard.isRevealed === false

* OpenDeclare.jsx →
  ONLY if:

  * currentTurn === 1
  * player is allowed (do not compute, rely on backend flags if available)

---

## Turn Logic (NO CALCULATION)

Frontend must NOT compute turns.

Instead:

```js
const isMyTurn = gameState.currentPlayerId === gameState.me.id;
```

---

# 7. STATE MANAGEMENT

Global Context: GameContext.jsx

Must store:

* socket
* playerName
* roomCode
* gameState

All components must consume from context.

---

# 8. RECONNECTION

Store in localStorage:

```js
playerName
roomCode
```

On reload:

* reconnect socket
* emit join_room again
* restore session

---

# 9. UI CONSTRAINTS

* Minimal UI
* No animations required
* Functional rendering only

---

# 10. STRICTLY FORBIDDEN

* No TypeScript
* No fake data
* No client-side game rules
* No hidden info exposure
* No guessing missing fields

---

# 11. FINAL GOAL

Frontend must:

* connect via socket.io
* render ONLY server state
* send user actions correctly
* support reconnection
* match EXACT folder structure

---

END OF CONTRACT

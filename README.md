# RANG

A real-time 4 player online card game built with **React + TypeScript**, **Node.js**, and **Socket.IO**.

The server acts as the **single source of truth** for gameplay, validation, turn management, scoring, and room state.

---

# Architecture

## Client (`client/`)

Frontend built with:

- React
- TypeScript
- Vite

### Key Runtime File

`GameContext.tsx`
- Socket connection
- Event listeners
- Action methods
- Client side synchronized game state

---

## Server (`server/`)

Backend built with:

- Node.js
- Express
- Socket.IO

### Responsibilities

- Room management
- Real time synchronization
- Player lifecycle handling
- Gameplay orchestration
- Rule validation

### Key Files

| File | Responsibility |
|---|---|
| `index.js` | HTTP + Socket.IO setup |
| `socketHandlers.js` | Main socket event handlers & game flow |
| `rooms.js` | In-memory room/player management |
| `server/gameLogic/` | Pure gameplay rules & validation |

---

# 🚀 HOW TO RUN

## 📦 Step 1 — Install dependencies

```bash
npm install
```

---

## ⚙️ Step 2 — Start the project

```bash
npm run dev
```

This will:

- Start backend (Node.js + Socket.IO)
- Start frontend (React + Vite)
- Run both together using concurrently

---

## 🌐 Application URL

http://localhost:5173

Open the URL in 4 different tabs. Have Fun :) 

---

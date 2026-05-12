import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from "react";
import { io, Socket } from "socket.io-client";

const SERVER_URL = (import.meta as any).env?.VITE_SERVER_URL || "http://localhost:3001";
const STORAGE_KEY = "rang_advance_session";

// ─── Types ────

export type Suit = "H" | "D" | "C" | "S";

export interface Card {
  suit: Suit;
  value: number;
  id: string;
}

export interface TrickCard {
  playerId: string;
  card: Card | null;
  hidden?: boolean;
}

export interface Player {
  id: string;
  name: string;
  teamIndex: number;
  playerIndex: number;
  connected: boolean;
  handSize?: number;
}

export interface RoundScore {
  round: number;
  winnerTeam: 0 | 1;
  points: number;
}

function normalizePlayers(rawPlayers: any[]): Player[] {
  return (rawPlayers || [])
    .filter(Boolean)
    .map((p: any) => {
      const playerIndex =
        typeof p.playerIndex === "number"
          ? p.playerIndex
          : typeof p.index === "number"
            ? p.index
            : 0;

      const teamIndex = typeof p.teamIndex === "number" ? p.teamIndex : playerIndex % 2;

      return {
        id: String(p.id),
        name: String(p.name ?? ""),
        teamIndex,
        playerIndex,
        connected: Boolean(p.connected),
        handSize: typeof p.handSize === "number" ? p.handSize : undefined,
      };
    })
    .sort((a, b) => a.playerIndex - b.playerIndex);
}

function scoresToTuple(scores: any): [number, number] {
  if (Array.isArray(scores) && scores.length >= 2) {
    return [Number(scores[0]) || 0, Number(scores[1]) || 0];
  }
  if (scores && typeof scores === "object") {
    return [Number(scores.team0) || 0, Number(scores.team1) || 0];
  }
  return [0, 0];
}

function sortHand(cards: Card[]): Card[] {
  const suitOrder: Record<Suit, number> = { H: 0, D: 1, C: 2, S: 3 };
  return [...cards].sort((left, right) => {
    const suitDelta = suitOrder[left.suit] - suitOrder[right.suit];
    if (suitDelta !== 0) return suitDelta;
    return left.value - right.value;
  });
}

function phaseToScreen(phase: string | undefined, fallback: Screen): Screen {
  switch (phase) {
    case "lobby":
      return "lobby";
    case "toss":
      return "toss";
    case "batter_select":
      return "select_batter";
    case "playing":
    case "open_window":
    case "round_end":
    case "waiting_for_reconnect":
      return "game";
    case "game_over":
      return "game_over";
    default:
      return fallback;
  }
}

export type Screen =
  | "home"
  | "lobby"
  | "toss"
  | "select_batter"
  | "game"
  | "game_over";

export interface GameState {
  socketConnected: boolean;

  // Identity
  myPlayerId: string | null;
  myPlayerName: string;
  roomCode: string | null;
  isHost: boolean;
  hostSocketId: string | null;

  // Navigation
  screen: Screen;
  serverPhase: string;

  // Room
  players: Player[];

  // Private hand
  myHand: Card[];

  // Game state (visible)
  trickCards: TrickCard[];
  hiddenPile: Card[];
  currentPlayerIndex: number;
  activeSuit: string | null;
  trumpSuit: string | null;
  trumpRevealed: boolean;
  currentTurn: number;
  currentRound: number;
  currentBatterIndex: number;
  openMode: boolean;
  doubleOpenMode: boolean;
  openDeclaredByTeam: number | null;
  openDeclaredByPlayerId: string | null;
  openCountForBatter: number;
  consecutiveBowlingWins: number;

  // Toss
  tossWinnerId: string | null;

  // Scores
  roundScores: RoundScore[];
  totalScores: [number, number];

  // UI feedback
  lastError: string | null;
  lastErrorCode: string | null;
  lastTrickWinner: { playerId: string; playerIndex: number } | null;
  roundResult: { winnerTeam: number; scores?: any } | null;
  pausedForPlayerId: string | null;

  // Toss feed (optional UI)
  lastTossCard: { card: Card; recipientPlayerId: string } | null;

  // Hidden batter card indicator
  isHiddenBatter: boolean;
}

// ─── Context ─────

interface GameContextValue {
  state: GameState;
  // Actions
  createRoom: (playerName: string) => void;
  joinRoom: (roomCode: string, playerName: string) => void;
  startGame: () => void;
  selectBatter: (targetPlayerId: string) => void;
  playCard: (cardId: string) => void;
  declareOpen: (trumpSuit: Suit) => void;
  declareDoubleOpen: (trumpSuit: Suit) => void;
  requestReshuffle: () => void;
  leaveRoom: () => void;
  clearError: () => void;
  dismissTrickWinner: () => void;
  dismissRoundResult: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameProvider");
  return ctx;
}

// ─── Initial State ────

const INITIAL_STATE: GameState = {
  socketConnected: false,
  myPlayerId: null,
  myPlayerName: "",
  roomCode: null,
  isHost: false,
  hostSocketId: null,
  screen: "home",
  serverPhase: "lobby",
  players: [],
  myHand: [],
  trickCards: [],
  hiddenPile: [],
  currentPlayerIndex: 0,
  activeSuit: null,
  trumpSuit: null,
  trumpRevealed: false,
  currentTurn: 1,
  currentRound: 1,
  currentBatterIndex: 0,
  openMode: false,
  doubleOpenMode: false,
  openDeclaredByTeam: null,
  openDeclaredByPlayerId: null,
  openCountForBatter: 0,
  consecutiveBowlingWins: 0,
  tossWinnerId: null,
  roundScores: [],
  totalScores: [0, 0],
  lastError: null,
  lastErrorCode: null,
  lastTrickWinner: null,
  roundResult: null,
  pausedForPlayerId: null,
  lastTossCard: null,
  isHiddenBatter: false,
};

// ─── Session Persistence ──

interface Session {
  playerName: string;
  playerId: string;
  roomCode: string;
}

function saveSession(s: Session) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// ─── Helper: merge server state into our state ─────

function mergeServerState(prev: GameState, data: Partial<GameState> & Record<string, any>): Partial<GameState> {
  const patch: Partial<GameState> = {};

  if (data.phase !== undefined) patch.serverPhase = data.phase;
  if (data.status !== undefined) patch.serverPhase = data.status;
  if (data.serverPhase !== undefined) patch.serverPhase = data.serverPhase;
  if (Array.isArray(data.players)) patch.players = normalizePlayers(data.players);
  if (data.hostSocketId !== undefined) patch.hostSocketId = data.hostSocketId;
  if (data.currentPlayerIndex !== undefined) patch.currentPlayerIndex = data.currentPlayerIndex;
  if (data.activeSuit !== undefined) patch.activeSuit = data.activeSuit;
  if (data.trumpSuit !== undefined) patch.trumpSuit = data.trumpSuit;
  if (data.trumpRevealed !== undefined) patch.trumpRevealed = data.trumpRevealed;
  if (data.currentTurn !== undefined) patch.currentTurn = data.currentTurn;
  if (data.currentRound !== undefined) patch.currentRound = data.currentRound;
  if (data.currentBatterIndex !== undefined) patch.currentBatterIndex = data.currentBatterIndex;
  if (Array.isArray(data.trickCards)) patch.trickCards = data.trickCards;
  if (data.openMode !== undefined) patch.openMode = data.openMode;
  if (data.doubleOpenMode !== undefined) patch.doubleOpenMode = data.doubleOpenMode;
  if (data.openDeclaredByTeam !== undefined) patch.openDeclaredByTeam = data.openDeclaredByTeam;
  if (data.openDeclaredByPlayerId !== undefined) patch.openDeclaredByPlayerId = data.openDeclaredByPlayerId;
  if (data.openCountForBatter !== undefined) patch.openCountForBatter = data.openCountForBatter;
  if (data.consecutiveBowlingWins !== undefined) patch.consecutiveBowlingWins = data.consecutiveBowlingWins;
  if (data.tossWinnerId !== undefined) patch.tossWinnerId = data.tossWinnerId;
  if (Array.isArray(data.roundScores)) patch.roundScores = data.roundScores;
  if (data.totalScores !== undefined) patch.totalScores = scoresToTuple(data.totalScores);
  if (data.scores !== undefined) patch.totalScores = scoresToTuple(data.scores);
  if (data.pausedForPlayerId !== undefined) patch.pausedForPlayerId = data.pausedForPlayerId;

  return patch;
}

// ─── Provider ───

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const socketRef = useRef<Socket | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Tracks the card we just optimistically removed so we can restore it on server rejection.
  const pendingPlayRef = useRef<Card | null>(null);
  const trickClearTimerRef = useRef<number | null>(null);
  const pendingTrickStateRef = useRef<Partial<GameState> | null>(null);
  const hiddenPileHoldTimerRef = useRef<number | null>(null);
  const hiddenPileClearPendingRef = useRef(false);

  const clearTrickHold = useCallback(() => {
    if (trickClearTimerRef.current !== null) {
      window.clearTimeout(trickClearTimerRef.current);
      trickClearTimerRef.current = null;
    }
    pendingTrickStateRef.current = null;
  }, []);

  const commitPendingTrickState = useCallback(() => {
    const pending = pendingTrickStateRef.current;
    if (!pending) return;
    pendingTrickStateRef.current = null;
    trickClearTimerRef.current = null;
    setState((prev) => ({ ...prev, ...pending }));
  }, []);

  const clearHiddenPileHold = useCallback(() => {
    if (hiddenPileHoldTimerRef.current !== null) {
      window.clearTimeout(hiddenPileHoldTimerRef.current);
      hiddenPileHoldTimerRef.current = null;
    }
    hiddenPileClearPendingRef.current = false;
  }, []);

  const startHiddenPileHold = useCallback(() => {
    hiddenPileClearPendingRef.current = true;
    if (hiddenPileHoldTimerRef.current !== null) {
      window.clearTimeout(hiddenPileHoldTimerRef.current);
    }

    hiddenPileHoldTimerRef.current = window.setTimeout(() => {
      hiddenPileHoldTimerRef.current = null;
      if (hiddenPileClearPendingRef.current) {
        hiddenPileClearPendingRef.current = false;
        setState((prev) => ({ ...prev, hiddenPile: [] }));
      }
    }, 10000);
  }, []);

  const update = useCallback((patch: Partial<GameState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  // ── Socket Setup ─────

  useEffect(() => {
    const socket = io(SERVER_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    //  Connection ────

    socket.on("connect", () => {
      update({ socketConnected: true });

      // Attempt auto reconnect if session exists
      const session = loadSession();
      if (session) {
        update({ myPlayerName: session.playerName, roomCode: session.roomCode, lastError: null, lastErrorCode: null, screen: "lobby" });
        socket.emit("join_room", {
          roomCode: session.roomCode,
          playerName: session.playerName,
          playerId: session.playerId,
        });
      }
    });

    socket.on("disconnect", () => {
      update({ socketConnected: false });
    });

    // ─ Room events ───

    socket.on("room_created", (data: { roomCode: string; playerId: string; playerIndex?: number }) => {
      const cur = stateRef.current;
      saveSession({
        playerName: cur.myPlayerName,
        playerId: data.playerId,
        roomCode: data.roomCode,
      });
      update({
        roomCode: data.roomCode,
        myPlayerId: data.playerId,
        screen: "lobby",
        serverPhase: "lobby",
        isHost: true,
        lastError: null,
        lastErrorCode: null,
      });
    });

    socket.on("room_update", (data: any) => {
      const cur = stateRef.current;
      const patch = mergeServerState(cur, data);

      const phase: string | undefined = data.status || data.phase || data.serverPhase || patch.serverPhase || cur.serverPhase;
      patch.serverPhase = phase || cur.serverPhase;

      // Determine if host
      if (data.hostSocketId) {
        patch.isHost = socket.id === data.hostSocketId;
      }

      // If we don't have a player ID yet, find ourselves by name
      if (!cur.myPlayerId && cur.myPlayerName && Array.isArray(data.players)) {
        const normalized = normalizePlayers(data.players);
        const me = normalized.find((p) => p.name === cur.myPlayerName);
        if (me?.id) {
          patch.myPlayerId = me.id;
          // Save session
          const rc = data.roomCode || cur.roomCode;
          if (rc) {
            saveSession({ playerName: cur.myPlayerName, playerId: me.id, roomCode: rc });
          }
        }
      }

      // If we have a roomCode from data, set it
      if (data.roomCode && !cur.roomCode) {
        patch.roomCode = data.roomCode;
      }

      patch.screen = phaseToScreen(phase, cur.screen);

      // If we don't have a screen set yet (just joined), go to lobby
      if (cur.screen === "home" && !patch.screen) {
        patch.screen = "lobby";
      }

      setState((prev) => ({ ...prev, ...patch, lastError: null, lastErrorCode: null }));
    });

    // ─ Game-specific state update ──

    socket.on("game_state", (data: any) => {
      const cur = stateRef.current;
      const patch = mergeServerState(cur, data);

      const phase: string | undefined = data.phase || data.serverPhase || patch.serverPhase;
      patch.serverPhase = phase || cur.serverPhase;
      patch.screen = phaseToScreen(phase, cur.screen);

      if (data.playerCardCounts && typeof data.playerCardCounts === "object") {
        const counts = data.playerCardCounts as Record<string, number>;
        patch.players = (patch.players || cur.players).map((p) => ({
          ...p,
          handSize: counts[p.id] ?? p.handSize,
        }));
      }

      if (trickClearTimerRef.current !== null) {
        pendingTrickStateRef.current = patch;
        return;
      }

      // Confirm the pending play was accepted — no need to restore.
      pendingPlayRef.current = null;

      setState((prev) => ({ ...prev, ...patch }));
    });

    // ─ Joined room confirmation 

    socket.on("joined_room", (data: { roomCode: string; playerId: string; reconnected?: boolean }) => {
      const cur = stateRef.current;
      saveSession({
        playerName: cur.myPlayerName,
        playerId: data.playerId,
        roomCode: data.roomCode,
      });

      const patch: Partial<GameState> = {
        roomCode: data.roomCode,
        myPlayerId: data.playerId,
        lastError: null,
        lastErrorCode: null,
      };

      // Only force navigation if we were still on home.
      if (cur.screen === "home") patch.screen = "lobby";

      update(patch);
    });

    // ─ Toss ───

    socket.on("toss_card", (data: any) => {
      // Server emits during start_game before toss_result; use this to navigate into toss UI.
      const cur = stateRef.current;
      const patch: Partial<GameState> = {
        lastTossCard: data?.card && data?.recipientPlayerId ? { card: data.card, recipientPlayerId: data.recipientPlayerId } : cur.lastTossCard,
      };
      if (cur.screen === "lobby" || cur.screen === "home") {
        patch.screen = "toss";
        patch.serverPhase = "toss";
      }
      setState((prev) => ({ ...prev, ...patch }));
    });

    socket.on("toss_result", (data: { winnerPlayerId: string }) => {
      const cur = stateRef.current;
      const isWinner = data.winnerPlayerId === cur.myPlayerId;
      update({
        tossWinnerId: data.winnerPlayerId,
        screen: isWinner ? "select_batter" : "toss",
        serverPhase: "batter_select",
        lastTossCard: null,
      });
    });

    socket.on("player_disconnected", (data: { playerId: string }) => {
      const cur = stateRef.current;
      if (!data?.playerId) return;
      update({
        players: cur.players.map((p) => (p.id === data.playerId ? { ...p, connected: false } : p)),
      });
    });

    socket.on("player_reconnected", (data: { playerId: string }) => {
      const cur = stateRef.current;
      if (!data?.playerId) return;
      update({
        players: cur.players.map((p) => (p.id === data.playerId ? { ...p, connected: true } : p)),
      });
    });

    socket.on("trump_revealed", (data: any) => {
      // Add the revealed trump card to hiddenPile and start the clear timer
      if (data?.hiddenCard) {
        startHiddenPileHold();
      } else if (stateRef.current.hiddenPile.length > 0) {
        startHiddenPileHold();
      }
      const patch: Partial<GameState> = {
        trumpRevealed: true,
        trumpSuit: data?.trumpSuit ?? null,
        // Hidden card has been revealed — remove the face-down placeholder
        isHiddenBatter: false,
        hiddenPile: data?.hiddenCard 
          ? [...stateRef.current.hiddenPile, data.hiddenCard] 
          : stateRef.current.hiddenPile,
      };
      if (Array.isArray(data?.batterNewHand)) {
        patch.myHand = sortHand(data.batterNewHand);
      }
      setState((prev) => ({ ...prev, ...patch }));
    });

    // ─ Deal hand ──────────────────────────────────────────────────────────

    socket.on("deal_hand", (data: any) => {
      const hand: Card[] = data.hand || data.cards || [];
      const keepHiddenPileVisible = hiddenPileHoldTimerRef.current !== null;
      const patch: Partial<GameState> = {
        myHand: sortHand(hand),
        screen: "game",
        // Server tells this player whether they are the hidden batter
        isHiddenBatter: Boolean(data.isHiddenBatter),
        hiddenPile: keepHiddenPileVisible ? stateRef.current.hiddenPile : [],
      };
      if (keepHiddenPileVisible) hiddenPileClearPendingRef.current = true;
      // Merge any extra game state that came with deal_hand
      const extra = mergeServerState(stateRef.current, data);
      Object.assign(patch, extra);
      setState((prev) => ({ ...prev, ...patch }));
    });

    // ─ Trick result ───────────────────────────────────────────────────────

    socket.on("trick_result", (data: { winnerPlayerId: string; winnerPlayerIndex?: number; winningCard?: Card; trickCards?: Array<{ playerId: string; card: Card | null; hidden?: boolean }> }) => {
      const cur = stateRef.current;
      const winnerIndex =
        typeof data.winnerPlayerIndex === "number"
          ? data.winnerPlayerIndex
          : cur.players.find((p) => p.id === data.winnerPlayerId)?.playerIndex ?? 0;

      const displayTrickCards = Array.isArray(data?.trickCards)
        ? data.trickCards.map((slot: any) => {
            const previousSlot = cur.trickCards.find((tc) => tc.playerId === slot.playerId);
            const player = cur.players.find((p) => p.id === slot.playerId);
            const battingTeam = cur.currentBatterIndex % 2;
            const computedHidden = Boolean(
              slot.card &&
              !cur.trumpRevealed &&
              cur.activeSuit &&
              player &&
              player.teamIndex === battingTeam &&
              slot.card.suit !== cur.activeSuit
            );

            return {
              playerId: slot.playerId,
              card: slot.card ?? null,
              hidden: previousSlot?.hidden ?? computedHidden,
            };
          })
        : cur.trickCards;

      const hiddenCards = Array.isArray(displayTrickCards)
        ? displayTrickCards
            .map((slot: any) => (slot?.hidden ? slot.card ?? null : null))
            .filter(Boolean)
        : [];

      if (hiddenCards.length > 0 && cur.trumpRevealed) {
        startHiddenPileHold();
      }
      clearTrickHold();
      update({
        lastTrickWinner: {
          playerId: data.winnerPlayerId,
          playerIndex: winnerIndex,
        },
        consecutiveBowlingWins: typeof (data as any)?.consecutiveBowlingWins === "number" ? (data as any).consecutiveBowlingWins : cur.consecutiveBowlingWins,
        trickCards: displayTrickCards,
        hiddenPile: hiddenCards.length ? [...cur.hiddenPile, ...hiddenCards] : cur.hiddenPile,
      });

      trickClearTimerRef.current = window.setTimeout(() => {
        commitPendingTrickState();
      }, 3000);
    });

    // ─ Round result ───────────────────────────────────────────────────────

    socket.on("round_result", (data: any) => {
      const patch = mergeServerState(stateRef.current, data);
      patch.roundResult = data;

      if (Array.isArray(data.roundScores)) patch.roundScores = data.roundScores;
      if (data.totalScores !== undefined) patch.totalScores = scoresToTuple(data.totalScores);

      setState((prev) => ({ ...prev, ...patch }));
    });

    // ─ Game over ──────────────────────────────────────────────────────────

    socket.on("game_over", (data: any) => {
      clearTrickHold();
      clearHiddenPileHold();
      const patch = mergeServerState(stateRef.current, data);
      patch.screen = "game_over";
      patch.serverPhase = "game_over";
      if (data.totalScores !== undefined) patch.totalScores = scoresToTuple(data.totalScores);
      if (Array.isArray(data.roundScores)) patch.roundScores = data.roundScores;
      clearSession();
      setState((prev) => ({ ...prev, ...patch }));
    });

    // ─ Errors ─────────────────────────────────────────────────────────────

    socket.on("error", (data: any) => {
      const msg = data?.message || data?.code || "An error occurred";

      // If the server rejected a card play, restore the card to the hand.
      if (pendingPlayRef.current) {
        const rejected = pendingPlayRef.current;
        pendingPlayRef.current = null;
        setState((prev) => ({
          ...prev,
          // Put the card back only if it's not already in hand (safety check).
          myHand: prev.myHand.some((c) => c.id === rejected.id)
            ? prev.myHand
            : sortHand([rejected, ...prev.myHand]),
          lastError: msg,
          lastErrorCode: data?.code ?? null,
        }));
        return;
      }

      // If ROOM_NOT_FOUND or similar, clear session
      if (data?.code === "ROOM_NOT_FOUND" || data?.code === "ROOM_FULL") {
        clearSession();
        update({ lastError: msg, lastErrorCode: data?.code ?? null, screen: "home" });
      } else {
        update({ lastError: msg, lastErrorCode: data?.code ?? null });
      }
    });

    socket.on("action_error", (data: any) => {
      const msg = data?.message || data?.errorCode || "Action not allowed";
      update({ lastError: msg, lastErrorCode: data?.errorCode ?? null });
    });

    // Catch-all for joined error via room_error event
    socket.on("room_error", (data: any) => {
      const msg = data?.message || data?.errorCode || "Room error";
      clearSession();
      update({ lastError: msg, lastErrorCode: data?.errorCode ?? null, screen: "home" });
    });

    return () => {
      clearTrickHold();
      clearHiddenPileHold();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [clearHiddenPileHold, clearTrickHold, startHiddenPileHold]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const createRoom = useCallback((playerName: string) => {
    update({ myPlayerName: playerName, lastError: null, lastErrorCode: null });
    socketRef.current?.emit("create_room", { playerName });
  }, [update]);

  const joinRoom = useCallback((roomCode: string, playerName: string) => {
    const rc = roomCode.toUpperCase().trim();
    update({ myPlayerName: playerName, roomCode: rc, screen: "lobby", lastError: null, lastErrorCode: null });
    socketRef.current?.emit("join_room", { roomCode: rc, playerName });
  }, [update]);

  const startGame = useCallback(() => {
    const { roomCode } = stateRef.current;
    if (!roomCode) return;
    socketRef.current?.emit("start_game", { roomCode });
  }, []);

  const selectBatter = useCallback((targetPlayerId: string) => {
    const { roomCode } = stateRef.current;
    if (!roomCode) return;
    socketRef.current?.emit("select_batter", { roomCode, targetPlayerId });
    update({ screen: "toss" });
  }, [update]);

  const playCard = useCallback((cardId: string) => {
    const { roomCode, myHand } = stateRef.current;
    if (!roomCode) return;

    // Find the card object before removing it so we can restore on rejection.
    const card = myHand.find((c) => c.id === cardId);
    if (!card) return; // Card not in hand — don't even emit.

    // Optimistically remove from hand. If server rejects, the error handler restores it.
    pendingPlayRef.current = card;
    update({ myHand: myHand.filter((c) => c.id !== cardId) });

    socketRef.current?.emit("play_card", { roomCode, cardId });
  }, [update]);

  const declareOpen = useCallback((trumpSuit: Suit) => {
    const { roomCode } = stateRef.current;
    if (!roomCode) return;
    socketRef.current?.emit("declare_open", { roomCode, trumpSuit });
  }, []);

  const declareDoubleOpen = useCallback((trumpSuit: Suit) => {
    const { roomCode } = stateRef.current;
    if (!roomCode) return;
    socketRef.current?.emit("declare_double_open", { roomCode, trumpSuit });
  }, []);

  const requestReshuffle = useCallback(() => {
    const { roomCode } = stateRef.current;
    if (!roomCode) return;
    update({ lastError: null, lastErrorCode: null });
    socketRef.current?.emit("request_reshuffle", { roomCode });
  }, [update]);

  const leaveRoom = useCallback(() => {
    clearTrickHold();
    clearHiddenPileHold();
    clearSession();
    update({ ...INITIAL_STATE, socketConnected: stateRef.current.socketConnected });
  }, [clearHiddenPileHold, clearTrickHold, update]);

  const clearError = useCallback(() => update({ lastError: null, lastErrorCode: null }), [update]);
  const dismissTrickWinner = useCallback(() => update({ lastTrickWinner: null }), [update]);
  const dismissRoundResult = useCallback(() => {
    const { roomCode } = stateRef.current;
    if (roomCode) {
      socketRef.current?.emit("ready_next_round", { roomCode });
    }
    update({ roundResult: null });
  }, [update]);

  const value: GameContextValue = {
    state,
    createRoom,
    joinRoom,
    startGame,
    selectBatter,
    playCard,
    declareOpen,
    declareDoubleOpen,
    requestReshuffle,
    leaveRoom,
    clearError,
    dismissTrickWinner,
    dismissRoundResult,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
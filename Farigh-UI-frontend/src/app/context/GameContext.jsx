import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSocket } from '../hooks/useSocket.js';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const socket = useSocket();

  const [connected, setConnected] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [hasJoined, setHasJoined] = useState(false);

  // Server-driven state
  const [roomData, setRoomData] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [tossCards, setTossCards] = useState([]);
  const [tossResult, setTossResult] = useState(null);
  const [roundResult, setRoundResult] = useState(null);
  const [gameOverData, setGameOverData] = useState(null);
  const [trickResult, setTrickResult] = useState(null);
  const [hiddenCardIndex, setHiddenCardIndex] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setConnected(true);
      const storedName = localStorage.getItem('playerName');
      const storedRoom = localStorage.getItem('roomCode');
      if (storedName && storedRoom) {
        setPlayerName(storedName);
        setRoomCode(storedRoom);
        setHasJoined(true);
        socket.emit('join_room', { roomCode: storedRoom, playerName: storedName });
      }
    };

    const onDisconnect = () => {
      setConnected(false);
    };

    const onRoomUpdate = (data) => {
      setRoomData(data);
      setHasJoined(true);
      if (data.roomCode) {
        setRoomCode(data.roomCode);
        localStorage.setItem('roomCode', data.roomCode);
      }
    };

    const onGameState = (data) => {
      setGameState(data);
      setHasJoined(true);
      if (data.roomCode) {
        setRoomCode(data.roomCode);
        localStorage.setItem('roomCode', data.roomCode);
      }
    };

    const onTossCard = (data) => {
      setTossCards((prev) => [...prev, data]);
    };

    const onTossResult = (data) => {
      setTossResult(data);
    };

    const onDealHand = (data) => {
      setHiddenCardIndex(data.hiddenCardIndex);
    };

    const onTrickResult = (data) => {
      setTrickResult(data);
      setTimeout(() => setTrickResult(null), 2500);
    };

    const onRoundResult = (data) => {
      setRoundResult(data);
    };

    const onGameOver = (data) => {
      setGameOverData(data);
    };

    const onError = (data) => {
      setError(data.message);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room_update', onRoomUpdate);
    socket.on('game_state', onGameState);
    socket.on('toss_card', onTossCard);
    socket.on('toss_result', onTossResult);
    socket.on('deal_hand', onDealHand);
    socket.on('trump_revealed', () => {});
    socket.on('trick_result', onTrickResult);
    socket.on('round_result', onRoundResult);
    socket.on('game_over', onGameOver);
    socket.on('error', onError);
    socket.on('player_disconnected', () => {});
    socket.on('player_reconnected', () => {});

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room_update', onRoomUpdate);
      socket.off('game_state', onGameState);
      socket.off('toss_card', onTossCard);
      socket.off('toss_result', onTossResult);
      socket.off('deal_hand', onDealHand);
      socket.off('trump_revealed');
      socket.off('trick_result', onTrickResult);
      socket.off('round_result', onRoundResult);
      socket.off('game_over', onGameOver);
      socket.off('error', onError);
      socket.off('player_disconnected');
      socket.off('player_reconnected');
    };
  }, [socket]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const createRoom = useCallback((name) => {
    if (!socket) return;
    setPlayerName(name);
    localStorage.setItem('playerName', name);
    socket.emit('create_room', { playerName: name });
  }, [socket]);

  const joinRoom = useCallback((name, code) => {
    if (!socket) return;
    setPlayerName(name);
    setRoomCode(code);
    localStorage.setItem('playerName', name);
    localStorage.setItem('roomCode', code);
    socket.emit('join_room', { roomCode: code, playerName: name });
  }, [socket]);

  const startGame = useCallback(() => {
    if (!socket || !roomCode) return;
    socket.emit('start_game', { roomCode });
  }, [socket, roomCode]);

  const selectBatter = useCallback((targetPlayerId) => {
    if (!socket || !roomCode) return;
    socket.emit('select_batter', { roomCode, targetPlayerId });
  }, [socket, roomCode]);

  const requestReshuffle = useCallback(() => {
    if (!socket || !roomCode) return;
    socket.emit('request_reshuffle', { roomCode });
  }, [socket, roomCode]);

  const playCard = useCallback((card) => {
    if (!socket || !roomCode) return;
    socket.emit('play_card', { roomCode, card });
  }, [socket, roomCode]);

  const declareOpen = useCallback((trumpSuit) => {
    if (!socket || !roomCode) return;
    socket.emit('declare_open', { roomCode, trumpSuit });
  }, [socket, roomCode]);

  const declareDoubleOpen = useCallback((trumpSuit) => {
    if (!socket || !roomCode) return;
    socket.emit('declare_double_open', { roomCode, trumpSuit });
  }, [socket, roomCode]);

  const readyNextRound = useCallback(() => {
    if (!socket || !roomCode) return;
    socket.emit('ready_next_round', { roomCode });
    setRoundResult(null);
    setTossCards([]);
    setTossResult(null);
  }, [socket, roomCode]);

  return (
    <GameContext.Provider
      value={{
        socket,
        connected,
        playerName,
        roomCode,
        hasJoined,
        roomData,
        gameState,
        tossCards,
        tossResult,
        roundResult,
        gameOverData,
        trickResult,
        hiddenCardIndex,
        error,
        setError,
        // actions
        createRoom,
        joinRoom,
        startGame,
        selectBatter,
        requestReshuffle,
        playCard,
        declareOpen,
        declareDoubleOpen,
        readyNextRound,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}

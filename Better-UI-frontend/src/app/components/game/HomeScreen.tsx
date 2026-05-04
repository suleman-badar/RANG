import React, { useState, useEffect } from "react";
import { useGame } from "../../context/GameContext";

export function HomeScreen() {
  const { state, createRoom, joinRoom, clearError } = useGame();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [mode, setMode] = useState<"none" | "create" | "join">("none");

  // Pre-fill name from session if available
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("rang_advance_session");
      if (raw) {
        const s = JSON.parse(raw);
        if (s.playerName) setPlayerName(s.playerName);
        if (s.roomCode) setRoomCode(s.roomCode);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    createRoom(playerName.trim());
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || !roomCode.trim()) return;
    joinRoom(roomCode.trim(), playerName.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🃏</div>
          <h1 className="text-4xl text-white tracking-wide">RANG ADVANCE</h1>
          <p className="text-green-400 text-sm mt-1">4-Player Card Game</p>
        </div>

        {/* Connection status */}
        <div className={`flex items-center justify-center gap-2 mb-6 text-sm ${
          state.socketConnected ? "text-green-400" : "text-red-400"
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            state.socketConnected ? "bg-green-400" : "bg-red-400"
          }`} />
          {state.socketConnected ? "Connected to server" : "Connecting to server..."}
        </div>

        {/* Error */}
        {state.lastError && (
          <div className="bg-red-900/80 border border-red-700 rounded-lg p-3 mb-4 flex items-start gap-2">
            <span className="text-red-400 mt-0.5">⚠</span>
            <div className="flex-1">
              <p className="text-red-200 text-sm">{state.lastError}</p>
            </div>
            <button onClick={clearError} className="text-red-400 hover:text-red-200 ml-2">✕</button>
          </div>
        )}

        {/* Main card */}
        <div className="bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-700 p-6 shadow-2xl">

          {/* Player Name */}
          <div className="mb-5">
            <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name..."
              maxLength={20}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>

          {/* Mode selector */}
          {mode === "none" && (
            <div className="space-y-3">
              <button
                onClick={() => setMode("create")}
                disabled={!playerName.trim()}
                className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-3 font-medium transition-colors"
              >
                Create New Room
              </button>
              <div className="relative flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-700" />
                <span className="text-gray-500 text-xs">or</span>
                <div className="flex-1 h-px bg-gray-700" />
              </div>
              <button
                onClick={() => setMode("join")}
                disabled={!playerName.trim()}
                className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-3 font-medium transition-colors"
              >
                Join Existing Room
              </button>
            </div>
          )}

          {/* Create form */}
          {mode === "create" && (
            <form onSubmit={handleCreate} className="space-y-3">
              <button
                type="submit"
                disabled={!playerName.trim() || !state.socketConnected}
                className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-3 font-medium transition-colors"
              >
                {state.socketConnected ? "Create Room" : "Connecting..."}
              </button>
              <button
                type="button"
                onClick={() => setMode("none")}
                className="w-full text-gray-500 hover:text-gray-300 py-2 text-sm transition-colors"
              >
                ← Back
              </button>
            </form>
          )}

          {/* Join form */}
          {mode === "join" && (
            <form onSubmit={handleJoin} className="space-y-3">
              <div>
                <label className="block text-gray-400 text-xs uppercase tracking-widest mb-2">
                  Room Code
                </label>
                <input
                  type="text"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABC123"
                  maxLength={6}
                  className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-green-500 transition-colors uppercase tracking-widest text-center"
                />
              </div>
              <button
                type="submit"
                disabled={!playerName.trim() || !roomCode.trim() || !state.socketConnected}
                className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg py-3 font-medium transition-colors"
              >
                {state.socketConnected ? "Join Room" : "Connecting..."}
              </button>
              <button
                type="button"
                onClick={() => setMode("none")}
                className="w-full text-gray-500 hover:text-gray-300 py-2 text-sm transition-colors"
              >
                ← Back
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-gray-600 text-xs mt-4">
          4 players required to start a game
        </p>
      </div>
    </div>
  );
}

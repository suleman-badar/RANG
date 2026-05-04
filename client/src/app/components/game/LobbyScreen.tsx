import React, { useState } from "react";
import { useGame, Player } from "../../context/GameContext";

function copyToClipboard(text: string) {
  navigator.clipboard?.writeText(text).catch(() => {
    // Fallback
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  });
}

export function LobbyScreen() {
  const { state, startGame, leaveRoom, clearError } = useGame();
  const { players, roomCode, isHost, socketConnected, lastError, myPlayerId } = state;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (roomCode) {
      copyToClipboard(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canStart = isHost && players.length === 4 && players.every((p) => p.connected);
  const waitingFor = 4 - players.length;

  const teamColors = ["text-blue-400", "text-orange-400"];
  const teamBg = ["bg-blue-900/30 border-blue-700/50", "bg-orange-900/30 border-orange-700/50"];

  const teamNames = ["Team Blue", "Team Orange"];

  const team0 = players.filter((p) => p.teamIndex === 0);
  const team1 = players.filter((p) => p.teamIndex === 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🃏</div>
          <h1 className="text-2xl text-white">RANG ADVANCE</h1>
        </div>

        {/* Error */}
        {lastError && (
          <div className="bg-red-900/80 border border-red-700 rounded-lg p-3 mb-4 flex items-start gap-2">
            <span className="text-red-400 mt-0.5">⚠</span>
            <p className="text-red-200 text-sm flex-1">{lastError}</p>
            <button onClick={clearError} className="text-red-400 hover:text-red-200">✕</button>
          </div>
        )}

        <div className="bg-gray-900/80 backdrop-blur rounded-2xl border border-gray-700 p-6 shadow-2xl">

          {/* Room info */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-widest">Room Code</p>
              <p className="text-white text-3xl tracking-[0.3em] mt-1">{roomCode}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button
                onClick={handleCopy}
                className="bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
              >
                {copied ? "✓ Copied!" : "Copy Code"}
              </button>
              <div className={`flex items-center gap-1.5 text-xs ${socketConnected ? "text-green-400" : "text-red-400"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${socketConnected ? "bg-green-400" : "bg-red-400"}`} />
                {socketConnected ? "Connected" : "Disconnected"}
              </div>
            </div>
          </div>

          {/* Player slots */}
          <div className="mb-6">
            <p className="text-gray-400 text-xs uppercase tracking-widest mb-3">
              Players ({players.length}/4)
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((teamIdx) => {
                const teamPlayers = teamIdx === 0 ? team0 : team1;
                return (
                  <div key={teamIdx} className={`rounded-xl border p-3 ${teamBg[teamIdx]}`}>
                    <p className={`text-xs font-medium mb-2 ${teamColors[teamIdx]}`}>
                      {teamNames[teamIdx]}
                    </p>
                    <div className="space-y-2">
                      {teamPlayers.map((p) => (
                        <PlayerSlot
                          key={p.id}
                          player={p}
                          isMe={p.id === myPlayerId}
                          isHost={p.playerIndex === 0}
                          teamColor={teamColors[teamIdx]}
                        />
                      ))}
                      {/* Empty slots for this team */}
                      {Array.from({ length: 2 - teamPlayers.length }).map((_, i) => (
                        <EmptySlot key={i} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status */}
          {waitingFor > 0 ? (
            <div className="text-center mb-4">
              <p className="text-gray-400 text-sm">
                Waiting for <span className="text-white">{waitingFor}</span> more player{waitingFor !== 1 ? "s" : ""}...
              </p>
              <p className="text-gray-600 text-xs mt-1">Share the room code above</p>
            </div>
          ) : (
            <div className="text-center mb-4">
              <p className="text-green-400 text-sm">All players joined! Ready to start.</p>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2">
            {isHost ? (
              <button
                onClick={startGame}
                disabled={!canStart}
                className={`
                  w-full py-3 rounded-xl font-medium transition-all duration-200
                  ${canStart
                    ? "bg-green-700 hover:bg-green-600 text-white shadow-lg shadow-green-900/50"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                  }
                `}
              >
                {players.length < 4 ? `Waiting for players (${players.length}/4)` : "Start Game"}
              </button>
            ) : (
              <div className="w-full py-3 rounded-xl bg-gray-800 border border-gray-700 text-center text-gray-400 text-sm">
                Waiting for host to start...
              </div>
            )}
            <button
              onClick={leaveRoom}
              className="w-full py-2 text-gray-500 hover:text-red-400 text-sm transition-colors"
            >
              Leave Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function PlayerSlot({
  player,
  isMe,
  isHost,
  teamColor,
}: {
  player: Player;
  isMe: boolean;
  isHost: boolean;
  teamColor: string;
}) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${isMe ? "bg-white/5" : ""}`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${player.connected ? "bg-green-400" : "bg-gray-600"}`} />
      <span className={`text-sm flex-1 truncate ${isMe ? "text-white" : "text-gray-300"}`}>
        {player.name}
        {isMe && <span className="text-gray-500 text-xs ml-1">(you)</span>}
      </span>
      {isHost && <span className="text-yellow-500 text-xs">👑</span>}
    </div>
  );
}

function EmptySlot() {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 border border-dashed border-gray-700">
      <div className="w-2 h-2 rounded-full flex-shrink-0 bg-gray-700" />
      <span className="text-xs text-gray-600 italic">Waiting...</span>
    </div>
  );
}
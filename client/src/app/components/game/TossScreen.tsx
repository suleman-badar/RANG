import React from "react";
import { useGame } from "../../context/GameContext";

export function TossScreen() {
  const { state } = useGame();
  const { players, tossWinnerId, lastTossCard } = state;

  const winner = players.find((p) => p.id === tossWinnerId);
  const isTossing = !tossWinnerId;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">

        <div className="text-6xl mb-6">🎲</div>

        {isTossing ? (
          <>
            <h2 className="text-2xl text-white mb-2">Tossing Cards...</h2>
            <p className="text-green-400 text-sm">Determining who picks the batter</p>

            {lastTossCard && (
              <p className="text-gray-300 text-sm mt-3">
                Last card: <span className="text-white font-medium">{String(lastTossCard.card?.id ?? "?")}</span> to{" "}
                <span className="text-white font-medium">
                  {players.find((p) => p.id === lastTossCard.recipientPlayerId)?.name ?? "?"}
                </span>
              </p>
            )}

            <div className="mt-8 flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 bg-green-400 rounded-full"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl text-white mb-2">Toss Result</h2>
            <div className="bg-gray-900/80 rounded-2xl border border-gray-700 p-6 mt-4 mb-6">
              <p className="text-gray-400 text-sm mb-2">Winner</p>
              <p className="text-yellow-400 text-3xl font-medium">
                {winner?.name ?? "Unknown"}
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Team {(winner?.teamIndex ?? 0) + 1}
              </p>
            </div>
            <p className="text-gray-400 text-sm">
              Waiting for <span className="text-white">{winner?.name}</span> to select the batter...
            </p>
          </>
        )}

        {/* Players list */}
        <div className="mt-8 grid grid-cols-2 gap-3">
          {players.map((p) => (
            <div
              key={p.id}
              className={`
                rounded-xl border p-3 transition-all
                ${p.id === tossWinnerId
                  ? "border-yellow-500 bg-yellow-900/20"
                  : "border-gray-700 bg-gray-900/50"
                }
              `}
            >
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${p.connected ? "bg-green-400" : "bg-gray-600"}`} />
                <span className={`text-sm truncate ${p.id === tossWinnerId ? "text-yellow-300" : "text-gray-300"}`}>
                  {p.name}
                </span>
                {p.id === tossWinnerId && <span className="ml-auto text-yellow-500">★</span>}
              </div>
              <p className={`text-xs mt-1 ${p.teamIndex === 0 ? "text-blue-400" : "text-orange-400"}`}>
                Team {p.teamIndex + 1}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Select Batter Screen ─────────────────────────────────────────────────────

export function SelectBatterScreen() {
  const { state, selectBatter } = useGame();
  const { players, tossWinnerId, myPlayerId } = state;

  const amWinner = tossWinnerId === myPlayerId;

  if (!amWinner) {
    return <TossScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏏</div>
          <h2 className="text-2xl text-white">You Won the Toss!</h2>
          <p className="text-green-400 text-sm mt-1">Select who will bat first</p>
        </div>

        <div className="space-y-3">
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => selectBatter(p.id)}
              className={`
                w-full rounded-xl border p-4 text-left transition-all hover:scale-[1.02] active:scale-[0.98]
                ${p.teamIndex === 0
                  ? "border-blue-700 bg-blue-900/30 hover:bg-blue-900/50"
                  : "border-orange-700 bg-orange-900/30 hover:bg-orange-900/50"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-medium ${p.id === myPlayerId ? "text-white" : "text-gray-200"}`}>
                    {p.name}
                    {p.id === myPlayerId && (
                      <span className="text-gray-500 text-xs ml-2">(you)</span>
                    )}
                  </p>
                  <p className={`text-xs mt-0.5 ${p.teamIndex === 0 ? "text-blue-400" : "text-orange-400"}`}>
                    Team {p.teamIndex + 1} · Player {p.playerIndex + 1}
                  </p>
                </div>
                <div className="text-2xl">🏏</div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-gray-600 text-xs text-center mt-4">
          The selected player's team will bat first
        </p>
      </div>
    </div>
  );
}

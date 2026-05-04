import React from "react";
import { useGame } from "../../context/GameContext";

export function GameOverScreen() {
  const { state, leaveRoom } = useGame();
  const { totalScores, roundScores, players, myPlayerId } = state;

  const me = players.find((p) => p.id === myPlayerId);
  const myTeam = me?.teamIndex ?? -1;

  const winnerTeam = totalScores[0] > totalScores[1] ? 0 : totalScores[1] > totalScores[0] ? 1 : -1;
  const iWon = winnerTeam === myTeam;
  const isDraw = winnerTeam === -1;

  const team0Players = players.filter((p) => p.teamIndex === 0).map((p) => p.name).join(" & ");
  const team1Players = players.filter((p) => p.teamIndex === 1).map((p) => p.name).join(" & ");

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-950 via-green-900 to-emerald-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Result header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">
            {isDraw ? "🤝" : iWon ? "🏆" : "💔"}
          </div>
          <h1 className="text-3xl text-white mb-2">
            {isDraw ? "It's a Draw!" : iWon ? "You Win!" : "Game Over"}
          </h1>
          {!isDraw && (
            <p className={`text-lg ${winnerTeam === 0 ? "text-blue-400" : "text-orange-400"}`}>
              Team {winnerTeam + 1} wins the game!
            </p>
          )}
        </div>

        {/* Final scores */}
        <div className="bg-gray-900/80 rounded-2xl border border-gray-700 p-5 mb-4">
          <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-4">Final Score</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Team 0 */}
            <div className={`
              rounded-xl border p-4 text-center
              ${winnerTeam === 0
                ? "border-blue-500 bg-blue-900/30"
                : "border-gray-700 bg-gray-800/30"
              }
            `}>
              {winnerTeam === 0 && <p className="text-yellow-400 text-sm mb-1">🏆 Winner</p>}
              <p className="text-blue-400 text-xs mb-1">Team 1</p>
              <p className="text-white text-4xl mb-2">{totalScores[0]}</p>
              <p className="text-gray-500 text-xs">{team0Players || "Team 1"}</p>
            </div>

            {/* Team 1 */}
            <div className={`
              rounded-xl border p-4 text-center
              ${winnerTeam === 1
                ? "border-orange-500 bg-orange-900/30"
                : "border-gray-700 bg-gray-800/30"
              }
            `}>
              {winnerTeam === 1 && <p className="text-yellow-400 text-sm mb-1">🏆 Winner</p>}
              <p className="text-orange-400 text-xs mb-1">Team 2</p>
              <p className="text-white text-4xl mb-2">{totalScores[1]}</p>
              <p className="text-gray-500 text-xs">{team1Players || "Team 2"}</p>
            </div>
          </div>
        </div>

        {/* Round-by-round */}
        {roundScores.length > 0 && (
          <div className="bg-gray-900/80 rounded-2xl border border-gray-700 p-5 mb-4">
            <h2 className="text-gray-400 text-xs uppercase tracking-widest mb-3">Round History</h2>
            <div className="space-y-2">
              {roundScores.map((rs: any, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Round {rs.round ?? i + 1}</span>
                  <div className="flex items-center gap-3">
                    <span className={`${(rs.team0Points ?? 0) > 0 ? "text-blue-400" : "text-gray-600"}`}>
                      +{rs.team0Points ?? 0}
                    </span>
                    <span className="text-gray-700">vs</span>
                    <span className={`${(rs.team1Points ?? 0) > 0 ? "text-orange-400" : "text-gray-600"}`}>
                      +{rs.team1Points ?? 0}
                    </span>
                  </div>
                  {rs.winnerTeam !== undefined && (
                    <span className={`text-xs ${rs.winnerTeam === 0 ? "text-blue-400" : "text-orange-400"}`}>
                      T{rs.winnerTeam + 1} ✓
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={leaveRoom}
          className="w-full bg-green-700 hover:bg-green-600 text-white rounded-xl py-3 font-medium transition-colors"
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

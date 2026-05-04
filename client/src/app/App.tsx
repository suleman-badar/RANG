import React from "react";
import { GameProvider, useGame } from "./context/GameContext";
import { HomeScreen } from "./components/game/HomeScreen";
import { LobbyScreen } from "./components/game/LobbyScreen";
import { TossScreen, SelectBatterScreen } from "./components/game/TossScreen";
import { GameScreen } from "./components/game/GameScreen";
import { GameOverScreen } from "./components/game/GameOverScreen";

function GameRouter() {
  const { state } = useGame();
  const { screen } = state;

  switch (screen) {
    case "home":
      return <HomeScreen />;
    case "lobby":
      return <LobbyScreen />;
    case "toss":
      return <TossScreen />;
    case "select_batter":
      return <SelectBatterScreen />;
    case "game":
      return <GameScreen />;
    case "game_over":
      return <GameOverScreen />;
    default:
      return <HomeScreen />;
  }
}

export default function App() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}

import { useState, useCallback, useEffect } from "react";
import TargetGhostGame from "./games/aimtrainer/TargetGhostGame";
import SpatialMemoryGame from "./games/path/SpatialMemoryGame";
import "./GameSelector.css";

type GameType = "aimtrainer" | "path" | null;

export default function GameSelector() {
  const [selectedGame, setSelectedGame] = useState<GameType>(null);
  const handleSaveResult = (result: any) => {
    console.log("Saving result to System...", result);
    setSelectedGame(null);
  };

  if (selectedGame === "aimtrainer") {
    return (
      <div className="game-container">
        <button onClick={() => setSelectedGame(null)} className="back-button">
          ← Back
        </button>
        <TargetGhostGame
          playerId="dev-player"
          sessionId="dev-session"
          onGameComplete={handleSaveResult}
        />
      </div>
    );
  }

  if (selectedGame === "path") {
    return (
      <div className="game-container">
        <button onClick={() => setSelectedGame(null)} className="back-button">
          ← Back
        </button>
        <SpatialMemoryGame
          playerId="dev-player"
          sessionId="dev-session"
          onGameComplete={handleSaveResult}
        />
      </div>
    );
  }

  return (
    <div className="game-selector">
      <h1>Computer Skill Games</h1>
      <div className="games-grid">
        <div
          className="game-card"
          onClick={() => setSelectedGame("aimtrainer")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setSelectedGame("aimtrainer");
            }
          }}
        >
          <h2>Aim Trainer</h2>
          <p>Test your targeting and precision skills</p>
        </div>
        <div
          className="game-card"
          onClick={() => setSelectedGame("path")}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              setSelectedGame("path");
            }
          }}
        >
          <h2>Spatial Memory</h2>
          <p>Memorize patterns and navigate through obstacles</p>
        </div>
      </div>
    </div>
  );
}

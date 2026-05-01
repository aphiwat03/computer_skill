import TargetGhostGame from "./games/aimtrainer/TargetGhostGame";

export default function App() {
  return  <TargetGhostGame
      playerId="dev-player"
      sessionId="dev-session"
      onGameComplete={(result) => {
        console.log("Game complete:", result);
      }}
    />;
}

# Spatial Memory Benchmark

A cognitive assessment tool built as a React Component. Designed to test and benchmark a player's spatial memory, visual navigation, and mouse control precision.

## 📋 Overview

Spatial Memory is a plug-and-play module. It does not connect to any database directly. It receives player session data via props and returns a standardized `GameResult` object back to the main system upon completion.

## 🎮 How to Play

1. **Memorize (จำตำแหน่ง):** The screen will show a Start point, an END point, and several obstacles. You have a few seconds to memorize the safe path.
2. **Navigate (นำทางแบบตาบอด):** The screen turns completely white (or shows only the start point). You must click the START point and drag your cursor to the END point based entirely on your memory.
3. **Avoid Collisions:** Do not hit any obstacles or drag outside the canvas boundaries.
4. **Moving Obstacles:** In levels 4 and 5, obstacles will continuously move, requiring you to anticipate their positions in your mind!

## 🚀 Integration (For Main System)

```tsx
import SpatialMemoryGame from "./spatial-memory/SpatialMemoryGame";

export default function App() {
  const handleGameComplete = (result) => {
    // The main system handles database saving here
    console.log("Saving to database...", result);
  };

  return (
    <SpatialMemoryGame
      playerId="STUDENT_001"
      sessionId="SESSION_XYZ"
      onGameComplete={handleGameComplete}
    />
  );
}
```

# Target Ghost (Reaction Time & Aim Trainer)

A high-intensity reaction time and aim training game built as a React Component. Designed to measure and improve player reflexes, mouse control (flicking), and precision.

## 📋 Overview

Target Ghost is a plug-and-play game module. It does not connect to any database directly. Instead, it receives player session data via props and returns a standardized `GameResult` object back to the main system upon completion.

## 🎮 How to Play

1. **Wait for the Signal:** The game will spawn targets on the screen. Wait until a target activates (shows a red glowing ring).
2. **React Quickly:** Click the activated target as fast as possible.
3. **Don't Rush:** Clicking before a target activates (Early Click) or clicking on the background (Miss) will result in score penalties.
4. **Clear Stages:** Survive the time limit across 5 progressive difficulty levels to clear the game.

## 📈 Performance Metrics Explained

The game evaluates two distinct types of speed:

1. **Avg Reaction Time:** Measures basic human reflex. The time taken from when a target **activates (turns red)** to when the player clicks it.
2. **Avg Switch (Flick) Time:** Measures mouse control and muscle memory. The time taken from **destroying the previous target** to successfully destroying the current one (moving from point A to point B).

## 📊 Difficulty Levels

| Level | Name         | Targets on Screen | Time Limit | Signal Interval |
| :---- | :----------- | :---------------- | :--------- | :-------------- |
| 1     | Beginner     | 3                 | 10s        | 3.0s            |
| 2     | Training     | 5                 | 10s        | 2.5s            |
| 3     | Intermediate | 7                 | 10s        | 2.0s            |
| 4     | Advanced     | 9                 | 15s        | 1.8s            |
| 5     | Sharpshooter | 11                | 15s        | 1.5s            |

## 🚀 Integration (For Main System)

```tsx
import TargetGhostGame from "./target-ghost/TargetGhostGame";

export default function App() {
  const handleGameComplete = (result) => {
    console.log("Saving to database...", result);
  };

  return (
    <TargetGhostGame
      playerId="STUDENT_001"
      sessionId="SESSION_XYZ"
      onGameComplete={handleGameComplete}
    />
  );
}
```

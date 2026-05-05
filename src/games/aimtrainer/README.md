# Reaction Time Test - Target Ghost Game

A high-intensity reaction time training game built with React and TypeScript. Test and improve your reflexes by clicking targets as quickly as possible!

## 📋 Overview

Target Ghost Game is an interactive gaming experience designed to measure and improve your reaction time. The game features progressive difficulty levels, visual feedback, and detailed performance analytics.

## 🎮 Game Mechanics

### Game Phases

1. **Menu** - Main entry point with game instructions
2. **Memorize** - Remember the positions of all targets on screen (4 seconds by default)
3. **Blackout** - Targets disappear from view (1-2 seconds)
4. **Shooting** - Targets reappear one by one; click them as fast as possible
5. **Result** - View performance metrics and ratings
6. **Game Over** - Final score summary after level completion

### How to Play

- Targets appear in sequence during the shooting phase
- When a target shows a **red light**, click it immediately
- Hit accuracy and reaction time are tracked
- Progress through 5 difficulty levels
- Complete all levels to become a **Sharpshooter**!

## 📊 Difficulty Levels

| Level | Name         | Targets | Memorize | Blackout | Shooting | Signal |
| ----- | ------------ | ------- | -------- | -------- | -------- | ------ |
| 1     | Beginner     | 3       | 4s       | 1s       | 30s      | 3s     |
| 2     | Training     | 5       | 4s       | 1.2s     | 28s      | 2.5s   |
| 3     | Intermediate | 7       | 3.5s     | 1.5s     | 25s      | 2s     |
| 4     | Advanced     | 9       | 3s       | 1.8s     | 22s      | 1.8s   |
| 5     | Sharpshooter | 11      | 2.5s     | 2s       | 20s      | 1.5s   |

## 🏆 Rating System

Performance is rated based on accuracy and average reaction time:

- **PERFECT** ⭐⭐⭐ - 100% accuracy + <400ms reaction time
- **EXCELLENT** ⭐⭐ - ≥80% accuracy + <700ms reaction time
- **GOOD** ⭐ - ≥50% accuracy
- **TRY AGAIN** - Below good performance

## 📈 Performance Metrics

After each level, view detailed statistics:

- **Targets Hit** - Number of successful clicks
- **Accuracy** - Percentage of targets hit
- **Avg Reaction** - Average time to click targets
- **Fastest** - Quickest reaction time
- **Misses** - Shots that missed targets
- **Score** - Total points earned

## 🗂️ Project Structure

```
aimtrainer/
├── TargetGhostGame.tsx    # Main game component with UI
├── logic.ts               # Game state management & mechanics
├── types.ts               # TypeScript interfaces & level config
└── README.md              # This file
```

### File Details

**TargetGhostGame.tsx**

- Main React component rendering the game UI
- Handles user interactions (clicks, mouse movements)
- Displays HUD, menus, result screens
- Manages visual effects and animations

**logic.ts**

- Core game logic using React hooks
- Target generation and positioning
- Timer management for game phases
- Score calculation and result tracking
- Game state management

**types.ts**

- TypeScript type definitions
- `GameState` - Current game state
- `Target` - Target object with position & status
- `Shot` - Player shot information
- `LevelConfig` - Level configuration
- `GameResult` - Final game results
- `LEVELS` - Array of all 5 level configurations

## 🎯 Key Features

✅ **5 Progressive Difficulty Levels** - Increasing complexity with more targets and shorter reaction times

✅ **Real-time Feedback** - Visual effects for hits and misses

✅ **Detailed Analytics** - Track accuracy, reaction time, and performance trends

✅ **Star Rating System** - Motivating feedback on performance

✅ **Smooth Animations** - Polished UI with grid backgrounds and visual transitions

✅ **Mobile Friendly** - Responsive design that works on different screen sizes

✅ **Dark Theme** - Easy on the eyes with cyberpunk aesthetic

## 🎨 Visual Design

- **Color Scheme**: Dark background with neon accents
- **Target Design**: Multi-ring circular targets with pulsing animation
- **HUD Display**: Real-time level, score, and timer information
- **Effects**: Shot animations, hit feedback, smooth transitions

## 🚀 Usage

```tsx
import TargetGhostGame from "./games/aimtrainer/TargetGhostGame";

// In your component
<TargetGhostGame
  playerId="user123"
  sessionId="session456"
  onGameComplete={(result) => {
    console.log("Game complete:", result);
  }}
/>;
```

### Props

- `playerId` - Unique identifier for the player
- `sessionId` - Session identifier for tracking
- `onGameComplete` - Callback function when game ends, receives `GameResult`

## 📝 Game Result Format

```typescript
{
  gameId: string;
  gameName: string;
  playerId: string;
  sessionId: string;
  score: number;
  accuracy: number;
  reactionTimeMs?: number;
  responseTimesMs: number[];
  startedAt: string;
  endedAt: string;
  durationMs: number;
  rawData: any;
}
```

## 🎮 Tips for High Scores

1. **Memorize Carefully** - Pay attention to target positions during the memorize phase
2. **Stay Focused** - Concentration is key during the shooting phase
3. **Practice Levels** - Start with easier levels to build muscle memory
4. **Click Accurately** - Aim for the center of the target for consistent hits
5. **Track Progress** - Try to beat your previous scores and improve reaction times

## 📱 Browser Support

Works on all modern browsers with React 18+ support:

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## 🔧 Technical Stack

- **React** - UI framework
- **TypeScript** - Type safety
- **CSS-in-JS** - Inline styles for components
- **Hooks** - State and effect management

## 📄 License

Part of the Computer Skill training platform

---

**Challenge yourself and become a Sharpshooter!** 🎯

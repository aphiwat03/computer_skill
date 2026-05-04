# 🧠 Spatial Memory Test

> **Esports Cognitive Benchmark — Spatial Processing Module**

## Overview

ทดสอบความจำเชิงพื้นที่และความนิ่งของมือโดยไม่พึ่งพาสายตา ผู้เล่นต้องจำตำแหน่งจุดเริ่มต้น เป้าหมาย และสิ่งกีดขวาง จากนั้นนำทางผ่านหน้าจอที่ขาวโพลน

## What It Measures

| Metric | Description |
|--------|-------------|
| **Spatial Memory** | ความสามารถจดจำตำแหน่งในพื้นที่ 2D |
| **Hand Steadiness** | ความนิ่งของมือขณะเคลื่อนที่โดยไม่มี Visual Feedback |
| **Path Planning** | วางเส้นทางหลบสิ่งกีดขวางในความจำ |
| **Motor Precision** | ความแม่นยำในการหยุด ณ เป้าหมาย |

## Scoring

```
Score = Accuracy (50%) + Path Efficiency (25%) + Speed (25%)
Max per round = 1,000 points
```

### Rating Tiers

| Rating | Score |
|--------|-------|
| 🥇 LEGENDARY | 900+ |
| 💎 DIAMOND | 750–899 |
| 🏆 PLATINUM | 550–749 |
| 🥈 GOLD | 350–549 |
| ⚪ SILVER | 150–349 |
| 🟫 BRONZE | 0–149 |

## Phases

1. **MEMORIZE** — ดูแผนที่ จำตำแหน่งทุกอย่าง (2.5–5s ตาม Difficulty)
2. **COUNTDOWN** — เตรียมตัว 3 วินาที
3. **NAVIGATE** — หน้าจอขาวโพลน ลากเมาส์ไปยังเป้าหมาย
4. **RESULT** — ดูผลคะแนนและ Breakdown

## File Structure

```
games/spatial-memory/
├── SpatialMemoryGame.tsx   # React component + canvas rendering
├── logic.ts                # Pure game logic, no React deps
├── types.ts                # TypeScript interfaces
└── README.md               # This file
```

## Usage

```tsx
import SpatialMemoryGame from '@/games/spatial-memory/SpatialMemoryGame';

<SpatialMemoryGame
  difficulty="medium"
  totalRounds={3}
  onComplete={(results) => console.log(results)}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `difficulty` | `'easy' \| 'medium' \| 'hard'` | `'medium'` | ระดับความยาก |
| `totalRounds` | `number` | `3` | จำนวนรอบ |
| `onComplete` | `(results: AttemptResult[]) => void` | — | Callback เมื่อจบเกม |

## Tech Stack

- **React 18** + TypeScript
- **Vite** build tool
- **Canvas API** for rendering
- Zero external game dependencies

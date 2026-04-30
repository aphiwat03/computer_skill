export type GamePhase =
  | "menu"
  | "memorize"
  | "blackout"
  | "shooting"
  | "result"
  | "gameover";

export interface Target {
  id: number;
  x: number;
  y: number;
  isActive: boolean;
  isHit: boolean;
  activatedAt?: number;
}

export interface Shot {
  x: number;
  y: number;
  hit: boolean;
  reactionTime?: number;
  timestamp: number;
}

export interface LevelConfig {
  level: number;
  targetCount: number;
  memorizeTime: number;
  blackoutTime: number;
  shootingTime: number;
  signalInterval: number;
  label: string;
}

export interface GameState {
  phase: GamePhase;
  currentLevel: number;
  targets: Target[];
  shots: Shot[];
  activeTargetId: number | null;
  score: number;
  lives: number;
  missCount: number;
  hitCount: number;
  currentReactionStart: number | null;
  levelComplete: boolean;
  totalTime: number;
  shootingTimeLeft: number;
}

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    targetCount: 3,
    memorizeTime: 4000,
    blackoutTime: 1000,
    shootingTime: 30000,
    signalInterval: 3000,
    label: "มือใหม่",
  },
  {
    level: 2,
    targetCount: 4,
    memorizeTime: 4000,
    blackoutTime: 1200,
    shootingTime: 28000,
    signalInterval: 2500,
    label: "ฝึกหัด",
  },
  {
    level: 3,
    targetCount: 5,
    memorizeTime: 3500,
    blackoutTime: 1500,
    shootingTime: 25000,
    signalInterval: 2000,
    label: "ปานกลาง",
  },
  {
    level: 4,
    targetCount: 6,
    memorizeTime: 3000,
    blackoutTime: 1800,
    shootingTime: 22000,
    signalInterval: 1800,
    label: "เชี่ยวชาญ",
  },
  {
    level: 5,
    targetCount: 7,
    memorizeTime: 2500,
    blackoutTime: 2000,
    shootingTime: 20000,
    signalInterval: 1500,
    label: "นักแม่นปืน",
  },
];

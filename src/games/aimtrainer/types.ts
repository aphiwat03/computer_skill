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
  startedAt: string;
}

export interface GameResult {
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

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    targetCount: 3,
    memorizeTime: 4000,
    blackoutTime: 1000,
    shootingTime: 30000,
    signalInterval: 3000,
    label: "Beginner",
  },
  {
    level: 2,
    targetCount: 5,
    memorizeTime: 4000,
    blackoutTime: 1200,
    shootingTime: 28000,
    signalInterval: 2500,
    label: "Training",
  },
  {
    level: 3,
    targetCount: 7,
    memorizeTime: 3500,
    blackoutTime: 1500,
    shootingTime: 25000,
    signalInterval: 2000,
    label: "Intermediate",
  },
  {
    level: 4,
    targetCount: 9,
    memorizeTime: 3000,
    blackoutTime: 1800,
    shootingTime: 22000,
    signalInterval: 1800,
    label: "Advanced",
  },
  {
    level: 5,
    targetCount: 11,
    memorizeTime: 2500,
    blackoutTime: 2000,
    shootingTime: 20000,
    signalInterval: 1500,
    label: "Sharpshooter",
  },
];

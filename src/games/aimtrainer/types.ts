export type GamePhase = "menu" | "shooting" | "result" | "gameover";

export interface Target {
  id: number;
  x: number;
  y: number;
  isActive: boolean;
  isHit: boolean;
  isWaiting?: boolean;
  isHoldingCenter?: boolean;
  activatedAt?: number;
}

export interface Shot {
  x: number;
  y: number;
  hit: boolean;
  targetId?: number | null;
  reactionTime?: number;
  switchTime?: number;
  distanceFromCenter?: number;
  isCenterHit?: boolean;
  isEarlyClick?: boolean;
  timestamp: number;
}

export interface LevelConfig {
  level: number;
  targetCount: number;
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
  lives: number;
  missCount: number;
  hitCount: number;
  centerHitCount: number;
  earlyClickCount: number;
  currentReactionStart: number | null;
  lastHitAt: number | null;
  levelComplete: boolean;
  totalTime: number;
  shootingTimeLeft: number;
  startedAt: string;
  hasStartedShooting: boolean;
  isTimerPaused: boolean;
  finalStats?: {
    accuracy: number;
    avgReaction: number;
    avgSwitch: number;
    consistencyMs: number;
    stabilityStatus: string;
  };
}

export interface GameResult {
  gameId: string;
  gameName: string;
  playerId: string;
  sessionId: string;
  accuracy: number;
  reactionTimeMs?: number;
  averageSwitchTimeMs?: number;
  responseTimesMs: number[];
  globalConsistencyMs: number;
  globalStabilityStatus: string;
  startedAt: string;
  endedAt: string;
  rawData: any;
}

export const TARGET_SIZE_PX = 64;
export const TARGET_HIT_RADIUS_PX = TARGET_SIZE_PX / 2;

export const LEVELS: LevelConfig[] = [
  {
    level: 1,
    targetCount: 4,
    shootingTime: 10000,
    signalInterval: 3000,
    label: "Beginner",
  },
  {
    level: 2,
    targetCount: 6,
    shootingTime: 10000,
    signalInterval: 2500,
    label: "Training",
  },
  {
    level: 3,
    targetCount: 8,
    shootingTime: 10000,
    signalInterval: 2000,
    label: "Intermediate",
  },
  {
    level: 4,
    targetCount: 10,
    shootingTime: 15000,
    signalInterval: 1800,
    label: "Advanced",
  },
  {
    level: 5,
    targetCount: 12,
    shootingTime: 15000,
    signalInterval: 1500,
    label: "Sharpshooter",
  },
];
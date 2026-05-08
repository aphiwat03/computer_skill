export type GamePhase =
  | "idle"
  | "memorize"
  | "countdown"
  | "navigate"
  | "result";

export interface Point {
  x: number;
  y: number;
  timeMs?: number;
}

export interface Obstacle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  baseX: number;
  baseY: number;
  moveType: "static" | "horizontal" | "vertical";
  moveRange: number;
  moveSpeed: number;
  moveOffset: number;
}

export interface Trail {
  points: Point[];
}

export type CollisionResult = "none" | "obstacle" | "out_of_bounds";

export interface AttemptResult {
  success: boolean;
  collisionType: CollisionResult;
  distanceFromTarget: number;
  pathLength: number;
  timeTaken: number;
  collisionPoint?: Point;
}

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  memorizeTime: number;
  countdownTime: number;
  startRadius: number;
  targetRadius: number;
  obstacleCount: number;
  difficulty: "easy" | "medium" | "hard";
}

export interface GameState {
  phase: GamePhase;
  start: Point;
  target: Point;
  obstacles: Obstacle[];
  trail: Point[];
  isMouseDown: boolean;
  startTime: number | null;
  result: AttemptResult | null;
  score: number;
  round: number;
  totalRounds: number;
  roundResults: AttemptResult[];
}

export interface ScoreBreakdown {
  accuracy: number;
  pathEfficiency: number;
  speed: number;
  total: number;
}

export type GameResult = {
  gameId: string;
  gameName: string;
  playerId: string;
  sessionId: string;
  score: number;
  accuracy?: number;
  reactionTimeMs?: number;
  responseTimesMs?: number[];
  startedAt: string;
  endedAt: string;
  durationMs: number;
  rawData: any;
};

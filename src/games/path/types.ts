export type GamePhase =
  | "idle"
  | "memorize"
  | "countdown"
  | "navigate"
  | "view_path"
  | "result"
  | "summary";

// จุดบน canvas ใช้ coordinate ภายในเกม ไม่ใช่ pixel จริงของหน้าจอ
// timeMs ใช้ผูกตำแหน่งเมาส์กับตำแหน่ง obstacle ที่อาจกำลังเคลื่อนที่ในขณะนั้น
export interface Point {
  x: number;
  y: number;
  timeMs?: number;
}

// สิ่งกีดขวางเก็บทั้งตำแหน่งปัจจุบันและ base position สำหรับคำนวณการแกว่งด้วย sine wave
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

// ผลของการเล่นหนึ่งรอบ ใช้ทั้งแสดงผลทันทีและรวมเป็นสรุปท้ายเกม
export interface AttemptResult {
  success: boolean;
  collisionType: CollisionResult;
  distanceFromTarget: number;
  pathLength: number;
  timeTaken: number;
  collisionPoint?: Point;
}

// ค่าควบคุมระดับเกมที่ logic.ts ใช้สร้างด่าน ตรวจชน และคิดคะแนน
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

// state หลักของ component ถูกเปลี่ยนผ่าน reducer เพื่อให้ phase ของเกมอ่านตามลำดับได้
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

// คะแนนย่อยเป็นเปอร์เซ็นต์ ใช้แสดงรายละเอียดหลังจบรอบ
export interface ScoreBreakdown {
  accuracy: number;
  pathEfficiency: number;
  speed: number;
  total: number;
}

// รูปแบบข้อมูลที่ส่งออกให้ระบบภายนอกเมื่อจบเกมครบทุกด่าน
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

import type {
  Point,
  Obstacle,
  GameConfig,
  AttemptResult,
  CollisionResult,
  ScoreBreakdown,
} from "./types";

export const DIFFICULTY_CONFIGS: Record<string, Partial<GameConfig>> = {
  easy: { obstacleCount: 2, memorizeTime: 5000 },
  medium: { obstacleCount: 3, memorizeTime: 3500 },
  hard: { obstacleCount: 4, memorizeTime: 2500 },
};

export function createDefaultConfig(
  canvasWidth: number,
  canvasHeight: number,
  difficulty: GameConfig["difficulty"] = "medium",
): GameConfig {
  return {
    canvasWidth,
    canvasHeight,
    memorizeTime: DIFFICULTY_CONFIGS[difficulty].memorizeTime ?? 3500,
    countdownTime: 3000,
    startRadius: 22,
    targetRadius: 22,
    obstacleCount: DIFFICULTY_CONFIGS[difficulty].obstacleCount ?? 4,
    difficulty,
  };
}

// ─── Dynamic Obstacles ────────────────────────────────────────────────────────
export function getDynamicObstacles(
  obstacles: Obstacle[],
  timeMs: number,
): Obstacle[] {
  return obstacles.map((obs) => {
    if (obs.moveType === "static") return obs;
    const t = (timeMs / 1000) * obs.moveSpeed + obs.moveOffset;
    const offset = Math.sin(t) * obs.moveRange;
    return {
      ...obs,
      x: obs.baseX + (obs.moveType === "horizontal" ? offset : 0),
      y: obs.baseY + (obs.moveType === "vertical" ? offset : 0),
    };
  });
}

// ─── Layout Generation ───────────────────────────────────────────────────────

export function generateLevel(
  config: GameConfig,
  round: number = 1,
): {
  start: Point;
  target: Point;
  obstacles: Obstacle[];
} {
  const { canvasWidth: W, canvasHeight: H } = config;
  const margin = 60;

  for (let attempt = 0; attempt < 100; attempt++) {
    const start: Point = {
      x: margin + Math.random() * (W * 0.3),
      y: margin + Math.random() * (H - margin * 2),
    };

    // Target on opposite side
    const target: Point = {
      x: W - margin - Math.random() * (W * 0.3),
      y: margin + Math.random() * (H - margin * 2),
    };

    if (distance(start, target) < W * 0.5) {
      continue;
    }

    const obstacles = generateObstacles(config, start, target, round);

    let isBlocked = false;
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const pt: Point = {
        x: start.x + (target.x - start.x) * t,
        y: start.y + (target.y - start.y) * t,
      };

      if (checkCollision(pt, obstacles, config) === "obstacle") {
        isBlocked = true;
        break;
      }
    }

    if (isBlocked) {
      return { start, target, obstacles };
    }
  }

  // Fallback
  const start: Point = { x: margin, y: H / 2 };
  const target: Point = { x: W - margin, y: H / 2 };
  const obstacles = generateObstacles(config, start, target, round);
  obstacles.push({
    id: `obs-forced`,
    x: W / 2 - 25,
    y: H / 2 - 25,
    width: 50,
    height: 50,
    baseX: W / 2 - 25,
    baseY: H / 2 - 25,
    moveType: "static",
    moveRange: 0,
    moveSpeed: 0,
    moveOffset: 0,
  });
  return { start, target, obstacles };
}

function generateObstacles(
  config: GameConfig,
  start: Point,
  target: Point,
  round: number,
): Obstacle[] {
  const { canvasWidth: W, canvasHeight: H, obstacleCount } = config;
  const obstacles: Obstacle[] = [];

  let currentObstacleCount = config.obstacleCount;
  if (round === 3) {
    currentObstacleCount += 2;
  } else if (round === 4) {
    currentObstacleCount += 3;
  } else if (round >= 5) {
    currentObstacleCount += 4;
  }
  const OBS_SIZE = 50;
  const safeRadius = 110;
  const maxAttempts = 300;
  const now = Date.now();

  for (let i = 0; i < currentObstacleCount; i++) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const w = OBS_SIZE;
      const h = OBS_SIZE;
      const x = 20 + Math.random() * (W - w - 40);
      const y = 20 + Math.random() * (H - h - 40);

      const cx = x + w / 2;
      const cy = y + h / 2;

      const distStart = distance({ x: cx, y: cy }, start);
      const distTarget = distance({ x: cx, y: cy }, target);
      if (distStart < safeRadius || distTarget < safeRadius) continue;
      if (
        obstacles.some((o) =>
          rectsOverlap({ x, y, width: w, height: h }, o, 40),
        )
      )
        continue;
      const isMoving = round >= 4;
      const moveType = isMoving
        ? i % 2 === 0
          ? "horizontal"
          : "vertical"
        : "static";
      if (isMoving) {
        const pathPadding = 35;

        if (moveType === "horizontal") {
          const pathTop = y - pathPadding;
          const pathBottom = y + h + pathPadding;

          if (
            (start.y >= pathTop && start.y <= pathBottom) ||
            (target.y >= pathTop && target.y <= pathBottom)
          ) {
            continue;
          }
        } else if (moveType === "vertical") {
          const pathLeft = x - pathPadding;
          const pathRight = x + w + pathPadding;

          if (
            (start.x >= pathLeft && start.x <= pathRight) ||
            (target.x >= pathLeft && target.x <= pathRight)
          ) {
            continue;
          }
        }
      }

      let moveRange = 0;
      let baseX = x;
      let baseY = y;
      let moveSpeed = 1.0 + Math.random() * 1.0;
      let moveOffset = 0;

      if (moveType === "horizontal") {
        moveRange = (W - w - 40) / 2;
        baseX = 20 + moveRange;
        const ratio = Math.max(-1, Math.min(1, (x - baseX) / moveRange));
        moveOffset = Math.asin(ratio) - (now / 1000) * moveSpeed;
      } else if (moveType === "vertical") {
        moveRange = (H - h - 40) / 2;
        baseY = 20 + moveRange;
        const ratio = Math.max(-1, Math.min(1, (y - baseY) / moveRange));
        moveOffset = Math.asin(ratio) - (now / 1000) * moveSpeed;
      } else {
        moveOffset = Math.random() * Math.PI * 2;
      }

      obstacles.push({
        id: `obs-${i}`,
        x,
        y,
        width: w,
        height: h,
        baseX,
        baseY,
        moveType,
        moveRange,
        moveSpeed,
        moveOffset,
      });
      break;
    }
  }

  return obstacles;
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: Obstacle,
  padding = 0,
): boolean {
  return (
    a.x < b.x + b.width + padding &&
    a.x + a.width + padding > b.x &&
    a.y < b.y + b.height + padding &&
    a.y + a.height + padding > b.y
  );
}

// ─── Collision Detection ──────────────────────────────────────────────────────

export function checkCollision(
  point: Point,
  obstacles: Obstacle[],
  config: GameConfig,
): CollisionResult {
  const { canvasWidth: W, canvasHeight: H } = config;

  if (point.x < 0 || point.x > W || point.y < 0 || point.y > H) {
    return "out_of_bounds";
  }

  for (const obs of obstacles) {
    if (
      point.x >= obs.x &&
      point.x <= obs.x + obs.width &&
      point.y >= obs.y &&
      point.y <= obs.y + obs.height
    ) {
      return "obstacle";
    }
  }

  return "none";
}

export function checkSegmentCollision(
  a: Point,
  b: Point,
  obstacles: Obstacle[],
  config: GameConfig,
  steps = 20,
): { collision: CollisionResult; point?: Point } {
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const pt: Point = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    const c = checkCollision(pt, obstacles, config);
    if (c !== "none") return { collision: c, point: pt };
  }
  return { collision: "none" };
}

// ─── Result Evaluation ────────────────────────────────────────────────────────

export function evaluateAttempt(
  trail: Point[],
  target: Point,
  obstacles: Obstacle[],
  config: GameConfig,
  startTime: number,
): AttemptResult {
  if (trail.length === 0) {
    return {
      success: false,
      collisionType: "none",
      distanceFromTarget: Infinity,
      pathLength: 0,
      timeTaken: 0,
    };
  }

  const timeTaken = Date.now() - startTime;
  const pathLen = pathLength(trail);
  const lastPt = trail[trail.length - 1];
  const distFromTarget = distance(lastPt, target);

  // Scan path for collisions using exact timing to match moving obstacles
  for (let i = 1; i < trail.length; i++) {
    const ptTime = trail[i].timeMs || Date.now();
    const currentObs = getDynamicObstacles(obstacles, ptTime);
    const { collision, point } = checkSegmentCollision(
      trail[i - 1],
      trail[i],
      currentObs,
      config,
      15,
    );
    if (collision !== "none") {
      return {
        success: false,
        collisionType: collision,
        distanceFromTarget: distFromTarget,
        pathLength: pathLen,
        timeTaken,
        collisionPoint: point,
      };
    }
  }

  const success = distFromTarget <= config.targetRadius;
  return {
    success,
    collisionType: "none",
    distanceFromTarget: distFromTarget,
    pathLength: pathLen,
    timeTaken,
  };
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function calculateScore(
  result: AttemptResult,
  config: GameConfig,
): number {
  if (!result.success) return 0;

  const diag = Math.sqrt(config.canvasWidth ** 2 + config.canvasHeight ** 2);

  const accuracy = Math.max(
    0,
    1 - result.distanceFromTarget / config.targetRadius,
  );
  const straightLine = diag * 0.5;
  const efficiency = Math.max(
    0,
    1 - Math.max(0, result.pathLength - straightLine) / (diag * 2),
  );
  const speedScore = Math.max(0, 1 - result.timeTaken / 8000);

  return Math.round(
    (accuracy * 0.5 + efficiency * 0.25 + speedScore * 0.25) * 1000,
  );
}

export function calculateBreakdown(
  result: AttemptResult,
  config: GameConfig,
): ScoreBreakdown {
  if (!result.success) {
    return { accuracy: 0, pathEfficiency: 0, speed: 0, total: 0 };
  }
  const diag = Math.sqrt(config.canvasWidth ** 2 + config.canvasHeight ** 2);
  const accuracy = Math.round(
    Math.max(0, 1 - result.distanceFromTarget / config.targetRadius) * 100,
  );
  const straightLine = diag * 0.5;
  const pathEfficiency = Math.round(
    Math.max(
      0,
      1 - Math.max(0, result.pathLength - straightLine) / (diag * 2),
    ) * 100,
  );
  const speed = Math.round(Math.max(0, 1 - result.timeTaken / 8000) * 100);
  const total = Math.round(
    accuracy * 0.5 + pathEfficiency * 0.25 + speed * 0.25,
  );
  return { accuracy, pathEfficiency, speed, total };
}

export function getRating(totalScore: number): {
  label: string;
  color: string;
} {
  if (totalScore >= 900) return { label: "LEGENDARY", color: "#FFD700" };
  if (totalScore >= 750) return { label: "DIAMOND", color: "#00CFFF" };
  if (totalScore >= 550) return { label: "PLATINUM", color: "#A8E6CF" };
  if (totalScore >= 350) return { label: "GOLD", color: "#FFA94D" };
  if (totalScore >= 150) return { label: "SILVER", color: "#C0C0C0" };
  return { label: "BRONZE", color: "#CD7F32" };
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

export function pathLength(points: Point[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += distance(points[i - 1], points[i]);
  }
  return len;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

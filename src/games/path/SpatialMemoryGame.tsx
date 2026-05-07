import {
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  useState,
  useReducer,
} from "react";
import type { GameState, GameConfig, Point, AttemptResult } from "./types";
import {
  generateLevel,
  createDefaultConfig,
  evaluateAttempt,
  calculateScore,
  calculateBreakdown,
  getRating,
  checkCollision,
} from "./logic";

// ─── Props ────────────────────────────────────────────────────────────────────

interface SpatialMemoryGameProps {
  difficulty?: GameConfig["difficulty"];
  totalRounds?: number;
  playerId?: string;
  sessionId?: string;
  onGameComplete?: (result: any) => void;
  onComplete?: (results: AttemptResult[]) => void;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | {
      type: "START_MEMORIZE";
      payload: Pick<GameState, "start" | "target" | "obstacles">;
    }
  | { type: "START_COUNTDOWN" }
  | { type: "START_NAVIGATE" }
  | { type: "MOUSE_DOWN"; payload: Point }
  | { type: "MOUSE_MOVE"; payload: Point }
  | { type: "MOUSE_UP" }
  | { type: "END_NAVIGATE"; payload: AttemptResult }
  | { type: "NEXT_ROUND" }
  | { type: "RESET" };

function initState(totalRounds: number): GameState {
  return {
    phase: "idle",
    start: { x: 0, y: 0 },
    target: { x: 0, y: 0 },
    obstacles: [],
    trail: [],
    isMouseDown: false,
    startTime: null,
    result: null,
    score: 0,
    round: 0,
    totalRounds,
    roundResults: [],
  };
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "START_MEMORIZE":
      return {
        ...state,
        phase: "memorize",
        ...action.payload,
        trail: [],
        isMouseDown: false,
        result: null,
        startTime: null,
        round: state.round + 1,
      };
    case "START_COUNTDOWN":
      return { ...state, phase: "countdown" };
    case "START_NAVIGATE":
      return { ...state, phase: "navigate" };
    case "MOUSE_DOWN":
      return {
        ...state,
        isMouseDown: true,
        trail: [action.payload],
        startTime: Date.now(),
      };
    case "MOUSE_MOVE":
      if (!state.isMouseDown) return state;
      return { ...state, trail: [...state.trail, action.payload] };
    case "MOUSE_UP":
      return { ...state, isMouseDown: false };
    case "END_NAVIGATE": {
      return {
        ...state,
        phase: "result",
        result: action.payload,
        roundResults: [...state.roundResults, action.payload],
      };
    }
    case "NEXT_ROUND":
      return { ...state, phase: "idle" };
    case "RESET":
      return initState(state.totalRounds);
    default:
      return state;
  }
}

// ─── Canvas Rendering ─────────────────────────────────────────────────────────

const COLORS = {
  bg: "#0a0c14",
  grid: "rgba(255,255,255,0.03)",
  obstacle: "#1a1f35",
  obstacleBorder: "#2a3060",
  obstacleGlow: "rgba(80,100,255,0.15)",
  start: "#00ff9d",
  startGlow: "rgba(0,255,157,0.3)",
  target: "#ff3d6b",
  targetGlow: "rgba(255,61,107,0.3)",
  trail: "#00cfff",
  trailGlow: "rgba(0,207,255,0.4)",
  collision: "#ff3d3d",
};

const MAX_CANVAS_PIXEL_RATIO = 3;

function drawGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  config: GameConfig,
  isBlind: boolean,
  collisionFlash: boolean,
) {
  const { canvasWidth: W, canvasHeight: H } = config;
  ctx.clearRect(0, 0, W, H);

  if (isBlind && !collisionFlash) {
    // Blind phase — white screen
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Draw trail on white
    if (state.trail.length > 1) {
      ctx.save();
      ctx.strokeStyle = "rgba(0,120,200,0.55)";
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      state.trail.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
      ctx.restore();
    }

    // Start indicator (faint)
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = COLORS.start;
    ctx.beginPath();
    ctx.arc(state.start.x, state.start.y, config.startRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }

  if (collisionFlash) {
    ctx.fillStyle = "rgba(255,30,30,0.18)";
    ctx.fillRect(0, 0, W, H);
  } else {
    // BG
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);
    // Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    const step = 40;
    for (let x = 0; x < W; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
  }

  // Obstacles
  for (const obs of state.obstacles) {
    // Glow
    const grd = ctx.createRadialGradient(
      obs.x + obs.width / 2,
      obs.y + obs.height / 2,
      0,
      obs.x + obs.width / 2,
      obs.y + obs.height / 2,
      Math.max(obs.width, obs.height),
    );
    grd.addColorStop(0, COLORS.obstacleGlow);
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(obs.x - 10, obs.y - 10, obs.width + 20, obs.height + 20);

    // Body
    ctx.fillStyle = COLORS.obstacle;
    ctx.strokeStyle = COLORS.obstacleBorder;
    ctx.lineWidth = 1.5;
    roundRect(ctx, obs.x, obs.y, obs.width, obs.height, 4);
    ctx.fill();
    ctx.stroke();
  }

  // Trail
  if (state.trail.length > 1) {
    ctx.save();
    ctx.shadowColor = COLORS.trailGlow;
    ctx.shadowBlur = 8;
    ctx.strokeStyle = COLORS.trail;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    state.trail.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }

  // Target
  drawCircleWithGlow(
    ctx,
    state.target.x,
    state.target.y,
    config.targetRadius,
    COLORS.target,
    COLORS.targetGlow,
  );
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("END", state.target.x, state.target.y);

  // Start
  drawCircleWithGlow(
    ctx,
    state.start.x,
    state.start.y,
    config.startRadius,
    COLORS.start,
    COLORS.startGlow,
  );
  ctx.fillStyle = "#fff";
  ctx.font = "bold 11px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("START", state.start.x, state.start.y);
}

function drawCircleWithGlow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  glow: string,
) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color + "22";
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpatialMemoryGame({
  difficulty = "medium",
  totalRounds = 3,
  playerId = "player",
  sessionId = "session",
  onGameComplete,
  onComplete,
}: SpatialMemoryGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, dispatch] = useReducer(reducer, totalRounds, initState);
  const [countdown] = useState(3);
  const [memorizeProgress, setMemorizeProgress] = useState(100);
  const [collisionFlash, setCollisionFlash] = useState(false);
  const [canvasRenderVersion, setCanvasRenderVersion] = useState(0);
  const configRef = useRef<GameConfig>(
    createDefaultConfig(700, 450, difficulty),
  );
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateRef = useRef(state);
  const gameStartTimeRef = useRef<number>(Date.now());
  stateRef.current = state;

  const config = configRef.current;

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const syncCanvasResolution = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        MAX_CANVAS_PIXEL_RATIO,
      );
      const nextWidth = Math.round(rect.width * pixelRatio);
      const nextHeight = Math.round(rect.height * pixelRatio);

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
        setCanvasRenderVersion((version) => version + 1);
      }
    };

    syncCanvasResolution();

    const resizeObserver = new ResizeObserver(syncCanvasResolution);
    resizeObserver.observe(canvas);
    window.addEventListener("resize", syncCanvasResolution);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", syncCanvasResolution);
    };
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isBlind = state.phase === "navigate";
    ctx.setTransform(
      canvas.width / config.canvasWidth,
      0,
      0,
      canvas.height / config.canvasHeight,
      0,
      0,
    );
    drawGame(ctx, state, config, isBlind, collisionFlash);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [state, config, collisionFlash, canvasRenderVersion]);

  // Phase machine
  const startRound = useCallback(() => {
    const level = generateLevel(config);
    dispatch({ type: "START_MEMORIZE", payload: level });

    let elapsed = 0;
    const interval = 50;
    const timer = setInterval(() => {
      elapsed += interval;
      setMemorizeProgress(
        Math.max(0, 100 - (elapsed / config.memorizeTime) * 100),
      );
      if (elapsed >= config.memorizeTime) {
        clearInterval(timer);
        dispatch({ type: "START_NAVIGATE" });
        // let c = 3;
        // setCountdown(c);
        // const cd = setInterval(() => {
        //   c--;
        //   setCountdown(c);
        //   if (c <= 0) {
        //     clearInterval(cd);
        //     dispatch({ type: 'START_NAVIGATE' });
        //   }
        // }, 1000);
      }
    }, interval);
    timerRef.current = timer as unknown as ReturnType<typeof setTimeout>;
  }, [config]);

  // Mouse handlers
  const getCanvasPoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      const scaleX = config.canvasWidth / rect.width;
      const scaleY = config.canvasHeight / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [config],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (stateRef.current.phase !== "navigate") return;
      const pt = getCanvasPoint(e);
      dispatch({ type: "MOUSE_DOWN", payload: pt });
    },
    [getCanvasPoint],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const s = stateRef.current;
      if (s.phase !== "navigate" || !s.isMouseDown) return;
      const pt = getCanvasPoint(e);

      // Real-time collision check for immediate feedback
      const col = checkCollision(pt, s.obstacles, config);
      if (col !== "none") {
        setCollisionFlash(true);
        setTimeout(() => setCollisionFlash(false), 200);
      }

      dispatch({ type: "MOUSE_MOVE", payload: pt });
    },
    [getCanvasPoint, config],
  );

  const handleMouseUp = useCallback(() => {
    const s = stateRef.current;
    if (s.phase !== "navigate" || !s.isMouseDown) return;
    dispatch({ type: "MOUSE_UP" });

    if (s.startTime === null) return;
    const result = evaluateAttempt(
      s.trail,
      s.target,
      s.obstacles,
      config,
      s.startTime,
    );
    dispatch({ type: "END_NAVIGATE", payload: result });
  }, [config, playerId, sessionId, onGameComplete, onComplete]);

  const roundScore = state.result ? calculateScore(state.result, config) : 0;
  const breakdown = state.result
    ? calculateBreakdown(state.result, config)
    : null;
  const accumulatedScore =
    stateRef.current.roundResults.reduce(
      (sum, r) => sum + calculateScore(r, config),
      0,
    ) + roundScore;
  const rating = getRating(accumulatedScore);

  const isLastRound = state.round >= state.totalRounds;

  return (
    <div style={styles.root}>
      <div style={styles.bgGrid} />
      {/* Header */}
      {state.phase !== "idle" && (
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.gameTitle}>SPATIAL MEMORY</span>
            <span style={styles.diffBadge}>{difficulty.toUpperCase()}</span>
          </div>
          <div style={styles.headerRight}>
            <span style={styles.roundLabel}>ROUND</span>
            <span style={styles.roundNum}>
              {state.round}/{state.totalRounds}
            </span>
            <span style={styles.scoreLabel}>SCORE</span>
            <span style={styles.scoreNum}>
              {accumulatedScore.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Canvas area */}
      <div style={styles.canvasWrapper}>
        <canvas
          ref={canvasRef}
          width={config.canvasWidth}
          height={config.canvasHeight}
          style={styles.canvas}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />

        {/* Phase overlays */}
        {state.phase === "idle" && (
          <div style={styles.overlay}>
            <div style={styles.overlayCard}>
              <div style={styles.overlayIcon}>◎</div>
              <h2 style={styles.overlayTitle}>SPATIAL MEMORY TEST</h2>
              <p style={styles.overlayDesc}>
                จำตำแหน่ง <span style={{ color: "#00ff9d" }}>จุดเริ่มต้น</span>{" "}
                <span style={{ color: "#ff3d6b" }}>เป้าหมาย</span> และ{" "}
                <span style={{ color: "#6677ff" }}>สิ่งกีดขวาง</span>
                <br />
                จากนั้นนำเคอร์เซอร์ไปยังเป้าหมาย
                <br />
              </p>
              <button style={styles.btnPrimary} onClick={startRound}>
                {state.round === 0 ? "Start" : "Next Round"}
              </button>
            </div>
          </div>
        )}

        {state.phase === "memorize" && (
          <div style={styles.memorizeBar}>
            <span style={styles.memorizeLabel}>⚡ จำให้แม่น...</span>
            <div style={styles.progressTrack}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${memorizeProgress}%`,
                }}
              />
            </div>
          </div>
        )}

        {state.phase === "countdown" && (
          <div style={styles.overlay}>
            <div style={styles.countdownNum}>
              {countdown === 0 ? "GO!" : countdown}
            </div>
          </div>
        )}

        {state.phase === "navigate" && (
          <div style={styles.navigateBadge}>
            {state.isMouseDown ? "● กำลังนำทาง..." : "🖱 กด + ลาก เพื่อนำทาง"}
          </div>
        )}

        {state.phase === "result" && state.result && breakdown && (
          <div style={styles.overlay}>
            <div style={styles.resultCard}>
              <div
                style={{
                  ...styles.resultStatus,
                  color: state.result.success ? "#00ff9d" : "#ff3d6b",
                }}
              >
                {state.result.success ? "✓ SUCCESS" : "✗ FAILED"}
              </div>
              {!state.result.success && (
                <div style={styles.failReason}>
                  {state.result.collisionType === "obstacle"
                    ? "ชนสิ่งกีดขวาง"
                    : state.result.collisionType === "out_of_bounds"
                      ? "ออกนอกพื้นที่"
                      : "ไม่ถึงเป้าหมาย"}
                </div>
              )}

              {state.result.success && (
                <div style={styles.breakdown}>
                  <Meter
                    label="ACCURACY"
                    value={breakdown.accuracy}
                    color="#00ff9d"
                  />
                  <Meter
                    label="PATH EFF."
                    value={breakdown.pathEfficiency}
                    color="#00cfff"
                  />
                  <Meter
                    label="SPEED"
                    value={breakdown.speed}
                    color="#ffa94d"
                  />
                </div>
              )}

              <div style={styles.roundScore}>
                +{roundScore.toLocaleString()} pts
              </div>

              <button
                style={styles.btnPrimary}
                onClick={() => {
                  if (isLastRound) {
                    const allResults = stateRef.current.roundResults;
                    const totalScore = allResults.reduce(
                      (sum, r) => sum + calculateScore(r, config),
                      0,
                    );

                    const gameResult = {
                      gameId: "spatial-memory",
                      gameName: "Spatial Memory Test",
                      playerId,
                      sessionId,
                      score: totalScore,
                      accuracy:
                        (allResults.filter((r) => r.success).length /
                          allResults.length) *
                        100,
                      reactionTimeMs: allResults[0]?.timeTaken ?? 0,
                      responseTimesMs: allResults.map((r) => r.timeTaken),
                      startedAt: new Date(
                        gameStartTimeRef.current,
                      ).toISOString(),
                      endedAt: new Date().toISOString(),
                      durationMs: Date.now() - gameStartTimeRef.current,
                      rawData: {
                        roundCount: allResults.length,
                        successCount: allResults.filter((r) => r.success)
                          .length,
                        difficulty,
                        rounds: allResults.map((r, i) => ({
                          round: i + 1,
                          success: r.success,
                          timeTaken: r.timeTaken,
                          score: calculateScore(r, config),
                        })),
                      },
                    };

                    // ส่งผลลัพธ์กลับไปให้ระบบหลัก
                    if (onGameComplete) onGameComplete(gameResult);
                    if (onComplete) onComplete(allResults);
                  } else {
                    dispatch({ type: "NEXT_ROUND" });
                    setTimeout(startRound, 100);
                  }
                }}
              >
                {isLastRound ? "🏆 สรุปผลและกลับเมนูหลัก" : "รอบถัดไป →"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer rating */}
      <div style={styles.footer}>
        <span
          style={{ color: rating.color, fontWeight: 700, letterSpacing: 2 }}
        >
          ◆ {rating.label}
        </span>
        <span style={styles.footerHint}>
          {state.phase === "navigate"
            ? "หน้าจอขาว — ใช้ความจำในการนำทาง"
            : state.phase === "memorize"
              ? "จำตำแหน่งทุกอย่างให้แม่น"
              : "Spatial Memory Benchmark v1.0"}
        </span>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Meter({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div style={styles.meter}>
      <span style={styles.meterLabel}>{label}</span>
      <div style={styles.meterTrack}>
        <div
          style={{ ...styles.meterFill, width: `${value}%`, background: color }}
        />
      </div>
      <span style={{ ...styles.meterVal, color }}>{value}</span>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  root: {
    width: "100vw",
    height: "100vh",
    background: "#030508",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: '"Rajdhani", "Sarabun", sans-serif',
    position: "relative",
    color: "#e0e4f0",
    userSelect: "none",
  },
  bgGrid: {
    position: "absolute",
    inset: 0,
    pointerEvents: "none",
    backgroundImage:
      "linear-gradient(rgba(0,255,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,170,0.03) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  },
  header: {
    width: "100%",
    height: 64,
    display: "flex",
    alignItems: "center",
    padding: "0 20px",
    gap: 16,
    borderBottom: "1px solid rgba(0,255,170,0.08)",
    boxSizing: "border-box",
    position: "relative",
    zIndex: 10,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    minWidth: 240,
  },
  headerRight: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  gameTitle: {
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: 3,
    color: "#fff",
    textTransform: "uppercase",
  },
  diffBadge: {
    fontSize: 10,
    padding: "4px 8px",
    borderRadius: 3,
    border: "1px solid rgba(0,204,255,0.25)",
    background: "rgba(0,204,255,0.08)",
    color: "#00ccff",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  roundLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  roundNum: {
    fontSize: 24,
    fontWeight: 900,
    color: "#00ccff",
    marginRight: 20,
    fontFamily: '"Rajdhani", monospace',
    lineHeight: 1,
  },
  scoreLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  scoreNum: {
    fontSize: 24,
    fontWeight: 900,
    color: "#00ffaa",
    fontFamily: '"Rajdhani", monospace',
    lineHeight: 1,
  },

  canvasWrapper: {
    flex: "0 1 auto",
    position: "relative",
    margin: "0 auto 16px",
    width: "min(calc(100vw - 32px), calc((100vh - 96px) * 1.5556))",
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "calc(100vh - 96px)",
    aspectRatio: "700 / 450",
    minHeight: 0,
    borderRadius: 4,
    overflow: "hidden",
    border: "1px solid rgba(0,255,170,0.16)",
    background: "rgba(0,0,0,0.4)",
    boxSizing: "border-box",
    transition: "border-color 0.3s",
    zIndex: 1,
  },
  canvas: {
    display: "block",
    width: "100%",
    height: "100%",
    background: "#0a0c14",
    cursor: "crosshair",
  },

  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(3,5,8,0.72)",
    backdropFilter: "blur(2px)",
  },
  overlayCard: {
    textAlign: "center",
    padding: "40px 24px",
    background: "transparent",
    border: "none",
    borderRadius: 0,
    maxWidth: 640,
  },
  overlayIcon: { fontSize: 48, color: "#00ccff", marginBottom: 12 },
  overlayTitle: {
    fontSize: "clamp(34px, 6vw, 58px)",
    fontWeight: 900,
    letterSpacing: 6,
    color: "#fff",
    margin: "0 0 18px",
    textTransform: "uppercase",
  },
  overlayDesc: {
    fontSize: 16,
    color: "rgba(255,255,255,0.62)",
    lineHeight: 1.7,
    margin: "0 0 28px",
  },

  memorizeBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "8px 16px",
    background: "rgba(3,5,8,0.75)",
    display: "flex",
    alignItems: "center",
    gap: 12,
    borderTop: "1px solid rgba(0,255,170,0.08)",
  },
  memorizeLabel: {
    fontSize: 11,
    color: "#00ffaa",
    letterSpacing: 2,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  progressTrack: {
    flex: 1,
    height: 6,
    background: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
    background: "#00ffaa",
    transition: "width 0.05s linear",
  },

  countdownNum: {
    fontSize: 96,
    fontWeight: 900,
    color: "#fff",
    letterSpacing: 0,
    textShadow: "0 0 40px rgba(0,204,255,0.55)",
    fontFamily: '"Rajdhani", monospace',
  },

  navigateBadge: {
    position: "absolute",
    bottom: 12,
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: 12,
    color: "rgba(255,255,255,0.65)",
    background: "rgba(3,5,8,0.72)",
    border: "1px solid rgba(0,255,170,0.12)",
    padding: "7px 14px",
    borderRadius: 3,
    letterSpacing: 2,
    textTransform: "uppercase",
  },

  resultCard: {
    textAlign: "center",
    padding: "32px 44px",
    background: "rgba(3,5,8,0.94)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 4,
    minWidth: 300,
    boxShadow: "0 0 30px rgba(0,255,170,0.08)",
  },
  resultStatus: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: 4,
    marginBottom: 6,
  },
  failReason: {
    fontSize: 12,
    color: "#ff3d6b",
    marginBottom: 16,
    opacity: 0.8,
  },
  breakdown: {
    margin: "16px 0",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  roundScore: {
    fontSize: 32,
    fontWeight: 900,
    color: "#00cfff",
    marginBottom: 20,
    letterSpacing: 1,
  },

  meter: { display: "flex", alignItems: "center", gap: 8 },
  meterLabel: {
    fontSize: 10,
    color: "#555",
    width: 70,
    textAlign: "right",
    letterSpacing: 1,
  },
  meterTrack: {
    flex: 1,
    height: 5,
    background: "rgba(255,255,255,0.07)",
    borderRadius: 3,
  },
  meterFill: { height: "100%", borderRadius: 3, transition: "width 0.4s ease" },
  meterVal: { fontSize: 12, fontWeight: 700, width: 30, textAlign: "left" },

  btnPrimary: {
    padding: "13px 32px",
    background: "rgba(0,255,170,0.1)",
    color: "#00ffaa",
    border: "1px solid rgba(0,255,170,0.45)",
    borderRadius: 3,
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: 3,
    cursor: "pointer",
    transition: "all 0.2s",
    fontFamily: '"Rajdhani", "Sarabun", sans-serif',
    textTransform: "uppercase",
  },

  footer: {
    display: "none",
  },
  footerHint: { color: "rgba(255,255,255,0.28)" },
};

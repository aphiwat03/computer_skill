import {
  useRef,
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import { useGame } from "./logic";
import { LEVELS } from "./types";
import type { GameResult, GamePhase, LevelConfig, Shot } from "./types";

// ==================== Types & Interfaces ====================

/** Visual effect shown when player clicks (hit or miss) */
interface ShotEffect {
  id: number;
  x: number; // Position X (0-100 percentage)
  y: number; // Position Y (0-100 percentage)
  hit: boolean; // true = hit (green), false = miss (red)
}

/** Props for MenuScreen component */
interface MenuScreenProps {
  onStart: (level: number) => void;
}

/** Props for HUD (heads-up display) component */
interface HUDProps {
  phase: GamePhase;
  level: number;
  score: number;
  timeLeft: number;
  totalTime: number;
}

/** Props for game over screen component */
interface GameOverScreenProps {
  accuracy: number;
  avgReaction: number;
  avgSwitch: number;
  currentLevel: number;
  onMenu: () => void;
  cleared: boolean;
}

/** Props for level result screen component */
interface ResultScreenProps {
  level: number;
  config: LevelConfig;
  shots: Shot[];
  hitCount: number;
  avgReaction: number;
  avgSwitch: number;
  isLastLevel: boolean;
  onNext: () => void;
  onMenu: () => void;
}

/** Props for game canvas (main game area) component */
interface GameCanvasProps {
  playerId: string;
  sessionId: string;
  onGameComplete: (result: GameResult) => void;
}

// ==================== Audio Effect Function ====================
let sharedAudioCtx: AudioContext | null = null;
/**
 * Plays a beep sound to provide audio feedback for hits and misses
 * - Hit: High pitch (880Hz) sine wave - 100ms
 * - Miss: Low pitch (150Hz) sawtooth wave - 200ms
 *
 * @param isHit - true for hit sound, false for miss sound
 */
const playBeep = (isHit: boolean) => {
  // 2. ตรวจสอบและสร้าง Context แค่ครั้งเดียว
  if (!sharedAudioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    sharedAudioCtx = new AudioContextClass();
  }

  // 3. ปลุก Context ให้ตื่น (บางเบราว์เซอร์จะสั่งพักไว้ถ้าไม่มีการใช้งาน)
  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume();
  }

  // 4. ส่วนการสร้างเสียง (Oscillator) ใช้ sharedAudioCtx แทน
  const oscillator = sharedAudioCtx.createOscillator();
  const gainNode = sharedAudioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(sharedAudioCtx.destination);

  if (isHit) {
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, sharedAudioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, sharedAudioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      sharedAudioCtx.currentTime + 0.1,
    );
    oscillator.start(sharedAudioCtx.currentTime);
    oscillator.stop(sharedAudioCtx.currentTime + 0.1);
  } else {
    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(150, sharedAudioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.05, sharedAudioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      sharedAudioCtx.currentTime + 0.2,
    );
    oscillator.start(sharedAudioCtx.currentTime);
    oscillator.stop(sharedAudioCtx.currentTime + 0.2);
  }
};

// ==================== MenuScreen Component ====================

/**
 * Main menu screen displayed at game start
 * Shows game title and instructions, with click to start functionality
 */
function MenuScreen({ onStart }: MenuScreenProps) {
  // Define all inline styles for the menu
  const styles: Record<string, CSSProperties> = {
    menu: {
      width: "100vw",
      height: "100vh",
      background: "#030508",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      fontFamily: '"Rajdhani", "Sarabun", sans-serif',
      position: "relative",
    },
    bgGrid: {
      position: "absolute",
      inset: 0,
      backgroundImage:
        "linear-gradient(rgba(0,255,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,170,0.03) 1px, transparent 1px)",
      backgroundSize: "40px 40px",
    },
    bgLines: {
      position: "absolute",
      inset: 0,
      background:
        "radial-gradient(ellipse at 50% 40%, rgba(0,180,255,0.06) 0%, transparent 70%)",
    },
    menuInner: {
      position: "relative",
      zIndex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 36,
      padding: 40,
      maxWidth: 700,
      width: "100%",
    },
    logoWrap: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
    },
    logoIcon: {
      fontSize: 48,
      color: "#ff4444",
      textShadow: "0 0 30px rgba(255,68,68,0.5)",
      animation: "spinSlow 8s linear infinite",
    },
    title: {
      fontSize: "clamp(48px, 8vw, 80px)",
      fontWeight: 900,
      letterSpacing: 8,
      color: "#fff",
      margin: 0,
      lineHeight: 1,
      textTransform: "uppercase",
      whiteSpace: "nowrap",
    },
    titleAccent: { color: "#ff4444" },
    startBtn: {
      position: "relative",
      background: "rgba(255,68,68,0.08)",
      border: "2px solid rgba(255,68,68,0.4)",
      borderRadius: 4,
      padding: "32px 60px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 12,
      cursor: "pointer",
      transition: "all 0.3s",
      overflow: "hidden",
      minWidth: 200,
    },
    startText: {
      fontSize: 32,
      fontWeight: 900,
      color: "#ff4444",
      letterSpacing: 3,
      fontFamily: '"Rajdhani", monospace',
      textTransform: "uppercase",
    },
    startSubtext: {
      fontSize: 14,
      color: "rgba(255,255,255,0.5)",
      letterSpacing: 3,
    },
  };

  return (
    <div
      style={{ ...styles.menu, cursor: "pointer" }}
      onClick={() => onStart(1)}
      onKeyDown={() => onStart(1)}
      tabIndex={0}
    >
      <style>{`
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        div:focus { outline: none; }
      `}</style>
      <div style={styles.bgGrid} />
      <div style={styles.bgLines} />
      <div style={styles.menuInner}>
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>◎</div>
          <h1 style={styles.title}>REACTION TIME TEST</h1>
          <p
            style={{
              fontSize: 20,
              color: "rgba(255, 255, 255, 0.6)",
              letterSpacing: 1,
              marginTop: 20,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            When the target shows a red light, click it as quickly as possible.
            <br />
            Press any button to test.
          </p>
        </div>
      </div>
    </div>
  );
}

// ==================== HUD Component ====================

/**
 * Heads-up display showing current level and remaining time during gameplay
 * - Level indicator on the left
 * - Countdown timer with visual bar on the right
 * - Timer color changes based on urgency (green > yellow > red)
 */
function HUD({ phase, level, timeLeft, totalTime }: HUDProps) {
  const pct = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const timeColor = pct > 50 ? "#00ffaa" : pct > 25 ? "#ffaa00" : "#ff4444";
  const secs = (timeLeft / 1000).toFixed(1);

  const s: Record<string, CSSProperties> = {
    hud: {
      height: 64,
      display: "flex",
      alignItems: "center",
      padding: "0 20px",
      gap: 16,
      borderBottom: "1px solid rgba(0,255,170,0.08)",
      position: "relative",
      zIndex: 10,
    },
    hudCenter: {
      flex: 1,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    },
    hudBlock: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
    hudLabel: {
      fontSize: 10,
      letterSpacing: 2,
      textTransform: "uppercase",
      color: "rgba(255,255,255,0.35)",
      fontWeight: 600,
    },
    hudSublabel: {
      fontSize: 10,
      color: "rgba(255,255,255,0.25)",
      marginTop: 1,
    },
    hudValue: {
      fontSize: 24,
      fontWeight: 900,
      lineHeight: 1.1,
      fontFamily: '"Rajdhani", monospace',
    },
    timerWrap: {
      display: "flex",
      alignItems: "center",
      gap: 12,
      width: "100%",
      maxWidth: 400,
    },
    timerBarBg: {
      flex: 1,
      height: 6,
      background: "rgba(255,255,255,0.08)",
      borderRadius: 3,
      overflow: "hidden",
    },
    timerBar: {
      height: "100%",
      borderRadius: 3,
      transition: "width 0.1s linear, background 0.5s",
      background: timeColor,
      width: `${pct}%`,
    },
    timerVal: {
      fontSize: 20,
      fontWeight: 900,
      minWidth: 52,
      textAlign: "right",
      fontFamily: '"Rajdhani", monospace',
      letterSpacing: 1,
      color: timeColor,
    },
    phaseStatus: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: 3,
      textTransform: "uppercase",
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      animation: "blink 0.8s ease infinite",
    },
  };

  return (
    <div style={s.hud}>
      <style>{`
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
      `}</style>

      <div style={s.hudCenter}>
        <div
          style={{
            display: "flex",
            gap: 20,
            paddingRight: 20,
            alignItems: "center",
          }}
        >
          <div style={s.hudBlock}>
            <div style={s.hudLabel}>Level</div>
            <div style={{ ...s.hudValue, color: "#00ccff" }}>{level}</div>
          </div>
        </div>
        {/* Show timer during shooting phase */}
        {phase === "shooting" && (
          <div style={s.timerWrap}>
            <div style={s.timerBarBg}>
              <div style={s.timerBar} />
            </div>
            <div style={s.timerVal}>{secs}s</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== GameOverScreen Component ====================

/**
 * Displays game end screen with final statistics
 * Shows summary of performance including score, hits, misses, center hits, and early clicks
 * Different message and icon if all levels cleared vs game ended early
 */
function GameOverScreen({
  accuracy,
  avgReaction,
  avgSwitch,
  onMenu,
}: GameOverScreenProps) {
  // Define styles for game over screen
  const s: Record<string, CSSProperties> = {
    wrap: {
      width: "100vw",
      height: "100vh",
      background: "#030508",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: '"Rajdhani", "Sarabun", sans-serif',
      position: "relative",
    },
    bgGrid: {
      position: "absolute",
      inset: 0,
      backgroundImage:
        "linear-gradient(rgba(255,68,68,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,68,68,0.02) 1px, transparent 1px)",
      backgroundSize: "40px 40px",
    },
    content: {
      position: "relative",
      zIndex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 24,
      padding: 40,
    },
    bigIcon: { fontSize: 72, animation: "bounce 1s ease infinite alternate" },
    title: {
      fontSize: "clamp(36px, 7vw, 64px)",
      fontWeight: 900,
      letterSpacing: 6,
      color: "#ff4444",
      textShadow: "0 0 30px rgba(255,68,68,0.4)",
      margin: 0,
      textTransform: "uppercase",
    },
    clearedSub: {
      color: "#ffcc00",
      fontSize: 18,
      letterSpacing: 3,
      textTransform: "uppercase",
    },
    stats: {
      display: "flex",
      gap: 32,
      flexWrap: "wrap",
      justifyContent: "center",
    },
    stat: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 4,
      padding: "16px 24px",
    },
    slabel: {
      fontSize: 11,
      color: "rgba(255,255,255,0.35)",
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    sval: {
      fontSize: 36,
      fontWeight: 900,
      color: "#fff",
      fontFamily: '"Rajdhani", monospace',
    },
    btns: { display: "flex", gap: 12 },
    btnBase: {
      padding: "13px 32px",
      fontFamily: '"Rajdhani", "Sarabun", sans-serif',
      fontSize: 16,
      fontWeight: 700,
      letterSpacing: 2,
      textTransform: "uppercase",
      borderRadius: 3,
      cursor: "pointer",
      transition: "all 0.2s",
      border: "1px solid",
    },
  };

  return (
    <div style={s.wrap}>
      <style>{`
    @keyframes bounce { to { transform: translateY(-8px); } }
  `}</style>
      <div style={s.bgGrid} />
      <div style={s.content}>
        <div style={s.bigIcon}>🏆</div>
        <h1 style={s.title}>All Stages Cleared!</h1>

        {/* กล่องสถิติใหม่ 3 ค่า */}
        <div style={s.stats}>
          <div style={s.stat}>
            <span style={s.slabel}>OVERALL ACCURACY</span>
            <span style={{ ...s.sval, color: "#eeecec" }}>{accuracy}%</span>
          </div>
          <div style={s.stat}>
            <span style={s.slabel}>AVG SWITCH (FLICK)</span>
            <span style={{ ...s.sval, color: "#00ccff" }}>
              {avgSwitch > 0 ? `${avgSwitch}ms` : "0 ms"}
            </span>
          </div>
          <div style={s.stat}>
            <span style={s.slabel}>AVG REACTION</span>
            <span style={{ ...s.sval, color: "#ffcc00" }}>
              {avgReaction > 0 ? `${avgReaction}ms` : "0 ms"}
            </span>
          </div>
        </div>

        <div style={s.btns}>
          <button
            style={{
              ...s.btnBase,
              background: "transparent",
              borderColor: "rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.45)",
            }}
            onClick={onMenu}
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== ResultScreen Component ====================

/**
 * Displays detailed performance metrics for the completed level
 * Shows accuracy, average reaction time, switch time, and fastest reaction
 * Provides option to proceed to next level or return to menu
 */
function ResultScreen({
  level,
  shots,
  hitCount,
  avgReaction,
  avgSwitch,
  isLastLevel,
  onNext,
  onMenu,
}: ResultScreenProps) {
  // Calculate accuracy percentage
  const accuracy =
    shots.length > 0 ? Math.round((hitCount / shots.length) * 100) : 0;
  // Find best (fastest) reaction time among successful hits
  const hitShots = shots.filter((s) => s.hit);
  const bestTime =
    hitShots.length > 0
      ? Math.min(...hitShots.map((s) => s.reactionTime || 9999))
      : 0;

  // Calculate SD
  const reactionTimes = hitShots
    .map((s) => s.reactionTime || 0)
    .filter((t) => t > 0);
  const avg =
    reactionTimes.length > 0
      ? reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length
      : 0;
  const variance =
    reactionTimes.length > 0
      ? reactionTimes.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
        reactionTimes.length
      : 0;
  const sd = Math.sqrt(variance);

  const s: Record<string, CSSProperties> = {
    wrap: {
      width: "100vw",
      height: "100vh",
      background: "#030508",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: '"Rajdhani", "Sarabun", sans-serif',
      position: "relative",
      overflowY: "auto",
    },
    bgGrid: {
      position: "fixed",
      inset: 0,
      backgroundImage:
        "linear-gradient(rgba(0,255,170,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,170,0.025) 1px, transparent 1px)",
      backgroundSize: "40px 40px",
    },
    inner: {
      position: "relative",
      zIndex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 32,
      padding: "40px 20px",
      maxWidth: 700,
      width: "100%",
    },
    badge: {
      color: "rgba(255,255,255,0.4)",
      fontSize: 14,
      letterSpacing: 4,
      textTransform: "uppercase",
      border: "1px solid rgba(255,255,255,0.1)",
      padding: "8px 20px",
      borderRadius: 2,
    },
    title: {
      fontSize: 32,
      fontWeight: 900,
      letterSpacing: 6,
      textTransform: "uppercase",
      color: "#fff",
      margin: 0,
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 16,
      width: "100%",
    },
    statCard: {
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 4,
      padding: "24px 16px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
    },
    statVal: {
      fontSize: 36,
      fontWeight: 900,
      fontFamily: '"Rajdhani", monospace',
      letterSpacing: 2,
    },
    statLabel: {
      fontSize: 12,
      color: "rgba(255,255,255,0.4)",
      letterSpacing: 3,
      textTransform: "uppercase",
    },
    actions: {
      display: "flex",
      gap: 16,
      flexWrap: "wrap",
      justifyContent: "center",
      marginTop: 20,
    },
    btn: {
      padding: "14px 36px",
      fontFamily: '"Rajdhani", "Sarabun", sans-serif',
      fontSize: 15,
      fontWeight: 700,
      letterSpacing: 3,
      textTransform: "uppercase",
      borderRadius: 3,
      cursor: "pointer",
      transition: "all 0.2s",
      border: "1px solid",
    },
  };

  return (
    <div style={s.wrap}>
      <div style={s.bgGrid} />
      <div style={s.inner}>
        <h2 style={s.title}>PERFORMANCE METRICS</h2>

        <div style={s.statsGrid}>
          {[
            {
              icon: "📊",
              val: `${accuracy}%`,
              label: "ACCURACY",
              color: "#fff",
            },
            {
              icon: "🔁",
              val: avgSwitch > 0 ? `${avgSwitch}ms` : "—",
              label: "AVG SWITCH (FLICK)",
              color: "#00ccff",
            },
            {
              icon: sd > 150 ? "⚠️" : "🎯",
              val: sd > 150 ? "UNSTABLE" : "STABLE",
              label: `STABILITY `,
              color: sd > 150 ? "#ff3d6b" : "#00ffaa",
            },
            {
              icon: "⚡",
              val: avgReaction > 0 ? `${avgReaction}ms` : "—",
              label: "AVG REACTION",
              color: "#ffcc00",
              highlight: true,
            },
          ].map((item: any, i) => (
            <div
              key={i}
              style={{
                ...s.statCard,
                ...(item.highlight
                  ? {
                      background: "rgba(255,204,0,0.05)",
                      border: "1px solid rgba(255,204,0,0.3)",
                      boxShadow: "0 0 20px rgba(255,204,0,0.1)",
                    }
                  : {}),
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 4 }}>{item.icon}</div>
              <div style={{ ...s.statVal, color: item.color || "#fff" }}>
                {item.val}
              </div>
              <div style={s.statLabel}>{item.label}</div>
            </div>
          ))}
        </div>

        <div style={s.actions}>
          <button
            style={{
              ...s.btn,
              background: "rgba(255,68,68,0.15)",
              borderColor: "rgba(255,68,68,0.5)",
              color: "#ff6666",
            }}
            onClick={onNext}
          >
            {isLastLevel ? "VIEW FINAL RESULTS →" : "NEXT STAGE →"}
          </button>
          <button
            style={{
              ...s.btn,
              background: "transparent",
              borderColor: "rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.45)",
            }}
            onClick={onMenu}
          >
            MAIN MENU
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== GameCanvas Component ====================

/**
 * Main game component that renders the game arena and handles gameplay
 * Manages shot effects, target rendering, and game state transitions
 * Routes between menu, shooting, result, and gameover screens
 */
function GameCanvas(props: GameCanvasProps) {
  // Get all game functions and state from the useGame hook
  const {
    state,
    getLevelConfig,
    startLevel,
    handleShoot,
    nextLevel,
    submitAndExit,
  } = useGame(props.playerId, props.sessionId, props.onGameComplete);
  const arenaRef = useRef<HTMLDivElement>(null);

  // Track temporary shot effects (hit/miss animations)
  const [shotEffects, setShotEffects] = useState<ShotEffect[]>([]);
  const effectIdRef = useRef(0);

  /**
   * Handles click events on the game arena
   * Calculates click coordinates, creates visual effect, plays sound, and processes shot
   */
  const onArenaClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (state.phase !== "shooting") return;
      const rect = arenaRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Convert click position to percentage-based coordinates (0-100)
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const clickPxX = e.clientX - rect.left;
      const clickPxY = e.clientY - rect.top;
      const id = ++effectIdRef.current;

      // Check if click hit any target
      const clickedTarget = state.targets.find((t) => {
        const targetPxX = (t.x / 100) * rect.width;
        const targetPxY = (t.y / 100) * rect.height;

        const dx = targetPxX - clickPxX;
        const dy = targetPxY - clickPxY;
        return Math.sqrt(dx * dx + dy * dy) <= 32;
      });

      // Determine if shot was a hit
      let hit = false;
      if (clickedTarget && clickedTarget.id === state.activeTargetId) {
        hit = true;
      }
      playBeep(hit);

      // Add shot effect animation (will auto-remove after 600ms)
      setShotEffects((prev) => [...prev, { id, x, y, hit }]);
      setTimeout(
        () => setShotEffects((prev) => prev.filter((e) => e.id !== id)),
        400,
      );

      const arenaSize = {
        width: rect.width,
        height: rect.height,
      };
      handleShoot(x, y, arenaSize);
    },
    [state.phase, state.targets, state.activeTargetId, handleShoot],
  );

  const config = getLevelConfig(state.currentLevel);
  const isShooting = state.phase === "shooting";
  const showTargets =
    isShooting && state.targets.some((t) => t.isActive || t.isHit);

  /**
   * Update cursor style based on game phase
   * Show crosshair during shooting, normal cursor otherwise
   */
  useEffect(() => {
    document.body.style.cursor = isShooting ? "crosshair" : "default";
    return () => {
      document.body.style.cursor = "default";
    };
  }, [isShooting]);

  // Route to different screen based on game phase
  if (state.phase === "menu") return <MenuScreen onStart={startLevel} />;

  if (state.phase === "gameover") {
    const finalAccuracy = state.finalStats?.accuracy || 0;
    const finalReaction = state.finalStats?.avgReaction || 0;
    const finalSwitch = state.finalStats?.avgSwitch || 0;
    return (
      <GameOverScreen
        accuracy={finalAccuracy}
        avgReaction={finalReaction}
        avgSwitch={finalSwitch}
        currentLevel={state.currentLevel}
        onMenu={submitAndExit}
        cleared={state.levelComplete}
      />
    );
  }

  // Calculate statistics for result screen
  if (state.phase === "result") {
    const hits = state.shots.filter((s) => s.hit);
    const switchTimes = hits
      .map((s) => s.switchTime)
      .filter((time): time is number => typeof time === "number");
    const avgReaction =
      hits.length > 0
        ? Math.round(
            hits.reduce((a, s) => a + (s.reactionTime || 0), 0) / hits.length,
          )
        : 0;
    const avgSwitch =
      switchTimes.length > 0
        ? Math.round(
            switchTimes.reduce((a, time) => a + time, 0) / switchTimes.length,
          )
        : 0;
    const isLastLevel = state.currentLevel >= LEVELS.length;
    return (
      <ResultScreen
        level={state.currentLevel}
        config={config}
        shots={state.shots}
        hitCount={state.hitCount}
        avgReaction={avgReaction}
        avgSwitch={avgSwitch}
        isLastLevel={isLastLevel}
        onNext={nextLevel}
        onMenu={submitAndExit}
      />
    );
  }

  // Main game arena during shooting phase
  const containerStyle: CSSProperties = {
    width: "100vw",
    height: "100vh",
    background: "#030508",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    fontFamily: '"Rajdhani", "Sarabun", sans-serif',
    position: "relative",
  };

  const arenaStyle: CSSProperties = {
    flex: 1,
    position: "relative",
    margin: "0 16px 16px",
    border: `1px solid ${isShooting ? "rgba(0,255,170,0.25)" : "rgba(0,255,170,0.1)"}`,
    borderRadius: 4,
    background: "rgba(0,0,0,0.4)",
    overflow: "hidden",
    transition: "border-color 0.3s",
    userSelect: "none",
    cursor: isShooting ? "crosshair" : "default",
  };

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes pulseRing { 0% { transform: scale(1); opacity:0.8; } 100% { transform: scale(1.7); opacity:0; } }
        @keyframes shotAnim { 0% { transform: translate(-50%,-50%) scale(0.5); opacity:1; } 100% { transform: translate(-50%,-50%) scale(2.5); opacity:0; } }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
        @keyframes fadeInOut { from { opacity:0; transform: translate(-50%,-60%); } to { opacity:1; transform: translate(-50%,-50%); } }
      `}</style>

      {/* BG grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(0,255,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,170,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* HUD */}
      {isShooting && (
        <HUD
          phase={state.phase}
          level={state.currentLevel}
          score={state.score}
          timeLeft={state.shootingTimeLeft}
          totalTime={config.shootingTime}
        />
      )}

      {/* Arena */}
      <div ref={arenaRef} onClick={onArenaClick} style={arenaStyle}>
        {/* Waiting signal */}
        {isShooting && state.activeTargetId === null && !showTargets && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
              zIndex: 5,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                color: "rgba(255,255,255,0.55)",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: 3,
                textTransform: "uppercase",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  background: "rgba(0,255,170,0.7)",
                  borderRadius: "50%",
                  animation: "blink 1s ease infinite",
                }}
              />
              <span>Waiting for signal...</span>
            </div>
          </div>
        )}
        {/* Targets */}
        {showTargets &&
          state.targets.map((target) => {
            const isActive = target.isActive;
            const isHit = target.isHit;

            const ringOuterColor = isActive
              ? "rgba(255,80,80,0.7)"
              : isHit
                ? "rgba(0,255,100,0.3)"
                : "rgba(255,255,255,0.15)";
            const ringMidColor = isActive
              ? "rgba(255,80,80,0.85)"
              : isHit
                ? "rgba(0,255,100,0.4)"
                : "rgba(255,255,255,0.2)";
            const ringInnerColor = isActive
              ? "#ff5050"
              : isHit
                ? "rgba(0,255,100,0.5)"
                : "rgba(255,255,255,0.3)";
            const centerBg = isActive
              ? "#ff5050"
              : isHit
                ? "rgba(0,255,100,0.6)"
                : "rgba(255,255,255,0.4)";

            return (
              <div
                key={target.id}
                style={{
                  position: "absolute",
                  width: 64,
                  height: 64,
                  left: `${target.x}%`,
                  top: `${target.y}%`,
                  transform: "translate(-50%,-50%)",
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {/* Rings */}
                  {[
                    { size: 60, color: ringOuterColor },
                    { size: 40, color: ringMidColor },
                    { size: 22, color: ringInnerColor },
                  ].map((ring, i) => (
                    <div
                      key={i}
                      style={{
                        position: "absolute",
                        width: ring.size,
                        height: ring.size,
                        borderRadius: "50%",
                        border: `2px solid ${ring.color}`,
                      }}
                    />
                  ))}
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      background: centerBg,
                      borderRadius: "50%",
                      ...(isActive ? { boxShadow: "0 0 10px #ff5050" } : {}),
                    }}
                  />
                  {isActive && (
                    <div
                      style={{
                        position: "absolute",
                        width: 64,
                        height: 64,
                        borderRadius: "50%",
                        border: "2px solid rgba(255,80,80,0.6)",
                        animation: "pulseRing 0.7s ease-out infinite",
                      }}
                    />
                  )}
                  {isHit && (
                    <div
                      style={{
                        position: "absolute",
                        fontSize: 20,
                        color: "#00ff64",
                        fontWeight: 900,
                        textShadow: "0 0 10px #00ff64",
                        zIndex: 2,
                      }}
                    >
                      ✓
                    </div>
                  )}
                </div>
              </div>
            );
          })}

        {/* Shot effects */}
        {shotEffects.map((effect) => (
          <div
            key={effect.id}
            style={{
              position: "absolute",
              width: 20,
              height: 20,
              borderRadius: "50%",
              pointerEvents: "none",
              left: `${effect.x}%`,
              top: `${effect.y}%`,
              transform: "translate(-50%,-50%)",
              animation: "shotAnim 0.5s ease-out forwards",
              zIndex: 20,
              background: effect.hit
                ? "radial-gradient(circle, rgba(0,255,100,0.9), rgba(0,255,100,0))"
                : "radial-gradient(circle, rgba(255,80,80,0.9), rgba(255,80,80,0))",
              boxShadow: effect.hit
                ? "0 0 20px rgba(0,255,100,0.8)"
                : "0 0 15px rgba(255,80,80,0.6)",
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ==================== Main Component ====================

/**
 * Main export component for the Target Ghost Game
 * Wrapper that passes props to GameCanvas
 */
export default function TargetGhostGame(props: GameCanvasProps) {
  return <GameCanvas {...props} />;
}

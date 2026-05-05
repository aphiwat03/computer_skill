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

interface ShotEffect {
  id: number;
  x: number;
  y: number;
  hit: boolean;
}

interface MenuScreenProps {
  onStart: (level: number) => void;
}

interface HUDProps {
  phase: GamePhase;
  level: number;
  score: number;
  timeLeft: number;
  totalTime: number;
}

interface GameOverScreenProps {
  score: number;
  hitCount: number;
  missCount: number;
  centerHitCount: number;
  earlyClickCount: number;
  currentLevel: number;
  onMenu: () => void;
  cleared: boolean;
}

interface ResultScreenProps {
  level: number;
  config: LevelConfig;
  shots: Shot[];
  hitCount: number;
  missCount: number;
  centerHitCount: number;
  avgReaction: number;
  avgSwitch: number;
  score: number;
  isLastLevel: boolean;
  onNext: () => void;
  onMenu: () => void;
}

interface GameCanvasProps {
  playerId: string;
  sessionId: string;
  onGameComplete: (result: GameResult) => void;
}

// ==================== MenuScreen Component ====================

function MenuScreen({ onStart }: MenuScreenProps) {
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

function HUD({ phase, level, score, timeLeft, totalTime }: HUDProps) {
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
    hudLeft: { display: "flex", gap: 20, minWidth: 200 },
    hudRight: {
      display: "flex",
      gap: 20,
      minWidth: 200,
      justifyContent: "flex-end",
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
      <div style={s.hudLeft}></div>

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
          <div style={s.hudBlock}>
            <div style={s.hudLabel}>Score</div>
            <div style={{ ...s.hudValue, color: "#fff" }}>
              {score.toLocaleString()}
            </div>
          </div>
        </div>
        {phase === "shooting" && (
          <div style={s.timerWrap}>
            <div style={s.timerBarBg}>
              <div style={s.timerBar} />
            </div>
            <div style={s.timerVal}>{secs}s</div>
          </div>
        )}
      </div>

      <div style={s.hudRight}></div>
    </div>
  );
}

// ==================== GameOverScreen Component ====================

function GameOverScreen({
  score,
  hitCount,
  missCount,
  centerHitCount,
  earlyClickCount,
  currentLevel,
  onMenu,
  cleared,
}: GameOverScreenProps) {
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
        <div style={s.bigIcon}>{cleared ? "🏆" : "💀"}</div>
        <h1 style={s.title}>{cleared ? "All Stages Cleared!" : "GAME OVER"}</h1>
        {cleared && (
          <div style={s.clearedSub}>You are a true sharpshooter!</div>
        )}
        <div style={s.stats}>
          <div style={s.stat}>
            <span style={s.slabel}>Reached Level</span>
            <span style={s.sval}>{currentLevel}</span>
          </div>
          <div style={s.stat}>
            <span style={s.slabel}>Total Score</span>
            <span style={{ ...s.sval, color: "#ffcc00" }}>
              {score.toLocaleString()}
            </span>
          </div>
          <div style={s.stat}>
            <span style={s.slabel}>Hits</span>
            <span style={{ ...s.sval, color: "#00ff88" }}>{hitCount}</span>
          </div>
          <div style={s.stat}>
            <span style={s.slabel}>Misses</span>
            <span style={{ ...s.sval, color: "#ff5050" }}>{missCount}</span>
          </div>
          <div style={s.stat}>
            <span style={s.slabel}>Center Hits</span>
            <span style={{ ...s.sval, color: "#00ccff" }}>
              {centerHitCount}
            </span>
          </div>
          <div style={s.stat}>
            <span style={s.slabel}>Early Clicks</span>
            <span style={{ ...s.sval, color: "#ff8844" }}>
              {earlyClickCount}
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
function getRating(hitCount: number, total: number, avgReaction: number) {
  const accuracy = total > 0 ? hitCount / total : 0;
  if (accuracy === 1 && avgReaction < 400)
    return { stars: 3, label: "PERFECT" };
  if (accuracy >= 0.8 && avgReaction < 700)
    return { stars: 2, label: "EXCELLENT" };
  if (accuracy >= 0.5) return { stars: 1, label: "GOOD" };
  return { stars: 0, label: "TRY AGAIN" };
}

function ResultScreen({
  level,
  config,
  shots,
  hitCount,
  missCount,
  centerHitCount,
  avgReaction,
  avgSwitch,
  score,
  isLastLevel,
  onNext,
  onMenu,
}: ResultScreenProps) {
  const totalTargets = config.targetCount;
  const rating = getRating(hitCount, totalTargets, avgReaction);
  const accuracy =
    totalTargets > 0 ? Math.round((hitCount / totalTargets) * 100) : 0;
  const hitShots = shots.filter((s) => s.hit);
  const bestTime =
    hitShots.length > 0
      ? Math.min(...hitShots.map((s) => s.reactionTime || 9999))
      : 0;

  const ratingColors = ["#ff5050", "#00ccff", "#00ffaa", "#ffcc00"];
  const ratingColor = ratingColors[rating.stars];

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
      gap: 28,
      padding: "40px 20px",
      maxWidth: 760,
      width: "100%",
    },
    badge: {
      color: "rgba(255,255,255,0.4)",
      fontSize: 13,
      letterSpacing: 3,
      textTransform: "uppercase",
      border: "1px solid rgba(255,255,255,0.1)",
      padding: "5px 16px",
      borderRadius: 2,
    },
    ratingDisplay: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 8,
    },
    stars: { display: "flex", gap: 8 },
    ratingLabel: {
      fontSize: 28,
      fontWeight: 900,
      letterSpacing: 6,
      textTransform: "uppercase",
      color: ratingColor,
    },
    statsGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
      gap: 10,
      width: "100%",
    },
    statCard: {
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.07)",
      borderRadius: 4,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 6,
    },
    statVal: {
      fontSize: 26,
      fontWeight: 900,
      color: "#fff",
      fontFamily: '"Rajdhani", monospace',
      letterSpacing: 1,
    },
    statLabel: {
      fontSize: 11,
      color: "rgba(255,255,255,0.35)",
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    timeline: {
      width: "100%",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 4,
      padding: "14px 16px",
    },
    timelineLabel: {
      fontSize: 11,
      letterSpacing: 2,
      textTransform: "uppercase",
      color: "rgba(255,255,255,0.3)",
      marginBottom: 10,
    },
    timelineRow: { display: "flex", flexWrap: "wrap", gap: 6 },
    actions: {
      display: "flex",
      gap: 12,
      flexWrap: "wrap",
      justifyContent: "center",
    },
    btn: {
      padding: "12px 28px",
      fontFamily: '"Rajdhani", "Sarabun", sans-serif',
      fontSize: 15,
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
      <div style={s.bgGrid} />
      <div style={s.inner}>
        <div style={s.badge}>
          Level {level} — {config.label}
        </div>

        <div style={s.ratingDisplay}>
          <div style={s.stars}>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                style={{
                  fontSize: 40,
                  color: i < rating.stars ? "#ffcc00" : "rgba(255,255,255,0.1)",
                  textShadow:
                    i < rating.stars ? "0 0 20px rgba(255,204,0,0.6)" : "none",
                }}
              >
                ★
              </span>
            ))}
          </div>
          <div style={s.ratingLabel}>{rating.label}</div>
        </div>

        <div style={s.statsGrid}>
          {[
            {
              icon: "🎯",
              val: `${hitCount}/${totalTargets}`,
              label: "Targets Hit",
            },
            { icon: "📊", val: `${accuracy}%`, label: "Accuracy" },
            {
              icon: "💫",
              val: score.toLocaleString(),
              label: "Score",
              color: "#fff",
            },
            {
              icon: "🏆",
              val: bestTime > 0 ? `${bestTime}ms` : "—",
              label: "Fastest",
            },
            {
              icon: "🔁",
              val: avgSwitch > 0 ? `${avgSwitch}ms` : "-",
              label: "Avg Switch",
            },
            {
              icon: "🎯",
              val: String(centerHitCount),
              label: "Center Hits",
              color: "#00ccff",
            },
            {
              icon: "❌️",
              val: String(missCount),
              label: "Misses",
              color: "#ff5050",
            },
            {
              icon: "⚡",
              val: avgReaction > 0 ? `${avgReaction}ms` : "—",
              label: "Avg Reaction",
              color: "#ffcc00",
              highlight: true,
            },
          ].map((item: any, i) => (
            <div
              key={i}
              style={{
                ...s.statCard,
                order:
                  item.label === "Targets Hit"
                    ? 1
                    : item.label === "Accuracy"
                      ? 2
                      : item.label === "Center Hits"
                        ? 3
                        : item.label === "Misses"
                          ? 4
                          : item.label === "Score"
                            ? 5
                            : item.label === "Fastest"
                              ? 6
                              : item.label === "Avg Switch"
                                ? 7
                                : item.label === "Avg Reaction"
                                  ? 99
                                  : 50,
                ...(item.highlight
                  ? {
                      background: "rgba(255,204,0,0.05)",
                      border: "1px solid rgba(255,204,0,0.2)",
                    }
                  : {}),
                ...(item.fullWidth
                  ? {
                      gridColumn: "1 / -1",
                      minHeight: 120,
                      justifyContent: "center",
                    }
                  : {}),
              }}
            >
              <div style={{ fontSize: item.fullWidth ? 24 : 20 }}>
                {item.icon}
              </div>
              <div
                style={{
                  ...s.statVal,
                  ...(item.fullWidth ? { fontSize: 44 } : {}),
                  ...(item.color ? { color: item.color } : {}),
                }}
              >
                {item.val}
              </div>
              <div style={s.statLabel}>{item.label}</div>
            </div>
          ))}
        </div>

        {shots.length > 0 && (
          <div style={s.timeline}>
            <div style={s.timelineLabel}>Shot Records</div>
            <div style={s.timelineRow}>
              {shots.map((shot: any, i: number) => (
                <div
                  key={i}
                  style={{
                    fontSize: 14,
                    cursor: "default",
                    color: shot.hit ? "#00ff88" : "rgba(255,80,80,0.5)",
                  }}
                >
                  {shot.hit ? "●" : "○"}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={s.actions}>
          {rating.stars > 0 && !isLastLevel && (
            <button
              style={{
                ...s.btn,
                background: "rgba(255,68,68,0.15)",
                borderColor: "rgba(255,68,68,0.5)",
                color: "#ff6666",
              }}
              onClick={onNext}
            >
              Next Stage →
            </button>
          )}
          <button
            style={{
              ...s.btn,
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

// ==================== GameCanvas Component ====================

function GameCanvas(props: GameCanvasProps) {
  const {
    state,
    getLevelConfig,
    startLevel,
    handleShoot,
    nextLevel,
    submitAndExit,
    goToMenu,
  } = useGame(props.playerId, props.sessionId, props.onGameComplete);
  const arenaRef = useRef<HTMLDivElement>(null);
  const [shotEffects, setShotEffects] = useState<ShotEffect[]>([]);
  const effectIdRef = useRef(0);

  const onArenaClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (state.phase !== "shooting") return;
      const rect = arenaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const id = ++effectIdRef.current;
      const activeTarget = state.targets.find(
        (t) => t.id === state.activeTargetId && t.isActive,
      );
      let hit = false;
      if (activeTarget) {
        const dx = activeTarget.x - x;
        const dy = activeTarget.y - y;
        hit = Math.sqrt(dx * dx + dy * dy) < 9;
      }

      setShotEffects((prev) => [...prev, { id, x, y, hit }]);
      setTimeout(
        () => setShotEffects((prev) => prev.filter((e) => e.id !== id)),
        600,
      );
      handleShoot(x, y);
    },
    [state.phase, state.targets, state.activeTargetId, handleShoot],
  );

  const config = getLevelConfig(state.currentLevel);
  const isShooting = state.phase === "shooting";
  const showTargets =
    isShooting && state.targets.some((t) => t.isActive || t.isHit);

  useEffect(() => {
    document.body.style.cursor = isShooting ? "crosshair" : "default";
    return () => {
      document.body.style.cursor = "default";
    };
  }, [isShooting]);

  if (state.phase === "menu") return <MenuScreen onStart={startLevel} />;

  if (state.phase === "gameover") {
    return (
      <GameOverScreen
        score={state.score}
        hitCount={state.hitCount}
        missCount={state.missCount}
        centerHitCount={state.centerHitCount}
        earlyClickCount={state.earlyClickCount}
        currentLevel={state.currentLevel}
        onMenu={submitAndExit}
        cleared={state.levelComplete}
      />
    );
  }

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
        missCount={state.missCount}
        centerHitCount={state.centerHitCount}
        avgReaction={avgReaction}
        avgSwitch={avgSwitch}
        score={state.score}
        isLastLevel={isLastLevel}
        onNext={nextLevel}
        onMenu={isLastLevel ? submitAndExit : goToMenu}
      />
    );
  }

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

export default function TargetGhostGame(props: GameCanvasProps) {
  return <GameCanvas {...props} />;
}

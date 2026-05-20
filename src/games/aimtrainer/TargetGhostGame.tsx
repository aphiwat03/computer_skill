import {
  useRef,
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from "react";
import { useGame } from "./logic";
import { LEVELS } from "./types";
import type {
  GameResult,
  GamePhase,
  LevelConfig,
  Shot,
  PerTargetDistances,
} from "./types";
import { TargetConnectorOverlay } from "./TargetConnectorOverlay";

// ==================== Types & Interfaces ====================

interface ShotEffect {
  id: number;
  x: number;
  y: number;
  hit: boolean;
}

interface MenuScreenProps {
  onStart: (level: number) => void;
  onOpenSettings: () => void;
}

interface HUDProps {
  phase: GamePhase;
  level: number;
  timeLeft: number;
  totalTime: number;
}

interface GameOverScreenProps {
  accuracy: number;
  avgReaction: number;
  avgSwitch: number;
  stabilityStatus: string;
  currentLevel: number;
  onMenu: () => void;
  cleared: boolean;
}

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

interface GameCanvasProps {
  playerId: string;
  sessionId: string;
  onGameComplete: (result: GameResult) => void;
}

// ==================== Audio Effect Function ====================
let sharedAudioCtx: AudioContext | null = null;
const playBeep = (isHit: boolean) => {
  if (!sharedAudioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    sharedAudioCtx = new AudioContextClass();
  }

  if (sharedAudioCtx.state === "suspended") {
    sharedAudioCtx.resume();
  }

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

// ==================== Settings Modal Component ====================

/**
 * แปลง PerTargetDistances (Record<level, number[]>) ไปเป็น string[][]
 * เพื่อใช้ใน input fields
 */
function distancesToStrings(
  d: PerTargetDistances,
  levels: typeof LEVELS,
): Record<number, string[]> {
  const result: Record<number, string[]> = {};
  levels.forEach((lvl) => {
    const arr = d[lvl.level] ?? [];
    // ความยาว = targetCount - 1 segments
    result[lvl.level] = Array.from({ length: lvl.targetCount - 1 }, (_, i) =>
      String(arr[i] ?? 250),
    );
  });
  return result;
}

function SettingsModal({
  distances,
  onSave,
  onClose,
}: {
  distances: PerTargetDistances;
  onSave: (d: PerTargetDistances) => void;
  onClose: () => void;
}) {
  const [localStr, setLocalStr] = useState<Record<number, string[]>>(() =>
    distancesToStrings(distances, LEVELS),
  );
  const [error, setError] = useState("");
  const [activeLevel, setActiveLevel] = useState(1);

  const handleChange = (level: number, idx: number, val: string) => {
    setLocalStr((prev) => {
      const arr = [...(prev[level] ?? [])];
      arr[idx] = val;
      return { ...prev, [level]: arr };
    });
  };

  const handleSave = () => {
    // Validate
    for (const lvl of LEVELS) {
      const arr = localStr[lvl.level] ?? [];
      for (let i = 0; i < lvl.targetCount - 1; i++) {
        const num = parseInt(arr[i] ?? "0", 10);
        if (isNaN(num) || num < 50) {
          setError(`Stage ${lvl.level} — ระยะทางทุก segment ต้องมากกว่า 50 px`);
          setActiveLevel(lvl.level);
          return;
        }
      }
    }
    setError("");
    // แปลงกลับเป็น number[][]
    const result: PerTargetDistances = {};
    LEVELS.forEach((lvl) => {
      result[lvl.level] = (localStr[lvl.level] ?? []).map(
        (s) => parseInt(s, 10) || 250,
      );
    });
    onSave(result);
    onClose();
  };

  const tabStyle = (active: boolean): CSSProperties => ({
    flex: 1,
    padding: "8px 4px",
    border: `1px solid ${active ? "#00ffaa" : "rgba(255,255,255,0.15)"}`,
    background: active ? "rgba(0,255,170,0.1)" : "transparent",
    color: active ? "#00ffaa" : "rgba(255,255,255,0.45)",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1,
    textAlign: "center",
    fontFamily: '"Rajdhani", sans-serif',
  });

  const s: Record<string, CSSProperties> = {
    overlay: {
      position: "absolute",
      inset: 0,
      background: "rgba(0,0,0,0.88)",
      backdropFilter: "blur(4px)",
      zIndex: 999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: '"Rajdhani", sans-serif',
    },
    modal: {
      background: "#0a0f16",
      border: "1px solid rgba(0,255,170,0.3)",
      borderRadius: 8,
      padding: "28px 32px",
      width: 520,
      minWidth: 520,
      maxWidth: "94vw",
      height: 650,
      maxHeight: "90vh",
      overflowY: "auto",
      boxSizing: "border-box",
      boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
      display: "flex",
      flexDirection: "column",
    },
    scrollArea: {
      flex: 1,
      overflowY: "auto",
      paddingRight: 8,
      marginBottom: 20,
    },

    title: {
      margin: "0 0 20px 0",
      color: "#00ffaa",
      textAlign: "center",
      fontSize: 22,
      letterSpacing: 2,
    },
    tabRow: {
      display: "flex",
      gap: 6,
      marginBottom: 20,
      flexWrap: "wrap" as const,
    },
    segRow: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
      background: "rgba(255,255,255,0.03)",
      padding: "10px 16px",
      borderRadius: 4,
    },
    segLabel: { color: "#fff", fontSize: 15, fontWeight: 600, minWidth: 100 },
    segSub: { color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 },
    input: {
      width: 80,
      padding: "8px",
      background: "rgba(0,0,0,0.5)",
      border: "1px solid rgba(255,255,255,0.2)",
      color: "#fff",
      borderRadius: 4,
      textAlign: "center",
      fontSize: 16,
      fontFamily: "monospace",
    },
    actions: { display: "flex", gap: 12, marginTop: 24 },
    btn: {
      flex: 1,
      padding: "12px",
      border: "none",
      borderRadius: 4,
      fontSize: 16,
      fontWeight: 700,
      cursor: "pointer",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
  };
  const currentLvl = LEVELS.find((l) => l.level === activeLevel)!;
  const segCount = currentLvl.targetCount - 1;
  const strs = localStr[activeLevel] ?? [];

  return (
    <div style={s.overlay} onClick={onClose}>
      <style>{`
      .neon-scroll {
        scrollbar-width: thin;
        scrollbar-color: #00ffaa #0a0f16;
      }
      .neon-scroll::-webkit-scrollbar {
        width: 6px;
      }
      .neon-scroll::-webkit-scrollbar-track {
        background: rgba(0,0,0,0.3);
        border-radius: 4px;
      }
      .neon-scroll::-webkit-scrollbar-thumb {
        background: #00ffaa;
        border-radius: 4px;
      }
      .neon-scroll::-webkit-scrollbar-thumb:hover {
        background: #00e699;
      }
    `}</style>
      <div
        className="neon-scroll"
        style={s.modal}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={s.title}>⚙️ DISTANCE SETTINGS (PX)</h2>

        {/* Stage tabs */}
        <div style={s.tabRow}>
          {LEVELS.map((lvl) => (
            <button
              key={lvl.level}
              style={tabStyle(activeLevel === lvl.level)}
              onClick={() => setActiveLevel(lvl.level)}
            >
              S{lvl.level}
              <br />
              <span style={{ fontSize: 10, fontWeight: 400 }}>{lvl.label}</span>
            </button>
          ))}
        </div>

        {/* Per-segment inputs (ปรับการครอบ div ให้ใช้ s.scrollArea) */}
        <div style={s.scrollArea}>
          {Array.from({ length: segCount }, (_, i) => (
            <div key={i} style={s.segRow}>
              <div>
                <div style={s.segLabel}>
                  เป้า {i + 1} → {i + 2}
                </div>
                <div style={s.segSub}>
                  Segment {i + 1} / {segCount}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="number"
                  min={50}
                  step={10}
                  style={s.input}
                  value={strs[i] ?? "250"}
                  onChange={(e) => handleChange(activeLevel, i, e.target.value)}
                />
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>
                  px
                </span>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div
            style={{
              color: "#ff4d4f",
              marginTop: 10,
              textAlign: "center",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        <div style={s.actions}>
          <button
            style={{ ...s.btn, background: "#333", color: "#fff" }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            style={{ ...s.btn, background: "#00ffaa", color: "#000" }}
            onClick={handleSave}
          >
            Save Config
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MenuScreen Component ====================

function MenuScreen({ onStart, onOpenSettings }: MenuScreenProps) {
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
    settingBtn: {
      position: "absolute",
      top: 24,
      right: 24,
      background: "rgba(0,255,170,0.1)",
      border: "1px solid rgba(0,255,170,0.3)",
      color: "#00ffaa",
      padding: "8px 16px",
      borderRadius: 4,
      cursor: "pointer",
      fontWeight: 700,
      letterSpacing: 1,
      zIndex: 10,
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

      <button
        style={styles.settingBtn}
        onClick={(e) => {
          e.stopPropagation();
          onOpenSettings();
        }}
      >
        ⚙️ SETTINGS
      </button>

      <div style={styles.logoWrap}>
        <div style={styles.logoIcon}>◎</div>
        <h1 style={styles.title}>REACTION TIME TEST</h1>

        <div
          style={{
            color: "rgba(255, 255, 255, 0.8)",
            maxWidth: "540px",
            textAlign: "left",
            background: "rgba(0, 255, 170, 0.03)",
            border: "1px solid rgba(0, 255, 170, 0.15)",
            padding: "24px",
            borderRadius: "8px",
            marginTop: "20px",
            fontSize: "15px",
            lineHeight: "1.6",
          }}
        >
          <b
            style={{
              color: "#00ffaa",
              display: "block",
              marginBottom: "8px",
              fontSize: "18px",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            💡 วิธีการทดสอบ:
          </b>
          • <b>ยิงเป้าสีแดง:</b> คลิกยิงเป้าหมายแรกเพื่อเริ่มต้นด่าน
          <br />• <b>ตรึงเมาส์ค้างไว้:</b> หลังยิงโดน
          เป้าจะมีอักษรสีเหลือง(HOLD)แสดงแล้ว{" "}
          <b>ห้ามขยับเมาส์ออกจากเป้าเด็ดขาด</b> จนกว่าเป้าถัดไปจะโผล่ขึ้นมา
          (สุ่ม 1-3 วินาที)
          <br />• <b>สะบัดไปยิงเป้าใหม่:</b> ทันทีที่สัยญาณเป้าถัดไปปรากฏ
          ให้รีบเลื่อนเมาส์ไปยิงเป้าใหม่ให้เร็วที่สุด
          <br />• ผ่านให้ครบทั้ง 5 ระดับเพื่อวัดผลความนิ่ง (Stability)
          และความเร็วในการตอบสนองของคุณ
        </div>

        <p
          style={{
            fontSize: 22,
            color: "#00ffaa",
            letterSpacing: 2,
            marginTop: 30,
            textAlign: "center",
            fontWeight: "bold",
            animation: "pulse 1.5s infinite alternate",
          }}
        >
          [ คลิกพื้นที่ใดก็ได้เพื่อเริ่มเกม ]
        </p>
      </div>
    </div>
  );
}

// ==================== HUD Component ====================

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
  };

  return (
    <div style={s.hud}>
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

function GameOverScreen({
  accuracy,
  avgReaction,
  avgSwitch,
  stabilityStatus,
  onMenu,
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
      background: "transparent",
      borderColor: "rgba(255,255,255,0.12)",
      color: "rgba(255,255,255,0.45)",
    },
  };

  return (
    <div style={s.wrap}>
      <style>{`@keyframes bounce { to { transform: translateY(-8px); } }`}</style>
      <div style={s.bgGrid} />
      <div style={s.content}>
        <div style={s.bigIcon}>🏆</div>
        <h1 style={s.title}>All Stages Cleared!</h1>
        <div style={s.stats}>
          <div style={s.stat}>
            <span style={s.slabel}>OVERALL ACCURACY</span>
            <span style={{ ...s.sval, color: "#eeecec" }}>{accuracy}%</span>
          </div>
          <div style={s.stat}>
            <span style={s.slabel}>AVG SWITCH</span>
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
          <div style={s.stat}>
            <span style={s.slabel}>STABILITY (FLICK)</span>
            <span
              style={{
                ...s.sval,
                color: stabilityStatus === "Stable" ? "#00ffaa" : "#ff3d6b",
              }}
            >
              {stabilityStatus === "Stable" ? "STABLE" : "UNSTABLE"}
            </span>
          </div>
        </div>
        <button style={s.btnBase} onClick={onMenu}>
          Main Menu
        </button>
      </div>
    </div>
  );
}

// ==================== ResultScreen Component ====================

function ResultScreen({
  config,
  shots,
  hitCount,
  avgReaction,
  avgSwitch,
  isLastLevel,
  onNext,
  onMenu,
}: ResultScreenProps) {
  const accuracy =
    shots.length > 0 ? Math.round((hitCount / shots.length) * 100) : 0;

  const lastId = config.targetCount - 1;
  const validTimingShots = shots.filter(
    (s) => s.hit && s.targetId !== 0 && s.targetId !== lastId,
  );

  const reactionTimes = validTimingShots
    .map((s) => s.reactionTime || 0)
    .filter((t) => t > 0);

  const switchTimesForSD = validTimingShots
    .map((s) => s.switchTime)
    .filter((t): t is number => typeof t === "number");
  const switchAvg =
    switchTimesForSD.length > 0
      ? switchTimesForSD.reduce((a, b) => a + b, 0) / switchTimesForSD.length
      : 0;
  const switchVariance =
    switchTimesForSD.length > 0
      ? switchTimesForSD.reduce(
          (sum, val) => sum + Math.pow(val - switchAvg, 2),
          0,
        ) / switchTimesForSD.length
      : 0;
  const sd = Math.sqrt(switchVariance); // Stability based on flick (switchTime) SD

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
              label: `STABILITY (FLICK SD)`,
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

function GameCanvas(props: GameCanvasProps) {
  const arenaRef = useRef<HTMLDivElement>(null);
  const [shotEffects, setShotEffects] = useState<ShotEffect[]>([]);
  const effectIdRef = useRef(0);
  const [showPath, setShowPath] = useState(true);
  const [arenaSize, setArenaSize] = useState(() => ({
    width: typeof window !== "undefined" ? window.innerWidth - 34 : 800,
    height: typeof window !== "undefined" ? window.innerHeight - 82 : 600,
  }));
  const [showSettings, setShowSettings] = useState(false);

  // สถานะเก็บระยะพิกเซลของแต่ละ segment ในแต่ละด่าน
  // key = level, value = number[] ของระยะทางแต่ละ segment (เป้า i → i+1)
  const [levelDistances, setLevelDistances] = useState<PerTargetDistances>(
    () => {
      // Default: ทุก segment ในแต่ละด่านใช้ระยะเดิม
      const defaults: PerTargetDistances = {};
      LEVELS.forEach((lvl) => {
        const defaultDist = [250, 250, 300, 300, 350][lvl.level - 1] ?? 250;
        defaults[lvl.level] = Array(lvl.targetCount - 1).fill(defaultDist);
      });
      return defaults;
    },
  );

  // เรียกใช้ Hook โดยส่งระยะและขนาดจอไปด้วย
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const {
    state,
    getLevelConfig,
    startLevel,
    handleShoot,
    handleMouseMove,
    nextLevel,
    submitAndExit,
  } = useGame(
    props.playerId,
    props.sessionId,
    props.onGameComplete,
    levelDistances, // ส่ง Setting ที่ตั้งไปให้ Game Logic
    arenaSize, // ส่งขนาดจอไปคำนวณตำแหน่ง Pixel -> %
  );

  const config = getLevelConfig(state.currentLevel);

  useEffect(() => {
    const updateSize = () => {
      if (arenaRef.current) {
        setArenaSize({
          width: arenaRef.current.clientWidth,
          height: arenaRef.current.clientHeight,
        });
      }
    };
    updateSize(); // อ่านค่าครั้งแรก
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const onArenaClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (state.phase !== "shooting") return;
      const rect = arenaRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const clickPxX = e.clientX - rect.left;
      const clickPxY = e.clientY - rect.top;
      const id = ++effectIdRef.current;

      const clickedTarget = state.targets.find((t) => {
        const targetPxX = (t.x / 100) * rect.width;
        const targetPxY = (t.y / 100) * rect.height;
        const dx = targetPxX - clickPxX;
        const dy = targetPxY - clickPxY;
        return Math.sqrt(dx * dx + dy * dy) <= 32;
      });

      let hit = false;
      if (clickedTarget && clickedTarget.id === state.activeTargetId) {
        hit = true;
      }
      playBeep(hit);

      setShotEffects((prev) => [...prev, { id, x, y, hit }]);
      setTimeout(
        () => setShotEffects((prev) => prev.filter((e) => e.id !== id)),
        400,
      );

      const aSize = { width: rect.width, height: rect.height };
      handleShoot(x, y, aSize);
    },
    [state.phase, state.targets, state.activeTargetId, handleShoot],
  );

  const onArenaMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = arenaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pxX = e.clientX - rect.left;
      const pxY = e.clientY - rect.top;
      setMousePos({ x: pxX, y: pxY });
      if (state.phase === "shooting") {
        handleMouseMove(pxX, pxY);
      }
    },
    [state.phase, handleMouseMove],
  );

  const isShooting = state.phase === "shooting";
  const showTargets =
    isShooting && state.targets.some((t) => t.isActive || t.isHit);

  useEffect(() => {
    document.body.style.cursor = isShooting ? "crosshair" : "default";
    return () => {
      document.body.style.cursor = "default";
    };
  }, [isShooting]);

  if (state.phase === "menu") {
    return (
      <>
        <MenuScreen
          onStart={startLevel}
          onOpenSettings={() => setShowSettings(true)}
        />
        {showSettings && (
          <SettingsModal
            distances={levelDistances}
            onSave={(newDist) => setLevelDistances(newDist)}
            onClose={() => setShowSettings(false)}
          />
        )}
      </>
    );
  }

  if (state.phase === "gameover") {
    const finalAccuracy = state.finalStats?.accuracy || 0;
    const finalReaction = state.finalStats?.avgReaction || 0;
    const finalSwitch = state.finalStats?.avgSwitch || 0;
    const finalStability = state.finalStats?.stabilityStatus || "Unstable";

    return (
      <GameOverScreen
        accuracy={finalAccuracy}
        avgReaction={finalReaction}
        avgSwitch={finalSwitch}
        stabilityStatus={finalStability}
        currentLevel={state.currentLevel}
        onMenu={submitAndExit}
        cleared={state.levelComplete}
      />
    );
  }

  if (state.phase === "result") {
    const hits = state.shots.filter((s) => s.hit);

    const lastId = config.targetCount - 1;
    const validTimingHits = hits.filter(
      (s) => s.targetId !== 0 && s.targetId !== lastId,
    );

    const switchTimes = validTimingHits
      .map((s) => s.switchTime)
      .filter((time): time is number => typeof time === "number");
    const avgReaction =
      validTimingHits.length > 0
        ? Math.round(
            validTimingHits.reduce((a, s) => a + (s.reactionTime || 0), 0) /
              validTimingHits.length,
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
      `}</style>
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
      {isShooting && (
        <HUD
          phase={state.phase}
          level={state.currentLevel}
          timeLeft={state.shootingTimeLeft}
          totalTime={config.shootingTime}
        />
      )}
      <div
        ref={arenaRef}
        onClick={onArenaClick}
        onMouseMove={onArenaMouseMove}
        style={arenaStyle}
      >
        <TargetConnectorOverlay
          targets={state.targets}
          arenaWidth={arenaSize.width}
          arenaHeight={arenaSize.height}
          visible={showPath}
          mousePos={mousePos}
        />
        {showTargets &&
          state.targets.map((target) => {
            const isActive = target.isActive;
            const isHit = target.isHit;

            const isWaiting = target.isWaiting;
            const ringOuterColor = isActive
              ? "rgba(255,80,80,0.7)"
              : isWaiting
                ? "rgba(255,200,0,0.6)"
                : isHit
                  ? "rgba(0,255,100,0.3)"
                  : "rgba(255,255,255,0.15)";
            const ringMidColor = isActive
              ? "rgba(255,80,80,0.85)"
              : isWaiting
                ? "rgba(255,200,0,0.75)"
                : isHit
                  ? "rgba(0,255,100,0.4)"
                  : "rgba(255,255,255,0.2)";
            const ringInnerColor = isActive
              ? "#ff5050"
              : isWaiting
                ? "rgba(255,200,0,0.9)"
                : isHit
                  ? "rgba(0,255,100,0.5)"
                  : "rgba(255,255,255,0.3)";
            const centerBg = isActive
              ? "#ff5050"
              : isWaiting
                ? "#ffc800"
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
                      width: 18,
                      height: 18,
                      background: centerBg,
                      borderRadius: "50%",
                      ...(isActive ? { boxShadow: "0 0 10px #ff5050" } : {}),
                      ...(isWaiting ? { boxShadow: "0 0 10px #ffc800" } : {}),
                    }}
                  />
                  {isWaiting && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: -50,
                        left: "50%",
                        transform: "translateX(-50%)",
                        fontSize: 25,
                        fontWeight: 900,
                        letterSpacing: 2,
                        color: "#ffc800",
                        textShadow: "0 0 8px rgba(255,200,0,0.7)",
                        whiteSpace: "nowrap",
                        fontFamily: "monospace",
                      }}
                    >
                      HOLD
                    </div>
                  )}
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

        {state.phase === "shooting" && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(0,0,0,0.5)",
              padding: "6px 12px",
              borderRadius: 20,
              border: "1px solid rgba(0,255,170,0.2)",
              cursor: "pointer",
              userSelect: "none",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setShowPath(!showPath);
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: showPath ? "#00ffaa" : "#666",
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              SHOW PATH
            </span>
            <div
              style={{
                width: 24,
                height: 12,
                background: showPath ? "#00ffaa" : "#333",
                borderRadius: 6,
                position: "relative",
                transition: "0.3s",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  background: "#fff",
                  borderRadius: "50%",
                  position: "absolute",
                  top: 2,
                  left: showPath ? 14 : 2,
                  transition: "0.2s",
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TargetGhostGame(props: GameCanvasProps) {
  return <GameCanvas {...props} />;
}

import { type CSSProperties } from "react";

interface GameOverScreenProps {
  score: number;
  hitCount: number;
  missCount: number;
  currentLevel: number;
  onRestart: () => void;
  onMenu: () => void;
  cleared: boolean;
}

export default function GameOverScreen({
  score,
  hitCount,
  missCount,
  currentLevel,
  onRestart,
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
    clearedSub: { color: "#ffcc00", fontSize: 18, letterSpacing: 3, textTransform: "uppercase" },
    stats: { display: "flex", gap: 32, flexWrap: "wrap", justifyContent: "center" },
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
    slabel: { fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 2, textTransform: "uppercase" },
    sval: { fontSize: 36, fontWeight: 900, color: "#fff", fontFamily: '"Rajdhani", monospace' },
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
        <h1 style={s.title}>{cleared ? "ผ่านทุกด่านแล้ว!" : "GAME OVER"}</h1>
        {cleared && <div style={s.clearedSub}>คุณเป็น นักแม่นปืน ตัวจริง!</div>}
        <div style={s.stats}>
          <div style={s.stat}>
            <span style={s.slabel}>ถึงด่าน</span>
            <span style={s.sval}>{currentLevel}</span>
          </div>
          <div style={s.stat}>
            <span style={s.slabel}>คะแนนรวม</span>
            <span style={{ ...s.sval, color: "#ffcc00" }}>{score.toLocaleString()}</span>
          </div>
          <div style={s.stat}>
            <span style={s.slabel}>ยิงโดน</span>
            <span style={{ ...s.sval, color: "#00ff88" }}>{hitCount}</span>
          </div>
          <div style={s.stat}>
            <span style={s.slabel}>ยิงพลาด</span>
            <span style={{ ...s.sval, color: "#ff5050" }}>{missCount}</span>
          </div>
        </div>
        <div style={s.btns}>
          <button
            style={{ ...s.btnBase, background: "rgba(255,68,68,0.15)", borderColor: "rgba(255,68,68,0.5)", color: "#ff6666" }}
            onClick={onRestart}
          >
            เล่นใหม่
          </button>
          <button
            style={{ ...s.btnBase, background: "transparent", borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)" }}
            onClick={onMenu}
          >
            เมนูหลัก
          </button>
        </div>
      </div>
    </div>
  );
}

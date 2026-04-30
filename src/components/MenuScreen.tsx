import { type CSSProperties } from "react";

interface MenuScreenProps {
  onStart: (level: number) => void;
}

export default function MenuScreen({ onStart }: MenuScreenProps) {
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
    <div style={styles.menu}>
      <style>{`
        @keyframes spinSlow { to { transform: rotate(360deg); } }
        .start-btn-hover:hover {
          background: rgba(255,68,68,0.15) !important;
          border-color: rgba(255,68,68,0.8) !important;
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(255,68,68,0.3);
        }
      `}</style>
      <div style={styles.bgGrid} />
      <div style={styles.bgLines} />
      <div style={styles.menuInner}>
        <div style={styles.logoWrap}>
          <div style={styles.logoIcon}>◎</div>
          <h1 style={styles.title}>
            TARGET<span style={styles.titleAccent}>GHOST</span>
          </h1>
        </div>
        <button
          className="start-btn-hover"
          style={styles.startBtn}
          onClick={() => onStart(1)}
        >
          <div style={styles.startText}>START GAME</div>
          <div style={styles.startSubtext}>เริ่มเกม</div>
        </button>
      </div>
    </div>
  );
}

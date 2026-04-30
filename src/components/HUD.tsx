import { type CSSProperties } from "react";
import type { GamePhase, LevelConfig } from "../types/game";

interface HUDProps {
  phase: GamePhase;
  level: number;
  config: LevelConfig;
  score: number;
  hitCount: number;
  missCount: number;
  timeLeft: number;
  totalTime: number;
}

export default function HUD({
  phase,
  level,
  config,
  score,
  hitCount,
  missCount,
  timeLeft,
  totalTime,
}: HUDProps) {
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
    hudRight: { display: "flex", gap: 20, minWidth: 200, justifyContent: "flex-end" },
    hudCenter: { flex: 1, display: "flex", justifyContent: "center", alignItems: "center" },
    hudBlock: { display: "flex", flexDirection: "column", alignItems: "center" },
    hudLabel: {
      fontSize: 10,
      letterSpacing: 2,
      textTransform: "uppercase",
      color: "rgba(255,255,255,0.35)",
      fontWeight: 600,
    },
    hudSublabel: { fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 1 },
    hudValue: {
      fontSize: 24,
      fontWeight: 900,
      lineHeight: 1.1,
      fontFamily: '"Rajdhani", monospace',
    },
    timerWrap: { display: "flex", alignItems: "center", gap: 12, width: "100%", maxWidth: 400 },
    timerBarBg: {
      flex: 1,
      height: 6,
      background: "rgba(255,255,255,0.08)",
      borderRadius: 3,
      overflow: "hidden",
    },
    timerBar: { height: "100%", borderRadius: 3, transition: "width 0.1s linear, background 0.5s", background: timeColor, width: `${pct}%` },
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
    statusDot: { width: 8, height: 8, borderRadius: "50%", animation: "blink 0.8s ease infinite" },
  };

  return (
    <div style={s.hud}>
      <style>{`
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
      `}</style>
      <div style={s.hudLeft}>
        <div style={s.hudBlock}>
          <div style={s.hudLabel}>ด่าน</div>
          <div style={{ ...s.hudValue, color: "#00ccff" }}>{level}</div>
          <div style={s.hudSublabel}>{config.label}</div>
        </div>
        <div style={s.hudBlock}>
          <div style={s.hudLabel}>คะแนน</div>
          <div style={{ ...s.hudValue, color: "#fff" }}>{score.toLocaleString()}</div>
        </div>
      </div>

      <div style={s.hudCenter}>
        {phase === "memorize" && (
          <div style={{ ...s.phaseStatus, color: "#00ccff" }}>
            <span style={{ ...s.statusDot, background: "#00ccff" }} />
            จำตำแหน่ง
          </div>
        )}
        {phase === "blackout" && (
          <div style={{ ...s.phaseStatus, color: "#ff4444" }}>
            <span style={{ ...s.statusDot, background: "#ff4444" }} />
            หน้าจอมืด!
          </div>
        )}
        {phase === "shooting" && (
          <div style={s.timerWrap}>
            <div style={s.timerBarBg}>
              <div style={s.timerBar} />
            </div>
            <div style={s.timerVal}>{secs}s</div>
          </div>
        )}
      </div>

      <div style={s.hudRight}>
        <div style={s.hudBlock}>
          <div style={s.hudLabel}>โดน</div>
          <div style={{ ...s.hudValue, color: "#00ff88" }}>{hitCount}</div>
        </div>
        <div style={s.hudBlock}>
          <div style={s.hudLabel}>พลาด</div>
          <div style={{ ...s.hudValue, color: "#ff5050" }}>{missCount}</div>
        </div>
      </div>
    </div>
  );
}

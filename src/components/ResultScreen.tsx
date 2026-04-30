import { type CSSProperties } from "react";
import type { Shot, LevelConfig } from "../types/game";

interface ResultScreenProps {
  level: number;
  config: LevelConfig;
  shots: Shot[];
  hitCount: number;
  missCount: number;
  avgReaction: number;
  score: number;
  isLastLevel: boolean;
  onNext: () => void;
  onRestart: () => void;
  onMenu: () => void;
}

function getRating(hitCount: number, total: number, avgReaction: number) {
  const accuracy = total > 0 ? hitCount / total : 0;
  if (accuracy === 1 && avgReaction < 400) return { stars: 3, label: "PERFECT" };
  if (accuracy >= 0.8 && avgReaction < 700) return { stars: 2, label: "EXCELLENT" };
  if (accuracy >= 0.5) return { stars: 1, label: "GOOD" };
  return { stars: 0, label: "TRY AGAIN" };
}

export default function ResultScreen({
  level, config, shots, hitCount, missCount, avgReaction,
  score, isLastLevel, onNext, onRestart, onMenu,
}: ResultScreenProps) {
  const totalTargets = config.targetCount;
  const rating = getRating(hitCount, totalTargets, avgReaction);
  const accuracy = totalTargets > 0 ? Math.round((hitCount / totalTargets) * 100) : 0;
  const hitShots = shots.filter((s) => s.hit);
  const bestTime = hitShots.length > 0 ? Math.min(...hitShots.map((s) => s.reactionTime || 9999)) : 0;

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
      maxWidth: 600,
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
    ratingDisplay: { display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
    stars: { display: "flex", gap: 8 },
    ratingLabel: { fontSize: 28, fontWeight: 900, letterSpacing: 6, textTransform: "uppercase", color: ratingColor },
    statsGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, width: "100%" },
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
    statVal: { fontSize: 26, fontWeight: 900, color: "#fff", fontFamily: '"Rajdhani", monospace', letterSpacing: 1 },
    statLabel: { fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 2, textTransform: "uppercase" },
    timeline: {
      width: "100%",
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 4,
      padding: "14px 16px",
    },
    timelineLabel: { fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "rgba(255,255,255,0.3)", marginBottom: 10 },
    timelineRow: { display: "flex", flexWrap: "wrap", gap: 6 },
    actions: { display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" },
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
        <div style={s.badge}>ด่าน {level} — {config.label}</div>

        <div style={s.ratingDisplay}>
          <div style={s.stars}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                fontSize: 40,
                color: i < rating.stars ? "#ffcc00" : "rgba(255,255,255,0.1)",
                textShadow: i < rating.stars ? "0 0 20px rgba(255,204,0,0.6)" : "none",
              }}>★</span>
            ))}
          </div>
          <div style={s.ratingLabel}>{rating.label}</div>
        </div>

        <div style={s.statsGrid}>
          {[
            { icon: "🎯", val: `${hitCount}/${totalTargets}`, label: "เป้าที่โดน" },
            { icon: "📊", val: `${accuracy}%`, label: "ความแม่น" },
            { icon: "⚡", val: avgReaction > 0 ? `${avgReaction}ms` : "—", label: "ความเร็วเฉลี่ย" },
            { icon: "🏆", val: bestTime > 0 ? `${bestTime}ms` : "—", label: "เร็วที่สุด" },
            { icon: "✗", val: String(missCount), label: "ยิงพลาด", color: "#ff5050" },
            { icon: "💫", val: score.toLocaleString(), label: "คะแนน", color: "#ffcc00", highlight: true },
          ].map((item, i) => (
            <div key={i} style={{
              ...s.statCard,
              ...(item.highlight ? { background: "rgba(255,204,0,0.05)", border: "1px solid rgba(255,204,0,0.2)" } : {}),
            }}>
              <div style={{ fontSize: 20 }}>{item.icon}</div>
              <div style={{ ...s.statVal, ...(item.color ? { color: item.color } : {}) }}>{item.val}</div>
              <div style={s.statLabel}>{item.label}</div>
            </div>
          ))}
        </div>

        {shots.length > 0 && (
          <div style={s.timeline}>
            <div style={s.timelineLabel}>บันทึกการยิง</div>
            <div style={s.timelineRow}>
              {shots.map((shot, i) => (
                <div key={i} style={{ fontSize: 14, cursor: "default", color: shot.hit ? "#00ff88" : "rgba(255,80,80,0.5)" }}>
                  {shot.hit ? "●" : "○"}
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={s.actions}>
          {rating.stars > 0 && !isLastLevel && (
            <button style={{ ...s.btn, background: "rgba(255,68,68,0.15)", borderColor: "rgba(255,68,68,0.5)", color: "#ff6666" }} onClick={onNext}>
              ด่านต่อไป →
            </button>
          )}
          <button style={{ ...s.btn, background: "rgba(0,255,170,0.08)", borderColor: "rgba(0,255,170,0.3)", color: "#00ffaa" }} onClick={onRestart}>
            เล่นซ้ำ
          </button>
          <button style={{ ...s.btn, background: "transparent", borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.45)" }} onClick={onMenu}>
            เมนูหลัก
          </button>
        </div>
      </div>
    </div>
  );
}

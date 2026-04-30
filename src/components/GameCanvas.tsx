import { useRef, useCallback, useEffect, useState, type CSSProperties } from "react";
import { useGame } from "../hooks/useGame";
import { LEVELS } from "../types/game";
import MenuScreen from "./MenuScreen";
import HUD from "./HUD";
import ResultScreen from "./ResultScreen";
import GameOverScreen from "./GameOverScreen";

interface ShotEffect {
  id: number;
  x: number;
  y: number;
  hit: boolean;
}

export default function GameCanvas() {
  const { state, getLevelConfig, startLevel, handleShoot, nextLevel, restartGame, goToMenu } = useGame();
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
      const activeTarget = state.targets.find((t) => t.id === state.activeTargetId && t.isActive);
      let hit = false;
      if (activeTarget) {
        const dx = activeTarget.x - x;
        const dy = activeTarget.y - y;
        hit = Math.sqrt(dx * dx + dy * dy) < 9;
      }

      setShotEffects((prev) => [...prev, { id, x, y, hit }]);
      setTimeout(() => setShotEffects((prev) => prev.filter((e) => e.id !== id)), 600);
      handleShoot(x, y);
    },
    [state.phase, state.targets, state.activeTargetId, handleShoot]
  );

  const config = getLevelConfig(state.currentLevel);
  const isMemorize = state.phase === "memorize";
  const isBlackout = state.phase === "blackout";
  const isShooting = state.phase === "shooting";
  const showTargets = isMemorize || isShooting;

  useEffect(() => {
    document.body.style.cursor = isShooting ? "crosshair" : "default";
    return () => { document.body.style.cursor = "default"; };
  }, [isShooting]);

  if (state.phase === "menu") return <MenuScreen onStart={startLevel} />;

  if (state.phase === "gameover") {
    return (
      <GameOverScreen
        score={state.score}
        hitCount={state.hitCount}
        missCount={state.missCount}
        currentLevel={state.currentLevel}
        onRestart={restartGame}
        onMenu={goToMenu}
        cleared={state.levelComplete}
      />
    );
  }

  if (state.phase === "result") {
    const hits = state.shots.filter((s) => s.hit);
    const avgReaction = hits.length > 0
      ? Math.round(hits.reduce((a, s) => a + (s.reactionTime || 0), 0) / hits.length)
      : 0;
    const isLastLevel = state.currentLevel >= LEVELS.length;
    return (
      <ResultScreen
        level={state.currentLevel}
        config={config}
        shots={state.shots}
        hitCount={state.hitCount}
        missCount={state.missCount}
        avgReaction={avgReaction}
        score={state.score}
        isLastLevel={isLastLevel}
        onNext={nextLevel}
        onRestart={() => startLevel(state.currentLevel)}
        onMenu={goToMenu}
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
    border: `1px solid ${isShooting ? "rgba(0,255,170,0.25)" : isBlackout ? "rgba(255,50,50,0.3)" : "rgba(0,255,170,0.1)"}`,
    borderRadius: 4,
    background: isBlackout ? "#000" : "rgba(0,0,0,0.4)",
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
        @keyframes flash { to { opacity:0.2; } }
        @keyframes blackoutIn { from { opacity:0; } to { opacity:1; } }
        @keyframes fadeInOut { from { opacity:0; transform: translate(-50%,-60%); } to { opacity:1; transform: translate(-50%,-50%); } }
      `}</style>

      {/* BG grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "linear-gradient(rgba(0,255,170,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,170,0.03) 1px, transparent 1px)",
        backgroundSize: "40px 40px",
      }} />

      {/* HUD */}
      {(isShooting || isMemorize || isBlackout) && (
        <HUD
          phase={state.phase}
          level={state.currentLevel}
          config={config}
          score={state.score}
          hitCount={state.hitCount}
          missCount={state.missCount}
          timeLeft={state.shootingTimeLeft}
          totalTime={config.shootingTime}
        />
      )}

      {/* Arena */}
      <div ref={arenaRef} onClick={onArenaClick} style={arenaStyle}>

        {/* Memorize label */}
        {isMemorize && (
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            pointerEvents: "none", zIndex: 5,
            display: "flex", alignItems: "center", gap: 10,
            background: "rgba(0,255,170,0.1)", border: "1px solid rgba(0,255,170,0.3)",
            padding: "10px 24px", borderRadius: 4,
            color: "#00ffaa", fontSize: 20, fontWeight: 700, letterSpacing: 2,
            textTransform: "uppercase", animation: "fadeInOut 0.5s ease",
          }}>
            <span style={{ fontSize: 24 }}>👁</span>
            <span>จำตำแหน่งเป้าหมาย!</span>
          </div>
        )}

        {/* Blackout overlay */}
        {isBlackout && (
          <div style={{
            position: "absolute", inset: 0, background: "#000",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10, animation: "blackoutIn 0.15s ease",
          }}>
            <div style={{
              color: "#ff3232", fontSize: 32, fontWeight: 900,
              letterSpacing: 6, textTransform: "uppercase",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
            }}>
              <div style={{ fontSize: 48, animation: "flash 0.5s infinite alternate" }}>⚡</div>
              <div>เตรียมพร้อม...</div>
            </div>
          </div>
        )}

        {/* Targets */}
        {showTargets && state.targets.map((target) => {
          const isActive = target.isActive;
          const isHit = target.isHit;

          const ringOuterColor = isActive
            ? "rgba(255,80,80,0.7)"
            : isHit ? "rgba(0,255,100,0.3)"
            : isMemorize ? "rgba(0,200,255,0.5)"
            : "rgba(255,255,255,0.15)";
          const ringMidColor = isActive
            ? "rgba(255,80,80,0.85)"
            : isHit ? "rgba(0,255,100,0.4)"
            : isMemorize ? "rgba(0,200,255,0.6)"
            : "rgba(255,255,255,0.2)";
          const ringInnerColor = isActive
            ? "#ff5050"
            : isHit ? "rgba(0,255,100,0.5)"
            : isMemorize ? "rgba(0,200,255,0.8)"
            : "rgba(255,255,255,0.3)";
          const centerBg = isActive
            ? "#ff5050"
            : isHit ? "rgba(0,255,100,0.6)"
            : isMemorize ? "rgba(0,200,255,0.9)"
            : "rgba(255,255,255,0.4)";

          return (
            <div key={target.id} style={{
              position: "absolute",
              width: 64, height: 64,
              left: `${target.x}%`, top: `${target.y}%`,
              transform: "translate(-50%,-50%)",
              pointerEvents: "none",
            }}>
              <div style={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {/* Rings */}
                {[
                  { size: 60, color: ringOuterColor },
                  { size: 40, color: ringMidColor },
                  { size: 22, color: ringInnerColor },
                ].map((ring, i) => (
                  <div key={i} style={{
                    position: "absolute",
                    width: ring.size, height: ring.size,
                    borderRadius: "50%",
                    border: `2px solid ${ring.color}`,
                  }} />
                ))}
                <div style={{
                  width: 10, height: 10,
                  background: centerBg,
                  borderRadius: "50%",
                  ...(isActive ? { boxShadow: "0 0 10px #ff5050" } : {}),
                }} />
                {isActive && (
                  <div style={{
                    position: "absolute",
                    width: 64, height: 64,
                    borderRadius: "50%",
                    border: "2px solid rgba(255,80,80,0.6)",
                    animation: "pulseRing 0.7s ease-out infinite",
                  }} />
                )}
                {isHit && (
                  <div style={{
                    position: "absolute",
                    fontSize: 20, color: "#00ff64",
                    fontWeight: 900, textShadow: "0 0 10px #00ff64", zIndex: 2,
                  }}>✓</div>
                )}
              </div>
              {isMemorize && (
                <div style={{
                  position: "absolute", top: -22, left: "50%", transform: "translateX(-50%)",
                  color: "rgba(0,200,255,0.9)", fontSize: 13, fontWeight: 700, letterSpacing: 1,
                  background: "rgba(0,0,0,0.6)", padding: "1px 6px", borderRadius: 3, whiteSpace: "nowrap",
                }}>
                  {target.id + 1}
                </div>
              )}
            </div>
          );
        })}

        {/* Shot effects */}
        {shotEffects.map((effect) => (
          <div key={effect.id} style={{
            position: "absolute",
            width: 20, height: 20,
            borderRadius: "50%",
            pointerEvents: "none",
            left: `${effect.x}%`, top: `${effect.y}%`,
            transform: "translate(-50%,-50%)",
            animation: "shotAnim 0.5s ease-out forwards",
            zIndex: 20,
            background: effect.hit
              ? "radial-gradient(circle, rgba(0,255,100,0.9), rgba(0,255,100,0))"
              : "radial-gradient(circle, rgba(255,80,80,0.9), rgba(255,80,80,0))",
            boxShadow: effect.hit
              ? "0 0 20px rgba(0,255,100,0.8)"
              : "0 0 15px rgba(255,80,80,0.6)",
          }} />
        ))}

        {/* Waiting signal */}
        {isShooting && state.activeTargetId === null && (
          <div style={{
            position: "absolute", bottom: 24, left: "50%", transform: "translateX(-50%)",
            display: "flex", alignItems: "center", gap: 10,
            color: "rgba(255,255,255,0.4)", fontSize: 14, letterSpacing: 3, textTransform: "uppercase",
          }}>
            <div style={{
              width: 8, height: 8,
              background: "rgba(0,255,170,0.6)",
              borderRadius: "50%",
              animation: "blink 1s ease infinite",
            }} />
            <span>รอสัญญาณ...</span>
          </div>
        )}
      </div>
    </div>
  );
}

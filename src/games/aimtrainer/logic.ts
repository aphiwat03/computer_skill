import { useState, useCallback, useRef, useEffect } from "react";
import type { GameState, Target, Shot, LevelConfig, GameResult } from "../aimtrainer/types";
import { LEVELS } from "../aimtrainer/types";

function generateTargets(count: number): Target[] {
  const targets: Target[] = [];
  const margin = 12;
  const attempts = 200;

  for (let i = 0; i < count; i++) {
    let placed = false;
    for (let a = 0; a < attempts; a++) {
      const x = margin + Math.random() * (100 - margin * 2);
      const y = margin + Math.random() * (100 - margin * 2);
      const tooClose = targets.some((t) => {
        const dx = t.x - x;
        const dy = t.y - y;
        return Math.sqrt(dx * dx + dy * dy) < 18;
      });
      if (!tooClose) {
        targets.push({ id: i, x, y, isActive: false, isHit: false });
        placed = true;
        break;
      }
    }
    if (!placed) {
      targets.push({
        id: i,
        x: margin + Math.random() * (100 - margin * 2),
        y: margin + Math.random() * (100 - margin * 2),
        isActive: false,
        isHit: false,
      });
    }
  }
  return targets;
}

const initialState: GameState = {
  phase: "menu",
  currentLevel: 1,
  targets: [],
  shots: [],
  activeTargetId: null,
  score: 0,
  lives: 3,
  missCount: 0,
  hitCount: 0,
  currentReactionStart: null,
  levelComplete: false,
  startedAt: "",
  totalTime: 0,
  shootingTimeLeft: 0,
};

export function useGame(playerId: string, sessionId: string, onGameComplete: (result: GameResult) => void) {
  const [state, setState] = useState<GameState>(initialState);
  const signalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shootingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const clearAllTimers = useCallback(() => {
    if (signalTimerRef.current) clearTimeout(signalTimerRef.current);
    if (shootingTimerRef.current) clearTimeout(shootingTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    signalTimerRef.current = null;
    shootingTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const getLevelConfig = useCallback((level: number): LevelConfig => {
    return LEVELS[Math.min(level - 1, LEVELS.length - 1)];
  }, []);

  const scheduleNextSignal = useCallback((levelConfig: LevelConfig) => {
    if (signalTimerRef.current) clearTimeout(signalTimerRef.current);

    signalTimerRef.current = setTimeout(() => {
      setState((prev) => {
        if (prev.phase !== "shooting") return prev;
        const unhitTargets = prev.targets.filter((t) => !t.isHit);
        if (unhitTargets.length === 0) return prev;
        const rand = unhitTargets[Math.floor(Math.random() * unhitTargets.length)];
        const updatedTargets = prev.targets.map((t) => ({
          ...t,
          isActive: t.id === rand.id,
          activatedAt: t.id === rand.id ? Date.now() : t.activatedAt,
        }));
        return {
          ...prev,
          targets: updatedTargets,
          activeTargetId: rand.id,
          currentReactionStart: Date.now(),
        };
      });
    }, levelConfig.signalInterval);
  }, []);

  const startLevel = useCallback(
    (level: number) => {
      clearAllTimers();
      const config = getLevelConfig(level);
      const targets = generateTargets(config.targetCount);

      setState((prev) => ({
        ...prev,
        phase: "memorize",
        startedAt: new Date().toISOString(), 
        currentLevel: level,
        targets,
        shots: [],
        activeTargetId: null,
        missCount: 0,
        hitCount: 0,
        currentReactionStart: null,
        levelComplete: false,
        shootingTimeLeft: config.shootingTime,
      }));

      signalTimerRef.current = setTimeout(() => {
        setState((prev) => ({ ...prev, phase: "blackout" }));

        signalTimerRef.current = setTimeout(() => {
          setState((prev) => ({
            ...prev,
            phase: "shooting",
            shootingTimeLeft: config.shootingTime,
          }));

          countdownRef.current = setInterval(() => {
            setState((prev) => {
              if (prev.phase !== "shooting") return prev;
              const next = prev.shootingTimeLeft - 100;
              if (next <= 0) {
                return { ...prev, shootingTimeLeft: 0 };
              }
              return { ...prev, shootingTimeLeft: next };
            });
          }, 100);

          shootingTimerRef.current = setTimeout(() => {
            clearAllTimers();
            buildAndSendResult(stateRef.current);
            setState((prev) => ({
              ...prev,
              phase: "result",
              shootingTimeLeft: 0,
            }));
          }, config.shootingTime);

          scheduleNextSignal(config);
        }, config.blackoutTime);
      }, config.memorizeTime);
    },
    [clearAllTimers, getLevelConfig, scheduleNextSignal]
  );

  const handleShoot = useCallback(
    (x: number, y: number) => {
      setState((prev) => {
        if (prev.phase !== "shooting") return prev;
        const config = getLevelConfig(prev.currentLevel);
        const now = Date.now();

        const activeTarget = prev.targets.find(
          (t) => t.id === prev.activeTargetId && t.isActive
        );
        let hit = false;
        let hitTargetId: number | null = null;
        const hitRadius = 9;

        if (activeTarget) {
          const dx = activeTarget.x - x;
          const dy = activeTarget.y - y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < hitRadius) {
            hit = true;
            hitTargetId = activeTarget.id;
          }
        }

        const reactionTime = prev.currentReactionStart
          ? now - prev.currentReactionStart
          : undefined;

        const newShot: Shot = { x, y, hit, reactionTime, timestamp: now };

        let updatedTargets = prev.targets;
        let newActiveId = prev.activeTargetId;
        let newReactionStart = prev.currentReactionStart;

        if (hit && hitTargetId !== null) {
          updatedTargets = prev.targets.map((t) =>
            t.id === hitTargetId ? { ...t, isHit: true, isActive: false } : t
          );
          newActiveId = null;
          newReactionStart = null;

          if (signalTimerRef.current) clearTimeout(signalTimerRef.current);
          signalTimerRef.current = setTimeout(() => {
            setState((s) => {
              if (s.phase !== "shooting") return s;
              const unhit = s.targets.filter((t) => !t.isHit);
              if (unhit.length === 0) {
                clearAllTimers();
                return { ...s, phase: "result", activeTargetId: null };
              }
              const rand = unhit[Math.floor(Math.random() * unhit.length)];
              return {
                ...s,
                targets: s.targets.map((t) => ({
                  ...t,
                  isActive: t.id === rand.id,
                  activatedAt: t.id === rand.id ? Date.now() : t.activatedAt,
                })),
                activeTargetId: rand.id,
                currentReactionStart: Date.now(),
              };
            });
          }, 400);
        } else {
          scheduleNextSignal(config);
        }

        const allHit = updatedTargets.every((t) => t.isHit);
        if (allHit) {
          clearAllTimers();
          buildAndSendResult(stateRef.current);  
        }

        return {
          ...prev,
          shots: [...prev.shots, newShot],
          targets: updatedTargets,
          activeTargetId: newActiveId,
          hitCount: hit ? prev.hitCount + 1 : prev.hitCount,
          missCount: hit ? prev.missCount : prev.missCount + 1,
          currentReactionStart: newReactionStart,
          phase: allHit ? "result" : prev.phase,
          score: hit
            ? prev.score +
              Math.max(100, 500 - Math.floor((reactionTime || 1000) / 10))
            : prev.score,
        };
      });
    },
    [getLevelConfig, scheduleNextSignal, clearAllTimers]
  );

  const nextLevel = useCallback(() => {
    const nextLvl = stateRef.current.currentLevel + 1;
    if (nextLvl > LEVELS.length) {
        buildAndSendResult(stateRef.current);    
      setState((prev) => ({ ...prev, phase: "gameover", levelComplete: true }));
    } else {
      startLevel(nextLvl);
    }
  }, [startLevel]);

  const restartGame = useCallback(() => {
    clearAllTimers();
    setState({ ...initialState });
  }, [clearAllTimers]);

  const buildAndSendResult = useCallback((finalState: GameState) => {
  const endedAt = new Date().toISOString();
  const durationMs = Date.now() - new Date(finalState.startedAt).getTime();
  const config = getLevelConfig(finalState.currentLevel);
  const hits = finalState.shots.filter((s) => s.hit);

  const result: GameResult = {
    gameId:   "target-ghost",
    gameName: "Target Ghost",
    playerId,
    sessionId,

    score:           finalState.score,
    accuracy:        config.targetCount > 0
                       ? finalState.hitCount / config.targetCount
                       : 0,
    reactionTimeMs:  hits.length > 0
                       ? Math.round(hits.reduce((a, s) => a + (s.reactionTime ?? 0), 0) / hits.length)
                       : undefined,
    responseTimesMs: hits.map((s) => s.reactionTime ?? 0),

    startedAt:  finalState.startedAt,
    endedAt,
    durationMs,

    rawData: {
      finalLevel:    finalState.currentLevel,
      levelComplete: finalState.levelComplete,
      hitCount:      finalState.hitCount,
      missCount:     finalState.missCount,
      shots:         finalState.shots,
    },
  };

  onGameComplete(result);
}, [playerId, sessionId, getLevelConfig, onGameComplete]);

  const goToMenu = useCallback(() => {
    clearAllTimers();
    setState({ ...initialState });
  }, [clearAllTimers]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  return {
    state,
    getLevelConfig,
    startLevel,
    handleShoot,
    nextLevel,
    restartGame,
    goToMenu,
  };
}

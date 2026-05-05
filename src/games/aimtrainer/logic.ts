import { useState, useCallback, useRef, useEffect } from "react";
import type {
  GameState,
  Target,
  Shot,
  LevelConfig,
  GameResult,
} from "../aimtrainer/types";
import { LEVELS } from "../aimtrainer/types";

const INITIAL_SIGNAL_DELAY_MS = 3000;
const HIT_RADIUS = 9;
const CENTER_HIT_RADIUS = HIT_RADIUS * 0.3;
const EARLY_CLICK_PENALTY = 150;
const MISS_PENALTY = 50;

function getAimScore(distanceFromCenter: number) {
  const precision = Math.max(0, 1 - distanceFromCenter / HIT_RADIUS);
  return Math.round(precision * 150);
}

function getAverage(values: number[]) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

function getStandardDeviation(values: number[]) {
  if (values.length === 0) return 0;
  const average = getAverage(values);
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) /
    values.length;
  return Math.sqrt(variance);
}

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

function activateRandomTarget(targets: Target[]) {
  const unhitTargets = targets.filter((t) => !t.isHit);
  if (unhitTargets.length === 0) {
    return {
      targets,
      activeTargetId: null,
      currentReactionStart: null,
    };
  }

  const activeTarget =
    unhitTargets[Math.floor(Math.random() * unhitTargets.length)];
  const activatedAt = Date.now();

  return {
    targets: targets.map((t) => ({
      ...t,
      isActive: t.id === activeTarget.id,
      activatedAt: t.id === activeTarget.id ? activatedAt : t.activatedAt,
    })),
    activeTargetId: activeTarget.id,
    currentReactionStart: activatedAt,
  };
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
  centerHitCount: 0,
  earlyClickCount: 0,
  currentReactionStart: null,
  lastHitAt: null,
  levelComplete: false,
  startedAt: "",
  totalTime: 0,
  shootingTimeLeft: 0,
};

export function useGame(
  playerId: string,
  sessionId: string,
  onGameComplete: (result: GameResult) => void,
) {
  const [state, setState] = useState<GameState>(initialState);
  const levelResultsRef = useRef<any[]>([]);
  const initialStartTimeRef = useRef<string>(new Date().toISOString());
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
        const nextSignal = activateRandomTarget(prev.targets);
        if (nextSignal.activeTargetId === null) return prev;
        return {
          ...prev,
          targets: nextSignal.targets,
          activeTargetId: nextSignal.activeTargetId,
          currentReactionStart: nextSignal.currentReactionStart,
        };
      });
    }, levelConfig.signalInterval);
  }, []);

  const startLevel = useCallback(
    (level: number) => {
      clearAllTimers();
      const config = getLevelConfig(level);
      const targets = generateTargets(config.targetCount);

      const startedAtTime =
        levelResultsRef.current.length === 0
          ? initialStartTimeRef.current
          : stateRef.current.startedAt;

      setState((prev) => ({
        ...prev,
        phase: "shooting",
        startedAt: startedAtTime,
        currentLevel: level,
        targets,
        shots: [],
        activeTargetId: null,
        missCount: 0,
        hitCount: 0,
        centerHitCount: 0,
        earlyClickCount: 0,
        currentReactionStart: null,
        lastHitAt: null,
        levelComplete: false,
        shootingTimeLeft: config.shootingTime,
      }));

      signalTimerRef.current = setTimeout(() => {
        setState((prev) => {
          if (prev.phase !== "shooting" || prev.currentLevel !== level) {
            return prev;
          }
          const firstSignal = activateRandomTarget(prev.targets);
          return {
            ...prev,
            targets: firstSignal.targets,
            activeTargetId: firstSignal.activeTargetId,
            currentReactionStart: firstSignal.currentReactionStart,
          };
        });

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
          setState((prev) => ({
            ...prev,
            phase: "result",
            shootingTimeLeft: 0,
          }));
        }, config.shootingTime);
      }, INITIAL_SIGNAL_DELAY_MS);
    },
    [clearAllTimers, getLevelConfig],
  );

  const handleShoot = useCallback(
    (x: number, y: number) => {
      setState((prev) => {
        if (prev.phase !== "shooting") return prev;
        const config = getLevelConfig(prev.currentLevel);
        const now = Date.now();

        const activeTarget = prev.targets.find(
          (t) => t.id === prev.activeTargetId && t.isActive,
        );
        let hit = false;
        let hitTargetId: number | null = null;
        let distanceFromCenter: number | undefined;

        if (activeTarget) {
          const dx = activeTarget.x - x;
          const dy = activeTarget.y - y;
          distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
          if (distanceFromCenter < HIT_RADIUS) {
            hit = true;
            hitTargetId = activeTarget.id;
          }
        }

        const isEarlyClick = !activeTarget;
        const reactionTime = activeTarget && prev.currentReactionStart
          ? now - prev.currentReactionStart
          : undefined;
        const switchTime = hit && prev.lastHitAt ? now - prev.lastHitAt : undefined;
        const isCenterHit =
          hit && distanceFromCenter !== undefined
            ? distanceFromCenter <= CENTER_HIT_RADIUS
            : false;
        const accuracyScore =
          hit && distanceFromCenter !== undefined
            ? getAimScore(distanceFromCenter)
            : 0;
        const reactionScore = hit
          ? Math.max(100, 500 - Math.floor((reactionTime || 1000) / 10))
          : 0;
        const scoreDelta = hit
          ? reactionScore + accuracyScore + (isCenterHit ? 150 : 0)
          : isEarlyClick
            ? -EARLY_CLICK_PENALTY
            : -MISS_PENALTY;

        const newShot: Shot = {
          x,
          y,
          hit,
          targetId: activeTarget?.id ?? prev.activeTargetId,
          reactionTime,
          switchTime,
          distanceFromCenter,
          accuracyScore,
          isCenterHit,
          isEarlyClick,
          scoreDelta,
          timestamp: now,
        };

        let updatedTargets = prev.targets;
        let newActiveId: number | null = prev.activeTargetId;
        let newReactionStart = prev.currentReactionStart;
        let newLastHitAt = prev.lastHitAt;

        if (hit && hitTargetId !== null) {
          updatedTargets = prev.targets.map((t) =>
            t.id === hitTargetId ? { ...t, isHit: true, isActive: false } : t,
          );
          newActiveId = null;
          newReactionStart = null;
          newLastHitAt = now;

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
        } else if (!isEarlyClick) {
          scheduleNextSignal(config);
        }

        const allHit = updatedTargets.every((t) => t.isHit);
        if (allHit) clearAllTimers();

        return {
          ...prev,
          shots: [...prev.shots, newShot],
          targets: updatedTargets,
          activeTargetId: newActiveId,
          hitCount: hit ? prev.hitCount + 1 : prev.hitCount,
          centerHitCount: isCenterHit
            ? prev.centerHitCount + 1
            : prev.centerHitCount,
          earlyClickCount: isEarlyClick
            ? prev.earlyClickCount + 1
            : prev.earlyClickCount,
          missCount: hit ? prev.missCount : prev.missCount + 1,
          currentReactionStart: newReactionStart,
          lastHitAt: newLastHitAt,
          phase: allHit ? "result" : prev.phase,
          score: Math.max(0, prev.score + scoreDelta),
        };
      });
    },
    [getLevelConfig, scheduleNextSignal, clearAllTimers],
  );

  const nextLevel = useCallback(() => {
    const nextLvl = stateRef.current.currentLevel + 1;
    if (nextLvl > LEVELS.length) {
      setState((prev) => ({ ...prev, phase: "gameover", levelComplete: true }));
    } else {
      const currentLevelResult = {
        level: stateRef.current.currentLevel,
        shots: stateRef.current.shots,
        score: stateRef.current.score,
        hitCount: stateRef.current.hitCount,
        missCount: stateRef.current.missCount,
        centerHitCount: stateRef.current.centerHitCount,
        earlyClickCount: stateRef.current.earlyClickCount,
      };
      levelResultsRef.current = [
        ...levelResultsRef.current,
        currentLevelResult,
      ];
      startLevel(nextLvl);
    }
  }, [startLevel]);

  const restartGame = useCallback(() => {
    clearAllTimers();
    levelResultsRef.current = [];
    initialStartTimeRef.current = new Date().toISOString();
    setState({ ...initialState });
  }, [clearAllTimers]);

  const buildResult = useCallback(
    (finalState: GameState): GameResult => {
      const endedAt = new Date().toISOString();
      const durationMs =
        Date.now() - new Date(initialStartTimeRef.current).getTime();
      const currentLevelResult = {
        level: finalState.currentLevel,
        shots: finalState.shots,
        score: finalState.score,
        hitCount: finalState.hitCount,
        missCount: finalState.missCount,
        centerHitCount: finalState.centerHitCount,
        earlyClickCount: finalState.earlyClickCount,
      };
      const allResults = [...levelResultsRef.current, currentLevelResult];

      const allShots = allResults.flatMap((r) => r.shots);
      const totalHits = allResults.reduce((sum, r) => sum + r.hitCount, 0);
      const totalMisses = allResults.reduce((sum, r) => sum + r.missCount, 0);
      const totalCenterHits = allResults.reduce(
        (sum, r) => sum + (r.centerHitCount ?? 0),
        0,
      );
      const totalEarlyClicks = allResults.reduce(
        (sum, r) => sum + (r.earlyClickCount ?? 0),
        0,
      );
      const totalScore = finalState.score;
      const hits = allShots.filter((s) => s.hit);
      const reactionTimes = hits.map((s) => s.reactionTime ?? 0);
      const switchTimes = hits
        .map((s) => s.switchTime)
        .filter((time): time is number => typeof time === "number");
      const consistencyMs = Math.round(getStandardDeviation(reactionTimes));

      return {
        gameId: "aimtrainer", // ✅ ตั้งชื่อให้ตรงกับหน้า GameSelector
        gameName: "Target Ghost",
        playerId,
        sessionId,
        score: totalScore,
        accuracy:
          allShots.length > 0 ? (hits.length / allShots.length) * 100 : 0,
        reactionTimeMs:
          reactionTimes.length > 0 ? Math.round(getAverage(reactionTimes)) : 0,
        responseTimesMs: reactionTimes,
        startedAt: initialStartTimeRef.current,
        endedAt,
        durationMs,
        rawData: {
          finalLevel: finalState.currentLevel,
          levelComplete: finalState.levelComplete,
          hitCount: totalHits,
          missCount: totalMisses,
          centerHitCount: totalCenterHits,
          earlyClickCount: totalEarlyClicks,
          averageSwitchTimeMs:
            switchTimes.length > 0 ? Math.round(getAverage(switchTimes)) : 0,
          consistencyMs,
          shots: allShots,
          levelResults: allResults,
        },
      };
    },
    [playerId, sessionId],
  );

  const goToMenu = useCallback(() => {
    clearAllTimers();
    setState({ ...initialState });
    levelResultsRef.current = [];
  }, [clearAllTimers]);

  const submitAndExit = useCallback(() => {
    clearAllTimers();
    const finalResult = buildResult(stateRef.current);
    onGameComplete(finalResult);
    setState({ ...initialState });
    levelResultsRef.current = [];
  }, [clearAllTimers, buildResult, onGameComplete]);

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
    submitAndExit,
  };
}

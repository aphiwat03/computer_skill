import { useState, useCallback, useRef, useEffect } from "react";
import type {
  GameState,
  Target,
  Shot,
  LevelConfig,
  GameResult,
  PerTargetDistances,
} from "./types";
import { LEVELS, TARGET_HIT_RADIUS_PX } from "./types";

// ==================== Game Constants ====================

const HIT_RADIUS_PX = TARGET_HIT_RADIUS_PX;
const CENTER_HIT_RADIUS_PX = HIT_RADIUS_PX * 0.3;
const EARLY_CLICK_PENALTY = 150;
const MISS_PENALTY = 50;

// ==================== Scoring Functions ====================

function getAimScore(distanceFromCenter: number) {
  const precision = Math.max(0, 1 - distanceFromCenter / HIT_RADIUS_PX);
  return Math.round(precision * 150);
}

// ==================== Statistical Functions ====================

interface ArenaSize {
  width: number;
  height: number;
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

// ==================== Target Management Functions ====================

function generateTargets(
  count: number,
  segmentDistances: number[], // ระยะทาง px ของแต่ละ segment (i → i+1), ความยาว = count-1
  arenaSize: ArenaSize,
): Target[] {
  const targets: Target[] = [];
  const margin = 12;

  const w = arenaSize.width > 0 ? arenaSize.width : 800;
  const h = arenaSize.height > 0 ? arenaSize.height : 600;

  // helper: ดึงระยะทางของ segment i (fallback ไปค่าสุดท้ายถ้า array สั้นกว่า)
  const getDist = (i: number) => {
    const arr = segmentDistances.length > 0 ? segmentDistances : [250];
    return arr[Math.min(i, arr.length - 1)];
  };

  for (let i = 0; i < count; i++) {
    if (i === 0) {
      targets.push({
        id: 0,
        x: margin,
        y: margin,
        isActive: false,
        isHit: false,
      });
    } else {
      const distancePx = getDist(i - 1); // segment i-1 → i
      let placed = false;
      let attempts = 0;
      const maxAttempts = 200;
      const prevTarget = targets[i - 1];

      while (!placed && attempts < maxAttempts) {
        const angleRad = Math.random() * Math.PI * 2;

        const deltaXPx = distancePx * Math.cos(angleRad);
        const deltaYPx = distancePx * Math.sin(angleRad);

        const newX = prevTarget.x + (deltaXPx / w) * 100;
        const newY = prevTarget.y + (deltaYPx / h) * 100;

        const inBounds =
          newX >= margin &&
          newX <= 100 - margin &&
          newY >= margin &&
          newY <= 100 - margin;
        const minSpacing = Math.min(distancePx * 0.8, 80);
        const tooClose = targets.some((t) => {
          const dxPx = ((t.x - newX) / 100) * w;
          const dyPx = ((t.y - newY) / 100) * h;
          return Math.sqrt(dxPx * dxPx + dyPx * dyPx) < minSpacing;
        });

        if (inBounds && !tooClose) {
          targets.push({
            id: i,
            x: newX,
            y: newY,
            isActive: false,
            isHit: false,
          });
          placed = true;
        }
        attempts++;
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
  }
  return targets;
}

// ==================== Initial Game State ====================

const initialState: GameState = {
  phase: "menu",
  currentLevel: 1,
  targets: [],
  shots: [],
  activeTargetId: null,
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
  hasStartedShooting: false,
  isTimerPaused: false,
  finalStats: {
    accuracy: 0,
    avgReaction: 0,
    avgSwitch: 0,
    consistencyMs: 0,
    stabilityStatus: "N/A",
  },
};

// ==================== Main Game Logic Hook ====================

export function useGame(
  playerId: string,
  sessionId: string,
  onGameComplete: (result: GameResult) => void,
  levelDistances: PerTargetDistances,
  arenaSize: { width: number; height: number },
) {
  const [state, setState] = useState<GameState>(initialState);
  const levelResultsRef = useRef<any[]>([]);
  const initialStartTimeRef = useRef<string>(new Date().toISOString());
  const signalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Tracking refs
  const isCurrentlyWaitingRef = useRef<boolean>(false);
  const trueReactionTimeRef = useRef<number | null>(null);
  const mouseStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const waitTargetPxPosRef = useRef<{ x: number; y: number } | null>(null);

  const clearAllTimers = useCallback(() => {
    if (signalTimerRef.current) clearTimeout(signalTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    signalTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const getLevelConfig = useCallback((level: number): LevelConfig => {
    return LEVELS[Math.min(level - 1, LEVELS.length - 1)];
  }, []);

  useEffect(() => {
    if (
      state.phase === "shooting" &&
      state.hasStartedShooting &&
      !state.isTimerPaused
    ) {
      if (!countdownRef.current) {
        countdownRef.current = setInterval(() => {
          setState((prev) => {
            if (prev.phase !== "shooting" || prev.isTimerPaused) return prev;
            const next = prev.shootingTimeLeft - 100;
            return { ...prev, shootingTimeLeft: Math.max(0, next) };
          });
        }, 100);
      }
    } else {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [state.phase, state.hasStartedShooting, state.isTimerPaused]);

  useEffect(() => {
    if (state.phase === "shooting" && state.shootingTimeLeft <= 0) {
      clearAllTimers();
      setState((prev) =>
        prev.phase === "result" ? prev : { ...prev, phase: "result" },
      );
    }
  }, [state.phase, state.shootingTimeLeft, clearAllTimers]);

  const startLevel = useCallback(
    (level: number) => {
      clearAllTimers();
      const config = getLevelConfig(level);
      const segmentDistances: number[] = levelDistances[level] ?? [250];
      const targets = generateTargets(
        config.targetCount,
        segmentDistances,
        arenaSize,
      );

      const startedAtTime =
        levelResultsRef.current.length === 0
          ? initialStartTimeRef.current
          : stateRef.current.startedAt;

      // เปิดเป้าแรกทันที แต่ยังไม่เริ่มเวลา
      targets[0].isActive = true;
      targets[0].activatedAt = Date.now();

      // Reset kinematic tracking
      isCurrentlyWaitingRef.current = false;
      trueReactionTimeRef.current = null;
      mouseStartPosRef.current = null;

      setState((prev) => ({
        ...prev,
        phase: "shooting",
        startedAt: startedAtTime,
        currentLevel: level,
        targets,
        shots: [],
        activeTargetId: 0,
        missCount: 0,
        hitCount: 0,
        centerHitCount: 0,
        earlyClickCount: 0,
        currentReactionStart: Date.now(),
        lastHitAt: null,
        levelComplete: false,
        shootingTimeLeft: config.shootingTime,
        hasStartedShooting: false,
      }));
    },
    [clearAllTimers, getLevelConfig, levelDistances, arenaSize],
  );

  const handleShoot = useCallback(
    (x: number, y: number, arenaSize: ArenaSize) => {
      setState((prev) => {
        if (prev.phase !== "shooting") return prev;
        const now = Date.now();

        const activeTarget = prev.targets.find(
          (t) => t.id === prev.activeTargetId && t.isActive,
        );
        let hit = false;
        let hitTargetId: number | null = null;
        let distanceFromCenter: number | undefined;

        if (activeTarget) {
          const dx = ((activeTarget.x - x) / 100) * arenaSize.width;
          const dy = ((activeTarget.y - y) / 100) * arenaSize.height;
          distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
          if (distanceFromCenter <= HIT_RADIUS_PX) {
            hit = true;
            hitTargetId = activeTarget.id;
          }
        }

        const isEarlyClick = !activeTarget;

        const reactionTime =
          trueReactionTimeRef.current ??
          (activeTarget && prev.currentReactionStart
            ? now - prev.currentReactionStart
            : undefined);

        let switchTime =
          hit && prev.lastHitAt ? now - prev.lastHitAt : undefined;

        if (switchTime !== undefined && reactionTime !== undefined) {
          switchTime = Math.max(0, switchTime - reactionTime);
        }

        const isCenterHit =
          hit && distanceFromCenter !== undefined
            ? distanceFromCenter <= CENTER_HIT_RADIUS_PX
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
          isCenterHit,
          isEarlyClick,
          timestamp: now,
        };

        let updatedTargets = prev.targets;
        let newActiveId: number | null = prev.activeTargetId;
        let newReactionStart = prev.currentReactionStart;
        let newLastHitAt = prev.lastHitAt;

        let newTimerPaused = prev.isTimerPaused;

        if (hit && hitTargetId !== null) {
          const isLastTarget = hitTargetId === prev.targets.length - 1;

          if (isLastTarget) {
            updatedTargets = prev.targets.map((t) =>
              t.id === hitTargetId ? { ...t, isHit: true, isActive: false } : t,
            );
            newActiveId = null;
            newReactionStart = null;
            newLastHitAt = now;

            if (signalTimerRef.current) clearTimeout(signalTimerRef.current);
          } else {
            updatedTargets = prev.targets.map((t) =>
              t.id === hitTargetId ? { ...t, isWaiting: true } : t,
            );
            newTimerPaused = true;
            isCurrentlyWaitingRef.current = true;
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }

            const delay = 1000 + Math.random() * 2000;

            waitTargetPxPosRef.current = {
              x: (activeTarget!.x / 100) * arenaSize.width,
              y: (activeTarget!.y / 100) * arenaSize.height,
            };

            if (signalTimerRef.current) clearTimeout(signalTimerRef.current);
            signalTimerRef.current = setTimeout(() => {
              isCurrentlyWaitingRef.current = false;
              setState((s) => {
                if (s.phase !== "shooting") return s;

                const nextTargetId = hitTargetId! + 1;
                const nextTarget = s.targets.find((t) => t.id === nextTargetId);

                return {
                  ...s,
                  isTimerPaused: false,
                  targets: s.targets.map((t) => {
                    if (t.id === hitTargetId) {
                      return {
                        ...t,
                        isWaiting: false,
                        isHit: true,
                        isActive: false,
                      };
                    }
                    if (t.id === nextTargetId) {
                      return { ...t, isActive: true, activatedAt: Date.now() };
                    }
                    return t;
                  }),
                  activeTargetId: nextTargetId,
                  currentReactionStart: Date.now(),
                  lastHitAt: Date.now(),
                };
              });

              trueReactionTimeRef.current = null;
            }, delay);
          }
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
          hasStartedShooting: prev.hasStartedShooting || hit,
          isTimerPaused: newTimerPaused,
        };
      });
    },
    [clearAllTimers],
  );

  const nextLevel = useCallback(() => {
    const nextLvl = stateRef.current.currentLevel + 1;
    const config = getLevelConfig(stateRef.current.currentLevel);

    const currentLevelResult = {
      level: stateRef.current.currentLevel,
      targetCount: config.targetCount,
      shots: stateRef.current.shots,
      hitCount: stateRef.current.hitCount,
      missCount: stateRef.current.missCount,
      centerHitCount: stateRef.current.centerHitCount,
      earlyClickCount: stateRef.current.earlyClickCount,
    };

    if (nextLvl > LEVELS.length) {
      const allResults = [...levelResultsRef.current, currentLevelResult];
      levelResultsRef.current = allResults;
      const allShots = allResults.flatMap((r) => r.shots || []);
      const hits = allShots.filter((s) => s.hit);
      const accuracy =
        allShots.length > 0
          ? Math.round((hits.length / allShots.length) * 100)
          : 0;

      const validTimingHits = allResults.flatMap((r) => {
        const lastId = r.targetCount - 1;
        return (r.shots || []).filter((s: any) => {
          return s.hit && s.targetId !== 0 && s.targetId !== lastId;
        });
      });

      const reactionTimes = validTimingHits
        .map((s: any) => s.reactionTime ?? 0)
        .filter((t: number) => t > 0);
      const avgReaction =
        reactionTimes.length > 0
          ? Math.round(
              reactionTimes.reduce((a: number, b: number) => a + b, 0) /
                reactionTimes.length,
            )
          : 0;

      const switchTimes = validTimingHits
        .map((s: any) => s.switchTime)
        .filter((time: any): time is number => typeof time === "number");
      const avgSwitch =
        switchTimes.length > 0
          ? Math.round(
              switchTimes.reduce((a: number, b: number) => a + b, 0) /
                switchTimes.length,
            )
          : 0;

      const validLevelSDs = allResults
        .map((r) => {
          const lastId = r.targetCount - 1;
          const levelValidHits = (r.shots || []).filter(
            (s: any) => s.hit && s.targetId !== 0 && s.targetId !== lastId,
          );
          const levelSwitchTimes = levelValidHits
            .map((s: any) => s.switchTime)
            .filter((time: any): time is number => typeof time === "number");
          return Math.round(getStandardDeviation(levelSwitchTimes));
        })
        .filter((sd) => sd > 0);

      const consistencyMs =
        validLevelSDs.length > 0
          ? Math.round(
              validLevelSDs.reduce((sum, sd) => sum + sd, 0) /
                validLevelSDs.length,
            )
          : 0;

      const stabilityStatus = consistencyMs > 150 ? "Unstable" : "Stable";

      setState((prev) => ({
        ...prev,
        phase: "gameover",
        levelComplete: true,
        finalStats: {
          accuracy,
          avgReaction,
          avgSwitch,
          consistencyMs,
          stabilityStatus,
        },
      }));
    } else {
      levelResultsRef.current = [
        ...levelResultsRef.current,
        currentLevelResult,
      ];
      startLevel(nextLvl);
    }
  }, [startLevel, getLevelConfig]);

  const restartGame = useCallback(() => {
    clearAllTimers();
    levelResultsRef.current = [];
    initialStartTimeRef.current = new Date().toISOString();
    setState({ ...initialState });
  }, [clearAllTimers]);

  const buildResult = useCallback(
    (finalState: GameState): GameResult => {
      const endedAt = new Date().toISOString();
      const config = getLevelConfig(finalState.currentLevel);

      const rawLevelResults =
        finalState.phase === "gameover"
          ? levelResultsRef.current
          : [
              ...levelResultsRef.current,
              {
                level: finalState.currentLevel,
                targetCount: config.targetCount,
                shots: finalState.shots,
                hitCount: finalState.hitCount,
                missCount: finalState.missCount,
              },
            ];

      const processedLevelResults = rawLevelResults.map((level) => {
        const lastId = level.targetCount - 1;
        const levelValidHits = level.shots.filter(
          (s: any) => s.hit && s.targetId !== 0 && s.targetId !== lastId,
        );
        const levelSwitchTimes = levelValidHits
          .map((s: any) => s.switchTime)
          .filter((t: any): t is number => typeof t === "number");
        const levelSD = Math.round(getStandardDeviation(levelSwitchTimes));

        return {
          level: level.level,
          hitCount: level.hitCount,
          missCount: level.missCount,
          consistencyMs: levelSD,
          stabilityStatus: levelSD > 150 ? "Unstable" : "Stable",
          shots: level.shots.map((s: any) => ({
            x: s.x,
            y: s.y,
            hit: s.hit,
            reactionTime: s.reactionTime,
            switchTime: s.switchTime,
          })),
        };
      });

      const allShots = rawLevelResults.flatMap((r) => r.shots);
      const hits = allShots.filter((s) => s.hit);

      const allValidHits = rawLevelResults.flatMap((r) => {
        const lastId = r.targetCount - 1;
        return (r.shots || []).filter((s: any) => {
          return s.hit && s.targetId !== 0 && s.targetId !== lastId;
        });
      });

      const reactionTimes = allValidHits
        .map((s: any) => s.reactionTime ?? 0)
        .filter((t: number) => t > 0);
      const switchTimes = allValidHits
        .map((s: any) => s.switchTime)
        .filter((t: any): t is number => typeof t === "number");

      const validLevelSDs = processedLevelResults
        .map((level) => level.consistencyMs)
        .filter((sd) => sd > 0);

      const consistencyMs =
        validLevelSDs.length > 0
          ? Math.round(
              validLevelSDs.reduce((sum, sd) => sum + sd, 0) /
                validLevelSDs.length,
            )
          : 0;

      const stabilityStatus = consistencyMs > 150 ? "Unstable" : "Stable";
      return {
        gameId: "target-ghost",
        gameName: "Target Ghost",
        playerId,
        sessionId,
        accuracy:
          allShots.length > 0 ? (hits.length / allShots.length) * 100 : 0,
        averagereactionTimeMs:
          reactionTimes.length > 0 ? Math.round(getAverage(reactionTimes)) : 0,
        averageSwitchTimeMs:
          switchTimes.length > 0 ? Math.round(getAverage(switchTimes)) : 0,
        responseTimesMs: reactionTimes,
        globalConsistencyMs: consistencyMs,
        globalStabilityStatus: stabilityStatus,
        startedAt: initialStartTimeRef.current,
        endedAt,
        rawData: {
          finalLevel: finalState.currentLevel,
          levelComplete: finalState.levelComplete,
          hitCount: hits.length,
          missCount: allShots.length - hits.length,
          levelResults: processedLevelResults,
        },
      } as any;
    },
    [playerId, sessionId, getLevelConfig],
  );

  // ==================== Kinematic Mouse Tracking ====================

  const handleMouseMove = useCallback((mousePxX: number, mousePxY: number) => {
    const s = stateRef.current;

    if (s.phase !== "shooting") return;

    if (isCurrentlyWaitingRef.current && waitTargetPxPosRef.current) {
      const dx = waitTargetPxPosRef.current.x - mousePxX;
      const dy = waitTargetPxPosRef.current.y - mousePxY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > HIT_RADIUS_PX) {
        isCurrentlyWaitingRef.current = false;
        if (signalTimerRef.current) {
          clearTimeout(signalTimerRef.current);
          signalTimerRef.current = null;
        }
        waitTargetPxPosRef.current = null;

        setState((prev) => {
          const wt = prev.targets.find((t) => t.isWaiting);
          if (!wt) return prev;

          return {
            ...prev,
            isTimerPaused: true,
            earlyClickCount: prev.earlyClickCount + 1,
            targets: prev.targets.map((t) =>
              t.id === wt.id ? { ...t, isWaiting: false, isActive: true } : t,
            ),
          };
        });
        return;
      }
    } else if (!isCurrentlyWaitingRef.current) {
      if (s.activeTargetId === null) return;
      if (
        trueReactionTimeRef.current !== null ||
        s.currentReactionStart === null
      )
        return;
      if (!waitTargetPxPosRef.current) return;

      const dx = waitTargetPxPosRef.current.x - mousePxX;
      const dy = waitTargetPxPosRef.current.y - mousePxY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > HIT_RADIUS_PX) {
        trueReactionTimeRef.current = Date.now() - s.currentReactionStart;
        waitTargetPxPosRef.current = null;
      }
    }
  }, []);

  const goToMenu = useCallback(() => {
    clearAllTimers();
    isCurrentlyWaitingRef.current = false;
    setState({ ...initialState });
    levelResultsRef.current = [];
  }, [clearAllTimers]);

  const submitAndExit = useCallback(() => {
    clearAllTimers();
    isCurrentlyWaitingRef.current = false;
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
    handleMouseMove,
    nextLevel,
    restartGame,
    goToMenu,
    submitAndExit,
  };
}

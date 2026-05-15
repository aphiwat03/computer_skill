import { useState, useCallback, useRef, useEffect } from "react";
import type { GameState, Target, Shot, LevelConfig, GameResult } from "./types";
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

function generateTargets(count: number): Target[] {
  const targets: Target[] = [];
  const margin = 12;
  const FIXED_DISTANCE = 25;

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
      let placed = false;
      let attempts = 0;
      const maxAttempts = 200;
      const prevTarget = targets[i - 1];

      while (!placed && attempts < maxAttempts) {
        const angleRad = Math.random() * Math.PI * 2;
        const newX = prevTarget.x + FIXED_DISTANCE * Math.cos(angleRad);
        const newY = prevTarget.y + FIXED_DISTANCE * Math.sin(angleRad);

        const inBounds =
          newX >= margin &&
          newX <= 100 - margin &&
          newY >= margin &&
          newY <= 100 - margin;

        const tooClose = targets.some((t) => {
          const dx = t.x - newX;
          const dy = t.y - newY;
          return Math.sqrt(dx * dx + dy * dy) < 18;
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
  hasStartedShooting: false,
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

  // Effect สำหรับจับเวลา จะทำงานเมื่อ hasStartedShooting = true เท่านั้น
  useEffect(() => {
    if (
      state.phase === "shooting" &&
      state.hasStartedShooting &&
      !countdownRef.current
    ) {
      const config = getLevelConfig(state.currentLevel);

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
    }
  }, [
    state.phase,
    state.hasStartedShooting,
    state.currentLevel,
    getLevelConfig,
    clearAllTimers,
  ]);

  const startLevel = useCallback(
    (level: number) => {
      clearAllTimers();
      const config = getLevelConfig(level);
      const targets = generateTargets(config.targetCount);

      const startedAtTime =
        levelResultsRef.current.length === 0
          ? initialStartTimeRef.current
          : stateRef.current.startedAt;

      // เปิดเป้าแรกทันที แต่ยังไม่เริ่มเวลา
      targets[0].isActive = true;
      targets[0].activatedAt = Date.now();

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
        hasStartedShooting: false, // บังคับให้เป็น false จนกว่าจะยิงเป้า 0 โดน
      }));
    },
    [clearAllTimers, getLevelConfig],
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
          activeTarget && prev.currentReactionStart
            ? now - prev.currentReactionStart
            : undefined;
        const switchTime =
          hit && prev.lastHitAt ? now - prev.lastHitAt : undefined;
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

              // บังคับเรียงตาม ID + 1
              const nextTargetId = hitTargetId! + 1;
              const nextTarget = s.targets.find((t) => t.id === nextTargetId);
              const targetToActivate =
                nextTarget || unhit.sort((a, b) => a.id - b.id)[0];

              return {
                ...s,
                targets: s.targets.map((t) => ({
                  ...t,
                  isActive: t.id === targetToActivate.id,
                  activatedAt:
                    t.id === targetToActivate.id ? Date.now() : t.activatedAt,
                })),
                activeTargetId: targetToActivate.id,
                currentReactionStart: Date.now(),
              };
            });
          }, 200);
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
          // เริ่มเวลาทันทีถ้ายิงโดนเป้าแรก
          hasStartedShooting: prev.hasStartedShooting || hit,
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
      targetCount: config.targetCount, // เก็บจำนวนเป้าเพื่อใช้กรองตัวสุดท้าย
      shots: stateRef.current.shots,
      score: stateRef.current.score,
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

      // กรองเป้าที่ 0 และ เป้าสุดท้าย ออกจากการคำนวณ Timing
      const validTimingHits = allResults.flatMap((r) => {
        const lastId = r.targetCount - 1;
        return (r.shots || []).filter(
          (s: any) => s.hit && s.targetId !== 0 && s.targetId !== lastId,
        );
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

      const consistencyMs = Math.round(getStandardDeviation(reactionTimes));
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
        const levelReactionTimes = levelValidHits
          .map((s: any) => s.reactionTime ?? 0)
          .filter((t: number) => t > 0);
        const levelSD = Math.round(getStandardDeviation(levelReactionTimes));

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
        return (r.shots || []).filter(
          (s: any) => s.hit && s.targetId !== 0 && s.targetId !== lastId,
        );
      });

      const reactionTimes = allValidHits.map((s: any) => s.reactionTime ?? 0);
      const switchTimes = allValidHits
        .map((s: any) => s.switchTime)
        .filter((t: any): t is number => typeof t === "number");

      // คำนวณค่า Global เตรียมไว้
      const consistencyMs = Math.round(getStandardDeviation(reactionTimes));
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
        // --- ย้ายมาอยู่ชั้นนอกสุดตรงนี้ ---
        globalConsistencyMs: consistencyMs,
        globalStabilityStatus: stabilityStatus,
        // -----------------------------
        startedAt: initialStartTimeRef.current,
        endedAt,
        rawData: {
          finalLevel: finalState.currentLevel,
          levelComplete: finalState.levelComplete,
          hitCount: hits.length,
          missCount: allShots.length - hits.length,
          // (เอา Global ออกจาก rawData แล้วให้เหลือแค่รายละเอียดของด่าน)
          levelResults: processedLevelResults,
        },
      } as any;
    },
    [playerId, sessionId, getLevelConfig],
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

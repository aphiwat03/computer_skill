import { useState, useCallback, useRef, useEffect } from "react";
import type { GameState, Target, Shot, LevelConfig, GameResult } from "./types";
import {
  DEFAULT_TARGET_DISTANCE_PERCENT,
  LEVELS,
  MAX_TARGET_DISTANCE_PERCENT,
  MIN_TARGET_DISTANCE_PERCENT,
  TARGET_HIT_RADIUS_PX,
} from "./types";

// ==================== Game Constants ====================

const INITIAL_SIGNAL_DELAY_MS = 3000;
const HIT_RADIUS_PX = TARGET_HIT_RADIUS_PX;
const CENTER_HIT_RADIUS_PX = HIT_RADIUS_PX * 0.3;
const EARLY_CLICK_PENALTY = 150;
const MISS_PENALTY = 50;
const SPAWN_MARGIN_PERCENT = 12;
const FIXED_DISTANCE_ATTEMPTS = 300;

// ==================== Scoring Functions ====================

/**
 * Calculates aim score based on distance from target center
 * Closer to center = higher score (max 150)
 * Score = precision * 150, where precision ranges from 0 to 1
 */
function getAimScore(distanceFromCenter: number) {
  const precision = Math.max(0, 1 - distanceFromCenter / HIT_RADIUS_PX);
  return Math.round(precision * 150);
}

// ==================== Statistical Functions ====================

/** Data structure to represent the game arena dimensions */
interface ArenaSize {
  width: number;
  height: number;
}

/**
 * Calculates the average (mean) of an array of numbers
 * Returns 0 if array is empty
 */
function getAverage(values: number[]) {
  return values.length > 0
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : 0;
}

/**
 * Calculates standard deviation to measure consistency
 * Used to track how consistent the player's reaction times are
 */
function getStandardDeviation(values: number[]) {
  if (values.length === 0) return 0;
  const average = getAverage(values);
  const variance =
    values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) /
    values.length;
  return Math.sqrt(variance);
}

function getMiddleStatShots(shots: Shot[]) {
  return shots.length > 2 ? shots.slice(1, -1) : [];
}

function getStatHits(shots: Shot[]) {
  return getMiddleStatShots(shots).filter((shot) => shot.hit);
}

function getReactionTimesForStats(shots: Shot[]) {
  return getStatHits(shots)
    .map((shot) => shot.reactionTime)
    .filter((time): time is number => typeof time === "number" && time > 0);
}

function getSwitchTimesForStats(shots: Shot[]) {
  return getStatHits(shots)
    .map((shot) => shot.switchTime)
    .filter((time): time is number => typeof time === "number" && time > 0);
}

function clampTargetDistance(distance: number) {
  if (!Number.isFinite(distance)) return DEFAULT_TARGET_DISTANCE_PERCENT;
  return Math.min(
    MAX_TARGET_DISTANCE_PERCENT,
    Math.max(MIN_TARGET_DISTANCE_PERCENT, distance),
  );
}

// ==================== Target Management Functions ====================

function randomBoundedCoordinate() {
  return (
    SPAWN_MARGIN_PERCENT + Math.random() * (100 - SPAWN_MARGIN_PERCENT * 2)
  );
}

function isWithinSpawnBounds(x: number, y: number) {
  return (
    x >= SPAWN_MARGIN_PERCENT &&
    x <= 100 - SPAWN_MARGIN_PERCENT &&
    y >= SPAWN_MARGIN_PERCENT &&
    y <= 100 - SPAWN_MARGIN_PERCENT
  );
}

function getFixedDistancePoint(previous: Target, distance: number) {
  for (let attempt = 0; attempt < FIXED_DISTANCE_ATTEMPTS; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const x = previous.x + Math.cos(angle) * distance;
    const y = previous.y + Math.sin(angle) * distance;

    if (isWithinSpawnBounds(x, y)) {
      return { x, y };
    }
  }

  const scanSteps = 1440;
  for (let step = 0; step < scanSteps; step++) {
    const angle = (step / scanSteps) * Math.PI * 2;
    const x = previous.x + Math.cos(angle) * distance;
    const y = previous.y + Math.sin(angle) * distance;

    if (isWithinSpawnBounds(x, y)) {
      return { x, y };
    }
  }

  throw new Error("Unable to place fixed-distance target within bounds.");
}

/**
 * Generates targets as a fixed-distance path. The first target is random
 * within safe bounds; each later target is exactly targetDistance from the
 * previous target, with only the angle randomized.
 */
function generateTargets(count: number, targetDistance: number): Target[] {
  const distance = clampTargetDistance(targetDistance);
  const firstTarget: Target = {
    id: 0,
    x: randomBoundedCoordinate(),
    y: randomBoundedCoordinate(),
    isActive: false,
    isHit: false,
  };
  const targets: Target[] = [firstTarget];

  for (let i = 1; i < count; i++) {
    const previousTarget = targets[i - 1];
    const position = getFixedDistancePoint(previousTarget, distance);
    targets.push({
      id: i,
      x: position.x,
      y: position.y,
      isActive: false,
      isHit: false,
    });
  }

  return targets;
}

/**
 * Activates targets in generated order so every visible transition follows
 * the fixed-distance path.
 */
function activateNextTarget(targets: Target[]) {
  const activeTarget = targets.find((target) => !target.isHit);
  if (!activeTarget) {
    return {
      targets,
      activeTargetId: null,
      currentReactionStart: null,
    };
  }

  const activatedAt = Date.now();

  return {
    targets: targets.map((target) => ({
      ...target,
      isActive: target.id === activeTarget.id,
      activatedAt:
        target.id === activeTarget.id ? activatedAt : target.activatedAt,
    })),
    activeTargetId: activeTarget.id,
    currentReactionStart: activatedAt,
  };
}

// ==================== Initial Game State ====================

/**
 * Default game state when game starts or resets
 * - phase: Current game phase (menu, shooting, result, gameover)
 * - targets: Array of all target objects in current level
 * - shots: Array of player's shots with their accuracy data
 * - currentLevel: Current level (1-based)
 * - score: Total accumulated score
 * - lives/streaks: Player lives remaining
 * - Various counters: hits, misses, center hits, early clicks
 */
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
  shootingTimerStarted: false,
  finalStats: {
    accuracy: 0,
    avgReaction: 0,
    avgSwitch: 0,
    avgConsistencyMs: 0,
  },
};

// ==================== Main Game Logic Hook ====================

/**
 * Core game logic hook that manages all game state and mechanics
 *
 * Responsibilities:
 * - Manages level progression and target activation
 * - Tracks player shots and calculates scores
 * - Measures reaction times and accuracy
 * - Manages timers for level duration
 * - Compiles final results when game ends
 *
 * @param playerId - Unique identifier for the player
 * @param sessionId - Unique identifier for the gaming session
 * @param onGameComplete - Callback function when all levels are complete
 *
 * @returns Object with game state and all action handlers
 */
export function useGame(
  playerId: string,
  sessionId: string,
  onGameComplete: (result: GameResult) => void,
  targetDistancePercent = DEFAULT_TARGET_DISTANCE_PERCENT,
) {
  const [state, setState] = useState<GameState>(initialState);
  const levelResultsRef = useRef<any[]>([]);
  const initialStartTimeRef = useRef<string>(new Date().toISOString());
  const signalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shootingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * Clears all active timers to prevent memory leaks
   * Must be called before starting new level or ending game
   */
  const clearAllTimers = useCallback(() => {
    if (signalTimerRef.current) clearTimeout(signalTimerRef.current);
    if (shootingTimerRef.current) clearTimeout(shootingTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    signalTimerRef.current = null;
    shootingTimerRef.current = null;
    countdownRef.current = null;
  }, []);

  const startShootingTimer = useCallback(
    (shootingTime: number) => {
      if (shootingTimerRef.current) clearTimeout(shootingTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);

      countdownRef.current = setInterval(() => {
        setState((prev) => {
          if (prev.phase !== "shooting" || !prev.shootingTimerStarted) {
            return prev;
          }
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
      }, shootingTime);
    },
    [clearAllTimers],
  );

  /**
   * Gets the configuration for a specific level
   * Returns level config with target count, shooting time, signal interval, etc.
   */
  const getLevelConfig = useCallback((level: number): LevelConfig => {
    return LEVELS[Math.min(level - 1, LEVELS.length - 1)];
  }, []);

  /**
   * Schedules the next target activation after the signal interval.
   */
  const scheduleNextSignal = useCallback((levelConfig: LevelConfig) => {
    if (signalTimerRef.current) clearTimeout(signalTimerRef.current);

    signalTimerRef.current = setTimeout(() => {
      setState((prev) => {
        if (prev.phase !== "shooting") return prev;
        const nextSignal = activateNextTarget(prev.targets);
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

  /**
   * Starts a new level with fresh targets
   * Sets up timers for level duration and target activation
   * Initializes all counters and state
   *
   * @param level - Level number to start (1-based)
   */
  const startLevel = useCallback(
    (level: number) => {
      clearAllTimers();
      const config = getLevelConfig(level);
      const targets = generateTargets(
        config.targetCount,
        targetDistancePercent,
      );

      // Use initial game time for first level, current time for subsequent levels
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
        shootingTimerStarted: false,
      }));

      // Wait before showing first target
      signalTimerRef.current = setTimeout(() => {
        setState((prev) => {
          if (prev.phase !== "shooting" || prev.currentLevel !== level) {
            return prev;
          }
          const firstSignal = activateNextTarget(prev.targets);
          return {
            ...prev,
            targets: firstSignal.targets,
            activeTargetId: firstSignal.activeTargetId,
            currentReactionStart: firstSignal.currentReactionStart,
          };
        });
      }, INITIAL_SIGNAL_DELAY_MS);
    },
    [clearAllTimers, getLevelConfig, targetDistancePercent],
  );

  /**
   * Handles player shooting action
   * Calculates hit/miss, distance from center, reaction time, and score
   * Updates target state and schedules next target
   *
   * Scoring:
   * - Hit: reaction score (max 500) + accuracy score (max 150) + center bonus (150)
   * - Center Hit: bonus 150 points
   * - Early Click: -150 points
   * - Miss: -50 points
   *
   * @param x - X coordinate of shot (0-100, percentage of arena width)
   * @param y - Y coordinate of shot (0-100, percentage of arena height)
   * @param arenaSize - Pixel dimensions of the game arena
   */
  const handleShoot = useCallback(
    (x: number, y: number, arenaSize: ArenaSize) => {
      setState((prev) => {
        if (prev.phase !== "shooting") return prev;
        const config = getLevelConfig(prev.currentLevel);
        const now = Date.now();

        // Find the currently active target
        const activeTarget = prev.targets.find(
          (t) => t.id === prev.activeTargetId && t.isActive,
        );
        let hit = false;
        let hitTargetId: number | null = null;
        let distanceFromCenter: number | undefined;

        // Calculate if shot hit the active target
        if (activeTarget) {
          const dx = ((activeTarget.x - x) / 100) * arenaSize.width;
          const dy = ((activeTarget.y - y) / 100) * arenaSize.height;
          distanceFromCenter = Math.sqrt(dx * dx + dy * dy);
          if (distanceFromCenter <= HIT_RADIUS_PX) {
            hit = true;
            hitTargetId = activeTarget.id;
          }
        }

        // Determine shot type and calculate metrics
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

        // Record the shot with all relevant data
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

        // If hit, mark target as hit and schedule next target
        if (hit && hitTargetId !== null) {
          updatedTargets = prev.targets.map((t) =>
            t.id === hitTargetId ? { ...t, isHit: true, isActive: false } : t,
          );
          newActiveId = null;
          newReactionStart = null;
          newLastHitAt = now;
        } else if (!isEarlyClick) {
          scheduleNextSignal(config);
        }

        const allHit = updatedTargets.every((t) => t.isHit);
        const shouldStartShootingTimer = hit && !prev.shootingTimerStarted;

        if (allHit) {
          clearAllTimers();
        } else if (hit) {
          if (shouldStartShootingTimer) startShootingTimer(config.shootingTime);
          if (signalTimerRef.current) clearTimeout(signalTimerRef.current);
          signalTimerRef.current = setTimeout(() => {
            setState((s) => {
              if (s.phase !== "shooting") return s;
              const nextTarget = activateNextTarget(s.targets);
              if (nextTarget.activeTargetId === null) {
                clearAllTimers();
                return { ...s, phase: "result", activeTargetId: null };
              }
              return {
                ...s,
                targets: nextTarget.targets,
                activeTargetId: nextTarget.activeTargetId,
                currentReactionStart: nextTarget.currentReactionStart,
              };
            });
          }, 200);
        }

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
          shootingTimerStarted:
            shouldStartShootingTimer || prev.shootingTimerStarted,
          phase: allHit ? "result" : prev.phase,
          score: Math.max(0, prev.score + scoreDelta),
        };
      });
    },
    [getLevelConfig, scheduleNextSignal, clearAllTimers, startShootingTimer],
  );

  /**
   * Advances to the next level or ends game if all levels are complete
   * Saves current level results before moving forward
   */
  const nextLevel = useCallback(() => {
    const nextLvl = stateRef.current.currentLevel + 1;

    const currentLevelResult = {
      level: stateRef.current.currentLevel,
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

      const reactionTimes = allResults.flatMap((result) =>
        getReactionTimesForStats(result.shots || []),
      );
      const avgReaction =
        reactionTimes.length > 0
          ? Math.round(
              reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length,
            )
          : 0;

      const switchTimes = allResults.flatMap((result) =>
        getSwitchTimesForStats(result.shots || []),
      );
      const avgSwitch =
        switchTimes.length > 0
          ? Math.round(
              switchTimes.reduce((a, b) => a + b, 0) / switchTimes.length,
            )
          : 0;
      const avgConsistencyMs =
        reactionTimes.length > 0
          ? Math.round(getStandardDeviation(reactionTimes))
          : 0;

      setState((prev) => ({
        ...prev,
        phase: "gameover",
        levelComplete: true,
        finalStats: { accuracy, avgReaction, avgSwitch, avgConsistencyMs },
      }));
    } else {
      levelResultsRef.current = [
        ...levelResultsRef.current,
        currentLevelResult,
      ];
      startLevel(nextLvl);
    }
  }, [startLevel]);

  /**
   * Resets game to initial state
   * Called when player returns to menu
   */
  const restartGame = useCallback(() => {
    clearAllTimers();
    levelResultsRef.current = [];
    initialStartTimeRef.current = new Date().toISOString();
    setState({ ...initialState });
  }, [clearAllTimers]);

  /**
   * Builds final game result object combining all level results
   * Calculates aggregate statistics like total score, accuracy, average reaction time
   *
   * @param finalState - Final game state when game ends
   * @returns Complete GameResult object with all metrics and raw data
   */
  const buildResult = useCallback(
    (finalState: GameState): GameResult => {
      const endedAt = new Date().toISOString();

      const rawLevelResults =
        finalState.phase === "gameover"
          ? levelResultsRef.current
          : [
              ...levelResultsRef.current,
              {
                level: finalState.currentLevel,
                shots: finalState.shots,
                hitCount: finalState.hitCount,
                missCount: finalState.missCount,
              },
            ];

      const processedLevelResults = rawLevelResults.map((level) => {
        const levelReactionTimes = getReactionTimesForStats(level.shots || []);
        const levelSD = Math.round(getStandardDeviation(levelReactionTimes));

        return {
          level: level.level,
          hitCount: level.hitCount,
          missCount: level.missCount,
          consistencyMs: levelSD,
          stabilityStatus: levelSD > 200 ? "Unstable" : "Stable",
          shots: (level.shots || []).map((s: any) => ({
            x: s.x,
            y: s.y,
            hit: s.hit,
            reactionTime: s.reactionTime,
            switchTime: s.switchTime,
          })),
        };
      });

      const allShots = rawLevelResults.flatMap((r) => r.shots || []);
      const hits = allShots.filter((s) => s.hit);
      const reactionTimes = rawLevelResults.flatMap((level) =>
        getReactionTimesForStats(level.shots || []),
      );
      const switchTimes = rawLevelResults.flatMap((level) =>
        getSwitchTimesForStats(level.shots || []),
      );
      const avgConsistencyMs =
        reactionTimes.length > 0
          ? Math.round(getStandardDeviation(reactionTimes))
          : 0;

      return {
        gameId: "target-ghost",
        gameName: "Target Ghost",
        playerId,
        sessionId,
        accuracy:
          allShots.length > 0 ? (hits.length / allShots.length) * 100 : 0,
        reactionTimeMs:
          reactionTimes.length > 0 ? Math.round(getAverage(reactionTimes)) : 0,
        averageSwitchTimeMs:
          switchTimes.length > 0 ? Math.round(getAverage(switchTimes)) : 0,
        avgConsistencyMs,
        responseTimesMs: reactionTimes,
        startedAt: initialStartTimeRef.current,
        endedAt,
        rawData: {
          finalLevel: finalState.currentLevel,
          levelComplete: finalState.levelComplete,
          targetDistancePercent: clampTargetDistance(targetDistancePercent),
          hitCount: hits.length,
          missCount: allShots.length - hits.length,
          avgConsistencyMs,
          globalConsistencyMs: avgConsistencyMs,
          levelResults: processedLevelResults, // ข้อมูลที่ Clean แล้วจะอยู่ในนี้ครับ
        },
      };
    },
    [playerId, sessionId, targetDistancePercent],
  );

  /**
   * Returns to main menu without submitting results
   */
  const goToMenu = useCallback(() => {
    clearAllTimers();
    setState({ ...initialState });
    levelResultsRef.current = [];
  }, [clearAllTimers]);

  /**
   * Submits final game results and exits
   * Builds complete result object and calls onGameComplete callback
   */
  const submitAndExit = useCallback(() => {
    clearAllTimers();
    const finalResult = buildResult(stateRef.current);
    onGameComplete(finalResult);
    setState({ ...initialState });
    levelResultsRef.current = [];
  }, [clearAllTimers, buildResult, onGameComplete]);

  /**
   * Cleanup effect: Clear timers when component unmounts
   */
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  // Return all game functions and state for use in UI components
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

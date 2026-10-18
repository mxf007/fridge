import { FOOD_IDS, type FoodId } from '../game/types';
import { isMatchFood, isMatchIce, MATCH_ICE } from './MatchCells';
import type { MatchCell, MatchGrid, MatchLevelDef } from './MatchTypes';

export const MATCH_PROGRESS_KEY = 'fridge_match_progress_v1';
/** 单关进行中的盘面。只写本机，不进云存档。 */
export const MATCH_LEVEL_CACHE_KEY = 'fridge_match_level_cache_v1';
const MATCH_PROGRESS_VERSION = 2;
const MATCH_LEVEL_CACHE_VERSION = 1;

export type MatchLevelSnapshot = {
    version: number;
    levelId: number;
    grid: MatchGrid;
    matches: number;
    shuffles: number;
    hintsRemaining: number;
    hintsUsed: number;
    reshufflesRemaining: number | null;
    reshufflesUsed: number;
    /** 离开时若正卡在死局或步数用尽，回来继续弹出对应结果。 */
    outcome: 'play' | 'deadlock' | 'step_limit';
};

export type MatchKv = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
};

export type MatchProgress = {
    version: number;
    unlockedLevelId: number;
    currentLevelId: number;
    clearedLevelIds: number[];
    /** 里程碑徽章 id，如 match_badge_10 */
    badgeIds: string[];
};

function freshProgress(firstLevelId: number): MatchProgress {
    return {
        version: MATCH_PROGRESS_VERSION,
        unlockedLevelId: firstLevelId,
        currentLevelId: firstLevelId,
        clearedLevelIds: [],
        badgeIds: [],
    };
}

function normalizeLevelIds(levelIds: readonly number[]): number[] {
    const unique = Array.from(new Set(levelIds.filter((id) => Number.isInteger(id) && id > 0)));
    unique.sort((a, b) => a - b);
    if (unique.length === 0) throw new Error('match save needs at least one level id');
    return unique;
}

function sanitizeProgress(raw: unknown, levelIds: readonly number[]): MatchProgress {
    const ids = normalizeLevelIds(levelIds);
    const fresh = freshProgress(ids[0]);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fresh;
    const source = raw as Record<string, unknown>;
    const badgeIds = sanitizeBadgeIds(source.badgeIds);
    if (source.version !== MATCH_PROGRESS_VERSION && source.version !== 1) return fresh;

    const requestedCleared = Array.isArray(source.clearedLevelIds) ? source.clearedLevelIds : [];
    const requestedSet = new Set<number>();
    for (let i = 0; i < requestedCleared.length; i++) {
        const id = requestedCleared[i];
        if (typeof id === 'number' && Number.isInteger(id) && ids.indexOf(id) >= 0) requestedSet.add(id);
    }

    // 单机按顺序解锁；损坏存档里的跨关记录不向后传播。
    const clearedLevelIds: number[] = [];
    for (let i = 0; i < ids.length; i++) {
        if (!requestedSet.has(ids[i])) break;
        clearedLevelIds.push(ids[i]);
    }
    const nextIndex = Math.min(clearedLevelIds.length, ids.length - 1);
    const unlockedLevelId = ids[nextIndex];
    const requestedCurrent = source.currentLevelId;
    const currentLevelId = (
        typeof requestedCurrent === 'number'
        && Number.isInteger(requestedCurrent)
        && ids.indexOf(requestedCurrent) >= 0
        && requestedCurrent <= unlockedLevelId
    )
        ? requestedCurrent
        : unlockedLevelId;
    return {
        version: MATCH_PROGRESS_VERSION,
        unlockedLevelId,
        currentLevelId,
        clearedLevelIds,
        badgeIds,
    };
}

const KNOWN_BADGE_IDS = new Set(['match_badge_10', 'match_badge_20', 'match_badge_30']);

function sanitizeBadgeIds(raw: unknown): string[] {
    if (!Array.isArray(raw)) return [];
    const out: string[] = [];
    for (let i = 0; i < raw.length; i++) {
        const id = raw[i];
        if (typeof id !== 'string' || !KNOWN_BADGE_IDS.has(id)) continue;
        if (out.indexOf(id) >= 0) continue;
        out.push(id);
    }
    return out;
}

export function grantMatchBadge(progress: MatchProgress, badgeId: string): MatchProgress {
    if (!KNOWN_BADGE_IDS.has(badgeId)) return progress;
    if (progress.badgeIds.indexOf(badgeId) >= 0) return progress;
    return { ...progress, badgeIds: progress.badgeIds.concat(badgeId) };
}

export function readMatchProgress(kv: MatchKv, levelIds: readonly number[]): MatchProgress {
    const raw = kv.getItem(MATCH_PROGRESS_KEY);
    if (!raw) return freshProgress(normalizeLevelIds(levelIds)[0]);
    try {
        return sanitizeProgress(JSON.parse(raw), levelIds);
    } catch {
        return freshProgress(normalizeLevelIds(levelIds)[0]);
    }
}

export function writeMatchProgress(kv: MatchKv, progress: MatchProgress, levelIds: readonly number[]): MatchProgress {
    const safe = sanitizeProgress(progress, levelIds);
    kv.setItem(MATCH_PROGRESS_KEY, JSON.stringify(safe));
    return safe;
}

/** 云端字段还原；缺省或损坏时返回全新进度。 */
export function matchProgressFromCloud(raw: unknown, levelIds: readonly number[]): MatchProgress {
    const ids = normalizeLevelIds(levelIds);
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return freshProgress(ids[0]);
    }
    return sanitizeProgress(raw, levelIds);
}

/** 本机与云端配对进度合并：取更远的顺序解锁、徽章并集。 */
/** GM：跳到第 n 层游玩（1..n-1 记为已通，解锁 n）。n≤0 则重置配对进度。 */
export function gmJumpMatchProgress(
    kv: MatchKv,
    levelIds: readonly number[],
    targetLevelId: number,
): MatchProgress {
    const ids = normalizeLevelIds(levelIds);
    if (!Number.isFinite(targetLevelId) || targetLevelId <= 0) {
        return writeMatchProgress(kv, freshProgress(ids[0]), ids);
    }
    const id = Math.min(Math.max(1, Math.floor(targetLevelId)), ids[ids.length - 1]);
    const index = ids.indexOf(id);
    if (index < 0) return writeMatchProgress(kv, freshProgress(ids[0]), ids);
    const clearedLevelIds = ids.slice(0, index);
    const badgeIds: string[] = [];
    if (id >= 10) badgeIds.push('match_badge_10');
    if (id >= 20) badgeIds.push('match_badge_20');
    if (id >= 30) badgeIds.push('match_badge_30');
    return writeMatchProgress(kv, {
        version: MATCH_PROGRESS_VERSION,
        unlockedLevelId: id,
        currentLevelId: id,
        clearedLevelIds,
        badgeIds: sanitizeBadgeIds(badgeIds),
    }, ids);
}

export function mergeMatchProgress(
    local: MatchProgress,
    remote: MatchProgress,
    levelIds: readonly number[],
): MatchProgress {
    const badgeSet = new Set<string>([...local.badgeIds, ...remote.badgeIds]);
    const clearedSet = new Set<number>([...local.clearedLevelIds, ...remote.clearedLevelIds]);
    return sanitizeProgress({
        version: MATCH_PROGRESS_VERSION,
        clearedLevelIds: Array.from(clearedSet),
        unlockedLevelId: Math.max(local.unlockedLevelId, remote.unlockedLevelId),
        currentLevelId: Math.max(local.currentLevelId, remote.currentLevelId),
        badgeIds: Array.from(badgeSet),
    }, levelIds);
}

export function setCurrentMatchLevel(
    kv: MatchKv,
    progress: MatchProgress,
    levelId: number,
    levelIds: readonly number[],
): MatchProgress {
    const ids = normalizeLevelIds(levelIds);
    if (ids.indexOf(levelId) < 0 || levelId > progress.unlockedLevelId) return progress;
    return writeMatchProgress(kv, { ...progress, currentLevelId: levelId }, ids);
}

export function markMatchLevelCleared(
    kv: MatchKv,
    progress: MatchProgress,
    levelId: number,
    levelIds: readonly number[],
): { progress: MatchProgress; firstClear: boolean } {
    const ids = normalizeLevelIds(levelIds);
    const index = ids.indexOf(levelId);
    if (index < 0 || levelId > progress.unlockedLevelId) return { progress, firstClear: false };
    const firstClear = progress.clearedLevelIds.indexOf(levelId) < 0;
    const cleared = progress.clearedLevelIds.slice();
    if (firstClear) cleared.push(levelId);
    cleared.sort((a, b) => a - b);
    const nextId = ids[Math.min(index + 1, ids.length - 1)];
    const updated = writeMatchProgress(kv, {
        ...progress,
        unlockedLevelId: Math.max(progress.unlockedLevelId, nextId),
        currentLevelId: nextId,
        clearedLevelIds: cleared,
    }, ids);
    return { progress: updated, firstClear };
}

export function markMatchLevelClearedWithBadge(
    kv: MatchKv,
    progress: MatchProgress,
    levelId: number,
    levelIds: readonly number[],
    badgeId: string | null,
): { progress: MatchProgress; firstClear: boolean; badgeEarned: string | null } {
    const cleared = markMatchLevelCleared(kv, progress, levelId, levelIds);
    if (!badgeId || !cleared.firstClear) {
        return { ...cleared, badgeEarned: null };
    }
    const withBadge = grantMatchBadge(cleared.progress, badgeId);
    if (withBadge.badgeIds.length === cleared.progress.badgeIds.length) {
        return { progress: cleared.progress, firstClear: true, badgeEarned: null };
    }
    const saved = writeMatchProgress(kv, withBadge, levelIds);
    return { progress: saved, firstClear: true, badgeEarned: badgeId };
}

const FOOD_ID_SET = new Set<string>(FOOD_IDS);

function readLevelCacheFile(kv: MatchKv): { version: number; levels: Record<string, unknown> } {
    const raw = kv.getItem(MATCH_LEVEL_CACHE_KEY);
    if (!raw) return { version: MATCH_LEVEL_CACHE_VERSION, levels: {} };
    try {
        const parsed = JSON.parse(raw) as { version?: unknown; levels?: unknown };
        if (
            !parsed
            || parsed.version !== MATCH_LEVEL_CACHE_VERSION
            || !parsed.levels
            || typeof parsed.levels !== 'object'
            || Array.isArray(parsed.levels)
        ) {
            return { version: MATCH_LEVEL_CACHE_VERSION, levels: {} };
        }
        return { version: MATCH_LEVEL_CACHE_VERSION, levels: parsed.levels as Record<string, unknown> };
    } catch {
        return { version: MATCH_LEVEL_CACHE_VERSION, levels: {} };
    }
}

function writeLevelCacheFile(kv: MatchKv, levels: Record<string, unknown>): void {
    kv.setItem(MATCH_LEVEL_CACHE_KEY, JSON.stringify({
        version: MATCH_LEVEL_CACHE_VERSION,
        levels,
    }));
}

function countFoods(grid: MatchGrid): Map<FoodId, number> {
    const counts = new Map<FoodId, number>();
    for (let row = 0; row < grid.length; row++) {
        for (let column = 0; column < grid[row].length; column++) {
            const cell = grid[row][column];
            if (!isMatchFood(cell)) continue;
            counts.set(cell, (counts.get(cell) ?? 0) + 1);
        }
    }
    return counts;
}

function nonNegativeInt(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return null;
    return value;
}

/** 缓存必须和关卡定义对得上：尺寸、冰块位置不变，消掉的食材成对减少。 */
function sanitizeLevelSnapshot(raw: unknown, level: MatchLevelDef): MatchLevelSnapshot | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const source = raw as Record<string, unknown>;
    if (source.version !== MATCH_LEVEL_CACHE_VERSION) return null;
    if (source.levelId !== level.id) return null;
    if (!Array.isArray(source.grid) || source.grid.length !== level.rows) return null;
    const layout = level.layout;
    const grid: MatchGrid = [];
    for (let row = 0; row < level.rows; row++) {
        const line = source.grid[row];
        const layoutRow = layout[row];
        if (!Array.isArray(line) || !layoutRow || line.length !== level.columns || layoutRow.length !== level.columns) {
            return null;
        }
        const next: MatchCell[] = [];
        for (let column = 0; column < level.columns; column++) {
            const cell = line[column];
            const layoutCell = layoutRow[column];
            if (isMatchIce(layoutCell)) {
                if (cell !== MATCH_ICE) return null;
                next.push(MATCH_ICE);
                continue;
            }
            if (cell === MATCH_ICE) return null;
            if (cell == null) {
                next.push(null);
                continue;
            }
            if (typeof cell !== 'string' || !FOOD_ID_SET.has(cell)) return null;
            next.push(cell as FoodId);
        }
        grid.push(next);
    }
    const matches = nonNegativeInt(source.matches);
    const shuffles = nonNegativeInt(source.shuffles);
    const hintsRemaining = nonNegativeInt(source.hintsRemaining);
    const hintsUsed = nonNegativeInt(source.hintsUsed);
    const reshufflesUsed = nonNegativeInt(source.reshufflesUsed);
    if (matches == null || shuffles == null || hintsRemaining == null || hintsUsed == null || reshufflesUsed == null) {
        return null;
    }
    let reshufflesRemaining: number | null = null;
    if (source.reshufflesRemaining != null) {
        reshufflesRemaining = nonNegativeInt(source.reshufflesRemaining);
        if (reshufflesRemaining == null) return null;
    }
    if (source.outcome !== 'play' && source.outcome !== 'deadlock' && source.outcome !== 'step_limit') return null;
    const layoutCounts = countFoods(layout);
    const savedCounts = countFoods(grid);
    let removed = 0;
    for (const [food, layoutCount] of layoutCounts) {
        const savedCount = savedCounts.get(food) ?? 0;
        if (savedCount > layoutCount) return null;
        const delta = layoutCount - savedCount;
        if (delta % 2 !== 0) return null;
        removed += delta;
        savedCounts.delete(food);
    }
    if (savedCounts.size > 0) return null;
    if (removed !== matches * 2) return null;
    return {
        version: MATCH_LEVEL_CACHE_VERSION,
        levelId: level.id,
        grid,
        matches,
        shuffles,
        hintsRemaining,
        hintsUsed,
        reshufflesRemaining,
        reshufflesUsed,
        outcome: source.outcome,
    };
}

export function readMatchLevelSnapshot(kv: MatchKv, level: MatchLevelDef): MatchLevelSnapshot | null {
    const file = readLevelCacheFile(kv);
    return sanitizeLevelSnapshot(file.levels[String(level.id)], level);
}

export function writeMatchLevelSnapshot(kv: MatchKv, snapshot: MatchLevelSnapshot): void {
    const file = readLevelCacheFile(kv);
    file.levels[String(snapshot.levelId)] = snapshot;
    writeLevelCacheFile(kv, file.levels);
}

export function clearMatchLevelSnapshot(kv: MatchKv, levelId: number): void {
    const file = readLevelCacheFile(kv);
    delete file.levels[String(levelId)];
    writeLevelCacheFile(kv, file.levels);
}

import type { AlbumKv } from '../game/AlbumState';

export const MERGE_BEST_KEY = 'fridge_merge_best_score';
const MERGE_SNAPSHOT_KEY = 'fridge_merge_snapshot_v1';
const MERGE_SNAPSHOT_VERSION = 1;
const MAX_LEVEL = 10;
const BOARD_X_MIN = -420;
const BOARD_X_MAX = 420;
const BOARD_Y_MIN = -760;
const BOARD_Y_MAX = 520;

export type MergeBallSnapshot = {
    level: number;
    x: number;
    y: number;
    rotation: number;
    serial: number;
};

export type MergeSnapshot = {
    version: number;
    score: number;
    spawnCount: number;
    serial: number;
    nextLevel: number;
    currentLevel: number;
    currentX: number;
    balls: MergeBallSnapshot[];
    rngState: number;
};

export function readMergeBest(kv: AlbumKv): number {
    return clampScore(kv.getItem(MERGE_BEST_KEY));
}

export function writeMergeBest(kv: AlbumKv, score: number): void {
    kv.setItem(MERGE_BEST_KEY, String(clampScore(score)));
}

export function clearMergeSnapshot(kv: AlbumKv): void {
    const host = kv as AlbumKv & { removeItem?: (key: string) => void };
    if (typeof host.removeItem === 'function') host.removeItem(MERGE_SNAPSHOT_KEY);
    else kv.setItem(MERGE_SNAPSHOT_KEY, '');
}

export function writeMergeSnapshot(kv: AlbumKv, snapshot: MergeSnapshot): void {
    const safe = sanitizeSnapshot(snapshot);
    if (!safe) {
        clearMergeSnapshot(kv);
        return;
    }
    kv.setItem(MERGE_SNAPSHOT_KEY, JSON.stringify(safe));
}

export function readMergeSnapshot(kv: AlbumKv): MergeSnapshot | null {
    const raw = kv.getItem(MERGE_SNAPSHOT_KEY);
    if (!raw) return null;
    try {
        return sanitizeSnapshot(JSON.parse(raw));
    } catch {
        clearMergeSnapshot(kv);
        return null;
    }
}

function sanitizeSnapshot(raw: unknown): MergeSnapshot | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const src = raw as Record<string, unknown>;
    if (finiteInt(src.version) !== MERGE_SNAPSHOT_VERSION) return null;
    const ballsIn = Array.isArray(src.balls) ? src.balls : [];
    const balls: MergeBallSnapshot[] = [];
    for (let i = 0; i < ballsIn.length && i < 256; i++) {
        const item = sanitizeBall(ballsIn[i]);
        if (item) balls.push(item);
    }
    if (balls.length !== ballsIn.length) return null;
    const score = clampScore(src.score);
    const spawnCount = finiteInt(src.spawnCount, 0, 9999);
    const serial = finiteInt(src.serial, 0, 999999);
    const nextLevel = finiteInt(src.nextLevel, 0, MAX_LEVEL);
    const currentLevel = finiteInt(src.currentLevel, 0, MAX_LEVEL);
    const currentX = finiteNumber(src.currentX, BOARD_X_MIN, BOARD_X_MAX);
    const rngState = finiteInt(src.rngState, 0, 0xffffffff);
    if (
        score == null
        || spawnCount == null
        || serial == null
        || nextLevel == null
        || currentLevel == null
        || currentX == null
        || rngState == null
    ) {
        return null;
    }
    return {
        version: MERGE_SNAPSHOT_VERSION,
        score,
        spawnCount,
        serial,
        nextLevel,
        currentLevel,
        currentX,
        balls,
        rngState,
    };
}

function sanitizeBall(raw: unknown): MergeBallSnapshot | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const src = raw as Record<string, unknown>;
    const level = finiteInt(src.level, 0, MAX_LEVEL);
    const x = finiteNumber(src.x, BOARD_X_MIN, BOARD_X_MAX);
    const y = finiteNumber(src.y, BOARD_Y_MIN, BOARD_Y_MAX);
    const rotation = finiteNumber(src.rotation, -3600, 3600);
    const serial = finiteInt(src.serial, 0, 999999);
    if (level == null || x == null || y == null || rotation == null || serial == null) return null;
    return { level, x, y, rotation, serial };
}

function clampScore(value: unknown): number {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value, 10) : NaN;
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(99999999, Math.floor(n));
}

function finiteInt(value: unknown, min = 0, max = 999999): number | null {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value, 10) : NaN;
    if (!Number.isFinite(n)) return null;
    const safe = Math.floor(n);
    if (safe < min || safe > max) return null;
    return safe;
}

function finiteNumber(value: unknown, min: number, max: number): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    if (value < min || value > max) return null;
    return Math.round(value * 1000) / 1000;
}

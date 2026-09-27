import type { FoodId, LevelDef } from './types';
import { FOOD_IDS } from './types';

export const ALBUM_KEY = 'fridge_album';

export type AlbumGrade = 'cleared' | 'sage' | 'walnut';

export type AlbumEntry = {
    firstClearSteps: number | null;
    bestSteps: number | null;
    grade: AlbumGrade;
    kinds: (FoodId | null)[];
};

export type AlbumFile = {
    entries: Record<string, AlbumEntry>;
};

export type AlbumKv = {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
};

export function readAlbum(kv: AlbumKv): AlbumFile {
    const raw = kv.getItem(ALBUM_KEY);
    if (!raw) return { entries: {} };
    try {
        const parsed = JSON.parse(raw) as AlbumFile;
        if (!parsed || parsed.entries == null || typeof parsed.entries !== 'object') return { entries: {} };
        return parsed;
    } catch {
        return { entries: {} };
    }
}

export function writeAlbum(kv: AlbumKv, file: AlbumFile): void {
    kv.setItem(ALBUM_KEY, JSON.stringify(file));
}

/** 旧档只有最高关。按容量从大到小，把袋里数量最多的食材铺进格子。同数量按食材表顺序。 */
export function kindsFromLevel(level: LevelDef): (FoodId | null)[] {
    const counts: Partial<Record<FoodId, number>> = {};
    const items = level.bags.flat();
    for (let i = 0; i < items.length; i++) {
        const id = items[i];
        counts[id] = (counts[id] || 0) + 1;
    }
    const order = level.trays
        .map((tray, index) => ({ index, cap: tray.cap }))
        .sort((a, b) => (b.cap !== a.cap ? b.cap - a.cap : a.index - b.index));
    const kinds: (FoodId | null)[] = level.trays.map(() => null);
    for (let n = 0; n < order.length; n++) {
        const tray = order[n];
        let best: FoodId | null = null;
        let bestCount = 0;
        for (let f = 0; f < FOOD_IDS.length; f++) {
            const id = FOOD_IDS[f];
            const count = counts[id] || 0;
            if (count > bestCount) {
                bestCount = count;
                best = id;
            }
        }
        if (!best || bestCount <= 0) continue;
        kinds[tray.index] = best;
        counts[best] = bestCount - tray.cap;
    }
    return kinds;
}

export function migrateAlbum(file: AlbumFile, cleared: number, levelById: (id: number) => LevelDef | null): void {
    const n = cleared > 30 ? 30 : cleared;
    for (let id = 1; id <= n; id++) {
        const key = String(id);
        if (file.entries[key]) continue;
        const level = levelById(id);
        file.entries[key] = {
            firstClearSteps: null,
            bestSteps: null,
            grade: 'cleared',
            kinds: level ? kindsFromLevel(level) : [],
        };
    }
}

export function prepareAlbum(kv: AlbumKv, cleared: number, levelById: (id: number) => LevelDef | null): AlbumFile {
    const file = readAlbum(kv);
    migrateAlbum(file, cleared, levelById);
    const keys = Object.keys(file.entries);
    for (let i = 0; i < keys.length; i++) {
        const id = Number(keys[i]);
        writeGrade(file.entries[keys[i]], levelById(id));
    }
    writeAlbum(kv, file);
    return file;
}

/**
 * 在 markCleared 之前调用。prevCleared 是这次胜利前的最高关。
 * 新关写入首通画面；已有记录只在步数更少时改最佳，不改画面。
 */
export function noteAlbumWin(
    kv: AlbumKv,
    prevCleared: number,
    level: LevelDef,
    steps: number,
    trayKinds: (FoodId | null)[],
    levelById: (id: number) => LevelDef | null,
): { firstClear: boolean } {
    const file = readAlbum(kv);
    migrateAlbum(file, prevCleared, levelById);
    const key = String(level.id);
    const existing = file.entries[key];
    let firstClear = false;
    if (!existing) {
        file.entries[key] = {
            firstClearSteps: steps,
            bestSteps: steps,
            grade: 'cleared',
            kinds: trayKinds.slice(),
        };
        firstClear = true;
    } else if (existing.bestSteps == null || steps < existing.bestSteps) {
        existing.bestSteps = steps;
    }
    writeGrade(file.entries[key], level);
    writeAlbum(kv, file);
    return { firstClear };
}

/** 现行关都有一条不经柜台的通关，每件食材只计一步，所以全信息最少步等于件数。 */
export function pieceCount(level: LevelDef): number {
    let n = 0;
    for (let c = 0; c < level.bags.length; c++) n += level.bags[c].length;
    return n;
}

function maxBagDepth(level: LevelDef): number {
    let depth = 0;
    for (let c = 0; c < level.bags.length; c++) {
        if (level.bags[c].length > depth) depth = level.bags[c].length;
    }
    return depth;
}

/**
 * 利落线 = 最少步 + 隐藏层余量。余量至少 1，所以利落不会和完美重合。
 * 最深列每多一层，余量加 1。关卡上写了 theoreticalMinSteps / targetSteps 时以关卡为准。
 */
export function stepMarks(level: LevelDef): { minSteps: number; targetSteps: number } {
    const minSteps = level.theoreticalMinSteps != null ? level.theoreticalMinSteps : pieceCount(level);
    const margin = Math.max(1, maxBagDepth(level) - 1);
    const targetSteps = level.targetSteps != null ? level.targetSteps : minSteps + margin;
    return { minSteps, targetSteps: Math.max(minSteps + 1, targetSteps) };
}

/** 完美优先于利落。没有步数，或步数高于利落线，不算章。 */
export function albumGrade(level: LevelDef, steps: number): AlbumGrade {
    const marks = stepMarks(level);
    if (steps === marks.minSteps) return 'walnut';
    if (steps <= marks.targetSteps) return 'sage';
    return 'cleared';
}

/** 有最佳步数、并且步数达到利落或完美时，才挂对应的章。 */
export function visibleAlbumGrade(level: LevelDef | null, entry: AlbumEntry | null | undefined): AlbumGrade | null {
    if (!level || !entry || entry.bestSteps == null) return null;
    const grade = albumGrade(level, entry.bestSteps);
    if (grade === 'cleared') return null;
    return grade;
}

function writeGrade(entry: AlbumEntry, level: LevelDef | null): void {
    if (!level || entry.bestSteps == null) {
        entry.grade = 'cleared';
        return;
    }
    entry.grade = albumGrade(level, entry.bestSteps);
}

export function albumStatusLine(entry: AlbumEntry | null | undefined, level?: LevelDef | null): string {
    let line = '已收';
    if (entry && entry.bestSteps != null) {
        if (entry.firstClearSteps != null && entry.firstClearSteps !== entry.bestSteps) {
            line = `最佳 ${entry.bestSteps} · 首通 ${entry.firstClearSteps}`;
        } else {
            line = `最佳 ${entry.bestSteps} 步`;
        }
    }
    if (!level) return line;
    return `${line} · 利落 ${stepMarks(level).targetSteps}`;
}

export function winStepLine(level: LevelDef, steps: number): string {
    const marks = stepMarks(level);
    if (steps === marks.minSteps) return `完美 ${steps} 步 · 利落线 ${marks.targetSteps}`;
    if (steps <= marks.targetSteps) return `利落收纳 · 利落线 ${marks.targetSteps} 步`;
    return `利落线 ${marks.targetSteps} 步`;
}

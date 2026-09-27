import { BoardState } from './BoardState';
import type { LevelDef } from './types';

export type ScriptStep = { tray?: number; buffer?: number; bag?: number; fromBuffer?: number };

/** 第 7–30 关叠放：连续相同 ≤2；深列至少两种。10 关起无单层列，13 关起每列至少 3 层。 */
export function assertRedoLayout(level: LevelDef): void {
    if (level.id < 7) return;
    for (let c = 0; c < level.bags.length; c++) {
        const col = level.bags[c];
        let runKind = '';
        let run = 0;
        const kinds: Record<string, true> = {};
        for (let i = 0; i < col.length; i++) {
            kinds[col[i]] = true;
            if (col[i] === runKind) {
                run += 1;
                if (run >= 3) throw new Error(`L${level.id} bag ${c} repeats ${col[i]}`);
            } else {
                runKind = col[i];
                run = 1;
            }
        }
        if (col.length >= 2 && Object.keys(kinds).length < 2) {
            throw new Error(`L${level.id} bag ${c} needs two kinds`);
        }
        if (level.id >= 10 && col.length < 2) throw new Error(`L${level.id} bag ${c} depth`);
        if (level.id >= 13 && col.length < 3) throw new Error(`L${level.id} bag ${c} depth < 3`);
    }
}

/** 第一次从柜台开格之前，柜台里有几件。 */
export function holdBeforeFirstLock(script: ScriptStep[]): number {
    const held: Record<number, true> = {};
    let count = 0;
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null && step.fromBuffer != null) return count;
        if (step.buffer != null && !held[step.buffer]) {
            held[step.buffer] = true;
            count += 1;
        }
        if (step.fromBuffer != null && held[step.fromBuffer]) {
            delete held[step.fromBuffer];
            count -= 1;
        }
    }
    return count;
}

/** 墙面可放冰箱格的范围。屏幕 y 向下，宽 660，顶 172、底 608。 */
export const TRAY_WALL_W = 660;
export const TRAY_WALL_H = 436;
export const TRAY_WALL_TOP = 172;
export const TRAY_GAP = 10;

export type TrayCell = {
    horizontal: boolean;
    col: number;
    row: number;
    spanW: number;
    spanH: number;
};

export type TrayPack = {
    cols: number;
    rows: number;
    cells: TrayCell[];
};

type TraySlot = { cap: number; horizontal: boolean; col: number; row: number };

function upright(cap: number, col: number, row: number): TraySlot {
    return { cap, horizontal: false, col, row };
}

function laid(cap: number, col: number, row: number): TraySlot {
    return { cap, horizontal: true, col, row };
}

/**
 * 短边 2 个座位，长边 cap 个座位。横格是竖格转 90 度。
 * 同一关同一容量同一方向。相邻关不共用同一张摆放。
 * 坐标从这关网格左上角算起。
 */
function traySlots(levelId: number): { cols: number; rows: number; slots: TraySlot[] } {
    if (levelId === 1) return { cols: 2, rows: 4, slots: [upright(4, 0, 0)] };
    if (levelId === 2 || levelId === 7) {
        return { cols: 4, rows: 3, slots: [upright(3, 0, 0), upright(3, 2, 0)] };
    }
    if (levelId === 3) {
        return { cols: 6, rows: 2, slots: [laid(3, 0, 0), laid(3, 3, 0)] };
    }
    if (levelId === 4 || levelId === 6) {
        return { cols: 4, rows: 4, slots: [upright(4, 0, 0), upright(4, 2, 0)] };
    }
    if (levelId === 5 || levelId === 8) {
        return { cols: 6, rows: 3, slots: [upright(3, 0, 0), upright(3, 2, 0), upright(3, 4, 0)] };
    }
    if (levelId === 9) {
        return {
            cols: 4,
            rows: 4,
            slots: [upright(4, 0, 0), upright(2, 2, 0), upright(2, 2, 2)],
        };
    }
    if (levelId === 10) {
        return {
            cols: 4,
            rows: 4,
            slots: [laid(4, 0, 0), laid(2, 0, 2), laid(2, 2, 2)],
        };
    }
    if (levelId === 11) {
        return {
            cols: 6,
            rows: 3,
            slots: [upright(3, 0, 0), upright(3, 2, 0), upright(2, 4, 1)],
        };
    }
    if (levelId === 16) {
        return {
            cols: 5,
            rows: 4,
            slots: [upright(4, 0, 0), laid(3, 2, 0), laid(2, 2, 2)],
        };
    }
    if (levelId === 17 || levelId === 22) {
        return {
            cols: 6,
            rows: 4,
            slots: [upright(4, 0, 0), upright(4, 2, 0), upright(2, 4, 0), upright(2, 4, 2)],
        };
    }
    if (levelId === 18) {
        return {
            cols: 6,
            rows: 4,
            slots: [laid(4, 0, 0), laid(4, 0, 2), upright(2, 4, 0), upright(2, 4, 2)],
        };
    }
    if (levelId === 20 || levelId === 26 || levelId === 29) {
        return {
            cols: 8,
            rows: 4,
            slots: [laid(3, 0, 0), laid(3, 3, 0), laid(2, 6, 0), laid(4, 0, 2), laid(3, 4, 2)],
        };
    }
    if (levelId === 21 || levelId === 28) {
        return {
            cols: 7,
            rows: 4,
            slots: [laid(4, 0, 0), laid(3, 4, 0), laid(3, 0, 2), laid(3, 3, 2)],
        };
    }
    if (levelId === 25) {
        return {
            cols: 8,
            rows: 4,
            slots: [upright(4, 0, 0), upright(4, 2, 0), upright(4, 4, 0), upright(2, 6, 0), upright(2, 6, 2)],
        };
    }
    if (levelId === 27) {
        return {
            cols: 6,
            rows: 4,
            slots: [laid(2, 0, 0), laid(2, 2, 0), laid(2, 4, 0), laid(4, 0, 2), laid(2, 4, 2)],
        };
    }
    if (levelId === 30) {
        return {
            cols: 8,
            rows: 6,
            slots: [laid(3, 0, 0), laid(3, 3, 0), laid(2, 6, 0), upright(4, 0, 2), upright(4, 2, 2), upright(4, 4, 2)],
        };
    }
    if (levelId === 13 || levelId === 24) {
        return {
            cols: 6,
            rows: 4,
            slots: [laid(2, 0, 0), laid(4, 2, 0), laid(3, 0, 2), laid(3, 3, 2)],
        };
    }
    if (levelId === 14) {
        return {
            cols: 6,
            rows: 5,
            slots: [upright(3, 0, 0), upright(3, 2, 0), laid(2, 4, 1), laid(5, 0, 3)],
        };
    }
    if (levelId === 12 || levelId === 15 || levelId === 19 || levelId === 23) {
        return {
            cols: 6,
            rows: 4,
            slots: [laid(3, 0, 0), laid(3, 3, 0), laid(4, 0, 2), laid(2, 4, 2)],
        };
    }
    throw new Error(`L${levelId} tray grid`);
}

/** 按容量把关卡格子对上网格，不改 trays 的顺序。 */
export function packTrayGrid(levelId: number, caps: number[]): TrayPack {
    const spec = traySlots(levelId);
    if (spec.slots.length !== caps.length) throw new Error(`L${levelId} tray count`);
    const used: boolean[] = [];
    for (let s = 0; s < spec.slots.length; s++) used.push(false);
    const cells: TrayCell[] = [];
    for (let i = 0; i < caps.length; i++) {
        let found = -1;
        for (let s = 0; s < spec.slots.length; s++) {
            if (!used[s] && spec.slots[s].cap === caps[i]) {
                found = s;
                break;
            }
        }
        if (found < 0) throw new Error(`L${levelId} no slot for cap ${caps[i]}`);
        used[found] = true;
        const slot = spec.slots[found];
        const spanW = slot.horizontal ? slot.cap : 2;
        const spanH = slot.horizontal ? 2 : slot.cap;
        cells.push({
            horizontal: slot.horizontal,
            col: slot.col,
            row: slot.row,
            spanW,
            spanH,
        });
    }
    return { cols: spec.cols, rows: spec.rows, cells };
}

/** 1–30 关格子是 cap×2 或 2×cap，同容量同向，不重叠，外接矩形落在墙面里。 */
export function assertTrayGrid(levelId: number, caps: number[]): void {
    const pack = packTrayGrid(levelId, caps);
    const pitch = Math.min(TRAY_WALL_W / pack.cols, TRAY_WALL_H / pack.rows);
    if (pack.cols * pitch > TRAY_WALL_W + 0.01) throw new Error(`L${levelId} grid wider than wall`);
    if (pack.rows * pitch > TRAY_WALL_H + 0.01) throw new Error(`L${levelId} grid taller than wall`);
    const taken: boolean[][] = [];
    for (let r = 0; r < pack.rows; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < pack.cols; c++) row.push(false);
        taken.push(row);
    }
    let maxC = 0;
    let maxR = 0;
    for (let i = 0; i < pack.cells.length; i++) {
        const cell = pack.cells[i];
        const cap = caps[i];
        const uprightSpan = cell.spanW === 2 && cell.spanH === cap;
        const laidSpan = cell.spanW === cap && cell.spanH === 2;
        if (!uprightSpan && !laidSpan) throw new Error(`L${levelId} tray ${i} span`);
        if (cap !== 2 && cell.horizontal !== laidSpan) throw new Error(`L${levelId} tray ${i} orient`);
        for (let j = 0; j < pack.cells.length; j++) {
            if (caps[j] !== cap) continue;
            const other = pack.cells[j];
            if (other.horizontal !== cell.horizontal || other.spanW !== cell.spanW || other.spanH !== cell.spanH) {
                throw new Error(`L${levelId} cap ${cap} shape`);
            }
        }
        for (let dy = 0; dy < cell.spanH; dy++) {
            for (let dx = 0; dx < cell.spanW; dx++) {
                const c = cell.col + dx;
                const r = cell.row + dy;
                if (c < 0 || r < 0 || c >= pack.cols || r >= pack.rows) throw new Error(`L${levelId} tray ${i} out`);
                if (taken[r][c]) throw new Error(`L${levelId} tray overlap`);
                taken[r][c] = true;
                if (c + 1 > maxC) maxC = c + 1;
                if (r + 1 > maxR) maxR = r + 1;
            }
        }
    }
    if (maxC !== pack.cols || maxR !== pack.rows) throw new Error(`L${levelId} grid bounds`);
}

/** 相邻关的格子位置不能相同。levels 按关号从小到大。 */
export function assertConsecutiveTrayGrids(levels: { id: number; caps: number[] }[]): void {
    let prev = '';
    let prevId = 0;
    for (let i = 0; i < levels.length; i++) {
        const level = levels[i];
        const pack = packTrayGrid(level.id, level.caps);
        const parts: string[] = [];
        for (let c = 0; c < pack.cells.length; c++) {
            const cell = pack.cells[c];
            parts.push(`${cell.col},${cell.row},${cell.spanW},${cell.spanH}`);
        }
        parts.sort();
        const key = `${pack.cols}x${pack.rows}:${parts.join('|')}`;
        if (key === prev) throw new Error(`L${prevId} and L${level.id} same tray grid`);
        prev = key;
        prevId = level.id;
    }
}

/** 按脚本落子。返回这一路同时占过的最多柜台格数。 */
export function playScript(board: BoardState, script: ScriptStep[], tag: string): number {
    let peak = 0;
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) board.selectTray(step.tray);
        if (step.buffer != null) board.selectBuffer(step.buffer);
        let result;
        if (step.fromBuffer != null) result = board.placeFromBuffer(step.fromBuffer);
        else if (step.bag != null) result = board.placeFromBag(step.bag);
        else throw new Error(`${tag} script ${i} missing place`);
        if (!result.ok) throw new Error(`${tag} script ${i} failed: ${result.reason}`);
        let held = 0;
        for (let b = 0; b < board.buffer.length; b++) if (board.buffer[b] != null) held += 1;
        if (held > peak) peak = held;
    }
    return peak;
}

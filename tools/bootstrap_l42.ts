import { BoardState } from '../assets/scripts/game/BoardState';
import { assertRedoLayout, assertTrayGrid, playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import type { LevelDef } from '../assets/scripts/game/types';
import { assertLevel } from '../assets/scripts/game/types';

export const LEVEL_42: LevelDef = {
    id: 42,
    title: '双槽窥深',
    teach: '两只柜台槽可以同时占满',
    trays: [{ cap: 5 }, { cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 3 }],
    bags: [
        ['milk', 'veg', 'grape', 'meat'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'grape', 'milk', 'veg'],
        ['grape', 'milk', 'lemon', 'meat'],
        ['lemon', 'sauce', 'veg', 'lemon'],
        ['sauce', 'lemon', 'meat', 'sauce'],
    ],
    buffer: 3,
    loseable: true,
    theoreticalMinSteps: 24,
    targetSteps: 28,
};

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.join(',')}:${t.sealed ? 1 : 0}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    return `${trays}#${bags}`;
}

function replay(board: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) board.selectTray(s.tray);
        if (s.buffer != null) board.selectBuffer(s.buffer);
        if (s.fromBuffer != null) board.placeFromBuffer(s.fromBuffer);
        else if (s.bag != null) board.placeFromBag(s.bag);
    }
}

function peakAfter(level: LevelDef, steps: ScriptStep[]): number {
    const b = BoardState.fromLevel(level);
    try {
        return playScript(b, steps, 'p');
    } catch {
        return 99;
    }
}

function firstBufferStep(steps: ScriptStep[]): number {
    for (let i = 0; i < steps.length; i++) if (steps[i].buffer != null && steps[i].bag != null) return i;
    return -1;
}

function searchWin(level: LevelDef): ScriptStep[] | null {
    const seen = new Set<string>();
    function dfs(steps: ScriptStep[]): ScriptStep[] | null {
        const board = BoardState.fromLevel(level);
        for (const s of steps) {
            if (s.tray != null) board.selectTray(s.tray);
            if (s.bag != null) board.placeFromBag(s.bag);
        }
        if (board.isWin()) return steps;
        if (steps.length >= 24) return null;
        const k = stateKey(board);
        if (seen.has(k)) return null;
        seen.add(k);
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(level);
                replay(trial, steps);
                trial.selectTray(t);
                if (trial.placeFromBag(c).ok) {
                    const sub = dfs(steps.concat([{ tray: t, bag: c }]));
                    if (sub) return sub;
                }
            }
        }
        return null;
    }
    return dfs([]);
}

function fairFromDoublePark(level: LevelDef, win: ScriptStep[]): ScriptStep[] | null {
    let best: ScriptStep[] | null = null;
    function ok(script: ScriptStep[]): boolean {
        const b = BoardState.fromLevel(level);
        try {
            const peak = playScript(b, script, 't');
            if (!b.isWin() || peak !== 2) return false;
            const fb = firstBufferStep(script);
            return fb >= 0 && fb <= 2;
        } catch {
            return false;
        }
    }
    for (let b0 = 0; b0 < 6; b0++) {
        for (let b1 = 0; b1 < 6; b1++) {
            if (b0 === b1) continue;
            for (let k1 = 0; k1 <= win.length; k1++) {
                for (let t0 = 0; t0 < 6; t0++) {
                    for (let k2 = k1; k2 <= win.length; k2++) {
                        for (let t1 = 0; t1 < 6; t1++) {
                            const script: ScriptStep[] = [
                                { buffer: 0, bag: b0 },
                                { buffer: 1, bag: b1 },
                                ...win.slice(0, k1),
                                { tray: t0, fromBuffer: 0 },
                                ...win.slice(k1, k2),
                                { tray: t1, fromBuffer: 1 },
                                ...win.slice(k2),
                            ];
                            if (!ok(script)) continue;
                            if (!best || script.length < best.length) best = script;
                        }
                    }
                }
            }
        }
    }
    return best;
}

function searchWaste(level: LevelDef): ScriptStep[] | null {
    const seen = new Set<string>();
    function dfs(steps: ScriptStep[]): ScriptStep[] | null {
        const board = BoardState.fromLevel(level);
        for (const s of steps) {
            if (s.tray != null) board.selectTray(s.tray);
            if (s.bag != null) board.placeFromBag(s.bag);
        }
        if (board.failReason() === 'locked_out') return steps;
        if (steps.length >= 26) return null;
        const k = `${board.trays.map((t) => t.kind + t.items.length).join('|')}#${board.bags.map((c) => c.length).join(',')}`;
        if (seen.has(k)) return null;
        seen.add(k);
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(level);
                replay(trial, steps);
                trial.selectTray(t);
                if (trial.placeFromBag(c).ok) {
                    const sub = dfs(steps.concat([{ tray: t, bag: c }]));
                    if (sub) return sub;
                }
            }
        }
        return null;
    }
    return dfs([]);
}

const entry = process.argv[1]?.replace(/\\/g, '/');
if (entry?.endsWith('bootstrap_l42.ts')) {
try {
    assertLevel(LEVEL_42);
    assertRedoLayout(LEVEL_42);
    assertTrayGrid(42, LEVEL_42.trays.map((t) => t.cap));
} catch (e) {
    console.log('assert', e);
    process.exit(1);
}

const win = searchWin(LEVEL_42);
if (!win) {
    console.log('no win');
    process.exit(1);
}
console.log('win', win.length);
console.log(win.map((s) => JSON.stringify(s)).join('\n'));

const fair = fairFromDoublePark(LEVEL_42, win);
if (!fair) {
    console.log('no fair');
    process.exit(1);
}
console.log('fair', fair.length, 'peak', peakAfter(LEVEL_42, fair), 'firstBuf', firstBufferStep(fair));
console.log(fair.map((s) => JSON.stringify(s)).join('\n'));

const waste = searchWaste(LEVEL_42);
if (!waste) {
    console.log('no waste');
    process.exit(1);
}
console.log('waste', waste.length);
console.log(waste.map((s) => JSON.stringify(s)).join('\n'));
}

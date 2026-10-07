import { BoardState } from '../assets/scripts/game/BoardState';
import { assertRedoLayout, playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import type { LevelDef } from '../assets/scripts/game/types';
import { assertLevel } from '../assets/scripts/game/types';
import { assertTrayGrid } from '../assets/scripts/game/levelLayout';

const LEVEL_41: LevelDef = {
    id: 41,
    title: '双宽格',
    teach: '两只柜台槽可以同时占满',
    trays: [{ cap: 5 }, { cap: 5 }, { cap: 4 }, { cap: 4 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['milk', 'veg', 'meat', 'grape'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'grape', 'milk', 'veg'],
        ['grape', 'milk', 'lemon', 'meat'],
        ['lemon', 'sauce', 'veg', 'sauce'],
        ['sauce', 'lemon', 'meat', 'grape'],
    ],
    buffer: 3,
    loseable: true,
    theoreticalMinSteps: 24,
    targetSteps: 28,
};

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.length}:${t.sealed ? 1 : 0}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    const buf = b.buffer.map((x) => x || '-').join(',');
    return `${trays}#${bags}#${buf}`;
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

function usesBuffer(steps: ScriptStep[]): boolean {
    for (const s of steps) if (s.buffer != null || s.fromBuffer != null) return true;
    return false;
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

function searchFair(level: LevelDef, maxLen: number, needPeak: number): ScriptStep[] | null {
    let best: ScriptStep[] | null = null;
    const seen = new Set<string>();
    function dfs(steps: ScriptStep[]): void {
        if (best && steps.length >= best.length) return;
        const board = BoardState.fromLevel(level);
        let peak = 0;
        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            if (s.tray != null) board.selectTray(s.tray);
            if (s.buffer != null) board.selectBuffer(s.buffer);
            const r =
                s.fromBuffer != null
                    ? board.placeFromBuffer(s.fromBuffer)
                    : s.bag != null
                      ? board.placeFromBag(s.bag)
                      : null;
            if (!r || !r.ok) return;
            let held = 0;
            for (let b = 0; b < board.buffer.length; b++) if (board.buffer[b] != null) held += 1;
            if (held > peak) peak = held;
            if (peak > needPeak) return;
        }
        if (board.isWin() && peak === needPeak && usesBuffer(steps)) {
            if (!best || steps.length < best.length) best = steps.slice();
            return;
        }
        if (steps.length >= maxLen) return;
        const k = stateKey(board);
        if (seen.has(k)) return;
        seen.add(k);
        const moves: ScriptStep[] = [];
        for (let bi = 0; bi < board.buffer.length; bi++) {
            if (board.buffer[bi] == null) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(level);
                replay(trial, steps);
                trial.selectTray(t);
                if (trial.placeFromBuffer(bi).ok) moves.push({ tray: t, fromBuffer: bi });
            }
        }
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(level);
                replay(trial, steps);
                trial.selectTray(t);
                if (trial.placeFromBag(c).ok) moves.push({ tray: t, bag: c });
            }
        }
        for (let bi = 0; bi < board.buffer.length; bi++) {
            if (board.buffer[bi] != null) continue;
            for (let c = 0; c < board.bags.length; c++) {
                if (!board.bags[c].length) continue;
                const trial = BoardState.fromLevel(level);
                replay(trial, steps);
                trial.selectBuffer(bi);
                if (trial.placeFromBag(c).ok) moves.push({ buffer: bi, bag: c });
            }
        }
        for (const m of moves) dfs(steps.concat([m]));
    }
    dfs([]);
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

try {
    assertLevel(LEVEL_41);
    assertRedoLayout(LEVEL_41);
    assertTrayGrid(41, LEVEL_41.trays.map((t) => t.cap));
} catch (e) {
    console.log('assert', e);
    process.exit(1);
}

const win = searchWin(LEVEL_41);
if (!win) {
    console.log('no win');
    process.exit(1);
}
console.log('win', win.length, 'peak', peakAfter(LEVEL_41, win));
console.log(win.map((s) => JSON.stringify(s)).join('\n'));

const fair = searchFair(LEVEL_41, 30, 2);
if (!fair) {
    console.log('no fair');
    process.exit(1);
}
console.log('fair', fair.length, 'peak', peakAfter(LEVEL_41, fair));
console.log(fair.map((s) => JSON.stringify(s)).join('\n'));

const waste = searchWaste(LEVEL_41);
if (!waste) {
    console.log('no waste');
    process.exit(1);
}
console.log('waste', waste.length);
console.log(waste.map((s) => JSON.stringify(s)).join('\n'));

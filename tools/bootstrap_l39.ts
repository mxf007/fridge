import { BoardState } from '../assets/scripts/game/BoardState';
import { assertRedoLayout, playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import type { LevelDef } from '../assets/scripts/game/types';
import { assertLevel } from '../assets/scripts/game/types';

const LEVEL_39: LevelDef = {
    id: 39,
    title: '三中格',
    teach: '同一柜台槽要用两次',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['milk', 'veg', 'meat', 'lemon'],
        ['veg', 'meat', 'grape', 'milk'],
        ['grape', 'milk', 'veg', 'sauce'],
        ['milk', 'veg', 'lemon', 'sauce'],
        ['meat', 'sauce', 'lemon', 'meat', 'grape'],
    ],
    buffer: 3,
    loseable: true,
    theoreticalMinSteps: 21,
    targetSteps: 25,
};

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.join(',')}:${t.sealed ? 1 : 0}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    return `${trays}#${bags}`;
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
        if (steps.length >= 21) return null;
        const k = stateKey(board);
        if (seen.has(k)) return null;
        seen.add(k);
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(level);
                for (const s of steps) {
                    if (s.tray != null) trial.selectTray(s.tray);
                    if (s.bag != null) trial.placeFromBag(s.bag);
                }
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

function slotUses(steps: ScriptStep[], slot: number): number {
    let n = 0;
    for (const s of steps) {
        if (s.buffer === slot && s.bag != null) n += 1;
        if (s.fromBuffer === slot) n += 1;
    }
    return n;
}

function oneCycleFair(level: LevelDef, win: ScriptStep[]): ScriptStep[] | null {
    let best: ScriptStep[] | null = null;
    function ok(script: ScriptStep[]): boolean {
        const b = BoardState.fromLevel(level);
        try {
            const peak = playScript(b, script, 't');
            return b.isWin() && peak === 1 && slotUses(script, 0) >= 2;
        } catch {
            return false;
        }
    }
    for (let b0 = 0; b0 < 5; b0++) {
        for (let skip = 0; skip <= 1; skip++) {
            const tail = skip === 0 ? win : win.slice(1);
            for (let k = 0; k <= tail.length; k++) {
                for (let t = 0; t < 6; t++) {
                    const script: ScriptStep[] = [
                        { buffer: 0, bag: b0 },
                        ...tail.slice(0, k),
                        { tray: t, fromBuffer: 0 },
                        ...tail.slice(k),
                    ];
                    if (!ok(script)) continue;
                    if (!best || script.length < best.length) best = script;
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
        if (steps.length >= 22) return null;
        const k = `${board.trays.map((t) => t.kind + t.items.length).join('|')}#${board.bags.map((c) => c.length).join(',')}`;
        if (seen.has(k)) return null;
        seen.add(k);
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(level);
                for (const s of steps) {
                    if (s.tray != null) trial.selectTray(s.tray);
                    if (s.bag != null) trial.placeFromBag(s.bag);
                }
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
    assertLevel(LEVEL_39);
    assertRedoLayout(LEVEL_39);
} catch (e) {
    console.log('assert', e);
    process.exit(1);
}

const win = searchWin(LEVEL_39);
if (!win) {
    console.log('no win');
    process.exit(1);
}
console.log('win', win.length);
console.log(win.map((s) => JSON.stringify(s)).join('\n'));

const fair = oneCycleFair(LEVEL_39, win);
if (!fair) {
    console.log('no fair');
    process.exit(1);
}
console.log('fair', fair.length);
console.log(fair.map((s) => JSON.stringify(s)).join('\n'));

const waste = searchWaste(LEVEL_39);
if (!waste) {
    console.log('no waste');
    process.exit(1);
}
console.log('waste', waste.length);
console.log(waste.map((s) => JSON.stringify(s)).join('\n'));

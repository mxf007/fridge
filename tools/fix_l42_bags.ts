import { BoardState } from '../assets/scripts/game/BoardState';
import { assertLevel, type FoodId } from '../assets/scripts/game/types';
import { assertRedoLayout, playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import type { LevelDef } from '../assets/scripts/game/types';

/** 5+4×4+3：恰一种×5、四种×4、一种×3。 */
const TARGET: Record<FoodId, number> = {
    meat: 5,
    grape: 4,
    milk: 4,
    veg: 4,
    lemon: 4,
    sauce: 3,
    fruit: 0,
    leftover: 0,
    kiwi: 0,
    pineapple: 0,
    watermelon: 0,
    coconut: 0,
};

const LEVEL: LevelDef = {
    id: 42,
    title: 'x',
    teach: '',
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
};

function counts(bags: FoodId[][]): Record<string, number> {
    const c: Record<string, number> = {};
    for (const col of bags) for (const k of col) c[k] = (c[k] || 0) + 1;
    return c;
}

function replay(b: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) b.selectTray(s.tray);
        if (s.bag != null) b.placeFromBag(s.bag);
    }
}

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.length}:${t.sealed ? 1 : 0}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    return `${trays}#${bags}`;
}

function searchWin(level: LevelDef): ScriptStep[] | null {
    const seen = new Set<string>();
    function dfs(steps: ScriptStep[]): ScriptStep[] | null {
        const board = BoardState.fromLevel(level);
        replay(board, steps);
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

LEVEL.bags = LEVEL.bags as FoodId[][];
const c = counts(LEVEL.bags);
console.log('counts', c);
for (const [k, n] of Object.entries(TARGET)) {
    if (n === 0) continue;
    if (c[k] !== n) {
        console.log('count mismatch', k, c[k], 'want', n);
        process.exit(1);
    }
}
try {
    assertLevel(LEVEL);
    assertRedoLayout(LEVEL);
} catch (e) {
    console.log('assert', e);
    process.exit(1);
}
const win = searchWin(LEVEL);
if (!win) {
    console.log('no win');
    process.exit(1);
}
console.log('win', win.length);
console.log(JSON.stringify(LEVEL.bags));
console.log(win.map((s) => JSON.stringify(s)).join('\n'));

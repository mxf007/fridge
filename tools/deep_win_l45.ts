import { BoardState } from '../assets/scripts/game/BoardState';
import { LEVEL_45 } from '../assets/scripts/game/level_45';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { assertRedoLayout } from '../assets/scripts/game/levelLayout';
import type { LevelDef } from '../assets/scripts/game/types';

const bagsT3 = [
    ['milk', 'sauce', 'veg', 'meat'],
    ['veg', 'meat', 'grape', 'milk'],
    ['meat', 'grape', 'milk', 'veg'],
    ['grape', 'milk', 'lemon', 'meat'],
    ['lemon', 'fruit', 'veg', 'lemon'],
    ['fruit', 'sauce', 'grape', 'sauce'],
];

function searchWin(def: LevelDef): ScriptStep[] | null {
    try {
        assertRedoLayout(def);
    } catch (e) {
        console.log('layout fail', (e as Error).message);
        return null;
    }
    function replay(b: BoardState, steps: ScriptStep[]) {
        for (const s of steps) {
            if (s.tray != null) b.selectTray(s.tray);
            if (s.buffer != null) b.selectBuffer(s.buffer);
            if (s.fromBuffer != null) b.placeFromBuffer(s.fromBuffer);
            else if (s.bag != null) b.placeFromBag(s.bag);
        }
    }
    const seen = new Set<string>();
    let nodes = 0;
    function dfs(steps: ScriptStep[]): ScriptStep[] | null {
        if (++nodes > 4_000_000) return null;
        const board = BoardState.fromLevel(def);
        replay(board, steps);
        if (board.isWin()) return steps;
        if (steps.length >= 30) return null;
        const k =
            board.trays.map((t) => `${t.kind}:${t.items.length}:${t.sealed}`).join('|') +
            '#' +
            board.bags.map((c) => c.join(',')).join(';') +
            '#' +
            board.buffer.join(',');
        if (seen.has(k)) return null;
        seen.add(k);
        for (let c = 0; c < 6; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < 7; t++) {
                const trial = BoardState.fromLevel(def);
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

for (const [label, bags] of [
    ['current', LEVEL_45.bags],
    ['t3', bagsT3],
    [
        't1fixed',
        [
            ['milk', 'lemon', 'veg', 'meat'],
            ['veg', 'meat', 'grape', 'milk'],
            ['meat', 'grape', 'milk', 'veg'],
            ['grape', 'milk', 'fruit', 'meat'],
            ['sauce', 'veg', 'lemon', 'sauce'],
            ['fruit', 'lemon', 'grape', 'sauce'],
        ],
    ],
] as const) {
    const def = { ...LEVEL_45, bags: bags as string[][] };
    const w = searchWin(def);
    console.log(label, w ? `win ${w.length}` : 'none');
}

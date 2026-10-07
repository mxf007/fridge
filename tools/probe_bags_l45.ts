import { BoardState } from '../assets/scripts/game/BoardState';
import type { LevelDef } from '../assets/scripts/game/types';
import { LEVEL_45 } from '../assets/scripts/game/level_45';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';

const templates: string[][][] = [
    LEVEL_45.bags,
    [
        ['milk', 'lemon', 'veg', 'meat'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'grape', 'milk', 'veg'],
        ['grape', 'milk', 'fruit', 'meat'],
        ['sauce', 'sauce', 'veg', 'lemon'],
        ['fruit', 'lemon', 'grape', 'sauce'],
    ],
    [
        ['milk', 'fruit', 'veg', 'meat'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'grape', 'sauce', 'veg'],
        ['grape', 'milk', 'lemon', 'meat'],
        ['lemon', 'sauce', 'veg', 'lemon'],
        ['fruit', 'grape', 'lemon', 'sauce'],
    ],
    [
        ['milk', 'sauce', 'veg', 'meat'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'grape', 'milk', 'veg'],
        ['grape', 'milk', 'lemon', 'meat'],
        ['lemon', 'fruit', 'veg', 'lemon'],
        ['fruit', 'sauce', 'grape', 'sauce'],
    ],
    [
        ['milk', 'veg', 'grape', 'meat'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'grape', 'milk', 'veg'],
        ['grape', 'milk', 'lemon', 'meat'],
        ['lemon', 'sauce', 'lemon', 'sauce'],
        ['fruit', 'fruit', 'grape', 'sauce'],
    ],
];

function replay(b: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) b.selectTray(s.tray);
        if (s.buffer != null) b.selectBuffer(s.buffer);
        if (s.fromBuffer != null) b.placeFromBuffer(s.fromBuffer);
        else if (s.bag != null) b.placeFromBag(s.bag);
    }
}

function genTrayBag(def: LevelDef, steps: ScriptStep[]): ScriptStep[] {
    const board = BoardState.fromLevel(def);
    replay(board, steps);
    const out: ScriptStep[] = [];
    for (let c = 0; c < board.bags.length; c++) {
        if (!board.bags[c].length) continue;
        for (let t = 0; t < board.trays.length; t++) {
            const trial = BoardState.fromLevel(def);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBag(c).ok) out.push({ tray: t, bag: c });
        }
    }
    return out;
}

function quickWin(def: LevelDef): boolean {
    const seen = new Set<string>();
    let nodes = 0;
    function dfs(steps: ScriptStep[]): boolean {
        if (++nodes > 1_200_000) return false;
        const board = BoardState.fromLevel(def);
        replay(board, steps);
        if (board.isWin()) return true;
        if (steps.length >= 24) return false;
        const k = board.trays.map((t) => `${t.kind}:${t.items.length}:${t.sealed}`).join('|') + board.bags.map((c) => c.join(',')).join(';');
        if (seen.has(k)) return false;
        seen.add(k);
        for (const m of genTrayBag(def, steps)) {
            if (dfs(steps.concat([m]))) return true;
        }
        return false;
    }
    return dfs([]);
}

for (let i = 0; i < templates.length; i++) {
    const def = { ...LEVEL_45, bags: templates[i] };
    const ok = quickWin(def);
    console.log(i, ok ? 'win' : 'none', JSON.stringify(templates[i]));
}

import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import type { FoodId, LevelDef } from '../assets/scripts/game/types';
import { assertLevel } from '../assets/scripts/game/types';
import { LEVEL_36 } from '../assets/scripts/game/level_36';

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.join(',')}:${t.sealed ? 1 : 0}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    const buf = b.buffer.map((x) => x || '-').join(',');
    return `${trays}#${bags}#${buf}`;
}

function parks(steps: ScriptStep[], slot: number): number {
    let n = 0;
    for (const s of steps) if (s.buffer === slot && s.bag != null) n += 1;
    return n;
}

function searchWin(level: LevelDef, max: number): ScriptStep[] | null {
    const seen = new Set<string>();
    function dfs(steps: ScriptStep[]): ScriptStep[] | null {
        const board = BoardState.fromLevel(level);
        for (const s of steps) {
            if (s.tray != null) board.selectTray(s.tray);
            if (s.bag != null) board.placeFromBag(s.bag);
        }
        if (board.isWin()) return steps;
        if (steps.length >= max) return null;
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

function tryInsert(level: LevelDef, win: ScriptStep[], slot: number): ScriptStep[] | null {
    let best: ScriptStep[] | null = null;
    function tryScript(script: ScriptStep[]): boolean {
        const b = BoardState.fromLevel(level);
        try {
            const peak = playScript(b, script, 't');
            return b.isWin() && peak === 1 && parks(script, slot) >= 2;
        } catch {
            return false;
        }
    }
    for (let b0 = 0; b0 < 5; b0++) {
        for (let k1 = 0; k1 <= win.length; k1++) {
            for (let t1 = 0; t1 < 6; t1++) {
                for (let k2 = k1; k2 <= win.length; k2++) {
                    for (let b1 = 0; b1 < 5; b1++) {
                        for (let t2 = 0; t2 < 6; t2++) {
                            const script: ScriptStep[] = [
                                { buffer: slot, bag: b0 },
                                ...win.slice(0, k1),
                                { tray: t1, fromBuffer: slot },
                                ...win.slice(k1, k2),
                                { buffer: slot, bag: b1 },
                                ...win.slice(k2),
                                { tray: t2, fromBuffer: slot },
                            ];
                            if (!tryScript(script)) continue;
                            if (!best || script.length < best.length) best = script;
                        }
                    }
                }
            }
        }
    }
    return best;
}

const candidates: FoodId[][][] = [
    LEVEL_36.bags,
    [
        ['milk', 'veg', 'grape', 'meat'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'milk', 'veg', 'sauce'],
        ['grape', 'lemon', 'veg', 'meat'],
        ['grape', 'lemon', 'sauce', 'veg', 'milk'],
    ],
    [
        ['milk', 'veg', 'grape', 'meat'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'milk', 'veg', 'sauce'],
        ['grape', 'lemon', 'veg', 'meat'],
        ['lemon', 'sauce', 'veg', 'milk', 'grape'],
    ],
    [
        ['meat', 'veg', 'grape', 'milk'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'milk', 'veg', 'sauce'],
        ['grape', 'lemon', 'veg', 'meat'],
        ['lemon', 'sauce', 'veg', 'milk', 'grape'],
    ],
];

for (let i = 0; i < candidates.length; i++) {
    const level: LevelDef = { ...LEVEL_36, bags: candidates[i] };
    try {
        assertLevel(level);
    } catch {
        console.log('bags', i, 'assert fail');
        continue;
    }
    const win = searchWin(level, 21);
    if (!win) {
        console.log('bags', i, 'no win');
        continue;
    }
    for (let slot = 0; slot < 3; slot++) {
        const fair = tryInsert(level, win, slot);
        if (fair) {
            console.log('bags', i, 'slot', slot, 'fair', fair.length);
            console.log(JSON.stringify(candidates[i]));
            console.log(fair.map((s) => JSON.stringify(s)).join('\n'));
            process.exit(0);
        }
    }
    console.log('bags', i, 'win ok insert fail');
}
console.log('none');
process.exit(1);

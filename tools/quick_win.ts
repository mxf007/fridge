import { BoardState } from '../assets/scripts/game/BoardState';
import type { FoodId, LevelDef } from '../assets/scripts/game/types';
import { LEVEL_36 } from '../assets/scripts/game/level_36';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.join(',')}:${t.sealed ? 1 : 0}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    return `${trays}#${bags}`;
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

const bags: FoodId[][] = [
    ['milk', 'veg', 'grape', 'meat'],
    ['veg', 'meat', 'grape', 'milk'],
    ['meat', 'milk', 'veg', 'sauce'],
    ['grape', 'lemon', 'veg', 'meat'],
    ['grape', 'lemon', 'sauce', 'veg', 'milk'],
];
const level: LevelDef = { ...LEVEL_36, bags };
const w = searchWin(level, 21);
console.log(w ? w.length : 'no win');

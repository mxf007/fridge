import { BoardState } from '../assets/scripts/game/BoardState';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_42 } from './bootstrap_l42';
import { assertLevel } from '../assets/scripts/game/types';
import { assertRedoLayout } from '../assets/scripts/game/levelLayout';

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.length}:${t.sealed ? 1 : 0}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    return `${trays}#${bags}`;
}

function searchWin(): ScriptStep[] | null {
    const seen = new Set<string>();
    let nodes = 0;
    function dfs(steps: ScriptStep[]): ScriptStep[] | null {
        if (++nodes > 3_000_000) return null;
        const board = BoardState.fromLevel(LEVEL_42);
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
                const trial = BoardState.fromLevel(LEVEL_42);
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

assertLevel(LEVEL_42);
assertRedoLayout(LEVEL_42);
const w = searchWin();
console.log(w ? w.length : 'no', w ? w.map((s) => JSON.stringify(s)).join('\n') : '');

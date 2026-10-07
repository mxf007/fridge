import { BoardState } from '../assets/scripts/game/BoardState';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_43 } from '../assets/scripts/game/level_43';

function replay(b: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) b.selectTray(s.tray);
        if (s.bag != null) b.placeFromBag(s.bag);
    }
}

const seen = new Set<string>();
let nodes = 0;
const MAX = 400_000;

function dfs(steps: ScriptStep[]): ScriptStep[] | null {
    if (++nodes > MAX) return null;
    const board = BoardState.fromLevel(LEVEL_43);
    replay(board, steps);
    if (board.failReason() === 'locked_out') return steps;
    if (steps.length >= 22) return null;
    const k = `${board.trays.map((t) => t.kind + t.items.length).join('|')}#${board.bags.map((c) => c.length).join(',')}`;
    if (seen.has(k)) return null;
    seen.add(k);
    for (let c = 0; c < board.bags.length; c++) {
        if (!board.bags[c].length) continue;
        for (let t = 0; t < board.trays.length; t++) {
            const trial = BoardState.fromLevel(LEVEL_43);
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

const w = dfs([]);
console.log(w ? w.length : 'none');
if (w) console.log(w.map((s) => JSON.stringify(s)).join('\n'));

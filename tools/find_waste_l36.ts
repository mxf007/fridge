import { BoardState } from '../assets/scripts/game/BoardState';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_36 } from '../assets/scripts/game/level_36';

function replay(board: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) board.selectTray(s.tray);
        if (s.bag != null) board.placeFromBag(s.bag);
    }
}

function search(steps: ScriptStep[], seen: Set<string>): ScriptStep[] | null {
    const board = BoardState.fromLevel(LEVEL_36);
    replay(board, steps);
    const reason = board.failReason();
    if (reason === 'locked_out') return steps;
    if (steps.length >= 22 || reason === 'buffer_full') return null;
    const k = `${board.trays.map((t) => t.kind + t.items.length).join('|')}#${board.bags.map((c) => c.length).join(',')}`;
    if (seen.has(k)) return null;
    seen.add(k);
    for (let c = 0; c < board.bags.length; c++) {
        if (!board.bags[c].length) continue;
        for (let t = 0; t < board.trays.length; t++) {
            const trial = BoardState.fromLevel(LEVEL_36);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBag(c).ok) {
                const sub = search(steps.concat([{ tray: t, bag: c }]), seen);
                if (sub) return sub;
            }
        }
    }
    return null;
}

const w = search([], new Set());
if (!w) {
    console.log('none');
    process.exit(1);
}
console.log(w.map((s) => JSON.stringify(s)).join('\n'));

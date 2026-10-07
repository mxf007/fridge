import { BoardState } from '../assets/scripts/game/BoardState';
import { assertLevel } from '../assets/scripts/game/types';
import { assertRedoLayout, assertTrayGrid } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_44 } from '../assets/scripts/game/level_44';

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

function gen(steps: ScriptStep[]): ScriptStep[] {
    const board = BoardState.fromLevel(LEVEL_44);
    replay(board, steps);
    const out: ScriptStep[] = [];
    for (let c = 0; c < board.bags.length; c++) {
        if (!board.bags[c].length) continue;
        for (let t = 0; t < board.trays.length; t++) {
            const trial = BoardState.fromLevel(LEVEL_44);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBag(c).ok) out.push({ tray: t, bag: c });
        }
    }
    return out;
}

assertLevel(LEVEL_44);
assertRedoLayout(LEVEL_44);
assertTrayGrid(44, LEVEL_44.trays.map((t) => t.cap));

let frontier: ScriptStep[][] = [[]];
for (let d = 0; d < 24; d++) {
    const next = new Map<string, ScriptStep[]>();
    for (const steps of frontier) {
        const board = BoardState.fromLevel(LEVEL_44);
        replay(board, steps);
        if (board.isWin()) {
            console.log('win', steps.length);
            console.log(steps.map((s) => JSON.stringify(s)).join('\n'));
            process.exit(0);
        }
        for (const m of gen(steps)) {
            const ns = steps.concat([m]);
            const b2 = BoardState.fromLevel(LEVEL_44);
            replay(b2, ns);
            next.set(stateKey(b2), ns);
        }
    }
    frontier = [...next.values()].slice(0, 120_000);
    console.error('depth', d + 1, frontier.length);
    if (frontier.length === 0) break;
}
console.log('no win');
process.exit(1);

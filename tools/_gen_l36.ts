import { BoardState } from '../assets/scripts/game/BoardState';
import { assertRedoLayout, assertTrayGrid, playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { assertLevel } from '../assets/scripts/game/types';
import { LEVEL_36 } from '../assets/scripts/game/level_36';

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.join(',')}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    const buf = b.buffer.map((x) => x || '-').join(',');
    return `${trays}#${bags}#${buf}`;
}

function replay(board: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) board.selectTray(s.tray);
        if (s.buffer != null) board.selectBuffer(s.buffer);
        if (s.fromBuffer != null) board.placeFromBuffer(s.fromBuffer);
        else if (s.bag != null) board.placeFromBag(s.bag);
    }
}

function bufferParks(script: ScriptStep[], slot: number): number {
    let n = 0;
    for (const s of script) if (s.buffer === slot && s.bag != null) n += 1;
    return n;
}

function search(steps: ScriptStep[], max: number, seen: Set<string>, allowBuffer: boolean): ScriptStep[] | null {
    const board = BoardState.fromLevel(LEVEL_36);
    replay(board, steps);
    if (board.isWin()) return steps;
    if (steps.length >= max) return null;
    const k = stateKey(board);
    if (seen.has(k)) return null;
    seen.add(k);
    const moves: ScriptStep[] = [];
    for (let c = 0; c < board.bags.length; c++) {
        if (!board.bags[c].length) continue;
        for (let t = 0; t < board.trays.length; t++) {
            const trial = BoardState.fromLevel(LEVEL_36);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBag(c).ok) moves.push({ tray: t, bag: c });
        }
    }
    if (allowBuffer) {
        for (let bi = 0; bi < board.buffer.length; bi++) {
            if (board.buffer[bi] != null) continue;
            for (let c = 0; c < board.bags.length; c++) {
                if (!board.bags[c].length) continue;
                const trial = BoardState.fromLevel(LEVEL_36);
                replay(trial, steps);
                trial.selectBuffer(bi);
                if (trial.placeFromBag(c).ok) moves.push({ buffer: bi, bag: c });
            }
        }
        for (let bi = 0; bi < board.buffer.length; bi++) {
            if (board.buffer[bi] == null) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(LEVEL_36);
                replay(trial, steps);
                trial.selectTray(t);
                if (trial.placeFromBuffer(bi).ok) moves.push({ tray: t, fromBuffer: bi });
            }
        }
    }
    for (const m of moves) {
        const sub = search(steps.concat([m]), max, seen, allowBuffer);
        if (sub) return sub;
    }
    return null;
}

assertLevel(LEVEL_36);
assertRedoLayout(LEVEL_36);
assertTrayGrid(36, LEVEL_36.trays.map((t) => t.cap));

const win = search([], 21, new Set(), false);
console.log('win', win?.length, win ? playScript(BoardState.fromLevel(LEVEL_36), win, 'w') : null);
if (win) console.log(win.map((s) => JSON.stringify(s)).join('\n'));
else process.exit(1);

for (let slot = 0; slot < 3; slot++) {
    for (let c = 0; c < 5; c++) {
        const t = BoardState.fromLevel(LEVEL_36);
        t.selectBuffer(slot);
        if (!t.placeFromBag(c).ok) continue;
        const fair = search([{ buffer: slot, bag: c }], 30, new Set(), true);
        if (!fair) continue;
        const peak = playScript(BoardState.fromLevel(LEVEL_36), fair, 'f');
        if (peak === 1 && bufferParks(fair, slot) >= 2) {
            console.log('FAIR', fair.length, peak, bufferParks(fair, slot));
            console.log(fair.map((s) => JSON.stringify(s)).join('\n'));
            process.exit(0);
        }
    }
}
process.exit(1);

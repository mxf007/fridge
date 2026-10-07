import { BoardState } from '../assets/scripts/game/BoardState';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_45 } from '../assets/scripts/game/level_45';

function replay(b: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) b.selectTray(s.tray);
        if (s.buffer != null) b.selectBuffer(s.buffer);
        if (s.fromBuffer != null) b.placeFromBuffer(s.fromBuffer);
        else if (s.bag != null) b.placeFromBag(s.bag);
    }
}

function genMoves(steps: ScriptStep[]): ScriptStep[] {
    const board = BoardState.fromLevel(LEVEL_45);
    replay(board, steps);
    const out: ScriptStep[] = [];
    const bufMoves: ScriptStep[] = [];
    const trayMoves: ScriptStep[] = [];
    for (let bi = 0; bi < 3; bi++) {
        if (board.buffer[bi] != null) continue;
        for (let c = 0; c < 6; c++) {
            if (!board.bags[c].length) continue;
            const trial = BoardState.fromLevel(LEVEL_45);
            replay(trial, steps);
            trial.selectBuffer(bi);
            if (trial.placeFromBag(c).ok) bufMoves.push({ buffer: bi, bag: c });
        }
    }
    for (let bi = 0; bi < 3; bi++) {
        if (board.buffer[bi] == null) continue;
        for (let t = 0; t < 7; t++) {
            const trial = BoardState.fromLevel(LEVEL_45);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBuffer(bi).ok) trayMoves.push({ tray: t, fromBuffer: bi });
        }
    }
    for (let c = 0; c < 6; c++) {
        if (!board.bags[c].length) continue;
        for (let t = 0; t < 7; t++) {
            const trial = BoardState.fromLevel(LEVEL_45);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBag(c).ok) trayMoves.push({ tray: t, bag: c });
        }
    }
    return bufMoves.concat(trayMoves);
}

function stateKey(b: BoardState): string {
    return (
        b.trays.map((t) => `${t.kind || '-'}:${t.items.length}:${t.sealed ? 1 : 0}`).join('|') +
        '#' +
        b.bags.map((col) => col.join(',')).join(';') +
        '#' +
        b.buffer.map((x) => x || '-').join(',')
    );
}

const queue: ScriptStep[][] = [[]];
const seen = new Set<string>();
let nodes = 0;

while (queue.length) {
    const steps = queue.shift()!;
    if (++nodes > 4_000_000) break;
    const board = BoardState.fromLevel(LEVEL_45);
    replay(board, steps);
    const reason = board.failReason();
    if (reason === 'buffer_full') {
        console.log('waste', steps.length);
        console.log(steps.map((s) => JSON.stringify(s)).join('\n'));
        process.exit(0);
    }
    if (reason === 'locked_out' || steps.length >= 28) continue;
    const k = stateKey(board);
    if (seen.has(k)) continue;
    seen.add(k);
    for (const m of genMoves(steps)) queue.push(steps.concat([m]));
}

console.log('none', nodes);

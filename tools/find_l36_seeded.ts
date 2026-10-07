import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_36 } from '../assets/scripts/game/level_36';

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.length}:${t.sealed ? 1 : 0}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    const buf = b.buffer.map((x) => x || '-').join(',');
    return `${trays}#${bags}#${buf}`;
}

function bufferParks(steps: ScriptStep[], slot: number): number {
    let n = 0;
    for (const s of steps) if (s.buffer === slot && s.bag != null) n += 1;
    return n;
}

function sameSlotTwice(steps: ScriptStep[]): boolean {
    for (let slot = 0; slot < 3; slot++) if (bufferParks(steps, slot) >= 2) return true;
    return false;
}

function replay(board: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) board.selectTray(s.tray);
        if (s.buffer != null) board.selectBuffer(s.buffer);
        if (s.fromBuffer != null) board.placeFromBuffer(s.fromBuffer);
        else if (s.bag != null) board.placeFromBag(s.bag);
    }
}

function peakAfter(steps: ScriptStep[]): number {
    const b = BoardState.fromLevel(LEVEL_36);
    try {
        return playScript(b, steps, 'p');
    } catch {
        return 99;
    }
}

function genMoves(steps: ScriptStep[]): ScriptStep[] {
    const board = BoardState.fromLevel(LEVEL_36);
    replay(board, steps);
    const out: ScriptStep[] = [];
    for (let bi = 0; bi < board.buffer.length; bi++) {
        if (board.buffer[bi] == null) continue;
        for (let t = 0; t < board.trays.length; t++) {
            const trial = BoardState.fromLevel(LEVEL_36);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBuffer(bi).ok) out.push({ tray: t, fromBuffer: bi });
        }
    }
    for (let c = 0; c < board.bags.length; c++) {
        if (!board.bags[c].length) continue;
        for (let t = 0; t < board.trays.length; t++) {
            const trial = BoardState.fromLevel(LEVEL_36);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBag(c).ok) out.push({ tray: t, bag: c });
        }
    }
    for (let bi = 0; bi < board.buffer.length; bi++) {
        if (board.buffer[bi] != null) continue;
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            const trial = BoardState.fromLevel(LEVEL_36);
            replay(trial, steps);
            trial.selectBuffer(bi);
            if (trial.placeFromBag(c).ok) out.push({ buffer: bi, bag: c });
        }
    }
    return out;
}

let nodes = 0;
let best: ScriptStep[] | null = null;

function dfs(steps: ScriptStep[], onPath: Set<string>, maxLen: number): void {
    if (best) return;
    if (++nodes > 25_000_000) return;
    const board = BoardState.fromLevel(LEVEL_36);
    replay(board, steps);
    if (board.isWin() && sameSlotTwice(steps) && peakAfter(steps) === 1) {
        best = steps;
        return;
    }
    if (steps.length >= maxLen || peakAfter(steps) > 1) return;
    const k = stateKey(board);
    if (onPath.has(k)) return;
    onPath.add(k);
    for (const m of genMoves(steps)) {
        dfs(steps.concat([m]), onPath, maxLen);
        if (best) break;
    }
    onPath.delete(k);
}

const seeds: ScriptStep[] = [];
for (let bi = 0; bi < 3; bi++) {
    for (let c = 0; c < 5; c++) {
        const t = BoardState.fromLevel(LEVEL_36);
        t.selectBuffer(bi);
        if (t.placeFromBag(c).ok) seeds.push({ buffer: bi, bag: c });
    }
}

for (const seed of seeds) {
    nodes = 0;
    best = null;
    dfs([seed], new Set(), 27);
    if (best) {
        console.log('seed', JSON.stringify(seed), 'len', best.length, 'nodes', nodes);
        console.log(best.map((s) => JSON.stringify(s)).join('\n'));
        process.exit(0);
    }
    console.log('seed miss', JSON.stringify(seed), 'nodes', nodes);
}
console.log('none');
process.exit(1);

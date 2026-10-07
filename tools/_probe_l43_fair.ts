import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_43 } from '../assets/scripts/game/level_43';

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.length}:${t.sealed ? 1 : 0}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    const buf = b.buffer.map((x) => x || '-').join(',');
    return `${trays}#${bags}#${buf}`;
}

function replay(b: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) b.selectTray(s.tray);
        if (s.buffer != null) b.selectBuffer(s.buffer);
        if (s.fromBuffer != null) b.placeFromBuffer(s.fromBuffer);
        else if (s.bag != null) b.placeFromBag(s.bag);
    }
}

function peak(steps: ScriptStep[]): number {
    const b = BoardState.fromLevel(LEVEL_43);
    try {
        return playScript(b, steps, 'p');
    } catch {
        return 99;
    }
}

function gen(steps: ScriptStep[]): ScriptStep[] {
    const board = BoardState.fromLevel(LEVEL_43);
    replay(board, steps);
    const out: ScriptStep[] = [];
    for (let bi = 0; bi < 3; bi++) {
        if (board.buffer[bi] == null) continue;
        for (let t = 0; t < 7; t++) {
            const trial = BoardState.fromLevel(LEVEL_43);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBuffer(bi).ok) out.push({ tray: t, fromBuffer: bi });
        }
    }
    for (let c = 0; c < 6; c++) {
        if (!board.bags[c].length) continue;
        for (let t = 0; t < 7; t++) {
            const trial = BoardState.fromLevel(LEVEL_43);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBag(c).ok) out.push({ tray: t, bag: c });
        }
    }
    for (let bi = 0; bi < 3; bi++) {
        if (board.buffer[bi] != null) continue;
        for (let c = 0; c < 6; c++) {
            if (!board.bags[c].length) continue;
            const trial = BoardState.fromLevel(LEVEL_43);
            replay(trial, steps);
            trial.selectBuffer(bi);
            if (trial.placeFromBag(c).ok) out.push({ buffer: bi, bag: c });
        }
    }
    return out;
}

let bestPeak2: ScriptStep[] | null = null;
let bestAny: { peak: number; steps: ScriptStep[] } | null = null;
let nodes = 0;

function dfs(steps: ScriptStep[], seen: Set<string>) {
    if (bestPeak2) return;
    if (++nodes > 1_200_000) return;
    if (peak(steps) > 2) return;
    const board = BoardState.fromLevel(LEVEL_43);
    replay(board, steps);
    if (board.isWin()) {
        const p = peak(steps);
        if (!bestAny || p > bestAny.peak || (p === bestAny.peak && steps.length < bestAny.steps.length)) {
            bestAny = { peak: p, steps: steps.slice() };
        }
        if (p === 2) bestPeak2 = steps.slice();
        return;
    }
    if (steps.length >= 36) return;
    const k = stateKey(board);
    if (seen.has(k)) return;
    seen.add(k);
    for (const m of gen(steps)) dfs(steps.concat([m]), seen);
}

dfs([], new Set());
console.log('nodes', nodes);
console.log('peak2', bestPeak2 ? bestPeak2.length : 'none');
if (bestPeak2) console.log(bestPeak2.map((s) => JSON.stringify(s)).join('\n'));
console.log('bestAny', bestAny ? `${bestAny.peak} len ${bestAny.steps.length}` : 'none');

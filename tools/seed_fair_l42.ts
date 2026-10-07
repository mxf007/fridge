import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_42 } from '../assets/scripts/game/level_42';

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
    const b = BoardState.fromLevel(LEVEL_42);
    try {
        return playScript(b, steps, 'p');
    } catch {
        return 99;
    }
}

function gen(steps: ScriptStep[]): ScriptStep[] {
    const board = BoardState.fromLevel(LEVEL_42);
    replay(board, steps);
    const out: ScriptStep[] = [];
    for (let bi = 0; bi < 3; bi++) {
        if (board.buffer[bi] == null) continue;
        for (let t = 0; t < 6; t++) {
            const trial = BoardState.fromLevel(LEVEL_42);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBuffer(bi).ok) out.push({ tray: t, fromBuffer: bi });
        }
    }
    for (let c = 0; c < 6; c++) {
        if (!board.bags[c].length) continue;
        for (let t = 0; t < 6; t++) {
            const trial = BoardState.fromLevel(LEVEL_42);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBag(c).ok) out.push({ tray: t, bag: c });
        }
    }
    for (let bi = 0; bi < 3; bi++) {
        if (board.buffer[bi] != null) continue;
        for (let c = 0; c < 6; c++) {
            if (!board.bags[c].length) continue;
            const trial = BoardState.fromLevel(LEVEL_42);
            replay(trial, steps);
            trial.selectBuffer(bi);
            if (trial.placeFromBag(c).ok) out.push({ buffer: bi, bag: c });
        }
    }
    return out;
}

let best: ScriptStep[] | null = null;
let nodes = 0;

function dfs(steps: ScriptStep[], seen: Set<string>) {
    if (best || ++nodes > 800_000) return;
    if (peak(steps) > 2) return;
    const board = BoardState.fromLevel(LEVEL_42);
    replay(board, steps);
    if (board.isWin() && peak(steps) === 2) {
        best = steps.slice();
        return;
    }
    if (steps.length >= 32) return;
    const k = stateKey(board);
    if (seen.has(k)) return;
    seen.add(k);
    for (const m of gen(steps)) dfs(steps.concat([m]), seen);
}

for (let b0 = 0; b0 < 6; b0++) {
    for (let b1 = 0; b1 < 6; b1++) {
        if (b0 === b1) continue;
        nodes = 0;
        dfs([{ buffer: 0, bag: b0 }, { buffer: 1, bag: b1 }], new Set());
        if (best) break;
    }
    if (best) break;
}

if (!best) {
    console.log('none');
    process.exit(1);
}
console.log('fair', best.length, 'peak', peak(best));
console.log(best.map((s) => JSON.stringify(s)).join('\n'));

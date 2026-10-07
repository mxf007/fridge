import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
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
    for (let bi = 0; bi < 3; bi++) {
        if (board.buffer[bi] == null) continue;
        for (let t = 0; t < 7; t++) {
            const trial = BoardState.fromLevel(LEVEL_45);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBuffer(bi).ok) out.push({ tray: t, fromBuffer: bi });
        }
    }
    for (let c = 0; c < 6; c++) {
        if (!board.bags[c].length) continue;
        for (let t = 0; t < 7; t++) {
            const trial = BoardState.fromLevel(LEVEL_45);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBag(c).ok) out.push({ tray: t, bag: c });
        }
    }
    for (let bi = 0; bi < 3; bi++) {
        if (board.buffer[bi] != null) continue;
        for (let c = 0; c < 6; c++) {
            if (!board.bags[c].length) continue;
            const trial = BoardState.fromLevel(LEVEL_45);
            replay(trial, steps);
            trial.selectBuffer(bi);
            if (trial.placeFromBag(c).ok) out.push({ buffer: bi, bag: c });
        }
    }
    return out;
}

function peak(steps: ScriptStep[]): number {
    const b = BoardState.fromLevel(LEVEL_45);
    try {
        return playScript(b, steps, 'p');
    } catch {
        return 99;
    }
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

let nodes = 0;
function dfs(steps: ScriptStep[], limit: number, seen: Set<string>): ScriptStep[] | null {
    if (++nodes > 8_000_000) return null;
    if (peak(steps) > 2) return null;
    const board = BoardState.fromLevel(LEVEL_45);
    replay(board, steps);
    if (board.isWin() && peak(steps) === 2) return steps;
    if (steps.length >= limit) return null;
    const k = stateKey(board);
    if (seen.has(k)) return null;
    seen.add(k);
    for (const m of genMoves(steps)) {
        const sub = dfs(steps.concat([m]), limit, seen);
        if (sub) return sub;
    }
    return null;
}

for (let limit = 26; limit <= 34; limit++) {
    nodes = 0;
    const found = dfs([], limit, new Set());
    if (found) {
        console.log('fair', found.length, 'limit', limit, 'nodes', nodes);
        console.log(found.map((s) => JSON.stringify(s)).join('\n'));
        process.exit(0);
    }
    console.log('limit', limit, 'none', nodes);
}
console.log('all none');

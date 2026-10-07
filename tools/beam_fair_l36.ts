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

function parks(steps: ScriptStep[], slot: number): number {
    let n = 0;
    for (const s of steps) if (s.buffer === slot && s.bag != null) n += 1;
    return n;
}

function replay(board: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) board.selectTray(s.tray);
        if (s.buffer != null) board.selectBuffer(s.buffer);
        if (s.fromBuffer != null) board.placeFromBuffer(s.fromBuffer);
        else if (s.bag != null) board.placeFromBag(s.bag);
    }
}

function peak(steps: ScriptStep[]): number {
    const b = BoardState.fromLevel(LEVEL_36);
    try {
        return playScript(b, steps, 'p');
    } catch {
        return 99;
    }
}

function bagLeft(b: BoardState): number {
    let n = 0;
    for (const col of b.bags) n += col.length;
    return n;
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

const BEAM = 80_000;
const MAX = 27;

let frontier: ScriptStep[][] = [[]];

for (let depth = 0; depth < MAX; depth++) {
    const nextMap = new Map<string, { steps: ScriptStep[]; score: number }>();
    for (const steps of frontier) {
        const board = BoardState.fromLevel(LEVEL_36);
        replay(board, steps);
        const p0 = parks(steps, 0);
        const p1 = parks(steps, 1);
        const p2 = parks(steps, 2);
        if (board.isWin() && peak(steps) === 1 && (p0 >= 2 || p1 >= 2 || p2 >= 2)) {
            console.log('fair', steps.length, 'p0', p0, 'p1', p1, 'p2', p2);
            console.log(steps.map((s) => JSON.stringify(s)).join('\n'));
            process.exit(0);
        }
        if (peak(steps) > 1) continue;
        for (const m of genMoves(steps)) {
            const ns = steps.concat([m]);
            const b2 = BoardState.fromLevel(LEVEL_36);
            replay(b2, ns);
            const k = stateKey(b2);
            const pk = parks(ns, 0);
            const score = bagLeft(b2) * 10 - pk * 100 - b2.trays.filter((t) => t.sealed).length * 5;
            const prev = nextMap.get(k);
            if (!prev || score < prev.score) nextMap.set(k, { steps: ns, score });
        }
    }
    frontier = [...nextMap.values()]
        .sort((a, b) => a.score - b.score)
        .slice(0, BEAM)
        .map((x) => x.steps);
    console.log(`depth ${depth + 1} beam ${frontier.length}`);
    if (frontier.length === 0) break;
}
console.log('none');
process.exit(1);

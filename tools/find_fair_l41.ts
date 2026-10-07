import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import type { LevelDef } from '../assets/scripts/game/types';

const LEVEL_41: LevelDef = {
    id: 41,
    title: '双宽格',
    teach: '两只柜台槽可以同时占满',
    trays: [{ cap: 5 }, { cap: 5 }, { cap: 4 }, { cap: 4 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['milk', 'veg', 'meat', 'grape'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'grape', 'milk', 'veg'],
        ['grape', 'milk', 'lemon', 'meat'],
        ['lemon', 'sauce', 'veg', 'sauce'],
        ['sauce', 'lemon', 'meat', 'grape'],
    ],
    buffer: 3,
    loseable: true,
};

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.length}:${t.sealed ? 1 : 0}`).join('|');
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

function peakAfter(steps: ScriptStep[]): number {
    const b = BoardState.fromLevel(LEVEL_41);
    try {
        return playScript(b, steps, 'p');
    } catch {
        return 99;
    }
}

function usesBuffer(steps: ScriptStep[]): boolean {
    for (const s of steps) if (s.buffer != null || s.fromBuffer != null) return true;
    return false;
}

function genMoves(steps: ScriptStep[]): ScriptStep[] {
    const board = BoardState.fromLevel(LEVEL_41);
    replay(board, steps);
    const out: ScriptStep[] = [];
    for (let bi = 0; bi < board.buffer.length; bi++) {
        if (board.buffer[bi] == null) continue;
        for (let t = 0; t < board.trays.length; t++) {
            const trial = BoardState.fromLevel(LEVEL_41);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBuffer(bi).ok) out.push({ tray: t, fromBuffer: bi });
        }
    }
    for (let c = 0; c < board.bags.length; c++) {
        if (!board.bags[c].length) continue;
        for (let t = 0; t < board.trays.length; t++) {
            const trial = BoardState.fromLevel(LEVEL_41);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBag(c).ok) out.push({ tray: t, bag: c });
        }
    }
    for (let bi = 0; bi < board.buffer.length; bi++) {
        if (board.buffer[bi] != null) continue;
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            const trial = BoardState.fromLevel(LEVEL_41);
            replay(trial, steps);
            trial.selectBuffer(bi);
            if (trial.placeFromBag(c).ok) out.push({ buffer: bi, bag: c });
        }
    }
    return out;
}

const BEAM = 120_000;
const MAX = 29;

let frontier: ScriptStep[][] = [[]];
let best: ScriptStep[] | null = null;

for (let depth = 0; depth < MAX; depth++) {
    const nextMap = new Map<string, ScriptStep[]>();
    for (const steps of frontier) {
        if (peakAfter(steps) > 2) continue;
        const board = BoardState.fromLevel(LEVEL_41);
        replay(board, steps);
        if (board.isWin() && peakAfter(steps) === 2 && usesBuffer(steps)) {
            if (!best || steps.length < best.length) best = steps;
            continue;
        }
        for (const m of genMoves(steps)) {
            const ns = steps.concat([m]);
            if (peakAfter(ns) > 2) continue;
            const b2 = BoardState.fromLevel(LEVEL_41);
            replay(b2, ns);
            const k = stateKey(b2);
            if (!nextMap.has(k)) nextMap.set(k, ns);
        }
    }
    frontier = [...nextMap.values()].slice(0, BEAM);
    console.log(`depth ${depth + 1} beam ${frontier.length}`);
    if (best) break;
    if (frontier.length === 0) break;
}

if (!best) {
    console.log('none');
    process.exit(1);
}
console.log('fair', best.length, 'peak', peakAfter(best));
console.log(best.map((s) => JSON.stringify(s)).join('\n'));

import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_45 } from '../assets/scripts/game/level_45';

const TRAYS = 7;
const BAGS = 6;

function replay(b: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) b.selectTray(s.tray);
        if (s.buffer != null) b.selectBuffer(s.buffer);
        if (s.fromBuffer != null) b.placeFromBuffer(s.fromBuffer);
        else if (s.bag != null) b.placeFromBag(s.bag);
    }
}

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.length}:${t.sealed ? 1 : 0}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    const buffer = b.buffer.map((x) => x || '-').join(',');
    return `${trays}#${bags}#${buffer}`;
}

function genMoves(steps: ScriptStep[]): ScriptStep[] {
    const board = BoardState.fromLevel(LEVEL_45);
    replay(board, steps);
    const out: ScriptStep[] = [];
    for (let bi = 0; bi < 3; bi++) {
        if (board.buffer[bi] == null) continue;
        for (let t = 0; t < TRAYS; t++) {
            const trial = BoardState.fromLevel(LEVEL_45);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBuffer(bi).ok) out.push({ tray: t, fromBuffer: bi });
        }
    }
    for (let c = 0; c < BAGS; c++) {
        if (!board.bags[c].length) continue;
        for (let t = 0; t < TRAYS; t++) {
            const trial = BoardState.fromLevel(LEVEL_45);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBag(c).ok) out.push({ tray: t, bag: c });
        }
    }
    for (let bi = 0; bi < 3; bi++) {
        if (board.buffer[bi] != null) continue;
        for (let c = 0; c < BAGS; c++) {
            if (!board.bags[c].length) continue;
            const trial = BoardState.fromLevel(LEVEL_45);
            replay(trial, steps);
            trial.selectBuffer(bi);
            if (trial.placeFromBag(c).ok) out.push({ buffer: bi, bag: c });
        }
    }
    return out;
}

function seedFair(): ScriptStep[] | null {
    let best: ScriptStep[] | null = null;
    let nodes = 0;
    function peak(steps: ScriptStep[]): number {
        const b = BoardState.fromLevel(LEVEL_45);
        try {
            return playScript(b, steps, 'p');
        } catch {
            return 99;
        }
    }
    function dfs(steps: ScriptStep[], seen: Set<string>) {
        if (best || ++nodes > 2_500_000) return;
        if (peak(steps) > 2) return;
        const board = BoardState.fromLevel(LEVEL_45);
        replay(board, steps);
        if (board.isWin() && peak(steps) === 2) {
            best = steps.slice();
            return;
        }
        if (steps.length >= 34) return;
        const k = stateKey(board);
        if (seen.has(k)) return;
        seen.add(k);
        for (const m of genMoves(steps)) dfs(steps.concat([m]), seen);
    }
    for (let b0 = 0; b0 < BAGS; b0++) {
        for (let b1 = 0; b1 < BAGS; b1++) {
            if (b0 === b1) continue;
            for (let b2 = 0; b2 < BAGS; b2++) {
                if (b2 === b0 || b2 === b1) continue;
                nodes = 0;
                dfs(
                    [
                        { buffer: 0, bag: b0 },
                        { buffer: 1, bag: b1 },
                        { buffer: 2, bag: b2 },
                    ],
                    new Set(),
                );
                if (best) return best;
            }
        }
    }
    for (let b0 = 0; b0 < BAGS; b0++) {
        for (let b1 = 0; b1 < BAGS; b1++) {
            if (b0 === b1) continue;
            nodes = 0;
            dfs([{ buffer: 0, bag: b0 }, { buffer: 1, bag: b1 }], new Set());
            if (best) return best;
        }
    }
    return best;
}

function searchWaste(): ScriptStep[] | null {
    const seen = new Set<string>();
    let nodes = 0;
    function dfs(steps: ScriptStep[]): ScriptStep[] | null {
        if (++nodes > 3_000_000) return null;
        const board = BoardState.fromLevel(LEVEL_45);
        replay(board, steps);
        const reason = board.failReason();
        if (reason === 'buffer_full') return steps;
        if (reason === 'locked_out') return null;
        if (steps.length >= 30) return null;
        const k = stateKey(board);
        if (seen.has(k)) return null;
        seen.add(k);
        for (const m of genMoves(steps)) {
            const sub = dfs(steps.concat([m]));
            if (sub) return sub;
        }
        return null;
    }
    return dfs([]);
}

const fair = seedFair();
console.log('fair', fair ? fair.length : 'none');
if (fair) console.log(fair.map((s) => JSON.stringify(s)).join('\n'));

const waste = searchWaste();
console.log('waste', waste ? waste.length : 'none');
if (waste) console.log(waste.map((s) => JSON.stringify(s)).join('\n'));

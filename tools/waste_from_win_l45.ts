import { BoardState } from '../assets/scripts/game/BoardState';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_45 } from '../assets/scripts/game/level_45';
import { playScript } from '../assets/scripts/game/levelLayout';

const WIN: ScriptStep[] = [
    { tray: 0, bag: 0 },
    { tray: 1, bag: 0 },
    { tray: 4, bag: 0 },
    { tray: 2, bag: 0 },
    { tray: 2, bag: 1 },
    { tray: 3, bag: 1 },
    { tray: 0, bag: 1 },
    { tray: 1, bag: 1 },
    { tray: 1, bag: 2 },
    { tray: 2, bag: 2 },
    { tray: 3, bag: 2 },
    { tray: 0, bag: 2 },
    { tray: 0, bag: 3 },
    { tray: 6, bag: 3 },
    { tray: 2, bag: 3 },
    { tray: 3, bag: 3 },
    { tray: 5, bag: 4 },
    { tray: 4, bag: 4 },
    { tray: 1, bag: 4 },
    { tray: 5, bag: 4 },
    { tray: 0, bag: 5 },
    { tray: 0, bag: 5 },
    { tray: 0, bag: 5 },
    { tray: 0, bag: 5 },
];

function replay(b: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) b.selectTray(s.tray);
        if (s.buffer != null) b.selectBuffer(s.buffer);
        if (s.fromBuffer != null) b.placeFromBuffer(s.fromBuffer);
        else if (s.bag != null) b.placeFromBag(s.bag);
    }
}

function gen(steps: ScriptStep[]): ScriptStep[] {
    const board = BoardState.fromLevel(LEVEL_45);
    replay(board, steps);
    const out: ScriptStep[] = [];
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
        if (board.buffer[bi] == null) continue;
        for (let t = 0; t < 7; t++) {
            const trial = BoardState.fromLevel(LEVEL_45);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBuffer(bi).ok) out.push({ tray: t, fromBuffer: bi });
        }
    }
    return out;
}

function dfs(prefix: ScriptStep[], depth: number): ScriptStep[] | null {
    const board = BoardState.fromLevel(LEVEL_45);
    replay(board, prefix);
    const reason = board.failReason();
    if (reason === 'buffer_full') return prefix;
    if (reason === 'locked_out' || prefix.length >= depth) return null;
    for (const m of gen(prefix)) {
        const sub = dfs(prefix.concat([m]), depth);
        if (sub) return sub;
    }
    return null;
}

for (let cut = 8; cut <= 18; cut++) {
    const prefix = WIN.slice(0, cut);
    const w = dfs(prefix, cut + 14);
    if (w) {
        console.log('from cut', cut, 'len', w.length);
        console.log(w.map((s) => JSON.stringify(s)).join('\n'));
        process.exit(0);
    }
}

// deviate one step in middle
for (let cut = 10; cut <= 16; cut++) {
    const prefix = WIN.slice(0, cut);
    for (const m of gen(prefix)) {
        if (JSON.stringify(m) === JSON.stringify(WIN[cut])) continue;
        const w = dfs(prefix.concat([m]), cut + 16);
        if (w) {
            console.log('deviate at', cut, 'len', w.length);
            console.log(w.map((s) => JSON.stringify(s)).join('\n'));
            process.exit(0);
        }
    }
}

console.log('none');

import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_43 } from '../assets/scripts/game/level_43';

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

function legalMoves(steps: ScriptStep[]): ScriptStep[] {
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

const starts: ScriptStep[][] = [];
for (let b0 = 0; b0 < 6; b0++) {
    for (let b1 = 0; b1 < 6; b1++) {
        if (b0 === b1) continue;
        starts.push([{ buffer: 0, bag: b0 }, { buffer: 1, bag: b1 }]);
    }
}

for (const start of starts) {
    const steps = start.slice();
    for (let guard = 0; guard < 40; guard++) {
        const board = BoardState.fromLevel(LEVEL_43);
        replay(board, steps);
        if (board.isWin()) {
            const p = peak(steps);
            if (p === 2) {
                console.log('fair', steps.length, 'start', JSON.stringify(start));
                console.log(steps.map((s) => JSON.stringify(s)).join('\n'));
                process.exit(0);
            }
            break;
        }
        const moves = legalMoves(steps);
        if (!moves.length) break;
        let pick = moves[0];
        let bestScore = -1e9;
        for (const m of moves) {
            const ns = steps.concat([m]);
            if (peak(ns) > 2) continue;
            const t = BoardState.fromLevel(LEVEL_43);
            replay(t, ns);
            let score = t.steps;
            for (let c = 0; c < t.bags.length; c++) score += t.bags[c].length * 2;
            if (m.fromBuffer != null) score += 5;
            if (score > bestScore) {
                bestScore = score;
                pick = m;
            }
        }
        steps.push(pick);
    }
}
console.log('none');

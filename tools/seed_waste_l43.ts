/**
 * 随机 + 浅 DFS 找 locked_out 浪费脚本。
 */
import { BoardState } from '../assets/scripts/game/BoardState';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_43 } from '../assets/scripts/game/level_43';

function replay(b: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) b.selectTray(s.tray);
        if (s.bag != null) b.placeFromBag(s.bag);
    }
}

function gen(steps: ScriptStep[]): ScriptStep[] {
    const board = BoardState.fromLevel(LEVEL_43);
    replay(board, steps);
    const out: ScriptStep[] = [];
    for (let c = 0; c < board.bags.length; c++) {
        if (!board.bags[c].length) continue;
        for (let t = 0; t < board.trays.length; t++) {
            const trial = BoardState.fromLevel(LEVEL_43);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBag(c).ok) out.push({ tray: t, bag: c });
        }
    }
    return out;
}

function check(steps: ScriptStep[]): ScriptStep[] | null {
    const board = BoardState.fromLevel(LEVEL_43);
    replay(board, steps);
    if (board.isWin()) return null;
    if (board.failReason() === 'locked_out') return steps;
    return null;
}

for (let seed = 0; seed < 50000; seed++) {
    let steps: ScriptStep[] = [];
    let rng = seed;
    const rand = () => {
        rng = (rng * 1103515245 + 12345) & 0x7fffffff;
        return rng;
    };
    for (let d = 0; d < 26; d++) {
        const moves = gen(steps);
        if (!moves.length) break;
        steps = steps.concat(moves[rand() % moves.length]);
        const hit = check(steps);
        if (hit) {
            console.log('waste', hit.length, 'seed', seed);
            console.log(hit.map((s) => JSON.stringify(s)).join('\n'));
            process.exit(0);
        }
    }
}
console.log('none');

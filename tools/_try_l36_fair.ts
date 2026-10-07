import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_36 } from '../assets/scripts/game/level_36';

const win: ScriptStep[] = [
    { tray: 3, bag: 0 },
    { tray: 1, bag: 0 },
    { tray: 0, bag: 0 },
    { tray: 2, bag: 0 },
    { tray: 2, bag: 1 },
    { tray: 4, bag: 1 },
    { tray: 1, bag: 1 },
    { tray: 0, bag: 1 },
    { tray: 3, bag: 2 },
    { tray: 0, bag: 2 },
    { tray: 2, bag: 2 },
    { tray: 1, bag: 2 },
    { tray: 1, bag: 3 },
    { tray: 0, bag: 3 },
    { tray: 5, bag: 3 },
    { tray: 4, bag: 3 },
    { tray: 1, bag: 4 },
    { tray: 2, bag: 4 },
    { tray: 0, bag: 4 },
    { tray: 0, bag: 4 },
    { tray: 0, bag: 4 },
];

function parks(script: ScriptStep[], slot: number) {
    let n = 0;
    for (const s of script) if (s.buffer === slot && s.bag != null) n++;
    return n;
}

function tryScript(script: ScriptStep[]) {
    const b = BoardState.fromLevel(LEVEL_36);
    const peak = playScript(b, script, 't');
    return { win: b.isWin(), peak, steps: b.steps, p0: parks(script, 0), p1: parks(script, 1), p2: parks(script, 2) };
}

// park grape, win middle, park lemon later, finish
const candidates: ScriptStep[][] = [
    [{ buffer: 0, bag: 4 }, ...win],
    [{ buffer: 0, bag: 4 }, ...win.slice(0, 10), { buffer: 0, bag: 4 }, ...win.slice(10)],
    [
        { buffer: 0, bag: 4 },
        { tray: 3, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 2, bag: 0 },
        { buffer: 0, bag: 4 },
        ...win.slice(5),
    ],
];

for (let i = 0; i < candidates.length; i++) {
    const r = tryScript(candidates[i]);
    console.log(i, r);
}

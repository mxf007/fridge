import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_43 } from '../assets/scripts/game/level_43';

const win: ScriptStep[] = [
    { tray: 0, bag: 0 },
    { tray: 1, bag: 0 },
    { tray: 5, bag: 0 },
    { tray: 2, bag: 0 },
    { tray: 2, bag: 1 },
    { tray: 3, bag: 1 },
    { tray: 0, bag: 1 },
    { tray: 1, bag: 1 },
    { tray: 1, bag: 2 },
    { tray: 6, bag: 2 },
    { tray: 3, bag: 2 },
    { tray: 0, bag: 2 },
    { tray: 0, bag: 3 },
    { tray: 4, bag: 3 },
    { tray: 2, bag: 3 },
    { tray: 3, bag: 3 },
    { tray: 4, bag: 4 },
    { tray: 1, bag: 4 },
    { tray: 6, bag: 4 },
    { tray: 4, bag: 4 },
    { tray: 2, bag: 5 },
    { tray: 0, bag: 5 },
    { tray: 0, bag: 5 },
    { tray: 0, bag: 5 },
];

function test(steps: ScriptStep[]) {
    const b = BoardState.fromLevel(LEVEL_43);
    try {
        playScript(b, steps, 'w');
    } catch {
        return;
    }
    if (!b.isWin() && b.failReason() === 'locked_out') {
        console.log('waste', steps.length);
        console.log(steps.map((s) => JSON.stringify(s)).join('\n'));
        process.exit(0);
    }
}

for (let i = 0; i < win.length; i++) {
    for (let t = 0; t < 7; t++) {
        if (t === win[i].tray) continue;
        test(win.slice(0, i).concat([{ tray: t, bag: win[i].bag }]).concat(win.slice(i + 1)));
    }
}
for (let i = 0; i < win.length; i++) {
    for (let t = 0; t < 7; t++) {
        test(win.slice(0, i).concat([{ tray: t, bag: win[i].bag }]));
    }
}
console.log('none');

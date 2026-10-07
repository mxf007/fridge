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

function replay(b: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) b.selectTray(s.tray);
        if (s.bag != null) b.placeFromBag(s.bag);
    }
}

for (let i = 2; i < win.length; i++) {
    for (let t = 0; t < 7; t++) {
        const w = win[i];
        if (t === w.tray) continue;
        const steps = win.slice(0, i).concat([{ tray: t, bag: w.bag }]);
        const b = BoardState.fromLevel(LEVEL_43);
        try {
            playScript(b, steps, 'w');
        } catch {
            continue;
        }
        if (!b.isWin() && b.failReason() === 'locked_out') {
            console.log('waste', steps.length, 'at', i, 'tray', t);
            console.log(steps.map((s) => JSON.stringify(s)).join('\n'));
            process.exit(0);
        }
    }
}

// L42-style: wrong cap-3 tray -> L43 use tray6 instead of tray5 for sauce step
const alt = win.slice(0, 14).concat([
    { tray: 6, bag: 3 },
    { tray: 3, bag: 3 },
    { tray: 1, bag: 3 },
    { tray: 5, bag: 4 },
    { tray: 2, bag: 4 },
    { tray: 4, bag: 4 },
    { tray: 1, bag: 5 },
    { tray: 0, bag: 5 },
    { tray: 6, bag: 5 },
]);
const b = BoardState.fromLevel(LEVEL_43);
try {
    playScript(b, alt, 'alt');
    console.log('alt', b.isWin(), b.failReason(), b.steps);
} catch (e) {
    console.log('alt err', String(e).slice(0, 80));
}
console.log('none');

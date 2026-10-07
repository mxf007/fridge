import { BoardState } from '../assets/scripts/game/BoardState';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_43 } from '../assets/scripts/game/level_43';

const prefix: ScriptStep[] = [
    { tray: 0, bag: 0 },
    { tray: 1, bag: 0 },
    { tray: 2, bag: 0 },
    { tray: 2, bag: 1 },
    { tray: 3, bag: 1 },
    { tray: 0, bag: 1 },
    { tray: 1, bag: 1 },
    { tray: 1, bag: 2 },
    { tray: 3, bag: 2 },
    { tray: 0, bag: 2 },
    { tray: 0, bag: 3 },
    { tray: 4, bag: 3 },
    { tray: 2, bag: 3 },
    { tray: 3, bag: 3 },
    { tray: 4, bag: 4 },
    { tray: 1, bag: 4 },
];

function replay(b: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) b.selectTray(s.tray);
        if (s.bag != null) b.placeFromBag(s.bag);
    }
}

for (let t = 0; t < 7; t++) {
    for (let c = 0; c < 6; c++) {
        const steps = prefix.concat([{ tray: t, bag: c }]);
        const b = BoardState.fromLevel(LEVEL_43);
        replay(b, steps);
        if (b.failReason() === 'locked_out') {
            console.log('locked at', t, c, steps.length);
            console.log(steps.map((s) => JSON.stringify(s)).join('\n'));
            process.exit(0);
        }
    }
}
console.log('none prefix');

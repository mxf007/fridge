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

function tryScript(script: ScriptStep[]): boolean {
    const b = BoardState.fromLevel(LEVEL_43);
    try {
        const p = playScript(b, script, 't');
        return b.isWin() && p === 2;
    } catch {
        return false;
    }
}

for (let b0 = 0; b0 < 6; b0++) {
    for (let b1 = 0; b1 < 6; b1++) {
        if (b0 === b1) continue;
        for (let k1 = 0; k1 <= 4; k1++) {
            for (let t0 = 0; t0 < 7; t0++) {
                for (let k2 = k1; k2 <= 4; k2++) {
                    for (let t1 = 0; t1 < 7; t1++) {
                        const script: ScriptStep[] = [
                            { buffer: 0, bag: b0 },
                            { buffer: 1, bag: b1 },
                            ...win.slice(0, k1),
                            { tray: t0, fromBuffer: 0 },
                            ...win.slice(k1, k2),
                            { tray: t1, fromBuffer: 1 },
                            ...win.slice(k2),
                        ];
                        if (tryScript(script)) {
                            console.log('fair', script.length);
                            console.log(script.map((s) => JSON.stringify(s)).join('\n'));
                            process.exit(0);
                        }
                    }
                }
            }
        }
    }
}
console.log('none');

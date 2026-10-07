import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_45 } from '../assets/scripts/game/level_45';

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
    { tray: 5, bag: 3 },
    { tray: 2, bag: 3 },
    { tray: 3, bag: 3 },
    { tray: 5, bag: 4 },
    { tray: 1, bag: 4 },
    { tray: 6, bag: 4 },
    { tray: 5, bag: 4 },
    { tray: 4, bag: 5 },
    { tray: 3, bag: 5 },
    { tray: 0, bag: 5 },
    { tray: 0, bag: 5 },
];

const seeds: ScriptStep[][] = [];
for (let b0 = 0; b0 < 6; b0++) {
    for (let b1 = 0; b1 < 6; b1++) {
        if (b0 === b1) continue;
        seeds.push([
            { buffer: 0, bag: b0 },
            { buffer: 1, bag: b1 },
            { tray: 0, fromBuffer: 0 },
            { tray: 1, fromBuffer: 1 },
            ...WIN.slice(2),
        ]);
    }
}

for (const script of seeds) {
    const b = BoardState.fromLevel(LEVEL_45);
    try {
        const peak = playScript(b, script, 't');
        if (b.isWin() && peak === 2) {
            console.log('OK peak 2 len', script.length);
            console.log(script.map((s) => JSON.stringify(s)).join('\n'));
            process.exit(0);
        }
    } catch {
        /* invalid */
    }
}
console.log('none');

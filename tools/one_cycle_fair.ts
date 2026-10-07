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

function slotUses(steps: ScriptStep[], slot: number): number {
    let n = 0;
    for (const s of steps) {
        if (s.buffer === slot && s.bag != null) n += 1;
        if (s.fromBuffer === slot) n += 1;
    }
    return n;
}

function ok(script: ScriptStep[]): boolean {
    const b = BoardState.fromLevel(LEVEL_36);
    try {
        const peak = playScript(b, script, 't');
        return b.isWin() && peak === 1 && slotUses(script, 0) >= 2;
    } catch {
        return false;
    }
}

let best: ScriptStep[] | null = null;

for (let b0 = 0; b0 < 5; b0++) {
    for (let skip = 0; skip <= 1; skip++) {
        const tail = skip === 0 ? win : win.slice(1);
        for (let k = 0; k <= tail.length; k++) {
            for (let t = 0; t < 6; t++) {
                const script: ScriptStep[] = [
                    { buffer: 0, bag: b0 },
                    ...tail.slice(0, k),
                    { tray: t, fromBuffer: 0 },
                    ...tail.slice(k),
                ];
                if (!ok(script)) continue;
                if (!best || script.length < best.length) best = script;
            }
        }
    }
}

if (!best) {
    console.log('none');
    process.exit(1);
}
console.log('fair', best.length, 'uses', slotUses(best, 0));
console.log(best.map((s) => JSON.stringify(s)).join('\n'));

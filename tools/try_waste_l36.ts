import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_36 } from '../assets/scripts/game/level_36';

const waste: ScriptStep[] = [
    { tray: 0, bag: 0 },
    { tray: 3, bag: 4 },
    { tray: 2, bag: 4 },
    { tray: 5, bag: 4 },
    { tray: 4, bag: 4 },
    { tray: 0, bag: 3 },
    { tray: 2, bag: 3 },
    { tray: 4, bag: 3 },
    { tray: 1, bag: 3 },
    { tray: 5, bag: 2 },
    { tray: 2, bag: 2 },
    { tray: 3, bag: 2 },
    { tray: 0, bag: 2 },
    { tray: 3, bag: 1 },
    { tray: 1, bag: 1 },
    { tray: 0, bag: 1 },
    { tray: 1, bag: 0 },
    { tray: 2, bag: 0 },
];

const fail = BoardState.fromLevel(LEVEL_36);
try {
    playScript(fail, waste, 'w');
    console.log(fail.isWin(), fail.failReason());
} catch (e) {
    console.log('err', e);
}

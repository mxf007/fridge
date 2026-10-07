import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import { LEVEL_43 } from '../assets/scripts/game/level_43';

const candidates = [
    [
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 5, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 5, bag: 1 },
        { tray: 0, bag: 2 },
    ],
    [
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 5, bag: 2 },
        { tray: 0, bag: 2 },
    ],
];

for (const script of candidates) {
    const b = BoardState.fromLevel(LEVEL_43);
    try {
        playScript(b, script, 'w');
        console.log('steps', script.length, 'win', b.isWin(), 'fail', b.failReason());
    } catch (e) {
        console.log('err', String(e).slice(0, 80));
    }
}

import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import { LEVEL_42 } from './bootstrap_l42';

const candidates = [
    [
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 5, bag: 4 },
        { tray: 2, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 0, bag: 5 },
        { tray: 0, bag: 5 },
        { tray: 0, bag: 5 },
        { tray: 0, bag: 5 },
    ],
];

for (let i = 0; i < candidates.length; i++) {
    const b = BoardState.fromLevel(LEVEL_42);
    try {
        const peak = playScript(b, candidates[i], 't');
        console.log(i, b.isWin(), peak, b.steps);
    } catch (e) {
        console.log(i, 'err', String(e).slice(0, 120));
    }
}

import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import { LEVEL_43 } from '../assets/scripts/game/level_43';

const win = [
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

const fair = [
    { buffer: 0, bag: 0 },
    { buffer: 1, bag: 1 },
    { tray: 0, fromBuffer: 0 },
    { tray: 1, fromBuffer: 1 },
    ...win.slice(2),
];

const b = BoardState.fromLevel(LEVEL_43);
const p = playScript(b, fair, 'fair');
console.log('win', b.isWin(), 'steps', b.steps, 'peak', p, 'len', fair.length);

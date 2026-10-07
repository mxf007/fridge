import { BoardState } from '../assets/scripts/game/BoardState';
import { LEVEL_43 } from '../assets/scripts/game/level_43';

const winScript = [
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

const b = BoardState.fromLevel(LEVEL_43);
for (let i = 0; i < winScript.length; i++) {
    const s = winScript[i];
    b.selectTray(s.tray!);
    const r = b.placeFromBag(s.bag!);
    if (!r.ok) {
        console.log('fail', i, r.reason, s);
        process.exit(1);
    }
    if (i < 5) {
        console.log(
            i,
            s,
            'trays',
            b.trays.map((t, ti) => `${ti}:${t.kind || '-'}${t.items.length}/${t.cap}${t.sealed ? 'S' : ''}`).join(' '),
        );
    }
}
console.log('win', b.isWin(), 'steps', b.steps);

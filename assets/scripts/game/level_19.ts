import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 19 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_19: LevelDef = {
    id: 19,
    title: '柠檬进小格',
    teach: '两件柠檬只能进容量 2 的格；进大格会锁死',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 2 }, { cap: 4 }],
    bags: [
        ['meat', 'meat', 'lemon'],
        ['milk', 'milk', 'lemon'],
        ['veg', 'veg', 'meat'],
        ['milk', 'veg', 'meat'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel19(): void {
    assertLevel(LEVEL_19);
    assertRedoLayout(LEVEL_19);
    const opened = BoardState.fromLevel(LEVEL_19);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L19 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L19 place must count a step');

    const winScript = [
        { tray: 2, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 2 },
        { tray: 3, bag: 3 },
        { tray: 1, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 0, bag: 3 },
    ];
    const play = BoardState.fromLevel(LEVEL_19);
    const peak = playScript(play, winScript, 'L19');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L19 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L19 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 2 },
        { tray: 3, bag: 3 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 2 },
        { buffer: 0, bag: 3 },
    ];
    const fail = BoardState.fromLevel(LEVEL_19);
    playScript(fail, wasteScript, 'L19 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L19 waste ${fail.failReason()}`);
    if (LEVEL_19.loseable !== true) throw new Error('L19 loseable');
}

import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 14 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_14: LevelDef = {
    id: 14,
    title: '先放到柜台少换格',
    teach: '看容量。小件别进大格',
    trays: [{ cap: 5 }, { cap: 3 }, { cap: 3 }, { cap: 2 }],
    bags: [
        ['fruit', 'fruit', 'meat', 'milk'],
        ['veg', 'fruit', 'meat'],
        ['milk', 'veg', 'milk'],
        ['milk', 'milk', 'veg'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel14(): void {
    assertLevel(LEVEL_14);
    assertRedoLayout(LEVEL_14);
    const opened = BoardState.fromLevel(LEVEL_14);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L14 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L14 place must count a step');

    const winScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 2 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 2, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 0, bag: 3 },
    ];
    const play = BoardState.fromLevel(LEVEL_14);
    const peak = playScript(play, winScript, 'L14');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L14 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L14 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 1, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 1, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 1, bag: 2 },
        { buffer: 0, bag: 3 },
        { buffer: 1, bag: 3 },
    ];
    const fail = BoardState.fromLevel(LEVEL_14);
    playScript(fail, wasteScript, 'L14 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L14 waste ${fail.failReason()}`);
    if (LEVEL_14.loseable !== true) throw new Error('L14 loseable');
}

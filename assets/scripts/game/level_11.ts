import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 11 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_11: LevelDef = {
    id: 11,
    title: '小件直接进小格',
    teach: '水果进小格。格子收得下就不用放柜台',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 2 }],
    bags: [
        ['milk', 'milk', 'fruit'],
        ['veg', 'veg', 'fruit'],
        ['milk', 'veg'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel11(): void {
    assertLevel(LEVEL_11);
    assertRedoLayout(LEVEL_11);
    const opened = BoardState.fromLevel(LEVEL_11);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L11 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L11 place must count a step');

    const winScript = [
        { tray: 0, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 0, bag: 1 },
    ];
    const play = BoardState.fromLevel(LEVEL_11);
    const peak = playScript(play, winScript, 'L11');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L11 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L11 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 2, bag: 1 },
        { buffer: 0, bag: 2 },
    ];
    const fail = BoardState.fromLevel(LEVEL_11);
    playScript(fail, wasteScript, 'L11 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L11 waste ${fail.failReason()}`);
    if (LEVEL_11.loseable !== true) throw new Error('L11 loseable');
}

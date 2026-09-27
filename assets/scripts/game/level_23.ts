import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 23 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_23: LevelDef = {
    id: 23,
    title: '肉酱别看花',
    teach: '酱两件进小格；肉和酱颜色近，看清再换格',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 2 }, { cap: 4 }],
    bags: [
        ['milk', 'veg', 'meat'],
        ['veg', 'veg', 'sauce'],
        ['milk', 'meat', 'meat'],
        ['meat', 'milk', 'sauce'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel23(): void {
    assertLevel(LEVEL_23);
    assertRedoLayout(LEVEL_23);
    const opened = BoardState.fromLevel(LEVEL_23);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L23 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L23 place must count a step');

    const winScript = [
        { tray: 3, bag: 0 },
        { tray: 3, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 2, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 3, bag: 3 },
    ];
    const play = BoardState.fromLevel(LEVEL_23);
    const peak = playScript(play, winScript, 'L23');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L23 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L23 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 3 },
        { buffer: 0, bag: 3 },
    ];
    const fail = BoardState.fromLevel(LEVEL_23);
    playScript(fail, wasteScript, 'L23 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L23 waste ${fail.failReason()}`);
    if (LEVEL_23.loseable !== true) throw new Error('L23 loseable');
}

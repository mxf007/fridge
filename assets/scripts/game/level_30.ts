import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 30 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_30: LevelDef = {
    id: 30,
    title: '决赛冰箱',
    teach: '葡萄两件进小格',
    trays: [{ cap: 2 }, { cap: 3 }, { cap: 3 }, { cap: 4 }, { cap: 4 }, { cap: 4 }],
    bags: [
        ['milk', 'milk', 'veg', 'grape'],
        ['veg', 'veg', 'milk', 'grape'],
        ['meat', 'meat', 'pineapple', 'pineapple'],
        ['watermelon', 'watermelon', 'meat', 'meat'],
        ['watermelon', 'watermelon', 'pineapple', 'pineapple'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel30(): void {
    assertLevel(LEVEL_30);
    assertRedoLayout(LEVEL_30);
    const opened = BoardState.fromLevel(LEVEL_30);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L30 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L30 place must count a step');

    const winScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 3, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 3, bag: 4 },
        { tray: 3, bag: 4 },
        { tray: 4, bag: 2 },
        { tray: 4, bag: 2 },
        { tray: 4, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 5, bag: 4 },
        { tray: 5, bag: 4 },
    ];
    const play = BoardState.fromLevel(LEVEL_30);
    const peak = playScript(play, winScript, 'L30');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L30 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L30 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 0 },
        { tray: 3, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 3, bag: 4 },
        { tray: 3, bag: 4 },
        { tray: 4, bag: 2 },
        { tray: 4, bag: 2 },
        { tray: 4, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 5, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 0, bag: 0 },
        { tray: 0, bag: 0 },
        { buffer: 0, bag: 1 },
        { tray: 2, bag: 1 },
    ];
    const fail = BoardState.fromLevel(LEVEL_30);
    playScript(fail, wasteScript, 'L30 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L30 waste ${fail.failReason()}`);
    if (LEVEL_30.loseable !== true) throw new Error('L30 loseable');
}

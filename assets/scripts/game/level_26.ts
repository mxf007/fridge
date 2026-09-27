import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 26 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_26: LevelDef = {
    id: 26,
    title: '深袋混容量',
    teach: '柠檬进小格。锁进容量 3 会锁死',
    trays: [{ cap: 2 }, { cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 4 }],
    bags: [
        ['milk', 'milk', 'lemon'],
        ['milk', 'veg', 'lemon'],
        ['veg', 'veg', 'sauce'],
        ['meat', 'meat', 'sauce'],
        ['meat', 'sauce', 'milk'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel26(): void {
    assertLevel(LEVEL_26);
    assertRedoLayout(LEVEL_26);
    const opened = BoardState.fromLevel(LEVEL_26);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L26 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L26 place must count a step');

    const winScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 4, bag: 0 },
        { tray: 4, bag: 0 },
        { tray: 4, bag: 1 },
        { tray: 4, bag: 4 },
        { tray: 2, bag: 4 },
        { tray: 3, bag: 4 },
    ];
    const play = BoardState.fromLevel(LEVEL_26);
    const peak = playScript(play, winScript, 'L26');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L26 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L26 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 3, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 3 },
        { tray: 4, bag: 0 },
        { tray: 4, bag: 0 },
        { tray: 4, bag: 1 },
        { tray: 4, bag: 4 },
        { tray: 3, bag: 4 },
        { tray: 0, bag: 3 },
    ];
    const fail = BoardState.fromLevel(LEVEL_26);
    playScript(fail, wasteScript, 'L26 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L26 waste ${fail.failReason()}`);
    if (LEVEL_26.loseable !== true) throw new Error('L26 loseable');
}

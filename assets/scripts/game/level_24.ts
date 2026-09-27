import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 24 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_24: LevelDef = {
    id: 24,
    title: '柜台要腾空',
    teach: '猕猴桃进小格。锁进容量 3 会锁死',
    trays: [{ cap: 2 }, { cap: 3 }, { cap: 3 }, { cap: 4 }],
    bags: [
        ['milk', 'meat', 'kiwi'],
        ['milk', 'milk', 'meat'],
        ['veg', 'veg', 'milk'],
        ['meat', 'veg', 'kiwi'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel24(): void {
    assertLevel(LEVEL_24);
    assertRedoLayout(LEVEL_24);
    const opened = BoardState.fromLevel(LEVEL_24);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L24 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L24 place must count a step');

    const winScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 3 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 3, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 3 },
        { tray: 1, bag: 3 },
    ];
    const play = BoardState.fromLevel(LEVEL_24);
    const peak = playScript(play, winScript, 'L24');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L24 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L24 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 1, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 3, bag: 2 },
        { tray: 1, bag: 3 },
        { buffer: 0, bag: 2 },
        { buffer: 1, bag: 2 },
        { buffer: 2, bag: 3 },
    ];
    const fail = BoardState.fromLevel(LEVEL_24);
    playScript(fail, wasteScript, 'L24 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L24 waste ${fail.failReason()}`);
    if (LEVEL_24.loseable !== true) throw new Error('L24 loseable');
}

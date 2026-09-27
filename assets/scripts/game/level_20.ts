import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 20 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_20: LevelDef = {
    id: 20,
    title: '五色猕猴桃',
    teach: '猕猴桃两件进小格；酱四件进大格',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 2 }, { cap: 3 }, { cap: 4 }],
    bags: [
        ['meat', 'veg', 'milk'],
        ['milk', 'veg', 'veg'],
        ['sauce', 'sauce', 'kiwi'],
        ['milk', 'sauce', 'meat'],
        ['meat', 'sauce', 'kiwi'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel20(): void {
    assertLevel(LEVEL_20);
    assertRedoLayout(LEVEL_20);
    const opened = BoardState.fromLevel(LEVEL_20);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L20 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L20 place must count a step');

    const winScript = [
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 3 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 4 },
        { tray: 4, bag: 2 },
        { tray: 4, bag: 2 },
        { tray: 4, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 4, bag: 4 },
        { tray: 3, bag: 4 },
    ];
    const play = BoardState.fromLevel(LEVEL_20);
    const peak = playScript(play, winScript, 'L20');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L20 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L20 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 2, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 3, bag: 2 },
        { tray: 4, bag: 2 },
        { tray: 4, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 3, bag: 4 },
        { tray: 4, bag: 4 },
    ];
    const fail = BoardState.fromLevel(LEVEL_20);
    playScript(fail, wasteScript, 'L20 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L20 waste ${fail.failReason()}`);
    if (LEVEL_20.loseable !== true) throw new Error('L20 loseable');
}

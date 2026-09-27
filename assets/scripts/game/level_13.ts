import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 13 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_13: LevelDef = {
    id: 13,
    title: '四种要轮着挖',
    teach: '三列四种。肉能进容量 2 就直接放',
    trays: [{ cap: 4 }, { cap: 3 }, { cap: 3 }, { cap: 2 }],
    bags: [
        ['milk', 'milk', 'veg', 'meat'],
        ['milk', 'milk', 'veg', 'meat'],
        ['fruit', 'veg', 'fruit', 'fruit'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel13(): void {
    assertLevel(LEVEL_13);
    assertRedoLayout(LEVEL_13);
    const opened = BoardState.fromLevel(LEVEL_13);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L13 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L13 place must count a step');

    const winScript = [
        { tray: 1, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 3, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 0, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 0, bag: 1 },
    ];
    const play = BoardState.fromLevel(LEVEL_13);
    const peak = playScript(play, winScript, 'L13');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L13 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L13 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 0 },
        { buffer: 0, bag: 1 },
    ];
    const fail = BoardState.fromLevel(LEVEL_13);
    playScript(fail, wasteScript, 'L13 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L13 waste ${fail.failReason()}`);
    if (LEVEL_13.loseable !== true) throw new Error('L13 loseable');
}

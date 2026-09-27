import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 15 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_15: LevelDef = {
    id: 15,
    title: '今晚这一层最难',
    teach: '本段最难。过关可晒步数',
    trays: [{ cap: 4 }, { cap: 3 }, { cap: 3 }, { cap: 2 }],
    bags: [
        ['milk', 'veg', 'meat'],
        ['fruit', 'milk', 'veg'],
        ['milk', 'fruit', 'fruit'],
        ['veg', 'milk', 'meat'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel15(): void {
    assertLevel(LEVEL_15);
    assertRedoLayout(LEVEL_15);
    const opened = BoardState.fromLevel(LEVEL_15);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L15 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L15 place must count a step');

    const winScript = [
        { tray: 1, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 3, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 3, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 1, bag: 3 },
    ];
    const play = BoardState.fromLevel(LEVEL_15);
    const peak = playScript(play, winScript, 'L15');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L15 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L15 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 3 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 2, bag: 1 },
        { buffer: 0, bag: 2 },
        { buffer: 1, bag: 3 },
    ];
    const fail = BoardState.fromLevel(LEVEL_15);
    playScript(fail, wasteScript, 'L15 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L15 waste ${fail.failReason()}`);
    if (LEVEL_15.loseable !== true) throw new Error('L15 loseable');
}

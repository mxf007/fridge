import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 12 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_12: LevelDef = {
    id: 12,
    title: '肉也要收',
    teach: '肉两件进两件格。冰箱能收就直接收',
    trays: [{ cap: 4 }, { cap: 3 }, { cap: 3 }, { cap: 2 }],
    bags: [
        ['milk', 'milk', 'meat'],
        ['veg', 'veg', 'meat'],
        ['fruit', 'fruit', 'veg'],
        ['milk', 'milk', 'fruit'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel12(): void {
    assertLevel(LEVEL_12);
    assertRedoLayout(LEVEL_12);
    const opened = BoardState.fromLevel(LEVEL_12);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L12 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L12 place must count a step');

    const winScript = [
        { tray: 1, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 3, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 1 },
    ];
    const play = BoardState.fromLevel(LEVEL_12);
    const peak = playScript(play, winScript, 'L12');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L12 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L12 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 3 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 0 },
        { buffer: 0, bag: 3 },
    ];
    const fail = BoardState.fromLevel(LEVEL_12);
    playScript(fail, wasteScript, 'L12 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L12 waste ${fail.failReason()}`);
    if (LEVEL_12.loseable !== true) throw new Error('L12 loseable');
}

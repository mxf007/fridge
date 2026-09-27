import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 21 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_21: LevelDef = {
    id: 21,
    title: '剩菜也要收',
    teach: '剩菜三件占一格；肉四件进大格',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 4 }],
    bags: [
        ['meat', 'milk', 'meat', 'meat'],
        ['veg', 'veg', 'leftover'],
        ['milk', 'meat', 'leftover'],
        ['veg', 'milk', 'leftover'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel21(): void {
    assertLevel(LEVEL_21);
    assertRedoLayout(LEVEL_21);
    const opened = BoardState.fromLevel(LEVEL_21);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L21 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L21 place must count a step');

    const winScript = [
        { tray: 3, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 2, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 2, bag: 3 },
    ];
    const play = BoardState.fromLevel(LEVEL_21);
    const peak = playScript(play, winScript, 'L21');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L21 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L21 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 3, bag: 3 },
        { buffer: 0, bag: 2 },
    ];
    const fail = BoardState.fromLevel(LEVEL_21);
    playScript(fail, wasteScript, 'L21 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L21 waste ${fail.failReason()}`);
    if (LEVEL_21.loseable !== true) throw new Error('L21 loseable');
}

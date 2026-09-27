import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 27 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_27: LevelDef = {
    id: 27,
    title: '小件别进大格',
    teach: '青菜进小格；大格留给四件奶',
    trays: [{ cap: 4 }, { cap: 2 }, { cap: 2 }, { cap: 2 }, { cap: 2 }],
    bags: [
        ['milk', 'veg', 'veg'],
        ['lemon', 'grape', 'meat'],
        ['milk', 'meat', 'lemon'],
        ['milk', 'milk', 'grape'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel27(): void {
    assertLevel(LEVEL_27);
    assertRedoLayout(LEVEL_27);
    const opened = BoardState.fromLevel(LEVEL_27);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L27 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L27 place must count a step');

    const winScript = [
        { tray: 1, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 3, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 4, bag: 1 },
        { tray: 4, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 0, bag: 2 },
    ];
    const play = BoardState.fromLevel(LEVEL_27);
    const peak = playScript(play, winScript, 'L27');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L27 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L27 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 4, bag: 1 },
        { tray: 4, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 3, bag: 3 },
        { buffer: 0, bag: 3 },
    ];
    const fail = BoardState.fromLevel(LEVEL_27);
    playScript(fail, wasteScript, 'L27 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L27 waste ${fail.failReason()}`);
    if (LEVEL_27.loseable !== true) throw new Error('L27 loseable');
}

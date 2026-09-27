import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 25 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_25: LevelDef = {
    id: 25,
    title: '西瓜要整格',
    teach: '西瓜四件一整格；柠檬和少量菜进小格',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 2 }, { cap: 4 }, { cap: 2 }],
    bags: [
        ['watermelon', 'milk', 'watermelon', 'meat'],
        ['milk', 'meat', 'watermelon'],
        ['watermelon', 'meat', 'meat'],
        ['milk', 'milk', 'lemon'],
        ['veg', 'veg', 'lemon'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel25(): void {
    assertLevel(LEVEL_25);
    assertRedoLayout(LEVEL_25);
    const opened = BoardState.fromLevel(LEVEL_25);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L25 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L25 place must count a step');

    const winScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 2 },
        { tray: 3, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 2, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 2, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 4, bag: 4 },
    ];
    const play = BoardState.fromLevel(LEVEL_25);
    const peak = playScript(play, winScript, 'L25');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L25 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L25 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 2, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 3, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 4, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 4, bag: 4 },
        { buffer: 0, bag: 4 },
    ];
    const fail = BoardState.fromLevel(LEVEL_25);
    playScript(fail, wasteScript, 'L25 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L25 waste ${fail.failReason()}`);
    if (LEVEL_25.loseable !== true) throw new Error('L25 loseable');
}

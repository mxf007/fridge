import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 31 关：20 件，5 列都深 4，同列无成对。容量 5 只收牛奶。 */
export const LEVEL_31: LevelDef = {
    id: 31,
    title: '深栈五格',
    teach: '五件那色进最宽的格子',
    trays: [{ cap: 5 }, { cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 3 }],
    bags: [
        ['milk', 'veg', 'milk', 'grape'],
        ['veg', 'meat', 'veg', 'lemon'],
        ['grape', 'milk', 'grape', 'meat'],
        ['meat', 'lemon', 'meat', 'veg'],
        ['lemon', 'milk', 'grape', 'milk'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel31(): void {
    assertLevel(LEVEL_31);
    assertRedoLayout(LEVEL_31);
    const opened = BoardState.fromLevel(LEVEL_31);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L31 fridge must take the top, got ${first.reason}`);

    const winScript = [
        { tray: 2, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 4, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 3, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 0, bag: 4 },
        { tray: 2, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 4, bag: 4 },
    ];
    const play = BoardState.fromLevel(LEVEL_31);
    const peak = playScript(play, winScript, 'L31');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L31 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L31 full-info peak ${peak}`);

    const fairScript = [
        { buffer: 0, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 4, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 3, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 0, bag: 4 },
        { tray: 2, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 2, fromBuffer: 0 },
    ];
    const fair = BoardState.fromLevel(LEVEL_31);
    const fairPeak = playScript(fair, fairScript, 'L31 fair');
    if (!fair.isWin()) throw new Error('L31 fair did not win');
    if (fairPeak !== 1) throw new Error(`L31 fair peak ${fairPeak}`);
    if (fairScript[0].buffer == null) throw new Error('L31 fair must park first');

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 4, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 3, bag: 4 },
        { tray: 0, bag: 4 },
        { buffer: 0, bag: 4 },
        { tray: 4, bag: 4 },
    ];
    const fail = BoardState.fromLevel(LEVEL_31);
    playScript(fail, wasteScript, 'L31 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L31 waste ${fail.failReason()}`);
    if (LEVEL_31.loseable !== true) throw new Error('L31 loseable');
}

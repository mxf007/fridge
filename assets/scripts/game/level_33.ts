import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 33 关：20 件，5 列深 4。四只容量 3，柠檬别占错的中格。 */
export const LEVEL_33: LevelDef = {
    id: 33,
    title: '四只中格',
    teach: '两件柠檬别进容量 3',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['milk', 'veg', 'meat', 'lemon'],
        ['veg', 'meat', 'grape', 'milk'],
        ['grape', 'milk', 'veg', 'sauce'],
        ['milk', 'veg', 'lemon', 'sauce'],
        ['sauce', 'lemon', 'meat', 'grape'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel33(): void {
    assertLevel(LEVEL_33);
    assertRedoLayout(LEVEL_33);
    const opened = BoardState.fromLevel(LEVEL_33);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L33 fridge must take the top, got ${first.reason}`);

    const winScript = [
        { tray: 2, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 4, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 5, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 4, bag: 2 },
        { tray: 5, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 4, bag: 4 },
        { tray: 3, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 0, bag: 4 },
    ];
    const play = BoardState.fromLevel(LEVEL_33);
    const peak = playScript(play, winScript, 'L33');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L33 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L33 full-info peak ${peak}`);

    const fairScript = [
        { buffer: 0, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 4, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 4, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 3, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 0, fromBuffer: 0 },
    ];
    const fair = BoardState.fromLevel(LEVEL_33);
    const fairPeak = playScript(fair, fairScript, 'L33 fair');
    if (!fair.isWin()) throw new Error('L33 fair did not win');
    if (fairPeak !== 1) throw new Error(`L33 fair peak ${fairPeak}`);
    if (fairScript[0].buffer == null) throw new Error('L33 fair must park first');

    const wasteScript = [
        { tray: 5, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 4, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 4, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 3, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 5, bag: 4 },
    ];
    const fail = BoardState.fromLevel(LEVEL_33);
    playScript(fail, wasteScript, 'L33 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L33 waste ${fail.failReason()}`);
    if (LEVEL_33.loseable !== true) throw new Error('L33 loseable');
}

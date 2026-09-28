import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 32 关：20 件，5 列都深 4，同列无成对。柠檬和酱各两件，进底下两只小格。 */
export const LEVEL_32: LevelDef = {
    id: 32,
    title: '两只小格',
    teach: '两件那色进小格',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 2 }, { cap: 2 }],
    bags: [
        ['milk', 'veg', 'meat', 'grape'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'grape', 'milk', 'veg'],
        ['grape', 'milk', 'veg', 'meat'],
        ['lemon', 'sauce', 'lemon', 'sauce'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel32(): void {
    assertLevel(LEVEL_32);
    assertRedoLayout(LEVEL_32);
    const opened = BoardState.fromLevel(LEVEL_32);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L32 fridge must take the top, got ${first.reason}`);

    const winScript = [
        { tray: 3, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 5, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 4, bag: 4 },
    ];
    const play = BoardState.fromLevel(LEVEL_32);
    const peak = playScript(play, winScript, 'L32');
    if (!play.isWin() || play.steps !== 20) throw new Error(`L32 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L32 full-info peak ${peak}`);

    const fairScript = [
        { buffer: 0, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 5, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 3, fromBuffer: 0 },
    ];
    const fair = BoardState.fromLevel(LEVEL_32);
    const fairPeak = playScript(fair, fairScript, 'L32 fair');
    if (!fair.isWin()) throw new Error('L32 fair did not win');
    if (fairPeak !== 1) throw new Error(`L32 fair peak ${fairPeak}`);
    if (fairScript[0].buffer == null) throw new Error('L32 fair must park first');

    const wasteScript = [
        { tray: 5, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 5, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 1, bag: 2 },
        { buffer: 0, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 3, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 5, bag: 3 },
        { buffer: 1, bag: 4 },
        { tray: 4, bag: 4 },
        { buffer: 2, bag: 4 },
    ];
    const fail = BoardState.fromLevel(LEVEL_32);
    playScript(fail, wasteScript, 'L32 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L32 waste ${fail.failReason()}`);
    if (LEVEL_32.loseable !== true) throw new Error('L32 loseable');
}

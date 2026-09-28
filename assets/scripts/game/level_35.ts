import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 35 关：20 件，5 列深 4。三只容量 4、两只 3、一只 2。 */
export const LEVEL_35: LevelDef = {
    id: 35,
    title: '三中格',
    teach: '中格各三件，小格两件',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 3 }, { cap: 3 }, { cap: 2 }],
    bags: [
        ['milk', 'veg', 'meat', 'grape'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'grape', 'milk', 'veg'],
        ['grape', 'milk', 'lemon', 'veg'],
        ['lemon', 'sauce', 'lemon', 'sauce'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel35(): void {
    assertLevel(LEVEL_35);
    assertRedoLayout(LEVEL_35);
    const opened = BoardState.fromLevel(LEVEL_35);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L35 fridge must take the top, got ${first.reason}`);

    const winScript = [
        { tray: 0, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 5, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 0, bag: 4 },
    ];
    const play = BoardState.fromLevel(LEVEL_35);
    const peak = playScript(play, winScript, 'L35');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L35 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L35 full-info peak ${peak}`);

    const fairScript = [
        { buffer: 0, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 0, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 0, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 5, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 0, fromBuffer: 0 },
    ];
    const fair = BoardState.fromLevel(LEVEL_35);
    const fairPeak = playScript(fair, fairScript, 'L35 fair');
    if (!fair.isWin()) throw new Error('L35 fair did not win');
    if (fairPeak !== 1) throw new Error(`L35 fair peak ${fairPeak}`);
    if (fairScript[0].buffer == null) throw new Error('L35 fair must park first');

    const wasteScript = [
        { tray: 4, bag: 0 },
        { tray: 5, bag: 4 },
        { tray: 3, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 3, bag: 4 },
        { tray: 2, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 2, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 4, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 0, bag: 1 },
        { tray: 4, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
    ];
    const fail = BoardState.fromLevel(LEVEL_35);
    playScript(fail, wasteScript, 'L35 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L35 waste ${fail.failReason()}`);
    if (LEVEL_35.loseable !== true) throw new Error('L35 loseable');
}

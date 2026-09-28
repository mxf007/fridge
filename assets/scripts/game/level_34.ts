import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 34 关：20 件，5 列深 4。容量 5 + 两只 2，宽格收五件、小格收两件。 */
export const LEVEL_34: LevelDef = {
    id: 34,
    title: '宽格与小格',
    teach: '五件进宽格，两件进小格',
    trays: [{ cap: 5 }, { cap: 4 }, { cap: 4 }, { cap: 3 }, { cap: 2 }, { cap: 2 }],
    bags: [
        ['milk', 'veg', 'grape', 'meat'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'milk', 'veg', 'sauce'],
        ['grape', 'lemon', 'veg', 'meat'],
        ['lemon', 'sauce', 'veg', 'milk'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel34(): void {
    assertLevel(LEVEL_34);
    assertRedoLayout(LEVEL_34);
    const opened = BoardState.fromLevel(LEVEL_34);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L34 fridge must take the top, got ${first.reason}`);

    const winScript = [
        { tray: 1, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 4, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 2, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 0, bag: 4 },
    ];
    const play = BoardState.fromLevel(LEVEL_34);
    const peak = playScript(play, winScript, 'L34');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L34 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L34 full-info peak ${peak}`);

    const fairScript = [
        { buffer: 0, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 4, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 1, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 0, fromBuffer: 0 },
    ];
    const fair = BoardState.fromLevel(LEVEL_34);
    const fairPeak = playScript(fair, fairScript, 'L34 fair');
    if (!fair.isWin()) throw new Error('L34 fair did not win');
    if (fairPeak !== 1) throw new Error(`L34 fair peak ${fairPeak}`);
    if (fairScript[0].buffer == null) throw new Error('L34 fair must park first');

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 3, bag: 4 },
        { tray: 2, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 0, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 5, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 3, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
    ];
    const fail = BoardState.fromLevel(LEVEL_34);
    playScript(fail, wasteScript, 'L34 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L34 waste ${fail.failReason()}`);
    if (LEVEL_34.loseable !== true) throw new Error('L34 loseable');
}

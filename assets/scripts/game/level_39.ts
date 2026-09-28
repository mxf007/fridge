import { BoardState } from './BoardState';
import { assertRedoLayout, playScript, type ScriptStep } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 39 关：21 件，4 列深 4、1 列深 5。三只宽格、三只中格。 */
export const LEVEL_39: LevelDef = {
    id: 39,
    title: '三中格',
    teach: '同一柜台槽要用两次',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['milk', 'veg', 'meat', 'lemon'],
        ['veg', 'meat', 'grape', 'milk'],
        ['grape', 'milk', 'veg', 'sauce'],
        ['milk', 'veg', 'lemon', 'sauce'],
        ['meat', 'sauce', 'lemon', 'meat', 'grape'],
    ],
    buffer: 3,
    loseable: true,
    theoreticalMinSteps: 21,
    targetSteps: 25,
};

function bufferSlotUses(steps: ScriptStep[], slot: number): number {
    let n = 0;
    for (const s of steps) {
        if (s.buffer === slot && s.bag != null) n += 1;
        if (s.fromBuffer === slot) n += 1;
    }
    return n;
}

export function selfCheckLevel39(): void {
    assertLevel(LEVEL_39);
    assertRedoLayout(LEVEL_39);
    const opened = BoardState.fromLevel(LEVEL_39);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L39 fridge must take the top, got ${first.reason}`);

    const winScript = [
        { tray: 3, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 4, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 5, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 4, bag: 2 },
        { tray: 5, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 4, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 3, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 0, bag: 4 },
    ];
    const play = BoardState.fromLevel(LEVEL_39);
    const peak = playScript(play, winScript, 'L39');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L39 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L39 full-info peak ${peak}`);

    const fairScript = [
        { buffer: 0, bag: 0 },
        { tray: 3, fromBuffer: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 4, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 5, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 4, bag: 2 },
        { tray: 5, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 4, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 3, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 0, bag: 4 },
    ];
    const fair = BoardState.fromLevel(LEVEL_39);
    const fairPeak = playScript(fair, fairScript, 'L39 fair');
    if (!fair.isWin()) throw new Error('L39 fair did not win');
    if (fairPeak !== 1) throw new Error(`L39 fair peak ${fairPeak}`);
    if (fairScript[0].buffer == null) throw new Error('L39 fair must park first');
    if (bufferSlotUses(fairScript, 0) < 2) throw new Error('L39 fair must use buffer slot 0 twice');

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 4, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 5, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 4, bag: 2 },
        { tray: 5, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 4, bag: 4 },
        { tray: 1, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 5, bag: 4 },
    ];
    const fail = BoardState.fromLevel(LEVEL_39);
    playScript(fail, wasteScript, 'L39 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L39 waste ${fail.failReason()}`);
    if (LEVEL_39.loseable !== true) throw new Error('L39 loseable');
    if (LEVEL_39.targetSteps != null && fairScript.length > LEVEL_39.targetSteps) {
        throw new Error('L39 targetSteps below fair length');
    }
}

import { BoardState } from './BoardState';
import { assertRedoLayout, playScript, type ScriptStep } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 38 关：21 件，4 列深 4、1 列深 5。容量 5 + 三只 4 + 两只 2。 */
export const LEVEL_38: LevelDef = {
    id: 38,
    title: '宽格与双小格',
    teach: '同一柜台槽要用两次',
    trays: [{ cap: 5 }, { cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 2 }, { cap: 2 }],
    bags: [
        ['milk', 'veg', 'grape', 'meat'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'milk', 'veg', 'sauce'],
        ['grape', 'lemon', 'veg', 'meat'],
        ['grape', 'lemon', 'sauce', 'veg', 'milk'],
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

export function selfCheckLevel38(): void {
    assertLevel(LEVEL_38);
    assertRedoLayout(LEVEL_38);
    const opened = BoardState.fromLevel(LEVEL_38);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L38 fridge must take the top, got ${first.reason}`);

    const winScript = [
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 4, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 3, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 0, bag: 4 },
    ];
    const play = BoardState.fromLevel(LEVEL_38);
    const peak = playScript(play, winScript, 'L38');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L38 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L38 full-info peak ${peak}`);

    const fairScript = [
        { buffer: 0, bag: 0 },
        { tray: 1, fromBuffer: 0 },
        { tray: 2, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 4, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 3, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 0, bag: 4 },
    ];
    const fair = BoardState.fromLevel(LEVEL_38);
    const fairPeak = playScript(fair, fairScript, 'L38 fair');
    if (!fair.isWin()) throw new Error('L38 fair did not win');
    if (fairPeak !== 1) throw new Error(`L38 fair peak ${fairPeak}`);
    if (fairScript[0].buffer == null) throw new Error('L38 fair must park first');
    if (bufferSlotUses(fairScript, 0) < 2) throw new Error('L38 fair must use buffer slot 0 twice');

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 4, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 0, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 3, bag: 4 },
        { tray: 2, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 5, bag: 4 },
    ];
    const fail = BoardState.fromLevel(LEVEL_38);
    playScript(fail, wasteScript, 'L38 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L38 waste ${fail.failReason()}`);
    if (LEVEL_38.loseable !== true) throw new Error('L38 loseable');
    if (LEVEL_38.targetSteps != null && fairScript.length > LEVEL_38.targetSteps) {
        throw new Error('L38 targetSteps below fair length');
    }
}

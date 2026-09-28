import { BoardState } from './BoardState';
import { assertRedoLayout, playScript, type ScriptStep } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 40 关：21 件，与 36 同容量；摆放不同，同槽用两次。 */
export const LEVEL_40: LevelDef = {
    id: 40,
    title: '深列再练',
    teach: '同一柜台槽要用两次',
    trays: [{ cap: 5 }, { cap: 4 }, { cap: 4 }, { cap: 3 }, { cap: 3 }, { cap: 2 }],
    bags: [
        ['milk', 'veg', 'meat', 'sauce'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'milk', 'veg', 'sauce'],
        ['grape', 'lemon', 'veg', 'meat'],
        ['lemon', 'sauce', 'veg', 'milk', 'grape'],
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

export function selfCheckLevel40(): void {
    assertLevel(LEVEL_40);
    assertRedoLayout(LEVEL_40);
    const opened = BoardState.fromLevel(LEVEL_40);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L40 fridge must take the top, got ${first.reason}`);

    const winScript = [
        { tray: 3, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 4, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 3, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 1, bag: 4 },
        { tray: 2, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 0, bag: 4 },
    ];
    const play = BoardState.fromLevel(LEVEL_40);
    const peak = playScript(play, winScript, 'L40');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L40 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L40 full-info peak ${peak}`);

    const fairScript = [
        { buffer: 0, bag: 0 },
        { tray: 3, fromBuffer: 0 },
        { tray: 1, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 4, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 3, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 1, bag: 4 },
        { tray: 2, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 0, bag: 4 },
        { tray: 0, bag: 4 },
    ];
    const fair = BoardState.fromLevel(LEVEL_40);
    const fairPeak = playScript(fair, fairScript, 'L40 fair');
    if (!fair.isWin()) throw new Error('L40 fair did not win');
    if (fairPeak !== 1) throw new Error(`L40 fair peak ${fairPeak}`);
    if (fairScript[0].buffer == null) throw new Error('L40 fair must park first');
    if (bufferSlotUses(fairScript, 0) < 2) throw new Error('L40 fair must use buffer slot 0 twice');

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 4, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 1, bag: 4 },
        { tray: 3, bag: 4 },
        { tray: 2, bag: 4 },
        { tray: 0, bag: 4 },
    ];
    const fail = BoardState.fromLevel(LEVEL_40);
    playScript(fail, wasteScript, 'L40 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L40 waste ${fail.failReason()}`);
    if (LEVEL_40.loseable !== true) throw new Error('L40 loseable');
    if (LEVEL_40.targetSteps != null && fairScript.length > LEVEL_40.targetSteps) {
        throw new Error('L40 targetSteps below fair length');
    }
}

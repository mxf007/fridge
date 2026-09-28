import { BoardState } from './BoardState';
import { assertRedoLayout, playScript, type ScriptStep } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 42 关：24 件，5+4×4+3；钥匙埋深，公平双槽峰值 2。 */
export const LEVEL_42: LevelDef = {
    id: 42,
    title: '双槽窥深',
    teach: '两只柜台槽可以同时占满',
    trays: [{ cap: 5 }, { cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 3 }],
    bags: [
        ['milk', 'veg', 'grape', 'meat'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'grape', 'milk', 'veg'],
        ['grape', 'milk', 'lemon', 'meat'],
        ['lemon', 'sauce', 'veg', 'lemon'],
        ['sauce', 'lemon', 'meat', 'sauce'],
    ],
    buffer: 3,
    loseable: true,
    theoreticalMinSteps: 24,
    targetSteps: 28,
};

function firstBufferParkStep(steps: ScriptStep[]): number {
    for (let i = 0; i < steps.length; i++) {
        if (steps[i].buffer != null && steps[i].bag != null) return i;
    }
    return -1;
}

export function selfCheckLevel42(): void {
    assertLevel(LEVEL_42);
    assertRedoLayout(LEVEL_42);
    const opened = BoardState.fromLevel(LEVEL_42);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L42 fridge must take the top, got ${first.reason}`);

    const winScript: ScriptStep[] = [
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 0, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 4, bag: 4 },
        { tray: 2, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 5, bag: 5 },
        { tray: 0, bag: 5 },
        { tray: 0, bag: 5 },
        { tray: 0, bag: 5 },
    ];
    const play = BoardState.fromLevel(LEVEL_42);
    const peak = playScript(play, winScript, 'L42');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L42 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L42 full-info peak ${peak}`);

    const fairScript: ScriptStep[] = [
        { buffer: 0, bag: 0 },
        { buffer: 1, bag: 1 },
        { tray: 0, fromBuffer: 0 },
        { tray: 1, fromBuffer: 1 },
        { tray: 2, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 3, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 0, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 4, bag: 4 },
        { tray: 3, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 5, bag: 5 },
        { tray: 0, bag: 5 },
        { tray: 0, bag: 5 },
        { tray: 0, bag: 5 },
    ];
    const fair = BoardState.fromLevel(LEVEL_42);
    const fairPeak = playScript(fair, fairScript, 'L42 fair');
    if (!fair.isWin()) throw new Error('L42 fair did not win');
    if (fairPeak !== 2) throw new Error(`L42 fair peak ${fairPeak}`);
    const fb = firstBufferParkStep(fairScript);
    if (fb < 0 || fb > 2) throw new Error(`L42 fair first buffer park at ${fb}`);

    const wasteScript: ScriptStep[] = [
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 0, bag: 3 },
        { tray: 5, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 1, bag: 3 },
        { tray: 5, bag: 4 },
        { tray: 2, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 1, bag: 5 },
        { tray: 0, bag: 5 },
        { tray: 5, bag: 5 },
    ];
    const fail = BoardState.fromLevel(LEVEL_42);
    playScript(fail, wasteScript, 'L42 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L42 waste ${fail.failReason()}`);
    if (LEVEL_42.loseable !== true) throw new Error('L42 loseable');
    if (LEVEL_42.targetSteps != null && fairScript.length > LEVEL_42.targetSteps) {
        throw new Error('L42 targetSteps below fair length');
    }
}

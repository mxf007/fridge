import { BoardState } from './BoardState';
import { assertRedoLayout, playScript, type ScriptStep } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 41 关：24 件，双容量 5；公平柜台峰值 2（本段首关）。 */
export const LEVEL_41: LevelDef = {
    id: 41,
    title: '双宽格',
    teach: '两只柜台槽可以同时占满',
    trays: [{ cap: 5 }, { cap: 5 }, { cap: 4 }, { cap: 4 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['milk', 'veg', 'meat', 'grape'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'grape', 'milk', 'veg'],
        ['grape', 'milk', 'lemon', 'meat'],
        ['lemon', 'sauce', 'veg', 'sauce'],
        ['sauce', 'lemon', 'meat', 'grape'],
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

export function selfCheckLevel41(): void {
    assertLevel(LEVEL_41);
    assertRedoLayout(LEVEL_41);
    const opened = BoardState.fromLevel(LEVEL_41);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L41 fridge must take the top, got ${first.reason}`);

    const winScript: ScriptStep[] = PLACEHOLDER_WIN;
    const play = BoardState.fromLevel(LEVEL_41);
    const peak = playScript(play, winScript, 'L41');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L41 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L41 full-info peak ${peak}`);

    const fairScript: ScriptStep[] = [
        { buffer: 0, bag: 1 },
        { buffer: 1, bag: 3 },
        { tray: 0, fromBuffer: 0 },
        { tray: 1, fromBuffer: 1 },
        { tray: 2, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 3, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 4, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 5, bag: 4 },
        { tray: 3, bag: 4 },
        { tray: 5, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 0, bag: 5 },
        { tray: 0, bag: 5 },
        { tray: 0, bag: 5 },
        { tray: 0, bag: 5 },
    ];
    const fair = BoardState.fromLevel(LEVEL_41);
    const fairPeak = playScript(fair, fairScript, 'L41 fair');
    if (!fair.isWin()) throw new Error('L41 fair did not win');
    if (fairPeak !== 2) throw new Error(`L41 fair peak ${fairPeak}`);
    const fb = firstBufferParkStep(fairScript);
    if (fb < 0 || fb > 2) throw new Error(`L41 fair first buffer park at ${fb}`);

    const wasteScript: ScriptStep[] = PLACEHOLDER_WASTE;
    const fail = BoardState.fromLevel(LEVEL_41);
    playScript(fail, wasteScript, 'L41 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L41 waste ${fail.failReason()}`);
    if (LEVEL_41.loseable !== true) throw new Error('L41 loseable');
    if (LEVEL_41.targetSteps != null && fairScript.length > LEVEL_41.targetSteps) {
        throw new Error('L41 targetSteps below fair length');
    }
}

const PLACEHOLDER_WIN: ScriptStep[] = [{ tray: 0, bag: 0 }];
const PLACEHOLDER_WASTE: ScriptStep[] = [{ tray: 0, bag: 0 }];

import { BoardState } from './BoardState';
import { assertRedoLayout, playScript, type ScriptStep } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 43 关：24 件，5×4+2×2；双槽峰值 2，2 件色埋深。 */
export const LEVEL_43: LevelDef = {
    id: 43,
    title: '双小格',
    teach: '两只柜台槽可以同时占满',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 2 }, { cap: 2 }],
    bags: [
        ['milk', 'fruit', 'veg', 'meat'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'grape', 'sauce', 'veg'],
        ['grape', 'milk', 'lemon', 'meat'],
        ['lemon', 'sauce', 'veg', 'lemon'],
        ['fruit', 'lemon', 'grape', 'milk'],
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

export function selfCheckLevel43(): void {
    assertLevel(LEVEL_43);
    assertRedoLayout(LEVEL_43);
    const opened = BoardState.fromLevel(LEVEL_43);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L43 fridge must take the top, got ${first.reason}`);

    const winScript: ScriptStep[] = [
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 5, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 2 },
        { tray: 6, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 0, bag: 3 },
        { tray: 4, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 3, bag: 3 },
        { tray: 4, bag: 4 },
        { tray: 1, bag: 4 },
        { tray: 6, bag: 4 },
        { tray: 4, bag: 4 },
        { tray: 2, bag: 5 },
        { tray: 0, bag: 5 },
        { tray: 0, bag: 5 },
        { tray: 0, bag: 5 },
    ];
    const play = BoardState.fromLevel(LEVEL_43);
    const peak = playScript(play, winScript, 'L43');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L43 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L43 full-info peak ${peak}`);

    const fairScript: ScriptStep[] = PLACEHOLDER_FAIR;
    const fair = BoardState.fromLevel(LEVEL_43);
    const fairPeak = playScript(fair, fairScript, 'L43 fair');
    if (!fair.isWin()) throw new Error('L43 fair did not win');
    if (fairPeak !== 2) throw new Error(`L43 fair peak ${fairPeak}`);
    const fb = firstBufferParkStep(fairScript);
    if (fb < 0 || fb > 2) throw new Error(`L43 fair first buffer park at ${fb}`);

    const wasteScript: ScriptStep[] = PLACEHOLDER_WASTE;
    const fail = BoardState.fromLevel(LEVEL_43);
    playScript(fail, wasteScript, 'L43 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L43 waste ${fail.failReason()}`);
    if (LEVEL_43.loseable !== true) throw new Error('L43 loseable');
    if (LEVEL_43.targetSteps != null && fairScript.length > LEVEL_43.targetSteps) {
        throw new Error('L43 targetSteps below fair length');
    }
}

const PLACEHOLDER_FAIR: ScriptStep[] = [{ buffer: 0, bag: 0 }];
const PLACEHOLDER_WASTE: ScriptStep[] = [{ tray: 0, bag: 0 }];

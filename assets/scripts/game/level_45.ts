import { BoardState } from './BoardState';
import { assertRedoLayout, playScript, type ScriptStep } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 45 关：24 件，4×4+3×3+2；六列深 4，柜台满则失败。 */
export const LEVEL_45: LevelDef = {
    id: 45,
    title: '柜台挤满',
    teach: '三只槽都占满也会卡住',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 3 }, { cap: 3 }, { cap: 2 }],
    bags: [
        ['milk', 'lemon', 'veg', 'meat'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'grape', 'milk', 'veg'],
        ['grape', 'milk', 'fruit', 'meat'],
        ['sauce', 'veg', 'lemon', 'sauce'],
        ['fruit', 'lemon', 'grape', 'sauce'],
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

export function selfCheckLevel45(): void {
    assertLevel(LEVEL_45);
    assertRedoLayout(LEVEL_45);
    const opened = BoardState.fromLevel(LEVEL_45);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L45 fridge must take the top, got ${first.reason}`);

    const winScript: ScriptStep[] = WIN;
    const play = BoardState.fromLevel(LEVEL_45);
    const peak = playScript(play, winScript, 'L45');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L45 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L45 full-info peak ${peak}`);

    const fairScript: ScriptStep[] = FAIR;
    const fair = BoardState.fromLevel(LEVEL_45);
    const fairPeak = playScript(fair, fairScript, 'L45 fair');
    if (!fair.isWin()) throw new Error('L45 fair did not win');
    if (fairPeak !== 2) throw new Error(`L45 fair peak ${fairPeak}`);
    const fb = firstBufferParkStep(fairScript);
    if (fb < 0 || fb > 2) throw new Error(`L45 fair first buffer park at ${fb}`);

    const wasteScript: ScriptStep[] = WASTE;
    const fail = BoardState.fromLevel(LEVEL_45);
    playScript(fail, wasteScript, 'L45 waste');
    if (fail.isWin() || fail.failReason() !== 'buffer_full') throw new Error(`L45 waste ${fail.failReason()}`);
    if (LEVEL_45.loseable !== true) throw new Error('L45 loseable');
    if (LEVEL_45.targetSteps != null && fairScript.length > LEVEL_45.targetSteps) {
        throw new Error('L45 targetSteps below fair length');
    }
}

const WIN: ScriptStep[] = [
    { tray: 0, bag: 0 },
    { tray: 1, bag: 0 },
    { tray: 4, bag: 0 },
    { tray: 2, bag: 0 },
    { tray: 2, bag: 1 },
    { tray: 3, bag: 1 },
    { tray: 0, bag: 1 },
    { tray: 1, bag: 1 },
    { tray: 1, bag: 2 },
    { tray: 2, bag: 2 },
    { tray: 3, bag: 2 },
    { tray: 0, bag: 2 },
    { tray: 0, bag: 3 },
    { tray: 6, bag: 3 },
    { tray: 2, bag: 3 },
    { tray: 3, bag: 3 },
    { tray: 5, bag: 4 },
    { tray: 4, bag: 4 },
    { tray: 1, bag: 4 },
    { tray: 5, bag: 4 },
    { tray: 0, bag: 5 },
    { tray: 0, bag: 5 },
    { tray: 0, bag: 5 },
    { tray: 0, bag: 5 },
];
const FAIR: ScriptStep[] = [{ buffer: 0, bag: 0 }];
const WASTE: ScriptStep[] = [{ tray: 0, bag: 0 }];

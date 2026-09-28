import { BoardState } from './BoardState';
import { assertRedoLayout, playScript, type ScriptStep } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 44 关：24 件，5+4×3+3+2×2；六列深 4，拆格锁死。 */
export const LEVEL_44: LevelDef = {
    id: 44,
    title: '七格拆错',
    teach: '两只柜台槽可以同时占满',
    trays: [{ cap: 5 }, { cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 3 }, { cap: 2 }, { cap: 2 }],
    bags: [
        ['milk', 'veg', 'grape', 'meat'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'grape', 'milk', 'veg'],
        ['grape', 'milk', 'lemon', 'meat'],
        ['lemon', 'sauce', 'veg', 'lemon'],
        ['fruit', 'sauce', 'fruit', 'meat'],
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

export function selfCheckLevel44(): void {
    assertLevel(LEVEL_44);
    assertRedoLayout(LEVEL_44);
    const opened = BoardState.fromLevel(LEVEL_44);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L44 fridge must take the top, got ${first.reason}`);

    const winScript: ScriptStep[] = WIN;
    const play = BoardState.fromLevel(LEVEL_44);
    const peak = playScript(play, winScript, 'L44');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L44 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L44 full-info peak ${peak}`);

    const fairScript: ScriptStep[] = FAIR;
    const fair = BoardState.fromLevel(LEVEL_44);
    const fairPeak = playScript(fair, fairScript, 'L44 fair');
    if (!fair.isWin()) throw new Error('L44 fair did not win');
    if (fairPeak !== 2) throw new Error(`L44 fair peak ${fairPeak}`);
    const fb = firstBufferParkStep(fairScript);
    if (fb < 0 || fb > 2) throw new Error(`L44 fair first buffer park at ${fb}`);

    const wasteScript: ScriptStep[] = WASTE;
    const fail = BoardState.fromLevel(LEVEL_44);
    playScript(fail, wasteScript, 'L44 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L44 waste ${fail.failReason()}`);
    if (LEVEL_44.loseable !== true) throw new Error('L44 loseable');
    if (LEVEL_44.targetSteps != null && fairScript.length > LEVEL_44.targetSteps) {
        throw new Error('L44 targetSteps below fair length');
    }
}

const WIN: ScriptStep[] = [
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
    { tray: 0, bag: 5 },
    { tray: 6, bag: 5 },
    { tray: 5, bag: 5 },
    { tray: 0, bag: 5 },
];
const FAIR: ScriptStep[] = [
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
    { tray: 0, bag: 5 },
    { tray: 6, bag: 5 },
    { tray: 5, bag: 5 },
    { tray: 0, bag: 5 },
];
const WASTE: ScriptStep[] = [
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
    { tray: 0, bag: 5 },
    { tray: 6, bag: 5 },
    { tray: 4, bag: 5 },
];

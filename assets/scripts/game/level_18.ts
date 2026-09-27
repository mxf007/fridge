import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { auditVisibleInformation } from './VisibleInformationAudit';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 18 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_18: LevelDef = {
    id: 18,
    title: '大格留给大摞',
    teach: '葡萄两件进小格；锁进左侧大格会锁死',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 2 }, { cap: 2 }],
    bags: [
        ['grape', 'veg', 'milk'],
        ['veg', 'veg', 'milk'],
        ['milk', 'veg', 'veg'],
        ['veg', 'grape', 'milk'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel18(): void {
    assertLevel(LEVEL_18);
    assertRedoLayout(LEVEL_18);
    const audit = auditVisibleInformation(LEVEL_18);
    if (!audit.passes) throw new Error(`L18 audit failed: ${audit.failures.join(',')}`);

    const opened = BoardState.fromLevel(LEVEL_18);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L18 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L18 place must count a step');

    const winScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 0, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 2 },
        { tray: 3, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 3, bag: 3 },
    ];
    const play = BoardState.fromLevel(LEVEL_18);
    const peak = playScript(play, winScript, 'L18');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L18 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L18 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 2, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 0, bag: 2 },
        { tray: 3, bag: 2 },
        { buffer: 0, bag: 2 },
        { buffer: 1, bag: 3 },
        { tray: 1, bag: 3 },
    ];
    const fail = BoardState.fromLevel(LEVEL_18);
    playScript(fail, wasteScript, 'L18 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L18 waste ${fail.failReason()}`);
    if (LEVEL_18.loseable !== true) throw new Error('L18 loseable');
}

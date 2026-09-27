import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { auditVisibleInformation } from './VisibleInformationAudit';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 22 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_22: LevelDef = {
    id: 22,
    title: '菠萝进大格',
    teach: '菠萝四件必须进大格；葡萄两件进小格',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 2 }, { cap: 2 }],
    bags: [
        ['milk', 'milk', 'grape'],
        ['milk', 'milk', 'grape'],
        ['pineapple', 'pineapple', 'veg'],
        ['pineapple', 'pineapple', 'veg'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel22(): void {
    assertLevel(LEVEL_22);
    assertRedoLayout(LEVEL_22);
    const audit = auditVisibleInformation(LEVEL_22);
    if (!audit.passes) throw new Error(`L22 audit failed: ${audit.failures.join(',')}`);

    const opened = BoardState.fromLevel(LEVEL_22);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L22 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L22 place must count a step');

    const winScript = [
        { tray: 2, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 0, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 3, bag: 2 },
        { tray: 3, bag: 3 },
        { tray: 1, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 1, bag: 3 },
        { tray: 1, bag: 3 },
    ];
    const play = BoardState.fromLevel(LEVEL_22);
    const peak = playScript(play, winScript, 'L22');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L22 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L22 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 3 },
        { tray: 3, bag: 2 },
        { tray: 3, bag: 2 },
        { buffer: 0, bag: 3 },
    ];
    const fail = BoardState.fromLevel(LEVEL_22);
    playScript(fail, wasteScript, 'L22 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L22 waste ${fail.failReason()}`);
    if (LEVEL_22.loseable !== true) throw new Error('L22 loseable');
}

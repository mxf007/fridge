import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { auditVisibleInformation } from './VisibleInformationAudit';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 17 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_17: LevelDef = {
    id: 17,
    title: '大件要进大格',
    teach: '小格在左。水果两件进小格',
    trays: [{ cap: 2 }, { cap: 4 }, { cap: 2 }, { cap: 4 }],
    bags: [
        ['milk', 'veg', 'fruit'],
        ['milk', 'veg', 'fruit'],
        ['milk', 'veg', 'veg'],
        ['milk', 'veg', 'veg'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel17(): void {
    assertLevel(LEVEL_17);
    assertRedoLayout(LEVEL_17);
    const audit = auditVisibleInformation(LEVEL_17);
    if (!audit.passes) throw new Error(`L17 audit failed: ${audit.failures.join(',')}`);

    const opened = BoardState.fromLevel(LEVEL_17);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L17 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L17 place must count a step');

    const winScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 3, bag: 2 },
        { tray: 2, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 3, bag: 3 },
    ];
    const play = BoardState.fromLevel(LEVEL_17);
    const peak = playScript(play, winScript, 'L17');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L17 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L17 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 3, bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 2 },
        { buffer: 0, bag: 3 },
        { buffer: 1, bag: 3 },
    ];
    const fail = BoardState.fromLevel(LEVEL_17);
    playScript(fail, wasteScript, 'L17 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L17 waste ${fail.failReason()}`);
    if (LEVEL_17.loseable !== true) throw new Error('L17 loseable');
}

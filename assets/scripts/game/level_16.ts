import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { auditVisibleInformation } from './VisibleInformationAudit';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 16 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_16: LevelDef = {
    id: 16,
    title: '尝尝酱',
    teach: '第五种：酱。两件酱进两件格',
    trays: [{ cap: 4 }, { cap: 3 }, { cap: 2 }],
    bags: [
        ['milk', 'milk', 'sauce'],
        ['veg', 'veg', 'sauce'],
        ['milk', 'milk', 'veg'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel16(): void {
    assertLevel(LEVEL_16);
    assertRedoLayout(LEVEL_16);
    const audit = auditVisibleInformation(LEVEL_16);
    if (!audit.passes) throw new Error(`L16 audit failed: ${audit.failures.join(',')}`);

    const opened = BoardState.fromLevel(LEVEL_16);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L16 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L16 place must count a step');

    const winScript = [
        { tray: 1, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 2, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 2, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 1 },
    ];
    const play = BoardState.fromLevel(LEVEL_16);
    const peak = playScript(play, winScript, 'L16');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L16 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L16 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 0 },
        { tray: 2, bag: 0 },
        { buffer: 0, bag: 2 },
    ];
    const fail = BoardState.fromLevel(LEVEL_16);
    playScript(fail, wasteScript, 'L16 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L16 waste ${fail.failReason()}`);
    if (LEVEL_16.loseable !== true) throw new Error('L16 loseable');
}

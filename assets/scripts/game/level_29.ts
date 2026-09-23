import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 29 关：预决赛。五格均 cap3；奶/菜/肉/酱/西 各 3。
 * 解锁 30 关；不出「分享步数」强提示（留给 30）。
 */
export const LEVEL_29: LevelDef = {
    id: 29,
    title: '预决赛五色',
    teach: '五种各一格；西瓜整格收满再换',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['watermelon'],
        ['watermelon'],
        ['watermelon'],
        ['milk'],
        ['milk'],
        ['sauce', 'sauce', 'sauce', 'meat', 'meat', 'meat', 'veg', 'veg', 'veg', 'milk'],
    ],
    buffer: 3,
    loseable: true,
};

function run(
    board: BoardState,
    script: { tray?: number; buffer?: number; bag?: number; fromBuffer?: number }[],
) {
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) board.selectTray(step.tray);
        if (step.buffer != null) board.selectBuffer(step.buffer);
        let r;
        if (step.fromBuffer != null) r = board.placeFromBuffer(step.fromBuffer);
        else if (step.bag != null) r = board.placeFromBag(step.bag);
        else throw new Error(`L29 script ${i} missing place`);
        if (!r.ok) throw new Error(`L29 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel29(): void {
    assertLevel(LEVEL_29);
    const b = BoardState.fromLevel(LEVEL_29);
    if (!b.bufferEnabled) throw new Error('L29 bufferEnabled');
    if (b.trays.length !== 5 || !b.trays.every((t) => t.cap === 3)) throw new Error('L29 caps');
    const counts: Record<string, number> = {};
    for (const x of LEVEL_29.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (
        counts.milk !== 3
        || counts.veg !== 3
        || counts.meat !== 3
        || counts.sauce !== 3
        || counts.watermelon !== 3
    ) {
        throw new Error('L29 counts');
    }
    if (counts.coconut) throw new Error('L29 no coconut with sauce');
    const audit = auditVisibleInformation(LEVEL_29);
    if (!audit.passes) throw new Error(`L29 audit failed: ${audit.failures.join(',')}`);

    const bounce = BoardState.fromLevel(LEVEL_29);
    bounce.placeFromBag(0);
    const bad = bounce.placeFromBag(3);
    if (bad.ok || bad.reason !== 'wrong_kind') throw new Error('L29 milk bounce on watermelon');

    const play = BoardState.fromLevel(LEVEL_29);
    run(play, [
        { bag: 0 }, { bag: 1 }, { bag: 2 },
        { tray: 1, bag: 3 }, { bag: 4 }, { bag: 5 },
        { tray: 2, bag: 5 }, { bag: 5 }, { bag: 5 },
        { tray: 3, bag: 5 }, { bag: 5 }, { bag: 5 },
        { tray: 4, bag: 5 }, { bag: 5 }, { bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 15) throw new Error('L29 must win in 15');
    const kinds = play.trays.map((t) => t.kind).sort().join(',');
    if (kinds !== 'meat,milk,sauce,veg,watermelon') throw new Error(`L29 kinds ${kinds}`);
    if (LEVEL_29.loseable !== true) throw new Error('L29 loseable');
    console.log('L29 OK', audit.variantCount);
}

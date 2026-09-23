import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 26 关：深栈 + 混容量。caps 2,3,3,3,4；奶4+菜3+肉3+酱3+柠2。
 * 柠檬进小格；柜台翻层是清晰救援路径。
 */
export const LEVEL_26: LevelDef = {
    id: 26,
    title: '深袋混容量',
    teach: '柠檬进小格；拿不准先放柜台翻层',
    trays: [{ cap: 2 }, { cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 4 }],
    bags: [
        ['lemon'],
        ['lemon'],
        ['milk'],
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
        else throw new Error(`L26 script ${i} missing place`);
        if (!r.ok) throw new Error(`L26 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel26(): void {
    assertLevel(LEVEL_26);
    if (LEVEL_26.trays.map((t) => t.cap).join(',') !== '2,3,3,3,4') throw new Error('L26 caps');
    const counts: Record<string, number> = {};
    for (const x of LEVEL_26.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (
        counts.milk !== 4
        || counts.veg !== 3
        || counts.meat !== 3
        || counts.sauce !== 3
        || counts.lemon !== 2
    ) {
        throw new Error('L26 counts');
    }
    if (counts.pineapple) throw new Error('L26 no pineapple');
    if (counts.coconut) throw new Error('L26 no coconut with sauce');
    const audit = auditVisibleInformation(LEVEL_26);
    if (!audit.passes) throw new Error(`L26 audit failed: ${audit.failures.join(',')}`);

    const bounce = BoardState.fromLevel(LEVEL_26);
    bounce.placeFromBag(0);
    const bad = bounce.placeFromBag(2);
    if (bad.ok || bad.reason !== 'wrong_kind') throw new Error('L26 milk bounce on lemon');

    const play = BoardState.fromLevel(LEVEL_26);
    run(play, [
        { bag: 0 }, { bag: 1 },
        { tray: 4, bag: 2 }, { bag: 3 }, { bag: 4 }, { bag: 5 },
        { tray: 1, bag: 5 }, { bag: 5 }, { bag: 5 },
        { tray: 2, bag: 5 }, { bag: 5 }, { bag: 5 },
        { tray: 3, bag: 5 }, { bag: 5 }, { bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 15) throw new Error('L26 must win in 15');
    if (play.trays[0].kind !== 'lemon' || play.trays[4].kind !== 'milk') {
        throw new Error('L26 lemon/milk slots');
    }

    // 浪费：柠进 cap4 → 奶塞满 cap2 + 半格 cap3，菜/肉占完剩余格，酱堆满柜台
    const fail = BoardState.fromLevel(LEVEL_26);
    fail.selectTray(4);
    fail.placeFromBag(0);
    fail.placeFromBag(1);
    if (fail.trays[4].kind !== 'lemon' || fail.trays[4].items.length !== 2) {
        throw new Error('L26 waste lemon into cap4');
    }
    fail.selectTray(0);
    fail.placeFromBag(2);
    fail.placeFromBag(3);
    if (!fail.trays[0].sealed || fail.trays[0].kind !== 'milk') throw new Error('L26 waste milk cap2');
    fail.selectTray(1);
    fail.placeFromBag(4);
    fail.placeFromBag(5);
    if (fail.trays[1].kind !== 'milk' || fail.trays[1].items.length !== 2) {
        throw new Error('L26 waste partial milk tray1');
    }
    fail.selectTray(2);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.selectTray(3);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.selectBuffer(0);
    fail.placeFromBag(5);
    fail.selectBuffer(1);
    fail.placeFromBag(5);
    fail.selectBuffer(2);
    fail.placeFromBag(5);
    if (fail.isWin() || fail.failReason() == null) throw new Error('L26 waste must fail');
    if (fail.failReason() !== 'buffer_full' && fail.failReason() !== 'locked_out') {
        throw new Error(`L26 unexpected fail ${fail.failReason()}`);
    }
    if (LEVEL_26.loseable !== true) throw new Error('L26 loseable');
    console.log('L26 OK', audit.variantCount, fail.failReason());
}

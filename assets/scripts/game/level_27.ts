import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 27 关：锁错即死。caps 4,2,2,2,2；奶4+菜2+肉2+葡2+柠2。
 * 大格在左（诱惑）；葡萄/柠檬进大格会锁死。
 */
export const LEVEL_27: LevelDef = {
    id: 27,
    title: '小件别进大格',
    teach: '葡萄柠檬进小格；大格留给四件奶',
    trays: [{ cap: 4 }, { cap: 2 }, { cap: 2 }, { cap: 2 }, { cap: 2 }],
    bags: [
        ['lemon'],
        ['lemon'],
        ['grape'],
        ['grape'],
        ['veg'],
        ['milk', 'milk', 'milk', 'milk', 'meat', 'meat', 'veg'],
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
        else throw new Error(`L27 script ${i} missing place`);
        if (!r.ok) throw new Error(`L27 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel27(): void {
    assertLevel(LEVEL_27);
    if (LEVEL_27.trays.map((t) => t.cap).join(',') !== '4,2,2,2,2') throw new Error('L27 caps');
    const counts: Record<string, number> = {};
    for (const x of LEVEL_27.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (
        counts.milk !== 4
        || counts.veg !== 2
        || counts.meat !== 2
        || counts.grape !== 2
        || counts.lemon !== 2
    ) {
        throw new Error('L27 counts');
    }
    if (counts.leftover) throw new Error('L27 no leftover with grape');
    if (counts.pineapple) throw new Error('L27 no pineapple with lemon');
    const audit = auditVisibleInformation(LEVEL_27);
    if (!audit.passes) throw new Error(`L27 audit failed: ${audit.failures.join(',')}`);

    const bounce = BoardState.fromLevel(LEVEL_27);
    bounce.selectTray(1);
    bounce.placeFromBag(0);
    const bad = bounce.placeFromBag(2);
    if (bad.ok || bad.reason !== 'wrong_kind') throw new Error('L27 grape bounce on lemon');

    const play = BoardState.fromLevel(LEVEL_27);
    run(play, [
        { tray: 1, bag: 0 }, { bag: 1 },
        { tray: 2, bag: 2 }, { bag: 3 },
        { tray: 3, bag: 4 }, { bag: 5 },
        { tray: 4, bag: 5 }, { bag: 5 },
        { tray: 0, bag: 5 }, { bag: 5 }, { bag: 5 }, { bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 12) throw new Error('L27 must win in 12');
    if (play.trays[0].kind !== 'milk') throw new Error('L27 milk in large');

    const fail = BoardState.fromLevel(LEVEL_27);
    fail.placeFromBag(2);
    fail.placeFromBag(3);
    if (fail.trays[0].kind !== 'grape' || fail.trays[0].items.length !== 2) {
        throw new Error('L27 waste grape into large');
    }
    fail.selectTray(1);
    fail.placeFromBag(0);
    fail.placeFromBag(1);
    fail.selectTray(2);
    fail.placeFromBag(4);
    fail.placeFromBag(5);
    fail.selectTray(3);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.selectTray(4);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.selectBuffer(0);
    fail.placeFromBag(5);
    fail.selectBuffer(1);
    fail.placeFromBag(5);
    if (fail.isWin() || fail.failReason() == null) throw new Error('L27 waste must fail');
    if (fail.failReason() !== 'locked_out' && fail.failReason() !== 'buffer_full') {
        throw new Error(`L27 unexpected fail ${fail.failReason()}`);
    }
    if (LEVEL_27.loseable !== true) throw new Error('L27 loseable');
    console.log('L27 OK', audit.variantCount, fail.failReason());
}

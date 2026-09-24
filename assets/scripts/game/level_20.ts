import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 20 关：猕猴桃登场 + 五色混容量。
 * caps 3,3,2,3,4；猕2+奶3+菜3+肉3+酱4。
 */
export const LEVEL_20: LevelDef = {
    id: 20,
    title: '五色猕猴桃',
    teach: '猕猴桃两件进小格；酱四件进大格',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 2 }, { cap: 3 }, { cap: 4 }],
    bags: [
        ['kiwi'],
        ['kiwi'],
        ['milk'],
        ['milk'],
        ['milk'],
        ['sauce', 'sauce', 'sauce', 'sauce', 'meat', 'meat', 'meat', 'veg', 'veg', 'veg'],
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
        else throw new Error(`L20 script ${i} missing place`);
        if (!r.ok) throw new Error(`L20 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel20(): void {
    assertLevel(LEVEL_20);
    const b = BoardState.fromLevel(LEVEL_20);
    if (!b.bufferEnabled) throw new Error('L20 bufferEnabled');
    if (b.trays.map((t) => t.cap).join(',') !== '3,3,2,3,4') throw new Error('L20 caps');
    if (b.bags.length !== 6) throw new Error('L20 must have 6 bag columns');
    if (
        b.peekBag(0) !== 'kiwi'
        || b.peekBag(2) !== 'milk'
        || b.peekBag(5) !== 'veg'
    ) {
        throw new Error('L20 tops kiwi/milk/veg');
    }
    const counts: Record<string, number> = {};
    for (const x of LEVEL_20.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (
        counts.milk !== 3
        || counts.veg !== 3
        || counts.meat !== 3
        || counts.sauce !== 4
        || counts.kiwi !== 2
    ) {
        throw new Error('L20 counts');
    }
    const audit = auditVisibleInformation(LEVEL_20);
    if (!audit.passes) throw new Error(`L20 audit failed: ${audit.failures.join(',')}`);

    const bounce = BoardState.fromLevel(LEVEL_20);
    bounce.selectTray(2);
    bounce.placeFromBag(0);
    const bad = bounce.placeFromBag(2);
    if (bad.ok || bad.reason !== 'wrong_kind') throw new Error('L20 milk bounce on kiwi tray');

    const play = BoardState.fromLevel(LEVEL_20);
    run(play, [
        { tray: 2, bag: 0 },
        { bag: 1 },
        { tray: 0, bag: 2 },
        { bag: 3 },
        { bag: 4 },
        { tray: 1, bag: 5 },
        { bag: 5 },
        { bag: 5 },
        { tray: 3, bag: 5 },
        { bag: 5 },
        { bag: 5 },
        { tray: 4, bag: 5 },
        { bag: 5 },
        { bag: 5 },
        { bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 15) throw new Error('L20 must win in 15');
    if (play.trays[2].kind !== 'kiwi' || play.trays[4].kind !== 'sauce') {
        throw new Error('L20 kiwi/sauce slots');
    }

    const fail = BoardState.fromLevel(LEVEL_20);
    fail.placeFromBag(0);
    fail.placeFromBag(1);
    if (fail.trays[0].kind !== 'kiwi' || fail.trays[0].items.length !== 2) {
        throw new Error('L20 waste kiwi in cap3');
    }
    fail.selectTray(1);
    fail.placeFromBag(2);
    fail.placeFromBag(3);
    fail.placeFromBag(4);
    if (!fail.trays[1].sealed || fail.trays[1].kind !== 'milk') {
        throw new Error('L20 waste milk tray');
    }
    fail.selectTray(2);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    if (!fail.trays[2].sealed || fail.trays[2].kind !== 'veg') {
        throw new Error('L20 waste veg cap2');
    }
    fail.selectBuffer(0);
    const park = fail.placeFromBag(5);
    if (!park.ok || park.item !== 'veg') throw new Error('L20 waste park veg');
    fail.selectTray(3);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.selectTray(4);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    if (fail.isWin() || fail.failReason() == null) throw new Error('L20 waste must fail');
    if (fail.failReason() !== 'locked_out') {
        throw new Error(`L20 waste fail ${fail.failReason()}`);
    }
    if (LEVEL_20.loseable !== true) throw new Error('L20 loseable');
    console.log('L20 OK', audit.variantCount);
}

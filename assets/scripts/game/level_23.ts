import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 23 关：假同色肉↔酱。混容量 3,3,2,4；酱2+奶3+菜3+肉4。
 */
export const LEVEL_23: LevelDef = {
    id: 23,
    title: '肉酱别看花',
    teach: '酱两件进小格；肉和酱颜色近，看清再换格',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 2 }, { cap: 4 }],
    bags: [
        ['meat'],
        ['meat'],
        ['sauce'],
        ['sauce'],
        ['milk'],
        ['meat', 'meat', 'veg', 'veg', 'veg', 'milk', 'milk'],
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
        else throw new Error(`L23 script ${i} missing place`);
        if (!r.ok) throw new Error(`L23 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel23(): void {
    assertLevel(LEVEL_23);
    const b = BoardState.fromLevel(LEVEL_23);
    if (b.trays.map((t) => t.cap).join(',') !== '3,3,2,4') throw new Error('L23 caps');
    const counts: Record<string, number> = {};
    for (const x of LEVEL_23.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (counts.milk !== 3 || counts.veg !== 3 || counts.meat !== 4 || counts.sauce !== 2) {
        throw new Error('L23 counts');
    }
    const audit = auditVisibleInformation(LEVEL_23);
    if (!audit.passes) throw new Error(`L23 audit failed: ${audit.failures.join(',')}`);

    const bounce = BoardState.fromLevel(LEVEL_23);
    bounce.selectTray(2);
    bounce.placeFromBag(2);
    const bad = bounce.placeFromBag(0);
    if (bad.ok || bad.reason !== 'wrong_kind') throw new Error('L23 meat bounce on sauce tray');

    const play = BoardState.fromLevel(LEVEL_23);
    run(play, [
        { tray: 2, bag: 2 },
        { bag: 3 },
        { tray: 0, bag: 4 },
        { bag: 5 },
        { bag: 5 },
        { tray: 1, bag: 5 },
        { bag: 5 },
        { bag: 5 },
        { tray: 3, bag: 0 },
        { bag: 1 },
        { bag: 5 },
        { bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 12) throw new Error('L23 must win in 12');

    const fail = BoardState.fromLevel(LEVEL_23);
    fail.placeFromBag(2);
    fail.placeFromBag(3);
    if (fail.trays[0].kind !== 'sauce' || fail.trays[0].sealed) {
        throw new Error('L23 waste sauce must sit in cap3');
    }
    fail.selectTray(1);
    fail.placeFromBag(4);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.selectTray(2);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.selectBuffer(0);
    const park = fail.placeFromBag(5);
    if (!park.ok || park.item !== 'veg') throw new Error('L23 waste must park veg');
    fail.selectTray(3);
    fail.placeFromBag(0);
    fail.placeFromBag(1);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    if (fail.isWin() || fail.failReason() == null) throw new Error('L23 waste must fail');
    if (fail.failReason() !== 'locked_out') throw new Error(`L23 waste ${fail.failReason()}`);
    console.log('L23 OK', audit.variantCount);
}

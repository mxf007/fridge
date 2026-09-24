import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 30 关：决赛。六格混容量 2,3,3,4,4,4；葡2+奶3+菜3+肉4+菠4+西4。
 * 不用柠檬：柠檬与菠萝互斥。
 */
export const LEVEL_30: LevelDef = {
    id: 30,
    title: '决赛冰箱',
    teach: '葡萄两件进小格；菠萝西瓜各四件占大格',
    trays: [{ cap: 2 }, { cap: 3 }, { cap: 3 }, { cap: 4 }, { cap: 4 }, { cap: 4 }],
    bags: [
        ['watermelon', 'watermelon', 'watermelon'],
        ['grape'],
        ['grape'],
        ['milk'],
        ['milk'],
        ['milk'],
        ['veg'],
        ['veg'],
        ['veg'],
        ['meat'],
        ['meat'],
        ['meat'],
        ['meat'],
        ['pineapple'],
        ['pineapple'],
        ['pineapple'],
        ['pineapple'],
        ['watermelon'],
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
        else throw new Error(`L30 script ${i} missing place`);
        if (!r.ok) throw new Error(`L30 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel30(): void {
    assertLevel(LEVEL_30);
    const b = BoardState.fromLevel(LEVEL_30);
    if (!b.bufferEnabled) throw new Error('L30 bufferEnabled');
    if (b.trays.map((t) => t.cap).join(',') !== '2,3,3,4,4,4') throw new Error('L30 caps');
    if (b.bags.length !== 18) throw new Error('L30 shallow bags');
    const counts: Record<string, number> = {};
    for (const x of LEVEL_30.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (
        counts.milk !== 3
        || counts.veg !== 3
        || counts.meat !== 4
        || counts.pineapple !== 4
        || counts.watermelon !== 4
        || counts.grape !== 2
    ) {
        throw new Error('L30 counts');
    }
    if (counts.lemon || counts.coconut || counts.sauce) throw new Error('L30 finale food set');

    const audit = auditVisibleInformation(LEVEL_30);
    if (!audit.passes) throw new Error(`L30 audit failed: ${audit.failures.join(',')}`);
    if (audit.initialSafeActionCount <= 0) throw new Error('L30 need safe open');

    const bounce = BoardState.fromLevel(LEVEL_30);
    bounce.selectTray(0);
    bounce.placeFromBag(1);
    const bad = bounce.placeFromBag(0);
    if (bad.ok || bad.reason !== 'wrong_kind') throw new Error('L30 wm bounce on grape tray');

    const play = BoardState.fromLevel(LEVEL_30);
    run(play, [
        { tray: 0, bag: 1 }, { bag: 2 },
        { tray: 1, bag: 3 }, { bag: 4 }, { bag: 5 },
        { tray: 2, bag: 6 }, { bag: 7 }, { bag: 8 },
        { tray: 3, bag: 9 }, { bag: 10 }, { bag: 11 }, { bag: 12 },
        { tray: 4, bag: 13 }, { bag: 14 }, { bag: 15 }, { bag: 16 },
        { tray: 5, bag: 0 }, { bag: 0 }, { bag: 0 }, { bag: 17 },
    ]);
    if (!play.isWin() || play.steps !== 20) throw new Error('L30 must win in 20');
    const kinds = play.trays.map((t) => t.kind).sort().join(',');
    if (kinds !== 'grape,meat,milk,pineapple,veg,watermelon') throw new Error(`L30 kinds ${kinds}`);

    const fail = BoardState.fromLevel(LEVEL_30);
    fail.selectTray(3);
    fail.placeFromBag(1);
    fail.placeFromBag(2);
    if (fail.trays[3].kind !== 'grape' || fail.trays[3].sealed) {
        throw new Error('L30 waste grape must sit in cap4');
    }
    fail.selectTray(0);
    fail.placeFromBag(6);
    fail.placeFromBag(7);
    fail.selectBuffer(0);
    const park = fail.placeFromBag(8);
    if (!park.ok || park.item !== 'veg') throw new Error('L30 waste must park veg');
    fail.selectTray(1);
    fail.placeFromBag(3);
    fail.placeFromBag(4);
    fail.placeFromBag(5);
    fail.selectTray(4);
    fail.placeFromBag(9);
    fail.placeFromBag(10);
    fail.placeFromBag(11);
    fail.placeFromBag(12);
    fail.selectTray(5);
    fail.placeFromBag(13);
    fail.placeFromBag(14);
    fail.placeFromBag(15);
    fail.placeFromBag(16);
    fail.selectTray(2);
    fail.placeFromBag(0);
    fail.placeFromBag(0);
    fail.placeFromBag(0);
    fail.selectBuffer(1);
    const parkWm = fail.placeFromBag(17);
    if (!parkWm.ok || parkWm.item !== 'watermelon') throw new Error('L30 waste must park watermelon');
    if (fail.isWin() || fail.failReason() == null) throw new Error('L30 waste must fail');
    if (fail.failReason() !== 'locked_out') throw new Error(`L30 waste ${fail.failReason()}`);
    if (LEVEL_30.loseable !== true) throw new Error('L30 loseable');
    console.log('L30 OK', audit.variantCount);
}

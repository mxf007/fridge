import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 29 关：预决赛。混容量 3,3,2,3,4；西3+奶3+菜3+肉4+酱2。
 */
export const LEVEL_29: LevelDef = {
    id: 29,
    title: '预决赛五色',
    teach: '酱两件进小格；西瓜三件占一格',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 2 }, { cap: 3 }, { cap: 4 }],
    bags: [
        ['watermelon'],
        ['watermelon'],
        ['watermelon'],
        ['sauce'],
        ['sauce'],
        ['meat', 'meat', 'meat', 'meat', 'veg', 'veg', 'veg', 'milk', 'milk', 'milk'],
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
    if (b.trays.map((t) => t.cap).join(',') !== '3,3,2,3,4') throw new Error('L29 caps');
    const counts: Record<string, number> = {};
    for (const x of LEVEL_29.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (
        counts.milk !== 3
        || counts.veg !== 3
        || counts.meat !== 4
        || counts.sauce !== 2
        || counts.watermelon !== 3
    ) {
        throw new Error('L29 counts');
    }
    const audit = auditVisibleInformation(LEVEL_29);
    if (!audit.passes) throw new Error(`L29 audit failed: ${audit.failures.join(',')}`);

    const play = BoardState.fromLevel(LEVEL_29);
    run(play, [
        { bag: 0 }, { bag: 1 }, { bag: 2 },
        { tray: 2, bag: 3 }, { bag: 4 },
        { tray: 1, bag: 5 }, { bag: 5 }, { bag: 5 },
        { tray: 3, bag: 5 }, { bag: 5 }, { bag: 5 },
        { tray: 4, bag: 5 }, { bag: 5 }, { bag: 5 }, { bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 15) throw new Error('L29 must win in 15');

    const fail = BoardState.fromLevel(LEVEL_29);
    fail.placeFromBag(3);
    fail.placeFromBag(4);
    if (fail.trays[0].kind !== 'sauce' || fail.trays[0].sealed) {
        throw new Error('L29 waste sauce must sit in cap3');
    }
    fail.selectTray(1);
    fail.placeFromBag(0);
    fail.placeFromBag(1);
    fail.placeFromBag(2);
    fail.selectTray(2);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.selectBuffer(0);
    const park = fail.placeFromBag(5);
    if (!park.ok || park.item !== 'milk') throw new Error('L29 waste must park milk');
    fail.selectTray(3);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.selectTray(4);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    if (fail.isWin() || fail.failReason() == null) throw new Error('L29 waste must fail');
    if (fail.failReason() !== 'locked_out') throw new Error(`L29 waste ${fail.failReason()}`);
    console.log('L29 OK', audit.variantCount);
}

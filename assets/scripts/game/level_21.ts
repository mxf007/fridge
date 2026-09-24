import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/** 第 21 关：剩菜首战。混容量 3,3,3,4；剩3+奶3+菜3+肉4。 */
export const LEVEL_21: LevelDef = {
    id: 21,
    title: '剩菜也要收',
    teach: '剩菜三件占一格；肉四件进大格',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 4 }],
    bags: [
        ['leftover'],
        ['leftover'],
        ['leftover'],
        ['milk'],
        ['milk'],
        ['meat', 'meat', 'meat', 'meat', 'veg', 'veg', 'veg', 'milk'],
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
        else throw new Error(`L21 script ${i} missing place`);
        if (!r.ok) throw new Error(`L21 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel21(): void {
    assertLevel(LEVEL_21);
    const b = BoardState.fromLevel(LEVEL_21);
    if (b.trays.map((t) => t.cap).join(',') !== '3,3,3,4') throw new Error('L21 caps');
    const counts: Record<string, number> = {};
    for (const x of LEVEL_21.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (counts.milk !== 3 || counts.veg !== 3 || counts.meat !== 4 || counts.leftover !== 3) {
        throw new Error('L21 counts');
    }
    const audit = auditVisibleInformation(LEVEL_21);
    if (!audit.passes) throw new Error(`L21 audit failed: ${audit.failures.join(',')}`);

    const play = BoardState.fromLevel(LEVEL_21);
    run(play, [
        { bag: 0 },
        { bag: 1 },
        { bag: 2 },
        { tray: 1, bag: 3 },
        { bag: 4 },
        { bag: 5 },
        { tray: 2, bag: 5 },
        { bag: 5 },
        { bag: 5 },
        { tray: 3, bag: 5 },
        { bag: 5 },
        { bag: 5 },
        { bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 13) throw new Error('L21 must win in 13');

    const fail = BoardState.fromLevel(LEVEL_21);
    fail.selectTray(3);
    fail.placeFromBag(0);
    fail.placeFromBag(1);
    fail.placeFromBag(2);
    if (fail.trays[3].kind !== 'leftover' || fail.trays[3].items.length !== 3 || fail.trays[3].sealed) {
        throw new Error('L21 waste leftover must occupy cap4 without sealing');
    }
    fail.selectTray(0);
    fail.placeFromBag(3);
    fail.placeFromBag(4);
    fail.placeFromBag(5);
    fail.selectTray(1);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.selectTray(2);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.selectBuffer(0);
    const park = fail.placeFromBag(5);
    if (!park.ok || park.item !== 'meat') throw new Error('L21 waste must park last meat');
    if (fail.isWin() || fail.failReason() == null) throw new Error('L21 waste must fail');
    if (fail.failReason() !== 'locked_out') throw new Error(`L21 waste ${fail.failReason()}`);
    console.log('L21 OK', audit.variantCount);
}

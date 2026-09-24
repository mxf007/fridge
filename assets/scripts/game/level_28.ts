import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/** 第 28 关：椰子登场。混容量 3,3,3,4。 */
export const LEVEL_28: LevelDef = {
    id: 28,
    title: '椰子登场',
    teach: '椰子三件占一格；肉四件进大格',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 4 }],
    bags: [
        ['coconut'],
        ['coconut'],
        ['coconut'],
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
        else throw new Error(`L28 script ${i} missing place`);
        if (!r.ok) throw new Error(`L28 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel28(): void {
    assertLevel(LEVEL_28);
    if (LEVEL_28.trays.map((t) => t.cap).join(',') !== '3,3,3,4') throw new Error('L28 caps');
    const counts: Record<string, number> = {};
    for (const x of LEVEL_28.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (counts.milk !== 3 || counts.veg !== 3 || counts.meat !== 4 || counts.coconut !== 3) {
        throw new Error('L28 counts');
    }
    const audit = auditVisibleInformation(LEVEL_28);
    if (!audit.passes) throw new Error(`L28 audit failed: ${audit.failures.join(',')}`);

    const play = BoardState.fromLevel(LEVEL_28);
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
    if (!play.isWin() || play.steps !== 13) throw new Error('L28 must win in 13');

    const fail = BoardState.fromLevel(LEVEL_28);
    fail.selectTray(3);
    fail.placeFromBag(0);
    fail.placeFromBag(1);
    fail.placeFromBag(2);
    if (fail.trays[3].kind !== 'coconut' || fail.trays[3].items.length !== 3 || fail.trays[3].sealed) {
        throw new Error('L28 waste coconut must occupy cap4 without sealing');
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
    if (!park.ok || park.item !== 'meat') throw new Error('L28 waste must park last meat');
    if (fail.isWin() || fail.failReason() == null) throw new Error('L28 waste must fail');
    if (fail.failReason() !== 'locked_out') throw new Error(`L28 waste ${fail.failReason()}`);
    console.log('L28 OK', audit.variantCount);
}

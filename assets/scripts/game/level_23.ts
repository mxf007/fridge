import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/** 第 23 关：假同色肉↔酱。四格 cap3；奶/菜/肉/酱 各 3。 */
export const LEVEL_23: LevelDef = {
    id: 23,
    title: '肉酱别看花',
    teach: '肉和酱颜色近，看清再换格',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['meat'],
        ['meat'],
        ['meat'],
        ['sauce'],
        ['sauce'],
        ['veg', 'veg', 'veg', 'milk', 'milk', 'milk', 'sauce'],
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
    if (!b.bufferEnabled) throw new Error('L23 bufferEnabled must be true');
    if (b.trays.length !== 4 || b.bags.length !== 6) throw new Error('L23 must be 4 trays / 6 bags');
    if (
        b.peekBag(0) !== 'meat'
        || b.peekBag(3) !== 'sauce'
        || b.peekBag(5) !== 'sauce'
    ) {
        throw new Error('L23 tops must expose meat and sauce');
    }
    const counts: Record<string, number> = {};
    for (const x of LEVEL_23.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (counts.milk !== 3 || counts.veg !== 3 || counts.meat !== 3 || counts.sauce !== 3) {
        throw new Error('L23 counts must be milk3/veg3/meat3/sauce3');
    }
    if (counts.coconut) throw new Error('L23 must not use coconut (mutex with sauce)');
    const audit = auditVisibleInformation(LEVEL_23);
    if (!audit.passes) throw new Error(`L23 audit failed: ${audit.failures.join(',')}`);

    const bounce = BoardState.fromLevel(LEVEL_23);
    bounce.placeFromBag(0);
    const bad = bounce.placeFromBag(3);
    if (bad.ok || bad.reason !== 'wrong_kind') throw new Error('L23 sauce must bounce on meat tray');

    const play = BoardState.fromLevel(LEVEL_23);
    run(play, [
        { bag: 0 }, { bag: 1 }, { bag: 2 },
        { tray: 1, bag: 3 }, { bag: 4 }, { bag: 5 },
        { tray: 2, bag: 5 }, { bag: 5 }, { bag: 5 },
        { tray: 3, bag: 5 }, { bag: 5 }, { bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 12) throw new Error('L23 must win in 12');
    const kinds = play.trays.map((t) => t.kind).sort().join(',');
    if (kinds !== 'meat,milk,sauce,veg') throw new Error(`L23 kinds ${kinds}`);
    if (LEVEL_23.loseable !== true) throw new Error('L23 loseable');
    console.log('L23 OK', audit.variantCount);
}

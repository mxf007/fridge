import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 28 关：椰子登场。四格均 cap3；奶/菜/肉/椰 各 3。不与酱同关。
 */
export const LEVEL_28: LevelDef = {
    id: 28,
    title: '椰子登场',
    teach: '椰子新色。四种各开一格，不要和酱搞混',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['coconut'],
        ['coconut'],
        ['coconut'],
        ['milk'],
        ['milk'],
        ['meat', 'meat', 'meat', 'veg', 'veg', 'veg', 'milk'],
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
    const b = BoardState.fromLevel(LEVEL_28);
    if (!b.bufferEnabled) throw new Error('L28 bufferEnabled');
    if (b.trays.length !== 4 || !b.trays.every((t) => t.cap === 3)) throw new Error('L28 caps');
    const counts: Record<string, number> = {};
    for (const x of LEVEL_28.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (counts.milk !== 3 || counts.veg !== 3 || counts.meat !== 3 || counts.coconut !== 3) {
        throw new Error('L28 counts');
    }
    if (counts.sauce) throw new Error('L28 no sauce with coconut');
    const audit = auditVisibleInformation(LEVEL_28);
    if (!audit.passes) throw new Error(`L28 audit failed: ${audit.failures.join(',')}`);

    const bounce = BoardState.fromLevel(LEVEL_28);
    bounce.placeFromBag(0);
    const bad = bounce.placeFromBag(3);
    if (bad.ok || bad.reason !== 'wrong_kind') throw new Error('L28 milk bounce on coconut');

    const play = BoardState.fromLevel(LEVEL_28);
    run(play, [
        { bag: 0 }, { bag: 1 }, { bag: 2 },
        { tray: 1, bag: 3 }, { bag: 4 }, { bag: 5 },
        { tray: 2, bag: 5 }, { bag: 5 }, { bag: 5 },
        { tray: 3, bag: 5 }, { bag: 5 }, { bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 12) throw new Error('L28 must win in 12');
    const kinds = play.trays.map((t) => t.kind).sort().join(',');
    if (kinds !== 'coconut,meat,milk,veg') throw new Error(`L28 kinds ${kinds}`);
    if (LEVEL_28.loseable !== true) throw new Error('L28 loseable');
    console.log('L28 OK', audit.variantCount);
}

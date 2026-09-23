import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 24 关：柜台压力。caps 2,3,3,4；奶4+菜3+肉3+猕2。
 * 猕猴桃必须进 cap2；奶占小格则猕猴桃只能堆柜台致失败。
 */
export const LEVEL_24: LevelDef = {
    id: 24,
    title: '柜台要腾空',
    teach: '猕猴桃进小格；柜台翻层别堆满',
    trays: [{ cap: 2 }, { cap: 3 }, { cap: 3 }, { cap: 4 }],
    bags: [
        ['kiwi'],
        ['kiwi'],
        ['milk'],
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
        else throw new Error(`L24 script ${i} missing place`);
        if (!r.ok) throw new Error(`L24 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel24(): void {
    assertLevel(LEVEL_24);
    if (LEVEL_24.trays.map((t) => t.cap).join(',') !== '2,3,3,4') throw new Error('L24 caps');
    const counts: Record<string, number> = {};
    for (const x of LEVEL_24.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (counts.milk !== 4 || counts.veg !== 3 || counts.meat !== 3 || counts.kiwi !== 2) {
        throw new Error('L24 counts');
    }
    const audit = auditVisibleInformation(LEVEL_24);
    if (!audit.passes) throw new Error(`L24 audit failed: ${audit.failures.join(',')}`);

    const bounce = BoardState.fromLevel(LEVEL_24);
    bounce.placeFromBag(0);
    const bad = bounce.placeFromBag(2);
    if (bad.ok || bad.reason !== 'wrong_kind') throw new Error('L24 milk bounce on kiwi');

    const play = BoardState.fromLevel(LEVEL_24);
    run(play, [
        { bag: 0 },
        { bag: 1 },
        { tray: 3, bag: 2 },
        { bag: 3 },
        { bag: 4 },
        { bag: 5 },
        { tray: 1, bag: 5 },
        { bag: 5 },
        { bag: 5 },
        { tray: 2, bag: 5 },
        { bag: 5 },
        { bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 12) throw new Error('L24 must win in 12');
    if (play.trays[0].kind !== 'kiwi' || play.trays[3].kind !== 'milk') {
        throw new Error('L24 kiwi/milk slots');
    }

    // 浪费：奶占 cap2，猕猴桃只能进柜台；收完其余后 locked_out / buffer_full
    const fail = BoardState.fromLevel(LEVEL_24);
    fail.placeFromBag(2);
    fail.placeFromBag(3);
    if (fail.trays[0].kind !== 'milk' || !fail.trays[0].sealed) throw new Error('L24 waste milk seal cap2');
    fail.selectTray(3);
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
    fail.placeFromBag(0);
    fail.selectBuffer(1);
    fail.placeFromBag(1);
    if (fail.isWin() || fail.failReason() == null) throw new Error('L24 waste must fail');
    if (fail.failReason() !== 'locked_out' && fail.failReason() !== 'buffer_full') {
        throw new Error(`L24 unexpected fail ${fail.failReason()}`);
    }
    if (LEVEL_24.loseable !== true) throw new Error('L24 loseable');
    console.log('L24 OK', audit.variantCount, fail.failReason());
}

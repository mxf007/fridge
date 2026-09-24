import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 25 关：西瓜 Boss。混容量 4,4,2,4,2；西4+奶4+肉4+菜2+柠2。
 */
export const LEVEL_25: LevelDef = {
    id: 25,
    title: '西瓜要整格',
    teach: '西瓜四件一整格；柠檬和少量菜进小格',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 2 }, { cap: 4 }, { cap: 2 }],
    bags: [
        ['watermelon'],
        ['watermelon'],
        ['watermelon'],
        ['watermelon'],
        ['lemon'],
        ['meat', 'meat', 'meat', 'meat', 'milk', 'milk', 'milk', 'milk', 'veg', 'veg', 'lemon'],
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
        else throw new Error(`L25 script ${i} missing place`);
        if (!r.ok) throw new Error(`L25 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel25(): void {
    assertLevel(LEVEL_25);
    const b = BoardState.fromLevel(LEVEL_25);
    if (!b.bufferEnabled) throw new Error('L25 bufferEnabled');
    if (b.trays.map((t) => t.cap).join(',') !== '4,4,2,4,2') throw new Error('L25 caps');
    const counts: Record<string, number> = {};
    for (const x of LEVEL_25.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (
        counts.milk !== 4
        || counts.veg !== 2
        || counts.meat !== 4
        || counts.watermelon !== 4
        || counts.lemon !== 2
    ) {
        throw new Error('L25 counts');
    }
    const audit = auditVisibleInformation(LEVEL_25);
    if (!audit.passes) throw new Error(`L25 audit failed: ${audit.failures.join(',')}`);
    if (audit.initialSafeActionCount <= 0) throw new Error('L25 need safe open');

    const bounce = BoardState.fromLevel(LEVEL_25);
    bounce.placeFromBag(0);
    const bad = bounce.placeFromBag(4);
    if (bad.ok || bad.reason !== 'wrong_kind') throw new Error('L25 lemon bounce on watermelon');

    const play = BoardState.fromLevel(LEVEL_25);
    run(play, [
        { bag: 0 }, { bag: 1 }, { bag: 2 }, { bag: 3 },
        { tray: 2, bag: 4 }, { bag: 5 },
        { tray: 4, bag: 5 }, { bag: 5 },
        { tray: 1, bag: 5 }, { bag: 5 }, { bag: 5 }, { bag: 5 },
        { tray: 3, bag: 5 }, { bag: 5 }, { bag: 5 }, { bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 16) throw new Error('L25 must win in 16');
    if (play.trays[0].kind !== 'watermelon') throw new Error('L25 watermelon tray');

    const fail = BoardState.fromLevel(LEVEL_25);
    fail.selectTray(1);
    fail.placeFromBag(4);
    fail.placeFromBag(5);
    if (fail.trays[1].kind !== 'lemon' || fail.trays[1].items.length !== 2 || fail.trays[1].sealed) {
        throw new Error('L25 waste lemon must occupy cap4 without sealing');
    }
    fail.selectTray(0);
    fail.placeFromBag(0);
    fail.placeFromBag(1);
    fail.placeFromBag(2);
    fail.placeFromBag(3);
    fail.selectTray(2);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.selectTray(3);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.selectTray(4);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.selectBuffer(0);
    fail.placeFromBag(5);
    fail.selectBuffer(1);
    fail.placeFromBag(5);
    if (fail.isWin() || fail.failReason() == null) throw new Error('L25 waste must fail');
    if (fail.failReason() !== 'locked_out') throw new Error(`L25 waste ${fail.failReason()}`);
    if (LEVEL_25.loseable !== true) throw new Error('L25 loseable');
    console.log('L25 OK', audit.variantCount);
}

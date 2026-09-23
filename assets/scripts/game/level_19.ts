import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 19 关：柠檬登场。混容量 3,3,2,4；奶3+菜3+肉4+柠2。
 * 教学：两件柠檬（顶层可见）必须进 cap2；默认最左 cap3，柠进大格会锁死。
 * 6 列：柠/奶浅露，深栈只收菜+肉，压低隐藏排列。
 */
export const LEVEL_19: LevelDef = {
    id: 19,
    title: '柠檬进小格',
    teach: '两件柠檬只能进容量 2 的格；进大格会锁死',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 2 }, { cap: 4 }],
    bags: [
        ['lemon'],
        ['lemon'],
        ['milk'],
        ['milk'],
        ['milk'],
        ['meat', 'meat', 'meat', 'meat', 'veg', 'veg', 'veg'],
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
        else throw new Error(`L19 script ${i} missing place`);
        if (!r.ok) throw new Error(`L19 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel19(): void {
    assertLevel(LEVEL_19);
    const b = BoardState.fromLevel(LEVEL_19);
    if (!b.bufferEnabled) throw new Error('L19 bufferEnabled must be true');
    if (b.trays.map((t) => t.cap).join(',') !== '3,3,2,4') throw new Error('L19 caps must be 3,3,2,4');
    if (b.bags.length !== 6) throw new Error('L19 must have 6 bag columns');
    if (
        b.peekBag(0) !== 'lemon'
        || b.peekBag(1) !== 'lemon'
        || b.peekBag(2) !== 'milk'
        || b.peekBag(3) !== 'milk'
        || b.peekBag(4) !== 'milk'
        || b.peekBag(5) !== 'veg'
    ) {
        throw new Error('L19 tops must be lemon×2 / milk×3 / veg');
    }
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L19 default dest must be leftmost tray');
    }
    if (b.trays[0].cap !== 3) throw new Error('L19 leftmost tray must be cap3 temptation');
    if (b.trays[2].cap !== 2) throw new Error('L19 tray 2 must be the lemon slot');

    const counts: Record<string, number> = {};
    const items = LEVEL_19.bags.flat();
    for (let i = 0; i < items.length; i++) counts[items[i]] = (counts[items[i]] || 0) + 1;
    if (counts.milk !== 3 || counts.veg !== 3 || counts.meat !== 4 || counts.lemon !== 2) {
        throw new Error('L19 counts must be milk3 / veg3 / meat4 / lemon2');
    }
    if (counts.grape || counts.fruit) throw new Error('L19 must not use grape or apple fruit');

    const audit = auditVisibleInformation(LEVEL_19);
    if (!audit.passes) {
        throw new Error(`L19 visible audit failed: ${audit.failures.join(',')}`);
    }
    if (audit.maxBufferNeeded != null && audit.maxBufferNeeded > 3) {
        throw new Error(`L19 maxBufferNeeded ${audit.maxBufferNeeded} exceeds 3`);
    }
    if (audit.initialSafeActionCount <= 0) {
        throw new Error('L19 must have at least one safe visible opening move');
    }

    // 安全通关：柠→cap2，奶→左 cap3，菜→中 cap3，肉→cap4
    const play = BoardState.fromLevel(LEVEL_19);
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
        { bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 12) throw new Error('L19 safe path must win in 12 steps');
    if (play.trays[2].kind !== 'lemon' || play.trays[3].kind !== 'meat') {
        throw new Error('L19 safe path must put lemon in cap2 and meat in cap4');
    }
    if (play.trays[0].kind !== 'milk' || play.trays[1].kind !== 'veg') {
        throw new Error('L19 safe path must put milk/veg in the two cap3 trays');
    }
    console.log('L19 minBufferUsed', 0);
    console.log('L19 audit variants', audit.variantCount, 'safe', audit.initialSafeActionCount);

    // 锁错：柠进最左 cap3 → 青菜 3 装不进剩余格 → locked_out
    const fail = BoardState.fromLevel(LEVEL_19);
    const waste1 = fail.placeFromBag(0);
    if (!waste1.ok || waste1.item !== 'lemon' || fail.trays[0].kind !== 'lemon') {
        throw new Error('L19 waste path must put first lemon into leftmost tray');
    }
    const waste2 = fail.placeFromBag(1);
    if (!waste2.ok || waste2.item !== 'lemon' || fail.trays[0].items.length !== 2) {
        throw new Error('L19 waste path must anti-split second lemon into same tray');
    }
    if (fail.trays[0].sealed) throw new Error('L19 lemon must not seal a cap3 tray');

    fail.selectTray(1);
    fail.placeFromBag(2);
    fail.placeFromBag(3);
    fail.placeFromBag(4);
    if (!fail.trays[1].sealed || fail.trays[1].kind !== 'milk') {
        throw new Error('L19 waste path must seal milk in tray 1');
    }
    fail.selectTray(2);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    if (!fail.trays[2].sealed || fail.trays[2].kind !== 'veg') {
        throw new Error('L19 waste path must seal two veg in cap2');
    }
    fail.selectBuffer(0);
    const park = fail.placeFromBag(5);
    if (!park.ok || park.item !== 'veg' || fail.buffer[0] !== 'veg') {
        throw new Error('L19 waste path must park leftover veg on buffer');
    }
    fail.selectTray(3);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    fail.placeFromBag(5);
    if (!fail.trays[3].sealed || fail.trays[3].kind !== 'meat') {
        throw new Error('L19 waste path must seal meat in tray 3');
    }
    if (fail.isWin() || fail.failReason() == null) {
        throw new Error('L19 waste path must become unsolvable');
    }
    if (fail.failReason() !== 'locked_out') {
        throw new Error(`L19 waste path failReason must be locked_out, got ${fail.failReason()}`);
    }
    if (fail.level.loseable !== true) throw new Error('L19 loseable must be true');
}

import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 22 关：菠萝进大格。caps 4,4,2,2；奶4+菠4+菜2+葡2。
 * 大格在左（默认诱惑）。菠萝进小格 / 葡萄进大格都会锁死。
 */
export const LEVEL_22: LevelDef = {
    id: 22,
    title: '菠萝进大格',
    teach: '菠萝四件必须进大格；葡萄两件进小格',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 2 }, { cap: 2 }],
    bags: [
        ['milk', 'milk', 'grape'],
        ['milk', 'milk', 'pineapple'],
        ['veg', 'pineapple', 'pineapple'],
        ['veg', 'pineapple', 'grape'],
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
        else throw new Error(`L22 script ${i} missing place`);
        if (!r.ok) throw new Error(`L22 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel22(): void {
    assertLevel(LEVEL_22);
    const b = BoardState.fromLevel(LEVEL_22);
    if (!b.bufferEnabled) throw new Error('L22 bufferEnabled must be true');
    if (b.trays.map((t) => t.cap).join(',') !== '4,4,2,2') throw new Error('L22 caps must be 4,4,2,2');
    if (b.bags.length !== 4 || b.bags[0].length !== 3) throw new Error('L22 must be 4×3 bags');
    if (
        b.peekBag(0) !== 'grape'
        || b.peekBag(1) !== 'pineapple'
        || b.peekBag(2) !== 'pineapple'
        || b.peekBag(3) !== 'grape'
    ) {
        throw new Error('L22 tops must be grape / pineapple / pineapple / grape');
    }
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L22 default dest must be leftmost large tray');
    }
    if (b.trays[0].cap !== 4) throw new Error('L22 leftmost tray must be large');

    const counts: Record<string, number> = {};
    const items = LEVEL_22.bags.flat();
    for (let i = 0; i < items.length; i++) counts[items[i]] = (counts[items[i]] || 0) + 1;
    if (counts.milk !== 4 || counts.pineapple !== 4 || counts.veg !== 2 || counts.grape !== 2) {
        throw new Error('L22 counts must be milk4 / pineapple4 / veg2 / grape2');
    }
    if (counts.lemon) throw new Error('L22 must not use lemon (mutex with pineapple)');
    if (counts.leftover) throw new Error('L22 must not use leftover (mutex with grape)');

    const audit = auditVisibleInformation(LEVEL_22);
    if (!audit.passes) {
        throw new Error(`L22 visible audit failed: ${audit.failures.join(',')}`);
    }
    if (audit.maxBufferNeeded != null && audit.maxBufferNeeded > 3) {
        throw new Error(`L22 maxBufferNeeded ${audit.maxBufferNeeded} exceeds 3`);
    }
    if (audit.initialSafeActionCount <= 0) {
        throw new Error('L22 must have at least one safe visible opening move');
    }

    // 安全：葡→小格，菠→左大格，奶→右大格，菜→另一小格
    const play = BoardState.fromLevel(LEVEL_22);
    run(play, [
        { tray: 2, bag: 0 },
        { bag: 3 },
        { tray: 0, bag: 1 },
        { bag: 2 },
        { bag: 2 },
        { bag: 3 },
        { tray: 1, bag: 0 },
        { bag: 0 },
        { bag: 1 },
        { bag: 1 },
        { tray: 3, bag: 2 },
        { bag: 3 },
    ]);
    if (!play.isWin() || play.steps !== 12) throw new Error('L22 safe path must win in 12 steps');
    if (play.trays[0].kind !== 'pineapple' || play.trays[1].kind !== 'milk') {
        throw new Error('L22 safe path must put pineapple and milk in large trays');
    }
    if (play.trays[2].kind !== 'grape' || play.trays[3].kind !== 'veg') {
        throw new Error('L22 safe path must put grape and veg in small trays');
    }
    console.log('L22 minBufferUsed', 0);
    console.log('L22 audit variants', audit.variantCount, 'safe', audit.initialSafeActionCount);

    // 锁错：葡萄进最左大格 → 容量凑不出 → locked_out
    const fail = BoardState.fromLevel(LEVEL_22);
    const waste1 = fail.placeFromBag(0);
    if (!waste1.ok || waste1.item !== 'grape' || fail.trays[0].kind !== 'grape') {
        throw new Error('L22 waste path must put first grape into leftmost large tray');
    }
    const waste2 = fail.placeFromBag(3);
    if (!waste2.ok || waste2.item !== 'grape' || fail.trays[0].items.length !== 2) {
        throw new Error('L22 waste path must anti-split second grape into same tray');
    }
    if (fail.trays[0].sealed) throw new Error('L22 grape must not seal a cap4 tray');

    fail.selectTray(1);
    fail.placeFromBag(1);
    fail.placeFromBag(2);
    fail.placeFromBag(2);
    fail.placeFromBag(3);
    if (!fail.trays[1].sealed || fail.trays[1].kind !== 'pineapple') {
        throw new Error('L22 waste path must seal pineapple in tray 1');
    }
    fail.selectTray(2);
    fail.placeFromBag(0);
    fail.placeFromBag(0);
    if (!fail.trays[2].sealed || fail.trays[2].kind !== 'milk') {
        throw new Error('L22 waste path must seal two milk in cap2');
    }
    fail.selectTray(3);
    fail.placeFromBag(2);
    fail.placeFromBag(3);
    if (!fail.trays[3].sealed || fail.trays[3].kind !== 'veg') {
        throw new Error('L22 waste path must seal veg in tray 3');
    }
    fail.selectBuffer(0);
    fail.placeFromBag(1);
    fail.selectBuffer(1);
    fail.placeFromBag(1);
    if (fail.isWin() || fail.failReason() == null) {
        throw new Error('L22 waste path must become unsolvable');
    }
    if (fail.failReason() !== 'locked_out') {
        throw new Error(`L22 waste failReason must be locked_out, got ${fail.failReason()}`);
    }
    if (fail.level.loseable !== true) throw new Error('L22 loseable must be true');
}

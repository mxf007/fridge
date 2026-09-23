import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 20 关：猕猴桃登场 + 五色阶段考。
 * 五格均 cap3；奶/菜/肉/酱/猕 各 3。
 * 6 列浅露猕猴桃/牛奶 + 深栈收菜肉酱，压隐藏排列以过可见审计。
 */
export const LEVEL_20: LevelDef = {
    id: 20,
    title: '五色猕猴桃',
    teach: '猕猴桃登场。五种都要换格，一种一格',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['kiwi'],
        ['kiwi'],
        ['milk'],
        ['milk'],
        ['milk'],
        ['veg', 'veg', 'veg', 'meat', 'meat', 'meat', 'sauce', 'sauce', 'sauce', 'kiwi'],
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
        else throw new Error(`L20 script ${i} missing place`);
        if (!r.ok) throw new Error(`L20 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel20(): void {
    assertLevel(LEVEL_20);
    const b = BoardState.fromLevel(LEVEL_20);
    if (!b.bufferEnabled) throw new Error('L20 bufferEnabled must be true');
    if (b.trays.length !== 5) throw new Error('L20 must have 5 trays');
    for (let i = 0; i < b.trays.length; i++) {
        if (b.trays[i].cap !== 3) throw new Error('L20 trays must be cap 3');
    }
    if (b.bags.length !== 6) throw new Error('L20 must have 6 bag columns');
    if (
        b.peekBag(0) !== 'kiwi'
        || b.peekBag(1) !== 'kiwi'
        || b.peekBag(2) !== 'milk'
        || b.peekBag(3) !== 'milk'
        || b.peekBag(4) !== 'milk'
        || b.peekBag(5) !== 'kiwi'
    ) {
        throw new Error('L20 tops must be kiwi×2 / milk×3 / kiwi');
    }

    const counts: Record<string, number> = {};
    const items = LEVEL_20.bags.flat();
    for (let i = 0; i < items.length; i++) counts[items[i]] = (counts[items[i]] || 0) + 1;
    if (
        counts.milk !== 3
        || counts.veg !== 3
        || counts.meat !== 3
        || counts.sauce !== 3
        || counts.kiwi !== 3
    ) {
        throw new Error('L20 counts must be milk3 / veg3 / meat3 / sauce3 / kiwi3');
    }
    if (counts.lemon || counts.grape || counts.fruit) {
        throw new Error('L20 must not use lemon / grape / apple');
    }

    const audit = auditVisibleInformation(LEVEL_20);
    if (!audit.passes) {
        throw new Error(`L20 visible audit failed: ${audit.failures.join(',')}`);
    }
    if (audit.maxBufferNeeded != null && audit.maxBufferNeeded > 3) {
        throw new Error(`L20 maxBufferNeeded ${audit.maxBufferNeeded} exceeds 3`);
    }
    if (audit.initialSafeActionCount <= 0) {
        throw new Error('L20 must have at least one safe visible opening move');
    }

    // 锁错弹回：默认格收了猕猴桃后，牛奶不能进
    const bounce = BoardState.fromLevel(LEVEL_20);
    const first = bounce.placeFromBag(0);
    if (!first.ok || first.item !== 'kiwi') throw new Error('L20 first kiwi must place');
    const bad = bounce.placeFromBag(2);
    if (bad.ok || bad.reason !== 'wrong_kind') {
        throw new Error('L20 milk must bounce while tray 0 is kiwi');
    }
    if (bad.hintTrays.indexOf(1) < 0) throw new Error('L20 bounce must hint an empty tray');

    // 安全通关：猕/奶/菜/肉/酱各一格
    const play = BoardState.fromLevel(LEVEL_20);
    run(play, [
        { bag: 0 },
        { bag: 1 },
        { bag: 5 },
        { tray: 1, bag: 2 },
        { bag: 3 },
        { bag: 4 },
        { tray: 2, bag: 5 },
        { bag: 5 },
        { bag: 5 },
        { tray: 3, bag: 5 },
        { bag: 5 },
        { bag: 5 },
        { tray: 4, bag: 5 },
        { bag: 5 },
        { bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 15) throw new Error('L20 safe path must win in 15 steps');
    const kinds = play.trays.map((t) => t.kind).sort().join(',');
    if (kinds !== 'kiwi,meat,milk,sauce,veg') {
        throw new Error(`L20 must lock five kinds, got ${kinds}`);
    }
    if (play.dest && play.dest.kind === 'buffer') throw new Error('L20 win must not keep buffer dest');
    console.log('L20 minBufferUsed', 0);
    console.log('L20 audit variants', audit.variantCount, 'safe', audit.initialSafeActionCount);

    if (LEVEL_20.loseable !== true) throw new Error('L20 loseable must be true');
}

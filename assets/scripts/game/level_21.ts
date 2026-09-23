import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 21 关：剩菜首战（第 6 色）。
 * 四格均 cap3；奶/菜/肉/剩 各 3。不与葡萄同关。
 * 浅露剩菜 + 深栈收奶菜肉，压隐藏排列。
 */
export const LEVEL_21: LevelDef = {
    id: 21,
    title: '剩菜也要收',
    teach: '剩菜登场。四种各开一格，不要和葡萄搞混',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['leftover'],
        ['leftover'],
        ['leftover'],
        ['milk'],
        ['milk'],
        ['milk', 'veg', 'veg', 'veg', 'meat', 'meat', 'meat'],
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
    if (!b.bufferEnabled) throw new Error('L21 bufferEnabled must be true');
    if (b.trays.length !== 4) throw new Error('L21 must have 4 trays');
    for (let i = 0; i < b.trays.length; i++) {
        if (b.trays[i].cap !== 3) throw new Error('L21 trays must be cap 3');
    }
    if (b.bags.length !== 6) throw new Error('L21 must have 6 bag columns');
    if (
        b.peekBag(0) !== 'leftover'
        || b.peekBag(1) !== 'leftover'
        || b.peekBag(2) !== 'leftover'
        || b.peekBag(3) !== 'milk'
        || b.peekBag(4) !== 'milk'
        || b.peekBag(5) !== 'meat'
    ) {
        throw new Error('L21 tops must be leftover×3 / milk×2 / meat');
    }

    const counts: Record<string, number> = {};
    const items = LEVEL_21.bags.flat();
    for (let i = 0; i < items.length; i++) counts[items[i]] = (counts[items[i]] || 0) + 1;
    if (counts.milk !== 3 || counts.veg !== 3 || counts.meat !== 3 || counts.leftover !== 3) {
        throw new Error('L21 counts must be milk3 / veg3 / meat3 / leftover3');
    }
    if (counts.grape) throw new Error('L21 must not use grape (mutex with leftover)');
    if (counts.lemon || counts.kiwi || counts.fruit || counts.sauce) {
        throw new Error('L21 must be milk/veg/meat/leftover only');
    }

    const audit = auditVisibleInformation(LEVEL_21);
    if (!audit.passes) {
        throw new Error(`L21 visible audit failed: ${audit.failures.join(',')}`);
    }
    if (audit.maxBufferNeeded != null && audit.maxBufferNeeded > 3) {
        throw new Error(`L21 maxBufferNeeded ${audit.maxBufferNeeded} exceeds 3`);
    }
    if (audit.initialSafeActionCount <= 0) {
        throw new Error('L21 must have at least one safe visible opening move');
    }

    // 锁错弹回：默认格收了剩菜后，牛奶不能进
    const bounce = BoardState.fromLevel(LEVEL_21);
    const first = bounce.placeFromBag(0);
    if (!first.ok || first.item !== 'leftover') throw new Error('L21 first leftover must place');
    const bad = bounce.placeFromBag(3);
    if (bad.ok || bad.reason !== 'wrong_kind') {
        throw new Error('L21 milk must bounce while tray 0 is leftover');
    }
    if (bad.hintTrays.indexOf(1) < 0) throw new Error('L21 bounce must hint an empty tray');

    // 安全通关：剩/奶/肉/菜各一格
    const play = BoardState.fromLevel(LEVEL_21);
    run(play, [
        { bag: 0 },
        { bag: 1 },
        { bag: 2 },
        { tray: 1, bag: 3 },
        { bag: 4 },
        { tray: 2, bag: 5 },
        { bag: 5 },
        { bag: 5 },
        { tray: 3, bag: 5 },
        { bag: 5 },
        { bag: 5 },
        { tray: 1, bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 12) throw new Error('L21 safe path must win in 12 steps');
    const kinds = play.trays.map((t) => t.kind).sort().join(',');
    if (kinds !== 'leftover,meat,milk,veg') {
        throw new Error(`L21 must lock four kinds, got ${kinds}`);
    }
    if (play.dest && play.dest.kind === 'buffer') throw new Error('L21 win must not keep buffer dest');
    console.log('L21 minBufferUsed', 0);
    console.log('L21 audit variants', audit.variantCount, 'safe', audit.initialSafeActionCount);

    if (LEVEL_21.loseable !== true) throw new Error('L21 loseable must be true');
}

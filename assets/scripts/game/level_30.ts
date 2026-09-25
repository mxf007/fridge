import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/**
 * 第 30 关：决赛。六格混容量 2,3,3,4,4,4；葡2+奶3+菜3+肉4+菠4+西4。
 * 五列都是 4 层。葡萄两件在栈顶，必须进容量 2。
 * 牛奶、青菜埋在葡萄下面。肉和西瓜各有一列看起来是 4 件，最底下却是对方的一件。
 * 不用柠檬：柠檬与菠萝互斥。
 */
export const LEVEL_30: LevelDef = {
    id: 30,
    title: '决赛冰箱',
    teach: '葡萄两件进小格；肉和西瓜那列要翻到底再决定进哪一格',
    trays: [{ cap: 2 }, { cap: 3 }, { cap: 3 }, { cap: 4 }, { cap: 4 }, { cap: 4 }],
    bags: [
        ['milk', 'milk', 'milk', 'grape'],
        ['veg', 'veg', 'veg', 'grape'],
        ['watermelon', 'meat', 'meat', 'meat'],
        ['pineapple', 'pineapple', 'pineapple', 'pineapple'],
        ['meat', 'watermelon', 'watermelon', 'watermelon'],
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
        else throw new Error(`L30 script ${i} missing place`);
        if (!r.ok) throw new Error(`L30 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel30(): void {
    assertLevel(LEVEL_30);
    const b = BoardState.fromLevel(LEVEL_30);
    if (!b.bufferEnabled) throw new Error('L30 bufferEnabled');
    if (b.trays.map((t) => t.cap).join(',') !== '2,3,3,4,4,4') throw new Error('L30 caps');
    if (b.bags.length !== 5) throw new Error('L30 columns');
    if (b.bags.some((col) => col.length !== 4)) throw new Error('L30 depth');
    const tops = b.bags.map((col) => col[col.length - 1]);
    if (tops.filter((k) => k === 'grape').length !== 2) throw new Error('L30 grape tops');
    if (tops.indexOf('milk') >= 0 || tops.indexOf('veg') >= 0) throw new Error('L30 milk veg buried');
    const counts: Record<string, number> = {};
    for (const x of LEVEL_30.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (
        counts.milk !== 3
        || counts.veg !== 3
        || counts.meat !== 4
        || counts.pineapple !== 4
        || counts.watermelon !== 4
        || counts.grape !== 2
    ) {
        throw new Error('L30 counts');
    }
    if (counts.lemon || counts.coconut || counts.sauce) throw new Error('L30 finale food set');

    // 埋件有 15 个、五种都有。全排列审计会打乱「肉列底是西瓜」这个顺序，并且超过预算。
    // 这一关的策略就在固定叠放上，所以只验收开局安全步、通关脚本和锁死脚本。
    const open = BoardState.fromLevel(LEVEL_30);
    open.selectTray(0);
    const grape = open.placeFromBag(0);
    if (!grape.ok || grape.item !== 'grape') throw new Error('L30 grape into cap2 must be safe');

    const bounce = BoardState.fromLevel(LEVEL_30);
    bounce.selectTray(0);
    bounce.placeFromBag(0);
    const bad = bounce.placeFromBag(2);
    if (bad.ok || bad.reason !== 'wrong_kind') throw new Error('L30 meat bounce on grape tray');

    const play = BoardState.fromLevel(LEVEL_30);
    run(play, [
        { tray: 0, bag: 0 }, { bag: 1 },
        { tray: 1, bag: 0 }, { bag: 0 }, { bag: 0 },
        { tray: 2, bag: 1 }, { bag: 1 }, { bag: 1 },
        { tray: 3, bag: 2 }, { bag: 2 }, { bag: 2 },
        { tray: 4, bag: 4 }, { bag: 4 }, { bag: 4 },
        { tray: 3, bag: 4 },
        { tray: 4, bag: 2 },
        { tray: 5, bag: 3 }, { bag: 3 }, { bag: 3 }, { bag: 3 },
    ]);
    if (!play.isWin() || play.steps !== 20) throw new Error(`L30 must win in 20, got ${play.steps} win=${play.isWin()}`);
    const kinds = play.trays.map((t) => t.kind).sort().join(',');
    if (kinds !== 'grape,meat,milk,pineapple,veg,watermelon') throw new Error(`L30 kinds ${kinds}`);

    const fail = BoardState.fromLevel(LEVEL_30);
    fail.selectTray(3);
    const g1 = fail.placeFromBag(0);
    const g2 = fail.placeFromBag(1);
    if (!g1.ok || !g2.ok || fail.trays[3].kind !== 'grape' || fail.trays[3].sealed) {
        throw new Error('L30 waste grape must sit in cap4');
    }
    fail.selectTray(1);
    fail.placeFromBag(0);
    fail.placeFromBag(0);
    fail.placeFromBag(0);
    fail.selectTray(2);
    fail.placeFromBag(1);
    fail.placeFromBag(1);
    fail.placeFromBag(1);
    fail.selectTray(4);
    fail.placeFromBag(2);
    fail.placeFromBag(2);
    fail.placeFromBag(2);
    fail.selectTray(5);
    fail.placeFromBag(3);
    fail.placeFromBag(3);
    fail.placeFromBag(3);
    fail.placeFromBag(3);
    fail.selectTray(0);
    if (!fail.placeFromBag(4).ok || !fail.placeFromBag(4).ok) throw new Error('L30 waste cap2 watermelon');
    fail.selectBuffer(0);
    const parkWm = fail.placeFromBag(4);
    if (!parkWm.ok || parkWm.item !== 'watermelon') throw new Error('L30 waste parks watermelon');
    fail.selectTray(4);
    const lastMeat = fail.placeFromBag(4);
    if (!lastMeat.ok || lastMeat.item !== 'meat' || !fail.trays[4].sealed) throw new Error('L30 waste meat seals');
    fail.selectBuffer(1);
    const parkWm2 = fail.placeFromBag(2);
    if (!parkWm2.ok || parkWm2.item !== 'watermelon') throw new Error('L30 waste parks second watermelon');
    if (fail.isWin() || fail.failReason() == null) throw new Error('L30 waste must fail');
    if (fail.failReason() !== 'locked_out') throw new Error(`L30 waste ${fail.failReason()}`);
    if (LEVEL_30.loseable !== true) throw new Error('L30 loseable');
    console.log('L30 OK');
}

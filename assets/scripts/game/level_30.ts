import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 30 关：决赛冰箱。五格均 cap4；奶/菜/肉/菠/西 各 4。
 * 浅露西/菠/奶 + 深栈菜肉，压隐藏排列以过可见审计。
 * 通关触发 30/30 里程碑卡；胜利卡「分享步数」强提示（与 25 同档）。
 */
export const LEVEL_30: LevelDef = {
    id: 30,
    title: '决赛冰箱',
    teach: '五种各一整格；菠萝西瓜都要满四件',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 4 }],
    bags: [
        ['watermelon'],
        ['watermelon'],
        ['watermelon'],
        ['watermelon'],
        ['pineapple'],
        ['pineapple'],
        ['pineapple'],
        ['pineapple'],
        ['milk'],
        ['milk'],
        ['milk'],
        ['meat', 'meat', 'meat', 'meat', 'veg', 'veg', 'veg', 'veg', 'milk'],
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
    if (b.trays.length !== 5 || !b.trays.every((t) => t.cap === 4)) throw new Error('L30 caps 4×5');
    if (b.bags.length !== 12) throw new Error('L30 must use shallow+deep bags');
    if (
        b.peekBag(0) !== 'watermelon'
        || b.peekBag(4) !== 'pineapple'
        || b.peekBag(8) !== 'milk'
        || b.peekBag(11) !== 'milk'
    ) {
        throw new Error('L30 tops must expose watermelon / pineapple / milk');
    }
    const counts: Record<string, number> = {};
    for (const x of LEVEL_30.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (
        counts.milk !== 4
        || counts.veg !== 4
        || counts.meat !== 4
        || counts.pineapple !== 4
        || counts.watermelon !== 4
    ) {
        throw new Error('L30 counts milk4/veg4/meat4/pineapple4/watermelon4');
    }
    if (counts.lemon) throw new Error('L30 no lemon with pineapple');
    if (counts.coconut || counts.sauce) {
        throw new Error('L30 finale set is milk/veg/meat/pineapple/watermelon');
    }

    const audit = auditVisibleInformation(LEVEL_30);
    if (!audit.passes) throw new Error(`L30 audit failed: ${audit.failures.join(',')}`);
    if (audit.initialSafeActionCount <= 0) throw new Error('L30 need safe open');

    const bounce = BoardState.fromLevel(LEVEL_30);
    bounce.placeFromBag(0);
    const bad = bounce.placeFromBag(4);
    if (bad.ok || bad.reason !== 'wrong_kind') throw new Error('L30 pineapple bounce on watermelon');

    const play = BoardState.fromLevel(LEVEL_30);
    run(play, [
        { bag: 0 }, { bag: 1 }, { bag: 2 }, { bag: 3 },
        { tray: 1, bag: 4 }, { bag: 5 }, { bag: 6 }, { bag: 7 },
        { tray: 2, bag: 8 }, { bag: 9 }, { bag: 10 }, { bag: 11 },
        { tray: 3, bag: 11 }, { bag: 11 }, { bag: 11 }, { bag: 11 },
        { tray: 4, bag: 11 }, { bag: 11 }, { bag: 11 }, { bag: 11 },
    ]);
    if (!play.isWin() || play.steps !== 20) throw new Error('L30 must win in 20');
    const kinds = play.trays.map((t) => t.kind).sort().join(',');
    if (kinds !== 'meat,milk,pineapple,veg,watermelon') throw new Error(`L30 kinds ${kinds}`);
    if (LEVEL_30.loseable !== true) throw new Error('L30 loseable');
    console.log('L30 OK', audit.variantCount);
}

import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 18 关：大格诱惑。大格在左（默认目标是诱惑）。奶 + 菜 + 葡萄 2。可失败。 */
export const LEVEL_18: LevelDef = {
    id: 18,
    title: '大格留给大摞',
    teach: '大格在左。葡萄进大格会锁死',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 2 }, { cap: 2 }],
    bags: [
        ['veg', 'veg', 'grape'],
        ['veg', 'milk', 'milk'],
        ['veg', 'veg', 'milk'],
        ['veg', 'milk', 'grape'],
    ],
    buffer: 3,
    loseable: true,
};

function run(board: BoardState, script: { tray?: number; buffer?: number; bag: number }[]) {
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) board.selectTray(step.tray);
        if (step.buffer != null) board.selectBuffer(step.buffer);
        const r = board.placeFromBag(step.bag);
        if (!r.ok) throw new Error(`L18 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel18(): void {
    assertLevel(LEVEL_18);
    const b = BoardState.fromLevel(LEVEL_18);
    if (!b.bufferEnabled) throw new Error('L18 bufferEnabled must be true');
    if (b.trays.map((t) => t.cap).join(',') !== '4,4,2,2') throw new Error('L18 caps must be 4,4,2,2');
    if (b.bags.length !== 4 || b.bags[0].length !== 3) throw new Error('L18 must be 4×3 bags');
    if (b.peekBag(0) !== 'grape' || b.peekBag(1) !== 'milk' || b.peekBag(2) !== 'milk' || b.peekBag(3) !== 'grape') {
        throw new Error('L18 tops must be grape / milk / milk / grape');
    }
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L18 default dest must be leftmost large tray');
    }
    if (b.trays[0].cap !== 4) throw new Error('L18 leftmost tray must be large');

    const counts: Record<string, number> = {};
    const items = LEVEL_18.bags.flat();
    for (let i = 0; i < items.length; i++) counts[items[i]] = (counts[items[i]] || 0) + 1;
    if (counts.grape !== 2 || counts.milk !== 4 || counts.veg !== 6) {
        throw new Error('L18 counts must be grape 2 / milk 4 / veg 6');
    }
    if (counts.fruit) throw new Error('L18 must not use apple fruit');

    const play = BoardState.fromLevel(LEVEL_18);
    run(play, [
        { tray: 2, bag: 0 },
        { bag: 3 },
        { bag: 1 },
        { bag: 1 },
        { bag: 2 },
        { bag: 3 },
        { bag: 0 },
        { bag: 0 },
        { bag: 1 },
        { bag: 2 },
        { bag: 2 },
        { bag: 3 },
    ]);
    if (!play.isWin() || play.steps !== 12) throw new Error('L18 safe path must win in 12 steps');
    if (play.trays[2].kind !== 'grape' || play.trays[0].kind !== 'milk' || play.trays[1].kind !== 'veg') {
        throw new Error('L18 safe path must put grape in small and milk in large');
    }
    console.log('L18 minBufferUsed', 0);

    const fail = BoardState.fromLevel(LEVEL_18);
    fail.placeFromBag(0);
    fail.placeFromBag(3);
    if (fail.trays[0].kind !== 'grape' || fail.trays[0].sealed || fail.trays[0].items.length !== 2) {
        throw new Error('L18 waste path must put grape into the large tray');
    }
    const bounce = fail.placeFromBag(1);
    if (bounce.ok || bounce.reason !== 'wrong_kind') {
        throw new Error('L18 milk must bounce after grape occupies the large tray');
    }

    fail.selectTray(1);
    fail.placeFromBag(1);
    fail.placeFromBag(1);
    fail.placeFromBag(2);
    fail.placeFromBag(3);
    fail.selectTray(2);
    fail.placeFromBag(0);
    fail.placeFromBag(0);
    fail.selectTray(3);
    fail.placeFromBag(1);
    fail.placeFromBag(2);
    fail.selectBuffer(0);
    fail.placeFromBag(2);
    fail.selectBuffer(1);
    fail.placeFromBag(3);
    if (fail.isWin() || fail.failReason() == null) {
        throw new Error('L18 waste path must become unsolvable');
    }
    if (fail.level.loseable !== true) throw new Error('L18 loseable must be true');
}

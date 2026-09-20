import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 17 关：混容量。小格在左（默认更安全）。大件必须进大格。可失败。 */
export const LEVEL_17: LevelDef = {
    id: 17,
    title: '大件要进大格',
    teach: '小格在左。大件必须进大格',
    trays: [{ cap: 2 }, { cap: 4 }, { cap: 2 }, { cap: 4 }],
    bags: [
        ['veg', 'veg', 'fruit', 'fruit'],
        ['veg', 'veg', 'milk', 'milk'],
        ['veg', 'veg', 'milk', 'milk'],
    ],
    buffer: 3,
    loseable: true,
};

function run(board: BoardState, script: { tray?: number; bag: number }[]) {
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) board.selectTray(step.tray);
        const r = board.placeFromBag(step.bag);
        if (!r.ok) throw new Error(`L17 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel17(): void {
    assertLevel(LEVEL_17);
    const b = BoardState.fromLevel(LEVEL_17);
    if (!b.bufferEnabled) throw new Error('L17 bufferEnabled must be true');
    if (b.trays.map((t) => t.cap).join(',') !== '2,4,2,4') throw new Error('L17 caps must be 2,4,2,4');
    if (b.bags.length !== 3 || b.bags[0].length !== 4) throw new Error('L17 must be 3×4 bags');
    if (b.peekBag(0) !== 'fruit' || b.peekBag(1) !== 'milk' || b.peekBag(2) !== 'milk') {
        throw new Error('L17 tops must be fruit / milk / milk');
    }
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L17 default dest must be leftmost small tray');
    }
    if (b.trays[0].cap !== 2) throw new Error('L17 leftmost tray must be small');

    const counts: Record<string, number> = {};
    const items = LEVEL_17.bags.flat();
    for (let i = 0; i < items.length; i++) counts[items[i]] = (counts[items[i]] || 0) + 1;
    if (counts.fruit !== 2 || counts.milk !== 4 || counts.veg !== 6) {
        throw new Error('L17 counts must be fruit 2 / milk 4 / veg 6');
    }

    const play = BoardState.fromLevel(LEVEL_17);
    run(play, [
        { bag: 0 },
        { bag: 0 },
        { bag: 1 },
        { bag: 1 },
        { bag: 2 },
        { bag: 2 },
        { bag: 1 },
        { bag: 1 },
        { bag: 0 },
        { bag: 0 },
        { bag: 2 },
        { bag: 2 },
    ]);
    if (!play.isWin() || play.steps !== 12) throw new Error('L17 safe path must win in 12 steps');
    if (play.trays[0].kind !== 'fruit' || play.trays[1].kind !== 'milk') {
        throw new Error('L17 safe path must put fruit in small and milk in large');
    }

    const fail = BoardState.fromLevel(LEVEL_17);
    fail.placeFromBag(1);
    fail.placeFromBag(1);
    if (fail.trays[0].kind !== 'milk' || !fail.trays[0].sealed) {
        throw new Error('L17 waste path must lock milk into the small tray');
    }
    fail.placeFromBag(2);
    fail.placeFromBag(2);
    if (fail.trays[1].kind !== 'milk' || fail.trays[1].items.length !== 2) {
        throw new Error('L17 waste path must split remaining milk into a large tray');
    }
    fail.selectTray(3);
    fail.placeFromBag(0);
    fail.placeFromBag(0);
    fail.selectTray(2);
    fail.placeFromBag(1);
    fail.placeFromBag(1);
    fail.selectBuffer(0);
    fail.placeFromBag(0);
    fail.selectBuffer(1);
    fail.placeFromBag(0);
    fail.selectBuffer(2);
    fail.placeFromBag(2);
    if (fail.isWin() || fail.failReason() == null) {
        throw new Error('L17 waste path must become unsolvable');
    }
    if (fail.level.loseable !== true) throw new Error('L17 loseable must be true');
}

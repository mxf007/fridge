import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 15 关：中间 Boss。四格四列，每列三色，顶层四种散开。柜台开，可不用。过关可晒步数。 */
export const LEVEL_15: LevelDef = {
    id: 15,
    title: '今晚这一层最难',
    teach: '本段最难。过关可晒步数',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['meat', 'fruit', 'veg'],
        ['milk', 'meat', 'fruit'],
        ['veg', 'milk', 'meat'],
        ['fruit', 'veg', 'milk'],
    ],
    buffer: 3,
    loseable: false,
};

function columnKinds(col: string[]): number {
    const set: Record<string, true> = {};
    for (let i = 0; i < col.length; i++) set[col[i]] = true;
    return Object.keys(set).length;
}

export function selfCheckLevel15(): void {
    assertLevel(LEVEL_15);
    const b = BoardState.fromLevel(LEVEL_15);
    if (!b.bufferEnabled) throw new Error('L15 bufferEnabled must be true');
    if (b.trays.length !== 4 || b.bags.length !== 4) throw new Error('L15 must be 4 trays and 4 bags');
    if (b.peekBag(0) !== 'veg' || b.peekBag(1) !== 'fruit' || b.peekBag(2) !== 'meat' || b.peekBag(3) !== 'milk') {
        throw new Error('L15 tops must scatter veg / fruit / meat / milk');
    }
    for (let c = 0; c < LEVEL_15.bags.length; c++) {
        if (columnKinds(LEVEL_15.bags[c]) !== 3) throw new Error(`L15 bag ${c} must mix three kinds`);
    }

    const dump = BoardState.fromLevel(LEVEL_15);
    dump.placeFromBag(0);
    const second = dump.placeFromBag(0);
    if (second.ok || second.reason !== 'wrong_kind') {
        throw new Error('L15 must not dump a column into one tray');
    }

    const play = BoardState.fromLevel(LEVEL_15);
    const script: { tray?: number; bag: number }[] = [
        { bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 3 },
        { tray: 0, bag: 3 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { bag: 1 },
        { tray: 3, bag: 1 },
        { bag: 2 },
        { bag: 2 },
        { bag: 3 },
    ];
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) play.selectTray(step.tray);
        const r = play.placeFromBag(step.bag);
        if (!r.ok) throw new Error(`L15 script ${i} failed: ${r.reason}`);
    }
    if (!play.isWin() || play.steps !== 12) throw new Error('L15 must win in 12 steps');
    const kinds = play.trays.map((t) => t.kind).sort().join(',');
    if (kinds !== 'fruit,meat,milk,veg') throw new Error(`L15 must lock four kinds, got ${kinds}`);
    if (play.dest && play.dest.kind === 'buffer') throw new Error('L15 win must not keep buffer dest');
}

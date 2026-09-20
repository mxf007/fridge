import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 12 关：四格四列，奶/菜/果/肉，每列两种混叠。肉登场且必须换格。柜台开，可不用。 */
export const LEVEL_12: LevelDef = {
    id: 12,
    title: '肉也要收',
    teach: '肉登场。每列两种混叠，种类不对就换格',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['meat', 'milk', 'milk'],
        ['milk', 'veg', 'veg'],
        ['veg', 'fruit', 'fruit'],
        ['fruit', 'meat', 'meat'],
    ],
    buffer: 3,
    loseable: false,
};

function columnKinds(col: string[]): number {
    const set: Record<string, true> = {};
    for (let i = 0; i < col.length; i++) set[col[i]] = true;
    return Object.keys(set).length;
}

export function selfCheckLevel12(): void {
    assertLevel(LEVEL_12);
    const b = BoardState.fromLevel(LEVEL_12);
    if (!b.bufferEnabled) throw new Error('L12 bufferEnabled must be true');
    if (b.trays.length !== 4 || b.bags.length !== 4) throw new Error('L12 must have 4 trays and 4 bags');
    if (b.peekBag(0) !== 'milk' || b.peekBag(1) !== 'veg' || b.peekBag(2) !== 'fruit' || b.peekBag(3) !== 'meat') {
        throw new Error('L12 tops must be milk / veg / fruit / meat');
    }
    for (let c = 0; c < LEVEL_12.bags.length; c++) {
        if (columnKinds(LEVEL_12.bags[c]) !== 2) throw new Error(`L12 bag ${c} must mix two kinds`);
    }

    const dump = BoardState.fromLevel(LEVEL_12);
    dump.placeFromBag(0);
    dump.placeFromBag(0);
    const third = dump.placeFromBag(0);
    if (third.ok || third.reason !== 'wrong_kind') {
        throw new Error('L12 must not dump a whole column into one tray');
    }

    const bounce = BoardState.fromLevel(LEVEL_12);
    bounce.placeFromBag(0);
    const meat = bounce.placeFromBag(3);
    if (meat.ok || meat.reason !== 'wrong_kind') {
        throw new Error('L12 meat must bounce while tray 0 is milk');
    }
    if (meat.hintTrays.indexOf(1) < 0) throw new Error('L12 bounce must hint an empty tray');

    const play = BoardState.fromLevel(LEVEL_12);
    const script: { tray?: number; bag: number }[] = [
        { bag: 0 },
        { bag: 0 },
        { tray: 1, bag: 1 },
        { bag: 1 },
        { tray: 2, bag: 2 },
        { bag: 2 },
        { tray: 3, bag: 3 },
        { bag: 3 },
        { tray: 0, bag: 1 },
        { bag: 2 },
        { bag: 3 },
        { bag: 0 },
    ];
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) play.selectTray(step.tray);
        const r = play.placeFromBag(step.bag);
        if (!r.ok) throw new Error(`L12 script ${i} failed: ${r.reason}`);
    }
    if (!play.isWin() || play.steps !== 12) throw new Error('L12 must win in 12 steps by switching');
    if (play.trays.every((t) => t.kind !== 'meat')) throw new Error('L12 must store meat');
    if (play.dest && play.dest.kind === 'buffer') throw new Error('L12 win must not keep buffer dest');
}

import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 13 关：四格 cap3，三列深 4，奶/菜/果/肉。列数 < 种类，必须轮流挖。柜台开，可不用。 */
export const LEVEL_13: LevelDef = {
    id: 13,
    title: '四种要轮着挖',
    teach: '三列四种，必须换列往下挖',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['meat', 'fruit', 'veg', 'milk'],
        ['milk', 'meat', 'fruit', 'veg'],
        ['veg', 'milk', 'meat', 'fruit'],
    ],
    buffer: 3,
    loseable: false,
};

export function selfCheckLevel13(): void {
    assertLevel(LEVEL_13);
    const b = BoardState.fromLevel(LEVEL_13);
    if (!b.bufferEnabled) throw new Error('L13 bufferEnabled must be true');
    if (b.trays.length !== 4 || b.bags.length !== 3) throw new Error('L13 must be 4 trays and 3 bags');
    for (let i = 0; i < b.bags.length; i++) {
        if (b.bags[i].length !== 4) throw new Error(`L13 bag ${i} must be depth 4`);
    }
    if (b.peekBag(0) !== 'milk' || b.peekBag(1) !== 'veg' || b.peekBag(2) !== 'fruit') {
        throw new Error('L13 tops must be milk / veg / fruit');
    }

    const dump = BoardState.fromLevel(LEVEL_13);
    dump.placeFromBag(0);
    const second = dump.placeFromBag(0);
    if (second.ok || second.reason !== 'wrong_kind') {
        throw new Error('L13 must bounce when digging the same column without switching');
    }

    const bounce = BoardState.fromLevel(LEVEL_13);
    bounce.placeFromBag(0);
    const veg = bounce.placeFromBag(1);
    if (veg.ok || veg.reason !== 'wrong_kind') {
        throw new Error('L13 veg must bounce while tray 0 is milk');
    }
    if (veg.hintTrays.indexOf(1) < 0) throw new Error('L13 bounce must hint an empty tray');

    const play = BoardState.fromLevel(LEVEL_13);
    const script: { tray?: number; bag: number }[] = [
        { bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 3, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 3, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 3, bag: 2 },
        { bag: 2 },
        { bag: 2 },
    ];
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) play.selectTray(step.tray);
        const r = play.placeFromBag(step.bag);
        if (!r.ok) throw new Error(`L13 script ${i} failed: ${r.reason}`);
    }
    if (!play.isWin() || play.steps !== 12) throw new Error('L13 must win in 12 steps by rotating columns');
    const kinds = play.trays.map((t) => t.kind).sort().join(',');
    if (kinds !== 'fruit,meat,milk,veg') throw new Error(`L13 trays must lock four kinds, got ${kinds}`);
    if (play.dest && play.dest.kind === 'buffer') throw new Error('L13 win must not keep buffer dest');
}

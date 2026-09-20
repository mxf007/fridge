import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 8 关：三格三列，奶/菜/果，每列两种混叠。柜台关。提示改为看广告。 */
export const LEVEL_08: LevelDef = {
    id: 8,
    title: '三种也要换格',
    teach: '每列两种混叠，种类不对就换格',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['veg', 'milk', 'milk'],
        ['fruit', 'veg', 'veg'],
        ['milk', 'fruit', 'fruit'],
    ],
    buffer: 3,
    loseable: false,
};

function columnKinds(col: string[]): number {
    const set: Record<string, true> = {};
    for (let i = 0; i < col.length; i++) set[col[i]] = true;
    return Object.keys(set).length;
}

export function selfCheckLevel08(): void {
    assertLevel(LEVEL_08);
    const b = BoardState.fromLevel(LEVEL_08);
    if (b.bufferEnabled) throw new Error('L8 bufferEnabled must be false');
    if (b.trays.length !== 3 || b.bags.length !== 3) throw new Error('L8 must have 3 trays and 3 bags');
    if (b.trays[0].cap !== 3) throw new Error('L8 trays must be cap 3');
    if (b.peekBag(0) !== 'milk' || b.peekBag(1) !== 'veg' || b.peekBag(2) !== 'fruit') {
        throw new Error('L8 tops must be milk / veg / fruit');
    }
    for (let c = 0; c < LEVEL_08.bags.length; c++) {
        if (columnKinds(LEVEL_08.bags[c]) !== 2) throw new Error(`L8 bag ${c} must mix two kinds`);
    }
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L8 default dest must be tray 0');
    }

    const milk = b.placeFromBag(0);
    if (!milk.ok || milk.item !== 'milk') throw new Error('L8 first milk must place');
    const bounceVeg = b.placeFromBag(1);
    if (bounceVeg.ok || bounceVeg.reason !== 'wrong_kind') {
        throw new Error('L8 veg must bounce while tray 0 is milk');
    }
    if (bounceVeg.hintTrays.indexOf(1) < 0) throw new Error('L8 bounce must hint tray 1');
    const bounceFruit = b.placeFromBag(2);
    if (bounceFruit.ok || bounceFruit.reason !== 'wrong_kind') {
        throw new Error('L8 fruit must bounce while tray 0 is milk');
    }
    if (bounceFruit.hintTrays.indexOf(2) < 0) throw new Error('L8 fruit bounce must hint tray 2');

    const stuck = BoardState.fromLevel(LEVEL_08);
    stuck.placeFromBag(0);
    for (let i = 0; i < 10; i++) {
        stuck.placeFromBag(1);
        stuck.placeFromBag(2);
    }
    if (stuck.trays[1].items.length > 0 || stuck.trays[2].items.length > 0 || stuck.isWin()) {
        throw new Error('L8 must not accept veg/fruit without switching trays');
    }

    const play = BoardState.fromLevel(LEVEL_08);
    const script: { tray?: number; bag: number }[] = [
        { bag: 0 },
        { bag: 0 },
        { tray: 1, bag: 1 },
        { bag: 1 },
        { tray: 2, bag: 2 },
        { bag: 2 },
        { tray: 0, bag: 2 },
        { bag: 0 },
        { bag: 1 },
    ];
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) play.selectTray(step.tray);
        const r = play.placeFromBag(step.bag);
        if (!r.ok) throw new Error(`L8 script ${i} failed: ${r.reason}`);
    }
    if (!play.isWin() || play.steps !== 9) throw new Error('L8 must win in 9 steps by switching');
}

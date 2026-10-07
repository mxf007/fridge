import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 5 关：3×3 格，奶/菜/果；每列三种混叠，栈顶仍对应左中右。柜台关。 */
export const LEVEL_05: LevelDef = {
    id: 5,
    title: '水果也要收',
    teach: '第三种：水果',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['fruit', 'veg', 'milk'],
        ['fruit', 'milk', 'veg'],
        ['veg', 'milk', 'fruit'],
    ],
    buffer: 3,
    loseable: false,
};

export function selfCheckLevel05(): void {
    assertLevel(LEVEL_05);
    const b = BoardState.fromLevel(LEVEL_05);
    if (b.bufferEnabled) throw new Error('L5 bufferEnabled must be false');
    if (b.trays.length !== 3 || b.bags.length !== 3) throw new Error('L5 must have 3 trays and 3 bags');
    if (b.peekBag(0) !== 'milk' || b.peekBag(1) !== 'veg' || b.peekBag(2) !== 'fruit') {
        throw new Error('L5 columns must show milk / veg / fruit on top');
    }
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L5 default dest must be tray 0');
    }

    const milk = b.placeFromBag(0);
    if (!milk.ok || milk.item !== 'milk') throw new Error('L5 first milk must place');
    const bounceVeg = b.placeFromBag(1);
    if (bounceVeg.ok || bounceVeg.reason !== 'wrong_kind') {
        throw new Error('L5 veg must bounce while tray 0 is milk');
    }

    const play = BoardState.fromLevel(LEVEL_05);
    const script: { tray?: number; bag: number }[] = [
        { bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 0, bag: 2 },
    ];
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) play.selectTray(step.tray);
        const r = play.placeFromBag(step.bag);
        if (!r.ok) throw new Error(`L5 script ${i} failed: ${r.reason}`);
    }
    if (!play.isWin() || play.steps !== 9) throw new Error('L5 must win in 9 steps');
}

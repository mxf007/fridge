import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 16 关：酱浅尝。三格三列，奶/菜/酱，每列两种混叠。不要五种全上。柜台开，可不用。 */
export const LEVEL_16: LevelDef = {
    id: 16,
    title: '尝尝酱',
    teach: '第五种：酱。只替换一种，不要五种全上',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['veg', 'milk', 'milk'],
        ['sauce', 'veg', 'veg'],
        ['milk', 'sauce', 'sauce'],
    ],
    buffer: 3,
    loseable: false,
};

export function selfCheckLevel16(): void {
    assertLevel(LEVEL_16);
    const b = BoardState.fromLevel(LEVEL_16);
    if (!b.bufferEnabled) throw new Error('L16 bufferEnabled must be true');
    if (b.trays.length !== 3 || b.bags.length !== 3) throw new Error('L16 must be 3×3');
    const items = LEVEL_16.bags.flat();
    const kinds = Array.from(new Set(items)).sort();
    if (kinds.join(',') !== 'milk,sauce,veg') throw new Error(`L16 must be milk/veg/sauce only, got ${kinds.join(',')}`);
    if (items.filter((x) => x === 'sauce').length !== 3) throw new Error('L16 must have 3 sauce');
    if (b.peekBag(0) !== 'milk' || b.peekBag(1) !== 'veg' || b.peekBag(2) !== 'sauce') {
        throw new Error('L16 tops must be milk / veg / sauce');
    }

    const milk = b.placeFromBag(0);
    if (!milk.ok || milk.item !== 'milk') throw new Error('L16 first milk must place');
    const bounce = b.placeFromBag(2);
    if (bounce.ok || bounce.reason !== 'wrong_kind') {
        throw new Error('L16 sauce must bounce while tray 0 is milk');
    }
    if (bounce.hintTrays.indexOf(1) < 0) throw new Error('L16 bounce must hint an empty tray');

    const play = BoardState.fromLevel(LEVEL_16);
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
        if (!r.ok) throw new Error(`L16 script ${i} failed: ${r.reason}`);
    }
    if (!play.isWin() || play.steps !== 9) throw new Error('L16 must win in 9 steps');
    if (play.trays.every((t) => t.kind !== 'sauce')) throw new Error('L16 must store sauce');
    if (play.dest && play.dest.kind === 'buffer') throw new Error('L16 win must not keep buffer dest');
}

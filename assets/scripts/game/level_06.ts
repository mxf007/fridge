import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 6 关：2×4 格，奶菜交错叠。弹回变多，仍可靠换格过。柜台关。 */
export const LEVEL_06: LevelDef = {
    id: 6,
    title: '弹回会变多',
    teach: '混叠加深，仍可靠换格过',
    trays: [{ cap: 4 }, { cap: 4 }],
    bags: [
        ['veg', 'milk', 'veg', 'milk'],
        ['milk', 'veg', 'milk', 'veg'],
    ],
    buffer: 3,
    loseable: false,
};

export function selfCheckLevel06(): void {
    assertLevel(LEVEL_06);
    const b = BoardState.fromLevel(LEVEL_06);
    if (b.bufferEnabled) throw new Error('L6 bufferEnabled must be false');
    if (b.peekBag(0) !== 'milk' || b.peekBag(1) !== 'veg') {
        throw new Error('L6 tops must be milk / veg');
    }
    const first = b.placeFromBag(0);
    if (!first.ok || first.item !== 'milk') throw new Error('L6 first milk must place');
    if (b.trays[0].sealed) throw new Error('L6 tray 0 must stay open after 1 milk');
    const bounce = b.placeFromBag(1);
    if (bounce.ok || bounce.reason !== 'wrong_kind') {
        throw new Error('L6 veg must bounce while tray 0 is milk');
    }

    const play = BoardState.fromLevel(LEVEL_06);
    const script: { tray?: number; bag: number }[] = [
        { bag: 0 },
        { tray: 1, bag: 1 },
        { bag: 0 },
        { tray: 0, bag: 0 },
        { tray: 1, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 1 },
        { bag: 1 },
    ];
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) play.selectTray(step.tray);
        const r = play.placeFromBag(step.bag);
        if (!r.ok) throw new Error(`L6 script ${i} failed: ${r.reason}`);
    }
    if (!play.isWin() || play.steps !== 8) throw new Error('L6 must win in 8 steps by switching');
}

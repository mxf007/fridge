import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 4 关：迷你换格。格 0 未满时青菜必弹回，封格自动改选不得跳过这一步。柜台关。 */
export const LEVEL_04: LevelDef = {
    id: 4,
    title: '格没满也会换色',
    teach: '种类不对会弹回，先点另一个格子',
    trays: [{ cap: 4 }, { cap: 4 }],
    bags: [
        ['veg', 'veg', 'veg', 'milk'],
        ['milk', 'milk', 'milk', 'veg'],
    ],
    buffer: 3,
    loseable: false,
};

export function selfCheckLevel04(): void {
    assertLevel(LEVEL_04);
    const b = BoardState.fromLevel(LEVEL_04);
    if (b.bufferEnabled) throw new Error('L4 bufferEnabled must be false');
    if (b.peekBag(0) !== 'milk' || b.peekBag(1) !== 'veg') throw new Error('L4 tops must be milk / veg');
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L4 default dest must be tray 0');
    }
    const milk = b.placeFromBag(0);
    if (!milk.ok) throw new Error('L4 first milk must place');
    if (b.trays[0].sealed || b.trays[0].kind !== 'milk' || b.trays[0].items.length !== 1) {
        throw new Error('L4 tray 0 must be milk 1/4 unsealed');
    }
    if (!b.dest || b.dest.index !== 0) throw new Error('L4 dest must stay tray 0 while unfilled');
    const bounce = b.placeFromBag(1);
    if (bounce.ok || bounce.reason !== 'wrong_kind') {
        throw new Error('L4 veg must bounce while tray 0 is milk');
    }
    if (bounce.hintTrays.indexOf(1) < 0) throw new Error('L4 bounce must hint tray 1');
    b.selectTray(1);
    if (b.steps !== 1) throw new Error('L4 selectTray must not count as a step');
    const veg = b.placeFromBag(1);
    if (!veg.ok || veg.item !== 'veg') throw new Error('L4 veg must enter tray 1 after switch');
    for (let i = 0; i < 3; i++) {
        const r = b.placeFromBag(0);
        if (!r.ok) throw new Error(`L4 veg finish ${i} failed: ${r.reason}`);
    }
    for (let i = 0; i < 3; i++) {
        const r = b.placeFromBag(1);
        if (!r.ok) throw new Error(`L4 milk finish ${i} failed: ${r.reason}`);
    }
    if (!b.isWin() || b.steps !== 8) throw new Error('L4 must win in 8 steps');
}

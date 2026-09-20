import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 2 关：2×3 格，左奶右菜单色列。热身，不依赖本关学会换格。柜台关。 */
export const LEVEL_02: LevelDef = {
    id: 2,
    title: '左奶右菜',
    teach: '两种，仍是单色列',
    trays: [{ cap: 3 }, { cap: 3 }],
    bags: [
        ['milk', 'milk', 'milk'],
        ['veg', 'veg', 'veg'],
    ],
    buffer: 3,
    loseable: false,
};

export function selfCheckLevel02(): void {
    assertLevel(LEVEL_02);
    const b = BoardState.fromLevel(LEVEL_02);
    if (b.bufferEnabled) throw new Error('L2 bufferEnabled must be false');
    if (b.trays.length !== 2 || b.bags.length !== 2) throw new Error('L2 must have 2 trays and 2 bags');
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L2 default dest must be tray 0');
    }
    for (let i = 0; i < 3; i++) {
        const r = b.placeFromBag(0);
        if (!r.ok) throw new Error(`L2 milk ${i} failed: ${r.reason}`);
    }
    if (!b.trays[0].sealed) throw new Error('L2 tray 0 must seal after 3 milk');
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 1) {
        throw new Error('L2 must auto-select tray 1 after seal');
    }
    for (let i = 0; i < 3; i++) {
        const r = b.placeFromBag(1);
        if (!r.ok) throw new Error(`L2 veg ${i} failed: ${r.reason}`);
    }
    if (!b.isWin()) throw new Error('L2 must win after 6 places');
    if (b.steps !== 6) throw new Error('L2 steps must be 6');

    const bounce = BoardState.fromLevel(LEVEL_02);
    bounce.placeFromBag(0);
    const veg = bounce.placeFromBag(1);
    if (veg.ok) throw new Error('L2 veg must bounce while tray 0 is milk');
    if (veg.reason !== 'wrong_kind') throw new Error(`L2 bounce reason ${veg.reason}`);
}

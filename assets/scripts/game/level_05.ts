import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 5 关：3×3 格，三列单色（奶/菜/果）。柜台关。横向三格热身。 */
export const LEVEL_05: LevelDef = {
    id: 5,
    title: '水果也要收',
    teach: '第三种：水果',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['milk', 'milk', 'milk'],
        ['veg', 'veg', 'veg'],
        ['fruit', 'fruit', 'fruit'],
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
        throw new Error('L5 columns must be milk / veg / fruit');
    }
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L5 default dest must be tray 0');
    }
    for (let i = 0; i < 3; i++) {
        const r = b.placeFromBag(0);
        if (!r.ok) throw new Error(`L5 milk ${i} failed: ${r.reason}`);
    }
    if (!b.trays[0].sealed) throw new Error('L5 tray 0 must seal');
    if (!b.dest || b.dest.index !== 1) throw new Error('L5 must auto-select tray 1');
    for (let i = 0; i < 3; i++) {
        const r = b.placeFromBag(1);
        if (!r.ok) throw new Error(`L5 veg ${i} failed: ${r.reason}`);
    }
    if (!b.dest || b.dest.index !== 2) throw new Error('L5 must auto-select tray 2');
    for (let i = 0; i < 3; i++) {
        const r = b.placeFromBag(2);
        if (!r.ok) throw new Error(`L5 fruit ${i} failed: ${r.reason}`);
    }
    if (!b.isWin() || b.steps !== 9) throw new Error('L5 must win in 9 steps');
}

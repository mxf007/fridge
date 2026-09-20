import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 3 关：2×3 格，1 列×6。顶 3 菜、底 3 奶。封格后自动改选收奶。柜台关。 */
export const LEVEL_03: LevelDef = {
    id: 3,
    title: '先菜后奶',
    teach: '一列里会混色',
    trays: [{ cap: 3 }, { cap: 3 }],
    bags: [['milk', 'milk', 'milk', 'veg', 'veg', 'veg']],
    buffer: 3,
    loseable: false,
};

export function selfCheckLevel03(): void {
    assertLevel(LEVEL_03);
    const b = BoardState.fromLevel(LEVEL_03);
    if (b.bufferEnabled) throw new Error('L3 bufferEnabled must be false');
    if (b.trays.length !== 2 || b.bags.length !== 1) throw new Error('L3 must have 2 trays and 1 bag');
    if (b.peekBag(0) !== 'veg') throw new Error('L3 stack top must be veg');
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L3 default dest must be tray 0');
    }
    for (let i = 0; i < 3; i++) {
        const r = b.placeFromBag(0);
        if (!r.ok) throw new Error(`L3 veg ${i} failed: ${r.reason}`);
        if (r.item !== 'veg') throw new Error('L3 first 3 must be veg');
    }
    if (!b.trays[0].sealed || b.trays[0].kind !== 'veg') {
        throw new Error('L3 tray 0 must seal as veg');
    }
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 1) {
        throw new Error('L3 must auto-select tray 1 after seal');
    }
    if (b.peekBag(0) !== 'milk') throw new Error('L3 after veg must show milk');
    for (let i = 0; i < 3; i++) {
        const r = b.placeFromBag(0);
        if (!r.ok) throw new Error(`L3 milk ${i} failed: ${r.reason}`);
        if (r.item !== 'milk') throw new Error('L3 last 3 must be milk');
    }
    if (!b.isWin()) throw new Error('L3 must win after 6 places');
    if (b.steps !== 6) throw new Error('L3 steps must be 6');
    if (b.failReason() != null) throw new Error('L3 must not fail');
}

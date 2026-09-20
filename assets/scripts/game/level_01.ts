import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

export const LEVEL_01: LevelDef = {
    id: 1,
    title: '先把牛奶收进去',
    teach: '点最上面的，飞进已选中的格',
    trays: [{ cap: 4 }],
    bags: [['milk', 'milk', 'milk', 'milk']],
    buffer: 3,
    loseable: false,
};

export function selfCheckLevel01(): void {
    assertLevel(LEVEL_01);
    const b = BoardState.fromLevel(LEVEL_01);
    if (b.bufferEnabled) throw new Error('L1 bufferEnabled must be false');
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L1 default dest must be tray 0');
    }
    b.selectTray(0);
    if (b.steps !== 0) throw new Error('L1 selectTray must not count as a step');
    for (let i = 0; i < 4; i++) {
        const r = b.placeFromBag(0);
        if (!r.ok) throw new Error(`L1 place ${i} failed: ${r.reason}`);
    }
    if (!b.trays[0].sealed) throw new Error('L1 tray 0 must seal after 4 milk');
    if (!b.isWin()) throw new Error('L1 must win after 4 places');
    if (b.steps !== 4) throw new Error('L1 steps must be 4');
    if (b.failReason() != null) throw new Error('L1 must not fail');
}

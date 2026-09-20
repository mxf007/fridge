import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 7 关：换格试金石。不点格 1，青菜进不去。柜台关。提示第一次免费。 */
export const LEVEL_07: LevelDef = {
    id: 7,
    title: '点另一格再放',
    teach: '种类不对会弹回，去点另一个冰箱格',
    trays: [{ cap: 3 }, { cap: 3 }],
    bags: [
        ['veg', 'veg', 'milk'],
        ['milk', 'milk', 'veg'],
    ],
    buffer: 3,
    loseable: false,
};

export function selfCheckLevel07(): void {
    assertLevel(LEVEL_07);
    const b = BoardState.fromLevel(LEVEL_07);
    if (b.bufferEnabled) throw new Error('L7 bufferEnabled must be false');
    if (b.trays.length !== 2 || b.trays[0].cap !== 3 || b.trays[1].cap !== 3) {
        throw new Error('L7 must be 2×3 trays');
    }
    if (b.peekBag(0) !== 'milk' || b.peekBag(1) !== 'veg') {
        throw new Error('L7 tops must be milk / veg');
    }
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L7 default dest must be tray 0');
    }

    const openHint = b.findHint();
    if (!openHint || openHint.dest.kind !== 'tray' || openHint.dest.index !== 0 || openHint.bagCol !== 0) {
        throw new Error('L7 opening hint must be tray 0 + bag 0');
    }

    const milk = b.placeFromBag(0);
    if (!milk.ok || milk.item !== 'milk') throw new Error('L7 first milk must place');
    if (b.trays[0].sealed || b.trays[0].kind !== 'milk' || b.trays[0].items.length !== 1) {
        throw new Error('L7 tray 0 must be milk 1/3 unsealed');
    }

    const bounce = b.placeFromBag(1);
    if (bounce.ok || bounce.reason !== 'wrong_kind') {
        throw new Error('L7 veg must bounce while tray 0 is milk');
    }
    if (bounce.hintTrays.indexOf(1) < 0) throw new Error('L7 bounce must hint tray 1');

    const afterMilk = BoardState.fromLevel(LEVEL_07);
    afterMilk.placeFromBag(0);
    const hint = afterMilk.findHint();
    if (!hint || hint.dest.kind !== 'tray' || hint.dest.index !== 1) {
        throw new Error('L7 hint after milk must point at tray 1');
    }
    if (afterMilk.peekBag(hint.bagCol) !== 'veg') {
        throw new Error('L7 hint after milk must point at veg');
    }

    const stuck = BoardState.fromLevel(LEVEL_07);
    stuck.placeFromBag(0);
    for (let i = 0; i < 8; i++) {
        stuck.placeFromBag(0);
        stuck.placeFromBag(1);
    }
    if (stuck.trays[1].items.length > 0 || stuck.isWin()) {
        throw new Error('L7 must not accept veg without selecting tray 1');
    }

    b.selectTray(1);
    if (b.steps !== 1) throw new Error('L7 selectTray must not count as a step');
    const veg = b.placeFromBag(1);
    if (!veg.ok || veg.item !== 'veg') throw new Error('L7 veg must enter tray 1 after switch');

    const play = BoardState.fromLevel(LEVEL_07);
    const script: { tray?: number; bag: number }[] = [
        { bag: 0 },
        { tray: 1, bag: 1 },
        { bag: 0 },
        { bag: 0 },
        { bag: 1 },
        { bag: 1 },
    ];
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) play.selectTray(step.tray);
        const r = play.placeFromBag(step.bag);
        if (!r.ok) throw new Error(`L7 script ${i} failed: ${r.reason}`);
    }
    if (!play.isWin() || play.steps !== 6) throw new Error('L7 must win in 6 steps by switching');
}

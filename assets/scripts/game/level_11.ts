import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 11 关：弹回了换哪格。点空格或已有同种格。不教锁死。柜台开，可不用。 */
export const LEVEL_11: LevelDef = {
    id: 11,
    title: '格子认第一种',
    teach: '弹回了就去点空格，或已经在收这种的那一格',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['fruit', 'milk', 'veg'],
        ['veg', 'fruit', 'milk'],
        ['milk', 'veg', 'fruit'],
    ],
    buffer: 3,
    loseable: false,
};

export function selfCheckLevel11(): void {
    assertLevel(LEVEL_11);
    const b = BoardState.fromLevel(LEVEL_11);
    if (!b.bufferEnabled) throw new Error('L11 bufferEnabled must be true');
    if (b.trays.length !== 3 || b.bags.length !== 3) throw new Error('L11 must be 3×3');
    if (b.peekBag(0) !== 'veg' || b.peekBag(1) !== 'milk' || b.peekBag(2) !== 'fruit') {
        throw new Error('L11 tops must be veg / milk / fruit');
    }
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L11 default dest must be tray 0');
    }

    const veg = b.placeFromBag(0);
    if (!veg.ok || veg.item !== 'veg') throw new Error('L11 first veg must place');
    const bounce = b.placeFromBag(1);
    if (bounce.ok || bounce.reason !== 'wrong_kind') {
        throw new Error('L11 milk must bounce while tray 0 is veg');
    }
    if (bounce.hintTrays.indexOf(1) < 0) throw new Error('L11 bounce must hint an empty tray');

    b.selectTray(1);
    const milk = b.placeFromBag(1);
    if (!milk.ok || milk.item !== 'milk') throw new Error('L11 milk must enter empty tray 1');

    const same = BoardState.fromLevel(LEVEL_11);
    same.placeFromBag(0);
    same.selectTray(1);
    same.placeFromBag(1);
    const intoSame = same.placeFromBag(0);
    if (!intoSame.ok || intoSame.item !== 'milk' || intoSame.dest.kind !== 'tray' || intoSame.dest.index !== 1) {
        throw new Error('L11 milk must continue into the tray already locking milk');
    }

    const split = BoardState.fromLevel(LEVEL_11);
    split.placeFromBag(0);
    split.selectTray(1);
    split.placeFromBag(1);
    split.selectTray(2);
    const anti = split.placeFromBag(0);
    if (anti.ok || anti.reason !== 'anti_split') {
        throw new Error('L11 must anti-split milk into a new empty tray');
    }
    if (anti.hintTrays.indexOf(1) < 0) throw new Error('L11 anti-split must hint the milk tray');

    const play = BoardState.fromLevel(LEVEL_11);
    const script: { tray?: number; bag: number }[] = [
        { bag: 0 },
        { tray: 1, bag: 1 },
        { bag: 0 },
        { tray: 2, bag: 0 },
        { bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 1, bag: 2 },
        { tray: 2, bag: 1 },
        { bag: 1 },
    ];
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) play.selectTray(step.tray);
        const r = play.placeFromBag(step.bag);
        if (!r.ok) throw new Error(`L11 script ${i} failed: ${r.reason}`);
    }
    if (!play.isWin() || play.steps !== 9) throw new Error('L11 must win in 9 steps without buffer');
    if (play.dest && play.dest.kind === 'buffer') throw new Error('L11 win must not keep buffer dest');
}

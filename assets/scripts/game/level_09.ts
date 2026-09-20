import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 9 关：四格 cap2，两列奶菜交错。封格更勤，仍等容量。柜台关。 */
export const LEVEL_09: LevelDef = {
    id: 9,
    title: '格子变小了',
    teach: '小格两件就封，仍靠换格过',
    trays: [{ cap: 2 }, { cap: 2 }, { cap: 2 }, { cap: 2 }],
    bags: [
        ['veg', 'milk', 'veg', 'milk'],
        ['milk', 'veg', 'milk', 'veg'],
    ],
    buffer: 3,
    loseable: false,
};

export function selfCheckLevel09(): void {
    assertLevel(LEVEL_09);
    const b = BoardState.fromLevel(LEVEL_09);
    if (b.bufferEnabled) throw new Error('L9 bufferEnabled must be false');
    if (b.trays.length !== 4 || b.bags.length !== 2) throw new Error('L9 must be 4 trays and 2 bags');
    for (let i = 0; i < b.trays.length; i++) {
        if (b.trays[i].cap !== 2) throw new Error('L9 trays must be cap 2');
    }
    if (b.peekBag(0) !== 'milk' || b.peekBag(1) !== 'veg') {
        throw new Error('L9 tops must be milk / veg');
    }
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L9 default dest must be tray 0');
    }

    const milk = b.placeFromBag(0);
    if (!milk.ok || milk.item !== 'milk') throw new Error('L9 first milk must place');
    if (b.trays[0].sealed) throw new Error('L9 tray 0 must stay open after 1 milk');
    const bounce = b.placeFromBag(1);
    if (bounce.ok || bounce.reason !== 'wrong_kind') {
        throw new Error('L9 veg must bounce while tray 0 is milk');
    }
    if (bounce.hintTrays.indexOf(1) < 0) throw new Error('L9 bounce must hint tray 1');

    const seal = BoardState.fromLevel(LEVEL_09);
    seal.placeFromBag(0);
    seal.selectTray(1);
    seal.placeFromBag(1);
    const vegSeal = seal.placeFromBag(0);
    if (!vegSeal.ok || vegSeal.item !== 'veg' || !vegSeal.sealed) {
        throw new Error('L9 tray 1 must seal at 2 veg');
    }
    if (vegSeal.dest.kind !== 'tray' || vegSeal.dest.index !== 1) {
        throw new Error('L9 second veg must seal tray 1');
    }
    if (!seal.dest || seal.dest.kind !== 'tray' || seal.dest.index !== 0) {
        throw new Error('L9 must auto-select tray 0 after small tray seals');
    }

    const stuck = BoardState.fromLevel(LEVEL_09);
    stuck.placeFromBag(0);
    for (let i = 0; i < 8; i++) stuck.placeFromBag(1);
    if (stuck.trays[1].items.length > 0 || stuck.isWin()) {
        throw new Error('L9 must not accept veg without switching trays');
    }

    const play = BoardState.fromLevel(LEVEL_09);
    const script: { tray?: number; bag: number }[] = [
        { bag: 0 },
        { tray: 1, bag: 1 },
        { bag: 0 },
        { bag: 0 },
        { bag: 0 },
        { tray: 3, bag: 1 },
        { tray: 2, bag: 1 },
        { bag: 1 },
    ];
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) play.selectTray(step.tray);
        const r = play.placeFromBag(step.bag);
        if (!r.ok) throw new Error(`L9 script ${i} failed: ${r.reason}`);
    }
    if (!play.isWin() || play.steps !== 8) throw new Error('L9 must win in 8 steps by switching');
    for (let i = 0; i < play.trays.length; i++) {
        if (!play.trays[i].sealed) throw new Error(`L9 tray ${i} must be sealed`);
    }
}

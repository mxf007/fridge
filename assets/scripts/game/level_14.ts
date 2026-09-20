import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 14 关：三格 cap4，四列深 3，顶层分散。最优解用柜台少换格。可不用柜台过，不写必败。 */
export const LEVEL_14: LevelDef = {
    id: 14,
    title: '先放到柜台少换格',
    teach: '顶层分散时，可以先放到柜台，少换几次格',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 4 }],
    bags: [
        ['veg', 'milk', 'fruit'],
        ['fruit', 'veg', 'milk'],
        ['milk', 'fruit', 'veg'],
        ['milk', 'veg', 'fruit'],
    ],
    buffer: 3,
    loseable: false,
};

function run(board: BoardState, script: { tray?: number; buffer?: number; bag?: number; fromBuffer?: number }[]) {
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) board.selectTray(step.tray);
        if (step.buffer != null) board.selectBuffer(step.buffer);
        let r;
        if (step.fromBuffer != null) r = board.placeFromBuffer(step.fromBuffer);
        else if (step.bag != null) r = board.placeFromBag(step.bag);
        else throw new Error(`L14 script ${i} missing place`);
        if (!r.ok) throw new Error(`L14 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel14(): void {
    assertLevel(LEVEL_14);
    const b = BoardState.fromLevel(LEVEL_14);
    if (!b.bufferEnabled) throw new Error('L14 bufferEnabled must be true');
    if (b.trays.length !== 3 || b.bags.length !== 4) throw new Error('L14 must be 3 trays and 4 bags');
    for (let i = 0; i < b.trays.length; i++) {
        if (b.trays[i].cap !== 4) throw new Error('L14 trays must be cap 4');
    }
    if (b.peekBag(0) !== 'fruit' || b.peekBag(1) !== 'milk' || b.peekBag(2) !== 'veg' || b.peekBag(3) !== 'fruit') {
        throw new Error('L14 tops must be scattered fruit / milk / veg / fruit');
    }

    const milk = b.placeFromBag(0);
    if (!milk.ok || milk.item !== 'fruit') throw new Error('L14 first fruit must place');
    const bounce = b.placeFromBag(1);
    if (bounce.ok || bounce.reason !== 'wrong_kind') {
        throw new Error('L14 milk must bounce while tray 0 is fruit');
    }
    if (bounce.hintBuffers.indexOf(0) < 0) throw new Error('L14 bounce must hint empty buffer');

    const noBuf = BoardState.fromLevel(LEVEL_14);
    run(noBuf, [
        { bag: 0 },
        { bag: 3 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 3 },
        { bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 0, bag: 2 },
        { bag: 2 },
        { bag: 0 },
        { tray: 2, bag: 0 },
        { bag: 3 },
    ]);
    if (!noBuf.isWin() || noBuf.steps !== 12) throw new Error('L14 must be solvable without buffer');
    console.log('L14 minBufferUsed', 0);

    const withBuf = BoardState.fromLevel(LEVEL_14);
    run(withBuf, [
        { bag: 0 },
        { buffer: 0, bag: 0 },
        { tray: 2, bag: 0 },
        { tray: 0, bag: 3 },
        { tray: 2, bag: 3 },
        { tray: 1, bag: 1 },
        { tray: 2, bag: 1 },
        { tray: 0, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 0, bag: 2 },
        { bag: 2 },
        { tray: 1, fromBuffer: 0 },
        { bag: 3 },
    ]);
    if (!withBuf.isWin()) throw new Error('L14 must win after parking on the counter');
    if (noBuf.dest && noBuf.dest.kind === 'buffer') throw new Error('L14 win must not keep buffer dest');
    if (withBuf.dest && withBuf.dest.kind === 'buffer') throw new Error('L14 win must not keep buffer dest');
}

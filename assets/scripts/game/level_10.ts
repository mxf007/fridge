import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 10 关：柜台登场。必须可解，允许不用柜台。禁止写成不用柜台必败。 */
export const LEVEL_10: LevelDef = {
    id: 10,
    title: '先放到柜台',
    teach: '这格暂时不能收时，可以点下面的空盘放下',
    trays: [{ cap: 3 }, { cap: 3 }, { cap: 3 }],
    bags: [
        ['fruit', 'fruit', 'fruit'],
        ['veg', 'veg', 'milk'],
        ['veg', 'milk', 'milk'],
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
        else throw new Error(`L10 script ${i} missing place`);
        if (!r.ok) throw new Error(`L10 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel10(): void {
    assertLevel(LEVEL_10);
    const b = BoardState.fromLevel(LEVEL_10);
    if (!b.bufferEnabled) throw new Error('L10 bufferEnabled must be true');
    if (b.buffer.length !== 3) throw new Error('L10 must have 3 buffer slots');
    if (b.trays.length !== 3 || b.bags.length !== 3) throw new Error('L10 must be 3×3');
    if (b.peekBag(0) !== 'fruit' || b.peekBag(1) !== 'milk' || b.peekBag(2) !== 'milk') {
        throw new Error('L10 tops must be fruit / milk / milk');
    }

    const milk = b.placeFromBag(1);
    if (!milk.ok || milk.item !== 'milk') throw new Error('L10 first milk must place');
    const bounce = b.placeFromBag(1);
    if (bounce.ok || bounce.reason !== 'wrong_kind') {
        throw new Error('L10 veg must bounce while tray 0 is milk');
    }
    if (bounce.hintTrays.indexOf(1) < 0) throw new Error('L10 bounce must hint an empty tray');
    if (bounce.hintBuffers.indexOf(0) < 0) throw new Error('L10 bounce must hint empty buffer');

    b.selectBuffer(0);
    if (b.steps !== 1) throw new Error('L10 selectBuffer must not count as a step');
    const park = b.placeFromBag(1);
    if (!park.ok || park.dest.kind !== 'buffer' || park.item !== 'veg') {
        throw new Error('L10 veg must enter buffer after selecting a slot');
    }
    if (b.buffer[0] !== 'veg') throw new Error('L10 buffer 0 must hold veg');

    const noBuf = BoardState.fromLevel(LEVEL_10);
    run(noBuf, [
        { bag: 0 },
        { bag: 0 },
        { bag: 0 },
        { bag: 1 },
        { tray: 2, bag: 1 },
        { bag: 1 },
        { tray: 1, bag: 2 },
        { bag: 2 },
        { bag: 2 },
    ]);
    if (!noBuf.isWin() || noBuf.steps !== 9) throw new Error('L10 must be solvable without buffer');
    console.log('L10 minBufferUsed', 0);

    const withBuf = BoardState.fromLevel(LEVEL_10);
    run(withBuf, [
        { bag: 1 },
        { buffer: 0, bag: 1 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 2 },
        { bag: 2 },
        { bag: 2 },
        { tray: 2, bag: 0 },
        { bag: 0 },
        { bag: 0 },
        { fromBuffer: 0 },
    ]);
    if (!withBuf.isWin()) throw new Error('L10 must win after parking veg on the counter');
    if (noBuf.dest && noBuf.dest.kind === 'buffer') throw new Error('L10 win must not keep buffer dest');
    if (withBuf.dest && withBuf.dest.kind === 'buffer') throw new Error('L10 win must not keep buffer dest');
}

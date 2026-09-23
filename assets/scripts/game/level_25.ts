import { BoardState } from './BoardState';
import { assertLevel } from './types';
import type { LevelDef } from './types';
import { auditVisibleInformation } from './VisibleInformationAudit';

/**
 * 第 25 关：西瓜 Boss。四格均 cap4；奶/菜/肉/西 各 4。
 * 浅露西瓜 + 深栈收奶菜肉；通关后「分享步数」高强度提示（UI）。
 */
export const LEVEL_25: LevelDef = {
    id: 25,
    title: '西瓜要整格',
    teach: '西瓜四件一整格；和菜同关还有奶肉第三色',
    trays: [{ cap: 4 }, { cap: 4 }, { cap: 4 }, { cap: 4 }],
    bags: [
        ['watermelon'],
        ['watermelon'],
        ['watermelon'],
        ['watermelon'],
        ['milk'],
        ['meat', 'meat', 'meat', 'meat', 'veg', 'veg', 'veg', 'veg', 'milk', 'milk', 'milk'],
    ],
    buffer: 3,
    loseable: true,
};

function run(
    board: BoardState,
    script: { tray?: number; buffer?: number; bag?: number; fromBuffer?: number }[],
) {
    for (let i = 0; i < script.length; i++) {
        const step = script[i];
        if (step.tray != null) board.selectTray(step.tray);
        if (step.buffer != null) board.selectBuffer(step.buffer);
        let r;
        if (step.fromBuffer != null) r = board.placeFromBuffer(step.fromBuffer);
        else if (step.bag != null) r = board.placeFromBag(step.bag);
        else throw new Error(`L25 script ${i} missing place`);
        if (!r.ok) throw new Error(`L25 script ${i} failed: ${r.reason}`);
    }
}

export function selfCheckLevel25(): void {
    assertLevel(LEVEL_25);
    const b = BoardState.fromLevel(LEVEL_25);
    if (!b.bufferEnabled) throw new Error('L25 bufferEnabled');
    if (b.trays.length !== 4 || !b.trays.every((t) => t.cap === 4)) throw new Error('L25 caps');
    const counts: Record<string, number> = {};
    for (const x of LEVEL_25.bags.flat()) counts[x] = (counts[x] || 0) + 1;
    if (counts.milk !== 4 || counts.veg !== 4 || counts.meat !== 4 || counts.watermelon !== 4) {
        throw new Error('L25 counts');
    }
    if (counts.pineapple || counts.kiwi) throw new Error('L25 no pineapple/kiwi');
    const audit = auditVisibleInformation(LEVEL_25);
    if (!audit.passes) throw new Error(`L25 audit failed: ${audit.failures.join(',')}`);
    if (audit.initialSafeActionCount <= 0) throw new Error('L25 need safe open');

    const bounce = BoardState.fromLevel(LEVEL_25);
    bounce.placeFromBag(0);
    const bad = bounce.placeFromBag(4);
    if (bad.ok || bad.reason !== 'wrong_kind') throw new Error('L25 milk bounce on watermelon');

    const play = BoardState.fromLevel(LEVEL_25);
    run(play, [
        { bag: 0 }, { bag: 1 }, { bag: 2 }, { bag: 3 },
        { tray: 1, bag: 4 }, { bag: 5 }, { bag: 5 }, { bag: 5 },
        { tray: 2, bag: 5 }, { bag: 5 }, { bag: 5 }, { bag: 5 },
        { tray: 3, bag: 5 }, { bag: 5 }, { bag: 5 }, { bag: 5 },
    ]);
    if (!play.isWin() || play.steps !== 16) throw new Error('L25 must win in 16');
    if (play.trays[0].kind !== 'watermelon') throw new Error('L25 watermelon tray');
    if (LEVEL_25.loseable !== true) throw new Error('L25 loseable');
    console.log('L25 OK', audit.variantCount);
}

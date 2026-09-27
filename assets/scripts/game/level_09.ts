import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { auditVisibleInformation } from './VisibleInformationAudit';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 9 关：第一次锁错。小件都在栈顶，放进左侧大格会凑不满。柜台关。 */
export const LEVEL_09: LevelDef = {
    id: 9,
    title: '小件别进大格',
    teach: '两件的食物放进两件格，别放进四件格',
    trays: [{ cap: 4 }, { cap: 2 }, { cap: 2 }],
    bags: [
        ['milk', 'fruit'],
        ['milk', 'fruit'],
        ['milk', 'veg'],
        ['milk', 'veg'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel09(): void {
    assertLevel(LEVEL_09);
    assertRedoLayout(LEVEL_09);
    const audit = auditVisibleInformation(LEVEL_09);
    if (!audit.passes) throw new Error(`L9 audit failed: ${audit.failures.join(',')}`);

    const b = BoardState.fromLevel(LEVEL_09);
    if (b.bufferEnabled) throw new Error('L9 bufferEnabled must be false');
    if (b.trays.length !== 3 || b.bags.length !== 4) throw new Error('L9 shape');
    if (b.trays[0].cap !== 4 || b.trays[1].cap !== 2 || b.trays[2].cap !== 2) {
        throw new Error('L9 caps');
    }
    if (b.peekBag(0) !== 'fruit' || b.peekBag(1) !== 'fruit' || b.peekBag(2) !== 'veg' || b.peekBag(3) !== 'veg') {
        throw new Error('L9 tops must show both small kinds');
    }
    if (!b.dest || b.dest.kind !== 'tray' || b.dest.index !== 0) {
        throw new Error('L9 default dest must be the big tray');
    }

    const trap = BoardState.fromLevel(LEVEL_09);
    playScript(trap, [
        { bag: 0 },
        { bag: 1 },
        { tray: 1, bag: 2 },
        { bag: 3 },
    ], 'L9');
    if (trap.isWin() || trap.failReason() !== 'locked_out') {
        throw new Error(`L9 fruit in cap4 must lock out, got ${trap.failReason()}`);
    }

    const play = BoardState.fromLevel(LEVEL_09);
    playScript(play, [
        { tray: 1, bag: 0 },
        { bag: 1 },
        { tray: 2, bag: 2 },
        { bag: 3 },
        { tray: 0, bag: 0 },
        { bag: 1 },
        { bag: 2 },
        { bag: 3 },
    ], 'L9');
    if (!play.isWin() || play.steps !== 8) throw new Error('L9 must win in 8 steps');
    if (play.trays[0].kind !== 'milk' || play.trays[1].kind !== 'fruit' || play.trays[2].kind !== 'veg') {
        throw new Error('L9 kinds');
    }
}

import { auditVisibleInformation } from './VisibleInformationAudit';
import type { LevelDef } from './types';

const SAFE_EQUAL_CAP: LevelDef = {
    id: 5,
    title: 'audit-safe-equal-cap',
    teach: '',
    trays: [{ cap: 2 }, { cap: 2 }],
    bags: [
        ['veg', 'milk'],
        ['milk', 'veg'],
    ],
    buffer: 3,
    loseable: false,
};

const VISIBLE_CAPACITY_CHOICE: LevelDef = {
    id: 9,
    title: 'audit-visible-capacity-choice',
    teach: '',
    trays: [{ cap: 2 }, { cap: 4 }],
    bags: [
        ['milk'],
        ['milk'],
        ['veg'],
        ['veg'],
        ['veg'],
        ['veg'],
    ],
    buffer: 3,
    loseable: true,
};

const HIDDEN_LEVEL_9: LevelDef = {
    ...VISIBLE_CAPACITY_CHOICE,
    bags: [
        ['milk', 'milk'],
        ['veg', 'veg'],
        ['veg'],
        ['veg'],
    ],
};

const BUFFERED_HIDDEN: LevelDef = {
    id: 10,
    title: 'audit-buffered-hidden',
    teach: '',
    trays: [{ cap: 2 }, { cap: 2 }],
    bags: [
        ['veg', 'milk'],
        ['milk', 'veg'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckVisibleInformationAudit(): void {
    const safe = auditVisibleInformation(SAFE_EQUAL_CAP);
    if (!safe.passes) throw new Error(`visible audit safe fixture failed: ${safe.failures.join(',')}`);
    if (safe.variantCount !== 2) throw new Error(`visible audit expected 2 variants, got ${safe.variantCount}`);
    if (!safe.allLegalVisibleMovesSafe) throw new Error('equal-cap fixture must keep every visible move safe');
    if (safe.forcedGuessAt != null) throw new Error('equal-cap fixture must not force a guess');

    const visibleChoice = auditVisibleInformation(VISIBLE_CAPACITY_CHOICE);
    if (!visibleChoice.passes) {
        throw new Error(`visible capacity fixture failed: ${visibleChoice.failures.join(',')}`);
    }
    if (visibleChoice.initialSafeActionCount <= 0) throw new Error('level 9 fixture needs a safe route');
    if (visibleChoice.initialSafeActionCount >= visibleChoice.initialLegalActionCount) {
        throw new Error('level 9 fixture needs a visible wrong-capacity route');
    }

    const hiddenNine = auditVisibleInformation(HIDDEN_LEVEL_9);
    if (hiddenNine.passes || hiddenNine.failures.indexOf('level_9_small_kind_not_on_top') < 0) {
        throw new Error('level 9 audit must reject a small kind buried under the top');
    }

    const deepButCounted: LevelDef = {
        ...VISIBLE_CAPACITY_CHOICE,
        bags: [
            ['veg', 'milk'],
            ['veg', 'milk'],
            ['veg'],
            ['veg'],
        ],
    };
    const deepNine = auditVisibleInformation(deepButCounted);
    if (!deepNine.passes) throw new Error(`level 9 depth-2 counted fixture failed: ${deepNine.failures.join(',')}`);
    if (deepNine.maxHiddenDepth < 2) throw new Error('level 9 depth-2 fixture must keep a buried layer');

    const buffered = auditVisibleInformation(BUFFERED_HIDDEN);
    if (!buffered.passes) throw new Error(`buffered hidden fixture failed: ${buffered.failures.join(',')}`);
    if (buffered.maxBufferNeeded == null || buffered.maxBufferNeeded > 3) {
        throw new Error('buffered fixture must fit the three-slot counter');
    }

    const budgeted = auditVisibleInformation(SAFE_EQUAL_CAP, { maxVariants: 1 });
    if (!budgeted.truncated || budgeted.passes || budgeted.failures.indexOf('audit_budget_exceeded') < 0) {
        throw new Error('truncated audit must fail closed');
    }
}

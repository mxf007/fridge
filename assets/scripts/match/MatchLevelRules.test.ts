import { matchLevelById } from './MatchLevels';
import {
    freeReshufflesBudgetForLevel,
    hintsBudgetForLevel,
    isFixedLayoutLevel,
    isNoHintsLevel,
    matchStepLimitForLevel,
    milestoneBadgeIdForLevel,
    shouldAutoOrganizeOnEnter,
} from './MatchLevelRules';

export function selfCheckMatchLevelRules(): void {
    for (const id of [1, 2, 9]) {
        const level = matchLevelById(id);
        if (!level) throw new Error(`M${id} missing`);
        if (!isFixedLayoutLevel(level)) throw new Error(`M${id} must be fixedLayout`);
    }

    const m14 = matchLevelById(14);
    const m15 = matchLevelById(15);
    if (!m14 || !m15) throw new Error('M14/M15 missing');
    if (!isFixedLayoutLevel(m14)) throw new Error('M14 must be fixedLayout');
    if (isNoHintsLevel(m14)) throw new Error('M14 must not be noHints');
    if (!isNoHintsLevel(m15)) throw new Error('M15 must be noHints');
    if (isFixedLayoutLevel(m15)) throw new Error('M15 must not be fixedLayout');
    const m1 = matchLevelById(1);
    const m2 = matchLevelById(2);
    const m3Hints = matchLevelById(3);
    if (!m1 || !m2 || !m3Hints) throw new Error('M1/M2/M3 missing');
    if (hintsBudgetForLevel(m1) !== 1) throw new Error('M1 hints budget');
    if (hintsBudgetForLevel(m2) !== 1) throw new Error('M2 hints budget');
    if (hintsBudgetForLevel(m3Hints) !== 1) throw new Error('M3 hints budget');
    if (hintsBudgetForLevel(m14) !== 2) throw new Error('M14 hints budget');
    if (hintsBudgetForLevel(m15) !== 0) throw new Error('M15 hints budget');
    const m17 = matchLevelById(17);
    if (!m17) throw new Error('M17 missing');
    if (hintsBudgetForLevel(m17) !== 1) throw new Error('M17 hints budget');
    const m3 = matchLevelById(3);
    const m7 = matchLevelById(7);
    if (!m3 || !m7) throw new Error('M3/M7 missing');
    if (shouldAutoOrganizeOnEnter(m3)) throw new Error('M3 must use template layout');
    if (shouldAutoOrganizeOnEnter(m7)) throw new Error('M7 must use template layout');
    const m4 = matchLevelById(4);
    if (!m4) throw new Error('M4 missing');
    if (shouldAutoOrganizeOnEnter(m1)) throw new Error('M1 fixed layout');
    if (shouldAutoOrganizeOnEnter(m4)) throw new Error('M4 must use template layout');

    const m18 = matchLevelById(18);
    const m20 = matchLevelById(20);
    if (!m18 || !m20) throw new Error('M18/M20 missing');
    if (!isFixedLayoutLevel(m18)) throw new Error('M18 fixedLayout');
    if (m20.maxFreeReshuffles !== 1) throw new Error('M20 maxFreeReshuffles');
    if (freeReshufflesBudgetForLevel(m20) !== 1) throw new Error('M20 reshuffle budget');

    const m24 = matchLevelById(24);
    const m25 = matchLevelById(25);
    if (!m24 || !m25) throw new Error('M24/M25 missing');
    if (!isFixedLayoutLevel(m24)) throw new Error('M24 fixedLayout');
    if (freeReshufflesBudgetForLevel(m25) !== 1) throw new Error('M25 reshuffle budget');
    if (isFixedLayoutLevel(m25)) throw new Error('M25 must allow enter shuffle');

    const m27 = matchLevelById(27);
    if (!m27) throw new Error('M27 missing');
    if (freeReshufflesBudgetForLevel(m27) !== 1) throw new Error('M27 reshuffle budget');

    const m30 = matchLevelById(30);
    if (!m30) throw new Error('M30 missing');
    if (isFixedLayoutLevel(m30)) throw new Error('M30 must allow enter shuffle');
    if (m30.rows !== 12 || m30.columns !== 8) throw new Error('M30 board size');

    const m5 = matchLevelById(5);
    const m16 = matchLevelById(16);
    if (!m5 || !m16) throw new Error('M5/M16 missing');
    if (matchStepLimitForLevel(m5) !== 16) throw new Error('M5 step limit');
    if (freeReshufflesBudgetForLevel(m14) !== 1) throw new Error('M14 reshuffle budget');
    if (freeReshufflesBudgetForLevel(m15) !== 1) throw new Error('M15 reshuffle budget');
    if (freeReshufflesBudgetForLevel(m16) !== 1) throw new Error('M16 reshuffle budget');
    const m8 = matchLevelById(8);
    if (!m8) throw new Error('M8 missing');
    if (freeReshufflesBudgetForLevel(m8) !== 1) throw new Error('M8 reshuffle budget');
    if (milestoneBadgeIdForLevel(10) !== 'match_badge_10') throw new Error('badge 10');
    if (milestoneBadgeIdForLevel(20) !== 'match_badge_20') throw new Error('badge 20');
    if (milestoneBadgeIdForLevel(30) !== 'match_badge_30') throw new Error('badge 30');
}

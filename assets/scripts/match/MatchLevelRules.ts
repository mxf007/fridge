import { isMatchIce } from './MatchCells';
import type { MatchLevelDef } from './MatchTypes';

export function isFixedLayoutLevel(level: MatchLevelDef): boolean {
    return level.fixedLayout === true;
}

export function isNoHintsLevel(level: MatchLevelDef): boolean {
    return level.noHints === true;
}

/** 每一关都能整理 1 次，用完即止。 */
export function freeReshufflesBudgetForLevel(_level: MatchLevelDef): number | null {
    return 1;
}

/** 仅教学关进关自动洗牌；其余关按表内 layout 开局（谜题关本就固定）。 */
export function shouldAutoOrganizeOnEnter(level: MatchLevelDef): boolean {
    if (isFixedLayoutLevel(level)) return false;
    return level.id <= 2;
}

/** 成功配对计 1 步；null 表示不限步。 */
export function matchStepLimitForLevel(level: MatchLevelDef): number | null {
    if (level.id === 5) return 16;
    return null;
}

export function milestoneBadgeIdForLevel(levelId: number): string | null {
    if (levelId === 10) return 'match_badge_10';
    if (levelId === 20) return 'match_badge_20';
    if (levelId === 30) return 'match_badge_30';
    return null;
}

export function milestoneBadgeTitle(badgeId: string): string {
    if (badgeId === 'match_badge_10') return '第六层开门';
    if (badgeId === 'match_badge_20') return '半层整理';
    if (badgeId === 'match_badge_30') return '终局一层';
    return badgeId;
}

export function allowsDeadlockReshuffle(_level: MatchLevelDef, remaining: number | null): boolean {
    if (remaining == null) return true;
    return remaining > 0;
}

const MAX_HINTS = 3;

/** 本关提示次数；0 表示不可用，最多 3 次。 */
export function hintsBudgetForLevel(level: MatchLevelDef): number {
    if (isNoHintsLevel(level)) return 0;
    const budget = level.id <= 3 ? 1 : level.id <= 14 ? 2 : 1;
    return Math.min(MAX_HINTS, budget);
}

export function levelHasIceBlocks(level: MatchLevelDef): boolean {
    for (let row = 0; row < level.layout.length; row++) {
        const line = level.layout[row];
        for (let column = 0; column < line.length; column++) {
            if (isMatchIce(line[column])) return true;
        }
    }
    return false;
}

export function rulePlateExtraForLevel(level: MatchLevelDef): string | null {
    const parts: string[] = [];
    const stepLimit = matchStepLimitForLevel(level);
    if (stepLimit != null) parts.push(`限步 ${stepLimit}`);
    if (levelHasIceBlocks(level)) parts.push('冰格：收拢时当墙，线不可穿');
    const linkTurns = level.maxLinkTurns ?? 2;
    if (linkTurns === 1) parts.push('连线最多 1 折');
    if (isFixedLayoutLevel(level)) parts.push('谜题关：盘面固定，请按顺序消除');
    else if (isNoHintsLevel(level)) parts.push('挑战关：不使用提示');
    const reshuffleCap = freeReshufflesBudgetForLevel(level);
    if (reshuffleCap === 1) parts.push('整理仅 1 次');
    else if (reshuffleCap === 2) parts.push('整理仅 2 次');
    else if (reshuffleCap === 0 && !isFixedLayoutLevel(level)) parts.push('零整理冲星');
    return parts.length > 0 ? parts.join(' · ') : null;
}

export function winSubtitleForLevel(
    level: MatchLevelDef,
    hintsUsed: number,
    firstClear: boolean,
    reshufflesUsed = 0,
    matchSteps = 0,
): string | null {
    if (level.id === 30 && firstClear) return '里程碑：终局一层';
    if (level.id === 20 && firstClear) return '里程碑：半层整理';
    if (level.id === 10 && firstClear) return '里程碑：第六层开门';
    if (isNoHintsLevel(level)) return '挑战达成：未使用提示';
    if (isFixedLayoutLevel(level) && hintsUsed === 0) return '谜题关清盘';
    const stepLimit = matchStepLimitForLevel(level);
    if (stepLimit != null && hintsUsed === 0 && matchSteps > 0 && matchSteps <= stepLimit) {
        return `限步达成：${matchSteps} 步清盘`;
    }
    const reshuffleCap = freeReshufflesBudgetForLevel(level);
    if (reshuffleCap === 1 && hintsUsed === 0 && reshufflesUsed === 0) {
        return '挑战达成：未用整理';
    }
    if (reshuffleCap === 0 && !isFixedLayoutLevel(level) && reshufflesUsed === 0) {
        return '挑战达成：零整理清盘';
    }
    return null;
}

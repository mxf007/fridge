import {
    gmJumpMatchProgress,
    markMatchLevelCleared,
    markMatchLevelClearedWithBadge,
    mergeMatchProgress,
    MATCH_PROGRESS_KEY,
    readMatchProgress,
    setCurrentMatchLevel,
    type MatchKv,
} from './MatchSave';

class MemoryKv implements MatchKv {
    private values: Record<string, string> = {};

    getItem(key: string): string | null {
        return Object.prototype.hasOwnProperty.call(this.values, key) ? this.values[key] : null;
    }

    setItem(key: string, value: string): void {
        this.values[key] = value;
    }
}

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
    if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}

export function selfCheckMatchSave(): void {
    const ids = [1, 2, 3, 4, 5, 6];
    const kv = new MemoryKv();
    let progress = readMatchProgress(kv, ids);
    assertEqual(progress.unlockedLevelId, 1, 'fresh unlocked level');
    assertEqual(progress.currentLevelId, 1, 'fresh current level');
    assertEqual(progress.clearedLevelIds.length, 0, 'fresh cleared levels');

    const clear1 = markMatchLevelCleared(kv, progress, 1, ids);
    assert(clear1.firstClear, 'first clear flag');
    progress = clear1.progress;
    assertEqual(progress.unlockedLevelId, 2, 'clear level 1 unlocks level 2');
    assertEqual(progress.currentLevelId, 2, 'clear level 1 advances current level');
    assertEqual(progress.clearedLevelIds.join(','), '1', 'clear level list');

    const replay1 = markMatchLevelCleared(kv, progress, 1, ids);
    assert(!replay1.firstClear, 'replay must not be a first clear');
    assertEqual(replay1.progress.clearedLevelIds.join(','), '1', 'replay must not duplicate clear record');

    progress = setCurrentMatchLevel(kv, progress, 1, ids);
    assertEqual(progress.currentLevelId, 1, 'unlocked replay selection');
    progress = setCurrentMatchLevel(kv, progress, 6, ids);
    assertEqual(progress.currentLevelId, 1, 'locked level selection must be ignored');

    kv.setItem(MATCH_PROGRESS_KEY, '{broken json');
    progress = readMatchProgress(kv, ids);
    assertEqual(progress.unlockedLevelId, 1, 'broken JSON fallback');

    kv.setItem(MATCH_PROGRESS_KEY, JSON.stringify({
        version: 1,
        unlockedLevelId: 99,
        currentLevelId: 6,
        clearedLevelIds: [1, 3, 6, 99, 1],
    }));
    progress = readMatchProgress(kv, ids);
    assertEqual(progress.clearedLevelIds.join(','), '1', 'non-contiguous clears must be trimmed');
    assertEqual(progress.unlockedLevelId, 2, 'sanitized unlocked level');
    assertEqual(progress.currentLevelId, 2, 'locked current level must clamp to unlocked');

    kv.setItem(MATCH_PROGRESS_KEY, JSON.stringify({
        version: 999,
        unlockedLevelId: 6,
        currentLevelId: 6,
        clearedLevelIds: ids,
    }));
    progress = readMatchProgress(kv, ids);
    assertEqual(progress.currentLevelId, 1, 'unknown save version fallback');

    const completeKv = new MemoryKv();
    progress = readMatchProgress(completeKv, ids);
    for (let id = 1; id <= 6; id++) {
        const result = markMatchLevelCleared(completeKv, progress, id, ids);
        assert(result.firstClear, `M${id} first clear`);
        progress = result.progress;
    }
    assertEqual(progress.clearedLevelIds.join(','), ids.join(','), 'all levels cleared');
    assertEqual(progress.unlockedLevelId, 6, 'last level stays unlocked');
    assertEqual(progress.currentLevelId, 6, 'last clear stays on final level');

    const tenIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const badgeKv = new MemoryKv();
    let badgeProgress = readMatchProgress(badgeKv, tenIds);
    for (let id = 1; id < 10; id++) {
        badgeProgress = markMatchLevelCleared(badgeKv, badgeProgress, id, tenIds).progress;
    }
    const milestone = markMatchLevelClearedWithBadge(
        badgeKv,
        badgeProgress,
        10,
        tenIds,
        'match_badge_10',
    );
    assert(milestone.firstClear, 'M10 first clear');
    assertEqual(milestone.badgeEarned, 'match_badge_10', 'M10 badge earned');
    assertEqual(milestone.progress.badgeIds.join(','), 'match_badge_10', 'badge persisted');
    const replay = markMatchLevelClearedWithBadge(
        badgeKv,
        milestone.progress,
        10,
        tenIds,
        'match_badge_10',
    );
    assert(!replay.badgeEarned, 'replay no duplicate badge');

    const mergeIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const localM = readMatchProgress(new MemoryKv(), mergeIds);
    const remoteM = mergeMatchProgress(localM, {
        ...localM,
        unlockedLevelId: 3,
        currentLevelId: 3,
        clearedLevelIds: [1, 2],
        badgeIds: ['match_badge_10'],
    }, mergeIds);
    if (remoteM.unlockedLevelId !== 3 || remoteM.badgeIds.length !== 1) {
        throw new Error('mergeMatchProgress remote side');
    }
    const union = mergeMatchProgress({
        ...localM,
        unlockedLevelId: 5,
        clearedLevelIds: [1, 2, 3, 4],
        badgeIds: [],
    }, remoteM, mergeIds);
    assertEqual(union.unlockedLevelId, 5, 'merge keeps farther unlock');
    assertEqual(union.clearedLevelIds.join(','), '1,2,3,4', 'merge contiguous clears');
    assertEqual(union.badgeIds.join(','), 'match_badge_10', 'merge badges');

    const gmKv = new MemoryKv();
    const jumped = gmJumpMatchProgress(gmKv, [1, 2, 3, 4, 5], 4);
    assertEqual(jumped.currentLevelId, 4, 'gm jump current');
    assertEqual(jumped.unlockedLevelId, 4, 'gm jump unlock');
    assertEqual(jumped.clearedLevelIds.join(','), '1,2,3', 'gm jump cleared prefix');
    const reset = gmJumpMatchProgress(gmKv, [1, 2, 3, 4, 5], 0);
    assertEqual(reset.clearedLevelIds.length, 0, 'gm reset');
}

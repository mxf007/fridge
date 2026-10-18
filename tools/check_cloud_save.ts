import { readAlbum } from '../assets/scripts/game/AlbumState';
import type { AlbumKv } from '../assets/scripts/game/AlbumState';
import {
    canonProgress,
    emptyProgress,
    mergeProgress,
    progressFromCloud,
    readProgress,
    writeProgress,
} from '../assets/scripts/game/CloudSave';
import type { ProgressFile } from '../assets/scripts/game/CloudSave';

function memoryKv(): AlbumKv {
    const bag: Record<string, string> = {};
    return {
        getItem(key) { return bag[key] ?? null; },
        setItem(key, value) { bag[key] = value; },
    };
}

function file(partial: Partial<ProgressFile> & { entries?: ProgressFile['album']['entries'] }): ProgressFile {
    const base = emptyProgress();
    return {
        ...base,
        cleared: partial.cleared != null ? partial.cleared : base.cleared,
        bulkRunId: partial.bulkRunId != null ? partial.bulkRunId : base.bulkRunId,
        milestones: partial.milestones ? partial.milestones : base.milestones,
        mergeBestScore: partial.mergeBestScore != null ? partial.mergeBestScore : base.mergeBestScore,
        match: partial.match ? partial.match : base.match,
        album: { entries: partial.entries ? partial.entries : {} },
    };
}

const local = file({
    cleared: 4,
    milestones: { 10: false, 20: false, 30: false },
    entries: {
        '1': { firstClearSteps: null, bestSteps: 5, grade: 'cleared', kinds: ['milk'] },
        '4': { firstClearSteps: 8, bestSteps: 8, grade: 'cleared', kinds: ['veg'] },
    },
});
const remote = file({
    cleared: 10,
    milestones: { 10: true, 20: false, 30: false },
    entries: {
        '1': { firstClearSteps: 6, bestSteps: 4, grade: 'walnut', kinds: ['fruit'] },
        '4': { firstClearSteps: 9, bestSteps: 7, grade: 'sage', kinds: ['meat'] },
    },
});
const merged = mergeProgress(local, remote);
if (merged.cleared !== 10) throw new Error(`cleared ${merged.cleared}`);
if (!merged.milestones[10] || merged.milestones[20]) throw new Error('milestone or');
const l1 = merged.album.entries['1'];
if (!l1 || l1.kinds[0] !== 'fruit' || l1.firstClearSteps !== 6 || l1.bestSteps !== 4) {
    throw new Error(`real seal should replace migration ${JSON.stringify(l1)}`);
}
const l4 = merged.album.entries['4'];
if (!l4 || l4.kinds[0] !== 'veg' || l4.firstClearSteps !== 8 || l4.bestSteps !== 7) {
    throw new Error(`both real keeps local picture ${JSON.stringify(l4)}`);
}

const kept = mergeProgress(local, emptyProgress());
if (kept.cleared !== 4 || kept.album.entries['4'].kinds[0] !== 'veg') {
    throw new Error('empty cloud must not wipe local');
}

const junk = progressFromCloud({
    cleared: '12',
    milestones: { '10': true, '20': 0 },
    album: {
        entries: {
            '2': { firstClearSteps: 3, bestSteps: null, grade: 'nope', kinds: ['milk', 'tofu', null] },
            bad: { firstClearSteps: 1, bestSteps: 1, grade: 'cleared', kinds: ['milk'] },
        },
    },
    _openid: 'someone',
});
if (!junk || junk.cleared !== 12 || !junk.milestones[10] || junk.milestones[20]) throw new Error('cloud flags');
const j2 = junk.album.entries['2'];
if (!j2 || j2.bestSteps !== 3 || j2.grade !== 'cleared' || j2.kinds.join(',') !== 'milk,,') {
    throw new Error(`sanitize ${JSON.stringify(j2)}`);
}
if (junk.album.entries['bad']) throw new Error('bad key kept');
if (progressFromCloud(null) !== null) throw new Error('null cloud');

const kv = memoryKv();
writeProgress(kv, merged);
const round = readProgress(kv);
if (round.cleared !== 10 || round.milestones[10] !== true) throw new Error('roundtrip flags');
if (readAlbum(kv).entries['1'].kinds[0] !== 'fruit') throw new Error('roundtrip album');
if (canonProgress(round) !== canonProgress(merged)) throw new Error('canon drifted');

const matchLocal = emptyProgress();
matchLocal.match = {
    ...matchLocal.match,
    unlockedLevelId: 5,
    currentLevelId: 5,
    clearedLevelIds: [1, 2, 3, 4],
    badgeIds: [],
};
const matchRemote = emptyProgress();
matchRemote.match = {
    ...matchRemote.match,
    unlockedLevelId: 8,
    currentLevelId: 7,
    clearedLevelIds: [1, 2, 3, 4, 5, 6, 7],
    badgeIds: ['match_badge_10'],
};
const matchMerged = mergeProgress(matchLocal, matchRemote);
if (matchMerged.match.unlockedLevelId !== 8) throw new Error('match unlocked merge');
if (matchMerged.match.clearedLevelIds.join(',') !== '1,2,3,4,5,6,7') throw new Error('match cleared merge');
if (matchMerged.match.badgeIds.join(',') !== 'match_badge_10') throw new Error('match badge merge');

console.log('cloud save ok');

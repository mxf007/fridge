import { sys } from 'cc';
import { EDITOR, PREVIEW } from 'cc/env';
import { pushCloudProgress } from '../game/CloudSave';
import { MATCH_LEVEL_IDS } from './MatchLevels';
import { gmJumpMatchProgress } from './MatchSave';

type MatchGmHost = typeof globalThis & {
    gmMatch?: (level?: number) => void;
};

let reloadOpenMatch: (() => void) | null = null;

/** 配对模式已打开时，GM 跳关后刷新当前局。 */
export function setMatchGmReloadHandler(handler: (() => void) | null): void {
    reloadOpenMatch = handler;
}

export function bindMatchGm(): void {
    const devLog = PREVIEW || EDITOR;
    const host = globalThis as MatchGmHost;
    host.gmMatch = (level?: number) => {
        const maxId = MATCH_LEVEL_IDS[MATCH_LEVEL_IDS.length - 1];
        if (level == null) {
            if (devLog) {
                console.log(
                    `[match] gmMatch(n) 跳到第 n 层（解锁 1..n-1）；gmMatch(0) 重置；1–${maxId}`,
                );
            }
            return;
        }
        const progress = gmJumpMatchProgress(sys.localStorage, MATCH_LEVEL_IDS, level);
        void pushCloudProgress(sys.localStorage);
        reloadOpenMatch?.();
        if (devLog) {
            if (level === 0) {
                console.log('[match] gmMatch(0) 已重置配对进度');
            } else {
                console.log(
                    `[match] gmMatch(${Math.floor(level)}) → 当前第 ${progress.currentLevelId} 层，`
                    + `已解锁至 ${progress.unlockedLevelId}`,
                );
            }
        }
    };
    if (devLog) console.log('[match] 调关：gmMatch(24) 或先进配对再 gmMatch(24)');
}

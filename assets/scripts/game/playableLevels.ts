import { REGISTERED_LEVELS } from './levelIndex';
import type { LevelDef } from './types';

/** 已落地关；分母 = length。新发关只维护 levelIndex.ts 的 REGISTERED_LEVELS。 */
export const PLAYABLE: LevelDef[] = REGISTERED_LEVELS;

export function playableLevelCount(): number {
    return PLAYABLE.length;
}

export function levelById(id: number): LevelDef | null {
    for (let i = 0; i < PLAYABLE.length; i++) {
        if (PLAYABLE[i].id === id) return PLAYABLE[i];
    }
    return null;
}

export function nextPlayable(afterId: number): LevelDef | null {
    for (let i = 0; i < PLAYABLE.length; i++) {
        if (PLAYABLE[i].id === afterId + 1) return PLAYABLE[i];
    }
    return null;
}

import type { FoodId } from '../game/types';
import type { MatchTile } from './MatchTypes';

/** 固定障碍：不可消除。收拢时当墙，把这一行或这一列切成互不相通的段；连线不可穿过。 */
export const MATCH_ICE = 'ice' as const;
export type MatchIceCell = typeof MATCH_ICE;
export type MatchCell = MatchTile | null | MatchIceCell;

export function isMatchFood(cell: MatchCell): cell is MatchTile {
    return cell != null && cell !== MATCH_ICE;
}

export function isMatchIce(cell: MatchCell): boolean {
    return cell === MATCH_ICE;
}

/** 连线可经过的格（仅空位；冰格不可过）。 */
export function isLinkPassableCell(cell: MatchCell): boolean {
    return cell == null;
}

export function isFoodId(cell: MatchCell): cell is FoodId {
    return isMatchFood(cell);
}

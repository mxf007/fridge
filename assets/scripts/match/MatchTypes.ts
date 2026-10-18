import type { FoodId } from '../game/types';
import type { MatchCell } from './MatchCells';
export type { MatchCell, MatchIceCell } from './MatchCells';
export { MATCH_ICE, isMatchFood, isMatchIce, isLinkPassableCell } from './MatchCells';

/** 行 0 在上，列 0 在左。路径点允许落在棋盘外围一格。 */
export type MatchPoint = {
    row: number;
    column: number;
};

export type MatchDirection = 'left' | 'right' | 'up' | 'down';
export type MatchTile = FoodId;
export type MatchGrid = MatchCell[][];
export type MatchStatus = 'running' | 'win' | 'deadlock';

export type MatchPath = {
    /** 从起点到终点经过的每一个相邻格，含端点。 */
    cells: MatchPoint[];
    /** 绘制连线所需的端点和转角点。 */
    points: MatchPoint[];
    turns: number;
};

export type MatchPair = {
    first: MatchPoint;
    second: MatchPoint;
    path: MatchPath;
};

export type MatchTileMove = {
    tile: MatchTile;
    from: MatchPoint;
    to: MatchPoint;
};

export type MatchShuffleResult =
    | {
        ok: true;
        attempts: number;
        grid: MatchGrid;
    }
    | {
        ok: false;
    };

export type MatchLevelDef = {
    id: number;
    title?: string;
    rows: number;
    columns: number;
    collapse: MatchDirection;
    layout: MatchGrid;
    /** 谜题关：进关不洗牌，死局不提供「重新整理」。 */
    fixedLayout?: boolean;
    /** 挑战关：禁用提示（如第 15 关「不用提示」）。 */
    noHints?: boolean;
    /** 本局死局「重新整理」次数；省略表示不限。谜题关（fixedLayout）视为 0。 */
    maxFreeReshuffles?: number;
    /** 连线最多转折次数；默认 2。专家关可设为 1。 */
    maxLinkTurns?: number;
};

export type MatchSelectResult =
    | {
        kind: 'selected';
        point: MatchPoint;
    }
    | {
        kind: 'switched';
        point: MatchPoint;
        reason: 'different_tile' | 'blocked';
    }
    | {
        kind: 'rejected';
        reason: 'empty' | 'same_cell' | 'out_of_bounds' | 'not_running';
    }
    | {
        kind: 'matched';
        first: MatchPoint;
        second: MatchPoint;
        path: MatchPath;
        movements: MatchTileMove[];
        status: MatchStatus;
    };

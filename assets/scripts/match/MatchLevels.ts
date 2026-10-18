import { isMatchIce } from './MatchCells';
import { assertMatchLevel, hasMatchClearSolution } from './MatchBoardState';
import { findAnyLink } from './MatchSolver';
import { MATCH_LEVELS_11_30 } from './matchLevels11_30.generated';
import type { MatchLevelDef } from './MatchTypes';

/** 配对模式计划关数（selfCheck 校验须与此一致）。 */
export const MATCH_PLANNED_LEVEL_COUNT = 30;

/** 1–10 关按 docs/冰箱配对_30关目录.md 手工/半手工模板；11–30 见 matchLevels11_30.generated.ts。 */
const MATCH_LEVELS_1_10: readonly MatchLevelDef[] = [
    {
        id: 1,
        title: '第一次配对',
        rows: 2,
        columns: 4,
        collapse: 'left',
        fixedLayout: true,
        layout: [
            ['milk', 'veg', 'milk', 'veg'],
            ['veg', 'milk', 'veg', 'milk'],
        ],
    },
    {
        id: 2,
        title: '往下滑一滑',
        rows: 3,
        columns: 4,
        collapse: 'down',
        fixedLayout: true,
        layout: [
            ['milk', 'veg', 'fruit', 'milk'],
            ['veg', 'fruit', 'milk', 'veg'],
            ['fruit', 'milk', 'veg', 'fruit'],
        ],
    },
    {
        id: 3,
        title: '向左收',
        rows: 4,
        columns: 4,
        collapse: 'left',
        layout: [
            ['milk', 'fruit', 'meat', 'veg'],
            ['fruit', 'milk', 'veg', 'fruit'],
            ['meat', 'veg', 'fruit', 'meat'],
            ['milk', 'meat', 'veg', 'milk'],
        ],
    },
    {
        id: 4,
        title: '向下收',
        rows: 4,
        columns: 4,
        collapse: 'down',
        layout: [
            ['veg', 'meat', 'milk', 'fruit'],
            ['meat', 'fruit', 'veg', 'milk'],
            ['veg', 'milk', 'fruit', 'veg'],
            ['fruit', 'meat', 'milk', 'meat'],
        ],
    },
    {
        id: 5,
        title: '限步小试',
        rows: 4,
        columns: 4,
        collapse: 'right',
        layout: [
            ['meat', 'fruit', 'meat', 'milk'],
            ['milk', 'meat', 'veg', 'fruit'],
            ['veg', 'milk', 'fruit', 'veg'],
            ['fruit', 'veg', 'milk', 'meat'],
        ],
    },
    {
        id: 6,
        title: '向上收',
        rows: 4,
        columns: 4,
        collapse: 'up',
        layout: [
            ['fruit', 'meat', 'fruit', 'veg'],
            ['veg', 'fruit', 'veg', 'milk'],
            ['meat', 'veg', 'milk', 'meat'],
            ['milk', 'meat', 'fruit', 'milk'],
        ],
    },
    {
        id: 7,
        title: '四种满盘',
        rows: 4,
        columns: 4,
        collapse: 'left',
        layout: [
            ['milk', 'fruit', 'meat', 'fruit'],
            ['veg', 'meat', 'milk', 'veg'],
            ['meat', 'veg', 'meat', 'fruit'],
            ['veg', 'milk', 'fruit', 'milk'],
        ],
    },
    {
        id: 8,
        title: '五种宽盘',
        rows: 4,
        columns: 5,
        collapse: 'right',
        layout: [
            ['meat', 'veg', 'sauce', 'meat', 'milk'],
            ['milk', 'fruit', 'milk', 'veg', 'fruit'],
            ['sauce', 'meat', 'sauce', 'milk', 'sauce'],
            ['meat', 'fruit', 'veg', 'fruit', 'veg'],
        ],
    },
    {
        id: 9,
        title: '长盘一道弯',
        rows: 5,
        columns: 4,
        collapse: 'down',
        fixedLayout: true,
        layout: [
            ['meat', 'sauce', 'fruit', 'veg'],
            ['veg', 'milk', 'sauce', 'fruit'],
            ['fruit', 'sauce', 'milk', 'meat'],
            ['meat', 'milk', 'meat', 'sauce'],
            ['veg', 'fruit', 'milk', 'veg'],
        ],
    },
    {
        id: 10,
        title: '第六层开门',
        rows: 4,
        columns: 6,
        collapse: 'left',
        layout: [
            ['fruit', 'veg', 'milk', 'veg', 'meat', 'veg'],
            ['grape', 'milk', 'meat', 'milk', 'grape', 'sauce'],
            ['fruit', 'sauce', 'fruit', 'grape', 'milk', 'meat'],
            ['sauce', 'grape', 'veg', 'fruit', 'meat', 'sauce'],
        ],
    },
];

export const MATCH_LEVELS: readonly MatchLevelDef[] = [
    ...MATCH_LEVELS_1_10,
    ...MATCH_LEVELS_11_30,
];

export const MATCH_LEVEL_IDS: readonly number[] = MATCH_LEVELS.map((level) => level.id);

export function matchLevelById(id: number): MatchLevelDef | null {
    for (let i = 0; i < MATCH_LEVELS.length; i++) {
        if (MATCH_LEVELS[i].id === id) return MATCH_LEVELS[i];
    }
    return null;
}

export function nextMatchLevelId(id: number): number | null {
    for (let i = 0; i < MATCH_LEVELS.length - 1; i++) {
        if (MATCH_LEVELS[i].id === id) return MATCH_LEVELS[i + 1].id;
    }
    return null;
}

export function selfCheckMatchLevels(): void {
    if (MATCH_LEVELS.length !== MATCH_PLANNED_LEVEL_COUNT) {
        throw new Error(
            `expected ${MATCH_PLANNED_LEVEL_COUNT} match levels, got ${MATCH_LEVELS.length}`,
        );
    }
    const ids = new Set<number>();
    const layouts = new Set<string>();
    for (let i = 0; i < MATCH_LEVELS.length; i++) {
        const level = MATCH_LEVELS[i];
        assertMatchLevel(level);
        if (level.columns > 8 || level.rows > 12) {
            throw new Error(`M${level.id} exceeds 8 columns x 12 rows (${level.rows}x${level.columns})`);
        }
        if (level.id !== i + 1) throw new Error(`match levels must be contiguous at index ${i}`);
        if (ids.has(level.id)) throw new Error(`duplicate match level id ${level.id}`);
        ids.add(level.id);
        const layoutKey = JSON.stringify(level.layout);
        if (layouts.has(layoutKey)) throw new Error(`duplicate match layout M${level.id}`);
        layouts.add(layoutKey);
        const maxTurns = level.maxLinkTurns ?? 2;
        if (!findAnyLink(level.layout, maxTurns)) throw new Error(`M${level.id} has no initial move`);
        if (!hasMatchClearSolution(level.layout, level.collapse, 100000, level.maxLinkTurns ?? 2)) {
            throw new Error(`M${level.id} cannot be fully cleared`);
        }
        const wantsIce = level.id === 19 || level.id === 26 || level.id === 29;
        let ice = 0;
        for (let row = 0; row < level.layout.length; row++) {
            for (let column = 0; column < level.layout[row].length; column++) {
                if (isMatchIce(level.layout[row][column])) ice += 1;
            }
        }
        if (wantsIce && ice === 0) throw new Error(`M${level.id} should keep ice`);
        if (!wantsIce && ice > 0) throw new Error(`M${level.id} should not have ice`);
        if (level.id <= 10) {
            for (let row = 0; row < level.rows; row++) {
                for (let column = 0; column < level.columns; column++) {
                    const tile = level.layout[row][column];
                    const right = column + 1 < level.columns && level.layout[row][column + 1] === tile;
                    const below = row + 1 < level.rows && level.layout[row + 1][column] === tile;
                    if (right || below) {
                        throw new Error(`M${level.id} has adjacent ${tile} at ${row}:${column}`);
                    }
                }
            }
        }
    }
}

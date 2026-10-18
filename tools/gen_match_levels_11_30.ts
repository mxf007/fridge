/**
 * Emit MatchLevelDef layouts for ids in SPECS (solvable + ice-aware).
 * Run: npx tsx tools/gen_match_levels_11_30.ts
 *      npx tsx tools/gen_match_levels_11_30.ts --only=16,21
 */
import { hasMatchClearSolution, assertMatchLevel } from '../assets/scripts/match/MatchBoardState';
import { MATCH_ICE } from '../assets/scripts/match/MatchCells';
import { findAnyLink } from '../assets/scripts/match/MatchSolver';
import type { MatchDirection, MatchGrid, MatchLevelDef } from '../assets/scripts/match/MatchTypes';
import type { FoodId } from '../assets/scripts/game/types';

const FOODS: FoodId[] = [
    'milk', 'veg', 'fruit', 'meat', 'sauce', 'grape', 'lemon', 'kiwi',
    'leftover', 'pineapple', 'watermelon', 'coconut',
];

type Spec = {
    id: number;
    title: string;
    rows: number;
    columns: number;
    collapse: MatchDirection;
    holes: MatchPoint[];
    ice?: MatchPoint[];
    typeCount: number;
    pairsPerType?: number;
    maxLinkTurns?: number;
    maxFreeReshuffles?: number;
    noHints?: boolean;
};

type MatchPoint = { row: number; column: number };

/** 参考图：中部竖通道（空位），约第 3–4 行缺 1 列、5–6 行缺 2 列。 */
function channelVoidHoles(columns: number, rows: number): MatchPoint[] {
    const holes: MatchPoint[] = [];
    const narrowCol = Math.min(2, columns - 1);
    const wideLeft = Math.min(3, columns - 1);
    const wideRight = Math.min(4, columns - 1);
    if (rows >= 4) {
        holes.push({ row: 2, column: narrowCol }, { row: 3, column: narrowCol });
    }
    if (rows >= 6) {
        holes.push(
            { row: 4, column: wideLeft },
            { row: 4, column: wideRight },
            { row: 5, column: wideLeft },
            { row: 5, column: wideRight },
        );
    }
    return holes;
}

function rimHoles8x(rows: number): MatchPoint[] {
    return [
        { row: 0, column: 0 },
        { row: 0, column: 7 },
        { row: rows - 1, column: 0 },
        { row: rows - 1, column: 7 },
        { row: 0, column: 3 },
        { row: 0, column: 4 },
        { row: rows - 1, column: 3 },
        { row: rows - 1, column: 4 },
    ];
}

const SPECS: Spec[] = [
    { id: 11, title: '六方一角空', rows: 5, columns: 6, collapse: 'up', holes: [{ row: 2, column: 2 }, { row: 2, column: 3 }], typeCount: 6 },
    { id: 12, title: '六列入门', rows: 5, columns: 6, collapse: 'left', holes: [], typeCount: 6 },
    { id: 13, title: '六列下收', rows: 5, columns: 7, collapse: 'down', holes: [{ row: 2, column: 3 }], typeCount: 6 },
    { id: 15, title: '不用提示', rows: 5, columns: 7, collapse: 'left', holes: [{ row: 2, column: 3 }], typeCount: 6, noHints: true },
    {
        id: 16,
        title: '七方宽盘',
        rows: 7,
        columns: 8,
        collapse: 'down',
        holes: [],
        typeCount: 9,
    },
    {
        id: 17,
        title: '九种换面',
        rows: 7,
        columns: 8,
        collapse: 'right',
        holes: [],
        typeCount: 9,
    },
    {
        id: 19,
        title: '七列满收',
        rows: 8,
        columns: 9,
        collapse: 'left',
        holes: [],
        ice: [{ row: 3, column: 4 }, { row: 4, column: 4 }],
        typeCount: 8,
    },
    {
        id: 20,
        title: '半层整理',
        rows: 8,
        columns: 8,
        collapse: 'down',
        holes: [{ row: 0, column: 0 }, { row: 0, column: 7 }, { row: 7, column: 0 }, { row: 7, column: 7 }],
        typeCount: 9,
        maxFreeReshuffles: 1,
    },
    {
        id: 21,
        title: '八列长盘',
        rows: 8,
        columns: 10,
        collapse: 'right',
        holes: [],
        typeCount: 10,
    },
    {
        id: 22,
        title: '八列上收',
        rows: 8,
        columns: 10,
        collapse: 'up',
        holes: [],
        typeCount: 10,
    },
    {
        id: 23,
        title: '七列双洞',
        rows: 8,
        columns: 10,
        collapse: 'left',
        holes: [
            { row: 1, column: 2 },
            { row: 6, column: 2 },
            { row: 1, column: 7 },
            { row: 6, column: 7 },
        ],
        typeCount: 8,
    },
    {
        id: 25,
        title: '十字锁盘',
        rows: 8,
        columns: 9,
        collapse: 'right',
        holes: [{ row: 0, column: 0 }, ...channelVoidHoles(9, 8)],
        typeCount: 9,
        maxFreeReshuffles: 0,
    },
    {
        id: 26,
        title: '七方大盘',
        rows: 8,
        columns: 11,
        collapse: 'up',
        holes: [{ row: 3, column: 5 }, { row: 0, column: 0 }],
        ice: [{ row: 1, column: 5 }, { row: 6, column: 5 }],
        typeCount: 9,
    },
    {
        id: 27,
        title: '冷冻一层',
        rows: 8,
        columns: 12,
        collapse: 'left',
        holes: rimHoles8x(8).filter((p) => p.row === 0 || p.row === 7),
        typeCount: 12,
    },
    {
        id: 28,
        title: '八列收拢',
        rows: 8,
        columns: 12,
        collapse: 'right',
        holes: [...channelVoidHoles(12, 8), { row: 0, column: 0 }, { row: 0, column: 11 }, { row: 7, column: 0 }, { row: 7, column: 11 }],
        typeCount: 10,
    },
    {
        id: 29,
        title: '七乘八下收',
        rows: 9,
        columns: 12,
        collapse: 'down',
        holes: channelVoidHoles(12, 9),
        ice: [{ row: 1, column: 5 }, { row: 1, column: 6 }, { row: 7, column: 5 }, { row: 7, column: 6 }],
        typeCount: 11,
    },
    {
        id: 30,
        title: '终局一层',
        rows: 14,
        columns: 8,
        collapse: 'right',
        holes: [...rimHoles8x(14), ...channelVoidHoles(8, 14)],
        typeCount: 12,
    },
];

function holeSet(spec: Spec): Set<string> {
    const s = new Set<string>();
    for (const h of spec.holes) s.add(`${h.row}:${h.column}`);
    for (const p of spec.ice ?? []) s.add(`${p.row}:${p.column}`);
    return s;
}

function emptyGrid(rows: number, columns: number): MatchGrid {
    const g: MatchGrid = [];
    for (let r = 0; r < rows; r++) {
        const line: MatchGrid[number] = [];
        for (let c = 0; c < columns; c++) line.push(null);
        g.push(line);
    }
    return g;
}

function buildTiles(spec: Spec, cellCount: number): FoodId[] {
    const totalPairs = cellCount / 2;
    if (!Number.isInteger(totalPairs)) throw new Error(`M${spec.id} odd cell count ${cellCount}`);
    const tiles: FoodId[] = [];
    if (spec.pairsPerType != null) {
        for (let t = 0; t < spec.typeCount; t++) {
            const food = FOODS[t];
            for (let p = 0; p < spec.pairsPerType; p++) {
                tiles.push(food, food);
            }
        }
        return tiles;
    }
    const base = Math.floor(totalPairs / spec.typeCount);
    let extra = totalPairs - base * spec.typeCount;
    for (let t = 0; t < spec.typeCount; t++) {
        const food = FOODS[t];
        let pairs = base + (extra > 0 ? 1 : 0);
        if (extra > 0) extra -= 1;
        for (let p = 0; p < pairs; p++) {
            tiles.push(food, food);
        }
    }
    return tiles;
}

function shuffle<T>(arr: T[], seed: number): T[] {
    const out = arr.slice();
    let state = seed | 0;
    for (let i = out.length - 1; i > 0; i--) {
        state ^= state << 13;
        state ^= state >>> 17;
        state ^= state << 5;
        state |= 0;
        const j = (state >>> 0) % (i + 1);
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
    }
    return out;
}

function layoutComplexity(grid: MatchGrid): number {
    let score = 0;
    for (let row = 0; row < grid.length; row++) {
        let run = 1;
        for (let column = 1; column < grid[row].length; column++) {
            if (grid[row][column] === grid[row][column - 1] && grid[row][column] != null) run += 1;
            else {
                if (run >= 4) score += run;
                run = 1;
            }
        }
        if (run >= 4) score += run;
    }
    return score;
}

function tryBuild(spec: Spec, seed: number): MatchGrid | null {
    const blocked = holeSet(spec);
    const positions: MatchPoint[] = [];
    for (let r = 0; r < spec.rows; r++) {
        for (let c = 0; c < spec.columns; c++) {
            if (!blocked.has(`${r}:${c}`)) positions.push({ row: r, column: c });
        }
    }
    const tiles = buildTiles(spec, positions.length);
    if (tiles.length !== positions.length) {
        throw new Error(`M${spec.id} tile count ${tiles.length} != cells ${positions.length}`);
    }
    const shuffled = shuffle(tiles, seed);
    const grid = emptyGrid(spec.rows, spec.columns);
    for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        grid[p.row][p.column] = shuffled[i];
    }
    for (const p of spec.ice ?? []) {
        grid[p.row][p.column] = MATCH_ICE;
    }
    const maxTurns = spec.maxLinkTurns ?? 2;
    if (!findAnyLink(grid, maxTurns)) return null;
    if (!hasMatchClearSolution(grid, spec.collapse, 120000, maxTurns)) return null;
    if (spec.id >= 21 && layoutComplexity(grid) > 18) return null;
    return grid;
}

function layoutToTs(grid: MatchGrid): string {
    const lines = grid.map((row) => {
        const cells = row.map((c) => {
            if (c == null) return 'null';
            if (c === MATCH_ICE) return `'${MATCH_ICE}'`;
            return `'${c}'`;
        });
        return `            [${cells.join(', ')}],`;
    });
    return lines.join('\n');
}

function emitLevel(spec: Spec, grid: MatchGrid): void {
    const extras: string[] = [];
    if (spec.maxFreeReshuffles != null) extras.push(`        maxFreeReshuffles: ${spec.maxFreeReshuffles},`);
    if (spec.maxLinkTurns != null) extras.push(`        maxLinkTurns: ${spec.maxLinkTurns},`);
    if (spec.noHints) extras.push('        noHints: true,');
    const extraBlock = extras.length > 0 ? `${extras.join('\n')}\n` : '';
    console.log(`    {
        id: ${spec.id},
        title: '${spec.title}',
        rows: ${spec.rows},
        columns: ${spec.columns},
        collapse: '${spec.collapse}',
${extraBlock}        layout: [
${layoutToTs(grid)}
        ],
    },`);
}

const onlyArg = process.argv.find((a) => a.startsWith('--only='));
const onlyIds = onlyArg
    ? new Set(onlyArg.slice('--only='.length).split(',').map((s) => Number.parseInt(s, 10)))
    : null;

const specsToRun = onlyIds ? SPECS.filter((s) => onlyIds.has(s.id)) : SPECS;

for (const spec of specsToRun) {
    let grid: MatchGrid | null = null;
    for (let seed = spec.id * 997; seed < spec.id * 997 + 80000; seed++) {
        grid = tryBuild(spec, seed);
        if (grid) break;
    }
    if (!grid) {
        console.error(`Failed M${spec.id}`);
        process.exit(1);
    }
    const def: MatchLevelDef = {
        id: spec.id,
        title: spec.title,
        rows: spec.rows,
        columns: spec.columns,
        collapse: spec.collapse,
        layout: grid,
        maxFreeReshuffles: spec.maxFreeReshuffles,
        maxLinkTurns: spec.maxLinkTurns,
    };
    assertMatchLevel(def);
    emitLevel(spec, grid);
}

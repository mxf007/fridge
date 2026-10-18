import { isMatchFood, isLinkPassableCell } from './MatchCells';
import type { MatchGrid, MatchPair, MatchPath, MatchPoint } from './MatchTypes';

const DIRECTIONS = [
    { row: -1, column: 0 },
    { row: 0, column: 1 },
    { row: 1, column: 0 },
    { row: 0, column: -1 },
];

type SearchNode = {
    row: number;
    column: number;
    direction: number;
    turns: number;
    steps: number;
    serial: number;
    parent: SearchNode | null;
};

type BestCost = {
    turns: number;
    steps: number;
};

function samePoint(a: MatchPoint, b: MatchPoint): boolean {
    return a.row === b.row && a.column === b.column;
}

function dimensions(grid: MatchGrid): { rows: number; columns: number } | null {
    const rows = grid.length;
    if (rows === 0) return null;
    const columns = grid[0].length;
    if (columns === 0) return null;
    for (let row = 1; row < rows; row++) {
        if (grid[row].length !== columns) return null;
    }
    return { rows, columns };
}

function inPlayable(point: MatchPoint, rows: number, columns: number): boolean {
    return point.row >= 0 && point.row < rows && point.column >= 0 && point.column < columns;
}

function searchKey(row: number, column: number, direction: number): string {
    return `${row}:${column}:${direction}`;
}

function betterCost(turns: number, steps: number, old: BestCost | undefined): boolean {
    return !old || turns < old.turns || (turns === old.turns && steps < old.steps);
}

function compareSearchNode(a: SearchNode, b: SearchNode): number {
    if (a.turns !== b.turns) return a.turns - b.turns;
    if (a.steps !== b.steps) return a.steps - b.steps;
    return a.serial - b.serial;
}

function toPlayablePoint(node: SearchNode): MatchPoint {
    return { row: node.row - 1, column: node.column - 1 };
}

function buildPath(endNode: SearchNode, start: MatchPoint): MatchPath {
    const reversed: MatchPoint[] = [];
    let cursor: SearchNode | null = endNode;
    while (cursor) {
        reversed.push(toPlayablePoint(cursor));
        cursor = cursor.parent;
    }
    reversed.push({ row: start.row, column: start.column });
    reversed.reverse();

    const points: MatchPoint[] = [reversed[0]];
    for (let i = 1; i < reversed.length - 1; i++) {
        const before = reversed[i - 1];
        const current = reversed[i];
        const after = reversed[i + 1];
        const beforeDirection = {
            row: current.row - before.row,
            column: current.column - before.column,
        };
        const afterDirection = {
            row: after.row - current.row,
            column: after.column - current.column,
        };
        if (beforeDirection.row !== afterDirection.row || beforeDirection.column !== afterDirection.column) {
            points.push(current);
        }
    }
    points.push(reversed[reversed.length - 1]);
    return {
        cells: reversed,
        points,
        turns: Math.max(0, points.length - 2),
    };
}

/**
 * 查找两个相同图块之间不超过 maxTurns 次转折的路径。
 * 搜索空间在棋盘外包一圈空格，因此支持从棋盘边缘绕行。
 */
export function findLinkPath(
    grid: MatchGrid,
    start: MatchPoint,
    end: MatchPoint,
    maxTurns = 2,
): MatchPath | null {
    const size = dimensions(grid);
    if (!size || maxTurns < 0) return null;
    if (!inPlayable(start, size.rows, size.columns) || !inPlayable(end, size.rows, size.columns)) return null;
    if (samePoint(start, end)) return null;
    const startTile = grid[start.row][start.column];
    const endTile = grid[end.row][end.column];
    if (!isMatchFood(startTile) || !isMatchFood(endTile) || startTile !== endTile) return null;

    const paddedRows = size.rows + 2;
    const paddedColumns = size.columns + 2;
    const targetRow = end.row + 1;
    const targetColumn = end.column + 1;
    const startRow = start.row + 1;
    const startColumn = start.column + 1;
    const open: SearchNode[] = [];
    const best = new Map<string, BestCost>();
    let serial = 0;

    const isPassable = (row: number, column: number): boolean => {
        if (row <= 0 || row >= paddedRows - 1 || column <= 0 || column >= paddedColumns - 1) return true;
        if (row === targetRow && column === targetColumn) return true;
        return isLinkPassableCell(grid[row - 1][column - 1]);
    };

    for (let direction = 0; direction < DIRECTIONS.length; direction++) {
        const nextRow = startRow + DIRECTIONS[direction].row;
        const nextColumn = startColumn + DIRECTIONS[direction].column;
        if (
            nextRow < 0
            || nextRow >= paddedRows
            || nextColumn < 0
            || nextColumn >= paddedColumns
            || !isPassable(nextRow, nextColumn)
        ) {
            continue;
        }
        const node: SearchNode = {
            row: nextRow,
            column: nextColumn,
            direction,
            turns: 0,
            steps: 1,
            serial: serial++,
            parent: null,
        };
        open.push(node);
        best.set(searchKey(nextRow, nextColumn, direction), { turns: 0, steps: 1 });
    }

    while (open.length > 0) {
        open.sort(compareSearchNode);
        const current = open.shift() as SearchNode;
        const currentBest = best.get(searchKey(current.row, current.column, current.direction));
        if (
            !currentBest
            || current.turns !== currentBest.turns
            || current.steps !== currentBest.steps
        ) {
            continue;
        }
        if (current.row === targetRow && current.column === targetColumn) {
            return buildPath(current, start);
        }

        for (let direction = 0; direction < DIRECTIONS.length; direction++) {
            const turns = current.turns + (direction === current.direction ? 0 : 1);
            if (turns > maxTurns) continue;
            const nextRow = current.row + DIRECTIONS[direction].row;
            const nextColumn = current.column + DIRECTIONS[direction].column;
            if (
                nextRow < 0
                || nextRow >= paddedRows
                || nextColumn < 0
                || nextColumn >= paddedColumns
                || !isPassable(nextRow, nextColumn)
            ) {
                continue;
            }
            const steps = current.steps + 1;
            const key = searchKey(nextRow, nextColumn, direction);
            const old = best.get(key);
            if (!betterCost(turns, steps, old)) continue;
            best.set(key, { turns, steps });
            open.push({
                row: nextRow,
                column: nextColumn,
                direction,
                turns,
                steps,
                serial: serial++,
                parent: current,
            });
        }
    }
    return null;
}

/** 按行列稳定顺序返回第一对可消除图块。 */
export function findAnyLink(grid: MatchGrid, maxTurns = 2): MatchPair | null {
    const pairs = findAllLinks(grid, 1, maxTurns);
    return pairs.length > 0 ? pairs[0] : null;
}

/** 按稳定顺序枚举当前可消除组合；limit 用于求解器控制分支数量。 */
export function findAllLinks(
    grid: MatchGrid,
    limit = Number.MAX_SAFE_INTEGER,
    maxTurns = 2,
): MatchPair[] {
    const size = dimensions(grid);
    if (!size || limit <= 0) return [];
    const pointsByTile = new Map<string, MatchPoint[]>();
    const pairs: MatchPair[] = [];
    for (let row = 0; row < size.rows; row++) {
        for (let column = 0; column < size.columns; column++) {
            const tile = grid[row][column];
            if (!isMatchFood(tile)) continue;
            const points = pointsByTile.get(tile) || [];
            points.push({ row, column });
            pointsByTile.set(tile, points);
        }
    }
    for (const points of pointsByTile.values()) {
        for (let i = 0; i < points.length - 1; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const path = findLinkPath(grid, points[i], points[j], maxTurns);
                if (!path) continue;
                pairs.push({ first: points[i], second: points[j], path });
                if (pairs.length >= limit) return pairs;
            }
        }
    }
    return pairs;
}

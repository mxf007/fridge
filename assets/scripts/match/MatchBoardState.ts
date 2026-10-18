import { FOOD_IDS, type FoodId } from '../game/types';
import { isMatchFood, isMatchIce, MATCH_ICE } from './MatchCells';
import { findAllLinks, findAnyLink, findLinkPath } from './MatchSolver';
import type {
    MatchDirection,
    MatchGrid,
    MatchLevelDef,
    MatchPoint,
    MatchSelectResult,
    MatchShuffleResult,
    MatchStatus,
    MatchTileMove,
} from './MatchTypes';

function clonePoint(point: MatchPoint): MatchPoint {
    return { row: point.row, column: point.column };
}

function cloneGrid(grid: MatchGrid): MatchGrid {
    return grid.map((row) => row.slice());
}

function samePoint(a: MatchPoint, b: MatchPoint): boolean {
    return a.row === b.row && a.column === b.column;
}

function gridDimensions(grid: MatchGrid): { rows: number; columns: number } {
    const rows = grid.length;
    if (rows === 0) throw new Error('match grid needs at least one row');
    const columns = grid[0].length;
    if (columns === 0) throw new Error('match grid needs at least one column');
    for (let row = 1; row < rows; row++) {
        if (grid[row].length !== columns) throw new Error('match grid must be rectangular');
    }
    return { rows, columns };
}

function emptyGrid(rows: number, columns: number): MatchGrid {
    const result: MatchGrid = [];
    for (let row = 0; row < rows; row++) {
        const line = [];
        for (let column = 0; column < columns; column++) line.push(null);
        result.push(line);
    }
    return result;
}

function appendMove(
    movements: MatchTileMove[],
    tile: FoodId,
    fromRow: number,
    fromColumn: number,
    toRow: number,
    toColumn: number,
): void {
    if (fromRow === toRow && fromColumn === toColumn) return;
    movements.push({
        tile,
        from: { row: fromRow, column: fromColumn },
        to: { row: toRow, column: toColumn },
    });
}

/**
 * 按方向稳定收拢，同一段里图块的相对顺序不变。
 * 冰块是墙：食材不能越过，一行或一列被切成互不相通的段，各段单独收拢。
 * 返回新棋盘和表现层需要播放的位移，不修改输入棋盘。
 */
function collapseBoundedLine(
    cells: MatchGrid[number],
    towardStart: boolean,
): { line: MatchGrid[number]; shifts: { tile: FoodId; from: number; to: number }[] } {
    const line: MatchGrid[number] = cells.map((cell) => (isMatchIce(cell) ? MATCH_ICE : null));
    const shifts: { tile: FoodId; from: number; to: number }[] = [];
    const pack = (segmentStart: number, segmentEnd: number) => {
        const foods: { tile: FoodId; index: number }[] = [];
        for (let index = segmentStart; index < segmentEnd; index++) {
            const tile = cells[index];
            if (isMatchFood(tile)) foods.push({ tile, index });
        }
        const base = towardStart ? segmentStart : segmentEnd - foods.length;
        for (let i = 0; i < foods.length; i++) {
            const to = base + i;
            line[to] = foods[i].tile;
            if (foods[i].index !== to) shifts.push({ tile: foods[i].tile, from: foods[i].index, to });
        }
    };
    let segmentStart = 0;
    for (let index = 0; index <= cells.length; index++) {
        if (index === cells.length || isMatchIce(cells[index])) {
            pack(segmentStart, index);
            segmentStart = index + 1;
        }
    }
    return { line, shifts };
}

function collapseRow(
    rowCells: MatchGrid[number],
    direction: 'left' | 'right',
): { line: MatchGrid[number]; movements: MatchTileMove[] } {
    const packed = collapseBoundedLine(rowCells, direction === 'left');
    const movements: MatchTileMove[] = [];
    for (const shift of packed.shifts) {
        appendMove(movements, shift.tile, 0, shift.from, 0, shift.to);
    }
    return { line: packed.line, movements };
}

function collapseColumn(
    grid: MatchGrid,
    column: number,
    direction: 'up' | 'down',
): { movements: MatchTileMove[]; cells: MatchGrid[number] } {
    const columnCells = grid.map((row) => row[column]);
    const packed = collapseBoundedLine(columnCells, direction === 'up');
    const movements: MatchTileMove[] = [];
    for (const shift of packed.shifts) {
        appendMove(movements, shift.tile, shift.from, column, shift.to, column);
    }
    return { movements, cells: packed.line };
}

export function collapseMatchGrid(
    grid: MatchGrid,
    direction: MatchDirection,
): { grid: MatchGrid; movements: MatchTileMove[] } {
    const size = gridDimensions(grid);
    const result = emptyGrid(size.rows, size.columns);
    const movements: MatchTileMove[] = [];

    if (direction === 'left' || direction === 'right') {
        for (let row = 0; row < size.rows; row++) {
            const collapsed = collapseRow(grid[row], direction);
            result[row] = collapsed.line;
            for (const move of collapsed.movements) {
                appendMove(movements, move.tile, row, move.from.column, row, move.to.column);
            }
        }
        return { grid: result, movements };
    }

    for (let column = 0; column < size.columns; column++) {
        const collapsed = collapseColumn(grid, column, direction);
        for (let row = 0; row < size.rows; row++) {
            result[row][column] = collapsed.cells[row];
        }
        for (const move of collapsed.movements) {
            appendMove(movements, move.tile, move.from.row, column, move.to.row, column);
        }
    }
    return { grid: result, movements };
}

export function evaluateMatchStatus(grid: MatchGrid, maxLinkTurns = 2): MatchStatus {
    gridDimensions(grid);
    let hasTile = false;
    for (let row = 0; row < grid.length && !hasTile; row++) {
        for (let column = 0; column < grid[row].length; column++) {
            if (isMatchFood(grid[row][column])) {
                hasTile = true;
                break;
            }
        }
    }
    if (!hasTile) return 'win';
    return findAnyLink(grid, maxLinkTurns) ? 'running' : 'deadlock';
}

function serializeGrid(grid: MatchGrid): string {
    return grid
        .map((row) =>
            row
                .map((cell) => {
                    if (cell == null) return '-';
                    if (isMatchIce(cell)) return '#';
                    return cell;
                })
                .join(','),
        )
        .join('|');
}

/** 离线验证：按本关收拢方向，是否存在一条清空全部图块的路线。 */
export function hasMatchClearSolution(
    grid: MatchGrid,
    direction: MatchDirection,
    maxStates = 25000,
    maxLinkTurns = 2,
): boolean {
    const memo = new Map<string, boolean>();
    let visited = 0;
    const solve = (cells: MatchGrid): boolean => {
        let hasTile = false;
        for (let row = 0; row < cells.length && !hasTile; row++) {
            for (let column = 0; column < cells[row].length; column++) {
                if (isMatchFood(cells[row][column])) {
                    hasTile = true;
                    break;
                }
            }
        }
        if (!hasTile) return true;
        const key = serializeGrid(cells);
        const known = memo.get(key);
        if (known != null) return known;
        visited += 1;
        if (visited > maxStates) {
            memo.set(key, false);
            return false;
        }
        const pairs = findAllLinks(cells, 64, maxLinkTurns);
        for (let i = 0; i < pairs.length; i++) {
            const next = cloneGrid(cells);
            next[pairs[i].first.row][pairs[i].first.column] = null;
            next[pairs[i].second.row][pairs[i].second.column] = null;
            const collapsed = collapseMatchGrid(next, direction).grid;
            if (solve(collapsed)) {
                memo.set(key, true);
                return true;
            }
        }
        memo.set(key, false);
        return false;
    };
    return solve(cloneGrid(grid));
}

function nextRandom(state: { value: number }): number {
    let value = state.value | 0;
    if (value === 0) value = 0x6d2b79f5;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    state.value = value | 0;
    return value >>> 0;
}

function shuffledTiles(tiles: FoodId[], seed: number): FoodId[] {
    const result = tiles.slice();
    const state = { value: seed | 0 };
    for (let i = result.length - 1; i > 0; i--) {
        const j = nextRandom(state) % (i + 1);
        const temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }
    return result;
}

export function assertMatchLevel(level: MatchLevelDef): void {
    if (!Number.isInteger(level.id) || level.id <= 0) throw new Error('match level id must be a positive integer');
    if (!Number.isInteger(level.rows) || level.rows <= 0) throw new Error(`M${level.id} rows`);
    if (!Number.isInteger(level.columns) || level.columns <= 0) throw new Error(`M${level.id} columns`);
    if (level.layout.length !== level.rows) throw new Error(`M${level.id} layout rows`);
    const validTiles = new Set<string>(FOOD_IDS);
    const counts: Record<string, number> = {};
    let total = 0;
    for (let row = 0; row < level.rows; row++) {
        if (!level.layout[row] || level.layout[row].length !== level.columns) {
            throw new Error(`M${level.id} layout columns at row ${row}`);
        }
        for (let column = 0; column < level.columns; column++) {
            const tile = level.layout[row][column];
            if (tile == null || isMatchIce(tile)) continue;
            if (!validTiles.has(tile)) throw new Error(`M${level.id} invalid tile ${tile}`);
            counts[tile] = (counts[tile] || 0) + 1;
            total += 1;
        }
    }
    if (total < 2 || total % 2 !== 0) throw new Error(`M${level.id} tile count`);
    const tiles = Object.keys(counts);
    for (let i = 0; i < tiles.length; i++) {
        if (counts[tiles[i]] % 2 !== 0) throw new Error(`M${level.id} ${tiles[i]} count must be even`);
    }
}

/** 只抽查少量同种食材，避免整理时把全部连线搜完卡住点击。 */
function hasQuickLink(grid: MatchGrid, maxTurns: number, maxProbes: number): boolean {
    const pointsByTile = new Map<string, MatchPoint[]>();
    for (let row = 0; row < grid.length; row++) {
        for (let column = 0; column < grid[row].length; column++) {
            const tile = grid[row][column];
            if (!isMatchFood(tile)) continue;
            const points = pointsByTile.get(tile) ?? [];
            points.push({ row, column });
            pointsByTile.set(tile, points);
        }
    }
    let probes = 0;
    for (const points of pointsByTile.values()) {
        for (let i = 0; i < points.length - 1; i++) {
            for (let j = i + 1; j < points.length; j++) {
                if (findLinkPath(grid, points[i], points[j], maxTurns)) return true;
                probes += 1;
                if (probes >= maxProbes) return false;
            }
        }
    }
    return false;
}

export class MatchBoardState {
    readonly level: MatchLevelDef;
    private cells: MatchGrid;
    private selectedPoint: MatchPoint | null = null;
    status: MatchStatus;
    matches = 0;
    shuffles = 0;

    static fromLevel(level: MatchLevelDef): MatchBoardState {
        assertMatchLevel(level);
        return new MatchBoardState(level);
    }

    /** 用本机缓存的盘面接着玩。调用方须先校验格子和关卡定义一致。 */
    static resume(level: MatchLevelDef, grid: MatchGrid, matches: number, shuffles: number): MatchBoardState {
        assertMatchLevel(level);
        const board = new MatchBoardState(level);
        board.cells = cloneGrid(grid);
        board.matches = matches;
        board.shuffles = shuffles;
        board.selectedPoint = null;
        board.status = evaluateMatchStatus(board.cells, board.level.maxLinkTurns ?? 2);
        return board;
    }

    private constructor(level: MatchLevelDef) {
        this.level = {
            ...level,
            layout: cloneGrid(level.layout),
        };
        this.cells = cloneGrid(level.layout);
        this.status = evaluateMatchStatus(this.cells, this.level.maxLinkTurns ?? 2);
    }

    get selected(): MatchPoint | null {
        return this.selectedPoint ? clonePoint(this.selectedPoint) : null;
    }

    get grid(): MatchGrid {
        return cloneGrid(this.cells);
    }

    tileAt(point: MatchPoint): FoodId | null {
        if (!this.isInside(point)) return null;
        return this.cells[point.row][point.column];
    }

    findHint() {
        return findAnyLink(this.cells, this.level.maxLinkTurns ?? 2);
    }

    /**
     * 打乱当前食材的位置。空位和冰块不动，种类和数量不变。
     * 开局也可以用。结果只保证至少有一对能连，不保证一定能清盘。
     * 同一 seed 得到同一结果，便于复现测试。
     */
    reshuffle(seed = this.level.id * 1009 + this.matches * 97 + this.shuffles * 17): MatchShuffleResult {
        if (this.status === 'win') return { ok: false };
        const positions: MatchPoint[] = [];
        const tiles: FoodId[] = [];
        for (let row = 0; row < this.cells.length; row++) {
            for (let column = 0; column < this.cells[row].length; column++) {
                const tile = this.cells[row][column];
                if (!isMatchFood(tile)) continue;
                positions.push({ row, column });
                tiles.push(tile);
            }
        }
        const original = serializeGrid(this.cells);
        const maxTurns = this.level.maxLinkTurns ?? 2;
        let fallback: MatchGrid | null = null;
        for (let attempt = 1; attempt <= 8; attempt++) {
            const shuffled = shuffledTiles(tiles, seed + attempt * 0x9e3779b1);
            const candidate = cloneGrid(this.cells);
            for (let i = 0; i < positions.length; i++) {
                candidate[positions[i].row][positions[i].column] = shuffled[i];
            }
            if (positions.length > 2 && serializeGrid(candidate) === original) continue;
            fallback = candidate;
            if (!hasQuickLink(candidate, maxTurns, 16)) continue;
            this.cells = candidate;
            this.selectedPoint = null;
            this.status = 'running';
            this.shuffles += 1;
            return { ok: true, attempts: attempt, grid: cloneGrid(candidate) };
        }
        if (fallback && findAnyLink(fallback, maxTurns)) {
            this.cells = fallback;
            this.selectedPoint = null;
            this.status = 'running';
            this.shuffles += 1;
            return { ok: true, attempts: 8, grid: cloneGrid(fallback) };
        }
        return { ok: false };
    }

    select(point: MatchPoint): MatchSelectResult {
        if (this.status !== 'running') return { kind: 'rejected', reason: 'not_running' };
        if (!this.isInside(point)) return { kind: 'rejected', reason: 'out_of_bounds' };
        const tile = this.cells[point.row][point.column];
        if (!isMatchFood(tile)) return { kind: 'rejected', reason: 'empty' };
        if (!this.selectedPoint) {
            this.selectedPoint = clonePoint(point);
            return { kind: 'selected', point: clonePoint(point) };
        }
        if (samePoint(this.selectedPoint, point)) {
            return { kind: 'rejected', reason: 'same_cell' };
        }

        const first = clonePoint(this.selectedPoint);
        const firstTile = this.cells[first.row][first.column];
        if (firstTile !== tile) {
            this.selectedPoint = clonePoint(point);
            return { kind: 'switched', point: clonePoint(point), reason: 'different_tile' };
        }
        const path = findLinkPath(this.cells, first, point, this.level.maxLinkTurns ?? 2);
        if (!path) {
            this.selectedPoint = clonePoint(point);
            return { kind: 'switched', point: clonePoint(point), reason: 'blocked' };
        }

        this.cells[first.row][first.column] = null;
        this.cells[point.row][point.column] = null;
        this.selectedPoint = null;
        this.matches += 1;
        const collapsed = collapseMatchGrid(this.cells, this.level.collapse);
        this.cells = collapsed.grid;
        this.status = evaluateMatchStatus(this.cells, this.level.maxLinkTurns ?? 2);
        return {
            kind: 'matched',
            first,
            second: clonePoint(point),
            path,
            movements: collapsed.movements,
            status: this.status,
        };
    }

    private isInside(point: MatchPoint): boolean {
        return (
            point.row >= 0
            && point.row < this.level.rows
            && point.column >= 0
            && point.column < this.level.columns
        );
    }
}

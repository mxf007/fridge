import {
    assertMatchLevel,
    collapseMatchGrid,
    evaluateMatchStatus,
    hasMatchClearSolution,
    MatchBoardState,
} from './MatchBoardState';
import { findAnyLink, findLinkPath } from './MatchSolver';
import type { FoodId } from '../game/types';
import { MATCH_ICE } from './MatchCells';
import type { MatchGrid, MatchLevelDef } from './MatchTypes';

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
    if (actual !== expected) throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
}

function assertGrid(actual: MatchGrid, expected: MatchGrid, message: string): void {
    const actualText = JSON.stringify(actual);
    const expectedText = JSON.stringify(expected);
    if (actualText !== expectedText) {
        throw new Error(`${message}: expected ${expectedText}, got ${actualText}`);
    }
}

function expectThrow(run: () => void, message: string): void {
    let threw = false;
    try {
        run();
    } catch {
        threw = true;
    }
    if (!threw) throw new Error(message);
}

function filled(rows: number, columns: number, tile: FoodId): MatchGrid {
    const grid: MatchGrid = [];
    for (let row = 0; row < rows; row++) {
        const line: (FoodId | null)[] = [];
        for (let column = 0; column < columns; column++) line.push(tile);
        grid.push(line);
    }
    return grid;
}

function selfCheckPaths(): void {
    const direct: MatchGrid = [['milk', null, 'milk']];
    const directPath = findLinkPath(direct, { row: 0, column: 0 }, { row: 0, column: 2 });
    assert(directPath, 'direct path missing');
    assertEqual(directPath.turns, 0, 'direct path turns');

    const oneTurn: MatchGrid = [
        ['milk', null],
        [null, 'milk'],
    ];
    const oneTurnPath = findLinkPath(oneTurn, { row: 0, column: 0 }, { row: 1, column: 1 });
    assert(oneTurnPath, 'one-turn path missing');
    assertEqual(oneTurnPath.turns, 1, 'one-turn path turns');

    const twoTurns: MatchGrid = [
        [null, null, null],
        ['milk', 'veg', 'milk'],
        [null, null, null],
    ];
    const twoTurnPath = findLinkPath(twoTurns, { row: 1, column: 0 }, { row: 1, column: 2 });
    assert(twoTurnPath, 'two-turn path missing');
    assertEqual(twoTurnPath.turns, 2, 'two-turn path turns');

    const outside: MatchGrid = [
        ['milk', 'veg', 'milk'],
        ['fruit', 'meat', 'sauce'],
    ];
    const outsidePath = findLinkPath(outside, { row: 0, column: 0 }, { row: 0, column: 2 });
    assert(outsidePath, 'outside-border path missing');
    assert(
        outsidePath.cells.some((point) => point.row === -1),
        'outside-border path must use the padded top row',
    );

    const threeTurnMaze = filled(6, 6, 'veg');
    threeTurnMaze[0][0] = null;
    threeTurnMaze[1][1] = 'milk';
    threeTurnMaze[4][2] = 'milk';
    const corridor = [
        [1, 2],
        [1, 3],
        [2, 3],
        [3, 3],
        [3, 2],
    ];
    for (let i = 0; i < corridor.length; i++) {
        threeTurnMaze[corridor[i][0]][corridor[i][1]] = null;
    }
    assertEqual(
        findLinkPath(threeTurnMaze, { row: 1, column: 1 }, { row: 4, column: 2 }),
        null,
        'three-turn route must be rejected by the normal rule',
    );
    const allowedThree = findLinkPath(
        threeTurnMaze,
        { row: 1, column: 1 },
        { row: 4, column: 2 },
        3,
    );
    assert(allowedThree, 'three-turn fixture must contain a real route');
    assertEqual(allowedThree.turns, 3, 'three-turn fixture turns');

    assertEqual(
        findLinkPath(direct, { row: 0, column: 0 }, { row: 0, column: 0 }),
        null,
        'same cell must be rejected',
    );
    const mismatch: MatchGrid = [['milk', 'veg']];
    assertEqual(
        findLinkPath(mismatch, { row: 0, column: 0 }, { row: 0, column: 1 }),
        null,
        'different tiles must be rejected',
    );
}

function selfCheckIce(): void {
    const row: MatchGrid = [[null, 'milk', MATCH_ICE, 'veg', null]];
    const left = collapseMatchGrid(row, 'left');
    assertGrid(left.grid, [['milk', null, MATCH_ICE, 'veg', null]], 'ice walls the left collapse');
    assertEqual(left.movements.length, 1, 'food on the far side of ice does not move');
    const right = collapseMatchGrid(row, 'right');
    assertGrid(right.grid, [[null, 'milk', MATCH_ICE, null, 'veg']], 'ice walls the right collapse');

    const stacked: MatchGrid = [[null], ['milk'], [MATCH_ICE], ['veg'], [null]];
    const up = collapseMatchGrid(stacked, 'up');
    assertGrid(up.grid, [['milk'], [null], [MATCH_ICE], ['veg'], [null]], 'ice walls the upward collapse');
    const down = collapseMatchGrid(stacked, 'down');
    assertGrid(down.grid, [[null], ['milk'], [MATCH_ICE], [null], ['veg']], 'ice walls the downward collapse');

    const split: MatchGrid = [['fruit', null, MATCH_ICE, null, 'milk', MATCH_ICE, 'veg']];
    const splitLeft = collapseMatchGrid(split, 'left');
    assertGrid(
        splitLeft.grid,
        [['fruit', null, MATCH_ICE, 'milk', null, MATCH_ICE, 'veg']],
        'each ice splits the row into its own bag',
    );
}

function selfCheckCollapse(): void {
    const row: MatchGrid = [[null, 'milk', 'veg', null]];
    const left = collapseMatchGrid(row, 'left');
    assertGrid(left.grid, [['milk', 'veg', null, null]], 'left collapse');
    assertEqual(left.movements.length, 2, 'left collapse movement count');
    const right = collapseMatchGrid(row, 'right');
    assertGrid(right.grid, [[null, null, 'milk', 'veg']], 'right collapse');
    assertEqual(right.movements.length, 2, 'right collapse movement count');

    const columns: MatchGrid = [
        [null, 'milk'],
        ['veg', null],
        [null, 'fruit'],
        ['milk', 'veg'],
    ];
    const up = collapseMatchGrid(columns, 'up');
    assertGrid(up.grid, [
        ['veg', 'milk'],
        ['milk', 'fruit'],
        [null, 'veg'],
        [null, null],
    ], 'up collapse');
    const down = collapseMatchGrid(columns, 'down');
    assertGrid(down.grid, [
        [null, null],
        [null, 'milk'],
        ['veg', 'fruit'],
        ['milk', 'veg'],
    ], 'down collapse');
}

function selfCheckStatus(): void {
    assertEqual(evaluateMatchStatus([[null, null]]), 'win', 'empty board status');
    assertEqual(evaluateMatchStatus([['milk', 'milk']]), 'running', 'linked board status');

    const uniqueGrid: MatchGrid = [];
    let serial = 0;
    for (let row = 0; row < 5; row++) {
        const line = [];
        for (let column = 0; column < 5; column++) {
            line.push(`synthetic_${serial++}` as FoodId);
        }
        uniqueGrid.push(line);
    }
    uniqueGrid[1][1] = 'milk';
    uniqueGrid[3][3] = 'milk';
    assertEqual(findAnyLink(uniqueGrid), null, 'sealed duplicate pair must not link');
    assertEqual(evaluateMatchStatus(uniqueGrid), 'deadlock', 'deadlocked board status');
}

function selfCheckBoardState(): void {
    const level: MatchLevelDef = {
        id: 1,
        rows: 2,
        columns: 3,
        collapse: 'left',
        layout: [
            ['milk', null, 'milk'],
            ['veg', 'veg', null],
        ],
    };
    const board = MatchBoardState.fromLevel(level);
    assertEqual(board.status, 'running', 'initial board status');
    assertEqual(board.select({ row: 0, column: 0 }).kind, 'selected', 'first selection');
    const same = board.select({ row: 0, column: 0 });
    assert(same.kind === 'rejected' && same.reason === 'same_cell', 'same selection rejection');
    const switched = board.select({ row: 1, column: 0 });
    assert(
        switched.kind === 'switched' && switched.reason === 'different_tile',
        'different tile must switch selection',
    );
    const firstMatch = board.select({ row: 1, column: 1 });
    assert(firstMatch.kind === 'matched', 'vegetables must match');
    assertEqual(firstMatch.status, 'running', 'board must continue after first pair');
    assertGrid(board.grid, [
        ['milk', 'milk', null],
        [null, null, null],
    ], 'board collapse after first pair');
    assertEqual(board.matches, 1, 'successful match count');

    assertEqual(board.select({ row: 0, column: 0 }).kind, 'selected', 'second pair selection');
    const finalMatch = board.select({ row: 0, column: 1 });
    assert(finalMatch.kind === 'matched', 'milk must match');
    assertEqual(finalMatch.status, 'win', 'last pair must win');
    assertEqual(board.status, 'win', 'board win status');
    assertEqual(board.matches, 2, 'final match count');
    const afterWin = board.select({ row: 0, column: 0 });
    assert(afterWin.kind === 'rejected' && afterWin.reason === 'not_running', 'win locks input');

    const blockedLayout = filled(6, 6, 'veg');
    blockedLayout[0][0] = null;
    blockedLayout[1][1] = 'milk';
    blockedLayout[4][2] = 'milk';
    const corridor = [
        [1, 2],
        [1, 3],
        [2, 3],
        [3, 3],
        [3, 2],
    ];
    for (let i = 0; i < corridor.length; i++) {
        blockedLayout[corridor[i][0]][corridor[i][1]] = null;
    }
    const blockedBoard = MatchBoardState.fromLevel({
        id: 2,
        rows: 6,
        columns: 6,
        collapse: 'down',
        layout: blockedLayout,
    });
    assertEqual(blockedBoard.select({ row: 1, column: 1 }).kind, 'selected', 'blocked first selection');
    const blocked = blockedBoard.select({ row: 4, column: 2 });
    assert(
        blocked.kind === 'switched' && blocked.reason === 'blocked',
        'blocked equal tile must become the new selection',
    );
}

function selfCheckLevelValidation(): void {
    assertMatchLevel({
        id: 1,
        rows: 1,
        columns: 2,
        collapse: 'left',
        layout: [['milk', 'milk']],
    });
    expectThrow(() => assertMatchLevel({
        id: 2,
        rows: 1,
        columns: 3,
        collapse: 'right',
        layout: [['milk', 'milk', 'veg']],
    }), 'odd tile count must fail validation');
    expectThrow(() => assertMatchLevel({
        id: 3,
        rows: 2,
        columns: 2,
        collapse: 'up',
        layout: [['milk', 'milk']],
    }), 'wrong row count must fail validation');
}

function selfCheckShuffle(): void {
    const level: MatchLevelDef = {
        id: 4,
        rows: 4,
        columns: 4,
        collapse: 'left',
        layout: [
            ['milk', 'milk', 'veg', 'veg'],
            ['fruit', 'fruit', 'meat', 'meat'],
            ['veg', 'veg', 'milk', 'milk'],
            ['meat', 'meat', 'fruit', 'fruit'],
        ],
    };
    assert(hasMatchClearSolution(level.layout, level.collapse), 'demo layout must be fully clearable');
    const board = MatchBoardState.fromLevel(level);
    const before = board.grid.flat().filter((tile): tile is FoodId => tile != null).sort();
    assertEqual(board.select({ row: 0, column: 0 }).kind, 'selected', 'shuffle selection setup');
    const shuffled = board.reshuffle(24680);
    assert(shuffled.ok, 'reshuffle must find an arrangement with a link');
    const after = board.grid.flat().filter((tile): tile is FoodId => tile != null).sort();
    assertEqual(JSON.stringify(after), JSON.stringify(before), 'reshuffle must preserve the tile multiset');
    assertEqual(board.selected, null, 'reshuffle must clear selection');
    assertEqual(board.status, 'running', 'reshuffle status');
    assertEqual(board.shuffles, 1, 'reshuffle count');
    assert(board.findHint(), 'reshuffle must expose at least one hint');
}

export function selfCheckMatchBoardState(): void {
    selfCheckPaths();
    selfCheckIce();
    selfCheckCollapse();
    selfCheckStatus();
    selfCheckBoardState();
    selfCheckLevelValidation();
    selfCheckShuffle();
}

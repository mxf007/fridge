import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import type { FoodId, LevelDef } from '../assets/scripts/game/types';
import { assertLevel } from '../assets/scripts/game/types';
import { LEVEL_36 } from '../assets/scripts/game/level_36';

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.length}:${t.sealed ? 1 : 0}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    const buf = b.buffer.map((x) => x || '-').join(',');
    return `${trays}#${bags}#${buf}`;
}

function bufferParks(steps: ScriptStep[], slot: number): number {
    let n = 0;
    for (const s of steps) if (s.buffer === slot && s.bag != null) n += 1;
    return n;
}

function replay(board: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) board.selectTray(s.tray);
        if (s.buffer != null) board.selectBuffer(s.buffer);
        if (s.fromBuffer != null) board.placeFromBuffer(s.fromBuffer);
        else if (s.bag != null) board.placeFromBag(s.bag);
    }
}

function peak(level: LevelDef, steps: ScriptStep[]): number {
    const b = BoardState.fromLevel(level);
    try {
        return playScript(b, steps, 'p');
    } catch {
        return 99;
    }
}

function searchWin(level: LevelDef, max: number, allowBuffer: boolean): ScriptStep[] | null {
    const seen = new Set<string>();
    function dfs(steps: ScriptStep[]): ScriptStep[] | null {
        const board = BoardState.fromLevel(level);
        replay(board, steps);
        if (board.isWin()) return steps;
        if (steps.length >= max) return null;
        const k = stateKey(board);
        if (seen.has(k)) return null;
        seen.add(k);
        const moves: ScriptStep[] = [];
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(level);
                replay(trial, steps);
                trial.selectTray(t);
                if (trial.placeFromBag(c).ok) moves.push({ tray: t, bag: c });
            }
        }
        if (allowBuffer) {
            for (let bi = 0; bi < board.buffer.length; bi++) {
                if (board.buffer[bi] != null) continue;
                for (let c = 0; c < board.bags.length; c++) {
                    if (!board.bags[c].length) continue;
                    const trial = BoardState.fromLevel(level);
                    replay(trial, steps);
                    trial.selectBuffer(bi);
                    if (trial.placeFromBag(c).ok) moves.push({ buffer: bi, bag: c });
                }
            }
            for (let bi = 0; bi < board.buffer.length; bi++) {
                if (board.buffer[bi] == null) continue;
                for (let t = 0; t < board.trays.length; t++) {
                    const trial = BoardState.fromLevel(level);
                    replay(trial, steps);
                    trial.selectTray(t);
                    if (trial.placeFromBuffer(bi).ok) moves.push({ tray: t, fromBuffer: bi });
                }
            }
        }
        for (const m of moves) {
            const sub = dfs(steps.concat([m]));
            if (sub) return sub;
        }
        return null;
    }
    return dfs([]);
}

function searchFair(level: LevelDef, max: number): ScriptStep[] | null {
    let nodes = 0;
    let best: ScriptStep[] | null = null;
    function dfs(steps: ScriptStep[], onPath: Set<string>): void {
        if (best || ++nodes > 12_000_000) return;
        const board = BoardState.fromLevel(level);
        replay(board, steps);
        if (board.isWin() && bufferParks(steps, 0) >= 2 && peak(level, steps) === 1) {
            best = steps;
            return;
        }
        if (steps.length >= max || peak(level, steps) > 1) return;
        const k = stateKey(board);
        if (onPath.has(k)) return;
        onPath.add(k);
        const moves: ScriptStep[] = [];
        for (let bi = 0; bi < board.buffer.length; bi++) {
            if (board.buffer[bi] == null) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(level);
                replay(trial, steps);
                trial.selectTray(t);
                if (trial.placeFromBuffer(bi).ok) moves.push({ tray: t, fromBuffer: bi });
            }
        }
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(level);
                replay(trial, steps);
                trial.selectTray(t);
                if (trial.placeFromBag(c).ok) moves.push({ tray: t, bag: c });
            }
        }
        for (let bi = 0; bi < board.buffer.length; bi++) {
            if (board.buffer[bi] != null) continue;
            for (let c = 0; c < board.bags.length; c++) {
                if (!board.bags[c].length) continue;
                const trial = BoardState.fromLevel(level);
                replay(trial, steps);
                trial.selectBuffer(bi);
                if (trial.placeFromBag(c).ok) moves.push({ buffer: bi, bag: c });
            }
        }
        for (const m of moves) {
            dfs(steps.concat([m]), onPath);
            if (best) break;
        }
        onPath.delete(k);
    }
    for (let bi = 0; bi < 3; bi++) {
        for (let c = 0; c < 5; c++) {
            const t = BoardState.fromLevel(level);
            t.selectBuffer(bi);
            if (!t.placeFromBag(c).ok) continue;
            nodes = 0;
            best = null;
            dfs([{ buffer: bi, bag: c }], new Set());
            if (best) return best;
        }
    }
    return null;
}

const candidates: FoodId[][][] = [
    LEVEL_36.bags,
    [
        ['milk', 'veg', 'grape', 'meat'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'milk', 'veg', 'sauce'],
        ['grape', 'lemon', 'veg', 'meat'],
        ['grape', 'lemon', 'sauce', 'veg', 'milk'],
    ],
    [
        ['milk', 'veg', 'meat', 'sauce'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'milk', 'veg', 'sauce'],
        ['grape', 'lemon', 'veg', 'meat'],
        ['milk', 'lemon', 'sauce', 'veg', 'grape'],
    ],
    [
        ['sauce', 'veg', 'meat', 'milk'],
        ['veg', 'meat', 'grape', 'milk'],
        ['meat', 'milk', 'veg', 'sauce'],
        ['grape', 'lemon', 'veg', 'meat'],
        ['lemon', 'sauce', 'veg', 'milk', 'grape'],
    ],
];

for (let i = 0; i < candidates.length; i++) {
    const bags = candidates[i];
    const level: LevelDef = { ...LEVEL_36, bags };
    try {
        assertLevel(level);
    } catch (e) {
        console.log('bags', i, 'assert fail', e);
        continue;
    }
    const win = searchWin(level, 21, false);
    if (!win) {
        console.log('bags', i, 'no win');
        continue;
    }
    const wp = peak(level, win);
    console.log('bags', i, 'win', win.length, 'peak', wp);
    const fair = searchFair(level, 27);
    if (!fair) {
        console.log('bags', i, 'no fair');
        continue;
    }
    console.log('bags', i, 'FAIR', fair.length, 'parks0', bufferParks(fair, 0));
    console.log(JSON.stringify(bags));
    console.log(fair.map((s) => JSON.stringify(s)).join('\n'));
    process.exit(0);
}
console.log('none');
process.exit(1);

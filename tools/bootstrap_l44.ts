/**
 * npx tsx tools/bootstrap_l44.ts
 * 输出 win / fair（seed）/ waste，供粘贴进 level_44.ts
 */
import { BoardState } from '../assets/scripts/game/BoardState';
import { assertRedoLayout, assertTrayGrid, playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { assertLevel } from '../assets/scripts/game/types';
import { LEVEL_44 } from '../assets/scripts/game/level_44';

function replay(b: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) b.selectTray(s.tray);
        if (s.buffer != null) b.selectBuffer(s.buffer);
        if (s.fromBuffer != null) b.placeFromBuffer(s.fromBuffer);
        else if (s.bag != null) b.placeFromBag(s.bag);
    }
}

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.length}:${t.sealed ? 1 : 0}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    return `${trays}#${bags}`;
}

function searchWin(): ScriptStep[] | null {
    const seen = new Set<string>();
    let nodes = 0;
    const MAX = 3_500_000;
    function dfs(steps: ScriptStep[]): ScriptStep[] | null {
        if (++nodes > MAX) return null;
        const board = BoardState.fromLevel(LEVEL_44);
        replay(board, steps);
        if (board.isWin()) return steps;
        if (steps.length >= 24) return null;
        const k = stateKey(board);
        if (seen.has(k)) return null;
        seen.add(k);
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(LEVEL_44);
                replay(trial, steps);
                trial.selectTray(t);
                if (trial.placeFromBag(c).ok) {
                    const sub = dfs(steps.concat([{ tray: t, bag: c }]));
                    if (sub) return sub;
                }
            }
        }
        return null;
    }
    return dfs([]);
}

function searchWaste(): ScriptStep[] | null {
    const seen = new Set<string>();
    let nodes = 0;
    const MAX = 500_000;
    function dfs(steps: ScriptStep[]): ScriptStep[] | null {
        if (++nodes > MAX) return null;
        const board = BoardState.fromLevel(LEVEL_44);
        replay(board, steps);
        if (board.failReason() === 'locked_out') return steps;
        if (steps.length >= 24) return null;
        const k = stateKey(board);
        if (seen.has(k)) return null;
        seen.add(k);
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(LEVEL_44);
                replay(trial, steps);
                trial.selectTray(t);
                if (trial.placeFromBag(c).ok) {
                    const sub = dfs(steps.concat([{ tray: t, bag: c }]));
                    if (sub) return sub;
                }
            }
        }
        return null;
    }
    return dfs([]);
}

function seedFair(): ScriptStep[] | null {
    let best: ScriptStep[] | null = null;
    let nodes = 0;
    function stateKeyFull(b: BoardState): string {
        const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.length}:${t.sealed ? 1 : 0}`).join('|');
        const bags = b.bags.map((col) => col.join(',')).join(';');
        const buffer = b.buffer.map((x) => x || '-').join(',');
        return `${trays}#${bags}#${buffer}`;
    }
    function peak(steps: ScriptStep[]): number {
        const b = BoardState.fromLevel(LEVEL_44);
        try {
            return playScript(b, steps, 'p');
        } catch {
            return 99;
        }
    }
    function gen(steps: ScriptStep[]): ScriptStep[] {
        const board = BoardState.fromLevel(LEVEL_44);
        replay(board, steps);
        const out: ScriptStep[] = [];
        for (let bi = 0; bi < 3; bi++) {
            if (board.buffer[bi] == null) continue;
            for (let t = 0; t < 7; t++) {
                const trial = BoardState.fromLevel(LEVEL_44);
                replay(trial, steps);
                trial.selectTray(t);
                if (trial.placeFromBuffer(bi).ok) out.push({ tray: t, fromBuffer: bi });
            }
        }
        for (let c = 0; c < 6; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < 7; t++) {
                const trial = BoardState.fromLevel(LEVEL_44);
                replay(trial, steps);
                trial.selectTray(t);
                if (trial.placeFromBag(c).ok) out.push({ tray: t, bag: c });
            }
        }
        for (let bi = 0; bi < 3; bi++) {
            if (board.buffer[bi] != null) continue;
            for (let c = 0; c < 6; c++) {
                if (!board.bags[c].length) continue;
                const trial = BoardState.fromLevel(LEVEL_44);
                replay(trial, steps);
                trial.selectBuffer(bi);
                if (trial.placeFromBag(c).ok) out.push({ buffer: bi, bag: c });
            }
        }
        return out;
    }
    function dfs(steps: ScriptStep[], seen: Set<string>) {
        if (best || ++nodes > 600_000) return;
        if (peak(steps) > 2) return;
        const board = BoardState.fromLevel(LEVEL_44);
        replay(board, steps);
        if (board.isWin() && peak(steps) === 2) {
            best = steps.slice();
            return;
        }
        if (steps.length >= 32) return;
        const k = stateKeyFull(board);
        if (seen.has(k)) return;
        seen.add(k);
        for (const m of gen(steps)) dfs(steps.concat([m]), seen);
    }
    for (let b0 = 0; b0 < 6; b0++) {
        for (let b1 = 0; b1 < 6; b1++) {
            if (b0 === b1) continue;
            nodes = 0;
            dfs([{ buffer: 0, bag: b0 }, { buffer: 1, bag: b1 }], new Set());
            if (best) break;
        }
        if (best) break;
    }
    return best;
}

assertLevel(LEVEL_44);
assertRedoLayout(LEVEL_44);
assertTrayGrid(44, LEVEL_44.trays.map((t) => t.cap));

const win = searchWin();
console.log('win', win ? win.length : 'none');
if (win) console.log(win.map((s) => JSON.stringify(s)).join('\n'));

const fair = seedFair();
console.log('fair', fair ? fair.length : 'none');
if (fair) console.log(fair.map((s) => JSON.stringify(s)).join('\n'));

const waste = searchWaste();
console.log('waste', waste ? waste.length : 'none');
if (waste) console.log(waste.map((s) => JSON.stringify(s)).join('\n'));

if (!win) process.exit(1);

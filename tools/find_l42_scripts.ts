import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_42 } from '../assets/scripts/game/level_42';

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
    function dfs(steps: ScriptStep[]): ScriptStep[] | null {
        const board = BoardState.fromLevel(LEVEL_42);
        replay(board, steps);
        if (board.isWin()) return steps;
        if (steps.length >= 24) return null;
        const k = stateKey(board);
        if (seen.has(k)) return null;
        seen.add(k);
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(LEVEL_42);
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

function firstBufferStep(steps: ScriptStep[]): number {
    for (let i = 0; i < steps.length; i++) if (steps[i].buffer != null && steps[i].bag != null) return i;
    return -1;
}

function fairFromDoublePark(win: ScriptStep[]): ScriptStep[] | null {
    let best: ScriptStep[] | null = null;
    function ok(script: ScriptStep[]): boolean {
        const b = BoardState.fromLevel(LEVEL_42);
        try {
            const peak = playScript(b, script, 't');
            if (!b.isWin() || peak !== 2) return false;
            const fb = firstBufferStep(script);
            return fb >= 0 && fb <= 2;
        } catch {
            return false;
        }
    }
    for (let b0 = 0; b0 < 6; b0++) {
        for (let b1 = 0; b1 < 6; b1++) {
            if (b0 === b1) continue;
            for (let k1 = 0; k1 <= win.length; k1++) {
                for (let t0 = 0; t0 < 6; t0++) {
                    for (let k2 = k1; k2 <= win.length; k2++) {
                        for (let t1 = 0; t1 < 6; t1++) {
                            const script: ScriptStep[] = [
                                { buffer: 0, bag: b0 },
                                { buffer: 1, bag: b1 },
                                ...win.slice(0, k1),
                                { tray: t0, fromBuffer: 0 },
                                ...win.slice(k1, k2),
                                { tray: t1, fromBuffer: 1 },
                                ...win.slice(k2),
                            ];
                            if (!ok(script)) continue;
                            if (!best || script.length < best.length) best = script;
                        }
                    }
                }
            }
        }
    }
    return best;
}

function searchWaste(): ScriptStep[] | null {
    const seen = new Set<string>();
    function dfs(steps: ScriptStep[]): ScriptStep[] | null {
        const board = BoardState.fromLevel(LEVEL_42);
        replay(board, steps);
        if (board.failReason() === 'locked_out') return steps;
        if (steps.length >= 26) return null;
        const k = `${board.trays.map((t) => t.kind + t.items.length).join('|')}#${board.bags.map((c) => c.length).join(',')}`;
        if (seen.has(k)) return null;
        seen.add(k);
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(LEVEL_42);
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

const win = searchWin();
console.log('win', win ? win.length : 'none');
if (win) console.log(win.map((s) => JSON.stringify(s)).join('\n'));
const fair = win ? fairFromDoublePark(win) : null;
console.log('fair', fair ? fair.length : 'none', fair ? firstBufferStep(fair) : '');
if (fair) console.log(fair.map((s) => JSON.stringify(s)).join('\n'));
const waste = searchWaste();
console.log('waste', waste ? waste.length : 'none');
if (waste) console.log(waste.map((s) => JSON.stringify(s)).join('\n'));

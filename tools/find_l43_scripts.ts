/**
 * 仅作 CLI：`npx tsx tools/find_l43_scripts.ts`
 * 勿被其他脚本 import（会误跑整段搜索）。公平脚本请用 seed_fair_l43.ts。
 */
import { BoardState } from '../assets/scripts/game/BoardState';
import { assertRedoLayout, assertTrayGrid, playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { assertLevel } from '../assets/scripts/game/types';
import { LEVEL_43 } from '../assets/scripts/game/level_43';

function replay(b: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) b.selectTray(s.tray);
        if (s.bag != null) b.placeFromBag(s.bag);
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
    const MAX = 500_000;
    function dfs(steps: ScriptStep[]): ScriptStep[] | null {
        if (++nodes > MAX) return null;
        const board = BoardState.fromLevel(LEVEL_43);
        replay(board, steps);
        if (board.isWin()) return steps;
        if (steps.length >= 24) return null;
        const k = stateKey(board);
        if (seen.has(k)) return null;
        seen.add(k);
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(LEVEL_43);
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
    const MAX = 350_000;
    function dfs(steps: ScriptStep[]): ScriptStep[] | null {
        if (++nodes > MAX) return null;
        const board = BoardState.fromLevel(LEVEL_43);
        replay(board, steps);
        if (board.failReason() === 'locked_out') return steps;
        if (steps.length >= 24) return null;
        const k = `${board.trays.map((t) => t.kind + t.items.length).join('|')}#${board.bags.map((c) => c.length).join(',')}`;
        if (seen.has(k)) return null;
        seen.add(k);
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(LEVEL_43);
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

function main() {
    try {
        assertLevel(LEVEL_43);
        assertRedoLayout(LEVEL_43);
        assertTrayGrid(43, LEVEL_43.trays.map((t) => t.cap));
    } catch (e) {
        console.log('assert', e);
        process.exit(1);
    }
    const win = searchWin();
    console.log('win', win ? win.length : 'none');
    if (win) console.log(win.map((s) => JSON.stringify(s)).join('\n'));
    console.log('(fair 请单独跑 seed_fair_l43.ts，勿在本脚本做 insert 全排列)');
    const waste = searchWaste();
    console.log('waste', waste ? waste.length : 'none');
    if (waste) console.log(waste.map((s) => JSON.stringify(s)).join('\n'));
}

const entry = process.argv[1]?.replace(/\\/g, '/');
if (entry?.endsWith('find_l43_scripts.ts')) main();

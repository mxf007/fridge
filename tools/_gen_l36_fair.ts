import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_36 } from '../assets/scripts/game/level_36';

function replay(board: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) board.selectTray(s.tray);
        if (s.buffer != null) board.selectBuffer(s.buffer);
        if (s.fromBuffer != null) board.placeFromBuffer(s.fromBuffer);
        else if (s.bag != null) board.placeFromBag(s.bag);
    }
}

function parks(steps: ScriptStep[], slot: number) {
    let n = 0;
    for (const s of steps) if (s.buffer === slot && s.bag != null) n++;
    return n;
}

function test(script: ScriptStep[]) {
    const b = BoardState.fromLevel(LEVEL_36);
    try {
        const peak = playScript(b, script, 't');
        return b.isWin() && peak === 1 && parks(script, 0) >= 2;
    } catch {
        return false;
    }
}

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.join(',')}:${t.sealed ? 1 : 0}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    const buf = b.buffer.map((x) => x || '-').join(',');
    return `${trays}#${bags}#${buf}`;
}

function bfs(maxLen: number): ScriptStep[] | null {
    const q: ScriptStep[][] = [[]];
    const seen = new Set<string>([stateKey(BoardState.fromLevel(LEVEL_36))]);
    let h = 0;
    while (h < q.length) {
        const steps = q[h++];
        if (steps.length >= maxLen) continue;
        const board = BoardState.fromLevel(LEVEL_36);
        let peak = 0;
        let fail = false;
        for (let i = 0; i < steps.length; i++) {
            const s = steps[i];
            if (s.tray != null) board.selectTray(s.tray);
            if (s.buffer != null) board.selectBuffer(s.buffer);
            const r =
                s.fromBuffer != null
                    ? board.placeFromBuffer(s.fromBuffer)
                    : s.bag != null
                      ? board.placeFromBag(s.bag)
                      : null;
            if (!r || !r.ok) {
                fail = true;
                break;
            }
            const held = board.buffer.filter((x) => x != null).length;
            if (held > peak) peak = held;
        }
        if (fail || peak > 1) continue;
        replay(board, steps);
        if (board.isWin() && parks(steps, 0) >= 2) return steps;
        const moves: ScriptStep[] = [];
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(LEVEL_36);
                replay(trial, steps);
                trial.selectTray(t);
                if (trial.placeFromBag(c).ok) moves.push({ tray: t, bag: c });
            }
        }
        for (let bi = 0; bi < 3; bi++) {
            if (board.buffer[bi] != null) continue;
            for (let c = 0; c < board.bags.length; c++) {
                if (!board.bags[c].length) continue;
                const trial = BoardState.fromLevel(LEVEL_36);
                replay(trial, steps);
                trial.selectBuffer(bi);
                if (trial.placeFromBag(c).ok) moves.push({ buffer: bi, bag: c });
            }
        }
        for (let bi = 0; bi < 3; bi++) {
            if (board.buffer[bi] == null) continue;
            for (let t = 0; t < board.trays.length; t++) {
                const trial = BoardState.fromLevel(LEVEL_36);
                replay(trial, steps);
                trial.selectTray(t);
                if (trial.placeFromBuffer(bi).ok) moves.push({ tray: t, fromBuffer: bi });
            }
        }
        for (const m of moves) {
            const next = steps.concat([m]);
            const b2 = BoardState.fromLevel(LEVEL_36);
            replay(b2, next);
            const k = stateKey(b2);
            if (seen.has(k)) continue;
            seen.add(k);
            q.push(next);
        }
    }
    return null;
}

const fair = bfs(25);
if (!fair) {
    console.log('fail');
    process.exit(1);
}
console.log('fair', fair.length, parks(fair, 0));
console.log(fair.map((s) => JSON.stringify(s)).join('\n'));

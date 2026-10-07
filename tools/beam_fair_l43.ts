/**
 * 公平 peak-2 波束搜索（4 进程并行，按种子分片）。
 * 用法：npx tsx tools/beam_fair_l43.ts
 * 子进程：npx tsx tools/beam_fair_l43.ts --worker 0
 */
import { spawn, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BoardState } from '../assets/scripts/game/BoardState';
import { playScript } from '../assets/scripts/game/levelLayout';
import type { ScriptStep } from '../assets/scripts/game/levelLayout';
import { LEVEL_43 } from '../assets/scripts/game/level_43';

const WORKERS = 4;
const BEAM = 120_000;
const MAX = 32;
const FAIR_MARKER = 'FAIR_FOUND';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const selfScript = path.join(__dirname, 'beam_fair_l43.ts');
const repoRoot = path.join(__dirname, '..');

function stateKey(b: BoardState): string {
    const trays = b.trays.map((t) => `${t.kind || '-'}:${t.items.length}:${t.sealed ? 1 : 0}`).join('|');
    const bags = b.bags.map((col) => col.join(',')).join(';');
    const buf = b.buffer.map((x) => x || '-').join(',');
    return `${trays}#${bags}#${buf}`;
}

function replay(board: BoardState, steps: ScriptStep[]) {
    for (const s of steps) {
        if (s.tray != null) board.selectTray(s.tray);
        if (s.buffer != null) board.selectBuffer(s.buffer);
        if (s.fromBuffer != null) board.placeFromBuffer(s.fromBuffer);
        else if (s.bag != null) board.placeFromBag(s.bag);
    }
}

function peak(steps: ScriptStep[]): number {
    const b = BoardState.fromLevel(LEVEL_43);
    try {
        return playScript(b, steps, 'p');
    } catch {
        return 99;
    }
}

function bagLeft(b: BoardState): number {
    let n = 0;
    for (const col of b.bags) n += col.length;
    return n;
}

function genMoves(steps: ScriptStep[]): ScriptStep[] {
    const board = BoardState.fromLevel(LEVEL_43);
    replay(board, steps);
    const out: ScriptStep[] = [];
    for (let bi = 0; bi < board.buffer.length; bi++) {
        if (board.buffer[bi] == null) continue;
        for (let t = 0; t < board.trays.length; t++) {
            const trial = BoardState.fromLevel(LEVEL_43);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBuffer(bi).ok) out.push({ tray: t, fromBuffer: bi });
        }
    }
    for (let c = 0; c < board.bags.length; c++) {
        if (!board.bags[c].length) continue;
        for (let t = 0; t < board.trays.length; t++) {
            const trial = BoardState.fromLevel(LEVEL_43);
            replay(trial, steps);
            trial.selectTray(t);
            if (trial.placeFromBag(c).ok) out.push({ tray: t, bag: c });
        }
    }
    for (let bi = 0; bi < board.buffer.length; bi++) {
        if (board.buffer[bi] != null) continue;
        for (let c = 0; c < board.bags.length; c++) {
            if (!board.bags[c].length) continue;
            const trial = BoardState.fromLevel(LEVEL_43);
            replay(trial, steps);
            trial.selectBuffer(bi);
            if (trial.placeFromBag(c).ok) out.push({ buffer: bi, bag: c });
        }
    }
    return out;
}

function buildSeeds(): ScriptStep[][] {
    const seeds: ScriptStep[][] = [[]];
    for (let b0 = 0; b0 < 6; b0++) {
        for (let b1 = 0; b1 < 6; b1++) {
            if (b0 === b1) continue;
            seeds.push([{ buffer: 0, bag: b0 }, { buffer: 1, bag: b1 }]);
        }
    }
    return seeds;
}

function seedsForWorker(workerId: number, workers: number): ScriptStep[][] {
    const all = buildSeeds();
    return all.filter((_, i) => i % workers === workerId);
}

function runBeam(seeds: ScriptStep[][], beam: number, max: number, workerId: number): ScriptStep[] | null {
    let frontier = seeds;
    for (let depth = 0; depth < max; depth++) {
        const nextMap = new Map<string, { steps: ScriptStep[]; score: number }>();
        for (const steps of frontier) {
            if (peak(steps) > 2) continue;
            const board = BoardState.fromLevel(LEVEL_43);
            replay(board, steps);
            if (board.isWin() && peak(steps) === 2) return steps;
            for (const m of genMoves(steps)) {
                const ns = steps.concat([m]);
                if (peak(ns) > 2) continue;
                const b2 = BoardState.fromLevel(LEVEL_43);
                replay(b2, ns);
                const k = stateKey(b2);
                const score = bagLeft(b2) * 10 - b2.steps + peak(ns) * 3;
                const prev = nextMap.get(k);
                if (!prev || score > prev.score) nextMap.set(k, { steps: ns, score });
            }
        }
        const ranked = [...nextMap.values()].sort((a, b) => b.score - a.score).slice(0, beam);
        frontier = ranked.map((r) => r.steps);
        console.error(`w${workerId} depth ${depth} frontier ${frontier.length}`);
        if (!frontier.length) break;
    }
    return null;
}

function runWorkerCli(workerId: number) {
    const seeds = seedsForWorker(workerId, WORKERS);
    const beam = Math.ceil(BEAM / WORKERS);
    console.error(`w${workerId} start seeds ${seeds.length} beam ${beam}`);
    const found = runBeam(seeds, beam, MAX, workerId);
    if (found) {
        console.log(FAIR_MARKER);
        console.log('fair', found.length);
        console.log(found.map((s) => JSON.stringify(s)).join('\n'));
        process.exit(0);
    }
    process.exit(1);
}

function spawnWorker(workerId: number): ChildProcess {
    return spawn('npx', ['tsx', selfScript, '--worker', String(workerId)], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: true,
        env: process.env,
    });
}

async function runCoordinator() {
    console.error(`beam ${BEAM} max ${MAX} workers ${WORKERS} seeds`, seedsForWorker(0, WORKERS).length, '+ …');
    const children = Array.from({ length: WORKERS }, (_, i) => spawnWorker(i));
    let stdoutBuf = '';
    let winner: string | null = null;

    const tryParseWinner = (chunk: string) => {
        stdoutBuf += chunk;
        const idx = stdoutBuf.indexOf(FAIR_MARKER);
        if (idx < 0) return;
        winner = stdoutBuf.slice(idx);
    };

    await new Promise<void>((resolve) => {
        let alive = children.length;
        const finish = () => {
            alive -= 1;
            if (alive <= 0) resolve();
        };
        for (const cp of children) {
            cp.stdout?.on('data', (d: Buffer) => tryParseWinner(d.toString()));
            cp.stderr?.on('data', (d: Buffer) => process.stderr.write(d));
            cp.on('close', finish);
        }
        const poll = setInterval(() => {
            if (winner) {
                clearInterval(poll);
                for (const cp of children) cp.kill('SIGTERM');
                resolve();
            }
        }, 200);
        setTimeout(() => {
            clearInterval(poll);
            for (const cp of children) cp.kill('SIGTERM');
            resolve();
        }, 3_600_000);
    });

    if (winner) {
        const lines = winner.split('\n').filter((l) => l !== FAIR_MARKER);
        console.log(lines.join('\n'));
        process.exit(0);
    }
    console.log('none');
    process.exit(1);
}

const wi = process.argv.indexOf('--worker');
if (wi >= 0) {
    const workerId = parseInt(process.argv[wi + 1], 10);
    if (Number.isNaN(workerId) || workerId < 0 || workerId >= WORKERS) {
        console.error('usage: --worker 0..3');
        process.exit(1);
    }
    runWorkerCli(workerId);
} else {
    void runCoordinator();
}

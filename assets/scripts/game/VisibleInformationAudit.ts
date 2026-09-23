import type { Dest, FoodId, LevelDef, TrayState } from './types';

type AuditSource = 'bag' | 'buffer';

type AuditAction = {
    source: AuditSource;
    sourceIndex: number;
    dest: Dest;
};

type AuditState = {
    trays: TrayState[];
    bags: FoodId[][];
    buffer: (FoodId | null)[];
    bufferEnabled: boolean;
};

type SolveResult = {
    solvable: boolean;
    peakBuffer: number;
    allMovesSafe: boolean;
    forcedIn: number | null;
    safeActions: number;
    legalActions: number;
};

export type VisibleAuditOptions = {
    maxVariants?: number;
    maxBeliefs?: number;
};

export type VisibleAudit = {
    levelId: number;
    passes: boolean;
    truncated: boolean;
    variantCount: number;
    exploredBeliefs: number;
    maxHiddenDepth: number;
    forcedGuessAt: number | null;
    maxBufferNeeded: number | null;
    allLegalVisibleMovesSafe: boolean;
    initialLegalActionCount: number;
    initialSafeActionCount: number;
    failures: string[];
};

const DEFAULT_MAX_VARIANTS = 5000;
const DEFAULT_MAX_BELIEFS = 250000;

export function auditVisibleInformation(
    level: LevelDef,
    options: VisibleAuditOptions = {},
): VisibleAudit {
    const maxVariants = options.maxVariants || DEFAULT_MAX_VARIANTS;
    const maxBeliefs = options.maxBeliefs || DEFAULT_MAX_BELIEFS;
    const generated = generateHiddenVariants(level, maxVariants);
    let truncated = generated.truncated;
    let exploredBeliefs = 0;
    const memo = new Map<string, SolveResult>();

    const solve = (states: AuditState[]): SolveResult => {
        const belief = uniqueStates(states);
        const key = belief.map(stateKey).sort().join('||');
        const cached = memo.get(key);
        if (cached) return cached;
        exploredBeliefs += 1;
        if (exploredBeliefs > maxBeliefs) {
            truncated = true;
            return failedResult();
        }

        if (belief.every(isWin)) {
            const won = {
                solvable: true,
                peakBuffer: maxBufferOccupancy(belief),
                allMovesSafe: true,
                forcedIn: null,
                safeActions: 0,
                legalActions: 0,
            };
            memo.set(key, won);
            return won;
        }
        if (belief.some(isWin)) {
            const mixed = failedResult();
            memo.set(key, mixed);
            return mixed;
        }

        const actions = commonVisibleActions(belief);
        let safeActions = 0;
        let bestPeak = Number.POSITIVE_INFINITY;
        let everySafeActionStaysAllSafe = true;
        let bestForcedIn = 0;

        for (let i = 0; i < actions.length; i++) {
            const groups = new Map<string, AuditState[]>();
            let valid = true;
            for (let s = 0; s < belief.length; s++) {
                const next = applyAction(belief[s], actions[i]);
                if (!next) {
                    valid = false;
                    break;
                }
                const observation = observationKey(next);
                const group = groups.get(observation) || [];
                group.push(next);
                groups.set(observation, group);
            }
            if (!valid) continue;

            let actionSafe = true;
            let actionPeak = maxBufferOccupancy(belief);
            let actionAllMovesSafe = true;
            let actionForcedIn = Number.POSITIVE_INFINITY;
            for (const group of groups.values()) {
                const child = solve(group);
                if (!child.solvable) {
                    actionSafe = false;
                    actionForcedIn = Math.min(actionForcedIn, 1 + (child.forcedIn || 0));
                    break;
                }
                actionPeak = Math.max(actionPeak, child.peakBuffer);
                actionAllMovesSafe = actionAllMovesSafe && child.allMovesSafe;
            }
            if (!actionSafe) {
                if (actionForcedIn < Number.POSITIVE_INFINITY) {
                    bestForcedIn = Math.max(bestForcedIn, actionForcedIn);
                }
                continue;
            }
            safeActions += 1;
            bestPeak = Math.min(bestPeak, actionPeak);
            everySafeActionStaysAllSafe = everySafeActionStaysAllSafe && actionAllMovesSafe;
            // 第 10 关起验收只要求「存在 peak≤3 的安全路线」，找到即可收束，避免混容量关信念爆炸。
            if (level.id >= 10 && bestPeak <= 3) break;
        }

        const result: SolveResult = safeActions > 0
            ? {
                solvable: true,
                peakBuffer: bestPeak,
                allMovesSafe: safeActions === actions.length && everySafeActionStaysAllSafe,
                forcedIn: null,
                safeActions,
                legalActions: actions.length,
            }
            : {
                ...failedResult(),
                forcedIn: actions.length > 0 ? bestForcedIn : 0,
                legalActions: actions.length,
            };
        memo.set(key, result);
        return result;
    };

    const result = generated.states.length > 0 ? solve(generated.states) : failedResult();
    const maxHiddenDepth = level.bags.reduce((max, bag) => Math.max(max, bag.length), 0);
    const failures: string[] = [];
    if (generated.states.length === 0) failures.push('no_hidden_variants');
    if (truncated) failures.push('audit_budget_exceeded');

    if (level.id >= 5 && level.id <= 8) {
        if (!result.solvable) failures.push('forced_guess');
        if (!result.allMovesSafe) failures.push('not_all_legal_visible_moves_safe');
    } else if (level.id === 9) {
        if (maxHiddenDepth !== 1) failures.push('level_9_must_be_fully_visible');
        if (!result.solvable || result.safeActions === 0) failures.push('level_9_has_no_safe_route');
        if (result.legalActions <= result.safeActions) failures.push('level_9_needs_visible_wrong_capacity_route');
    } else if (level.id >= 10) {
        if (!result.solvable) failures.push('forced_guess');
        if (result.peakBuffer > 3) failures.push('needs_more_than_3_buffer_slots');
    }

    return {
        levelId: level.id,
        passes: failures.length === 0,
        truncated,
        variantCount: generated.states.length,
        exploredBeliefs,
        maxHiddenDepth,
        forcedGuessAt: result.solvable ? null : result.forcedIn,
        maxBufferNeeded: result.solvable ? result.peakBuffer : null,
        allLegalVisibleMovesSafe: result.allMovesSafe,
        initialLegalActionCount: result.legalActions,
        initialSafeActionCount: result.safeActions,
        failures,
    };
}

function failedResult(): SolveResult {
    return {
        solvable: false,
        peakBuffer: 0,
        allMovesSafe: false,
        forcedIn: 0,
        safeActions: 0,
        legalActions: 0,
    };
}

function generateHiddenVariants(
    level: LevelDef,
    maxVariants: number,
): { states: AuditState[]; truncated: boolean } {
    const hidden: FoodId[] = [];
    const lowerCounts: number[] = [];
    const tops: (FoodId | null)[] = [];
    for (let c = 0; c < level.bags.length; c++) {
        const bag = level.bags[c];
        lowerCounts.push(Math.max(0, bag.length - 1));
        tops.push(bag.length > 0 ? bag[bag.length - 1] : null);
        for (let i = 0; i + 1 < bag.length; i++) hidden.push(bag[i]);
    }

    const counts = new Map<FoodId, number>();
    for (let i = 0; i < hidden.length; i++) {
        counts.set(hidden[i], (counts.get(hidden[i]) || 0) + 1);
    }
    const kinds = Array.from(counts.keys()).sort();
    const permutations: FoodId[][] = [];
    let truncated = false;
    const build = (prefix: FoodId[]) => {
        if (permutations.length >= maxVariants) {
            truncated = true;
            return;
        }
        if (prefix.length === hidden.length) {
            permutations.push(prefix.slice());
            return;
        }
        for (let i = 0; i < kinds.length; i++) {
            const kind = kinds[i];
            const left = counts.get(kind) || 0;
            if (left <= 0) continue;
            counts.set(kind, left - 1);
            prefix.push(kind);
            build(prefix);
            prefix.pop();
            counts.set(kind, left);
            if (truncated) return;
        }
    };
    build([]);
    if (hidden.length === 0) permutations.push([]);

    const states: AuditState[] = [];
    for (let p = 0; p < permutations.length; p++) {
        let cursor = 0;
        const bags: FoodId[][] = [];
        for (let c = 0; c < lowerCounts.length; c++) {
            const bag: FoodId[] = [];
            for (let i = 0; i < lowerCounts[c]; i++) bag.push(permutations[p][cursor++]);
            if (tops[c]) bag.push(tops[c]!);
            bags.push(bag);
        }
        states.push({
            trays: level.trays.map((tray) => ({
                cap: tray.cap,
                kind: null,
                items: [],
                sealed: false,
            })),
            bags,
            buffer: Array.from({ length: level.buffer > 0 ? level.buffer : 3 }, () => null),
            bufferEnabled: level.id >= 10,
        });
    }
    return { states: uniqueStates(states), truncated };
}

function commonVisibleActions(states: AuditState[]): AuditAction[] {
    if (states.length === 0) return [];
    const candidates = visibleActions(states[0]);
    return candidates.filter((action) => states.every((state) => canApply(state, action)));
}

function visibleActions(state: AuditState): AuditAction[] {
    const actions: AuditAction[] = [];
    const trayDests: Dest[] = [];
    const bufferDests: Dest[] = [];
    for (let i = 0; i < state.trays.length; i++) {
        const tray = state.trays[i];
        if (!tray.sealed && tray.items.length < tray.cap) trayDests.push({ kind: 'tray', index: i });
    }
    if (state.bufferEnabled) {
        for (let i = 0; i < state.buffer.length; i++) {
            if (state.buffer[i] == null) bufferDests.push({ kind: 'buffer', index: i });
        }
    }
    // 柜台暂存优先：第 10 关起常是不锁容量的安全探查步，利于审计早停。
    const dests = bufferDests.concat(trayDests);
    for (let c = 0; c < state.bags.length; c++) {
        if (state.bags[c].length === 0) continue;
        for (let d = 0; d < dests.length; d++) {
            const action: AuditAction = { source: 'bag', sourceIndex: c, dest: dests[d] };
            if (canApply(state, action)) actions.push(action);
        }
    }
    if (state.bufferEnabled) {
        for (let i = 0; i < state.buffer.length; i++) {
            if (state.buffer[i] == null) continue;
            for (let d = 0; d < trayDests.length; d++) {
                const action: AuditAction = { source: 'buffer', sourceIndex: i, dest: trayDests[d] };
                if (canApply(state, action)) actions.push(action);
            }
        }
    }
    return uniqueActions(actions);
}

function canApply(state: AuditState, action: AuditAction): boolean {
    const item = sourceItem(state, action);
    if (!item) return false;
    if (action.dest.kind === 'buffer') {
        return action.source === 'bag' && state.buffer[action.dest.index] == null;
    }
    const tray = state.trays[action.dest.index];
    if (!tray || tray.sealed || tray.items.length >= tray.cap) return false;
    if (tray.kind != null && tray.kind !== item) return false;
    if (tray.kind == null) {
        for (let i = 0; i < state.trays.length; i++) {
            if (i === action.dest.index) continue;
            const other = state.trays[i];
            if (!other.sealed && other.kind === item && other.items.length < other.cap) return false;
        }
    }
    return true;
}

function applyAction(state: AuditState, action: AuditAction): AuditState | null {
    if (!canApply(state, action)) return null;
    const next = cloneState(state);
    const item = sourceItem(next, action);
    if (!item) return null;
    if (action.source === 'bag') next.bags[action.sourceIndex].pop();
    else next.buffer[action.sourceIndex] = null;
    if (action.dest.kind === 'buffer') {
        next.buffer[action.dest.index] = item;
    } else {
        const tray = next.trays[action.dest.index];
        tray.items.push(item);
        if (tray.kind == null) tray.kind = item;
        if (tray.items.length === tray.cap) tray.sealed = true;
    }
    return next;
}

function sourceItem(state: AuditState, action: AuditAction): FoodId | null {
    if (action.source === 'buffer') return state.buffer[action.sourceIndex] || null;
    const bag = state.bags[action.sourceIndex];
    return bag && bag.length > 0 ? bag[bag.length - 1] : null;
}

function isWin(state: AuditState): boolean {
    if (state.bags.some((bag) => bag.length > 0)) return false;
    if (state.buffer.some((item) => item != null)) return false;
    return state.trays.every((tray) => tray.items.length === 0 || tray.sealed);
}

function cloneState(state: AuditState): AuditState {
    return {
        trays: state.trays.map((tray) => ({
            cap: tray.cap,
            kind: tray.kind,
            items: tray.items.slice(),
            sealed: tray.sealed,
        })),
        bags: state.bags.map((bag) => bag.slice()),
        buffer: state.buffer.slice(),
        bufferEnabled: state.bufferEnabled,
    };
}

function observationKey(state: AuditState): string {
    const trays = state.trays
        .map((tray) => `${tray.cap}:${tray.kind || '-'}:${tray.items.length}:${tray.sealed ? 1 : 0}`)
        .join('|');
    const bags = state.bags
        .map((bag) => `${bag.length}:${bag.length > 0 ? bag[bag.length - 1] : '-'}`)
        .join('|');
    return `${trays}/${bags}/${state.bufferEnabled ? 1 : 0}:${state.buffer.map((item) => item || '-').join(',')}`;
}

function stateKey(state: AuditState): string {
    const trays = state.trays
        .map((tray) => `${tray.cap}:${tray.kind || '-'}:${tray.items.join(',')}:${tray.sealed ? 1 : 0}`)
        .join('|');
    return `${trays}/${state.bags.map((bag) => bag.join(',')).join('|')}/${state.bufferEnabled ? 1 : 0}:${state.buffer.map((item) => item || '-').join(',')}`;
}

function uniqueStates(states: AuditState[]): AuditState[] {
    const seen = new Set<string>();
    const result: AuditState[] = [];
    for (let i = 0; i < states.length; i++) {
        const key = stateKey(states[i]);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(states[i]);
    }
    return result;
}

function uniqueActions(actions: AuditAction[]): AuditAction[] {
    const seen = new Set<string>();
    return actions.filter((action) => {
        const key = `${action.source}:${action.sourceIndex}>${action.dest.kind}:${action.dest.index}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function maxBufferOccupancy(states: AuditState[]): number {
    let max = 0;
    for (let i = 0; i < states.length; i++) {
        let count = 0;
        for (let b = 0; b < states[i].buffer.length; b++) {
            if (states[i].buffer[b] != null) count += 1;
        }
        max = Math.max(max, count);
    }
    return max;
}

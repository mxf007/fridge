import { FOOD_IDS, type FoodId } from '../game/types';

export type BulkTrayDef = {
    cap: number;
};

export type BulkStageDef = {
    id: string;
    title: string;
    trays: BulkTrayDef[];
    queuePreview: number;
    bags: FoodId[][];
    receipt: Partial<Record<FoodId, number>>;
    /** 第三趟保底：冰箱已收件数达到这个数就记下。前两趟不写。 */
    checkpointItems?: number;
    /** 这趟的对格意图，给测试看，不参与落子。 */
    plan?: string;
};

export type BulkRunDef = {
    id: string;
    title: string;
    unlockCleared: number;
    counterSlots: number;
    bufferStackCap: number;
    stages: BulkStageDef[];
    /** 利落余量 = 最深列 − 1。完美步数还要等求解器。 */
    tidySlack?: number;
};

export type BulkActiveTrayState = {
    cap: number;
    filled: number;
    kind: FoodId | null;
    sealed: boolean;
    queueIndex: number;
};

export type BulkCounterStackState = {
    kind: FoodId | null;
    count: number;
    cap: number;
};

export type BulkStageSnapshot = {
    stageIndex: number;
    bags: FoodId[][];
    activeTrays: BulkActiveTrayState[];
    queuedTrays: BulkTrayDef[];
    counterStacks: BulkCounterStackState[];
    receiptRemaining: Partial<Record<FoodId, number>>;
};

export type BulkRunSave = {
    runId: string;
    currentStage: number;
    stageCheckpoint: BulkStageSnapshot | null;
    branchCheckpoint: BulkStageSnapshot | null;
    current: BulkStageSnapshot;
    /** 第三趟保底已经写过，就不再往后覆盖。 */
    stageCheckpointLocked?: boolean;
};

export function cloneBags(bags: FoodId[][]): FoodId[][] {
    return bags.map((col) => col.slice());
}

export function cloneReceipt(receipt: Partial<Record<FoodId, number>>): Partial<Record<FoodId, number>> {
    const next: Partial<Record<FoodId, number>> = {};
    for (let i = 0; i < FOOD_IDS.length; i++) {
        const id = FOOD_IDS[i];
        const n = receipt[id];
        if (n && n > 0) next[id] = n;
    }
    return next;
}

export function cloneActiveTrays(trays: BulkActiveTrayState[]): BulkActiveTrayState[] {
    return trays.map((tray) => ({ ...tray }));
}

export function cloneCounterStacks(stacks: BulkCounterStackState[]): BulkCounterStackState[] {
    return stacks.map((stack) => ({ ...stack }));
}

export function cloneTrayDefs(trays: BulkTrayDef[]): BulkTrayDef[] {
    return trays.map((tray) => ({ ...tray }));
}

export function cloneStageSnapshot(snapshot: BulkStageSnapshot): BulkStageSnapshot {
    return {
        stageIndex: snapshot.stageIndex,
        bags: cloneBags(snapshot.bags),
        activeTrays: cloneActiveTrays(snapshot.activeTrays),
        queuedTrays: cloneTrayDefs(snapshot.queuedTrays),
        counterStacks: cloneCounterStacks(snapshot.counterStacks),
        receiptRemaining: cloneReceipt(snapshot.receiptRemaining),
    };
}

export function countFoods(bags: FoodId[][]): Partial<Record<FoodId, number>> {
    const receipt: Partial<Record<FoodId, number>> = {};
    for (let c = 0; c < bags.length; c++) {
        for (let i = 0; i < bags[c].length; i++) {
            const item = bags[c][i];
            receipt[item] = (receipt[item] || 0) + 1;
        }
    }
    return receipt;
}

export function assertBulkStageDef(stage: BulkStageDef, openTrays = 4): void {
    if (!stage.id) throw new Error('bulk stage missing id');
    if (stage.trays.length < openTrays) throw new Error(`${stage.id} trays<${openTrays}`);
    if (stage.queuePreview < 0) throw new Error(`${stage.id} queuePreview<0`);
    const totalCap = stage.trays.reduce((sum, tray) => sum + tray.cap, 0);
    const bagCount = stage.bags.reduce((sum, col) => sum + col.length, 0);
    if (totalCap !== bagCount) throw new Error(`${stage.id} cap!=items`);
    const counted = countFoods(stage.bags);
    for (let i = 0; i < FOOD_IDS.length; i++) {
        const id = FOOD_IDS[i];
        if ((counted[id] || 0) !== (stage.receipt[id] || 0)) {
            throw new Error(`${stage.id} receipt mismatch:${id}`);
        }
    }
}

export function assertBulkRunDef(run: BulkRunDef): void {
    if (!run.id) throw new Error('bulk run missing id');
    if (run.counterSlots <= 0) throw new Error(`${run.id} counterSlots<=0`);
    if (run.bufferStackCap <= 0) throw new Error(`${run.id} bufferStackCap<=0`);
    if (run.stages.length === 0) throw new Error(`${run.id} no stages`);
    for (let i = 0; i < run.stages.length; i++) {
        if (run.stages[i].bags.length === 0) continue;
        assertBulkStageDef(run.stages[i]);
    }
}

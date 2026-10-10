import type { FailReason, FoodId } from '../game/types';
import { FOOD_IDS } from '../game/types';
import {
    assertBulkRunDef,
    cloneActiveTrays,
    cloneBags,
    cloneCounterStacks,
    cloneReceipt,
    cloneStageSnapshot,
    cloneTrayDefs,
    type BulkActiveTrayState,
    type BulkCounterStackState,
    type BulkRunDef,
    type BulkRunSave,
    type BulkStageDef,
    type BulkStageSnapshot,
    type BulkTrayDef,
} from './types';
import { ensureBulkStageBags } from './levelConfig';

const OPEN_TRAY_COUNT = 4;

function makeActiveTray(tray: BulkTrayDef, queueIndex: number): BulkActiveTrayState {
    return {
        cap: tray.cap,
        filled: 0,
        kind: null,
        sealed: false,
        queueIndex,
    };
}

export class BulkPurchaseState {
    readonly runDef: BulkRunDef;
    currentStage = 0;
    activeTrays: BulkActiveTrayState[] = [];
    queuedTrays: BulkTrayDef[] = [];
    bags: FoodId[][] = [];
    counterStacks: BulkCounterStackState[] = [];
    receiptRemaining: Partial<Record<FoodId, number>> = {};
    stageCheckpoint: BulkStageSnapshot | null = null;
    branchCheckpoint: BulkStageSnapshot | null = null;
    stageCheckpointLocked = false;
    steps = 0;

    static fromRun(runDef: BulkRunDef): BulkPurchaseState {
        return new BulkPurchaseState(runDef);
    }

    private constructor(runDef: BulkRunDef) {
        assertBulkRunDef(runDef);
        this.runDef = runDef;
        this.loadStage(0);
    }

    get stageDef(): BulkStageDef {
        return this.runDef.stages[this.currentStage];
    }

    previewTrays(): BulkTrayDef[] {
        return cloneTrayDefs(this.queuedTrays.slice(0, this.stageDef.queuePreview));
    }

    peekBag(col: number): FoodId | null {
        const bag = this.bags[col];
        if (!bag || bag.length === 0) return null;
        return bag[bag.length - 1];
    }

    bagDepth(col: number): number {
        const bag = this.bags[col];
        return bag ? bag.length : 0;
    }

    detectFail(): FailReason | null {
        if (this.isStageResolved()) return null;
        if (this.isLockedOut()) return 'locked_out';
        if (this.isDeadlocked()) return 'buffer_full';
        return null;
    }

    isStageResolved(): boolean {
        for (let i = 0; i < this.bags.length; i++) {
            if (this.bags[i].length > 0) return false;
        }
        for (let i = 0; i < this.counterStacks.length; i++) {
            if (this.counterStacks[i].count > 0) return false;
        }
        if (this.queuedTrays.length > 0) return false;
        for (let i = 0; i < this.activeTrays.length; i++) {
            if (!this.activeTrays[i].sealed) return false;
        }
        return true;
    }

    private isDeadlocked(): boolean {
        let pending = false;
        for (let i = 0; i < this.bags.length; i++) {
            if (this.bags[i].length > 0) pending = true;
        }
        for (let i = 0; i < this.counterStacks.length; i++) {
            if (this.counterStacks[i].count > 0) pending = true;
        }
        if (!pending) return false;
        for (let col = 0; col < this.bags.length; col++) {
            if (!this.peekBag(col)) continue;
            for (let t = 0; t < this.activeTrays.length; t++) {
                if (this.debugCanPlaceBagTopToTray(col, t)) return false;
            }
            if (this.debugCanPlaceBagTopToAnyCounter(col)) return false;
        }
        for (let c = 0; c < this.counterStacks.length; c++) {
            if ((this.counterStacks[c].count || 0) <= 0) continue;
            for (let t = 0; t < this.activeTrays.length; t++) {
                if (this.debugCounterCanPour(c, t)) return false;
            }
        }
        return true;
    }

    private isLockedOut(): boolean {
        let bagOrCounter = false;
        for (let i = 0; i < this.bags.length; i++) {
            if (this.bags[i].length > 0) bagOrCounter = true;
        }
        for (let i = 0; i < this.counterStacks.length; i++) {
            if (this.counterStacks[i].count > 0) bagOrCounter = true;
        }
        if (!bagOrCounter) return true;
        for (let k = 0; k < FOOD_IDS.length; k++) {
            const kind = FOOD_IDS[k];
            let remaining = 0;
            for (let i = 0; i < this.bags.length; i++) {
                const bag = this.bags[i];
                for (let n = 0; n < bag.length; n++) if (bag[n] === kind) remaining += 1;
            }
            for (let i = 0; i < this.counterStacks.length; i++) {
                const stack = this.counterStacks[i];
                if (stack.kind === kind) remaining += stack.count;
            }
            if (remaining <= 0) continue;
            let capLeft = 0;
            let hasOpenSame = false;
            let emptyCap = 0;
            for (let i = 0; i < this.activeTrays.length; i++) {
                const tray = this.activeTrays[i];
                if (tray.sealed) continue;
                if (tray.kind === kind) {
                    capLeft += tray.cap - tray.filled;
                    hasOpenSame = true;
                } else if (tray.kind == null) {
                    emptyCap += tray.cap;
                }
            }
            let queueCap = 0;
            for (let i = 0; i < this.queuedTrays.length; i++) queueCap += this.queuedTrays[i].cap;
            capLeft += hasOpenSame ? queueCap : emptyCap + queueCap;
            if (remaining > capLeft) return true;
        }
        return false;
    }

    /** 锁错时标题用的种类：优先已开格上那一种，否则取第一件装不下的。 */
    debugLockedOutKind(): FoodId | null {
        let first: FoodId | null = null;
        let onTray: FoodId | null = null;
        for (let k = 0; k < FOOD_IDS.length; k++) {
            const kind = FOOD_IDS[k];
            let remaining = 0;
            for (let i = 0; i < this.bags.length; i++) {
                const bag = this.bags[i];
                for (let n = 0; n < bag.length; n++) if (bag[n] === kind) remaining += 1;
            }
            for (let i = 0; i < this.counterStacks.length; i++) {
                const stack = this.counterStacks[i];
                if (stack.kind === kind) remaining += stack.count;
            }
            if (remaining <= 0) continue;
            let capLeft = 0;
            let hasOpenSame = false;
            let emptyCap = 0;
            for (let i = 0; i < this.activeTrays.length; i++) {
                const tray = this.activeTrays[i];
                if (tray.sealed) continue;
                if (tray.kind === kind) {
                    capLeft += tray.cap - tray.filled;
                    hasOpenSame = true;
                } else if (tray.kind == null) {
                    emptyCap += tray.cap;
                }
            }
            let queueCap = 0;
            for (let i = 0; i < this.queuedTrays.length; i++) queueCap += this.queuedTrays[i].cap;
            capLeft += hasOpenSame ? queueCap : emptyCap + queueCap;
            if (remaining <= capLeft) continue;
            if (!first) first = kind;
            if (hasOpenSame && !onTray) onTray = kind;
        }
        return onTray || first;
    }

    startStage(index: number): void {
        if (index < 0 || index >= this.runDef.stages.length) {
            throw new Error(`bulk stage out of range:${index}`);
        }
        this.loadStage(index);
    }

    advanceStage(): boolean {
        if (this.currentStage + 1 >= this.runDef.stages.length) return false;
        this.loadStage(this.currentStage + 1);
        return true;
    }

    takeStageCheckpoint(): BulkStageSnapshot {
        this.stageCheckpoint = this.snapshot();
        return cloneStageSnapshot(this.stageCheckpoint);
    }

    restoreStageCheckpoint(): boolean {
        if (!this.stageCheckpoint) return false;
        this.applySnapshot(this.stageCheckpoint);
        return true;
    }

    takeBranchCheckpoint(): BulkStageSnapshot {
        this.branchCheckpoint = this.snapshot();
        return cloneStageSnapshot(this.branchCheckpoint);
    }

    restoreBranchCheckpoint(): boolean {
        if (!this.branchCheckpoint) return false;
        this.applySnapshot(this.branchCheckpoint);
        return true;
    }

    snapshot(): BulkStageSnapshot {
        return {
            stageIndex: this.currentStage,
            bags: cloneBags(this.bags),
            activeTrays: cloneActiveTrays(this.activeTrays),
            queuedTrays: cloneTrayDefs(this.queuedTrays),
            counterStacks: cloneCounterStacks(this.counterStacks),
            receiptRemaining: cloneReceipt(this.receiptRemaining),
        };
    }

    serialize(): BulkRunSave {
        return {
            runId: this.runDef.id,
            currentStage: this.currentStage,
            stageCheckpoint: this.stageCheckpoint ? cloneStageSnapshot(this.stageCheckpoint) : null,
            branchCheckpoint: this.branchCheckpoint ? cloneStageSnapshot(this.branchCheckpoint) : null,
            current: this.snapshot(),
            stageCheckpointLocked: this.stageCheckpointLocked,
        };
    }

    restore(save: BulkRunSave): void {
        if (save.runId !== this.runDef.id) {
            throw new Error(`bulk save mismatch:${save.runId}`);
        }
        this.currentStage = save.currentStage;
        this.applySnapshot(save.current);
        this.stageCheckpoint = save.stageCheckpoint ? cloneStageSnapshot(save.stageCheckpoint) : null;
        this.branchCheckpoint = save.branchCheckpoint ? cloneStageSnapshot(save.branchCheckpoint) : null;
        this.stageCheckpointLocked = !!save.stageCheckpointLocked;
    }

    restartStage(): void {
        this.loadStage(this.currentStage);
    }

    debugResolveLockedOut(): 'branch' | 'stage' {
        if (this.restoreBranchCheckpoint()) return 'branch';
        this.restartStage();
        return 'stage';
    }

    debugResolveBufferFull(): 'checkpoint' | 'stage' {
        if (this.restoreStageCheckpoint()) return 'checkpoint';
        this.restartStage();
        return 'stage';
    }

    debugSetTray(index: number, kind: FoodId | null, filled: number): void {
        const tray = this.activeTrays[index];
        if (!tray) return;
        tray.kind = kind;
        tray.filled = Math.max(0, Math.min(filled, tray.cap));
        tray.sealed = tray.filled >= tray.cap;
    }

    debugSetCounter(index: number, kind: FoodId | null, count: number): void {
        const stack = this.counterStacks[index];
        if (!stack) return;
        stack.kind = kind;
        stack.count = Math.max(0, Math.min(count, stack.cap));
        if (stack.count === 0) stack.kind = null;
    }

    debugConsumeReceipt(kind: FoodId, count: number): void {
        const next = Math.max(0, (this.receiptRemaining[kind] || 0) - Math.max(0, count));
        if (next > 0) this.receiptRemaining[kind] = next;
        else delete this.receiptRemaining[kind];
    }

    debugCounterCanPour(counterIndex: number, trayIndex: number): boolean {
        const stack = this.counterStacks[counterIndex];
        const tray = this.activeTrays[trayIndex];
        if (!stack || !tray || !stack.kind || stack.count <= 0) return false;
        if (tray.sealed || tray.filled >= tray.cap) return false;
        if (tray.kind != null && tray.kind !== stack.kind) return false;
        if (tray.kind == null && this.hasUnfilledKind(stack.kind, trayIndex)) return false;
        return true;
    }

    debugCanPlaceBagTopToTray(col: number, trayIndex: number): boolean {
        const item = this.peekBag(col);
        const tray = this.activeTrays[trayIndex];
        if (!item || !tray) return false;
        if (tray.sealed || tray.filled >= tray.cap) return false;
        if (tray.kind != null && tray.kind !== item) return false;
        if (tray.kind == null && this.hasUnfilledKind(item, trayIndex)) return false;
        return true;
    }

    /** 空格上同种已有未满格。继续收那一格不受这条款限制。 */
    debugRejectsNewTray(item: FoodId, trayIndex: number): boolean {
        const tray = this.activeTrays[trayIndex];
        if (!tray || tray.sealed || tray.kind != null || tray.filled >= tray.cap) return false;
        return this.hasUnfilledKind(item, trayIndex);
    }

    private hasUnfilledKind(item: FoodId, exceptIndex: number): boolean {
        for (let i = 0; i < this.activeTrays.length; i++) {
            if (i === exceptIndex) continue;
            const tray = this.activeTrays[i];
            if (tray.sealed || tray.kind !== item) continue;
            if (tray.filled < tray.cap) return true;
        }
        return false;
    }

    debugCanPlaceBagTopToCounter(col: number, counterIndex: number): boolean {
        const item = this.peekBag(col);
        const stack = this.counterStacks[counterIndex];
        if (!item || !stack) return false;
        if (stack.count >= stack.cap) return false;
        if (stack.kind != null && stack.kind !== item) return false;
        return true;
    }

    debugFindBagTopCounterIndex(col: number): number {
        const item = this.peekBag(col);
        if (!item) return -1;
        for (let i = 0; i < this.counterStacks.length; i++) {
            const stack = this.counterStacks[i];
            if (stack.kind === item && stack.count < stack.cap) return i;
        }
        for (let i = 0; i < this.counterStacks.length; i++) {
            const stack = this.counterStacks[i];
            if (stack.count <= 0) return i;
        }
        return -1;
    }

    debugCanPlaceBagTopToAnyCounter(col: number): boolean {
        return this.debugFindBagTopCounterIndex(col) >= 0;
    }

    debugPlaceBagTopToTray(col: number, trayIndex: number): boolean {
        if (!this.debugCanPlaceBagTopToTray(col, trayIndex)) return false;
        const item = this.peekBag(col) as FoodId;
        const tray = this.activeTrays[trayIndex];
        if (tray.kind == null) tray.kind = item;
        tray.filled += 1;
        this.debugConsumeReceipt(item, 1);
        this.bags[col].pop();
        this.steps += 1;
        if (tray.filled >= tray.cap) this.debugSealAndAdvance(trayIndex);
        this.noteStageCheckpoint();
        return true;
    }

    debugPlaceBagTopToCounter(col: number, counterIndex: number): boolean {
        if (!this.debugCanPlaceBagTopToCounter(col, counterIndex)) return false;
        const item = this.peekBag(col) as FoodId;
        const stack = this.counterStacks[counterIndex];
        if (stack.kind == null) stack.kind = item;
        stack.count += 1;
        this.bags[col].pop();
        this.steps += 1;
        return true;
    }

    debugPlaceBagTopToAnyCounter(col: number): boolean {
        const counterIndex = this.debugFindBagTopCounterIndex(col);
        if (counterIndex < 0) return false;
        return this.debugPlaceBagTopToCounter(col, counterIndex);
    }

    debugPourOneFromCounter(counterIndex: number, trayIndex: number): boolean {
        if (!this.debugCounterCanPour(counterIndex, trayIndex)) return false;
        const stack = this.counterStacks[counterIndex];
        const tray = this.activeTrays[trayIndex];
        const kind = stack.kind as FoodId;
        if (tray.kind == null) tray.kind = kind;
        tray.filled += 1;
        this.debugConsumeReceipt(kind, 1);
        stack.count -= 1;
        if (stack.count <= 0) {
            stack.count = 0;
            stack.kind = null;
        }
        this.steps += 1;
        if (tray.filled >= tray.cap) this.debugSealAndAdvance(trayIndex);
        this.noteStageCheckpoint();
        return true;
    }

    debugSealAndAdvance(index: number): { sealedCap: number; nextCap: number | null } | null {
        const tray = this.activeTrays[index];
        if (!tray) return null;
        tray.filled = tray.cap;
        tray.sealed = true;
        const sealedCap = tray.cap;
        const next = this.queuedTrays.shift() || null;
        if (next) this.activeTrays[index] = makeActiveTray(next, tray.queueIndex);
        return { sealedCap, nextCap: next ? next.cap : null };
    }

    private loadStage(index: number): void {
        ensureBulkStageBags(this.runDef, index);
        const stage = this.runDef.stages[index];
        this.currentStage = index;
        this.activeTrays = stage.trays.slice(0, OPEN_TRAY_COUNT).map((tray, trayIndex) => makeActiveTray(tray, trayIndex));
        this.queuedTrays = cloneTrayDefs(stage.trays.slice(OPEN_TRAY_COUNT));
        this.bags = cloneBags(stage.bags);
        this.receiptRemaining = cloneReceipt(stage.receipt);
        this.counterStacks = [];
        for (let i = 0; i < this.runDef.counterSlots; i++) {
            this.counterStacks.push({
                kind: null,
                count: 0,
                cap: this.runDef.bufferStackCap,
            });
        }
        this.stageCheckpoint = this.snapshot();
        this.branchCheckpoint = this.snapshot();
        this.stageCheckpointLocked = false;
    }

    private fridgePlacedCount(): number {
        const receipt = this.stageDef.receipt;
        let total = 0;
        let left = 0;
        for (let i = 0; i < FOOD_IDS.length; i++) {
            const id = FOOD_IDS[i];
            total += receipt[id] || 0;
            left += this.receiptRemaining[id] || 0;
        }
        let onCounter = 0;
        for (let i = 0; i < this.counterStacks.length; i++) onCounter += this.counterStacks[i].count;
        return total - left - onCounter;
    }

    private refillCount(): number {
        const queuedAtStart = Math.max(0, this.stageDef.trays.length - OPEN_TRAY_COUNT);
        return queuedAtStart - this.queuedTrays.length;
    }

    /** 第三趟：已收件数到配置的 40%，或第一次补格，先到先记。只记一次。 */
    private noteStageCheckpoint(): void {
        if (this.stageCheckpointLocked) return;
        const mark = this.stageDef.checkpointItems;
        if (mark == null) return;
        if (this.fridgePlacedCount() >= mark || this.refillCount() > 0) {
            this.stageCheckpoint = this.snapshot();
            this.stageCheckpointLocked = true;
        }
    }

    private applySnapshot(snapshot: BulkStageSnapshot): void {
        this.currentStage = snapshot.stageIndex;
        this.activeTrays = cloneActiveTrays(snapshot.activeTrays);
        this.queuedTrays = cloneTrayDefs(snapshot.queuedTrays);
        this.bags = cloneBags(snapshot.bags);
        this.counterStacks = cloneCounterStacks(snapshot.counterStacks);
        this.receiptRemaining = cloneReceipt(snapshot.receiptRemaining);
    }
}

import type {
    Dest,
    FailReason,
    FoodId,
    LevelDef,
    PlaceReason,
    PlaceResult,
    TrayState,
} from './types';

function cloneBags(bags: FoodId[][]): FoodId[][] {
    return bags.map((col) => col.slice());
}

export class BoardState {
    readonly level: LevelDef;
    trays: TrayState[];
    bags: FoodId[][];
    buffer: (FoodId | null)[];
    dest: Dest | null;
    steps = 0;

    static fromLevel(level: LevelDef): BoardState {
        return new BoardState(level);
    }

    private constructor(level: LevelDef) {
        this.level = level;
        this.trays = level.trays.map((t) => ({
            cap: t.cap,
            kind: null,
            items: [],
            sealed: false,
        }));
        this.bags = cloneBags(level.bags);
        const n = level.buffer > 0 ? level.buffer : 3;
        this.buffer = [];
        for (let i = 0; i < n; i++) this.buffer.push(null);
        this.dest = this.leftmostReceivableTrayDest();
    }

    get bufferEnabled(): boolean {
        return this.level.id >= 10;
    }

    peekBag(col: number): FoodId | null {
        const bag = this.bags[col];
        if (!bag || bag.length === 0) return null;
        return bag[bag.length - 1];
    }

    selectTray(index: number): void {
        const tray = this.trays[index];
        if (!tray || tray.sealed) return;
        this.dest = { kind: 'tray', index };
    }

    selectBuffer(index: number): void {
        if (!this.bufferEnabled) return;
        if (index < 0 || index >= this.buffer.length) return;
        if (this.buffer[index] != null) return;
        this.dest = { kind: 'buffer', index };
    }

    placeFromBag(col: number): PlaceResult {
        const item = this.peekBag(col);
        if (!item) {
            return this.fail('no_target', 'milk');
        }
        const result = this.tryPlace(item, 'bag');
        if (result.ok) {
            this.bags[col].pop();
        }
        return result;
    }

    placeFromBuffer(index: number): PlaceResult {
        if (!this.bufferEnabled) {
            return this.fail('no_target', 'milk');
        }
        const item = this.buffer[index];
        if (item == null) {
            return this.fail('no_target', 'milk');
        }
        const result = this.tryPlace(item, 'buffer');
        if (result.ok) {
            this.buffer[index] = null;
        }
        return result;
    }

    isWin(): boolean {
        for (let i = 0; i < this.bags.length; i++) {
            if (this.bags[i].length > 0) return false;
        }
        for (let i = 0; i < this.buffer.length; i++) {
            if (this.buffer[i] != null) return false;
        }
        for (let i = 0; i < this.trays.length; i++) {
            const t = this.trays[i];
            if (t.items.length > 0 && !t.sealed) return false;
        }
        return true;
    }

    failReason(): FailReason | null {
        if (this.isWin()) return null;
        if (this.hasLegalMove()) return null;
        if (this.bufferEnabled) {
            for (let i = 0; i < this.buffer.length; i++) {
                if (this.buffer[i] == null) return 'locked_out';
            }
            return 'buffer_full';
        }
        return 'locked_out';
    }

    hasLegalMove(): boolean {
        const dests = this.allSelectableDests();
        const items = this.clickableItems();
        for (let d = 0; d < dests.length; d++) {
            for (let i = 0; i < items.length; i++) {
                if (this.canAccept(dests[d], items[i].item, items[i].source).ok) return true;
            }
        }
        return false;
    }

    canAccept(
        dest: Dest | null,
        item: FoodId,
        source: 'bag' | 'buffer',
    ): { ok: true } | { ok: false; reason: PlaceReason } {
        if (!dest) return { ok: false, reason: 'no_target' };
        if (dest.kind === 'buffer') {
            if (!this.bufferEnabled) return { ok: false, reason: 'no_target' };
            if (source === 'buffer') return { ok: false, reason: 'dest_full' };
            if (this.buffer[dest.index] != null) return { ok: false, reason: 'dest_full' };
            return { ok: true };
        }
        const tray = this.trays[dest.index];
        if (!tray || tray.sealed || tray.items.length >= tray.cap) {
            return { ok: false, reason: 'dest_full' };
        }
        if (tray.kind != null && tray.kind !== item) {
            return { ok: false, reason: 'wrong_kind' };
        }
        if (tray.kind == null && this.hasUnfilledKind(item, dest.index)) {
            return { ok: false, reason: 'anti_split' };
        }
        return { ok: true };
    }

    private tryPlace(item: FoodId, source: 'bag' | 'buffer'): PlaceResult {
        const check = this.canAccept(this.dest, item, source);
        if (!check.ok) {
            if (check.reason === 'dest_full') this.retargetIfNeeded();
            return this.fail(check.reason, item);
        }
        const dest = this.dest;
        if (!dest) return this.fail('no_target', item);
        let sealed = false;
        if (dest.kind === 'tray') {
            const tray = this.trays[dest.index];
            tray.items.push(item);
            if (tray.kind == null) tray.kind = item;
            if (tray.items.length >= tray.cap) {
                tray.sealed = true;
                sealed = true;
            }
        } else {
            this.buffer[dest.index] = item;
        }
        this.steps += 1;
        this.retargetIfNeeded();
        return { ok: true, item, dest, sealed, steps: this.steps };
    }

    private fail(reason: PlaceReason, item: FoodId): PlaceResult {
        return { ok: false, reason, item, hintTrays: this.hintTrays(reason, item) };
    }

    private hintTrays(reason: PlaceReason, item: FoodId): number[] {
        if (reason === 'wrong_kind' || reason === 'anti_split') {
            const hits: number[] = [];
            for (let i = 0; i < this.trays.length; i++) {
                if (this.canAccept({ kind: 'tray', index: i }, item, 'bag').ok) hits.push(i);
            }
            return hits;
        }
        if (reason === 'no_target') {
            const d = this.leftmostReceivableTrayDest();
            return d ? [d.index] : [];
        }
        return [];
    }

    private hasUnfilledKind(item: FoodId, exceptIndex: number): boolean {
        for (let i = 0; i < this.trays.length; i++) {
            if (i === exceptIndex) continue;
            const t = this.trays[i];
            if (!t.sealed && t.kind === item && t.items.length < t.cap) return true;
        }
        return false;
    }

    private retargetIfNeeded(): void {
        if (this.dest && this.isDestOpen(this.dest)) return;
        const tray = this.leftmostReceivableTrayDest();
        if (tray) {
            this.dest = tray;
            return;
        }
        if (this.bufferEnabled) {
            for (let i = 0; i < this.buffer.length; i++) {
                if (this.buffer[i] == null) {
                    this.dest = { kind: 'buffer', index: i };
                    return;
                }
            }
        }
        this.dest = null;
    }

    private isDestOpen(dest: Dest): boolean {
        if (dest.kind === 'tray') {
            const t = this.trays[dest.index];
            return !!t && !t.sealed && t.items.length < t.cap;
        }
        return this.bufferEnabled && this.buffer[dest.index] == null;
    }

    private leftmostReceivableTrayDest(): Dest | null {
        for (let i = 0; i < this.trays.length; i++) {
            const t = this.trays[i];
            if (!t.sealed && t.items.length < t.cap) return { kind: 'tray', index: i };
        }
        return null;
    }

    private allSelectableDests(): Dest[] {
        const dests: Dest[] = [];
        for (let i = 0; i < this.trays.length; i++) {
            const t = this.trays[i];
            if (!t.sealed && t.items.length < t.cap) dests.push({ kind: 'tray', index: i });
        }
        if (this.bufferEnabled) {
            for (let i = 0; i < this.buffer.length; i++) {
                if (this.buffer[i] == null) dests.push({ kind: 'buffer', index: i });
            }
        }
        return dests;
    }

    private clickableItems(): { item: FoodId; source: 'bag' | 'buffer' }[] {
        const items: { item: FoodId; source: 'bag' | 'buffer' }[] = [];
        for (let c = 0; c < this.bags.length; c++) {
            const top = this.peekBag(c);
            if (top) items.push({ item: top, source: 'bag' });
        }
        if (this.bufferEnabled) {
            for (let i = 0; i < this.buffer.length; i++) {
                const v = this.buffer[i];
                if (v != null) items.push({ item: v, source: 'buffer' });
            }
        }
        return items;
    }
}

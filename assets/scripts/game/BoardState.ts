import {
    FOOD_IDS,
    type Dest,
    type FailReason,
    type FoodId,
    type HintPick,
    type LevelDef,
    type PlaceReason,
    type PlaceResult,
    type TrayState,
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
        const depth = this.bags[col].length;
        const result = this.tryPlace(item, 'bag', depth);
        if (result.ok) {
            this.bags[col].pop();
            this.retargetIfNeeded();
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
            this.retargetIfNeeded();
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

    /** 胜负判定全关同一套；不按关卡号分支。 */
    failReason(): FailReason | null {
        if (this.isWin()) return null;
        // 购物袋每列只剩 1 个时，场上没有隐藏层；此时若件数对不上空格，直接锁错。
        if (this.allBagStacksAreSingle() && this.countsCannotPack()) return 'locked_out';
        if (!this.hasLegalMove()) return this.closedFailReason();
        return null;
    }

    /** 凑不满的格子。失败闪这些，而不是只闪已经封上的门。 */
    unfillableTrayIndexes(): number[] {
        const hits: number[] = [];
        for (let i = 0; i < this.trays.length; i++) {
            const tray = this.trays[i];
            if (tray.sealed || tray.kind == null) continue;
            if (this.supplyForTray(i) < tray.cap) hits.push(i);
        }
        return hits;
    }

    findHint(): HintPick | null {
        const dests = this.allSelectableDests();
        const cands: { dest: Dest; bagCol?: number; bufferIndex?: number; score: number }[] = [];
        for (let d = 0; d < dests.length; d++) {
            for (let c = 0; c < this.bags.length; c++) {
                const item = this.peekBag(c);
                if (!item) continue;
                if (!this.canAccept(dests[d], item, 'bag', this.bags[c].length).ok) continue;
                let score = 0;
                if (dests[d].kind === 'tray' && this.trays[dests[d].index].kind === item) score += 20;
                if (this.dest && dests[d].kind === this.dest.kind && dests[d].index === this.dest.index) {
                    score += 5;
                }
                cands.push({ dest: dests[d], bagCol: c, score });
            }
            if (!this.bufferEnabled || dests[d].kind === 'buffer') continue;
            for (let i = 0; i < this.buffer.length; i++) {
                const item = this.buffer[i];
                if (item == null) continue;
                if (!this.canAccept(dests[d], item, 'buffer').ok) continue;
                let score = 10;
                if (this.trays[dests[d].index].kind === item) score += 20;
                cands.push({ dest: dests[d], bufferIndex: i, score });
            }
        }
        if (cands.length === 0) return null;
        cands.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            if (a.dest.index !== b.dest.index) return a.dest.index - b.dest.index;
            const ac = a.bagCol != null ? a.bagCol : 99;
            const bc = b.bagCol != null ? b.bagCol : 99;
            return ac - bc;
        });
        const top = cands[0];
        return { dest: top.dest, bagCol: top.bagCol, bufferIndex: top.bufferIndex };
    }

    /** 柜台已满或没有合法步时的失败分型。柜台还有空位时不是 buffer_full。 */
    private closedFailReason(): FailReason {
        if (this.bufferEnabled) {
            for (let i = 0; i < this.buffer.length; i++) {
                if (this.buffer[i] == null) return 'locked_out';
            }
            return 'buffer_full';
        }
        return 'locked_out';
    }

    /** 购物袋每列最多 1 个：没有下层可翻，才算「桌上都摊开了」。 */
    private allBagStacksAreSingle(): boolean {
        for (let i = 0; i < this.bags.length; i++) {
            if (this.bags[i].length > 1) return false;
        }
        return true;
    }

    /**
     * 已放进格子的食材必须能把该格装满；还在袋子和柜台里的，要能正好分进空格容量。
     * 空格可以不用。凑不满就不可能收齐。
     */
    private countsCannotPack(): boolean {
        const free: Partial<Record<FoodId, number>> = {};
        const add = (kind: FoodId) => {
            free[kind] = (free[kind] || 0) + 1;
        };
        for (let c = 0; c < this.bags.length; c++) {
            for (let k = 0; k < this.bags[c].length; k++) add(this.bags[c][k]);
        }
        for (let i = 0; i < this.buffer.length; i++) {
            const item = this.buffer[i];
            if (item) add(item);
        }
        const emptyCaps: number[] = [];
        for (let i = 0; i < this.trays.length; i++) {
            const tray = this.trays[i];
            if (tray.sealed) continue;
            if (tray.kind == null || tray.items.length === 0) {
                emptyCaps.push(tray.cap);
                continue;
            }
            const have = (free[tray.kind] || 0) + tray.items.length;
            if (have < tray.cap) return true;
            const extra = have - tray.cap;
            if (extra === 0) delete free[tray.kind];
            else free[tray.kind] = extra;
        }
        const piles: number[] = [];
        for (let i = 0; i < FOOD_IDS.length; i++) {
            const n = free[FOOD_IDS[i]] || 0;
            if (n > 0) piles.push(n);
        }
        piles.sort((a, b) => b - a);
        return !this.packPiles(piles, emptyCaps);
    }

    /** 每种剩下的件数正好分成若干空格容量，格子不共用。 */
    private packPiles(piles: number[], caps: number[]): boolean {
        if (piles.length === 0) return true;
        let capSum = 0;
        for (let i = 0; i < caps.length; i++) capSum += caps[i];
        let pileSum = 0;
        for (let i = 0; i < piles.length; i++) pileSum += piles[i];
        if (pileSum > capSum) return false;
        const pile = piles[0];
        const rest = piles.slice(1);
        const n = caps.length;
        const limit = 1 << n;
        for (let mask = 1; mask < limit; mask++) {
            let sum = 0;
            for (let b = 0; b < n; b++) {
                if (mask & (1 << b)) sum += caps[b];
            }
            if (sum !== pile) continue;
            const next: number[] = [];
            for (let b = 0; b < n; b++) {
                if ((mask & (1 << b)) === 0) next.push(caps[b]);
            }
            if (this.packPiles(rest, next)) return true;
        }
        return false;
    }

    /** 能用来装满这一格的件数：格内已有的，加上袋子和柜台里同一种。别的格里的不算。 */
    private supplyForTray(index: number): number {
        const tray = this.trays[index];
        if (tray.kind == null) return tray.items.length;
        let n = tray.items.length;
        for (let c = 0; c < this.bags.length; c++) {
            for (let k = 0; k < this.bags[c].length; k++) if (this.bags[c][k] === tray.kind) n += 1;
        }
        for (let i = 0; i < this.buffer.length; i++) if (this.buffer[i] === tray.kind) n += 1;
        return n;
    }

    hasLegalMove(): boolean {
        const dests = this.allSelectableDests();
        const items = this.clickableItems();
        for (let d = 0; d < dests.length; d++) {
            for (let i = 0; i < items.length; i++) {
                if (this.canAccept(dests[d], items[i].item, items[i].source, items[i].bagDepth).ok) return true;
            }
        }
        return false;
    }

    canAccept(
        dest: Dest | null,
        item: FoodId,
        source: 'bag' | 'buffer',
        bagDepth = 1,
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

    /** 冰箱里没有任何一格能收这件。有空格或同种未满格时不算。 */
    private noFridgeAccepts(item: FoodId, source: 'bag' | 'buffer', bagDepth: number): boolean {
        for (let i = 0; i < this.trays.length; i++) {
            if (this.canAccept({ kind: 'tray', index: i }, item, source, bagDepth).ok) return false;
        }
        return true;
    }

    private tryPlace(item: FoodId, source: 'bag' | 'buffer', bagDepth = 1): PlaceResult {
        const check = this.canAccept(this.dest, item, source, bagDepth);
        if (!check.ok) {
            if (check.reason === 'dest_full') this.retargetIfNeeded();
            if (source === 'bag' && this.bufferEnabled && this.noFridgeAccepts(item, source, bagDepth)) {
                for (let i = 0; i < this.buffer.length; i++) {
                    if (this.buffer[i] == null) return this.fail('need_buffer', item, bagDepth);
                }
            }
            return this.fail(check.reason, item, bagDepth);
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
        return { ok: true, item, dest, sealed, steps: this.steps };
    }

    private fail(reason: PlaceReason, item: FoodId, bagDepth = 1): PlaceResult {
        return {
            ok: false,
            reason,
            item,
            hintTrays: this.hintTrays(reason, item, bagDepth),
            hintBuffers: this.hintBuffers(reason, item),
        };
    }

    private hintTrays(reason: PlaceReason, item: FoodId, bagDepth = 1): number[] {
        if (reason === 'wrong_kind' || reason === 'anti_split' || reason === 'need_buffer') {
            const hits: number[] = [];
            for (let i = 0; i < this.trays.length; i++) {
                if (this.canAccept({ kind: 'tray', index: i }, item, 'bag', bagDepth).ok) hits.push(i);
            }
            return hits;
        }
        if (reason === 'no_target') {
            const d = this.leftmostReceivableTrayDest();
            return d ? [d.index] : [];
        }
        return [];
    }

    private hintBuffers(reason: PlaceReason, item: FoodId): number[] {
        if (!this.bufferEnabled) return [];
        if (reason !== 'wrong_kind' && reason !== 'anti_split' && reason !== 'need_buffer') return [];
        const hits: number[] = [];
        for (let i = 0; i < this.buffer.length; i++) {
            if (this.canAccept({ kind: 'buffer', index: i }, item, 'bag').ok) hits.push(i);
        }
        return hits;
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
        if (this.dest && this.isDestOpen(this.dest)) {
            if (this.dest.kind === 'buffer' && !this.hasBagItems()) {
                const tray = this.leftmostReceivableTrayDest();
                this.dest = tray;
            }
            return;
        }
        const tray = this.leftmostReceivableTrayDest();
        if (tray) {
            this.dest = tray;
            return;
        }
        if (this.bufferEnabled && this.hasBagItems()) {
            for (let i = 0; i < this.buffer.length; i++) {
                if (this.buffer[i] == null) {
                    this.dest = { kind: 'buffer', index: i };
                    return;
                }
            }
        }
        this.dest = null;
    }

    private hasBagItems(): boolean {
        for (let i = 0; i < this.bags.length; i++) {
            if (this.bags[i].length > 0) return true;
        }
        return false;
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

    private clickableItems(): { item: FoodId; source: 'bag' | 'buffer'; bagDepth: number }[] {
        const items: { item: FoodId; source: 'bag' | 'buffer'; bagDepth: number }[] = [];
        for (let c = 0; c < this.bags.length; c++) {
            const top = this.peekBag(c);
            if (top) items.push({ item: top, source: 'bag', bagDepth: this.bags[c].length });
        }
        if (this.bufferEnabled) {
            for (let i = 0; i < this.buffer.length; i++) {
                const v = this.buffer[i];
                if (v != null) items.push({ item: v, source: 'buffer', bagDepth: 1 });
            }
        }
        return items;
    }
}

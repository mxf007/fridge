import { FOOD_IDS, type FoodId } from '../game/types';
import { assertBulkStageDef, type BulkRunDef, type BulkStageDef } from './types';

/** 文档推荐池，补上正文示例里反复出现的 8。 */
export const BULK_TRAY_CAP_POOL = [8, 10, 12, 14, 16, 18, 20] as const;

export type BulkLevelStageConfig = {
    id: string;
    title: string;
    /** 从左到右。前 4 个先上场，剩下的是补位队列。 */
    caps: number[];
    queuePreview: number;
    counts: Partial<Record<FoodId, number>>;
    /** 每列层数。各项之和必须等于 caps 之和，也必须等于 counts 之和。 */
    columns: number[];
    /** 谁该进哪一格。玩家仍自己分配，这行只给复盘。 */
    plan: string;
};

export type BulkLevelConfig = {
    id: string;
    title: string;
    unlockCleared: number;
    counterSlots: number;
    bufferStackCap: number;
    goal: string;
    /** 三趟分钟带相加后的整局验收区间。 */
    targetMinutes: [number, number];
    expectedReplayLine: string;
    stages: BulkLevelStageConfig[];
};

const COLS6 = [8, 8, 8, 8, 8, 8];
const COLS7 = [8, 8, 8, 8, 8, 8, 8];
const COLS8 = [8, 8, 8, 8, 8, 8, 8, 8];

/**
 * 加关：在这张表末尾追加一项。
 * 表本身只是静态配置。铺袋子、校验在 loadBulkLevel() 里做，进那一关再调。
 */
export const BULK_LEVEL_CONFIGS: BulkLevelConfig[] = [
    {
        id: 'bulk_01',
        title: '看小票，别把小件送进大格',
        unlockCleared: 0,
        counterSlots: 3,
        bufferStackCap: 4,
        goal: '大容量格和补位。主难点只有大格诱惑。',
        targetMinutes: [3.9, 6.5],
        expectedReplayLine: '我把 8 件苹果锁进 12 格了',
        stages: [
            {
                id: 'A',
                title: '第一趟到家',
                caps: [12, 8, 10, 10, 8],
                queuePreview: 1,
                counts: { meat: 12, fruit: 8, veg: 10, milk: 18 },
                columns: COLS6,
                plan: '肉 12，苹果 8，青菜 10，牛奶 18 = 10+8。牛奶锁进 12 会剩 6。',
            },
            {
                id: 'B',
                title: '第二趟补货',
                caps: [14, 10, 8, 8, 8],
                queuePreview: 2,
                counts: { meat: 14, veg: 10, fruit: 8, milk: 16 },
                columns: COLS6,
                plan: '肉 14，青菜 10，苹果 8，牛奶 16 = 8+8。10 或 8 锁进 14 都凑不满。',
            },
            {
                id: 'C',
                title: '冷藏室塞满',
                caps: [12, 8, 8, 8, 10, 10],
                queuePreview: 2,
                counts: { meat: 12, fruit: 8, veg: 16, milk: 20 },
                columns: COLS7,
                plan: '肉 12，苹果 8，青菜 16 = 8+8，牛奶 20 = 10+10。牛奶若拿 12+8，苹果和两只 10 对不上。',
            },
        ],
    },
    {
        id: 'bulk_02',
        title: '两样小件数抢同一只小格',
        unlockCleared: 0,
        counterSlots: 3,
        bufferStackCap: 5,
        goal: '第二趟让牛奶的 16 和四份 8 件抢 8 格。',
        targetMinutes: [3.9, 6.5],
        expectedReplayLine: '我把牛奶拆进两只 8 格，小票上那四样没地方去了',
        stages: [
            {
                id: 'A',
                title: '第一趟到家',
                caps: [12, 12, 8, 8, 8],
                queuePreview: 1,
                counts: { meat: 12, milk: 12, veg: 8, fruit: 16 },
                columns: COLS6,
                plan: '肉 12，牛奶 12，青菜 8，苹果 16 = 8+8。两只 12 对调仍可解。苹果锁进 12 会剩 4。',
            },
            {
                id: 'B',
                title: '第二趟补货',
                caps: [16, 8, 8, 8, 8],
                queuePreview: 2,
                counts: { milk: 16, veg: 8, fruit: 8, meat: 8, sauce: 8 },
                columns: COLS6,
                plan: '牛奶只能拿 16。四份 8 件各拿一只 8。牛奶若拿两只 8，16 那格没人能填。',
            },
            {
                id: 'C',
                title: '冷藏室塞满',
                caps: [18, 10, 8, 10, 10],
                queuePreview: 2,
                counts: { milk: 18, veg: 10, sauce: 8, fruit: 10, meat: 10 },
                columns: COLS7,
                plan: '牛奶拿 18，酱拿唯一的 8，三份 10 件各拿一只 10。牛奶若拆成 10+8，18 那格空挂。',
            },
        ],
    },
    {
        id: 'bulk_03',
        title: '有一色必须吃两格，而且两格不挨着',
        unlockCleared: 0,
        counterSlots: 3,
        bufferStackCap: 5,
        goal: '第三趟牛奶 16 只能是头尾两只 8，中间隔着四只 10。',
        targetMinutes: [3.9, 6.5],
        expectedReplayLine: '牛奶要两只 8，我把其中一只让给 10 件的食材了',
        stages: [
            {
                id: 'A',
                title: '第一趟到家',
                caps: [10, 10, 10, 10, 8],
                queuePreview: 1,
                counts: { milk: 18, meat: 10, veg: 10, fruit: 10 },
                columns: COLS6,
                plan: '牛奶 18 = 10+8，预告里的 8 必须给牛奶。10 件锁进这只 8 会剩 2。',
            },
            {
                id: 'B',
                title: '第二趟补货',
                caps: [12, 10, 10, 8, 8],
                queuePreview: 2,
                counts: { meat: 12, milk: 10, veg: 10, fruit: 8, sauce: 8 },
                columns: COLS6,
                plan: '五本小票各对一格：肉 12，牛奶 10，青菜 10，苹果 8，酱 8。不要拆。',
            },
            {
                id: 'C',
                title: '冷藏室塞满',
                caps: [8, 10, 10, 10, 10, 8],
                queuePreview: 2,
                counts: { milk: 16, veg: 10, fruit: 10, meat: 10, sauce: 10 },
                columns: COLS7,
                plan: '牛奶 16 只能是头尾两只 8，中间四只 10 给四份 10 件。10 件锁进 8 会剩 2。',
            },
        ],
    },
    {
        id: 'bulk_04',
        title: '预告那一张先留着',
        unlockCleared: 0,
        counterSlots: 3,
        bufferStackCap: 5,
        goal: '第一趟只预告 1 格，那一张是 10 件酱的唯一去处，场上的 14 不能先给酱。',
        targetMinutes: [3.9, 6.5],
        expectedReplayLine: '我把 10 件酱锁进 14 格了',
        stages: [
            {
                id: 'A',
                title: '第一趟到家',
                caps: [14, 8, 8, 8, 10],
                queuePreview: 1,
                counts: { meat: 14, milk: 8, veg: 8, fruit: 8, sauce: 10 },
                columns: COLS6,
                plan: '肉 14，牛奶 8，青菜 8，苹果 8，酱 10。场上没有 10，预告那只 10 是酱的唯一去处。酱锁进 14 凑不满。',
            },
            {
                id: 'B',
                title: '第二趟补货',
                caps: [12, 10, 8, 10, 8],
                queuePreview: 2,
                counts: { meat: 12, milk: 10, veg: 8, fruit: 10, sauce: 8 },
                columns: COLS6,
                plan: '肉 12，牛奶 10，青菜 8，苹果 10，酱 8。12 只属于肉。10 或 8 锁进 12 都凑不满。',
            },
            {
                id: 'C',
                title: '冷藏室塞满',
                caps: [16, 12, 10, 10, 8],
                queuePreview: 2,
                counts: { milk: 16, meat: 12, veg: 10, fruit: 10, sauce: 8 },
                columns: COLS7,
                plan: '牛奶 16，肉 12，青菜 10，苹果 10，酱 8。只有一只 8，在预告里，只能给酱。酱锁进 16 或 12 都凑不满。',
            },
        ],
    },
    {
        id: 'bulk_05',
        title: '中间那格不是你的',
        unlockCleared: 0,
        counterSlots: 3,
        bufferStackCap: 5,
        goal: '第三趟牛奶的两只 8 中间只隔 1 格，那格是 10 件食材的，不是牛奶的。',
        targetMinutes: [3.9, 6.5],
        expectedReplayLine: '我把中间那只 10 算进牛奶里了',
        stages: [
            {
                id: 'A',
                title: '第一趟到家',
                caps: [12, 8, 12, 8, 8],
                queuePreview: 1,
                counts: { milk: 12, veg: 8, meat: 12, fruit: 8, sauce: 8 },
                columns: COLS6,
                plan: '牛奶 12，青菜 8，肉 12，苹果 8，酱 8。五本数各对一格。8 件锁进 12 凑不满。',
            },
            {
                id: 'B',
                title: '第二趟补货',
                caps: [10, 8, 12, 8, 10],
                queuePreview: 2,
                counts: { veg: 10, fruit: 8, milk: 12, sauce: 8, meat: 10 },
                columns: COLS6,
                plan: '青菜 10，苹果 8，牛奶 12，酱 8，肉 10。12 只属于牛奶。10 或 8 锁进 12 都凑不满。',
            },
            {
                id: 'C',
                title: '冷藏室塞满',
                caps: [10, 10, 10, 8, 10, 8],
                queuePreview: 2,
                counts: { veg: 10, fruit: 10, meat: 10, milk: 16, sauce: 10 },
                columns: COLS7,
                plan: '牛奶 16 只能是两只 8。场上最后一格是 8，第二张预告也是 8，中间那张预告是 10，给 10 件的食材。',
            },
        ],
    },
    {
        id: 'bulk_06',
        title: '别把小格让给大数',
        unlockCleared: 0,
        counterSlots: 3,
        bufferStackCap: 5,
        goal: '第三趟牛奶的 20 不能拆成 12+8，拆了就会空出 20，并挤掉一份 8 件。第二趟先练 14 装不下 8 或 10。',
        targetMinutes: [3.9, 6.5],
        expectedReplayLine: '我把 12 和 8 拆给了牛奶，有一份 8 件没地方去了',
        stages: [
            {
                id: 'A',
                title: '第一趟到家',
                caps: [10, 10, 8, 10, 10],
                queuePreview: 1,
                counts: { milk: 10, veg: 10, fruit: 8, meat: 10, sauce: 10 },
                columns: COLS6,
                plan: '苹果 8 对场上那只 8。牛奶、青菜、肉、酱都是 10，各对一只 10。',
            },
            {
                id: 'B',
                title: '第二趟补货',
                caps: [8, 10, 14, 8, 8],
                queuePreview: 2,
                counts: { milk: 8, sauce: 10, meat: 14, veg: 8, fruit: 8 },
                columns: COLS6,
                plan: '肉 14，酱 10，牛奶、青菜、苹果都是 8。8 或 10 锁进 14 都凑不满。14 不能拆成两只 8。',
            },
            {
                id: 'C',
                title: '冷藏室塞满',
                caps: [20, 12, 8, 8, 8],
                queuePreview: 2,
                counts: { milk: 20, meat: 12, veg: 8, fruit: 8, sauce: 8 },
                columns: COLS7,
                plan: '牛奶 20 对那只 20，肉 12，三份 8 各对一只 8。牛奶若拆成 12+8，20 空挂，并且有一份 8 件没有格子。8 或 12 直接锁进 20 也凑不满。',
            },
        ],
    },
    {
        id: 'bulk_07',
        title: '剩菜登场，牛奶要吃两格',
        unlockCleared: 0,
        counterSlots: 3,
        bufferStackCap: 5,
        goal: '第三趟牛奶要吃 14 和 10 两格，不能拆成三只 8。第二趟先认 18 只能是 10 加一只 8。',
        targetMinutes: [5, 8],
        expectedReplayLine: '我把牛奶拆成三只 8，14 和 10 就空了',
        stages: [
            {
                id: 'A',
                title: '第一趟到家',
                caps: [12, 10, 8, 10, 8],
                queuePreview: 1,
                counts: { meat: 12, milk: 10, veg: 10, fruit: 8, leftover: 8 },
                columns: COLS6,
                plan: '肉 12，牛奶 10，青菜 10，苹果和剩菜各 8。两只 8 可以互换。8 锁进 12 会剩 4，锁进 10 会剩 2。',
            },
            {
                id: 'B',
                title: '第二趟补货',
                caps: [10, 8, 14, 8, 8, 8],
                queuePreview: 2,
                counts: { milk: 18, meat: 14, fruit: 8, sauce: 8, leftover: 8 },
                columns: COLS7,
                plan: '肉 14 对那只 14。牛奶 18 只能是 10 加任意一只 8。苹果、酱、剩菜各 8。8 或 10 锁进 14 都凑不满。',
            },
            {
                id: 'C',
                title: '冷藏室塞满',
                caps: [14, 8, 10, 8, 8, 8, 8],
                queuePreview: 2,
                counts: { milk: 24, veg: 8, fruit: 8, meat: 8, sauce: 8, leftover: 8 },
                columns: COLS8,
                plan: '牛奶 24 只能是 14+10。五份 8 件各对一只 8。牛奶若拿三只 8，14 和 10 没人能填。14 和 10 开局都在场上，中间隔着一只 8。',
            },
        ],
    },
    {
        id: 'bulk_08',
        title: '下一段在预告里',
        unlockCleared: 0,
        counterSlots: 3,
        bufferStackCap: 5,
        goal: '第三趟牛奶的 26 只能是 14+12，12 在第一张预告。第二趟两只 8 里，后一只也在预告。',
        targetMinutes: [5, 8],
        expectedReplayLine: '我把 10 锁进了牛奶那只 14',
        stages: [
            {
                id: 'A',
                title: '第一趟到家',
                caps: [14, 8, 10, 8, 8],
                queuePreview: 1,
                counts: { meat: 14, veg: 8, milk: 10, fruit: 8, leftover: 8 },
                columns: COLS6,
                plan: '肉 14，牛奶 10，青菜、苹果、剩菜各 8。三只 8 可以互换。8 或 10 锁进 14 都凑不满。',
            },
            {
                id: 'B',
                title: '第二趟补货',
                caps: [8, 10, 10, 10, 8, 10],
                queuePreview: 2,
                counts: { milk: 16, veg: 10, fruit: 10, meat: 10, sauce: 10 },
                columns: COLS7,
                plan: '牛奶 16 只能是两只 8。第一只在场上，第二只是第一张预告，中间三只 10 都在场上。10 锁进 8 会剩 2。',
            },
            {
                id: 'C',
                title: '冷藏室塞满',
                caps: [14, 10, 10, 10, 12, 8],
                queuePreview: 2,
                counts: { milk: 26, veg: 10, fruit: 10, sauce: 10, leftover: 8 },
                columns: COLS8,
                plan: '牛奶 26 只能是 14+12。14 在场上，12 是第一张预告，中间三只 10 都在场上，剩菜 8 是第二张预告。10 锁进 14 会剩 4，锁进 12 会剩 2。',
            },
        ],
    },
];

function maxAdjacentPairs(depth: number): number {
    return Math.floor((depth - 1) * 0.3);
}

function layoutBags(counts: Partial<Record<FoodId, number>>, lengths: number[]): FoodId[][] {
    const cols = lengths.map(() => [] as FoodId[]);
    const pairs = lengths.map(() => 0);
    const left: Partial<Record<FoodId, number>> = {};
    for (let i = 0; i < FOOD_IDS.length; i++) {
        const id = FOOD_IDS[i];
        if ((counts[id] || 0) > 0) left[id] = counts[id];
    }
    const canPlace = (col: number, id: FoodId): boolean => {
        const bag = cols[col];
        if (bag.length >= lengths[col]) return false;
        const top = bag.length - 1;
        if (top >= 1 && bag[top] === id && bag[top - 1] === id) return false;
        if (top >= 0 && bag[top] === id && pairs[col] + 1 > maxAdjacentPairs(lengths[col])) return false;
        return true;
    };
    const foodsLeft = (): FoodId[] => {
        const foods: FoodId[] = [];
        for (let i = 0; i < FOOD_IDS.length; i++) {
            const id = FOOD_IDS[i];
            if ((left[id] || 0) > 0) foods.push(id);
        }
        foods.sort((a, b) => (left[b] || 0) - (left[a] || 0) || FOOD_IDS.indexOf(a) - FOOD_IDS.indexOf(b));
        return foods;
    };
    const commit = (col: number, id: FoodId) => {
        const bag = cols[col];
        if (bag.length > 0 && bag[bag.length - 1] === id) pairs[col] += 1;
        bag.push(id);
        left[id] = (left[id] || 0) - 1;
    };
    const undo = (col: number, id: FoodId) => {
        const bag = cols[col];
        bag.pop();
        if (bag.length > 0 && bag[bag.length - 1] === id) pairs[col] -= 1;
        left[id] = (left[id] || 0) + 1;
    };
    const columnsAreMixed = (): boolean => {
        for (let i = 0; i < cols.length; i++) {
            if (cols[i].length < 2) continue;
            const kind = cols[i][0];
            let mixed = false;
            for (let n = 1; n < cols[i].length; n++) {
                if (cols[i][n] !== kind) mixed = true;
            }
            if (!mixed) return false;
        }
        return true;
    };
    const canSitOnOther = (id: FoodId): boolean => {
        for (let i = 0; i < cols.length; i++) {
            if (!canPlace(i, id)) continue;
            const bag = cols[i];
            if (bag.length === 0 || bag[bag.length - 1] !== id) return true;
        }
        return false;
    };
    const reset = () => {
        for (let i = 0; i < cols.length; i++) {
            cols[i].length = 0;
            pairs[i] = 0;
        }
        for (let i = 0; i < FOOD_IDS.length; i++) {
            const id = FOOD_IDS[i];
            if ((counts[id] || 0) > 0) left[id] = counts[id];
            else delete left[id];
        }
    };
    const search = (smart: boolean, limit: number): boolean => {
        reset();
        let nodes = 0;
        const dfs = (): boolean => {
            if (++nodes > limit) return false;
            const foods = foodsLeft();
            if (foods.length === 0) return columnsAreMixed();
            if (smart) {
                foods.sort((a, b) => {
                    const openA = canSitOnOther(a) ? 0 : 1;
                    const openB = canSitOnOther(b) ? 0 : 1;
                    if (openA !== openB) return openA - openB;
                    return (left[b] || 0) - (left[a] || 0) || FOOD_IDS.indexOf(a) - FOOD_IDS.indexOf(b);
                });
            }
            const id = foods[0];
            const ranked: number[] = [];
            for (let i = 0; i < cols.length; i++) {
                if (canPlace(i, id)) ranked.push(i);
            }
            ranked.sort((a, b) => {
                const bagA = cols[a];
                const bagB = cols[b];
                const sameA = bagA.length > 0 && bagA[bagA.length - 1] === id ? 1 : 0;
                const sameB = bagB.length > 0 && bagB[bagB.length - 1] === id ? 1 : 0;
                if (sameA !== sameB) return sameA - sameB;
                if (bagA.length !== bagB.length) return bagA.length - bagB.length;
                return a - b;
            });
            for (let i = 0; i < ranked.length; i++) {
                const col = ranked[i];
                commit(col, id);
                if (dfs()) return true;
                undo(col, id);
            }
            return false;
        };
        return dfs();
    };
    if (search(false, 20000)) return cols;
    if (search(true, 200000)) return cols;
    throw new Error('bulk bags cannot satisfy stack rules');
}

function assertStageShape(level: BulkLevelConfig, stage: BulkLevelStageConfig): void {
    const capSum = stage.caps.reduce((sum, cap) => sum + cap, 0);
    const colSum = stage.columns.reduce((sum, depth) => sum + depth, 0);
    let countSum = 0;
    for (let i = 0; i < FOOD_IDS.length; i++) countSum += stage.counts[FOOD_IDS[i]] || 0;
    if (capSum !== countSum || capSum !== colSum) {
        throw new Error(`${level.id}/${stage.id} sums ${capSum}/${countSum}/${colSum}`);
    }
    for (let i = 0; i < stage.caps.length; i++) {
        const cap = stage.caps[i];
        if (BULK_TRAY_CAP_POOL.indexOf(cap as (typeof BULK_TRAY_CAP_POOL)[number]) < 0) {
            throw new Error(`${level.id}/${stage.id} cap ${cap} not in pool`);
        }
    }
    if (stage.caps.length < 4) throw new Error(`${level.id}/${stage.id} trays<4`);
    for (let i = 0; i < stage.columns.length; i++) {
        if (stage.columns[i] < 2) throw new Error(`${level.id}/${stage.id} column ${i} too shallow`);
    }
}

function tidySlackOf(level: BulkLevelConfig): number {
    let depth = 1;
    for (let s = 0; s < level.stages.length; s++) {
        const columns = level.stages[s].columns;
        for (let i = 0; i < columns.length; i++) {
            if (columns[i] > depth) depth = columns[i];
        }
    }
    return Math.max(1, depth - 1);
}

const loadedRuns = new Map<string, BulkRunDef>();

function makeStageShell(level: BulkLevelConfig, stage: BulkLevelStageConfig, stageIndex: number): BulkStageDef {
    const itemCount = stage.columns.reduce((sum, depth) => sum + depth, 0);
    const loaded: BulkStageDef = {
        id: stage.id,
        title: stage.title,
        trays: stage.caps.map((cap) => ({ cap })),
        queuePreview: stage.queuePreview,
        bags: [],
        receipt: { ...stage.counts },
        plan: stage.plan,
    };
    if (level.stages.length >= 3 && stageIndex === level.stages.length - 1) {
        loaded.checkpointItems = Math.floor(itemCount * 0.4);
    }
    return loaded;
}

/** 只铺这一趟的袋子。进关 / 进下一趟时再调。 */
export function ensureBulkStageBags(run: BulkRunDef, stageIndex: number): void {
    const stage = run.stages[stageIndex];
    if (!stage) throw new Error(`${run.id} stage ${stageIndex} missing`);
    if (stage.bags.length > 0) return;
    const level = BULK_LEVEL_CONFIGS.find((item) => item.id === run.id);
    const cfg = level?.stages[stageIndex];
    if (!level || !cfg) throw new Error(`${run.id} config missing stage ${stageIndex}`);
    assertStageShape(level, cfg);
    stage.bags = layoutBags(cfg.counts, cfg.columns);
    assertBulkStageDef(stage);
}

export function loadBulkLevel(level: BulkLevelConfig): BulkRunDef {
    const cached = loadedRuns.get(level.id);
    if (cached) return cached;
    const stages: BulkStageDef[] = [];
    for (let s = 0; s < level.stages.length; s++) {
        stages.push(makeStageShell(level, level.stages[s], s));
    }
    const run: BulkRunDef = {
        id: level.id,
        title: level.title,
        unlockCleared: level.unlockCleared,
        counterSlots: level.counterSlots,
        bufferStackCap: level.bufferStackCap,
        tidySlack: tidySlackOf(level),
        stages,
    };
    loadedRuns.set(level.id, run);
    return run;
}

/** 给离线求解器用。游戏启动不要调这个。 */
export function loadBulkLevels(configs: BulkLevelConfig[] = BULK_LEVEL_CONFIGS): BulkRunDef[] {
    const runs: BulkRunDef[] = [];
    for (let i = 0; i < configs.length; i++) {
        try {
            const run = loadBulkLevel(configs[i]);
            for (let s = 0; s < run.stages.length; s++) ensureBulkStageBags(run, s);
            runs.push(run);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[bulk] skip ${configs[i].id}: ${message}`);
        }
    }
    return runs;
}

import { FOOD_IDS, type FoodId } from '../game/types';
import { assertBulkStageDef, cloneBags, type BulkRunDef, type BulkStageDef } from './types';

/** 连点节奏用的容量。单格太大时，封格太慢。 */
export const BULK_TRAY_CAP_POOL = [6, 8, 10, 12] as const;

export type BulkLevelStageConfig = {
    id: string;
    title: string;
    /** 从左到右。前 openTrays 个先上场，剩下的是补位队列。 */
    caps: number[];
    queuePreview: number;
    counts: Partial<Record<FoodId, number>>;
    /** 每列层数。各项之和必须等于 caps 之和，也必须等于 counts 之和。 */
    columns: number[];
    /** 铺袋顺序。数组前面的食物在栈顶，按这个顺序收完能过关。 */
    order: FoodId[];
    /** 个别教学关手工铺袋，避免开局所有列顶层都是同一种。 */
    presetBags?: FoodId[][];
    /** 谁该进哪一格。玩家仍自己分配，这行只给复盘。 */
    plan: string;
};

export type BulkLevelConfig = {
    id: string;
    title: string;
    unlockCleared: number;
    counterSlots: number;
    bufferStackCap: number;
    /** 同时上台的冰箱格。 */
    openTrays: number;
    goal: string;
    /** 单关连点大约半分钟到一分多钟。 */
    targetMinutes: [number, number];
    expectedReplayLine: string;
    stages: BulkLevelStageConfig[];
};

type BulkLevelSpec = {
    title: string;
    goal: string;
    replay: string;
    openTrays: number;
    preview: number;
    caps: number[];
    counts: Partial<Record<FoodId, number>>;
    order: FoodId[];
    presetBags?: FoodId[][];
    plan: string;
};

function columnDepths(total: number, columns = 6): number[] {
    const base = Math.floor(total / columns);
    const extra = total % columns;
    const depths: number[] = [];
    for (let i = 0; i < columns; i++) depths.push(base + (i < extra ? 1 : 0));
    return depths;
}

function buildBulkLevel(index: number, spec: BulkLevelSpec): BulkLevelConfig {
    const capSum = spec.caps.reduce((sum, cap) => sum + cap, 0);
    const id = `bulk_${index < 9 ? '0' : ''}${index + 1}`;
    return {
        id,
        title: spec.title,
        unlockCleared: 0,
        counterSlots: 3,
        bufferStackCap: 4,
        openTrays: spec.openTrays,
        goal: spec.goal,
        targetMinutes: [0.5, 0.9],
        expectedReplayLine: spec.replay,
        stages: [
            {
                id: 'A',
                title: spec.title,
                caps: spec.caps,
                queuePreview: spec.preview,
                counts: spec.counts,
                columns: columnDepths(capSum),
                order: spec.order,
                presetBags: spec.presetBags ? cloneBags(spec.presetBags) : undefined,
                plan: spec.plan,
            },
        ],
    };
}

const SIX = [6, 6, 6, 6, 6, 6];

/**
 * 一关一袋。点食物会锁最左边的空格，所以大格放在最左，件数对得上的食物要先点。
 * 1–8 关 4 格、预告 1 张；9–16 关 4 格、预告 2 张、5 种；17–24 关 5 格、预告 2 张。
 */
const BULK_LEVEL_SPECS: BulkLevelSpec[] = [
    {
        title: '左边那只留给肉',
        goal: '最左边是 8。先把 8 件肉点进去，再收后面的 6。',
        replay: '我先点了 6 件的食物，左边那只 8 装不满',
        openTrays: 4,
        preview: 1,
        caps: [8, 6, 6, 6, 6],
        counts: { meat: 8, fruit: 6, veg: 6, milk: 12 },
        order: ['meat', 'fruit', 'veg', 'milk'],
        presetBags: [
            ['milk', 'veg', 'milk', 'fruit', 'milk', 'meat'],
            ['milk', 'meat', 'milk', 'veg', 'meat', 'fruit'],
            ['milk', 'fruit', 'milk', 'meat', 'veg'],
            ['meat', 'milk', 'veg', 'fruit', 'milk'],
            ['milk', 'veg', 'fruit', 'milk', 'meat'],
            ['meat', 'milk', 'veg', 'meat', 'fruit'],
        ],
        plan: '肉 8 对最左。水果 6 接补进来的 6。青菜 6。牛奶 12 吃右边两只 6。',
    },
    {
        title: '肉 10，水果 8',
        goal: '先认 10，再认 8。肉吃 10，水果吃 8，牛奶再收两只 6。',
        replay: '我先把水果点乱了，10 和 8 的归属一起错掉',
        openTrays: 4,
        preview: 1,
        caps: [10, 8, 6, 6, 6],
        counts: { meat: 10, fruit: 8, veg: 6, milk: 12 },
        order: ['meat', 'fruit', 'veg', 'milk'],
        plan: '肉对 10。水果对 8。青菜对 6。牛奶吃两只 6。',
    },
    {
        title: '青菜和牛奶都要两格',
        goal: '肉先占最左的 8。青菜、牛奶各吃两只 6。',
        replay: '我让青菜占了最左的 8，后面两只 6 不够它收完',
        openTrays: 4,
        preview: 1,
        caps: [8, 6, 6, 6, 6, 6],
        counts: { meat: 8, fruit: 6, veg: 12, milk: 12 },
        order: ['meat', 'fruit', 'veg', 'milk'],
        presetBags: [
            ['milk', 'veg', 'milk', 'fruit', 'veg', 'veg', 'meat'],
            ['milk', 'meat', 'veg', 'milk', 'meat', 'veg', 'fruit'],
            ['veg', 'fruit', 'milk', 'meat', 'milk', 'veg'],
            ['meat', 'milk', 'veg', 'fruit', 'veg', 'milk'],
            ['milk', 'veg', 'fruit', 'meat', 'milk', 'veg'],
            ['meat', 'veg', 'milk', 'fruit', 'meat', 'milk'],
        ],
        plan: '肉 8 对最左。水果 6 接第一张补格。青菜 12 吃下一张补格和一只 6。牛奶 12 吃剩下两只 6。',
    },
    {
        title: '青菜 8，肉 8',
        goal: '这关不是只认一个 8。青菜和肉各占一只 8。',
        replay: '我先把水果点早了，两只 8 的顺序都乱了',
        openTrays: 4,
        preview: 1,
        caps: [8, 8, 6, 6, 6],
        counts: { veg: 8, meat: 8, fruit: 6, milk: 12 },
        order: ['veg', 'meat', 'fruit', 'milk'],
        plan: '青菜对一只 8。肉对另一只 8。水果对 6。牛奶吃两只 6。',
    },
    {
        title: '水果 10，牛奶 8',
        goal: '水果先吃 10，牛奶要留给 8，肉再去收两只 6。',
        replay: '我先把牛奶点进了 10，后面的 8 没给它留',
        openTrays: 4,
        preview: 1,
        caps: [10, 8, 6, 6, 6],
        counts: { fruit: 10, milk: 8, veg: 6, meat: 12 },
        order: ['fruit', 'milk', 'veg', 'meat'],
        plan: '水果对 10。牛奶对 8。青菜对 6。肉吃两只 6。',
    },
    {
        title: '两种都要吃两格',
        goal: '青菜占最左的 10。肉和牛奶各吃两只 6。',
        replay: '我把肉点进了最左的 10',
        openTrays: 4,
        preview: 1,
        caps: [10, 6, 6, 6, 6, 6],
        counts: { veg: 10, fruit: 6, meat: 12, milk: 12 },
        order: ['veg', 'fruit', 'meat', 'milk'],
        plan: '青菜 10 对最左。水果 6 接第一张补格。肉 12 吃第二张补格和一只 6。牛奶 12 吃剩下两只 6。',
    },
    {
        title: '水果 8，青菜 8',
        goal: '水果和青菜各有一只 8。先把两个 8 位分清。',
        replay: '我先把肉点早了，后面两个 8 的归属乱掉了',
        openTrays: 4,
        preview: 1,
        caps: [8, 8, 6, 6, 6],
        counts: { fruit: 8, veg: 8, meat: 6, milk: 12 },
        order: ['fruit', 'veg', 'meat', 'milk'],
        plan: '水果对一只 8。青菜对另一只 8。肉对 6。牛奶吃两只 6。',
    },
    {
        title: '肉 10，水果 8，双 12',
        goal: '肉先吃 10，水果再吃 8，青菜和牛奶都要规划两只 6。',
        replay: '我先让水果去吃 10，后面的 8 和两只 6 都不够了',
        openTrays: 4,
        preview: 1,
        caps: [10, 8, 6, 6, 6, 6],
        counts: { meat: 10, fruit: 8, veg: 12, milk: 12 },
        order: ['meat', 'fruit', 'veg', 'milk'],
        plan: '肉对 10。水果对 8。青菜吃两只 6。牛奶也吃两只 6。',
    },
    {
        title: '肉 8，酱 8',
        goal: '第五种食物第一次真正参与抢位：肉和酱各吃一只 8。',
        replay: '我先把酱点成了 6 件杂色，肉后面的窗口也被拖慢了',
        openTrays: 4,
        preview: 2,
        caps: [8, 8, 6, 6, 6, 6],
        counts: { meat: 8, sauce: 8, fruit: 6, veg: 6, milk: 12 },
        order: ['meat', 'sauce', 'fruit', 'veg', 'milk'],
        plan: '肉对一只 8。酱对另一只 8。水果和青菜各对 6。牛奶吃两只 6。',
    },
    {
        title: '肉 10，酱 8',
        goal: '肉吃 10，酱吃 8。五种食物第一次一起抢两只大格。',
        replay: '我先让酱进了 10，后面的 8 没给它留',
        openTrays: 4,
        preview: 2,
        caps: [10, 8, 6, 6, 6, 6],
        counts: { meat: 10, sauce: 8, fruit: 6, veg: 6, milk: 12 },
        order: ['meat', 'sauce', 'fruit', 'veg', 'milk'],
        plan: '肉对 10。酱对 8。水果和青菜各对 6。牛奶吃两只 6。',
    },
    {
        title: '青菜 8，肉 8',
        goal: '青菜先拿一只 8，肉拿另一只 8，酱和牛奶都是后手。',
        replay: '我先把牛奶点早了，两只 8 的窗口都被拖慢了',
        openTrays: 4,
        preview: 2,
        caps: [8, 8, 6, 6, 6, 6],
        counts: { veg: 8, meat: 8, fruit: 6, sauce: 6, milk: 12 },
        order: ['veg', 'meat', 'fruit', 'sauce', 'milk'],
        plan: '青菜对一只 8。肉对另一只 8。水果和酱各对 6。牛奶吃两只 6。',
    },
    {
        title: '肉 12，酱 8',
        goal: '肉吃 12，酱吃 8，另外三种都是单格食材。',
        replay: '我先把酱锁进了 12，后面的 8 就闲掉了',
        openTrays: 4,
        preview: 2,
        caps: [12, 8, 6, 6, 6],
        counts: { meat: 12, sauce: 8, fruit: 6, veg: 6, milk: 6 },
        order: ['meat', 'sauce', 'fruit', 'veg', 'milk'],
        plan: '肉对 12。酱对 8。水果、青菜、牛奶各对 6。',
    },
    {
        title: '水果 8，酱 8',
        goal: '两只 8 要分别留给水果和酱，别被 6 件食材抢掉节奏。',
        replay: '我先点了青菜，水果和酱的 8 位都不够用了',
        openTrays: 4,
        preview: 2,
        caps: [8, 8, 6, 6, 6, 6],
        counts: { fruit: 8, sauce: 8, veg: 6, meat: 6, milk: 12 },
        order: ['fruit', 'sauce', 'veg', 'meat', 'milk'],
        plan: '水果对一只 8。酱对另一只 8。青菜和肉各对 6。牛奶吃两只 6。',
    },
    {
        title: '青菜 10，水果 8，酱 8',
        goal: '青菜先占 10，水果和酱各要一只 8。',
        replay: '我先把水果点进了 10，后面的 8 窗口就不够了',
        openTrays: 4,
        preview: 2,
        caps: [10, 8, 8, 6, 6],
        counts: { veg: 10, fruit: 8, sauce: 8, meat: 6, milk: 6 },
        order: ['veg', 'fruit', 'sauce', 'meat', 'milk'],
        plan: '青菜对 10。水果对一只 8。酱对另一只 8。肉和牛奶各对 6。',
    },
    {
        title: '酱 8，水果 8',
        goal: '酱和水果各有一只 8，顺序错了会挤掉后手。',
        replay: '我先点了肉，两个 8 都被别的颜色挤占了',
        openTrays: 4,
        preview: 2,
        caps: [8, 8, 6, 6, 6, 6],
        counts: { sauce: 8, fruit: 8, veg: 6, meat: 6, milk: 12 },
        order: ['sauce', 'fruit', 'veg', 'meat', 'milk'],
        plan: '酱对一只 8。水果对另一只 8。青菜和肉各对 6。牛奶吃两只 6。',
    },
    {
        title: '水果 10，酱 8',
        goal: '水果吃 10，酱吃 8。后手的牛奶仍要吃两只 6。',
        replay: '我先把酱点错到 10，水果就没位子了',
        openTrays: 4,
        preview: 2,
        caps: [10, 8, 6, 6, 6, 6],
        counts: { fruit: 10, sauce: 8, meat: 6, veg: 6, milk: 12 },
        order: ['fruit', 'sauce', 'meat', 'veg', 'milk'],
        plan: '水果对 10。酱对 8。肉和青菜各对 6。牛奶吃两只 6。',
    },
    {
        title: '五个格一起开',
        goal: '场上 5 格，都是 6。先把 18 件牛奶收满，再点别的。',
        replay: '我先点了青菜，牛奶那 18 件被拆散了',
        openTrays: 5,
        preview: 2,
        caps: SIX.concat([6]),
        counts: { milk: 18, veg: 6, fruit: 6, meat: 6, sauce: 6 },
        order: ['milk', 'veg', 'fruit', 'meat', 'sauce'],
        plan: '牛奶 18 吃最左和两张补格。青菜、水果、肉、酱各一只 6。',
    },
    {
        title: '青菜 12，牛奶 12',
        goal: '进入 5 格后，不再只有一个大主角；青菜和牛奶都要吃两段。',
        replay: '我先把青菜和牛奶的两段顺序点反了',
        openTrays: 5,
        preview: 2,
        caps: [12, 6, 6, 6, 6, 6],
        counts: { veg: 12, milk: 12, fruit: 6, meat: 6, sauce: 6 },
        order: ['veg', 'milk', 'fruit', 'meat', 'sauce'],
        plan: '青菜对 12。牛奶吃两只 6。水果、肉、酱各对 6。',
    },
    {
        title: '水果 16',
        goal: '水果 16 件，要吃两只 8；其它四种仍各 6。',
        replay: '我先点了肉，水果的第二只 8 就被占了',
        openTrays: 5,
        preview: 2,
        caps: [8, 8, 6, 6, 6, 6],
        counts: { fruit: 16, milk: 6, veg: 6, meat: 6, sauce: 6 },
        order: ['fruit', 'milk', 'veg', 'meat', 'sauce'],
        plan: '水果吃两只 8。牛奶、青菜、肉、酱各对 6。',
    },
    {
        title: '肉 18',
        goal: '肉 18 件，这回不是三只 6，而是 10 加 8。',
        replay: '我先把 8 提前让给了别的颜色，肉后面就接不上了',
        openTrays: 5,
        preview: 2,
        caps: [10, 8, 6, 6, 6, 6],
        counts: { meat: 18, milk: 6, veg: 6, fruit: 6, sauce: 6 },
        order: ['meat', 'milk', 'veg', 'fruit', 'sauce'],
        plan: '肉吃 10 和 8。牛奶、青菜、水果、酱各对 6。',
    },
    {
        title: '酱 16',
        goal: '酱有 16 件，先把两只 8 都留给它。',
        replay: '我先点了水果，酱就被拆成了两半',
        openTrays: 5,
        preview: 2,
        caps: [8, 8, 6, 6, 6, 6],
        counts: { sauce: 16, milk: 6, veg: 6, fruit: 6, meat: 6 },
        order: ['sauce', 'milk', 'veg', 'fruit', 'meat'],
        plan: '酱吃两只 8。其余四种各对 6。',
    },
    {
        title: '剩菜 16',
        goal: '剩菜 16 件，先占两只 8，再收别的。',
        replay: '我把剩菜留晚了，两只 8 就都没了',
        openTrays: 5,
        preview: 2,
        caps: [8, 8, 6, 6, 6, 6],
        counts: { leftover: 16, milk: 6, veg: 6, fruit: 6, meat: 6 },
        order: ['leftover', 'milk', 'veg', 'fruit', 'meat'],
        plan: '剩菜吃两只 8。其余四种各对 6。',
    },
    {
        title: '青菜 12，水果 12',
        goal: '两种 12 同时在场，不再只有一个 18 主角。',
        replay: '我先点错了青菜，水果后面就没有两只 6 可接了',
        openTrays: 5,
        preview: 2,
        caps: [12, 6, 6, 6, 6, 6],
        counts: { veg: 12, fruit: 12, meat: 6, sauce: 6, leftover: 6 },
        order: ['veg', 'fruit', 'meat', 'sauce', 'leftover'],
        plan: '青菜对 12。水果吃两只 6。肉、酱、剩菜各对 6。',
    },
    {
        title: '水果 16，剩菜 8',
        goal: '最后一关先给水果留两只 8，再把剩菜放进 8。',
        replay: '我先点了酱，水果和剩菜都没凑够自己的窗口',
        openTrays: 5,
        preview: 2,
        caps: [10, 8, 6, 6, 6, 6, 6],
        counts: { fruit: 16, leftover: 8, milk: 6, meat: 6, sauce: 6, veg: 6 },
        order: ['fruit', 'leftover', 'milk', 'meat', 'sauce', 'veg'],
        plan: '水果先吃大格再补满。剩菜对 8。牛奶、肉、酱、青菜各对 6。',
    },
];

/**
 * 教学节奏顺序：
 * 1–8 先从单大格、双 8，再进双段食材。
 * 9–16 再上五种食材与多窗口争抢。
 * 17–24 最后是 5 格中盘规划。
 */
const BULK_LEVEL_ORDER = [
    0, 1, 3, 4, 2, 6, 5, 7,
    8, 9, 10, 11, 12, 14, 13, 15,
    16, 17, 18, 19, 20, 21, 22, 23,
] as const;

export const BULK_LEVEL_CONFIGS: BulkLevelConfig[] = BULK_LEVEL_ORDER.map((specIndex, index) => {
    return buildBulkLevel(index, BULK_LEVEL_SPECS[specIndex]);
});

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
    if (stage.caps.length < level.openTrays) throw new Error(`${level.id}/${stage.id} trays<${level.openTrays}`);
    let orderSum = 0;
    for (let i = 0; i < stage.order.length; i++) orderSum += stage.counts[stage.order[i]] || 0;
    if (orderSum !== capSum) throw new Error(`${level.id}/${stage.id} order!=caps`);
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

function makeStageShell(_level: BulkLevelConfig, stage: BulkLevelStageConfig, _stageIndex: number): BulkStageDef {
    return {
        id: stage.id,
        title: stage.title,
        trays: stage.caps.map((cap) => ({ cap })),
        queuePreview: stage.queuePreview,
        bags: [],
        receipt: { ...stage.counts },
        plan: stage.plan,
    };
}

/** 按收纳顺序从底往上铺。先收的食物留在栈顶，同列连续最多 3 个。 */
function weaveBags(order: FoodId[], counts: Partial<Record<FoodId, number>>, lengths: number[]): FoodId[][] {
    const cols = lengths.map(() => [] as FoodId[]);
    const runLen = (bag: FoodId[]): number => {
        if (bag.length === 0) return 0;
        const top = bag[bag.length - 1];
        let n = 0;
        for (let i = bag.length - 1; i >= 0; i--) {
            if (bag[i] !== top) break;
            n += 1;
        }
        return n;
    };
    for (let f = order.length - 1; f >= 0; f--) {
        const id = order[f];
        let left = counts[id] || 0;
        let cursor = 0;
        let guard = 0;
        while (left > 0) {
            if (++guard > 10000) throw new Error(`weave stuck ${id}`);
            let placed = false;
            for (let k = 0; k < cols.length; k++) {
                const i = (cursor + k) % cols.length;
                if (cols[i].length >= lengths[i]) continue;
                const top = cols[i].length > 0 ? cols[i][cols[i].length - 1] : null;
                if (top === id && runLen(cols[i]) >= 3) continue;
                cols[i].push(id);
                left -= 1;
                cursor = i + 1;
                placed = true;
                break;
            }
            if (!placed) throw new Error(`weave no room for ${id}`);
        }
    }
    softenTopKinds(cols, order);
    return cols;
}

/**
 * 自动铺袋后，尽量把前 2–3 个优先食材都露一点栈顶，避免整排全是同一种。
 * 只做列内轻挪动，不改总件数。
 */
function softenTopKinds(cols: FoodId[][], order: FoodId[]): void {
    const wanted = order.slice(0, Math.min(3, order.length));
    if (wanted.length <= 1) return;
    const topOf = (bag: FoodId[]): FoodId | null => (bag.length > 0 ? bag[bag.length - 1] : null);
    const hasTop = (id: FoodId): boolean => cols.some((bag) => topOf(bag) === id);
    for (let w = 1; w < wanted.length; w++) {
        const id = wanted[w];
        if (hasTop(id)) continue;
        for (let c = 0; c < cols.length; c++) {
            const bag = cols[c];
            if (bag.length < 2) continue;
            for (let i = bag.length - 2; i >= 0; i--) {
                if (bag[i] !== id) continue;
                bag.splice(i, 1);
                bag.push(id);
                c = cols.length;
                break;
            }
        }
    }
}

/** 进关时再铺袋子。一关只有一袋。 */
export function ensureBulkStageBags(run: BulkRunDef, stageIndex: number): void {
    const stage = run.stages[stageIndex];
    if (!stage) throw new Error(`${run.id} stage ${stageIndex} missing`);
    if (stage.bags.length > 0) return;
    const level = BULK_LEVEL_CONFIGS.find((item) => item.id === run.id);
    const cfg = level?.stages[stageIndex];
    if (!level || !cfg) throw new Error(`${run.id} config missing stage ${stageIndex}`);
    assertStageShape(level, cfg);
    stage.bags = cfg.presetBags ? cloneBags(cfg.presetBags) : weaveBags(cfg.order, cfg.counts, cfg.columns);
    assertBulkStageDef(stage, level.openTrays);
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
        openTrays: level.openTrays,
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

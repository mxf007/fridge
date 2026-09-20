export type FoodId =
    | 'milk'
    | 'veg'
    | 'fruit'
    | 'meat'
    | 'sauce'
    | 'leftover'
    | 'grape'
    | 'lemon'
    | 'kiwi'
    | 'pineapple'
    | 'watermelon'
    | 'coconut';

export const FOOD_IDS: FoodId[] = [
    'milk',
    'veg',
    'fruit',
    'meat',
    'sauce',
    'leftover',
    'grape',
    'lemon',
    'kiwi',
    'pineapple',
    'watermelon',
    'coconut',
];

export const FOOD_NAMES: Record<FoodId, string> = {
    milk: '牛奶',
    veg: '青菜',
    fruit: '水果',
    meat: '肉',
    sauce: '酱',
    leftover: '剩菜',
    grape: '葡萄',
    lemon: '柠檬',
    kiwi: '猕猴桃',
    pineapple: '菠萝',
    watermelon: '西瓜',
    coconut: '椰子',
};

export type PlaceReason = 'wrong_kind' | 'anti_split' | 'no_target' | 'dest_full';

export type FailReason = 'buffer_full' | 'locked_out';

export type Dest =
    | { kind: 'tray'; index: number }
    | { kind: 'buffer'; index: number };

export type LevelDef = {
    id: number;
    title: string;
    teach: string;
    trays: { cap: number }[];
    bags: FoodId[][];
    buffer: number;
    loseable: boolean;
};

export type TrayState = {
    cap: number;
    kind: FoodId | null;
    items: FoodId[];
    sealed: boolean;
};

export type PlaceOk = {
    ok: true;
    item: FoodId;
    dest: Dest;
    sealed: boolean;
    steps: number;
};

export type PlaceFail = {
    ok: false;
    reason: PlaceReason;
    item: FoodId;
    hintTrays: number[];
    hintBuffers: number[];
};

export type PlaceResult = PlaceOk | PlaceFail;

export type HintPick = {
    dest: Dest;
    bagCol?: number;
    bufferIndex?: number;
};

export function isFoodId(value: string): value is FoodId {
    return (FOOD_IDS as string[]).indexOf(value) >= 0;
}

export function assertLevel(l: LevelDef): void {
    const items = l.bags.flat();
    const totalCap = l.trays.reduce((s, t) => s + t.cap, 0);
    if (items.length !== totalCap) throw new Error(`L${l.id} count`);
    const kinds = new Set(items);
    if (kinds.size > l.trays.length) throw new Error(`L${l.id} kinds>trays`);
    const cap0 = l.trays[0] && l.trays[0].cap;
    const sameCap = cap0 != null && l.trays.every((t) => t.cap === cap0);
    if (sameCap && cap0) {
        const counts: Record<string, number> = {};
        for (let i = 0; i < items.length; i++) {
            const k = items[i];
            counts[k] = (counts[k] || 0) + 1;
        }
        const keys = Object.keys(counts);
        for (let i = 0; i < keys.length; i++) {
            if (counts[keys[i]] % cap0 !== 0) throw new Error(`L${l.id} ${keys[i]} not multiple of cap`);
        }
    }
}

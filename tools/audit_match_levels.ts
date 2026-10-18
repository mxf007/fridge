/**
 * Compare MATCH_LEVELS against docs/冰箱配对_30关目录.md (v1 table).
 * Run: npx tsx tools/audit_match_levels.ts
 */
import { FOOD_IDS, type FoodId } from '../assets/scripts/game/types';
import { MATCH_LEVELS } from '../assets/scripts/match/MatchLevels';
import {
    freeReshufflesBudgetForLevel,
    hintsBudgetForLevel,
    isFixedLayoutLevel,
    isNoHintsLevel,
} from '../assets/scripts/match/MatchLevelRules';

type RowSpec = {
    title: string;
    rows: number;
    cols: number;
    cells: number;
    holes: number;
    collapse: string;
    typeCount: number | 'flex';
    pairsStructure: string;
    fixedLayout?: boolean;
    noHints?: boolean;
    maxFreeReshuffles?: number | 'unlimited' | 'default15';
    puzzleIds?: boolean;
};

/** 文档「食材选用顺序」与 FOOD_IDS 数组顺序不同。 */
function allowedFoodsForLevel(id: number): Set<FoodId> {
    const base: FoodId[] = ['milk', 'veg', 'fruit', 'meat'];
    if (id <= 6) return new Set(base);
    const to12 = [...base, 'sauce', 'grape'] as FoodId[];
    if (id <= 12) return new Set(to12);
    const to18 = [...to12, 'lemon', 'kiwi'] as FoodId[];
    if (id <= 18) return new Set(to18);
    const to24 = [...to18, 'leftover', 'pineapple'] as FoodId[];
    if (id <= 24) return new Set(to24);
    return new Set(FOOD_IDS);
}

const DOC: Record<number, RowSpec> = {
    1: { title: '第一次配对', rows: 2, cols: 4, cells: 8, holes: 0, collapse: 'left', typeCount: 2, pairsStructure: '2×2对', fixedLayout: true },
    2: { title: '往下滑一滑', rows: 3, cols: 4, cells: 12, holes: 0, collapse: 'down', typeCount: 3, pairsStructure: '3×2对', fixedLayout: true },
    3: { title: '向左收', rows: 4, cols: 4, cells: 16, holes: 0, collapse: 'left', typeCount: 4, pairsStructure: '4×2对' },
    4: { title: '向下收', rows: 4, cols: 4, cells: 16, holes: 0, collapse: 'down', typeCount: 4, pairsStructure: '4×2对' },
    5: { title: '限步小试', rows: 4, cols: 4, cells: 16, holes: 0, collapse: 'right', typeCount: 4, pairsStructure: '4×2对' },
    6: { title: '向上收', rows: 4, cols: 4, cells: 16, holes: 0, collapse: 'up', typeCount: 4, pairsStructure: '4×2对' },
    7: { title: '四种满盘', rows: 4, cols: 4, cells: 16, holes: 0, collapse: 'left', typeCount: 4, pairsStructure: '4×4对' },
    8: { title: '五种宽盘', rows: 4, cols: 5, cells: 20, holes: 0, collapse: 'right', typeCount: 5, pairsStructure: '5×2对' },
    9: { title: '长盘一道弯', rows: 5, cols: 4, cells: 20, holes: 0, collapse: 'down', typeCount: 5, pairsStructure: '5×2对', fixedLayout: true },
    10: { title: '第六层开门', rows: 4, cols: 6, cells: 24, holes: 0, collapse: 'left', typeCount: 6, pairsStructure: '6×2对' },
    11: { title: '六方一角空', rows: 5, cols: 5, cells: 24, holes: 1, collapse: 'up', typeCount: 6, pairsStructure: '6×2对' },
    12: { title: '六列入门', rows: 4, cols: 6, cells: 24, holes: 0, collapse: 'left', typeCount: 6, pairsStructure: '6×2对' },
    13: { title: '六列下收', rows: 4, cols: 6, cells: 24, holes: 0, collapse: 'down', typeCount: 6, pairsStructure: '6×2对' },
    14: { title: '右收顺序', rows: 4, cols: 6, cells: 24, holes: 0, collapse: 'right', typeCount: 6, pairsStructure: '6×2对', fixedLayout: true },
    15: { title: '不用提示', rows: 5, cols: 5, cells: 24, holes: 1, collapse: 'left', typeCount: 6, pairsStructure: '6×2对', noHints: true, maxFreeReshuffles: 'unlimited' },
    16: { title: '六乘六', rows: 6, cols: 6, cells: 36, holes: 0, collapse: 'down', typeCount: 8, pairsStructure: '8种/36格(18对)' },
    17: { title: '九种换面', rows: 6, cols: 6, cells: 36, holes: 0, collapse: 'right', typeCount: 8, pairsStructure: '8种/36格(18对)' },
    18: { title: '四角空档', rows: 6, cols: 6, cells: 32, holes: 4, collapse: 'up', typeCount: 8, pairsStructure: '8×2对', fixedLayout: true },
    19: { title: '七列满收', rows: 6, cols: 7, cells: 42, holes: 0, collapse: 'left', typeCount: 7, pairsStructure: '7×3对' },
    20: { title: '半层整理', rows: 6, cols: 6, cells: 32, holes: 4, collapse: 'down', typeCount: 8, pairsStructure: '8×2对', maxFreeReshuffles: 1 },
    21: { title: '八列长盘', rows: 6, cols: 8, cells: 48, holes: 0, collapse: 'right', typeCount: 8, pairsStructure: '8×3对' },
    22: { title: '八列上收', rows: 6, cols: 8, cells: 48, holes: 0, collapse: 'up', typeCount: 8, pairsStructure: '8×3对' },
    23: { title: '七列双洞', rows: 6, cols: 7, cells: 38, holes: 4, collapse: 'left', typeCount: 8, pairsStructure: '19对/8种' },
    24: { title: '酱区通道', rows: 6, cols: 7, cells: 42, holes: 0, collapse: 'down', typeCount: 7, pairsStructure: '7×3对', fixedLayout: true },
    25: { title: '十字锁盘', rows: 6, cols: 6, cells: 32, holes: 4, collapse: 'right', typeCount: 8, pairsStructure: '8×2对', maxFreeReshuffles: 0 },
    26: { title: '七方大盘', rows: 7, cols: 7, cells: 48, holes: 1, collapse: 'up', typeCount: 8, pairsStructure: '8×3对', maxFreeReshuffles: 'default15' },
    27: { title: '冷冻一层', rows: 7, cols: 8, cells: 48, holes: 8, collapse: 'left', typeCount: 12, pairsStructure: '12×2对', fixedLayout: true },
    28: { title: '八列收拢', rows: 6, cols: 8, cells: 44, holes: 4, collapse: 'right', typeCount: 9, pairsStructure: '22对/9种' },
    29: { title: '七乘八下收', rows: 7, cols: 8, cells: 52, holes: 4, collapse: 'down', typeCount: 10, pairsStructure: '26对/10种' },
    30: { title: '终局一层', rows: 8, cols: 8, cells: 56, holes: 8, collapse: 'right', typeCount: 12, pairsStructure: '28对/12种' },
};

function analyzeLevel(level: (typeof MATCH_LEVELS)[number]) {
    let holes = 0;
    let cells = 0;
    const counts: Record<string, number> = {};
    for (let r = 0; r < level.rows; r++) {
        for (let c = 0; c < level.columns; c++) {
            const t = level.layout[r][c];
            if (t == null || t === 'ice') {
                if (t == null) holes += 1;
            } else {
                cells += 1;
                counts[t] = (counts[t] || 0) + 1;
            }
        }
    }
    const types = Object.keys(counts);
    const pairs = cells / 2;
    return { holes, cells, counts, types, typeCount: types.length, pairs };
}

const issues: string[] = [];
const warnings: string[] = [];

for (const level of MATCH_LEVELS) {
    const doc = DOC[level.id];
    if (!doc) {
        issues.push(`M${level.id}: missing doc spec`);
        continue;
    }
    const a = analyzeLevel(level);
    const tag = `M${level.id}`;

    if (level.title !== doc.title) issues.push(`${tag}: title "${level.title}" ≠ doc "${doc.title}"`);
    if (level.rows !== doc.rows || level.columns !== doc.cols) {
        issues.push(`${tag}: size ${level.rows}×${level.columns} ≠ doc ${doc.rows}×${doc.cols}`);
    }
    if (level.collapse !== doc.collapse) issues.push(`${tag}: collapse ${level.collapse} ≠ ${doc.collapse}`);
    if (a.cells !== doc.cells) issues.push(`${tag}: cells ${a.cells} ≠ doc ${doc.cells}`);
    if (a.holes !== doc.holes) issues.push(`${tag}: holes ${a.holes} ≠ doc ${doc.holes}`);

    if (doc.typeCount !== 'flex' && a.typeCount !== doc.typeCount) {
        issues.push(`${tag}: typeCount ${a.typeCount} ≠ doc ${doc.typeCount} (${doc.pairsStructure})`);
    }

    // Even counts per tile
    for (const [food, n] of Object.entries(a.counts)) {
        if (n % 2 !== 0) issues.push(`${tag}: odd count ${food}=${n}`);
    }

    // Food tier
    const allowed = allowedFoodsForLevel(level.id);
    for (const t of a.types) {
        if (!allowed.has(t as FoodId)) {
            issues.push(`${tag}: food "${t}" 超出文档食材档（本关允许: ${[...allowed].join(', ')}）`);
        }
    }

    // fixedLayout / puzzle list 1,2,9,14,18,24,27
    const expectFixed = doc.fixedLayout === true;
    const actualFixed = isFixedLayoutLevel(level);
    if (expectFixed && !actualFixed) issues.push(`${tag}: missing fixedLayout (doc puzzle/hand fixed)`);
    if (!expectFixed && actualFixed) issues.push(`${tag}: unexpected fixedLayout`);

    if (doc.noHints && !isNoHintsLevel(level)) issues.push(`${tag}: missing noHints`);
    if (!doc.noHints && isNoHintsLevel(level)) issues.push(`${tag}: unexpected noHints`);

    const budget = freeReshufflesBudgetForLevel(level);
    if (doc.maxFreeReshuffles === 0 && budget !== 0) issues.push(`${tag}: reshuffle budget ${budget} ≠ 0`);
    if (doc.maxFreeReshuffles === 1 && budget !== 1) issues.push(`${tag}: reshuffle budget ${budget} ≠ 1`);
    if (doc.maxFreeReshuffles === 'unlimited' && budget !== null) {
        issues.push(`${tag}: M15 doc 整理不限 but budget=${budget}`);
    }

    // Hints budget
    const hints = hintsBudgetForLevel(level);
    if (level.id <= 2 && hints !== 99) warnings.push(`${tag}: hints ${hints} expected tutorial unlimited`);
    if (level.id >= 3 && level.id <= 14 && hints !== 2) warnings.push(`${tag}: hints ${hints} expected 2`);
    if (level.id >= 15 && hints !== 1 && !isNoHintsLevel(level)) warnings.push(`${tag}: hints ${hints} expected 1`);

    // Specific multiset rules
    if (level.id === 7) {
        for (const t of a.types) {
            if (a.counts[t] !== 4) {
                issues.push(`${tag}: 4×4 满盘应每种 4 张（2 对），实际 ${JSON.stringify(a.counts)}`);
                break;
            }
        }
    }
    if (level.id === 16 || level.id === 17) {
        if (a.typeCount !== 8) {
            issues.push(`${tag}: 文档食材档 13–18 最多 8 种，实际 ${a.typeCount} 种`);
        }
        if (a.cells !== 36) issues.push(`${tag}: cells ${a.cells} ≠ 36`);
    }
    if (level.id === 19) {
        for (const t of a.types) {
            if (a.counts[t] !== 6) {
                issues.push(`${tag}: expected 7×3对 (6 each), counts mismatch`);
                break;
            }
        }
    }
    if (level.id === 21 || level.id === 22) {
        for (const t of a.types) {
            if (a.counts[t] !== 6) {
                issues.push(`${tag}: expected 8×3对 (6 each), got ${JSON.stringify(a.counts)}`);
                break;
            }
        }
    }
    if (level.id === 27) {
        for (const t of a.types) {
            if (a.counts[t] !== 4) {
                issues.push(`${tag}: expected 12×2对 (4 each), got ${JSON.stringify(a.counts)}`);
                break;
            }
        }
    }
    if (level.id === 23 && a.pairs !== 19) issues.push(`${tag}: expected 19 pairs, got ${a.pairs}`);
    if (level.id === 28 && a.pairs !== 22) issues.push(`${tag}: expected 22 pairs, got ${a.pairs}`);
    if (level.id === 29 && a.pairs !== 26) issues.push(`${tag}: expected 26 pairs, got ${a.pairs}`);
    if (level.id === 30 && a.pairs !== 28) issues.push(`${tag}: expected 28 pairs, got ${a.pairs}`);
}

// Doc says no 64-cell full board
for (const level of MATCH_LEVELS) {
    const a = analyzeLevel(level);
    if (a.cells === 64) issues.push(`M${level.id}: 64-cell full board (doc forbids)`);
}

// P2 已接：M5 限步、15–30 整理 cap、里程碑徽章存档+文案（无独立徽章图）

// M18 tile count check - 8 types × 2 pairs = 16 pairs = 32 cells
const m18 = MATCH_LEVELS.find((l) => l.id === 18);
if (m18) {
    const a = analyzeLevel(m18);
    if (a.typeCount !== 8) issues.push(`M18: typeCount ${a.typeCount} ≠ 8`);
}

console.log('=== 硬性问题 (与表不符) ===');
if (issues.length === 0) console.log('(无)');
else issues.forEach((l) => console.log('  • ' + l));

console.log('\n=== 规则/实现缺口 (文档要求但未接) ===');
warnings.forEach((l) => console.log('  • ' + l));

console.log('\n=== 汇总 ===');
console.log(`关卡数: ${MATCH_LEVELS.length}, 硬性问题: ${issues.length}, 警告: ${warnings.length}`);

if (issues.length > 0) process.exitCode = 1;

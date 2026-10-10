import type { BulkRunDef } from './types';
import { assertBulkRunDef } from './types';
import { BULK_LEVEL_CONFIGS, loadBulkLevel, type BulkLevelConfig } from './levelConfig';

export type BulkPrototypeDef = {
    code: string;
    title: string;
    goal: string;
    targetMinutes: [number, number];
    expectedReplayLine: string;
    audit: {
        hasSolution: boolean;
        criticalMistakeVisibleWithinOneQueue: boolean;
        bufferFullNotPrimary: boolean;
    };
    run: BulkRunDef;
};

export type BulkPrototypeCheckResult = {
    ok: boolean;
    autoPassed: number;
    autoTotal: number;
    manualReady: number;
    manualTotal: number;
    lines: string[];
};

const protoCache = new Map<string, BulkPrototypeDef>();

function toPrototype(level: BulkLevelConfig, index: number): BulkPrototypeDef {
    return {
        code: `L${index + 1}`,
        title: level.title,
        goal: level.goal,
        targetMinutes: level.targetMinutes,
        expectedReplayLine: level.expectedReplayLine,
        audit: {
            hasSolution: false,
            criticalMistakeVisibleWithinOneQueue: true,
            bufferFullNotPrimary: true,
        },
        run: loadBulkLevel(level),
    };
}

export function bulkPrototypeIndex(runId: string): number {
    const index = BULK_LEVEL_CONFIGS.findIndex((item) => item.id === runId);
    return index < 0 ? 0 : index;
}

export function nextBulkRunId(runId: string): string | undefined {
    const index = BULK_LEVEL_CONFIGS.findIndex((item) => item.id === runId);
    if (index < 0) return undefined;
    return BULK_LEVEL_CONFIGS[index + 1]?.id;
}

/** 只在点进这一关时铺袋。启动和主页不要调。 */
export function loadBulkPrototype(runId?: string): BulkPrototypeDef | null {
    const config = runId
        ? BULK_LEVEL_CONFIGS.find((item) => item.id === runId) || null
        : BULK_LEVEL_CONFIGS[0] || null;
    if (!config) return null;
    const cached = protoCache.get(config.id);
    if (cached) return cached;
    try {
        const proto = toPrototype(config, BULK_LEVEL_CONFIGS.indexOf(config));
        protoCache.set(config.id, proto);
        return proto;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[bulk] load ${config.id} failed: ${message}`);
        return null;
    }
}

export function validateBulkPrototype(proto: BulkPrototypeDef): BulkPrototypeCheckResult {
    const lines: string[] = [];
    let autoPassed = 0;
    const autoTotal = 1;
    let manualReady = 0;
    const manualTotal = 3;
    try {
        assertBulkRunDef(proto.run);
        autoPassed = 1;
        lines.push('自动校验 1/1：容量和 / 小票件数通过');
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        lines.push(`自动校验 1/1：容量和 / 小票件数失败 (${message})`);
        return { ok: false, autoPassed, autoTotal, manualReady, manualTotal, lines };
    }
    if (proto.audit.hasSolution) manualReady += 1;
    if (proto.audit.criticalMistakeVisibleWithinOneQueue) manualReady += 1;
    if (proto.audit.bufferFullNotPrimary) manualReady += 1;
    lines.push(`策划门禁 A：可解路径 ${proto.audit.hasSolution ? '已标记，待实测' : '未标记'}`);
    lines.push(`策划门禁 B：关键失误 1 个补格周期内暴露 ${proto.audit.criticalMistakeVisibleWithinOneQueue ? '已标记，待实测' : '未标记'}`);
    lines.push(`策划门禁 C：buffer_full 不是主失败来源 ${proto.audit.bufferFullNotPrimary ? '已标记，待实测' : '未标记'}`);
    return { ok: autoPassed === autoTotal, autoPassed, autoTotal, manualReady, manualTotal, lines };
}

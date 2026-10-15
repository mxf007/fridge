/**
 * 今晚冰箱进度的云端文档。一条记录一个玩家（云开发按 _openid 隔离）。
 *
 * 集合名 saves。控制台权限用「仅创建者可读写」。
 * 字段：cleared、album（首通步数、最佳步数、首通格子种类）、milestones。
 * 本机先写。云端回来后取更高关卡、更少步数；空云档不覆盖本机。
 * 音效、震动、残局不进这份文档。
 */
import { readAlbum, writeAlbum } from './AlbumState';
import type { AlbumEntry, AlbumFile, AlbumGrade, AlbumKv } from './AlbumState';
import { CLOUD_ENV_ID } from './cloudEnv';
import type { FoodId } from './types';
import { FOOD_IDS } from './types';

export const CLOUD_COLLECTION = 'saves';
export const CLEARED_KEY = 'fridge_cleared';
export const BULK_RUN_ID_KEY = 'bulk_weekend_run_id';
export const MILESTONE_NS = [10, 20, 30] as const;
const DOC_ID_KEY = 'fridge_cloud_doc_id';

export type MilestoneN = (typeof MILESTONE_NS)[number];
export type MilestoneFlags = Record<MilestoneN, boolean>;

export type ProgressFile = {
    cleared: number;
    bulkRunId: string;
    album: AlbumFile;
    milestones: MilestoneFlags;
};

type CloudDoc = Record<string, unknown> & { _id?: string };

interface WxDbRes {
    data: CloudDoc[];
}

interface WxQuery {
    limit(n: number): WxQuery;
    get(opts?: { success?: (res: WxDbRes) => void; fail?: (err: unknown) => void }): Promise<WxDbRes> | void;
}

interface WxDocRef {
    update(opts: { data: Record<string, unknown> }): Promise<unknown>;
    remove(): Promise<unknown>;
}

interface WxCollection {
    where(cond: Record<string, unknown>): WxQuery;
    add(opts: { data: Record<string, unknown> }): Promise<{ _id: string }>;
    doc(id: string): WxDocRef;
}

interface WxCloud {
    init(opts: { env: string; traceUser?: boolean }): void;
    database(): { collection(name: string): WxCollection };
}

let chain: Promise<unknown> = Promise.resolve();
let docId = '';
let lastCanon = '';
let cloudReady = false;
let cloudBroken = false;
let warnedEmpty = false;

const foodSet: { [key: string]: boolean } = {};
for (let i = 0; i < FOOD_IDS.length; i++) foodSet[FOOD_IDS[i]] = true;

export function milestoneKey(n: number): string {
    return `fridge_milestone_${n}`;
}

export function emptyProgress(): ProgressFile {
    return {
        cleared: 0,
        bulkRunId: '',
        album: { entries: {} },
        milestones: { 10: false, 20: false, 30: false },
    };
}

export function readProgress(kv: AlbumKv): ProgressFile {
    const raw = kv.getItem(CLEARED_KEY);
    const parsed = raw ? parseInt(raw, 10) : 0;
    const cleared = parsed > 0 ? Math.min(200, parsed) : 0;
    const bulkRunId = sanitizeBulkRunId(kv.getItem(BULK_RUN_ID_KEY) || '');
    const milestones = emptyProgress().milestones;
    for (let i = 0; i < MILESTONE_NS.length; i++) {
        const n = MILESTONE_NS[i];
        milestones[n] = kv.getItem(milestoneKey(n)) === '1';
    }
    return { cleared, bulkRunId, album: readAlbum(kv), milestones };
}

export function writeProgress(kv: AlbumKv, file: ProgressFile): void {
    kv.setItem(CLEARED_KEY, file.cleared > 0 ? String(file.cleared) : '0');
    kv.setItem(BULK_RUN_ID_KEY, sanitizeBulkRunId(file.bulkRunId));
    writeAlbum(kv, file.album);
    for (let i = 0; i < MILESTONE_NS.length; i++) {
        const n = MILESTONE_NS[i];
        if (file.milestones[n]) kv.setItem(milestoneKey(n), '1');
    }
}

/** 云端文档还原成进度。不是对象时返回 null，调用方保留本机。 */
export function progressFromCloud(data: unknown): ProgressFile | null {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const src = data as Record<string, unknown>;
    return {
        cleared: clampCleared(src.cleared),
        bulkRunId: sanitizeBulkRunId(src.bulkRunId),
        album: albumFromCloud(src.album),
        milestones: flagsFromCloud(src.milestones),
    };
}

/**
 * 本机与云端合成一份。
 * 关卡取较大值。最佳步数取更小。首通画面：有真实首通步数的那份盖过「只按袋子铺出来」的旧档。
 * 两边都有真实首通时，保留 local 的格子种类。
 */
export function mergeProgress(local: ProgressFile, remote: ProgressFile): ProgressFile {
    const entries: Record<string, AlbumEntry> = {};
    const seen: { [key: string]: boolean } = {};
    const localKeys = Object.keys(local.album.entries);
    const remoteKeys = Object.keys(remote.album.entries);
    for (let i = 0; i < localKeys.length; i++) seen[localKeys[i]] = true;
    for (let i = 0; i < remoteKeys.length; i++) seen[remoteKeys[i]] = true;
    const keys = Object.keys(seen).sort((a, b) => Number(a) - Number(b));
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const merged = mergeEntry(local.album.entries[key], remote.album.entries[key]);
        if (merged) entries[key] = merged;
    }
    return {
        cleared: Math.max(local.cleared, remote.cleared),
        bulkRunId: mergeBulkRunId(local.bulkRunId, remote.bulkRunId),
        album: { entries },
        milestones: {
            10: local.milestones[10] || remote.milestones[10],
            20: local.milestones[20] || remote.milestones[20],
            30: local.milestones[30] || remote.milestones[30],
        },
    };
}

export function canonProgress(file: ProgressFile): string {
    const entries: Record<string, AlbumEntry> = {};
    const keys = Object.keys(file.album.entries).sort((a, b) => Number(a) - Number(b));
    for (let i = 0; i < keys.length; i++) {
        const entry = file.album.entries[keys[i]];
        entries[keys[i]] = {
            firstClearSteps: entry.firstClearSteps,
            bestSteps: entry.bestSteps,
            grade: entry.grade,
            kinds: entry.kinds.slice(),
        };
    }
    return JSON.stringify({
        cleared: file.cleared,
        bulkRunId: sanitizeBulkRunId(file.bulkRunId),
        milestones: {
            10: !!file.milestones[10],
            20: !!file.milestones[20],
            30: !!file.milestones[30],
        },
        entries,
    });
}

/** 启动时拉取。返回本机进度是否被云端改写。 */
export function pullCloudProgress(kv: AlbumKv): Promise<boolean> {
    return enqueue(async () => {
        try {
            return await doPull(kv);
        } catch (err) {
            logCloudError(err);
            return false;
        }
    });
}

/** 通关、里程碑、图鉴迁移之后调用。本机已经写完。 */
export function pushCloudProgress(kv: AlbumKv): Promise<void> {
    return enqueue(async () => {
        try {
            await doPush(kv);
        } catch (err) {
            logCloudError(err);
        }
    });
}

function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = chain.then(task, task);
    chain = run.then(() => undefined, () => undefined);
    return run;
}

async function doPull(kv: AlbumKv): Promise<boolean> {
    const cloud = ensureCloud();
    if (!cloud) return false;
    const docs = await listOwn(cloud);
    const local = readProgress(kv);
    if (docs.length === 0) {
        const cached = kv.getItem(DOC_ID_KEY) || '';
        if (cached) {
            try {
                await updateDoc(cloud, cached, cloudBody(local));
                docId = cached;
                lastCanon = canonProgress(local);
                return false;
            } catch (err) {
                logCloudError(err);
                kv.setItem(DOC_ID_KEY, '');
            }
        }
        docId = await addDoc(cloud, kv, cloudBody(local));
        lastCanon = canonProgress(local);
        return false;
    }
    let remote = emptyProgress();
    for (let i = 0; i < docs.length; i++) {
        const parsed = progressFromCloud(docs[i]);
        if (parsed) remote = mergeProgress(remote, parsed);
    }
    const merged = mergeProgress(local, remote);
    const changed = canonProgress(local) !== canonProgress(merged);
    if (changed) writeProgress(kv, merged);
    const uploaded = readProgress(kv);
    const keep = String(docs[0]._id || '');
    if (!keep) return changed;
    docId = keep;
    kv.setItem(DOC_ID_KEY, keep);
    if (canonProgress(uploaded) !== canonProgress(remote) || docs.length > 1) {
        try {
            await updateDoc(cloud, keep, cloudBody(uploaded));
            for (let i = 1; i < docs.length; i++) {
                const extra = String(docs[i]._id || '');
                if (!extra || extra === keep) continue;
                try {
                    await removeDoc(cloud, extra);
                } catch (err) {
                    logCloudError(err);
                }
            }
            lastCanon = canonProgress(uploaded);
        } catch (err) {
            logCloudError(err);
        }
    } else {
        lastCanon = canonProgress(uploaded);
    }
    return changed;
}

async function doPush(kv: AlbumKv): Promise<void> {
    if (!ensureCloud()) return;
    if (!docId) await doPull(kv);
    const cloud = ensureCloud();
    if (!cloud) return;
    const local = readProgress(kv);
    if (canonProgress(local) === lastCanon && docId) return;
    const body = cloudBody(local);
    if (!docId) {
        docId = await addDoc(cloud, kv, body);
    } else {
        try {
            await updateDoc(cloud, docId, body);
        } catch (err) {
            logCloudError(err);
            kv.setItem(DOC_ID_KEY, '');
            docId = await addDoc(cloud, kv, body);
        }
    }
    lastCanon = canonProgress(local);
}

function cloudBody(file: ProgressFile): Record<string, unknown> {
    return {
        v: 1,
        cleared: file.cleared,
        bulkRunId: sanitizeBulkRunId(file.bulkRunId),
        milestones: {
            '10': !!file.milestones[10],
            '20': !!file.milestones[20],
            '30': !!file.milestones[30],
        },
        album: {
            entries: file.album.entries,
        },
        updatedAt: Date.now(),
    };
}

function getCloud(): WxCloud | null {
    const host = globalThis as { wx?: { cloud?: WxCloud } };
    const cloud = host.wx && host.wx.cloud;
    if (!cloud || typeof cloud.init !== 'function' || typeof cloud.database !== 'function') return null;
    return cloud;
}

function ensureCloud(): WxCloud | null {
    if (cloudBroken) return null;
    const cloud = getCloud();
    if (!cloud) return null;
    if (!CLOUD_ENV_ID) {
        if (!warnedEmpty) {
            warnedEmpty = true;
            console.warn('[fridge] 未填写云开发环境 ID（assets/scripts/game/cloudEnv.ts），进度只保存在本机');
        }
        return null;
    }
    if (!cloudReady) {
        try {
            cloud.init({ env: CLOUD_ENV_ID, traceUser: true });
            cloudReady = true;
        } catch (err) {
            cloudBroken = true;
            logCloudError(err);
            return null;
        }
    }
    return cloud;
}

function collection(cloud: WxCloud): WxCollection {
    return cloud.database().collection(CLOUD_COLLECTION);
}

function listOwn(cloud: WxCloud): Promise<CloudDoc[]> {
    const query = collection(cloud).where({ _openid: '{openid}' }).limit(20);
    return callCloud<WxDbRes>((ok, bad) => query.get({ success: ok, fail: bad })).then((res) => {
        return res && Array.isArray(res.data) ? res.data : [];
    });
}

function addDoc(cloud: WxCloud, kv: AlbumKv, body: Record<string, unknown>): Promise<string> {
    return collection(cloud).add({ data: body }).then((res) => {
        const id = res && res._id ? String(res._id) : '';
        if (!id) throw new Error('cloud add missing _id');
        kv.setItem(DOC_ID_KEY, id);
        docId = id;
        return id;
    });
}

function updateDoc(cloud: WxCloud, id: string, body: Record<string, unknown>): Promise<unknown> {
    return collection(cloud).doc(id).update({ data: body });
}

function removeDoc(cloud: WxCloud, id: string): Promise<unknown> {
    return collection(cloud).doc(id).remove();
}

function callCloud<T>(invoke: (ok: (value: T) => void, bad: (err: unknown) => void) => Promise<T> | void): Promise<T> {
    return new Promise((resolve, reject) => {
        let settled = false;
        const ok = (value: T) => {
            if (settled) return;
            settled = true;
            resolve(value);
        };
        const bad = (err: unknown) => {
            if (settled) return;
            settled = true;
            reject(err);
        };
        try {
            const ret = invoke(ok, bad);
            if (ret && typeof ret.then === 'function') ret.then(ok, bad);
        } catch (err) {
            bad(err);
        }
    });
}

function logCloudError(err: unknown): void {
    const msg = err && typeof err === 'object' && 'errMsg' in err
        ? String((err as { errMsg: unknown }).errMsg)
        : err instanceof Error
            ? err.message
            : String(err);
    if (
        msg.indexOf('not exist') >= 0
        || msg.indexOf('NOT_EXIST') >= 0
        || msg.indexOf('ResourceNotFound') >= 0
        || msg.indexOf('-502005') >= 0
    ) {
        console.warn('[fridge] 云存档失败：请在云开发数据库新建集合 saves，权限选「仅创建者可读写」。', msg);
        return;
    }
    if (msg.indexOf('Env') >= 0 || msg.indexOf('env not') >= 0 || msg.indexOf('INVALID_ENV') >= 0) {
        console.warn('[fridge] 云环境无效，请核对 assets/scripts/game/cloudEnv.ts 里的环境 ID。', msg);
        return;
    }
    console.warn('[fridge] 云存档失败，本机进度仍在。', msg);
}

function clampCleared(value: unknown): number {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? parseInt(value, 10) : NaN;
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.min(200, Math.floor(n));
}

function sanitizeBulkRunId(value: unknown): string {
    return typeof value === 'string' && /^bulk_\d{2,3}$/.test(value) ? value : '';
}

function bulkRunRank(runId: string): number {
    if (!runId) return 0;
    const parsed = parseInt(runId.replace(/^bulk_/, ''), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function mergeBulkRunId(local: string, remote: string): string {
    const a = sanitizeBulkRunId(local);
    const b = sanitizeBulkRunId(remote);
    return bulkRunRank(a) >= bulkRunRank(b) ? a : b;
}

function flagsFromCloud(raw: unknown): MilestoneFlags {
    const src = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    const on = (key: string) => src[key] === true || src[key] === 1;
    return { 10: on('10'), 20: on('20'), 30: on('30') };
}

function albumFromCloud(raw: unknown): AlbumFile {
    if (!raw || typeof raw !== 'object') return { entries: {} };
    const entriesRaw = (raw as { entries?: unknown }).entries;
    if (!entriesRaw || typeof entriesRaw !== 'object' || Array.isArray(entriesRaw)) return { entries: {} };
    const bag = entriesRaw as Record<string, unknown>;
    const entries: Record<string, AlbumEntry> = {};
    const keys = Object.keys(bag);
    for (let i = 0; i < keys.length && i < 200; i++) {
        const key = keys[i];
        if (!/^[1-9]\d{0,2}$/.test(key)) continue;
        if (Number(key) > 200) continue;
        const entry = sanitizeEntry(bag[key]);
        if (entry) entries[key] = entry;
    }
    return { entries };
}

function sanitizeEntry(raw: unknown): AlbumEntry | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const src = raw as Partial<AlbumEntry>;
    const kindsIn = Array.isArray(src.kinds) ? src.kinds : [];
    const kinds: (FoodId | null)[] = [];
    for (let i = 0; i < kindsIn.length && i < 16; i++) {
        const kind = kindsIn[i];
        if (kind == null) kinds.push(null);
        else if (typeof kind === 'string' && foodSet[kind]) kinds.push(kind as FoodId);
        else kinds.push(null);
    }
    let first = finiteStep(src.firstClearSteps);
    let best = finiteStep(src.bestSteps);
    if (first != null && best == null) best = first;
    const grade: AlbumGrade = src.grade === 'sage' || src.grade === 'walnut' || src.grade === 'cleared'
        ? src.grade
        : 'cleared';
    return { firstClearSteps: first, bestSteps: best, grade, kinds };
}

function finiteStep(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 9999) return null;
    return Math.floor(value);
}

function mergeEntry(local: AlbumEntry | undefined, remote: AlbumEntry | undefined): AlbumEntry | undefined {
    if (!local && !remote) return undefined;
    if (!local) return copyEntry(remote as AlbumEntry);
    if (!remote) return copyEntry(local);
    const localReal = local.firstClearSteps != null;
    const remoteReal = remote.firstClearSteps != null;
    let kinds: (FoodId | null)[];
    let first: number | null;
    if (remoteReal && !localReal) {
        kinds = remote.kinds.slice();
        first = remote.firstClearSteps;
    } else {
        kinds = local.kinds.slice();
        first = local.firstClearSteps;
    }
    let best: number | null;
    if (local.bestSteps == null) best = remote.bestSteps;
    else if (remote.bestSteps == null) best = local.bestSteps;
    else best = Math.min(local.bestSteps, remote.bestSteps);
    const grade: AlbumGrade = local.grade === 'sage' || local.grade === 'walnut' || local.grade === 'cleared'
        ? local.grade
        : 'cleared';
    return { firstClearSteps: first, bestSteps: best, grade, kinds };
}

function copyEntry(entry: AlbumEntry): AlbumEntry {
    return {
        firstClearSteps: entry.firstClearSteps,
        bestSteps: entry.bestSteps,
        grade: entry.grade,
        kinds: entry.kinds.slice(),
    };
}

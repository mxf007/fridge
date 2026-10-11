/**
 * 微信小游戏分享：截屏正中区域作 imageUrl，query 带关卡号。
 * 须在用户点击的同步栈里调用 shareAppMessage（不能先 await 再分享）。
 */
import { Director, director, game } from 'cc';
import { visibleDesignSize } from './visibleDesignSize';

export const SHARE_CROP_W = 720;
export const SHARE_CROP_H = 960;
const SHARE_OUT_W = 720;
const SHARE_OUT_H = 960;

export interface SharePayload {
    title: string;
    query?: string;
}

interface WxShareResult {
    tempFilePath: string;
}

interface CanvasToTempOpts {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    destWidth?: number;
    destHeight?: number;
    fileType?: string;
    quality?: number;
    success?: (res: WxShareResult) => void;
    fail?: (err: Error) => void;
}

interface WxLike {
    shareAppMessage?(opts: { title: string; imageUrl?: string; query?: string }): void;
    showShareMenu?(opts: { withShareTicket?: boolean; menus?: string[] }): void;
    onShareAppMessage?(fn: () => { title: string; imageUrl?: string; query?: string }): void;
}

let pending: SharePayload = { title: '今晚冰箱，来一起收一层' };
let lastImageUrl = '';

function getWx(): WxLike | null {
    const g = globalThis as { wx?: WxLike };
    if (g.wx) return g.wx;
    return null;
}

function shareCanvas(): HTMLCanvasElement | null {
    const c = game.canvas;
    return c || null;
}

function canvasToTempSync(canvas: HTMLCanvasElement, opts: CanvasToTempOpts): string {
    const c = canvas as any;
    if (typeof c.toTempFilePathSync === 'function') {
        return c.toTempFilePathSync(opts) || '';
    }
    return '';
}

function canvasToTempAsync(canvas: HTMLCanvasElement, opts: CanvasToTempOpts): void {
    const c = canvas as any;
    if (typeof c.toTempFilePath === 'function') {
        c.toTempFilePath(opts);
    }
}

export function isWechatShareAvailable(): boolean {
    const wx = getWx();
    return !!(wx && typeof wx.shareAppMessage === 'function');
}

export function setSharePayload(payload: SharePayload): void {
    pending = payload;
}

export function installWechatShareMenu(): void {
    const wx = getWx();
    if (!wx || typeof wx.onShareAppMessage !== 'function') return;
    if (typeof wx.showShareMenu === 'function') {
        wx.showShareMenu({ withShareTicket: false, menus: ['shareAppMessage'] });
    }
    wx.onShareAppMessage(() => ({
        title: pending.title,
        imageUrl: lastImageUrl || undefined,
        query: pending.query,
    }));
}

function shareCropCanvasRect(canvas: HTMLCanvasElement): { x: number; y: number; width: number; height: number } {
    const vis = visibleDesignSize();
    const cropW = Math.min(SHARE_CROP_W, vis.width);
    const cropH = Math.min(SHARE_CROP_H, vis.height);
    const left = (vis.width - cropW) * 0.5;
    const top = (vis.height - cropH) * 0.5;

    const sx = canvas.width / vis.width;
    const sy = canvas.height / vis.height;

    const x = Math.max(0, Math.round(left * sx));
    const y = Math.max(0, Math.round(top * sy));
    const width = Math.min(canvas.width - x, Math.max(1, Math.round(cropW * sx)));
    const height = Math.min(canvas.height - y, Math.max(1, Math.round(cropH * sy)));
    if (width <= 0 || height <= 0) {
        return { x: 0, y: 0, width: canvas.width, height: canvas.height };
    }
    return { x, y, width, height };
}

function canvasToTempOpts(rect: { x: number; y: number; width: number; height: number }): CanvasToTempOpts {
    return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        destWidth: SHARE_OUT_W,
        destHeight: SHARE_OUT_H,
        fileType: 'jpg',
        quality: 0.82,
    };
}

/** 同步截屏（供按钮分享，须与用户 tap 同栈）。 */
export function captureShareImageUrlSync(): string {
    const canvas = shareCanvas();
    if (!canvas || canvas.width <= 0 || canvas.height <= 0) return '';

    const rect = shareCropCanvasRect(canvas);
    const opts = canvasToTempOpts(rect);

    try {
        const path = canvasToTempSync(canvas, opts);
        if (path) {
            lastImageUrl = path;
            return path;
        }
    } catch (e) {
        console.warn('[fridge] toTempFilePathSync 失败', e);
    }

    return lastImageUrl;
}

/** 异步截屏（预缓存分享图，勿在 await 后再 shareAppMessage）。 */
export function prefetchShareScreenshot(): void {
    const canvas = shareCanvas();
    if (!canvas) return;
    const rect = shareCropCanvasRect(canvas);
    const opts = canvasToTempOpts(rect);
    canvasToTempAsync(canvas, {
        x: opts.x,
        y: opts.y,
        width: opts.width,
        height: opts.height,
        destWidth: opts.destWidth,
        destHeight: opts.destHeight,
        fileType: opts.fileType,
        quality: opts.quality,
        success: (res) => {
            lastImageUrl = res.tempFilePath;
        },
        fail: (err) => {
            console.warn('[fridge] prefetch toTempFilePath 失败', err);
        },
    });
}

function waitAfterDraw(): Promise<void> {
    return new Promise((resolve) => {
        director.once(Director.EVENT_AFTER_DRAW, () => resolve());
    });
}

/** 用户点击分享：同步 shareAppMessage；imageUrl 不传时微信会用当前画面截图。 */
export function shareFromUserTap(payload: SharePayload): boolean {
    setSharePayload(payload);
    const wx = getWx();
    if (!wx || typeof wx.shareAppMessage !== 'function') {
        console.warn('[fridge] 无 wx.shareAppMessage，仅编辑器或非微信环境');
        return false;
    }

    const imageUrl = captureShareImageUrlSync();
    try {
        wx.shareAppMessage({
            title: payload.title,
            imageUrl: imageUrl || undefined,
            query: payload.query,
        });
        return true;
    } catch (e) {
        console.warn('[fridge] shareAppMessage 异常', e);
        return false;
    }
}

/** 异步路径无法保证微信用户态，请用 shareFromUserTap。 */
export async function shareWithScreenshot(payload: SharePayload): Promise<boolean> {
    await waitAfterDraw();
    prefetchShareScreenshot();
    return shareFromUserTap(payload);
}

export function shareQueryForLevel(levelId: number): string {
    return `level=${levelId}`;
}

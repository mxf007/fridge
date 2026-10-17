import { sys } from 'cc';

/** 微信 / 系统 iOS：大果盘走更省 CPU 的物理与绘制分支。 */
export function mergeOnIos(): boolean {
    if (sys.os === sys.OS.IOS) return true;
    try {
        const wx = (globalThis as { wx?: { getSystemInfoSync?: () => { platform?: string } } }).wx;
        return wx?.getSystemInfoSync?.()?.platform === 'ios';
    } catch {
        return false;
    }
}

/**
 * 设计坐标可见区：用 screen.windowSize，避免 view.getVisibleSize / getFrameSize 弃用警告。
 */
import { ResolutionPolicy, screen, view } from 'cc';

const FALLBACK_W = 720;
const FALLBACK_H = 1280;

function frameWindowSize(): { width: number; height: number } {
    const ws = screen.windowSize;
    if (ws.width > 0 && ws.height > 0) {
        return { width: ws.width, height: ws.height };
    }
    return { width: FALLBACK_W, height: FALLBACK_H };
}

export function visibleDesignSize(): { width: number; height: number } {
    const design = view.getDesignResolutionSize();
    const dw = design.width > 0 ? design.width : FALLBACK_W;
    const dh = design.height > 0 ? design.height : FALLBACK_H;
    const frame = frameWindowSize();
    const fw = frame.width;
    const fh = frame.height;
    const policy = view.getResolutionPolicy();

    if (policy === ResolutionPolicy.EXACT_FIT) {
        return { width: dw, height: dh };
    }
    if (policy === ResolutionPolicy.NO_BORDER) {
        const scale = Math.max(dw / fw, dh / fh);
        return { width: fw * scale, height: fh * scale };
    }
    if (policy === ResolutionPolicy.SHOW_ALL) {
        const scale = Math.min(dw / fw, dh / fh);
        return { width: fw * scale, height: fh * scale };
    }
    if (policy === ResolutionPolicy.FIXED_HEIGHT) {
        const scale = dh / fh;
        return { width: fw * scale, height: dh };
    }
    // FIXED_WIDTH 及默认
    const scale = dw / fw;
    return { width: dw, height: fh * scale };
}

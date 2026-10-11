/**
 * 平板等「更方」竖屏：SHOW_ALL + 720×1280（9:16），左右黑边，不裁切。
 * 插件脚本在工程脚本 / 首场景之前执行，此处只应用一次，避免进场景后再切换导致闪烁。
 */
(function (global) {
    'use strict';

    var CREAM_HEX = '#F6EFE6';
    var wx = global.wx;
    if (wx && typeof wx.setBackgroundColor === 'function') {
        try {
            wx.setBackgroundColor({
                backgroundColor: CREAM_HEX,
                backgroundColorTop: CREAM_HEX,
                backgroundColorBottom: CREAM_HEX,
            });
        } catch (e) {
            /* 低版本基础库无此接口 */
        }
    }

    var DESIGN_W = 720;
    var DESIGN_H = 1280;
    /** 宽高比大于此值视为更方（如 4:3 竖屏约 0.75） */
    var TABLET_MIN_ASPECT = 0.7;

    var applied = false;

    function getCc() {
        return global.cc;
    }

    function frameAspect(cc) {
        var frame = cc.screen && cc.screen.windowSize;
        if (frame && frame.width > 0 && frame.height > 0) {
            return frame.width / frame.height;
        }
        if (wx && typeof wx.getWindowInfo === 'function') {
            var win = wx.getWindowInfo();
            if (win.windowWidth > 0 && win.windowHeight > 0) {
                return win.windowWidth / win.windowHeight;
            }
        }
        if (wx && typeof wx.getSystemInfoSync === 'function') {
            try {
                var sys = wx.getSystemInfoSync();
                if (sys.windowWidth > 0 && sys.windowHeight > 0) {
                    return sys.windowWidth / sys.windowHeight;
                }
            } catch (e) {
                /* ignore */
            }
        }
        return null;
    }

    function applyScreenAdaptPolicyOnce() {
        if (applied) {
            return true;
        }
        var cc = getCc();
        if (!cc || !cc.view || !cc.ResolutionPolicy) {
            return false;
        }
        var policy = cc.ResolutionPolicy;
        var aspect = frameAspect(cc);
        if (!aspect || aspect <= 0) {
            return false;
        }
        if (aspect > TABLET_MIN_ASPECT) {
            cc.view.setDesignResolutionSize(DESIGN_W, DESIGN_H, policy.SHOW_ALL);
        } else {
            cc.view.setDesignResolutionSize(DESIGN_W, DESIGN_H, policy.FIXED_WIDTH);
        }
        applied = true;
        return true;
    }

    function hookEarlyDelegates() {
        var cc = getCc();
        if (!cc || !cc.game) {
            return;
        }
        var game = cc.game;
        if (game.onPreProjectInitDelegate) {
            game.onPreProjectInitDelegate.add(applyScreenAdaptPolicyOnce);
        }
        if (game.onPostInfrastructureInitDelegate) {
            game.onPostInfrastructureInitDelegate.add(applyScreenAdaptPolicyOnce);
        }
    }

    hookEarlyDelegates();
    if (!applyScreenAdaptPolicyOnce()) {
        var tries = 0;
        (function retry() {
            tries += 1;
            if (applyScreenAdaptPolicyOnce() || tries > 32) {
                return;
            }
            setTimeout(retry, 16);
        })();
    }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);

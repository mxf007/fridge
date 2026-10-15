/**
 * 微信首屏：不显示 Cocos logo，用产品 Cream 铺满 canvas，避免去掉闪屏后黑屏。
 * 与 GameScene 相机清屏色 #F6EFE6 一致。
 */

// 模拟器用户目录里还没有 cacheList.json 时，引擎会打一行 Read json failed。
// 只丢掉这一条；不去列 http://usr，避免开发者工具 Timeout。
(function silenceMissingCacheListWarn() {
    if (typeof console === 'undefined' || typeof console.warn !== 'function' || console.warn.__fridgeCacheList) return;
    const warn = console.warn.bind(console);
    function wrapped() {
        const text = Array.prototype.join.call(arguments, ' ');
        if (text.indexOf('Read json failed') !== -1
            && text.indexOf('cacheList.json') !== -1
            && text.indexOf('no such file') !== -1) {
            return;
        }
        return warn.apply(console, arguments);
    }
    wrapped.__fridgeCacheList = true;
    console.warn = wrapped;
})();

const CREAM = [246 / 255, 239 / 255, 230 / 255, 1];

const options = {
    alpha: false,
    antialias: true,
    depth: true,
    stencil: true,
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'default',
    failIfMajorPerformanceCaveat: false,
};

let gl = null;
let rafHandle = null;
let afterTick = null;

function draw() {
    if (!gl) return;
    gl.disable(gl.SCISSOR_TEST);
    gl.disable(gl.CULL_FACE);
    gl.disable(gl.DEPTH_TEST);
    gl.clearColor(CREAM[0], CREAM[1], CREAM[2], CREAM[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
}

function tick() {
    rafHandle = requestAnimationFrame(() => {
        draw();
        tick();
        if (afterTick) {
            afterTick();
            afterTick = null;
        }
    });
}

function start(alpha, antialias, useWebgl2) {
    options.alpha = alpha === 'true';
    options.antialias = antialias !== 'false';
    const canvas = window.canvas;
    if (useWebgl2 === 'true') {
        gl = canvas.getContext('webgl2', options);
    }
    if (gl) {
        window.WebGL2RenderingContext = true;
    } else {
        window.WebGL2RenderingContext = false;
        gl = canvas.getContext('webgl', options);
    }
    draw();
    tick();
    return Promise.resolve();
}

function end() {
    return setProgress(1).then(() => {
        draw();
        if (rafHandle) {
            cancelAnimationFrame(rafHandle);
            rafHandle = null;
        }
        if (gl) {
            gl.enable(gl.SCISSOR_TEST);
            gl.enable(gl.CULL_FACE);
            gl.enable(gl.DEPTH_TEST);
        }
    });
}

function setProgress() {
    return new Promise((resolve) => {
        afterTick = () => resolve();
    });
}

module.exports = { start, end, setProgress };

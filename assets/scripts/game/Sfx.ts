import { AudioClip, AudioSource, director, Node, resources, sys } from 'cc';

/** 不播 BGM。资源在 assets/resources/audio，跟主包一起构建。 */
export type SfxId = 'click_btn' | 'win_tg' | 'game_failed' | 'game_df' | 'bx_open';

const PATHS: Record<SfxId, string> = {
    click_btn: 'audio/CLICK_BTN',
    win_tg: 'audio/win_tg',
    game_failed: 'audio/game_failed',
    game_df: 'audio/game_df',
    bx_open: 'audio/bx_open',
};

export const SFX_ENABLED_KEY = 'fridge_sfx';
export const VIBRATION_ENABLED_KEY = 'fridge_vibration';

const clips = new Map<SfxId, AudioClip>();
const loading = new Set<SfxId>();
let preload: Promise<void> | null = null;
let source: AudioSource | null = null;

export function isSfxEnabled(): boolean {
    const v = sys.localStorage.getItem(SFX_ENABLED_KEY);
    if (v == null) return true;
    return v !== '0' && v !== 'false';
}

export function setSfxEnabled(on: boolean): void {
    sys.localStorage.setItem(SFX_ENABLED_KEY, on ? '1' : '0');
}

export function isVibrationEnabled(): boolean {
    const v = sys.localStorage.getItem(VIBRATION_ENABLED_KEY);
    if (v == null) return true;
    return v !== '0' && v !== 'false';
}

export function setVibrationEnabled(on: boolean): void {
    sys.localStorage.setItem(VIBRATION_ENABLED_KEY, on ? '1' : '0');
}

function loadClip(id: SfxId): Promise<AudioClip | null> {
    const cached = clips.get(id);
    if (cached) return Promise.resolve(cached);
    if (loading.has(id)) {
        return new Promise((resolve) => {
            const tick = () => {
                const clip = clips.get(id);
                if (clip) {
                    resolve(clip);
                    return;
                }
                if (!loading.has(id)) {
                    resolve(null);
                    return;
                }
                setTimeout(tick, 16);
            };
            tick();
        });
    }
    loading.add(id);
    return new Promise((resolve) => {
        resources.load(PATHS[id], AudioClip, (error, clip) => {
            loading.delete(id);
            if (error || !clip) {
                console.warn(`[fridge] sfx load failed: ${PATHS[id]}`, error);
                resolve(null);
                return;
            }
            clips.set(id, clip);
            resolve(clip);
        });
    });
}

/** 启动时预加载，避免首击无声。 */
export function preloadSfx(): Promise<void> {
    if (preload) return preload;
    preload = (async () => {
        const ids = Object.keys(PATHS) as SfxId[];
        await Promise.all(ids.map((id) => loadClip(id)));
    })();
    return preload;
}

function ensureSource(): AudioSource | null {
    if (source && source.isValid) return source;
    const scene = director.getScene();
    if (!scene) return null;
    let host = scene.getChildByName('SfxRoot');
    if (!host) {
        host = new Node('SfxRoot');
        scene.addChild(host);
    }
    source = host.getComponent(AudioSource) ?? host.addComponent(AudioSource);
    source.playOnAwake = false;
    return source;
}

export function playSfx(id: SfxId): void {
    if (!isSfxEnabled()) return;
    const clip = clips.get(id);
    const src = ensureSource();
    if (!clip || !src) {
        void preloadSfx().then(() => {
            const late = clips.get(id);
            const s = ensureSource();
            if (late && s && isSfxEnabled()) s.playOneShot(late, 1);
        });
        return;
    }
    src.playOneShot(clip, 1);
}

/** 所有 UI 按钮短按。 */
export function playBtnClick(): void {
    playSfx('click_btn');
}

/** 食材落进冰箱格（含点击/拖动飞入后落定）。 */
export function playFridgeDrop(): void {
    playSfx('game_df');
}

/** 冰箱格封门合上（容量凑满关门动画）。 */
export function playTrayDoorClose(): void {
    playSfx('bx_open');
}

/** 单格收满关门时给一次轻振，预览环境降级用浏览器振动。 */
export function playTrayDoorVibration(): void {
    if (!isVibrationEnabled()) return;
    const host = globalThis as {
        wx?: MiniGameVibrationApi;
        tt?: MiniGameVibrationApi;
        qq?: MiniGameVibrationApi;
        swan?: MiniGameVibrationApi;
        my?: MiniGameVibrationApi;
        navigator?: BrowserVibrationApi;
    };
    const mini = host.wx || host.tt || host.qq || host.swan || host.my;
    if (mini?.vibrateShort) {
        try {
            mini.vibrateShort({ type: 'light' });
            return;
        } catch {
            try {
                mini.vibrateShort();
                return;
            } catch {
                // fall through to browser vibration
            }
        }
    }
    if (typeof host.navigator?.vibrate === 'function') {
        try {
            host.navigator.vibrate(18);
        } catch {
            // Ignore preview environments without vibration support.
        }
    }
}

interface MiniGameVibrationApi {
    vibrateShort?: (options?: { type?: 'light' | 'medium' | 'heavy' }) => void;
}

interface BrowserVibrationApi {
    vibrate?: (pattern: number | number[]) => boolean;
}

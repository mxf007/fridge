import { assetManager, AudioClip, AudioSource, director, Node, sys } from 'cc';

/** 不播 BGM。文件名与 assets/audio 一致。 */
export type SfxId = 'click_btn' | 'win_tg' | 'game_failed' | 'game_df' | 'bx_open';

const CLIP_UUID: Record<SfxId, string> = {
    click_btn: 'c22d3242-2878-46b9-b627-7e553d9d77ba',
    win_tg: 'e7b02e22-32dc-4b1e-9071-57c80d0a8b80',
    game_failed: '641fe467-9998-4c1f-ad77-0782b46b467b',
    game_df: '1849fa17-8d3b-4c44-bdb3-543641d938c7',
    bx_open: 'a91e3c42-5f8b-4d1e-a6c3-8f2e5d9b1c04',
};

export const SFX_ENABLED_KEY = 'fridge_sfx';

const clips = new Map<SfxId, AudioClip>();
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

function loadClip(uuid: string): Promise<AudioClip | null> {
    return new Promise((resolve) => {
        assetManager.loadAny({ uuid }, (err, asset) => {
            if (err || !asset) {
                resolve(null);
                return;
            }
            resolve(asset as AudioClip);
        });
    });
}

/** 启动时预加载，避免首击无声。 */
export function preloadSfx(): Promise<void> {
    if (preload) return preload;
    preload = (async () => {
        const ids = Object.keys(CLIP_UUID) as SfxId[];
        await Promise.all(
            ids.map(async (id) => {
                if (clips.has(id)) return;
                const clip = await loadClip(CLIP_UUID[id]);
                if (clip) clips.set(id, clip);
            }),
        );
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

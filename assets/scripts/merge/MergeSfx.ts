import { AudioClip, AudioSource, director, Node, resources, sys } from 'cc';

/** 合成小游戏独立音效；资源在 assets/resources/merge/audio。 */
export type MergeSfxId = 'click' | 'drop' | 'merge' | 'gameOver';

const PATHS: Record<MergeSfxId, string> = {
    click: 'merge/audio/merge_click',
    drop: 'merge/audio/merge_drop',
    merge: 'merge/audio/merge_pop',
    gameOver: 'merge/audio/merge_game_over',
};

const clips = new Map<MergeSfxId, AudioClip>();
const loading = new Set<MergeSfxId>();
const unavailable = new Set<MergeSfxId>();
let source: AudioSource | null = null;

function enabled(): boolean {
    const value = sys.localStorage.getItem('fridge_sfx');
    return value == null || (value !== '0' && value !== 'false');
}

function audioSource(): AudioSource | null {
    if (source?.isValid) return source;
    const scene = director.getScene();
    if (!scene) return null;
    let root = scene.getChildByName('MergeSfxRoot');
    if (!root) {
        root = new Node('MergeSfxRoot');
        scene.addChild(root);
    }
    source = root.getComponent(AudioSource) ?? root.addComponent(AudioSource);
    source.playOnAwake = false;
    return source;
}

export function playMergeSfx(id: MergeSfxId): void {
    if (!enabled()) return;
    if (unavailable.has(id)) return;
    const ready = clips.get(id);
    if (ready) {
        audioSource()?.playOneShot(ready, 1);
        return;
    }
    if (loading.has(id)) return;
    loading.add(id);
    resources.load(PATHS[id], AudioClip, (error, clip) => {
        loading.delete(id);
        if (error || !clip) {
            unavailable.add(id);
            return;
        }
        clips.set(id, clip);
        if (enabled()) audioSource()?.playOneShot(clip, 1);
    });
}

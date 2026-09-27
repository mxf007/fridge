/** 落子音效接口。暂不加载片段、不播 BGM。设置里的音效开关以后再接。 */
export type SfxId = 'pickup' | 'place' | 'reject' | 'door' | 'latch';

export function playSfx(_id: SfxId): void {}

import { albumStatusLine, kindsFromLevel, noteAlbumWin, prepareAlbum } from '../assets/scripts/game/AlbumState';
import type { AlbumKv } from '../assets/scripts/game/AlbumState';
import { LEVEL_01 } from '../assets/scripts/game/level_01';
import { LEVEL_30 } from '../assets/scripts/game/level_30';
import type { LevelDef } from '../assets/scripts/game/types';

const levels = [LEVEL_01, LEVEL_30];

function levelById(id: number): LevelDef | null {
    for (let i = 0; i < levels.length; i++) if (levels[i].id === id) return levels[i];
    return null;
}

function memoryKv(): AlbumKv {
    const bag: Record<string, string> = {};
    return {
        getItem(key) { return bag[key] ?? null; },
        setItem(key, value) { bag[key] = value; },
    };
}

const l1 = kindsFromLevel(LEVEL_01);
if (l1.length !== 1 || l1[0] !== 'milk') throw new Error(`L1 kinds ${l1.join(',')}`);

const l30 = kindsFromLevel(LEVEL_30);
const expect = ['grape', 'milk', 'veg', 'meat', 'pineapple', 'watermelon'];
if (l30.join(',') !== expect.join(',')) throw new Error(`L30 kinds ${l30.join(',')}`);

const kv = memoryKv();
const first = noteAlbumWin(kv, 0, LEVEL_01, 6, ['milk'], levelById);
if (!first.firstClear) throw new Error('first clear should badge');
const replay = noteAlbumWin(kv, 1, LEVEL_01, 4, ['veg'], levelById);
if (replay.firstClear) throw new Error('replay must not badge');
const file = prepareAlbum(kv, 1, levelById);
const entry = file.entries['1'];
if (!entry || entry.bestSteps !== 4 || entry.firstClearSteps !== 6 || entry.kinds[0] !== 'milk') {
    throw new Error(`replay entry ${JSON.stringify(entry)}`);
}
if (albumStatusLine(entry) !== '最佳 4 · 首通 6') throw new Error(albumStatusLine(entry));

const old = memoryKv();
const migrated = prepareAlbum(old, 1, levelById);
if (migrated.entries['1'].bestSteps != null) throw new Error('migration invented steps');
if (migrated.entries['1'].kinds[0] !== 'milk') throw new Error('migration kind');
const later = noteAlbumWin(old, 1, LEVEL_01, 5, ['fruit'], levelById);
if (later.firstClear) throw new Error('migrated replay is not a first clear');
const after = prepareAlbum(old, 1, levelById).entries['1'];
if (after.bestSteps !== 5 || after.firstClearSteps != null || after.kinds[0] !== 'milk') {
    throw new Error(`migrated replay ${JSON.stringify(after)}`);
}
if (albumStatusLine(after) !== '最佳 5 步') throw new Error(albumStatusLine(after));
if (albumStatusLine(migrated.entries['1']) === '已收' && after.bestSteps === 5) {
    // status of the pre-replay snapshot is not re-read; the saved entry is what matters
}
console.log('album state ok');

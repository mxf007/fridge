import { LEVEL_45 } from '../assets/scripts/game/level_45';
import { assertLevel } from '../assets/scripts/game/types';
import { assertRedoLayout, assertTrayGrid } from '../assets/scripts/game/levelLayout';

assertLevel(LEVEL_45);
assertRedoLayout(LEVEL_45);
assertTrayGrid(45, LEVEL_45.trays.map((t) => t.cap));
const items = LEVEL_45.bags.flat();
const c: Record<string, number> = {};
for (const k of items) c[k] = (c[k] || 0) + 1;
console.log('caps', LEVEL_45.trays.map((t) => t.cap).join(','));
console.log('counts', JSON.stringify(c));

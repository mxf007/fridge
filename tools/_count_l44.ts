import { LEVEL_44 } from '../assets/scripts/game/level_44';
import { assertLevel } from '../assets/scripts/game/types';
import { assertRedoLayout } from '../assets/scripts/game/levelLayout';
import { assertTrayGrid } from '../assets/scripts/game/levelLayout';

assertLevel(LEVEL_44);
assertRedoLayout(LEVEL_44);
assertTrayGrid(44, LEVEL_44.trays.map((t) => t.cap));
const items = LEVEL_44.bags.flat();
const c: Record<string, number> = {};
for (const k of items) c[k] = (c[k] || 0) + 1;
console.log('caps', LEVEL_44.trays.map((t) => t.cap).join(','));
console.log('counts', JSON.stringify(c));

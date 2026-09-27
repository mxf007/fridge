import { selfCheckLevel01 } from '../assets/scripts/game/level_01';
import { selfCheckLevel02 } from '../assets/scripts/game/level_02';
import { selfCheckLevel03 } from '../assets/scripts/game/level_03';
import { selfCheckLevel04 } from '../assets/scripts/game/level_04';
import { selfCheckLevel05 } from '../assets/scripts/game/level_05';
import { selfCheckLevel06 } from '../assets/scripts/game/level_06';
import { selfCheckLevel07 } from '../assets/scripts/game/level_07';
import { selfCheckLevel08 } from '../assets/scripts/game/level_08';
import { selfCheckLevel09 } from '../assets/scripts/game/level_09';
import { selfCheckLevel10 } from '../assets/scripts/game/level_10';
import { selfCheckLevel11 } from '../assets/scripts/game/level_11';
import { selfCheckLevel12 } from '../assets/scripts/game/level_12';
import { selfCheckLevel13 } from '../assets/scripts/game/level_13';
import { selfCheckLevel14 } from '../assets/scripts/game/level_14';
import { selfCheckLevel15 } from '../assets/scripts/game/level_15';
import { selfCheckLevel16 } from '../assets/scripts/game/level_16';
import { selfCheckLevel17 } from '../assets/scripts/game/level_17';
import { selfCheckLevel18 } from '../assets/scripts/game/level_18';
import { selfCheckLevel19 } from '../assets/scripts/game/level_19';
import { selfCheckLevel20 } from '../assets/scripts/game/level_20';
import { selfCheckLevel21 } from '../assets/scripts/game/level_21';
import { selfCheckLevel22 } from '../assets/scripts/game/level_22';
import { selfCheckLevel23 } from '../assets/scripts/game/level_23';
import { selfCheckLevel24 } from '../assets/scripts/game/level_24';
import { selfCheckLevel25 } from '../assets/scripts/game/level_25';
import { selfCheckLevel26 } from '../assets/scripts/game/level_26';
import { selfCheckLevel27 } from '../assets/scripts/game/level_27';
import { selfCheckLevel28 } from '../assets/scripts/game/level_28';
import { selfCheckLevel29 } from '../assets/scripts/game/level_29';
import { selfCheckLevel30 } from '../assets/scripts/game/level_30';
import { selfCheckVisibleInformationAudit } from '../assets/scripts/game/VisibleInformationAudit.test';
import { assertConsecutiveTrayGrids, assertTrayGrid } from '../assets/scripts/game/levelLayout';
import { LEVEL_01 } from '../assets/scripts/game/level_01';
import { LEVEL_02 } from '../assets/scripts/game/level_02';
import { LEVEL_03 } from '../assets/scripts/game/level_03';
import { LEVEL_04 } from '../assets/scripts/game/level_04';
import { LEVEL_05 } from '../assets/scripts/game/level_05';
import { LEVEL_06 } from '../assets/scripts/game/level_06';
import { LEVEL_07 } from '../assets/scripts/game/level_07';
import { LEVEL_08 } from '../assets/scripts/game/level_08';
import { LEVEL_09 } from '../assets/scripts/game/level_09';
import { LEVEL_10 } from '../assets/scripts/game/level_10';
import { LEVEL_11 } from '../assets/scripts/game/level_11';
import { LEVEL_12 } from '../assets/scripts/game/level_12';
import { LEVEL_13 } from '../assets/scripts/game/level_13';
import { LEVEL_14 } from '../assets/scripts/game/level_14';
import { LEVEL_15 } from '../assets/scripts/game/level_15';
import { LEVEL_16 } from '../assets/scripts/game/level_16';
import { LEVEL_17 } from '../assets/scripts/game/level_17';
import { LEVEL_18 } from '../assets/scripts/game/level_18';
import { LEVEL_19 } from '../assets/scripts/game/level_19';
import { LEVEL_20 } from '../assets/scripts/game/level_20';
import { LEVEL_21 } from '../assets/scripts/game/level_21';
import { LEVEL_22 } from '../assets/scripts/game/level_22';
import { LEVEL_23 } from '../assets/scripts/game/level_23';
import { LEVEL_24 } from '../assets/scripts/game/level_24';
import { LEVEL_25 } from '../assets/scripts/game/level_25';
import { LEVEL_26 } from '../assets/scripts/game/level_26';
import { LEVEL_27 } from '../assets/scripts/game/level_27';
import { LEVEL_28 } from '../assets/scripts/game/level_28';
import { LEVEL_29 } from '../assets/scripts/game/level_29';
import { LEVEL_30 } from '../assets/scripts/game/level_30';

const checks = [
    selfCheckLevel01,
    selfCheckLevel02,
    selfCheckLevel03,
    selfCheckLevel04,
    selfCheckLevel05,
    selfCheckLevel06,
    selfCheckLevel07,
    selfCheckLevel08,
    selfCheckLevel09,
    selfCheckLevel10,
    selfCheckLevel11,
    selfCheckLevel12,
    selfCheckLevel13,
    selfCheckLevel14,
    selfCheckLevel15,
    selfCheckLevel16,
    selfCheckLevel17,
    selfCheckLevel18,
    selfCheckLevel19,
    selfCheckLevel20,
    selfCheckLevel21,
    selfCheckLevel22,
    selfCheckLevel23,
    selfCheckLevel24,
    selfCheckLevel25,
    selfCheckLevel26,
    selfCheckLevel27,
    selfCheckLevel28,
    selfCheckLevel29,
    selfCheckLevel30,
    selfCheckVisibleInformationAudit,
];

for (let i = 0; i < checks.length; i++) {
    checks[i]();
}

const trayLevels = [
    LEVEL_01, LEVEL_02, LEVEL_03, LEVEL_04, LEVEL_05, LEVEL_06, LEVEL_07, LEVEL_08, LEVEL_09, LEVEL_10,
    LEVEL_11, LEVEL_12, LEVEL_13, LEVEL_14, LEVEL_15, LEVEL_16, LEVEL_17, LEVEL_18, LEVEL_19, LEVEL_20,
    LEVEL_21, LEVEL_22, LEVEL_23, LEVEL_24, LEVEL_25, LEVEL_26, LEVEL_27, LEVEL_28, LEVEL_29, LEVEL_30,
];
const trayCaps: { id: number; caps: number[] }[] = [];
for (let i = 0; i < trayLevels.length; i++) {
    const level = trayLevels[i];
    const caps: number[] = [];
    for (let t = 0; t < level.trays.length; t++) caps.push(level.trays[t].cap);
    assertTrayGrid(level.id, caps);
    trayCaps.push({ id: level.id, caps });
}
assertConsecutiveTrayGrids(trayCaps);
console.log('L1–L30 selfCheck batch OK');

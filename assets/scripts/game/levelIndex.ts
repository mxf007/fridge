/**
 * 已落地可玩关卡注册表。
 * 新发关：1) import + export LEVEL_XX；2) 在 REGISTERED_LEVELS 末尾追加 LEVEL_XX。
 * 主页/图鉴「我收过的冰箱 n/N」的分母 N = REGISTERED_LEVELS.length，勿改 GameController。
 */
import type { LevelDef } from './types';
import { LEVEL_01 } from './level_01';
import { LEVEL_02 } from './level_02';
import { LEVEL_03 } from './level_03';
import { LEVEL_04 } from './level_04';
import { LEVEL_05 } from './level_05';
import { LEVEL_06 } from './level_06';
import { LEVEL_07 } from './level_07';
import { LEVEL_08 } from './level_08';
import { LEVEL_09 } from './level_09';
import { LEVEL_10 } from './level_10';
import { LEVEL_11 } from './level_11';
import { LEVEL_12 } from './level_12';
import { LEVEL_13 } from './level_13';
import { LEVEL_14 } from './level_14';
import { LEVEL_15 } from './level_15';
import { LEVEL_16 } from './level_16';
import { LEVEL_17 } from './level_17';
import { LEVEL_18 } from './level_18';
import { LEVEL_19 } from './level_19';
import { LEVEL_20 } from './level_20';
import { LEVEL_21 } from './level_21';
import { LEVEL_22 } from './level_22';
import { LEVEL_23 } from './level_23';
import { LEVEL_24 } from './level_24';
import { LEVEL_25 } from './level_25';
import { LEVEL_26 } from './level_26';
import { LEVEL_27 } from './level_27';
import { LEVEL_28 } from './level_28';
import { LEVEL_29 } from './level_29';
import { LEVEL_30 } from './level_30';
import { LEVEL_31 } from './level_31';
import { LEVEL_32 } from './level_32';
import { LEVEL_33 } from './level_33';
import { LEVEL_34 } from './level_34';
import { LEVEL_35 } from './level_35';
import { LEVEL_36 } from './level_36';
import { LEVEL_37 } from './level_37';
import { LEVEL_38 } from './level_38';
import { LEVEL_39 } from './level_39';
import { LEVEL_40 } from './level_40';
import { LEVEL_41 } from './level_41';
import { LEVEL_42 } from './level_42';
import { LEVEL_43 } from './level_43';
import { LEVEL_44 } from './level_44';

export { LEVEL_01 } from './level_01';
export { LEVEL_02 } from './level_02';
export { LEVEL_03 } from './level_03';
export { LEVEL_04 } from './level_04';
export { LEVEL_05 } from './level_05';
export { LEVEL_06 } from './level_06';
export { LEVEL_07 } from './level_07';
export { LEVEL_08 } from './level_08';
export { LEVEL_09 } from './level_09';
export { LEVEL_10 } from './level_10';
export { LEVEL_11 } from './level_11';
export { LEVEL_12 } from './level_12';
export { LEVEL_13 } from './level_13';
export { LEVEL_14 } from './level_14';
export { LEVEL_15 } from './level_15';
export { LEVEL_16 } from './level_16';
export { LEVEL_17 } from './level_17';
export { LEVEL_18 } from './level_18';
export { LEVEL_19 } from './level_19';
export { LEVEL_20 } from './level_20';
export { LEVEL_21 } from './level_21';
export { LEVEL_22 } from './level_22';
export { LEVEL_23 } from './level_23';
export { LEVEL_24 } from './level_24';
export { LEVEL_25 } from './level_25';
export { LEVEL_26 } from './level_26';
export { LEVEL_27 } from './level_27';
export { LEVEL_28 } from './level_28';
export { LEVEL_29 } from './level_29';
export { LEVEL_30 } from './level_30';
export { LEVEL_31 } from './level_31';
export { LEVEL_32 } from './level_32';
export { LEVEL_33 } from './level_33';
export { LEVEL_34 } from './level_34';
export { LEVEL_35 } from './level_35';
export { LEVEL_36 } from './level_36';
export { LEVEL_37 } from './level_37';
export { LEVEL_38 } from './level_38';
export { LEVEL_39 } from './level_39';
export { LEVEL_40 } from './level_40';
export { LEVEL_41 } from './level_41';
export { LEVEL_42 } from './level_42';
export { LEVEL_43 } from './level_43';
export { LEVEL_44 } from './level_44';

/** 图鉴与「开始收拾」可用关列表；长度即 UI 分母。 */
export const REGISTERED_LEVELS: LevelDef[] = [
    LEVEL_01,
    LEVEL_02,
    LEVEL_03,
    LEVEL_04,
    LEVEL_05,
    LEVEL_06,
    LEVEL_07,
    LEVEL_08,
    LEVEL_09,
    LEVEL_10,
    LEVEL_11,
    LEVEL_12,
    LEVEL_13,
    LEVEL_14,
    LEVEL_15,
    LEVEL_16,
    LEVEL_17,
    LEVEL_18,
    LEVEL_19,
    LEVEL_20,
    LEVEL_21,
    LEVEL_22,
    LEVEL_23,
    LEVEL_24,
    LEVEL_25,
    LEVEL_26,
    LEVEL_27,
    LEVEL_28,
    LEVEL_29,
    LEVEL_30,
    LEVEL_31,
    LEVEL_32,
    LEVEL_33,
    LEVEL_34,
    LEVEL_35,
    LEVEL_36,
    LEVEL_37,
    LEVEL_38,
    LEVEL_39,
    LEVEL_40,
    LEVEL_41,
    LEVEL_42,
    LEVEL_43,
    LEVEL_44,
];

for (let i = 0; i < REGISTERED_LEVELS.length; i++) {
    const want = i + 1;
    const got = REGISTERED_LEVELS[i].id;
    if (got !== want) {
        throw new Error(`levelIndex REGISTERED_LEVELS[${i}] id=${got}, expected ${want}`);
    }
}

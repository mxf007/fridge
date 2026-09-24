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

const checks = [
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
];

for (let i = 0; i < checks.length; i++) {
    checks[i]();
}
console.log('L19–L30 selfCheck batch OK');

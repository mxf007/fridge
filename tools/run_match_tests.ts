import { selfCheckMatchBoardState } from '../assets/scripts/match/MatchBoardState.test';
import { selfCheckMatchLevelRules } from '../assets/scripts/match/MatchLevelRules.test';
import { selfCheckMatchLevels } from '../assets/scripts/match/MatchLevels';
import { selfCheckMatchSave } from '../assets/scripts/match/MatchSave.test';

selfCheckMatchBoardState();
selfCheckMatchSave();
console.log('match save tests passed');
const startedAt = Date.now();
selfCheckMatchLevelRules();
selfCheckMatchLevels();
const elapsed = Date.now() - startedAt;
console.log('match board state tests passed');
console.log(`match levels self-check passed (${elapsed}ms)`);

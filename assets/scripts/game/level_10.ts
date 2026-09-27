import { BoardState } from './BoardState';
import { assertRedoLayout, playScript } from './levelLayout';
import { assertLevel } from './types';
import type { LevelDef } from './types';

/** 第 10 关：冰箱能收就直接放。锁进错误容量会锁死。只有所有冰箱格都收不了时，才必须放柜台。 */
export const LEVEL_10: LevelDef = {
    id: 10,
    title: '冰箱能收就放冰箱',
    teach: '两件的放进两件格。冰箱能收就直接收',
    trays: [{ cap: 4 }, { cap: 2 }, { cap: 2 }],
    bags: [
        ['milk', 'fruit'],
        ['milk', 'fruit'],
        ['milk', 'veg'],
        ['milk', 'veg'],
    ],
    buffer: 3,
    loseable: true,
};

export function selfCheckLevel10(): void {
    assertLevel(LEVEL_10);
    assertRedoLayout(LEVEL_10);
    const opened = BoardState.fromLevel(LEVEL_10);
    const first = opened.placeFromBag(0);
    if (!first.ok) throw new Error(`L10 fridge must take the top, got ${first.reason}`);
    if (opened.steps !== 1) throw new Error('L10 place must count a step');

    const winScript = [
        { tray: 1, bag: 0 },
        { tray: 1, bag: 1 },
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 2, bag: 2 },
        { tray: 0, bag: 2 },
        { tray: 2, bag: 3 },
        { tray: 0, bag: 3 },
    ];
    const play = BoardState.fromLevel(LEVEL_10);
    const peak = playScript(play, winScript, 'L10');
    if (!play.isWin() || play.steps !== winScript.length) throw new Error(`L10 win steps ${play.steps}`);
    if (peak !== 0) throw new Error(`L10 should not need the counter, peak ${peak}`);

    const wasteScript = [
        { tray: 0, bag: 0 },
        { tray: 0, bag: 1 },
        { tray: 1, bag: 2 },
        { tray: 1, bag: 3 },
    ];
    const fail = BoardState.fromLevel(LEVEL_10);
    playScript(fail, wasteScript, 'L10 waste');
    if (fail.isWin() || fail.failReason() !== 'locked_out') throw new Error(`L10 waste ${fail.failReason()}`);
    if (LEVEL_10.loseable !== true) throw new Error('L10 loseable');

    const stuck = BoardState.fromLevel({
        id: 10,
        title: 'stuck',
        teach: '',
        trays: [{ cap: 2 }, { cap: 2 }],
        bags: [['milk', 'milk', 'veg'], ['fruit', 'fruit']],
        buffer: 3,
        loseable: true,
    });
    stuck.selectTray(0);
    if (!stuck.placeFromBag(0).ok) throw new Error('L10 veg must enter an empty tray');
    stuck.selectTray(1);
    if (!stuck.placeFromBag(0).ok || !stuck.placeFromBag(0).ok) throw new Error('L10 milk must enter its tray');
    stuck.selectTray(0);
    const nowhere = stuck.placeFromBag(1);
    if (nowhere.ok || nowhere.reason !== 'need_buffer') throw new Error(`L10 stuck top must need counter, got ${nowhere.reason}`);
    if (nowhere.hintBuffers.indexOf(0) < 0) throw new Error('L10 stuck top must hint the counter');
    if (stuck.steps !== 3) throw new Error('L10 rejected place must not count a step');
}

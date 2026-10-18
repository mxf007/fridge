import {
    _decorator,
    assetManager,
    BlockInputEvents,
    Color,
    Component,
    EventTouch,
    Graphics,
    instantiate,
    Label,
    Layers,
    Node,
    Prefab,
    resources,
    Sprite,
    SpriteFrame,
    sys,
    tween,
    Tween,
    UIOpacity,
    UITransform,
    Vec3,
} from 'cc';
import {
    playBtnClick,
    playMatchFail,
    playMatchHint,
    playMatchPair,
    playSfx,
} from '../game/Sfx';
import type { FoodId } from '../game/types';
import { visibleDesignSize } from '../game/visibleDesignSize';
import { MatchBoardState } from './MatchBoardState';
import { MATCH_LEVEL_IDS, MATCH_LEVELS, matchLevelById, nextMatchLevelId } from './MatchLevels';
import { setMatchGmReloadHandler } from './MatchGm';
import { pullCloudProgress, pushCloudProgress } from '../game/CloudSave';
import {
    allowsDeadlockReshuffle,
    freeReshufflesBudgetForLevel,
    hintsBudgetForLevel,
    isFixedLayoutLevel,
    isNoHintsLevel,
    matchStepLimitForLevel,
    milestoneBadgeIdForLevel,
    milestoneBadgeTitle,
    shouldAutoOrganizeOnEnter,
    winSubtitleForLevel,
} from './MatchLevelRules';
import {
    clearMatchLevelSnapshot,
    markMatchLevelClearedWithBadge,
    readMatchLevelSnapshot,
    readMatchProgress,
    setCurrentMatchLevel,
    writeMatchLevelSnapshot,
    type MatchProgress,
} from './MatchSave';
import { isMatchFood, isMatchIce } from './MatchCells';
import { findAllLinks } from './MatchSolver';
import type {
    MatchGrid,
    MatchPath,
    MatchPoint,
    MatchSelectResult,
    MatchTileMove,
} from './MatchTypes';

const { ccclass } = _decorator;
const UI_2D = Layers.Enum.UI_2D;
const DESIGN_W = 720;
const DESIGN_H = 1280;
/** 棋盘最多 8 列 × 12 行。背景框按实际行列收紧，可用区域按这个上限排。 */
const MAX_BOARD_COLUMNS = 8;
const MAX_BOARD_ROWS = 12;
const BOARD_PAD = 16;
const ICON_HOME_UUID = 'c9f5b2d3-4e5f-6a7b-8c9d-0e1f2a3b4c5d@f9941';
const REPLAY_BTN_UUID = 'a8c31e70-5b24-4d9a-8f16-2c7b0e4d91aa@f9941';
const HUD_ROW_EXTENT_BELOW = 44;
const HUD_BTN_SIZE = 88;
const HUD_BTN_X = 304;
const MATCH_HUD_CLEAR_ABOVE_BOARD = 72;
/** 棋盘比可用高度矮时，把空出的高度按这个比例下移。满高时不动。 */
const BOARD_SHORT_DROP_RATIO = 0.4;
/** 矮棋盘时标题组最多下移的距离，避免贴到棋盘。 */
const HEADER_MAX_DROP = 96;
/** 标题组底边到关卡名中心的距离（按钮和收拢说明都在名牌下面）。 */
const HEADER_EXTENT_BELOW = 112;
/** 与大果盘 TaglinePlate 同款底条（略加宽以容纳规则文案）。 */
const RULE_PLATE_W = 560;
const RULE_PLATE_H = 42;
const RULE_PLATE_RADIUS = 21;
const RULE_PLATE_FILL = new Color(255, 253, 248, 214);
const RULE_PLATE_STROKE = new Color(176, 130, 96, 90);
const LEVEL_PILL_W = 252;
const LEVEL_PILL_H = 72;
const LEVEL_LABEL_FONT = 36;
const LEVEL_LABEL_LINE = 46;
const CREAM = new Color(246, 239, 230, 255);
const MILK = new Color(255, 253, 248, 255);
const WALNUT = new Color(107, 74, 58, 255);
const FRAME = new Color(176, 130, 96, 255);
const SAGE = new Color(122, 158, 126, 255);
const CORAL = new Color(224, 122, 95, 255);
const FRIDGE_GLOW = new Color(232, 243, 246, 255);
const ICE_FILL = new Color(186, 228, 248, 255);
const ICE_STROKE = new Color(120, 178, 210, 255);
const SELECT_BLUE = new Color(70, 110, 220, 255);
const PATH_LINE_FILL = new Color(122, 158, 126, 235);
const PATH_LINE_STROKE = new Color(107, 74, 58, 210);
const HINT_BTN_W = 220;
const HINT_BTN_H = 78;
const HINT_BTN_FILL = new Color(122, 158, 126, 255);
const HINT_BTN_FILL_OFF = new Color(176, 130, 96, 120);
const HINT_BTN_STROKE = new Color(90, 130, 94, 255);
const SHUFFLE_BTN_FILL = new Color(224, 122, 95, 255);
const SHUFFLE_BTN_STROKE = new Color(184, 90, 66, 255);
const FOOTER_BTN_GAP = 24;
const RULE_PLATE_TEXT = '点击两个食材，连线不超过两次转弯';
const UNLIMITED_HINTS_DISPLAY = '∞';
/** 对齐 quchubaitu_xyx_game 动画时长。 */
const ANI_TILE_ELIMINATE = 0.2;
const ANI_TILE_MOVE = 0.2;
const ANI_SHUFFLE_IN = 0.28;
const ANI_SHUFFLE_OUT = 0.34;
const ANI_BUBBLE = 0.55;
/** 气泡照常播完再淡掉。收拢不等它结束，发出这么久就开始。 */
const ANI_COLLAPSE_DELAY = 0.2;
const ANI_BUBBLE_COUNT = 12;
const ANI_SELECT_PULSE = 0.5;
/** fx/hand_point.png。指尖在原图左下，不旋转，按指尖对准格子。 */
const HAND_POINT_UUID = 'e1c12f55-9340-4b85-ae10-2091d7f20051@f9941';
const HAND_POINT_SRC_W = 129;
const HAND_POINT_SRC_H = 153;
const HAND_TIP_SRC_X = 16;
const HAND_TIP_SRC_Y = 128;
const GUIDE_HAND_W = 86;
const GUIDE_HAND_H = Math.round(GUIDE_HAND_W * HAND_POINT_SRC_H / HAND_POINT_SRC_W);

const FOOD_UUID: Partial<Record<FoodId, string>> = {
    milk: '518eca01-d30f-4b58-8867-0cc149828d77@f9941',
    veg: 'daae9542-5e08-4113-b2ab-f4f41c5837c6@f9941',
    fruit: '87f8396a-b237-44ee-bfcf-6856a22a2794@f9941',
    meat: '948637a0-ae61-4105-bbf7-ddf5988257e2@f9941',
    sauce: 'cc9a1cd4-86d6-4590-bf78-e264c01e8c06@f9941',
    grape: '7c4e1a90-2b3d-4f5a-9c8e-1d2f3a4b5c6d@f9941',
    lemon: '8d5f2b01-3c4e-406b-ad9f-2e3a4b5c6d7e@f9941',
    kiwi: '9e603c12-4d5f-417c-bea0-3f4b5c6d7e8f@f9941',
    leftover: '733073be-ff4d-475f-81a8-a047dc179820@f9941',
    pineapple: 'af714d23-5e60-428d-cfb1-405c6d7e8f90@f9941',
    watermelon: 'c1936f45-7082-44af-e1d3-627e8f901a2b@f9941',
    coconut: 'b0825e34-6f71-439e-d0c2-516d7e8f901a@f9941',
};

const FOOD_FALLBACK: Partial<Record<FoodId, Color>> = {
    milk: new Color(239, 247, 249, 255),
    veg: new Color(122, 158, 126, 255),
    fruit: new Color(224, 122, 95, 255),
    meat: new Color(224, 150, 92, 255),
    sauce: new Color(137, 91, 64, 255),
    grape: new Color(139, 91, 164, 255),
    lemon: new Color(235, 199, 75, 255),
    kiwi: new Color(126, 145, 83, 255),
    leftover: new Color(176, 158, 172, 255),
    pineapple: new Color(222, 190, 104, 255),
    watermelon: new Color(214, 136, 142, 255),
    coconut: new Color(232, 216, 188, 255),
};

/** 牛奶占位色接近盘面奶油底，气泡要单独加深才看得见。 */
const MILK_BURST = new Color(88, 164, 204, 255);

function burstTint(food: FoodId | null): Color {
    if (food === 'milk') return MILK_BURST;
    return (food && FOOD_FALLBACK[food]) || SAGE;
}

const DIRECTION_TEXT = {
    left: '本层向左收拢  ←',
    right: '本层向右收拢  →',
    up: '本层向上收拢  ↑',
    down: '本层向下收拢  ↓',
};

function pointKey(point: MatchPoint): string {
    return `${point.row}:${point.column}`;
}

function cloneGrid(grid: MatchGrid): MatchGrid {
    return grid.map((row) => row.slice());
}

/** 用真实可见边长。画布和窗口不一致时取较小的一边，避免按 1280 排版后顶栏底栏被裁掉。 */
function viewportSpan(parent: number, visible: number, design: number): number {
    if (parent > 0 && visible > 0) return Math.min(parent, visible);
    return parent || visible || design;
}

@ccclass('MatchGameController')
export class MatchGameController extends Component {
    private boardState: MatchBoardState | null = null;
    private boardNode: Node | null = null;
    private tileLayer: Node | null = null;
    private effectLayer: Node | null = null;
    private lineSegmentLayer: Node | null = null;
    private lineGraphics: Graphics | null = null;
    private pathLineNodes: Node[] = [];
    private hintPulseTweens: Tween<Node>[] = [];
    private tileNodes = new Map<string, Node>();
    /** 收拢后节点会移动，点击必须读当前格坐标，不能闭包捕获旧 point。 */
    private tileTapPoint = new WeakMap<Node, MatchPoint>();
    private foodSpawnStep: (() => void) | null = null;
    private foodFrames = new Map<FoodId, SpriteFrame>();
    private closeCallback: (() => void) | null = null;
    private busy = false;
    private roundToken = 0;
    private screenW = DESIGN_W;
    private screenH = DESIGN_H;
    private backgroundSprite: Sprite | null = null;
    private backgroundFrame: SpriteFrame | null = null;
    private homeBtnSprite: Sprite | null = null;
    private replayBtnSprite: Sprite | null = null;
    private homeIconFrame: SpriteFrame | null = null;
    private replayIconFrame: SpriteFrame | null = null;
    private titleNode: Node | null = null;
    private stepCounterNode: Node | null = null;
    private directionNode: Node | null = null;
    private ruleNode: Node | null = null;
    private backNode: Node | null = null;
    private restartNode: Node | null = null;
    private footerNode: Node | null = null;
    private hintBtnNode: Node | null = null;
    private shuffleBtnNode: Node | null = null;
    private hintsRemaining = 0;
    private hintsBudget = 0;
    private hintsUsedThisRound = 0;
    /** null = 不限次数整理。 */
    private freeReshufflesRemaining: number | null = null;
    private freeReshufflesUsedThisRound = 0;
    private deadlockLayer: Node | null = null;
    private hintToken = 0;
    private currentLevelId = 1;
    private levelGuideRoot: Node | null = null;
    private levelGuideHand: Node | null = null;
    private handPointFrame: SpriteFrame | null = null;
    /** 本局已经配成一对后收起。重开第 1 关会再出现。 */
    private levelGuideDismissed = false;
    /** 胜利后不再把空盘写回本机。 */
    private levelSnapshotCleared = false;
    /** 这次是从本机缓存恢复的，云端进度不能把这一盘换掉。 */
    private holdingLevelSnapshot = false;
    private roundResume: 'play' | 'deadlock' | 'step_limit' | null = null;
    private levelGuideKey = '';
    private tileSize = 112;
    private tilePitch = 128;
    private boardWidth = 560;
    private boardHeight = 560;
    private boardCenterY = 34;
    private hudRowY = 0;
    private ruleCenterY = -354;
    private footerCenterY = -450;
    private builtLevelId = 0;
    private progress: MatchProgress | null = null;

    open(onClose: () => void, levelId?: number): void {
        this.closeCallback = onClose;
        setMatchGmReloadHandler(() => {
            if (!this.node?.isValid) return;
            this.bootstrapProgress();
        });
        this.loadFoodFrames();
        this.loadBackground();
        this.loadHudIcons();
        this.loadHandPoint();
        resources.load('match/MatchHud', Prefab, (error, prefab) => {
            if (!this.node?.isValid) return;
            if (error || !prefab) {
                if (error) console.warn('[match] load MatchHud failed', error);
                return;
            }
            this.applyHudPrefab(prefab);
        });
        const pull = pullCloudProgress(sys.localStorage);
        this.bootstrapProgress(levelId);
        void pull.then((changed) => {
            if (!changed || !this.node?.isValid) return;
            if (this.holdingLevelSnapshot || (this.boardState && this.boardState.matches > 0)) {
                if (this.progress) {
                    this.progress = setCurrentMatchLevel(
                        sys.localStorage,
                        this.progress,
                        this.currentLevelId,
                        MATCH_LEVEL_IDS,
                    );
                    this.syncMatchProgressCloud();
                }
                return;
            }
            const progress = readMatchProgress(sys.localStorage, MATCH_LEVEL_IDS);
            const requested = levelId != null ? matchLevelById(levelId) : null;
            const nextId = (
                requested
                && requested.id <= progress.unlockedLevelId
            )
                ? requested.id
                : progress.currentLevelId;
            if (nextId === this.currentLevelId) return;
            this.bootstrapProgress(levelId);
        });
    }

    private bootstrapProgress(levelId?: number): void {
        this.progress = readMatchProgress(sys.localStorage, MATCH_LEVEL_IDS);
        const requested = levelId != null ? matchLevelById(levelId) : null;
        this.currentLevelId = (
            requested
            && requested.id <= this.progress.unlockedLevelId
        )
            ? requested.id
            : this.progress.currentLevelId;
        this.startRound();
    }

    private syncMatchProgressCloud(): void {
        void pushCloudProgress(sys.localStorage);
    }

    onDestroy(): void {
        setMatchGmReloadHandler(null);
        this.roundToken += 1;
        this.unscheduleAllCallbacks();
        this.node.off(Node.EventType.TOUCH_START);
        this.tileNodes.clear();
        this.stopHintPulse();
    }

    private startRound(fresh = false): void {
        this.roundToken += 1;
        this.hintToken += 1;
        this.cancelFoodSpawn();
        this.stopHintPulse();
        this.busy = false;
        this.deadlockLayer = null;
        const level = matchLevelById(this.currentLevelId) || MATCH_LEVELS[0];
        this.currentLevelId = level.id;
        if (this.progress) {
            this.progress = setCurrentMatchLevel(
                sys.localStorage,
                this.progress,
                level.id,
                MATCH_LEVEL_IDS,
            );
            this.syncMatchProgressCloud();
        }
        this.levelSnapshotCleared = false;
        this.levelGuideKey = '';
        if (fresh) clearMatchLevelSnapshot(sys.localStorage, level.id);
        const snapshot = fresh ? null : readMatchLevelSnapshot(sys.localStorage, level);
        this.hintsBudget = hintsBudgetForLevel(level);
        const shuffleBudget = freeReshufflesBudgetForLevel(level);
        if (snapshot) {
            this.boardState = MatchBoardState.resume(level, snapshot.grid, snapshot.matches, snapshot.shuffles);
            this.hintsRemaining = Math.min(this.hintsBudget, snapshot.hintsRemaining);
            this.hintsUsedThisRound = snapshot.hintsUsed;
            this.freeReshufflesRemaining = shuffleBudget == null
                ? snapshot.reshufflesRemaining
                : Math.min(shuffleBudget, snapshot.reshufflesRemaining ?? shuffleBudget);
            this.freeReshufflesUsedThisRound = snapshot.reshufflesUsed;
            this.roundResume = snapshot.outcome;
            this.holdingLevelSnapshot = true;
            this.levelGuideDismissed = snapshot.matches > 0;
        } else {
            this.boardState = MatchBoardState.fromLevel({ ...level, layout: cloneGrid(level.layout) });
            this.hintsRemaining = this.hintsBudget;
            this.hintsUsedThisRound = 0;
            this.freeReshufflesRemaining = shuffleBudget;
            this.freeReshufflesUsedThisRound = 0;
            this.roundResume = null;
            this.holdingLevelSnapshot = false;
            this.levelGuideDismissed = false;
        }
        this.measureTileMetrics(level.rows, level.columns);
        if (this.boardNode?.isValid && this.tileLayer?.isValid && this.builtLevelId === level.id) {
            this.clearRoundChrome();
            this.refreshHintButton();
            this.refreshShuffleButton();
            this.autoOrganizeOnEnter();
        } else {
            this.node.removeAllChildren();
            this.tileNodes.clear();
            this.buildView();
            this.builtLevelId = level.id;
            this.autoOrganizeOnEnter();
        }
        this.presentResumedRound();
        this.refreshStepCounter();
    }

    /** 同关重开时留下背景框，只清掉结算层和食材。 */
    private clearRoundChrome(): void {
        const names = ['DeadlockLayer', 'StepLimitLayer', 'WinShade', 'WinCard'];
        for (let i = 0; i < names.length; i++) {
            const overlay = this.node.getChildByName(names[i]);
            if (overlay?.isValid) overlay.destroy();
        }
        this.deadlockLayer = null;
        this.clearPathVisual();
        this.cancelFoodSpawn();
        if (this.tileLayer?.isValid) {
            const oldNodes = this.tileLayer.children.slice();
            this.tileLayer.removeAllChildren();
            for (let i = 0; i < oldNodes.length; i++) oldNodes[i].destroy();
        }
        this.tileNodes.clear();
    }

    private buildView(): void {
        this.measureScreen();
        this.node.layer = UI_2D;
        this.node.getComponent(UITransform)?.setContentSize(this.screenW, this.screenH);
        if (!this.node.getComponent(BlockInputEvents)) this.node.addComponent(BlockInputEvents);

        const cover = this.coverSize();
        const background = new Node('Background');
        background.layer = UI_2D;
        background.addComponent(UITransform).setContentSize(cover.width, cover.height);
        const backgroundSprite = background.addComponent(Sprite);
        backgroundSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        backgroundSprite.color = Color.WHITE;
        backgroundSprite.spriteFrame = this.backgroundFrame;
        this.backgroundSprite = backgroundSprite;
        const bgFallback = new Node('Fallback');
        bgFallback.layer = UI_2D;
        bgFallback.addComponent(UITransform).setContentSize(cover.width, cover.height);
        const bgGraphics = bgFallback.addComponent(Graphics);
        bgGraphics.fillColor = CREAM;
        bgGraphics.rect(-cover.width / 2, -cover.height / 2, cover.width, cover.height);
        bgGraphics.fill();
        background.addChild(bgFallback);
        this.node.addChild(background);

        const level = this.boardState?.level || MATCH_LEVELS[0];
        this.titleNode = this.makeLevelPill(level.id);
        this.node.addChild(this.titleNode);
        this.directionNode = this.addLabel(
            this.node,
            'Direction',
            DIRECTION_TEXT[level.collapse],
            26,
            Color.BLACK,
            360,
            46,
            0,
            474,
        );
        this.stepCounterNode = null;
        if (matchStepLimitForLevel(level) != null) {
            this.stepCounterNode = this.addLabel(
                this.node,
                'StepCounter',
                this.stepCounterText(),
                22,
                WALNUT,
                200,
                36,
                0,
                430,
            );
        }
        this.ruleNode = this.roundRectNode(
            'Rule',
            RULE_PLATE_W,
            RULE_PLATE_H,
            RULE_PLATE_FILL,
            RULE_PLATE_RADIUS,
            RULE_PLATE_STROKE,
            2,
        );
        this.ruleNode.setPosition(0, this.ruleCenterY, 0);
        this.node.addChild(this.ruleNode);
        this.addLabel(
            this.ruleNode,
            'Label',
            RULE_PLATE_TEXT,
            22,
            Color.BLACK,
            RULE_PLATE_W - 36,
            32,
            0,
            0,
        );

        const footer = new Node('FooterActions');
        footer.layer = UI_2D;
        footer.setPosition(0, this.footerCenterY, 0);
        footer.addComponent(UITransform).setContentSize(520, 88);
        this.node.addChild(footer);
        this.footerNode = footer;
        const hint = this.makeHintButton(footer, 'BtnHint', this.hintButtonText(), 0, 0);
        this.hintBtnNode = hint;
        this.bindTap(hint, () => this.showHint());
        const shuffle = this.makeShuffleButton(footer, 'BtnShuffle', this.shuffleButtonText(), 0, 0);
        this.shuffleBtnNode = shuffle;
        this.bindTap(shuffle, () => this.reshuffleBoard());
        hint.active = !isNoHintsLevel(level);
        this.footerNode.active = true;
        this.refreshHintButton();

        const back = this.makeHudIconButton('BtnBack');
        this.bindHudPress(back, () => this.close());
        this.homeBtnSprite = back.getChildByName('Icon')?.getComponent(Sprite) ?? null;
        this.backNode = back;
        this.node.addChild(back);

        const restart = this.makeHudIconButton('BtnRestart');
        this.bindHudPress(restart, () => this.startRound(true));
        this.replayBtnSprite = restart.getChildByName('Icon')?.getComponent(Sprite) ?? null;
        this.restartNode = restart;
        this.node.addChild(restart);

        const board = new Node('MatchBoard');
        board.layer = UI_2D;
        board.setPosition(0, this.boardCenterY, 0);
        board.addComponent(UITransform).setContentSize(this.boardWidth, this.boardHeight);
        this.node.addChild(board);
        this.boardNode = board;

        const boardRadius = Math.min(34, Math.floor(Math.min(this.boardWidth, this.boardHeight) / 6));
        const boardBg = this.rectNode(
            'BoardBg',
            this.boardWidth,
            this.boardHeight,
            FRIDGE_GLOW,
            boardRadius,
            FRAME,
            12,
        );
        board.addChild(boardBg);

        const slotLayer = new Node('SlotLayer');
        slotLayer.layer = UI_2D;
        slotLayer.addComponent(UITransform).setContentSize(this.boardWidth, this.boardHeight);
        const slots = slotLayer.addComponent(Graphics);
        const slotRadius = Math.max(12, this.tileSize * 0.2);
        const slotHalf = this.tileSize / 2;
        slots.fillColor = new Color(255, 255, 255, 118);
        slots.strokeColor = new Color(176, 130, 96, 85);
        slots.lineWidth = 2;
        for (let pass = 0; pass < 2; pass++) {
            for (let row = 0; row < level.rows; row++) {
                for (let column = 0; column < level.columns; column++) {
                    const at = this.pointPosition({ row, column });
                    slots.roundRect(at.x - slotHalf, at.y - slotHalf, this.tileSize, this.tileSize, slotRadius);
                }
            }
            if (pass === 0) slots.fill();
            else slots.stroke();
        }
        board.addChild(slotLayer);

        const lineLayer = new Node('LineLayer');
        lineLayer.layer = UI_2D;
        lineLayer.addComponent(UITransform).setContentSize(this.boardWidth, this.boardHeight);
        this.lineGraphics = lineLayer.addComponent(Graphics);
        board.addChild(lineLayer);

        const lineSegmentLayer = new Node('LineSegments');
        lineSegmentLayer.layer = UI_2D;
        lineSegmentLayer.addComponent(UITransform).setContentSize(this.boardWidth, this.boardHeight);
        board.addChild(lineSegmentLayer);
        this.lineSegmentLayer = lineSegmentLayer;

        const tileLayer = new Node('TileLayer');
        tileLayer.layer = UI_2D;
        tileLayer.addComponent(UITransform).setContentSize(this.boardWidth, this.boardHeight);
        board.addChild(tileLayer);
        this.tileLayer = tileLayer;

        const effectLayer = new Node('EffectLayer');
        effectLayer.layer = UI_2D;
        effectLayer.addComponent(UITransform).setContentSize(this.boardWidth, this.boardHeight);
        board.addChild(effectLayer);
        this.effectLayer = effectLayer;

        this.layoutSafeHeader();
        this.layoutFooterActions();
        this.bringChromeToFront();
        this.refreshHintButton();
        this.applyHudIconFrames();
        this.applyPlayBackground();
    }

    private renderTiles(animateSpawn = false): void {
        if (!this.boardState || !this.tileLayer) return;
        this.cancelFoodSpawn();
        const grid = this.boardState.grid;
        const foods: { tile: FoodId; point: MatchPoint }[] = [];
        for (let row = 0; row < grid.length; row++) {
            for (let column = 0; column < grid[row].length; column++) {
                const tile = grid[row][column];
                const point = { row, column };
                if (isMatchIce(tile)) {
                    this.tileLayer.addChild(this.makeIceCell(point));
                    continue;
                }
                if (!isMatchFood(tile)) continue;
                foods.push({ tile, point });
            }
        }
        if (!animateSpawn) {
            for (let i = 0; i < foods.length; i++) {
                this.attachTile(foods[i].tile, foods[i].point);
            }
            this.refreshSelection();
            return;
        }
        const token = this.roundToken;
        const batch = 4;
        let index = 0;
        this.busy = true;
        this.refreshHintButton();
        const step = () => {
            if (token !== this.roundToken || !this.tileLayer?.isValid) {
                this.foodSpawnStep = null;
                return;
            }
            const end = Math.min(foods.length, index + batch);
            for (; index < end; index++) {
                const item = foods[index];
                const node = this.attachTile(item.tile, item.point);
                this.playFoodFloat(node, item.point, index);
            }
            if (index < foods.length) {
                const next = () => step();
                this.foodSpawnStep = next;
                this.scheduleOnce(next, 0.016);
                return;
            }
            this.finishFoodSpawn(token);
        };
        this.foodSpawnStep = step;
        step();
    }

    private attachTile(tile: FoodId, point: MatchPoint): Node {
        const node = this.makeTile(tile, point);
        this.tileLayer?.addChild(node);
        this.tileNodes.set(pointKey(point), node);
        return node;
    }

    private cancelFoodSpawn(): void {
        if (!this.foodSpawnStep) return;
        this.unschedule(this.foodSpawnStep);
        this.foodSpawnStep = null;
    }

    private finishFoodSpawn(token: number): void {
        this.foodSpawnStep = null;
        if (token !== this.roundToken || !this.node.isValid) return;
        if (this.boardState?.status === 'running') this.busy = false;
        this.refreshSelection();
        this.refreshHintButton();
    }

    /** 进关时食材分批从格子上方飘入，避免一帧画完整盘。 */
    private playFoodFloat(node: Node, point: MatchPoint, order: number): void {
        const target = this.pointPosition(point);
        const sway = (order % 2 === 0 ? -1 : 1) * this.tileSize * 0.1;
        node.setPosition(target.x + sway, target.y + this.tileSize * 0.42, 0);
        node.setScale(0.94, 0.94, 1);
        const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
        opacity.opacity = 0;
        tween(node)
            .delay((order % 4) * 0.02)
            .to(0.26, { position: target, scale: Vec3.ONE }, { easing: 'sineOut' })
            .start();
        tween(opacity)
            .delay((order % 4) * 0.02)
            .to(0.14, { opacity: 255 })
            .start();
    }

    private measureScreen(): void {
        const parentSize = this.node.parent?.getComponent(UITransform);
        const visible = visibleDesignSize();
        this.screenW = viewportSpan(parentSize?.width || 0, visible.width || 0, DESIGN_W);
        this.screenH = viewportSpan(parentSize?.height || 0, visible.height || 0, DESIGN_H);
    }

    private measureTileMetrics(rows: number, columns: number): void {
        this.measureScreen();
        const top = this.screenH / 2;
        const bottom = -top;
        const inset = this.topInset();
        const maxHudY = top - inset - 8 - LEVEL_PILL_H / 2;
        const boardTop = maxHudY - MATCH_HUD_CLEAR_ABOVE_BOARD - HUD_ROW_EXTENT_BELOW;
        const footerHalf = 44;
        const footerGap = 16;
        const ruleGap = 20;
        const safeFooterY = bottom + 28 + footerHalf;
        const safeRuleY = safeFooterY + footerHalf + footerGap + RULE_PLATE_H / 2;
        const boardBottomLimit = safeRuleY + RULE_PLATE_H / 2 + ruleGap;
        const availH = Math.max(280, boardTop - boardBottomLimit);
        const availW = Math.max(280, Math.min(this.screenW - 48, 680));
        const sizeRows = Math.max(1, rows);
        const sizeColumns = Math.max(1, columns);
        const largest = Math.min(
            Math.max(sizeRows, sizeColumns),
            Math.max(MAX_BOARD_ROWS, MAX_BOARD_COLUMNS),
        );
        const gap = largest >= 12 ? 6 : largest >= 8 ? 8 : largest >= 6 ? 10 : 16;
        const innerW = availW - BOARD_PAD * 2;
        const innerH = availH - BOARD_PAD * 2;
        const byWidth = Math.floor((innerW - gap * (sizeColumns - 1)) / sizeColumns);
        const byHeight = Math.floor((innerH - gap * (sizeRows - 1)) / sizeRows);
        this.tileSize = Math.max(32, Math.min(112, byWidth, byHeight));
        this.tilePitch = this.tileSize + gap;
        const span = (count: number) => count * this.tileSize + Math.max(0, count - 1) * gap + BOARD_PAD * 2;
        this.boardWidth = span(sizeColumns);
        this.boardHeight = span(sizeRows);
        const slack = Math.max(0, boardTop - boardBottomLimit - this.boardHeight);
        const drop = slack * BOARD_SHORT_DROP_RATIO;
        this.boardCenterY = boardTop - drop - this.boardHeight / 2;
        const boardBottom = this.boardCenterY - this.boardHeight / 2;
        const belowBoard = ruleGap + 36;
        this.ruleCenterY = boardBottom - belowBoard - RULE_PLATE_H / 2;
        const footerNatural = this.ruleCenterY - RULE_PLATE_H / 2 - footerGap - footerHalf;
        if (footerNatural < safeFooterY) {
            this.footerCenterY = safeFooterY;
            this.ruleCenterY = safeRuleY;
        } else {
            this.footerCenterY = Math.max(safeFooterY, footerNatural - 30);
        }
        const boardTopActual = this.boardCenterY + this.boardHeight / 2;
        const headerBottom = maxHudY - HEADER_EXTENT_BELOW;
        const headerGap = headerBottom - boardTopActual;
        const extra = Math.max(0, headerGap - 24);
        const headerDrop = Math.min(HEADER_MAX_DROP, extra * 0.45);
        this.hudRowY = maxHudY - headerDrop;
    }

    private coverSize(): { width: number; height: number } {
        const scale = Math.max(this.screenW / DESIGN_W, this.screenH / DESIGN_H);
        return { width: DESIGN_W * scale, height: DESIGN_H * scale };
    }

    /** 微信状态栏与右上角胶囊下缘换算到设计坐标。 */
    private topInset(): number {
        const wxApi = (globalThis as {
            wx?: {
                getWindowInfo?: () => {
                    windowWidth?: number;
                    screenWidth?: number;
                    statusBarHeight?: number;
                    safeArea?: { top?: number };
                };
                getSystemInfoSync?: () => {
                    windowWidth?: number;
                    screenWidth?: number;
                    statusBarHeight?: number;
                    safeArea?: { top?: number };
                };
                getMenuButtonBoundingClientRect?: () => { bottom?: number };
            };
        }).wx;
        if (!wxApi) return 0;
        try {
            const info = wxApi.getWindowInfo ? wxApi.getWindowInfo() : wxApi.getSystemInfoSync?.();
            const windowWidth = info && (info.windowWidth || info.screenWidth);
            const scale = windowWidth ? this.screenW / windowWidth : 1;
            let top = info?.safeArea?.top ?? info?.statusBarHeight ?? 0;
            const menu = wxApi.getMenuButtonBoundingClientRect?.();
            if (menu?.bottom) top = Math.max(top, menu.bottom);
            return Math.max(0, Math.round(top * scale));
        } catch {
            return 0;
        }
    }

    /** 关卡名、返回、重开和收拢说明。矮棋盘时下移，但不超过 HEADER_MAX_DROP。 */
    private hudY(): number {
        if (this.hudRowY !== 0) return this.hudRowY;
        const top = this.screenH / 2;
        const inset = this.topInset();
        const pillHalf = LEVEL_PILL_H / 2;
        return top - inset - 8 - pillHalf;
    }

    private layoutSafeHeader(): void {
        const hudRow = this.hudY();
        this.titleNode?.setPosition(0, hudRow, 0);
        const actionY = hudRow - 64;
        this.directionNode?.setPosition(0, actionY - 22, 0);
        this.backNode?.setPosition(-HUD_BTN_X, actionY, 0);
        this.restartNode?.setPosition(HUD_BTN_X, actionY, 0);
        this.backNode?.getComponent(UITransform)?.setContentSize(HUD_BTN_SIZE, HUD_BTN_SIZE);
        this.restartNode?.getComponent(UITransform)?.setContentSize(HUD_BTN_SIZE, HUD_BTN_SIZE);
    }

    /** Prefab 是布局源，运行时节点继续由控制器持有，避免序列化玩法状态。 */
    private applyHudPrefab(prefab: Prefab): void {
        const hud = instantiate(prefab);
        const take = (name: string, target: Node | null) => {
            const source = hud.getChildByName(name);
            if (!source || !target?.isValid) return;
            target.setPosition(source.position);
            target.setScale(source.scale);
            const from = source.getComponent(UITransform);
            const to = target.getComponent(UITransform);
            if (from && to) to.setContentSize(from.contentSize);
        };
        take('Direction', this.directionNode);
        take('Rule', this.ruleNode);
        take('FooterActions', this.footerNode);
        hud.destroy();
        if (this.boardNode?.isValid) {
            this.boardNode.setPosition(0, this.boardCenterY, 0);
            this.boardNode.getComponent(UITransform)?.setContentSize(this.boardWidth, this.boardHeight);
        }
        this.ruleNode?.setPosition(0, this.ruleCenterY, 0);
        this.footerNode?.setPosition(0, this.footerCenterY, 0);
        this.layoutSafeHeader();
        this.layoutFooterActions();
        this.bringChromeToFront();
        this.refreshHintButton();
    }

    /** 12 行棋盘几乎铺满屏幕，必须压在返回、重开、提示下面，否则点击被格子吃掉。 */
    private bringChromeToFront(): void {
        const nodes = [
            this.titleNode,
            this.directionNode,
            this.stepCounterNode,
            this.ruleNode,
            this.footerNode,
            this.backNode,
            this.restartNode,
        ];
        const top = this.node.children.length - 1;
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (node?.isValid) node.setSiblingIndex(top);
        }
    }

    private hintButtonText(): string {
        return `提示(${this.hintsRemaining})`;
    }

    private shuffleButtonText(): string {
        if (this.freeReshufflesRemaining == null) return `整理(${UNLIMITED_HINTS_DISPLAY})`;
        return `整理(${this.freeReshufflesRemaining})`;
    }

    /** 提示和整理同一行；只剩一个时居中。 */
    private layoutFooterActions(): void {
        const showHint = this.hintsBudget > 0;
        const showShuffle = true;
        if (this.hintBtnNode?.isValid) this.hintBtnNode.active = showHint;
        if (this.shuffleBtnNode?.isValid) this.shuffleBtnNode.active = showShuffle;
        if (this.footerNode?.isValid) this.footerNode.active = showHint || showShuffle;
        const pair = (HINT_BTN_W + FOOTER_BTN_GAP) / 2;
        if (showHint && showShuffle) {
            this.hintBtnNode?.setPosition(-pair, 0, 0);
            this.shuffleBtnNode?.setPosition(pair, 0, 0);
        } else if (showHint) {
            this.hintBtnNode?.setPosition(0, 0, 0);
        } else {
            this.shuffleBtnNode?.setPosition(0, 0, 0);
        }
    }

    private refreshHintButton(): void {
        const btn = this.hintBtnNode;
        const label = btn?.getChildByName('Label')?.getComponent(Label);
        if (label && btn?.isValid) {
            label.string = this.hintButtonText();
            const enabled = this.hintsBudget > 0
                && this.hintsRemaining > 0
                && !this.busy
                && this.boardState?.status === 'running';
            label.color = enabled ? MILK : new Color(255, 253, 248, 168);
            this.paintFooterButton(btn, enabled ? HINT_BTN_FILL : HINT_BTN_FILL_OFF, enabled ? HINT_BTN_STROKE : HINT_BTN_FILL_OFF);
        }
        this.refreshShuffleButton();
    }

    private refreshShuffleButton(): void {
        const btn = this.shuffleBtnNode;
        const label = btn?.getChildByName('Label')?.getComponent(Label);
        if (!label || !btn?.isValid) return;
        label.string = this.shuffleButtonText();
        const level = this.boardState?.level;
        const enabled = level != null
            && allowsDeadlockReshuffle(level, this.freeReshufflesRemaining)
            && !this.busy
            && this.boardState?.status === 'running';
        label.color = enabled ? MILK : new Color(255, 253, 248, 168);
        this.paintFooterButton(btn, enabled ? SHUFFLE_BTN_FILL : HINT_BTN_FILL_OFF, enabled ? SHUFFLE_BTN_STROKE : HINT_BTN_FILL_OFF);
    }

    private paintFooterButton(node: Node, fill: Color, stroke: Color): void {
        const graphics = node.getComponent(Graphics);
        const ui = node.getComponent(UITransform);
        if (!graphics || !ui) return;
        const width = ui.width;
        const height = ui.height;
        const radius = height / 2;
        graphics.clear();
        graphics.fillColor = fill;
        graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        graphics.fill();
        graphics.strokeColor = stroke;
        graphics.lineWidth = 3;
        graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        graphics.stroke();
    }

    private makeHintButton(parent: Node, name: string, text: string, x: number, y: number): Node {
        const radius = HINT_BTN_H / 2;
        const node = this.roundRectNode(
            name,
            HINT_BTN_W,
            HINT_BTN_H,
            HINT_BTN_FILL,
            radius,
            HINT_BTN_STROKE,
            3,
        );
        node.setPosition(x, y, 0);
        parent.addChild(node);
        this.addLabel(node, 'Label', text, 28, MILK, HINT_BTN_W - 24, HINT_BTN_H - 12, 0, 0, true);
        return node;
    }

    private makeShuffleButton(parent: Node, name: string, text: string, x: number, y: number): Node {
        const radius = HINT_BTN_H / 2;
        const node = this.roundRectNode(
            name,
            HINT_BTN_W,
            HINT_BTN_H,
            SHUFFLE_BTN_FILL,
            radius,
            SHUFFLE_BTN_STROKE,
            3,
        );
        node.setPosition(x, y, 0);
        parent.addChild(node);
        this.addLabel(node, 'Label', text, 28, MILK, HINT_BTN_W - 24, HINT_BTN_H - 12, 0, 0, true);
        return node;
    }

    /** 教学关进关自动整理；其余关按关卡表 layout 开局。 */
    private autoOrganizeOnEnter(): void {
        if (!this.boardState) return;
        if (this.roundResume || !shouldAutoOrganizeOnEnter(this.boardState.level)) {
            this.renderTiles(!this.roundResume);
            this.refreshLevelGuide();
            return;
        }
        const seed = this.currentLevelId * 7919 + 17;
        const result = this.boardState.reshuffle(seed);
        if (!result.ok) {
            this.renderTiles(true);
            this.refreshLevelGuide();
            return;
        }
        this.rebuildTilesFromState(true);
        this.refreshLevelGuide();
    }

    private makeIceCell(point: MatchPoint): Node {
        const node = new Node(`Ice-${point.row}-${point.column}`);
        node.layer = UI_2D;
        node.setPosition(this.pointPosition(point));
        node.addComponent(UITransform).setContentSize(this.tileSize, this.tileSize);
        const block = this.rectNode(
            'Block',
            this.tileSize - 4,
            this.tileSize - 4,
            ICE_FILL,
            Math.max(10, this.tileSize * 0.18),
            ICE_STROKE,
            4,
        );
        node.addChild(block);
        const shine = this.rectNode(
            'Shine',
            Math.max(12, this.tileSize * 0.35),
            Math.max(6, this.tileSize * 0.12),
            new Color(255, 255, 255, 140),
            4,
            null,
            0,
        );
        shine.setPosition(-this.tileSize * 0.12, this.tileSize * 0.14, 0);
        node.addChild(shine);
        this.addLabel(node, 'Tag', '冰', Math.max(18, this.tileSize * 0.28), ICE_STROKE, this.tileSize, 28, 0, -this.tileSize * 0.08, true);
        return node;
    }

    private makeTile(tile: FoodId, point: MatchPoint): Node {
        const node = new Node(`Tile-${point.row}-${point.column}-${tile}`);
        node.layer = UI_2D;
        node.setPosition(this.pointPosition(point));
        node.addComponent(UITransform).setContentSize(this.tileSize, this.tileSize);

        const card = this.rectNode(
            'Card',
            this.tileSize - 6,
            this.tileSize - 6,
            MILK,
            Math.max(11, this.tileSize * 0.2),
            null,
            0,
        );
        node.addChild(card);

        const frame = this.foodFrames.get(tile) || null;
        if (!frame) {
            const fallback = new Node('Fallback');
            fallback.layer = UI_2D;
            const fallbackSize = Math.max(34, this.tileSize * 0.64);
            fallback.addComponent(UITransform).setContentSize(fallbackSize, fallbackSize);
            const fallbackGraphics = fallback.addComponent(Graphics);
            fallbackGraphics.fillColor = FOOD_FALLBACK[tile] || SAGE;
            fallbackGraphics.circle(0, 0, fallbackSize * 0.47);
            fallbackGraphics.fill();
            node.addChild(fallback);
        }

        const icon = new Node('Icon');
        icon.layer = UI_2D;
        const iconSize = Math.max(42, this.tileSize * 0.78);
        icon.addComponent(UITransform).setContentSize(iconSize, iconSize);
        const sprite = icon.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frame;
        icon.active = !!frame;
        node.addChild(icon);

        this.bindTileTap(node, point);
        return node;
    }

    private ensureSelection(node: Node): Node {
        const existing = node.getChildByName('Selection');
        if (existing) return existing;
        const selection = new Node('Selection');
        selection.layer = UI_2D;
        selection.addComponent(UITransform).setContentSize(this.tileSize, this.tileSize);
        const selectionGraphics = selection.addComponent(Graphics);
        selectionGraphics.strokeColor = SELECT_BLUE;
        selectionGraphics.lineWidth = Math.max(3, this.tileSize * 0.05);
        selectionGraphics.roundRect(
            -this.tileSize / 2,
            -this.tileSize / 2,
            this.tileSize,
            this.tileSize,
            Math.max(12, this.tileSize * 0.22),
        );
        selectionGraphics.stroke();
        selection.active = false;
        node.addChild(selection);
        return selection;
    }

    private bindTileTap(node: Node, point: MatchPoint): void {
        this.setTileTapPoint(node, point);
        this.bindTap(node, () => {
            const current = this.tileTapPoint.get(node);
            if (current) this.onTileTap(current);
        });
    }

    private setTileTapPoint(node: Node, point: MatchPoint): void {
        this.tileTapPoint.set(node, { row: point.row, column: point.column });
    }

    private onTileTap(point: MatchPoint): void {
        if (this.busy || !this.boardState) return;
        this.clearHint();
        const result = this.boardState.select(point);
        if (result.kind === 'matched') {
            this.dismissLevelGuide();
            this.busy = true;
            this.refreshSelection();
            void this.playMatch(result);
            return;
        }
        this.refreshSelection();
        this.refreshLevelGuide();
        if (result.kind === 'switched' && result.reason === 'blocked') {
            playMatchFail();
            const node = this.tileNodes.get(pointKey(result.point));
            if (node?.isValid) {
                tween(node)
                    .by(0.04, { position: new Vec3(-5, 0, 0) })
                    .by(0.08, { position: new Vec3(10, 0, 0) })
                    .by(0.04, { position: new Vec3(-5, 0, 0) })
                    .start();
            }
        }
    }

    private async playMatch(result: Extract<MatchSelectResult, { kind: 'matched' }>): Promise<void> {
        const token = this.roundToken;
        try {
            playMatchPair();
            this.drawPath(result.path);
            const firstNode = this.tileNodes.get(pointKey(result.first)) || null;
            const secondNode = this.tileNodes.get(pointKey(result.second)) || null;
            await Promise.all([
                this.eliminateTile(firstNode),
                this.eliminateTile(secondNode),
            ]);
            if (token !== this.roundToken || !this.node.isValid) return;

            if (firstNode?.isValid) {
                void this.playEliminateBurst(firstNode.position, this.foodFromTileNode(firstNode));
                firstNode.destroy();
            }
            if (secondNode?.isValid) {
                void this.playEliminateBurst(secondNode.position, this.foodFromTileNode(secondNode));
                secondNode.destroy();
            }
            this.tileNodes.delete(pointKey(result.first));
            this.tileNodes.delete(pointKey(result.second));
            this.clearPathVisual();
            await this.waitSeconds(ANI_COLLAPSE_DELAY);
            if (token !== this.roundToken || !this.node.isValid) return;
            await this.playCollapse(result.movements);
            if (token !== this.roundToken || !this.node.isValid) return;
            this.snapTilesToGrid();
            const stepLimit = matchStepLimitForLevel(this.boardState.level);
            if (stepLimit != null && this.boardState.matches > stepLimit) {
                this.showStepLimitFail(stepLimit);
                return;
            }
            this.refreshStepCounter();
            if (result.status === 'win') {
                if (stepLimit != null && this.boardState.matches > stepLimit) {
                    this.showStepLimitFail(stepLimit);
                    return;
                }
                this.showWin();
                return;
            }
            if (result.status === 'deadlock') {
                this.showDeadlock();
                return;
            }
        } finally {
            if (
                token === this.roundToken
                && this.node.isValid
                && this.boardState?.status === 'running'
            ) {
                this.busy = false;
                this.refreshHintButton();
            }
        }
    }

    private stepCounterText(): string {
        const level = this.boardState?.level;
        if (!level) return '';
        const limit = matchStepLimitForLevel(level);
        if (limit == null) return '';
        const used = this.boardState?.matches ?? 0;
        return `步数 ${used}/${limit}`;
    }

    private refreshStepCounter(): void {
        if (!this.stepCounterNode?.isValid) return;
        const label = this.stepCounterNode.getComponent(Label);
        if (label) label.string = this.stepCounterText();
    }

    private showStepLimitFail(limit: number): void {
        playSfx('game_failed');
        this.clearHint();
        this.busy = false;
        if (this.deadlockLayer?.isValid) this.deadlockLayer.destroy();
        const layer = new Node('StepLimitLayer');
        layer.layer = UI_2D;
        layer.addComponent(UITransform).setContentSize(this.screenW, this.screenH);
        layer.addComponent(BlockInputEvents);
        this.node.addChild(layer);
        this.deadlockLayer = layer;
        const shade = this.rectNode(
            'Shade',
            this.screenW,
            this.screenH,
            new Color(61, 50, 41, 82),
            0,
            null,
            0,
        );
        layer.addChild(shade);
        const card = this.rectNode('Card', 560, 300, CREAM, 32, FRAME, 5);
        card.setPosition(0, -10, 0);
        layer.addChild(card);
        const used = this.boardState?.matches ?? limit;
        this.addLabel(card, 'Title', '步数用完了', 40, WALNUT, 480, 58, 0, 88, true);
        this.addLabel(
            card,
            'Message',
            `本关限 ${limit} 步，你已用 ${used} 步。请重开本关再试。`,
            24,
            SAGE,
            470,
            42,
            0,
            38,
        );
        const restart = this.makeButton(card, 'BtnRestart', '重开本关', 360, 68, 0, -72, MILK, WALNUT);
        this.bindTap(restart, () => this.startRound(true));
        card.setScale(0.9, 0.9, 1);
        tween(card).to(0.2, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    private rebuildTilesFromState(animateSpawn = false): void {
        if (!this.tileLayer?.isValid || !this.boardState) return;
        const oldNodes = this.tileLayer.children.slice();
        this.tileLayer.removeAllChildren();
        for (let i = 0; i < oldNodes.length; i++) oldNodes[i].destroy();
        this.tileNodes.clear();
        this.renderTiles(animateSpawn);
    }

    private showHint(): void {
        if (this.busy || this.boardState?.status !== 'running') return;
        if (this.hintsBudget <= 0 || this.hintsRemaining <= 0) return;
        playMatchHint();
        const hint = this.boardState.findHint();
        if (!hint) {
            this.showDeadlock();
            return;
        }
        this.hintsRemaining -= 1;
        this.hintsUsedThisRound += 1;
        this.refreshHintButton();
        this.clearHint();
        this.drawPath(hint.path);
        const nodes = [
            this.tileNodes.get(pointKey(hint.first)),
            this.tileNodes.get(pointKey(hint.second)),
        ];
        for (let i = 0; i < nodes.length; i++) {
            const node = nodes[i];
            if (!node?.isValid) continue;
            const selection = this.ensureSelection(node);
            selection.active = true;
            selection.setScale(1, 1, 1);
            const pulse = tween(selection)
                .to(ANI_SELECT_PULSE / 2, { scale: new Vec3(0.9, 0.9, 1) })
                .to(ANI_SELECT_PULSE / 2, { scale: Vec3.ONE })
                .union()
                .repeatForever();
            pulse.start();
            this.hintPulseTweens.push(pulse);
        }
    }

    private clearHint(): void {
        this.hintToken += 1;
        this.stopHintPulse();
        this.clearPathVisual();
    }

    private stopHintPulse(): void {
        for (let i = 0; i < this.hintPulseTweens.length; i++) {
            this.hintPulseTweens[i].stop();
        }
        this.hintPulseTweens.length = 0;
        for (const node of this.tileNodes.values()) {
            if (!node.isValid) continue;
            const selection = node.getChildByName('Selection');
            if (!selection?.isValid) continue;
            Tween.stopAllByTarget(selection);
            selection.setScale(1, 1, 1);
        }
        this.refreshSelection();
    }

    private reshuffleBoard(): void {
        if (this.busy || !this.boardState || this.boardState.status === 'win') return;
        const level = this.boardState.level;
        if (!allowsDeadlockReshuffle(level, this.freeReshufflesRemaining)) return;
        this.clearHint();
        const result = this.boardState.reshuffle(Date.now() & 0x7fffffff);
        if (!result.ok) {
            this.showDeadlock('这一层暂时整理不开，请重开本关');
            return;
        }
        this.clearLevelGuide();
        if (this.freeReshufflesRemaining != null) {
            this.freeReshufflesRemaining -= 1;
            this.freeReshufflesUsedThisRound += 1;
        }
        this.busy = true;
        this.refreshShuffleButton();
        this.refreshSelection();
        if (this.deadlockLayer?.isValid) this.deadlockLayer.destroy();
        this.deadlockLayer = null;
        const oldNodes = Array.from(this.tileNodes.values()).filter((node) => node.isValid);
        if (oldNodes.length === 0) {
            this.rebuildTilesFromState();
            this.finishShuffleFloat(this.roundToken);
            return;
        }
        this.playShuffleFloat();
    }

    /** 食材先收到棋盘中心，再散开落到新格子。 */
    private playShuffleFloat(): void {
        const token = this.roundToken;
        const board = this.boardState;
        const layer = this.tileLayer;
        if (!layer?.isValid || !board) {
            this.finishShuffleFloat(token);
            return;
        }
        const sources = new Map<FoodId, { node: Node; from: MatchPoint }[]>();
        for (const [key, node] of this.tileNodes) {
            if (!node?.isValid) continue;
            const food = this.foodFromTileNode(node);
            if (!food) continue;
            const parts = key.split(':');
            const from = { row: Number(parts[0]), column: Number(parts[1]) };
            const list = sources.get(food) ?? [];
            list.push({ node, from });
            sources.set(food, list);
        }
        const targets = new Map<FoodId, MatchPoint[]>();
        const grid = board.grid;
        for (let row = 0; row < grid.length; row++) {
            for (let column = 0; column < grid[row].length; column++) {
                const tile = grid[row][column];
                if (!isMatchFood(tile)) continue;
                const list = targets.get(tile) ?? [];
                list.push({ row, column });
                targets.set(tile, list);
            }
        }
        const moves: { node: Node; to: MatchPoint; from: MatchPoint }[] = [];
        for (const [food, fromNodes] of sources) {
            const slots = (targets.get(food) ?? []).slice();
            const pending = fromNodes.slice();
            for (let i = pending.length - 1; i >= 0; i--) {
                const stay = slots.findIndex(
                    (slot) => slot.row === pending[i].from.row && slot.column === pending[i].from.column,
                );
                if (stay < 0) continue;
                moves.push({ node: pending[i].node, to: slots[stay], from: pending[i].from });
                slots.splice(stay, 1);
                pending.splice(i, 1);
            }
            while (pending.length > 0 && slots.length > 0) {
                let bestFrom = 0;
                let bestTo = 0;
                let bestDist = Infinity;
                for (let i = 0; i < pending.length; i++) {
                    for (let j = 0; j < slots.length; j++) {
                        const dr = pending[i].from.row - slots[j].row;
                        const dc = pending[i].from.column - slots[j].column;
                        const dist = dr * dr + dc * dc;
                        if (dist < bestDist) {
                            bestDist = dist;
                            bestFrom = i;
                            bestTo = j;
                        }
                    }
                }
                moves.push({ node: pending[bestFrom].node, to: slots[bestTo], from: pending[bestFrom].from });
                pending.splice(bestFrom, 1);
                slots.splice(bestTo, 1);
            }
            for (let i = 0; i < pending.length; i++) {
                if (pending[i].node.isValid) pending[i].node.destroy();
            }
            for (let i = 0; i < slots.length; i++) this.attachTile(food, slots[i]);
        }
        this.tileNodes.clear();
        const center = new Vec3(0, 0, 0);
        if (moves.length === 0) {
            this.finishShuffleFloat(token);
            return;
        }
        let arrived = 0;
        const done = () => {
            arrived += 1;
            if (arrived >= moves.length) this.finishShuffleFloat(token);
        };
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            this.tileNodes.set(pointKey(move.to), move.node);
            this.setTileTapPoint(move.node, move.to);
            const node = move.node;
            const target = this.pointPosition(move.to);
            Tween.stopAllByTarget(node);
            node.setScale(1, 1, 1);
            tween(node)
                .to(ANI_SHUFFLE_IN, { position: center }, { easing: 'sineInOut' })
                .delay(0.05)
                .to(ANI_SHUFFLE_OUT, { position: target }, { easing: 'sineInOut' })
                .call(() => {
                    if (node.isValid) node.setPosition(target);
                    done();
                })
                .start();
        }
    }

    private finishShuffleFloat(token: number): void {
        if (token !== this.roundToken || !this.node.isValid) return;
        this.snapTilesToGrid();
        this.busy = false;
        this.refreshSelection();
        this.refreshHintButton();
        this.refreshLevelGuide();
    }

    private eliminateTile(node: Node | null): Promise<void> {
        if (!node?.isValid) return Promise.resolve();
        return new Promise((resolve) => {
            tween(node)
                .to(ANI_TILE_ELIMINATE, { scale: Vec3.ZERO }, { easing: 'quadIn' })
                .call(() => resolve())
                .start();
        });
    }

    private foodFromTileNode(node: Node): FoodId | null {
        const parts = node.name.split('-');
        const kind = parts[parts.length - 1];
        if (kind && kind in FOOD_FALLBACK) return kind as FoodId;
        return null;
    }

    /** 消除处喷一圈食材色气泡，按原时长自己淡出，不挡住收拢。 */
    private playEliminateBurst(localPos: Vec3, food: FoodId | null): Promise<void> {
        if (!this.effectLayer?.isValid) return Promise.resolve();
        return new Promise((resolve) => {
        const tint = burstTint(food);
        const reach = this.tileSize * 0.72;
        const node = new Node('MatchBubbles');
        node.layer = UI_2D;
        node.setPosition(localPos);
        const span = Math.ceil(reach * 2 + 16);
        node.addComponent(UITransform).setContentSize(span, span);
        const graphics = node.addComponent(Graphics);
        this.effectLayer.addChild(node);
        const dots: { angle: number; dist: number; radius: number }[] = [];
        for (let i = 0; i < ANI_BUBBLE_COUNT; i++) {
            const jitter = (i % 2 === 0 ? 0.18 : -0.12) * (0.4 + (i % 5) * 0.12);
            dots.push({
                angle: (Math.PI * 2 * i) / ANI_BUBBLE_COUNT + jitter,
                dist: reach * (0.45 + (i % 4) * 0.16),
                radius: Math.max(3.5, this.tileSize * (0.045 + (i % 3) * 0.012)),
            });
        }
        const started = Date.now();
        let settled = false;
        let draw = () => {};
        const finish = () => {
            if (settled) return;
            settled = true;
            this.unschedule(draw);
            if (node.isValid) node.destroy();
            resolve();
        };
        draw = () => {
            if (!node.isValid) {
                finish();
                return;
            }
            const t = Math.min(1, (Date.now() - started) / (ANI_BUBBLE * 1000));
            const ease = 1 - (1 - t) * (1 - t);
            graphics.clear();
            const alpha = Math.round(230 * (1 - t));
            graphics.fillColor = new Color(tint.r, tint.g, tint.b, alpha);
            for (let i = 0; i < dots.length; i++) {
                const dot = dots[i];
                const x = Math.cos(dot.angle) * dot.dist * ease;
                const y = Math.sin(dot.angle) * dot.dist * ease;
                graphics.circle(x, y, Math.max(1.5, dot.radius * (1 - t * 0.2)));
                graphics.fill();
            }
            if (t >= 1) finish();
        };
        draw();
        this.schedule(draw, 0);
        });
    }

    private waitSeconds(seconds: number): Promise<void> {
        return new Promise((resolve) => {
            this.scheduleOnce(resolve, seconds);
        });
    }

    private playCollapse(movements: MatchTileMove[]): Promise<void> {
        const moving: { move: MatchTileMove; node: Node }[] = [];
        for (let i = 0; i < movements.length; i++) {
            const node = this.tileNodes.get(pointKey(movements[i].from));
            if (node?.isValid) moving.push({ move: movements[i], node });
        }
        for (let i = 0; i < moving.length; i++) {
            this.tileNodes.delete(pointKey(moving[i].move.from));
        }
        for (let i = 0; i < moving.length; i++) {
            const { move, node } = moving[i];
            this.tileNodes.set(pointKey(move.to), node);
            this.setTileTapPoint(node, move.to);
        }
        if (moving.length === 0) return Promise.resolve();
        return Promise.all(moving.map(({ move, node }) => new Promise<void>((resolve) => {
            tween(node)
                .to(ANI_TILE_MOVE, { position: this.pointPosition(move.to) }, { easing: 'quadOut' })
                .call(() => resolve())
                .start();
        }))).then(() => undefined);
    }

    /** 收拢后对齐坐标与缩放，避免整盘 destroy/recreate（消除时会明显卡顿）。 */
    private snapTilesToGrid(): void {
        if (!this.boardState) return;
        const grid = this.boardState.grid;
        const alive = new Set<string>();
        for (let row = 0; row < grid.length; row++) {
            for (let column = 0; column < grid[row].length; column++) {
                const food = grid[row][column];
                if (food == null) continue;
                const at = { row, column };
                const key = pointKey(at);
                alive.add(key);
                const node = this.tileNodes.get(key);
                if (!node?.isValid) continue;
                Tween.stopAllByTarget(node);
                node.setPosition(this.pointPosition(at));
                node.setScale(1, 1, 1);
                node.name = `Tile-${row}-${column}-${food}`;
                this.setTileTapPoint(node, at);
                const opacity = node.getComponent(UIOpacity);
                if (opacity) {
                    Tween.stopAllByTarget(opacity);
                    opacity.opacity = 255;
                }
            }
        }
        for (const [key, node] of this.tileNodes.entries()) {
            if (alive.has(key)) continue;
            if (node.isValid) node.destroy();
            this.tileNodes.delete(key);
        }
    }

    private clearPathVisual(): void {
        this.lineGraphics?.clear();
        for (let i = 0; i < this.pathLineNodes.length; i++) {
            const node = this.pathLineNodes[i];
            if (node.isValid) node.destroy();
        }
        this.pathLineNodes.length = 0;
    }

    /** ConnectionLine 式折线段 + 细描边。 */
    private drawPath(path: MatchPath): void {
        this.clearPathVisual();
        if (path.points.length < 2) return;
        const lineWidth = this.tileSize * 0.15;
        for (let i = 0; i < path.points.length - 1; i++) {
            const from = this.pointPosition(path.points[i]);
            const to = this.pointPosition(path.points[i + 1]);
            const segment = new Node(`Conn-${i}`);
            segment.layer = UI_2D;
            const ui = segment.addComponent(UITransform);
            const g = segment.addComponent(Graphics);
            g.fillColor = PATH_LINE_FILL;
            if (path.points[i].column !== path.points[i + 1].column) {
                const dx = to.x - from.x;
                const width = Math.abs(dx) + lineWidth * 0.5;
                ui.setContentSize(width, lineWidth);
                ui.setAnchorPoint(dx >= 0 ? 0 : 1, 0.5);
                segment.setPosition(from.x, from.y, 0);
                g.rect(dx >= 0 ? 0 : -width, -lineWidth / 2, width, lineWidth);
            } else {
                const dy = to.y - from.y;
                const height = Math.abs(dy) + lineWidth * 0.5;
                ui.setContentSize(lineWidth, height);
                ui.setAnchorPoint(0.5, dy >= 0 ? 0 : 1);
                segment.setPosition(from.x, from.y, 0);
                g.rect(-lineWidth / 2, dy >= 0 ? 0 : -height, lineWidth, height);
            }
            g.fill();
            this.lineSegmentLayer?.addChild(segment);
            this.pathLineNodes.push(segment);
        }
        const graphics = this.lineGraphics;
        if (!graphics) return;
        const first = this.pointPosition(path.points[0]);
        graphics.moveTo(first.x, first.y);
        for (let i = 1; i < path.points.length; i++) {
            const point = this.pointPosition(path.points[i]);
            graphics.lineTo(point.x, point.y);
        }
        graphics.lineWidth = 4;
        graphics.strokeColor = PATH_LINE_STROKE;
        graphics.stroke();
    }

    private refreshSelection(): void {
        const selected = this.boardState?.selected;
        const selectedKey = selected ? pointKey(selected) : '';
        for (const [key, node] of this.tileNodes.entries()) {
            if (!node.isValid) continue;
            if (key === selectedKey) {
                this.ensureSelection(node).active = true;
                continue;
            }
            const selection = node.getChildByName('Selection');
            if (selection) selection.active = false;
        }
    }

    private showDeadlock(message?: string): void {
        const level = this.boardState?.level;
        const puzzle = level != null && isFixedLayoutLevel(level);
        const canShuffle = level != null && allowsDeadlockReshuffle(level, this.freeReshufflesRemaining);
        const resolvedMessage = message ?? (
            puzzle
                ? '没有可消除了，试试换个顺序或重开本关'
                : !canShuffle && level != null && freeReshufflesBudgetForLevel(level) === 1
                    ? '整理次数已用完，请重开本关'
                    : '这一层没有可配对食材了'
        );
        playSfx('game_failed');
        this.clearHint();
        this.busy = false;
        if (this.deadlockLayer?.isValid) this.deadlockLayer.destroy();
        const layer = new Node('DeadlockLayer');
        layer.layer = UI_2D;
        layer.addComponent(UITransform).setContentSize(this.screenW, this.screenH);
        layer.addComponent(BlockInputEvents);
        this.node.addChild(layer);
        this.deadlockLayer = layer;

        const shade = this.rectNode(
            'Shade',
            this.screenW,
            this.screenH,
            new Color(61, 50, 41, 82),
            0,
            null,
            0,
        );
        layer.addChild(shade);
        const cardHeight = canShuffle ? 420 : 300;
        const card = this.rectNode('Card', 560, cardHeight, CREAM, 32, FRAME, 5);
        card.setPosition(0, -10, 0);
        layer.addChild(card);
        this.addLabel(
            card,
            'Title',
            puzzle ? '这步顺序不对' : !canShuffle ? '无法继续整理' : '需要重新整理',
            40,
            WALNUT,
            480,
            58,
            0,
            canShuffle ? 132 : 88,
            true,
        );
        this.addLabel(
            card,
            'Message',
            resolvedMessage,
            24,
            SAGE,
            470,
            48,
            0,
            canShuffle ? 64 : 38,
        );
        if (canShuffle) {
            const shuffleLabel = this.freeReshufflesRemaining === 1
                ? '重新整理(剩1次)'
                : '重新整理';
            const shuffle = this.makeButton(card, 'BtnShuffle', shuffleLabel, 360, 76, 0, -16, CORAL, MILK);
            this.bindTap(shuffle, () => this.reshuffleBoard());
        }
        const restartY = canShuffle ? -112 : -72;
        const restart = this.makeButton(card, 'BtnRestart', '重开本关', 360, 68, 0, restartY, MILK, WALNUT);
        this.bindTap(restart, () => this.startRound(true));
        card.setScale(0.9, 0.9, 1);
        tween(card).to(0.2, { scale: Vec3.ONE }, { easing: 'backOut' }).start();
    }

    private showWin(): void {
        this.levelSnapshotCleared = true;
        clearMatchLevelSnapshot(sys.localStorage, this.currentLevelId);
        playSfx('win_tg');
        this.busy = true;
        let firstClear = false;
        let badgeEarned: string | null = null;
        const matchSteps = this.boardState?.matches ?? 0;
        if (this.progress) {
            const cleared = markMatchLevelClearedWithBadge(
                sys.localStorage,
                this.progress,
                this.currentLevelId,
                MATCH_LEVEL_IDS,
                milestoneBadgeIdForLevel(this.currentLevelId),
            );
            this.progress = cleared.progress;
            firstClear = cleared.firstClear;
            badgeEarned = cleared.badgeEarned;
            this.syncMatchProgressCloud();
        }
        const nextId = nextMatchLevelId(this.currentLevelId);
        const canGoNext = nextId != null && !!this.progress && nextId <= this.progress.unlockedLevelId;
        const shade = this.rectNode(
            'WinShade',
            this.screenW,
            this.screenH,
            new Color(61, 50, 41, 110),
            0,
            null,
            0,
        );
        this.node.addChild(shade);
        const card = this.rectNode('WinCard', 560, 480, CREAM, 34, FRAME, 5);
        card.setPosition(0, 10, 0);
        this.node.addChild(card);
        card.setScale(0.86, 0.86, 1);
        tween(card).to(0.25, { scale: Vec3.ONE }, { easing: 'backOut' }).start();

        this.addLabel(card, 'WinTitle', '清理完成', 40, WALNUT, 480, 64, 0, 130, true);
        const level = matchLevelById(this.currentLevelId);
        const challengeLine = level
            ? winSubtitleForLevel(
                level,
                this.hintsUsedThisRound,
                firstClear,
                this.freeReshufflesUsedThisRound,
                matchSteps,
            )
            : null;
        const progressLine = firstClear ? '新的一层已经解锁' : '食材已经整齐收拢';
        this.addLabel(
            card,
            'WinSub',
            challengeLine ?? progressLine,
            26,
            SAGE,
            420,
            44,
            0,
            badgeEarned ? 88 : 70,
        );
        if (badgeEarned) {
            this.addLabel(
                card,
                'WinBadge',
                `里程碑徽章：${milestoneBadgeTitle(badgeEarned)}`,
                24,
                WALNUT,
                420,
                40,
                0,
                42,
            );
        }
        if (challengeLine && progressLine !== challengeLine) {
            this.addLabel(card, 'WinExtra', progressLine, 22, WALNUT, 420, 36, 0, badgeEarned ? 0 : 28);
        }
        const primaryText = canGoNext ? '下一层' : '再来一次';
        const primary = this.makeButton(card, 'BtnPrimary', primaryText, 360, 88, 0, -30, CORAL, MILK);
        this.bindTap(primary, () => {
            if (canGoNext && nextId != null) this.goToLevel(nextId);
            else this.startRound(true);
        });
        const back = this.makeButton(card, 'BtnHome', '返回主页', 360, 76, 0, -138, MILK, WALNUT);
        this.bindTap(back, () => this.close());
    }

    private goToLevel(levelId: number): void {
        const level = matchLevelById(levelId);
        if (!level || !this.progress || level.id > this.progress.unlockedLevelId) return;
        this.currentLevelId = level.id;
        this.startRound();
    }

    private close(): void {
        this.persistLevelSnapshot();
        const callback = this.closeCallback;
        this.closeCallback = null;
        if (this.node?.isValid) this.node.destroy();
        callback?.();
    }

    /** 进行中的单关盘面只留在本机。胜利后不再写入。 */
    private persistLevelSnapshot(): void {
        const board = this.boardState;
        if (this.levelSnapshotCleared || !board) return;
        const stepLimitOpen = this.deadlockLayer?.isValid && this.deadlockLayer.name === 'StepLimitLayer';
        if (board.status === 'win' && !stepLimitOpen) return;
        const outcome = stepLimitOpen
            ? 'step_limit'
            : board.status === 'deadlock'
                ? 'deadlock'
                : 'play';
        writeMatchLevelSnapshot(sys.localStorage, {
            version: 1,
            levelId: board.level.id,
            grid: board.grid,
            matches: board.matches,
            shuffles: board.shuffles,
            hintsRemaining: this.hintsRemaining,
            hintsUsed: this.hintsUsedThisRound,
            reshufflesRemaining: this.freeReshufflesRemaining,
            reshufflesUsed: this.freeReshufflesUsedThisRound,
            outcome,
        });
    }

    private presentResumedRound(): void {
        const outcome = this.roundResume;
        this.roundResume = null;
        const board = this.boardState;
        if (!outcome || outcome === 'play' || !board) return;
        if (outcome === 'step_limit') {
            const limit = matchStepLimitForLevel(board.level);
            if (limit != null && board.matches > limit) this.showStepLimitFail(limit);
            return;
        }
        if (outcome === 'deadlock' && board.status === 'deadlock') this.showDeadlock();
    }

    private pointPosition(point: MatchPoint): Vec3 {
        const rows = this.boardState?.level.rows || MATCH_LEVELS[0].rows;
        const columns = this.boardState?.level.columns || MATCH_LEVELS[0].columns;
        const x = (point.column - (columns - 1) / 2) * this.tilePitch;
        const y = ((rows - 1) / 2 - point.row) * this.tilePitch;
        return new Vec3(x, y, 0);
    }

    private bindTap(node: Node, callback: () => void): void {
        node.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            callback();
        }, this);
    }

    private bindHudPress(btn: Node, tap: () => void): void {
        btn.on(Node.EventType.TOUCH_START, () => {
            tween(btn).to(0.08, { scale: new Vec3(0.97, 0.97, 1) }).start();
        }, this);
        btn.on(Node.EventType.TOUCH_CANCEL, () => {
            tween(btn).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
        }, this);
        btn.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            tween(btn).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
            playBtnClick();
            tap();
        }, this);
    }

    private makeLevelPill(levelId: number): Node {
        const pill = new Node('Title');
        pill.layer = UI_2D;
        const pillR = LEVEL_PILL_H / 2;
        pill.addComponent(UITransform).setContentSize(LEVEL_PILL_W, LEVEL_PILL_H);
        const g = pill.addComponent(Graphics);
        g.fillColor = MILK;
        g.roundRect(-LEVEL_PILL_W / 2, -pillR, LEVEL_PILL_W, LEVEL_PILL_H, pillR);
        g.fill();
        g.lineWidth = 2;
        g.strokeColor = new Color(107, 74, 58, 64);
        g.roundRect(-LEVEL_PILL_W / 2, -pillR, LEVEL_PILL_W, LEVEL_PILL_H, pillR);
        g.stroke();
        const labelNode = this.addLabel(
            pill,
            'LevelLabel',
            `第 ${levelId} 层`,
            LEVEL_LABEL_FONT,
            WALNUT,
            LEVEL_PILL_W - 20,
            LEVEL_LABEL_LINE,
            0,
            0,
            true,
        );
        const lb = labelNode.getComponent(Label);
        if (lb) {
            lb.lineHeight = LEVEL_LABEL_LINE;
            lb.fontFamily = 'Microsoft YaHei';
        }
        return pill;
    }

    private makeHudIconButton(name: string): Node {
        const node = new Node(name);
        node.layer = UI_2D;
        node.addComponent(UITransform).setContentSize(HUD_BTN_SIZE, HUD_BTN_SIZE);
        const icon = new Node('Icon');
        icon.layer = UI_2D;
        icon.addComponent(UITransform).setContentSize(HUD_BTN_SIZE, HUD_BTN_SIZE);
        const sprite = icon.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.color = Color.WHITE;
        node.addChild(icon);
        return node;
    }

    private makeButton(
        parent: Node,
        name: string,
        text: string,
        width: number,
        height: number,
        x: number,
        y: number,
        fill: Color,
        textColor: Color,
    ): Node {
        const node = this.rectNode(name, width, height, fill, height / 2, FRAME, 3);
        node.setPosition(x, y, 0);
        parent.addChild(node);
        this.addLabel(node, 'Label', text, 28, textColor, width - 24, height - 12, 0, 0, true);
        return node;
    }

    private addLabel(
        parent: Node,
        name: string,
        text: string,
        fontSize: number,
        color: Color,
        width: number,
        height: number,
        x: number,
        y: number,
        bold = false,
    ): Node {
        const node = new Node(name);
        node.layer = UI_2D;
        node.setPosition(x, y, 0);
        node.addComponent(UITransform).setContentSize(width, height);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = Math.round(fontSize * 1.25);
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        label.enableWrapText = false;
        label.useSystemFont = true;
        label.fontFamily = 'Microsoft YaHei';
        label.isBold = bold;
        parent.addChild(node);
        return node;
    }

    private roundRectNode(
        name: string,
        width: number,
        height: number,
        fill: Color,
        radius: number,
        stroke: Color,
        lineWidth: number,
    ): Node {
        return this.rectNode(name, width, height, fill, radius, stroke, lineWidth);
    }

    private rectNode(
        name: string,
        width: number,
        height: number,
        fill: Color,
        radius: number,
        stroke: Color | null,
        lineWidth: number,
    ): Node {
        const node = new Node(name);
        node.layer = UI_2D;
        node.addComponent(UITransform).setContentSize(width, height);
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = fill;
        if (radius > 0) graphics.roundRect(-width / 2, -height / 2, width, height, radius);
        else graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();
        if (stroke && lineWidth > 0) {
            graphics.strokeColor = stroke;
            graphics.lineWidth = lineWidth;
            if (radius > 0) graphics.roundRect(-width / 2, -height / 2, width, height, radius);
            else graphics.rect(-width / 2, -height / 2, width, height);
            graphics.stroke();
        }
        return node;
    }

    private loadFoodFrames(): void {
        const kinds: FoodId[] = [
            'milk', 'veg', 'fruit', 'meat', 'sauce', 'grape', 'lemon', 'kiwi',
            'leftover', 'pineapple', 'watermelon', 'coconut',
        ];
        for (let i = 0; i < kinds.length; i++) {
            const kind = kinds[i];
            const uuid = FOOD_UUID[kind];
            if (!uuid) continue;
            assetManager.loadAny(uuid, (error, asset) => {
                if (error || !this.node?.isValid || !(asset instanceof SpriteFrame)) {
                    if (error) console.warn(`[match] load ${kind} failed`, error);
                    return;
                }
                this.foodFrames.set(kind, asset);
                this.applyFoodFrame(kind, asset);
            });
        }
    }

    private loadBackground(): void {
        const paths = ['merge/ui/merge_bg', 'merge/ui/merge_bg/spriteFrame'];
        const tryLoad = (index: number) => {
            if (index >= paths.length) {
                console.warn('[match] merge_bg not found under resources/merge/ui');
                return;
            }
            resources.load(paths[index], SpriteFrame, (error, frame) => {
                if (!error && frame && this.node.isValid) {
                    this.backgroundFrame = frame;
                    this.applyPlayBackground();
                    return;
                }
                tryLoad(index + 1);
            });
        };
        tryLoad(0);
    }

    private applyPlayBackground(): void {
        if (!this.backgroundFrame || !this.backgroundSprite?.isValid) return;
        this.backgroundSprite.spriteFrame = this.backgroundFrame;
        this.backgroundSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this.backgroundSprite.color = Color.WHITE;
        const cover = this.coverSize();
        this.backgroundSprite.node.getComponent(UITransform)?.setContentSize(cover.width, cover.height);
        const fallback = this.backgroundSprite.node.getChildByName('Fallback');
        if (fallback) fallback.active = false;
        this.backgroundSprite.node.setSiblingIndex(0);
    }

    private loadHandPoint(): void {
        assetManager.loadAny(HAND_POINT_UUID, (error, asset) => {
            if (error || !this.node?.isValid || !(asset instanceof SpriteFrame)) {
                if (error) console.warn('[match] load hand point failed', error);
                return;
            }
            this.handPointFrame = asset;
            const sprite = this.levelGuideHand?.getComponent(Sprite);
            if (sprite?.isValid) sprite.spriteFrame = asset;
        });
    }

    /** 第 1 关：手指先指向一对里的第一块，点中后再指向能连上的那一块。不挡点击。 */
    private refreshLevelGuide(): void {
        if (
            this.levelGuideDismissed
            || this.currentLevelId !== 1
            || !this.boardState
            || this.boardState.status !== 'running'
            || !this.node?.isValid
        ) {
            this.clearLevelGuide();
            return;
        }
        const selected = this.boardState.selected;
        const links = findAllLinks(this.boardState.grid, 8, this.boardState.level.maxLinkTurns ?? 2);
        if (links.length === 0) {
            this.clearLevelGuide();
            return;
        }
        let target = links[0].first;
        let text = '先点这个';
        if (selected) {
            const pair = links.find((link) => (
                this.sameGuidePoint(link.first, selected) || this.sameGuidePoint(link.second, selected)
            ));
            if (pair) {
                target = this.sameGuidePoint(pair.first, selected) ? pair.second : pair.first;
                text = '再点这个';
            }
        }
        const key = `${text}:${target.row}:${target.column}`;
        if (key === this.levelGuideKey && this.levelGuideRoot?.isValid) return;
        this.levelGuideKey = key;
        this.placeLevelGuide(target, text);
    }

    private dismissLevelGuide(): void {
        this.levelGuideDismissed = true;
        this.clearLevelGuide();
    }

    private clearLevelGuide(): void {
        this.levelGuideKey = '';
        if (this.levelGuideHand?.isValid) Tween.stopAllByTarget(this.levelGuideHand);
        if (this.levelGuideRoot?.isValid) this.levelGuideRoot.destroy();
        this.levelGuideRoot = null;
        this.levelGuideHand = null;
    }

    /** 显示尺寸下，指尖相对手指节点中心的偏移。 */
    private handTipOffset(): { x: number; y: number } {
        const scaleX = GUIDE_HAND_W / HAND_POINT_SRC_W;
        const scaleY = GUIDE_HAND_H / HAND_POINT_SRC_H;
        return {
            x: (HAND_TIP_SRC_X - HAND_POINT_SRC_W / 2) * scaleX,
            y: (HAND_POINT_SRC_H / 2 - HAND_TIP_SRC_Y) * scaleY,
        };
    }

    private placeLevelGuide(point: MatchPoint, text: string): void {
        this.clearLevelGuide();
        this.levelGuideKey = `${text}:${point.row}:${point.column}`;
        const at = this.pointPosition(point);
        const tip = this.handTipOffset();
        const aimX = at.x + this.tileSize * 0.18;
        const aimY = at.y;
        const centerX = aimX - tip.x;
        const centerY = aimY - tip.y;
        const root = new Node('LevelGuide');
        root.layer = UI_2D;
        root.setPosition(centerX, this.boardCenterY + centerY, 0);
        root.addComponent(UITransform).setContentSize(0, 0);
        this.ignoreHits(root);
        this.node.addChild(root);
        root.setSiblingIndex(this.node.children.length - 1);
        this.levelGuideRoot = root;

        const hand = new Node('Hand');
        hand.layer = UI_2D;
        hand.addComponent(UITransform).setContentSize(GUIDE_HAND_W, GUIDE_HAND_H);
        const sprite = hand.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = this.handPointFrame;
        this.ignoreHits(hand);
        root.addChild(hand);
        this.levelGuideHand = hand;
        tween(hand)
            .to(0.45, { position: new Vec3(-14, -8, 0) }, { easing: 'sineInOut' })
            .to(0.45, { position: new Vec3(0, 0, 0) }, { easing: 'sineInOut' })
            .union()
            .repeatForever()
            .start();

        const labelW = 148;
        const labelH = 40;
        const plate = this.roundRectNode('Caption', labelW, labelH, CREAM, labelH / 2, FRAME, 2);
        plate.setPosition(at.x - centerX, at.y + this.tileSize / 2 + 8 + labelH / 2 - centerY, 0);
        this.ignoreHits(plate);
        root.addChild(plate);
        const caption = this.addLabel(plate, 'Text', text, 22, WALNUT, labelW - 16, labelH - 8, 0, 0, true);
        this.ignoreHits(caption);
    }

    private sameGuidePoint(a: MatchPoint, b: MatchPoint): boolean {
        return a.row === b.row && a.column === b.column;
    }

    /** 引导画在食材上面，但不能把点击吃掉。 */
    private ignoreHits(node: Node): void {
        const transform = node.getComponent(UITransform);
        if (transform) transform.hitTest = () => false;
    }

    private loadHudIcons(): void {
        assetManager.loadAny(ICON_HOME_UUID, (error, asset) => {
            if (error || !this.node?.isValid || !(asset instanceof SpriteFrame)) {
                if (error) console.warn('[match] load home icon failed', error);
                return;
            }
            this.homeIconFrame = asset;
            this.applyHudIconFrames();
        });
        assetManager.loadAny(REPLAY_BTN_UUID, (error, asset) => {
            if (error || !this.node?.isValid || !(asset instanceof SpriteFrame)) {
                if (error) console.warn('[match] load replay icon failed', error);
                return;
            }
            this.replayIconFrame = asset;
            this.applyHudIconFrames();
        });
    }

    private applyHudIconFrames(): void {
        if (this.homeIconFrame && this.homeBtnSprite?.isValid) {
            this.homeBtnSprite.spriteFrame = this.homeIconFrame;
        }
        if (this.replayIconFrame && this.replayBtnSprite?.isValid) {
            this.replayBtnSprite.spriteFrame = this.replayIconFrame;
        }
    }

    private applyFoodFrame(kind: FoodId, frame: SpriteFrame): void {
        for (const node of this.tileNodes.values()) {
            if (!node.isValid || !node.name.endsWith(`-${kind}`)) continue;
            const icon = node.getChildByName('Icon');
            const sprite = icon?.getComponent(Sprite);
            if (icon && sprite) {
                sprite.spriteFrame = frame;
                icon.active = true;
            }
            const fallback = node.getChildByName('Fallback');
            if (fallback) fallback.active = false;
        }
    }
}

/** M2 仅提供独立覆盖层入口；主页按钮在正式接入步骤再绑定。 */
export function openMatchGame(parent: Node, onClose: () => void, levelId?: number): void {
    const old = parent.getChildByName('MatchGameRoot');
    if (old?.isValid) old.destroy();
    const root = new Node('MatchGameRoot');
    root.layer = UI_2D;
    root.addComponent(UITransform).setContentSize(DESIGN_W, DESIGN_H);
    parent.addChild(root);
    root.addComponent(MatchGameController).open(onClose, levelId);
}

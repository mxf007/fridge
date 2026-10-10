/**
 * 对局视图：短按译成 selectTray / placeFromBag；拖动松手才改目标并落子。不写规则。
 * 第 1 关：竖槽 + 牛奶托盘列。飞入 220ms，封格关门 280ms，胜利再延迟。
 */
import {
    _decorator,
    assetManager,
    Button,
    Color,
    Component,
    EventTouch,
    Graphics,
    Label,
    Layers,
    Mask,
    Node,
    Sprite,
    SpriteFrame,
    Texture2D,
    UIOpacity,
    UITransform,
    Vec3,
    easing,
    sys,
    Tween,
    tween,
    view,
} from 'cc';
import { BoardState } from './game/BoardState';
import { packTrayGrid, TRAY_GAP, TRAY_WALL_H, TRAY_WALL_TOP, TRAY_WALL_W } from './game/levelLayout';
import { albumStatusLine, noteAlbumWin, prepareAlbum, visibleAlbumGrade, winStepLine } from './game/AlbumState';
import { levelById as levelDefById, nextPlayable as nextPlayableLevel, PLAYABLE } from './game/playableLevels';
import {
    isSfxEnabled,
    isVibrationEnabled,
    playBtnClick,
    playFridgeDrop,
    playSfx,
    playTrayDoorClose,
    playTrayDoorVibration,
    preloadSfx,
    setSfxEnabled,
    setVibrationEnabled,
} from './game/Sfx';
import type { AlbumGrade } from './game/AlbumState';
import type { AlbumEntry } from './game/AlbumState';
import type { Dest, FailReason, FoodId, HintPick, LevelDef, PlaceFail, PlaceReason } from './game/types';
import { FOOD_IDS, FOOD_NAMES } from './game/types';
import { BulkPurchaseState } from './bulk/BulkPurchaseState';
import type { BulkRunDef } from './bulk/types';
import { bulkPrototypeIndex, loadBulkPrototype, nextBulkRunId, validateBulkPrototype } from './bulk/prototypeRuns';
import { openMergeGame } from './merge/MergeGameController';

const { ccclass, property } = _decorator;

const UI_2D = Layers.Enum.UI_2D;
const CREAM = new Color(246, 239, 230, 255);
const WALNUT = new Color(107, 74, 58, 255);
const FRAME = new Color(176, 130, 96, 255);
const MILK = new Color(255, 253, 248, 255);
const FRIDGE_GLOW = new Color(232, 243, 246, 255);
const DOOR = new Color(198, 202, 198, 255);
const HANDLE = new Color(168, 172, 168, 255);
const CORAL = new Color(224, 122, 95, 255);
const SAGE = new Color(122, 158, 126, 255);
/** 选中格呼吸描边：蓝主色 + 更浅外晕 */
const SELECT_PULSE_BLUE = new Color(70, 110, 220, 255);
const SELECT_PULSE_BLUE_SOFT = new Color(168, 186, 248, 255);
/** 周末大采购选中：亮冰蓝，比旧款沉蓝更跳，也不走珊瑚红。 */
const SELECT_PULSE_ICE = new Color(45, 156, 255, 255);
const SELECT_PULSE_ICE_SOFT = new Color(130, 210, 255, 255);

const Y_BUFFER = -524;
/** 周末大采购下半区对齐主线：台面托叠盘，柜台贴底。 */
const BULK_BAG_ZONE_Y = -300;
const BULK_BAG_ZONE_H = 380;
const BULK_FOOTER_Y = -614;
/** 周末大采购上半区：2×2 大格 + 右小票，贴主线冰箱墙，不另铺大底板。 */
const BULK_TRAY_W = 190;
const BULK_TRAY_H = 92;
const BULK_TRAY_GAP = 18;
const BULK_TRAY_DX = (BULK_TRAY_W + BULK_TRAY_GAP) / 2;
const BULK_TRAY_DY = (BULK_TRAY_H + BULK_TRAY_GAP) / 2;
const BULK_TRAY_BLOCK_X = -80;
const BULK_CLUSTER_Y = 288;
const BULK_RECEIPT_W = 148;
const BULK_RECEIPT_H = 276;
const BULK_RECEIPT_X = 214;
const WALNUT_SOFT = new Color(107, 74, 58, 168);
/** ≥5 列折两排：前排靠柜台，后排靠冰箱；深栈进后排。 */
const BAG_TWO_ROW_MIN = 5;
const BAG_BACK_SCALE = 0.92;
const BAG_FRONT_SEAT_Y = -380;
const BAG_ROW_GAP = 112;
/** 栈顶屏幕 y=632，木框底留白 24。 */
const BAG_TOP_LIMIT = 8;
const DESIGN_W = 720;
const DESIGN_H = 1280;
const BULK_PURCHASE_HOME_BTN = 'BulkPurchaseHomeBtn';
/** buffer_board.png 720×220 上三格奶油盘：中心相对木板中心（Y 向上）。 */
const BUF_BOARD_W = 720;
const BUF_BOARD_H = 220;
const BUF_SLOT_W = 168;
const BUF_SLOT_H = 140;
/** 柜台格里只放食物图标，不带托盘。 */
const BUF_FOOD = 112;
const BUF_WELL_Y = 16;
const BUF_WELL_XS = [-198, 0, 194];
/** food_milk_slot.png 宽高比。仅竖格（upright）冰箱内牛奶用这张扁盒。 */
const SLOT_MILK_ASPECT = 254 / 203;
/** 购物袋 / 横格冰箱内 food_milk 高盒，宽÷高。 */
const PLATE_MILK_ASPECT = 0.575;
/** food_sauce_slot.png 竖格扁瓶，宽÷高。 */
const SLOT_SAUCE_ASPECT = 127 / 102;
/** 叠盘 / 横格 food_sauce 立瓶，宽÷高。 */
const PLATE_SAUCE_ASPECT = 63 / 110;
/** 叠盘凹槽相对盘宽/盘高（对齐 bag_tray 256×151 中间浅碗，不含外圈厚边与最下前唇）。 */
const BAG_GROOVE_W = 0.84;
const BAG_GROOVE_H = 0.88;
/** 食材 bounding box 在凹槽内贴满比例。 */
const BAG_GROOVE_FILL = 0.95;
/** 冰箱格内一层 seat 里食材贴满比例；竖格 cap 大时 seat.h 很矮，另见 trayItemDrawSize。 */
const FRIDGE_SEAT_FILL = 0.95;
/** fx/hand_point.png 源尺寸；显示宽由引导场景定，高按比例，避免拉伸。 */
const HAND_POINT_W = 129;
const HAND_POINT_H = 153;
const L1_HAND_W = 118;
const L1_HAND_H = Math.round(L1_HAND_W * HAND_POINT_H / HAND_POINT_W);
const SWITCH_HAND_W = 108;
const SWITCH_HAND_H = Math.round(SWITCH_HAND_W * HAND_POINT_H / HAND_POINT_W);
const TRAY_FOOD_GAP = 4;
const FLY_SEC = 0.22;
const DOOR_SEC = 0.28;
/** 胜负判定后，延时再出结算（门合完/win 判定后计）。 */
const SETTLE_DELAY = 0.5;
const WHEAT = new Color(212, 176, 120, 255);
const TABLE_TOP = new Color(248, 240, 228, 255);
const TABLE_FRONT = new Color(186, 154, 122, 255);
const TABLE_SHADOW = new Color(61, 50, 41, 46);
const TABLE_SLOT = new Color(126, 92, 72, 120);
const TABLE_SLOT_INNER = new Color(255, 255, 255, 60);

const UUID = {
    foodMilk: '518eca01-d30f-4b58-8867-0cc149828d77@f9941',
    foodMilkSlot: '9e5ad93b-2679-494e-add7-757ba66a5731@f9941',
    foodVeg: 'daae9542-5e08-4113-b2ab-f4f41c5837c6@f9941',
    foodFruit: '87f8396a-b237-44ee-bfcf-6856a22a2794@f9941',
    foodMeat: '948637a0-ae61-4105-bbf7-ddf5988257e2@f9941',
    foodSauce: 'cc9a1cd4-86d6-4590-bf78-e264c01e8c06@f9941',
    foodSauceSlot: '05af3e78-422b-4121-9855-dbc306e06ef6@f9941',
    foodLeftover: '733073be-ff4d-475f-81a8-a047dc179820@f9941',
    foodGrape: '7c4e1a90-2b3d-4f5a-9c8e-1d2f3a4b5c6d@f9941',
    foodLemon: '8d5f2b01-3c4e-406b-ad9f-2e3a4b5c6d7e@f9941',
    foodKiwi: '9e603c12-4d5f-417c-bea0-3f4b5c6d7e8f@f9941',
    foodPineapple: 'af714d23-5e60-428d-cfb1-405c6d7e8f90@f9941',
    foodWatermelon: 'c1936f45-7082-44af-e1d3-627e8f901a2b@f9941',
    foodCoconut: 'b0825e34-6f71-439e-d0c2-516d7e8f901a@f9941',
    bagMilk: '30f16d44-c58b-40f0-9961-0e4af9e14c0a@f9941',
    bagVeg: 'f56ca46f-d09a-4eef-8c54-72aba7419d20@f9941',
    bagFruit: '6a76c6c7-4158-4329-8308-d37cb626a369@f9941',
    bagMeat: 'e2939c8d-697b-4a6f-84a0-d211a0d6b7f5@f9941',
    bagSauce: '09a0cb31-3c5e-4692-8143-ebc38a645aea@f9941',
    bagLeftover: '19169ab7-29dd-4620-8fb3-4a2f4fa4e349@f9941',
    bagGrape: '3c8e1f70-9a24-4d5b-b6c1-8e2f0a4d7b19@f9941',
    bagLemon: '4d9f2081-ab35-4e6c-87d2-9f3a1b5e8c20@f9941',
    bagKiwi: '5e0a3192-bc46-4f7d-98e3-a04b2c6f9d31@f9941',
    bagPineapple: '6f1b42a3-cd57-408e-a9f4-b15c3d70ae42@f9941',
    bagWatermelon: '701c53b4-de68-419f-8a05-c26d4e81bf53@f9941',
    bagCoconut: '812d64c5-ef79-42a0-8b16-d37e5f92c064@f9941',
    bgPlay: 'b4d8e2a0-6c19-4f3b-91d7-5e8a0c2f4b63@f9941',
    worktopTop: 'd1022f55-9340-4b85-ae10-2091d7f20002@f9941',
    worktopFront: 'd1032f55-9340-4b85-ae10-2091d7f20003@f9941',
    propBoard: 'd1202f55-9340-4b85-ae10-2091d7f20020@f9941',
    propCup: 'd1202f55-9340-4b85-ae10-2091d7f20021@f9941',
    propCloth: 'd1202f55-9340-4b85-ae10-2091d7f20022@f9941',
    bagHidden: 'd1052f55-9340-4b85-ae10-2091d7f20005@f9941',
    bagTrayLip: 'd1132f55-9340-4b85-ae10-2091d7f20013@f9941',
    bagTrayLower: 'd1142f55-9340-4b85-ae10-2091d7f20014@f9941',
    bagTrayTop: 'd1152f55-9340-4b85-ae10-2091d7f20015@f9941',
    bufferBoard: 'a41d431c-862d-48e8-9b57-b2cb36108f8e@f9941',
    iconUndo: '73fbe16c-3f5c-4230-854b-1948ab7cf28f@f9941',
    iconHome: 'c9f5b2d3-4e5f-6a7b-8c9d-0e1f2a3b4c5d@f9941',
    iconHint: '9be83f96-829c-4c60-9e25-590aa93e4e46@f9941',
    handPoint: 'e1c12f55-9340-4b85-ae10-2091d7f20051@f9941',
    winPerfect: 'd1312f55-9340-4b85-ae10-2091d7f20031@f9941',
    shareWin: 'd1402f55-9340-4b85-ae10-2091d7f20040@f9941',
    shareMilestone: 'd1412f55-9340-4b85-ae10-2091d7f20041@f9941',
    albumDoor: 'e3022f55-9340-4b85-ae10-2091d7f20062@f9941',
    albumDoorWide: 'e3032f55-9340-4b85-ae10-2091d7f20063@f9941',
    albumBadge: 'e3072f55-9340-4b85-ae10-2091d7f20067@f9941',
    albumBackBtn: '4b8c4d1f-8d8c-4c2e-a1d4-2b34d618b102@f9941',
    albumTitle: '119cb1fd-93cd-436b-b680-63f979d72451@f9941',
    homeSettings: '6d3c99ac-d73a-44bd-a6a9-543c9ee64001@f9941',
    btnStart: 'c2a1b3d4-e5f6-4789-8012-3f4a5b6c7d8e@f9941',
    builtin: '20835ba4-6145-4fbc-a58a-051ce700aa3e@f9941',
};

const HOME_NODES = ['Bg', 'BxTitle', 'HomeSubTitle', 'GameList', 'BtnSettings'];
const HOME_SETTINGS_X = -268;
const HOME_SETTINGS_Y = 538;
const SETTINGS_BTN_W = 96;
const SETTINGS_BTN_H = 96;
const SETTINGS_CARD_W = 560;
const SETTINGS_CARD_H = 600;
const SETTINGS_TOGGLE_W = 92;
const SETTINGS_TOGGLE_H = 44;
const CLEARED_KEY = 'fridge_cleared';
const MILESTONE_KEY = (n: number) => `fridge_milestone_${n}`;
const BULK_GUIDE_SEEN_KEY = 'bulk_weekend_guide_seen';
/** 新手引导先藏着，下个版本再开。 */
const BULK_GUIDE_ENABLED = false;
const MILESTONE_NS = [10, 20, 30];
/** 图鉴主面板尺寸（相对原 980 加高 200 试看）。 */
const ALBUM_PANEL_W = 640;
const ALBUM_PANEL_H = 1180;
/** 返回钮距面板底约 50px。 */
const ALBUM_CLOSE_Y = -ALBUM_PANEL_H / 2 + 50;
/** 图鉴按住分享。滑动列表里 260ms 会误触，规格改为 500ms。 */
const ALBUM_LONG_PRESS_MS = 500;
/** 位移超过这个值才当滑动，取消点按和长按。 */
const ALBUM_SCROLL_SLOP = 14;
/** 食材位移超过这个值才从点选变成拖动。 */
const DRAG_SLOP = 14;
/** 对局顶栏「第 N 关」胶囊。 */
const LEVEL_PILL_W = 252;
const LEVEL_PILL_H = 72;
const LEVEL_LABEL_FONT = 36;
const LEVEL_LABEL_LINE = 46;

type FoodDragSource = { kind: 'bag'; col: number } | { kind: 'buffer'; index: number };

type FoodPress = {
    id: number;
    source: FoodDragSource;
    item: FoodId;
    startX: number;
    startY: number;
    origin: Vec3;
    armed: boolean;
    ghost: Node | null;
    flyer: Node | null;
    hidden: Node | null;
    hover: Dest | null;
    hit: Dest | null;
    flyW: number;
    flyH: number;
};

type BulkDragCtx = {
    card: Node;
    demo: BulkPurchaseState;
    bagHost: Node;
    fridgeZone: Node;
    getCounterPanel: () => Node | null;
    onBagTap: (col: number) => void;
    pourQuiet: (counterIndex: number, trayIndex: number) => boolean;
    setTrayTarget: (index: number | null) => void;
    setBagTarget: (target: 'tray' | 'counter') => void;
    afterPlace: (trayIndex: number | null) => void;
};

const TOAST: Record<PlaceReason, string> = {
    wrong_kind: '这格只收牛奶',
    anti_split: '牛奶那格还没收满，不能新开一格',
    need_buffer: '冰箱放不下，先放到柜台',
    no_target: '先点要放进的格子',
    dest_full: '这格收好了，换一格',
};

@ccclass('GameController')
export class GameController extends Component {
    @property({ type: SpriteFrame })
    foodMilk: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodMilkSlot: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodVeg: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodFruit: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodMeat: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodSauce: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodSauceSlot: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodLeftover: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodGrape: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodLemon: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodKiwi: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodPineapple: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodWatermelon: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodCoconut: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    iconUndo: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    iconHome: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    iconHint: SpriteFrame | null = null;
    private handPoint: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    winPerfect: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    shareWin: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    shareMilestone: SpriteFrame | null = null;

    private albumDoor: SpriteFrame | null = null;
    private albumDoorWide: SpriteFrame | null = null;
    private albumBadge: SpriteFrame | null = null;
    private albumBackBtn: SpriteFrame | null = null;
    private albumTitle: SpriteFrame | null = null;
    private homeSettings: SpriteFrame | null = null;

    private board: BoardState | null = null;
    private playRoot: Node | null = null;
    private builtin: SpriteFrame | null = null;
    private bgPlay: SpriteFrame | null = null;
    private worktopTop: SpriteFrame | null = null;
    private worktopFront: SpriteFrame | null = null;
    private propBoard: SpriteFrame | null = null;
    private propCup: SpriteFrame | null = null;
    private propCloth: SpriteFrame | null = null;
    private bagHidden: SpriteFrame | null = null;
    private bagTrayLip: SpriteFrame | null = null;
    private bagTrayLower: SpriteFrame | null = null;
    private bagTrayTop: SpriteFrame | null = null;
    private bufferBoard: SpriteFrame | null = null;
    private btnStart: SpriteFrame | null = null;
    private bagFrames: Partial<Record<FoodId, SpriteFrame>> = {};
    private busy = false;
    /** 失败结算已经出现。这时角上的重开仍要能用。 */
    private levelFailed = false;
    private animateDoorIndex: number | null = null;
    private holdWin = false;
    private firstKindToast = true;
    private holdHintTrays: number[] = [];
    private holdHintBuffers: number[] = [];
    private holdHint: HintPick | null = null;
    private hintUsed = false;
    private sizeTeach: null | 'intro' | 'too_small' = null;
    private holdCapFlash: number | null = null;
    private holdShakeKind: FoodId | null = null;
    private revealBagCol: number | null = null;
    private lockedBagCol: number | null = null;
    /** 第 1 关尚未通关时，第一下落子前指向栈顶。 */
    private l1Guide = false;
    /** 开局锁定的购物袋前后排；null = 一排。整关不随翻层重排。 */
    private bagRowPlan: { front: number[]; back: number[] } | null = null;
    /** 按下食材后、松手前。超过 DRAG_SLOP 才 armed。 */
    private foodPress: FoodPress | null = null;
    /** 换关或清手势时递增，丢掉还在飞的拖动回调。 */
    private foodPressToken = 0;
    /** 这次触摸已经当成拖动或短按处理过，父节点不要再落子。 */
    private swallowedTouch = -2;
    private dropHalo: Node | null = null;
    private dropHaloDest: Dest | null = null;
    /** 通关刚跨过 10/20/30，回主页弹一次里程碑卡。 */
    private pendingMilestone: number | null = null;
    /** 第 1 关画面用到的图。齐了才进关。 */
    private level1Ready: Promise<void> | null = null;
    /** 第 1 关显示之后再补的其余关卡图。 */
    private restReady: Promise<void> | null = null;
    private albumReady: Promise<void> | null = null;
    /** 图鉴食材图。和其余关卡图分开，打开图鉴不必等胜利卡和柜台。 */
    private foodReady: Promise<void> | null = null;
    private bulkSettleLock = false;
    private bulkDragCtx: BulkDragCtx | null = null;
    private bulkPress: FoodPress | null = null;
    private bulkPulseTrayIndex: number | null = null;
    /** 图鉴缩略的格子位置。同一关、同一块区域只算一次。 */
    private albumCellCache: { [key: string]: { x: number; y: number; w: number; h: number; horizontal: boolean }[] } = {};
    private albumToken = 0;
    private enteringLevel = false;
    /** 控制台 gm(关卡号) 指定后，开始收拾进这一关。不改通关进度。 */
    private gmLevelId: number | null = null;

    onLoad() {
        // 自检含可见信息审计，同步跑会把预览进度条卡住。用 tools/run_level_selfchecks_19_30.ts。
        this.bindGm();
        this.bindHome();
        this.fitHomeBackground();
        this.refreshAlbumLink();
        void preloadSfx();
        void this.ensureLevel1Frames();
        void this.ensureRestFrames();
        void this.ensureAlbumFrames();
        void this.loadSlot(this.btnStart, UUID.btnStart, (frame) => { this.btnStart = frame; }).then(() => {
            if (this.node && this.node.isValid) this.polishHomeChrome();
        });
        void this.loadSlot(this.homeSettings, UUID.homeSettings, (frame) => { this.homeSettings = frame; }).then(() => {
            if (this.node && this.node.isValid) this.polishHomeChrome();
        });
    }

    /** 预览控制台：gm(24) 之后点「开始收拾」进第 24 关。gm(0) 取消。 */
    private bindGm() {
        const host = globalThis as { gm?: (level?: number) => void };
        host.gm = (level?: number) => {
            if (level == null || Number(level) === 0) {
                this.gmLevelId = null;
                console.log('[fridge] gm 已取消，开始收拾按通关进度进关');
                return;
            }
            const id = Math.floor(Number(level));
            const found = this.levelById(id);
            if (!found) {
                console.log(`[fridge] 没有第 ${level} 关`);
                return;
            }
            this.gmLevelId = id;
            console.log(`[fridge] 已指定第 ${id} 关，点开始收拾进入`);
        };
        console.log('[fridge] 调关：gm(24)，再点开始收拾');
    }

    private bindHome() {
        const btn = this.node.getChildByName('BtnStart');
        const startGame = () => {
            playBtnClick();
            this.startLevel(this.continueLevel());
        };
        if (btn) {
            if (!btn.getComponent(Button)) btn.addComponent(Button);
            btn.off(Node.EventType.TOUCH_END);
            btn.on(Node.EventType.TOUCH_END, startGame, this);
        }
        const vegMergeBtn = this.node.getChildByName('GameList')?.getChildByName('ModeVegMergeBtn');
        if (vegMergeBtn) {
            if (!vegMergeBtn.getComponent(Button)) vegMergeBtn.addComponent(Button);
            vegMergeBtn.off(Node.EventType.TOUCH_END);
            vegMergeBtn.on(Node.EventType.TOUCH_END, startGame, this);
        }
        const album = this.node.getChildByName('AlbumLink');
        if (album) {
            if (!album.getComponent(Button)) album.addComponent(Button);
            album.off(Node.EventType.TOUCH_END);
            album.on(Node.EventType.TOUCH_END, () => {
                playBtnClick();
                this.openAlbum();
            }, this);
        }
        const matchBtn = this.node.getChildByName('GameList')?.getChildByName('ModeMatchBtn');
        if (matchBtn) {
            if (!matchBtn.getComponent(Button)) matchBtn.addComponent(Button);
            matchBtn.off(Node.EventType.TOUCH_END);
            matchBtn.on(Node.EventType.TOUCH_END, () => {
                playBtnClick();
                this.openAlbum();
            }, this);
        }
        const settingsBtn = this.node.getChildByName('BtnSettings');
        if (settingsBtn) {
            this.bindHudPress(settingsBtn, () => {
                const open = this.node.getChildByName('SettingsLayer');
                if (open) return;
                this.openSettingsLayer();
            });
        }
        const merge = this.node.getChildByName('GameList')?.getChildByName('MergeHomeBtn');
        if (merge) {
            if (!merge.getComponent(Button)) merge.addComponent(Button);
            merge.off(Node.EventType.TOUCH_END);
            merge.on(Node.EventType.TOUCH_END, () => {
                playBtnClick();
                this.closeSettingsLayer();
                for (let i = 0; i < HOME_NODES.length; i++) {
                    const homeNode = this.node.getChildByName(HOME_NODES[i]);
                    if (homeNode) homeNode.active = false;
                }
                openMergeGame(this.node, () => {
                    for (let i = 0; i < HOME_NODES.length; i++) {
                        const homeNode = this.node.getChildByName(HOME_NODES[i]);
                        if (homeNode) homeNode.active = true;
                    }
                    this.polishHomeChrome();
                    this.refreshAlbumLink();
                });
            }, this);
        }
        const bulk = this.bulkPurchaseHomeEntry();
        if (bulk) {
            if (!bulk.getComponent(Button)) bulk.addComponent(Button);
            bulk.off(Node.EventType.TOUCH_END);
            bulk.on(Node.EventType.TOUCH_END, () => {
                playBtnClick();
                this.closeSettingsLayer();
                this.openBulkPurchaseLayer();
            }, this);
        }
        this.polishHomeChrome();
        this.refreshAlbumLink();
    }

    private ensureHomeSettingsBtn(): Node {
        let btn = this.node.getChildByName('BtnSettings');
        if (!btn) {
            btn = new Node('BtnSettings');
            btn.layer = UI_2D;
            this.node.addChild(btn);
            this.bindHudPress(btn, () => {
                const open = this.node.getChildByName('SettingsLayer');
                if (open) return;
                this.openSettingsLayer();
            });
        }
        btn.destroyAllChildren();
        const g = btn.getComponent(Graphics);
        if (g) g.destroy();
        const ui = btn.getComponent(UITransform) ?? btn.addComponent(UITransform);
        ui.setContentSize(116, 114);
        const sp = btn.getComponent(Sprite) ?? btn.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.color = Color.WHITE;
        if (this.homeSettings) sp.spriteFrame = this.homeSettings;
        btn.setSiblingIndex(this.node.children.length - 1);
        return btn;
    }

    private paintSettingsCircle(node: Node, diameter: number, color: Color): void {
        const ui = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        ui.setContentSize(diameter, diameter);
        const g = node.getComponent(Graphics) ?? node.addComponent(Graphics);
        g.clear();
        g.fillColor = color;
        g.circle(0, 0, diameter / 2);
        g.fill();
    }

    private paintSettingsGear(node: Node, outerR: number, innerR: number, holeR: number, color: Color, cutout: Color): void {
        const size = outerR * 2 + 8;
        const ui = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        ui.setContentSize(size, size);
        const g = node.getComponent(Graphics) ?? node.addComponent(Graphics);
        g.clear();
        g.fillColor = color;
        const teeth = 8;
        for (let i = 0; i < teeth * 2; i++) {
            const angle = -Math.PI / 2 + (i * Math.PI) / teeth;
            const radius = i % 2 === 0 ? outerR : innerR;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
        }
        g.close();
        g.fill();
        g.fillColor = cutout;
        g.circle(0, 0, holeR);
        g.fill();
    }

    /** 主页背景图按 cover 铺满可视区，避免高屏上露出纯色空白。 */
    private fitHomeBackground(): void {
        const bg = this.node.getChildByName('Bg');
        if (!bg) return;
        const ui = bg.getComponent(UITransform) ?? bg.addComponent(UITransform);
        const sp = bg.getComponent(Sprite);
        if (sp) sp.sizeMode = Sprite.SizeMode.CUSTOM;
        const size = this.canvasSize();
        const srcW = 750;
        const srcH = 1296;
        const scale = Math.max(size.w / srcW, size.h / srcH);
        ui.setContentSize(srcW * scale, srcH * scale);
        bg.setPosition(0, 0, 0);
    }

    /** 主页节点改由场景文件承载，这里只保底刷新文案和显隐。 */
    private polishHomeChrome() {
        this.fitHomeBackground();
        const btn = this.node.getChildByName('BtnStart');
        if (btn) {
            const labelNode = btn.getChildByName('Label');
            if (labelNode) {
                labelNode.active = true;
                const label = labelNode.getComponent(Label);
                if (label) {
                    label.string = '开始新玩法';
                    label.color = MILK;
                    label.fontSize = 32;
                    label.lineHeight = 42;
                    label.fontFamily = 'Microsoft YaHei';
                    label.horizontalAlign = Label.HorizontalAlign.CENTER;
                    label.verticalAlign = Label.VerticalAlign.CENTER;
                }
            }
        }
        const album = this.node.getChildByName('AlbumLink');
        if (album) album.active = false;
        const mask = this.node.getChildByName('HomeBarMask');
        if (mask) mask.active = false;
        const settingsBtn = this.node.getChildByName('BtnSettings');
        if (settingsBtn) settingsBtn.active = true;
        const bxTitle = this.node.getChildByName('BxTitle');
        if (bxTitle) bxTitle.active = true;
        const subTitle = this.node.getChildByName('HomeSubTitle');
        if (subTitle) subTitle.active = true;
        const gameList = this.node.getChildByName('GameList');
        if (gameList) gameList.active = true;
        this.closeSettingsLayer();
        this.closeBulkPurchaseLayer();
        this.refreshBulkHomeEntry();
    }

    private closeSettingsLayer(): void {
        const layer = this.node.getChildByName('SettingsLayer');
        if (layer) layer.destroy();
    }

    /** 周末大采购主页入口：场景 GameList/BulkPurchaseHomeBtn，文案与布局在编辑器维护。 */
    private bulkPurchaseHomeEntry(): Node | null {
        const list = this.node.getChildByName('GameList');
        if (!list) return null;
        return list.getChildByName(BULK_PURCHASE_HOME_BTN) ?? list.getChildByName('ModeKitchenBtn');
    }

    private refreshBulkHomeEntry(): void {
        const entry = this.bulkPurchaseHomeEntry();
        if (!entry) return;
        entry.active = true;
        const bg = entry.getComponent(Sprite);
        if (bg) bg.color = Color.WHITE;
        const subtitle = entry.getChildByName('Subtitle');
        const subtitleLabel = subtitle ? subtitle.getComponent(Label) : null;
        if (subtitleLabel) subtitleLabel.color = new Color(61, 50, 41, 255);
        const icon = entry.getChildByName('Icon');
        const iconSprite = icon ? icon.getComponent(Sprite) : null;
        if (iconSprite) iconSprite.color = new Color(208, 171, 118, 255);
        const shade = entry.getChildByName('LockShade');
        if (shade) shade.active = false;
        const badge = entry.getChildByName('LockBadge');
        if (badge) badge.active = false;
    }

    private showHomeToast(text: string): void {
        const old = this.node.getChildByName('HomeToast');
        if (old) old.destroy();
        const toast = new Node('HomeToast');
        toast.layer = UI_2D;
        toast.setPosition(0, 0, 0);
        const toastW = 560;
        const toastH = 64;
        toast.addComponent(UITransform).setContentSize(toastW, toastH);
        const g = toast.addComponent(Graphics);
        g.fillColor = new Color(61, 50, 41, 214);
        g.roundRect(-toastW / 2, -toastH / 2, toastW, toastH, 24);
        g.fill();
        this.node.addChild(toast);
        const label = this.addLabel(toast, 'Label', text, 24, MILK, toastW - 40, 36);
        label.setPosition(0, 0, 0);
        this.tuneLabel(label);
        this.scheduleOnce(() => {
            if (toast.isValid) toast.destroy();
        }, 1.2);
    }

    private closeBulkPurchaseLayer(): void {
        this.clearBulkPress();
        this.bulkDragCtx = null;
        this.bulkPulseTrayIndex = null;
        this.busy = false;
        const layer = this.node.getChildByName('BulkPurchaseLayer');
        if (layer) layer.destroy();
    }

    private makeBulkPrototypeDemo(runDef: BulkRunDef, stageIndex = 0): BulkPurchaseState {
        const demo = BulkPurchaseState.fromRun(runDef);
        if (stageIndex > 0) demo.startStage(stageIndex);
        demo.takeBranchCheckpoint();
        demo.takeStageCheckpoint();
        return demo;
    }

    private openBulkPurchaseLayer(runId?: string, stageIndex = 0): void {
        const proto = loadBulkPrototype(runId);
        if (!proto) {
            this.showHomeToast('这一关还铺不出来');
            return;
        }
        const stage = Math.max(0, Math.min(stageIndex, proto.run.stages.length - 1));
        let demo: BulkPurchaseState;
        try {
            demo = this.makeBulkPrototypeDemo(proto.run, stage);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            console.error(`[bulk] enter ${proto.run.id}/${stage} failed: ${message}`);
            this.showHomeToast('这一关还铺不出来');
            return;
        }
        this.closeBulkPurchaseLayer();
        this.bulkSettleLock = false;
        const size = this.canvasSize();
        validateBulkPrototype(proto);
        const layer = new Node('BulkPurchaseLayer');
        layer.layer = UI_2D;
        layer.addComponent(UITransform).setContentSize(size.w, size.h);
        this.node.addChild(layer);

        const dim = new Node('Dim');
        dim.layer = UI_2D;
        dim.setPosition(0, 0, 0);
        dim.addComponent(UITransform).setContentSize(size.w, size.h);
        const playBg = this.bgPlay;
        this.addSprite(dim, 'PlayBg', playBg || this.builtin, size.w, size.h, 0, 0, playBg ? Color.WHITE : CREAM);
        layer.addChild(dim);
        dim.on(Node.EventType.TOUCH_START, () => {}, this);
        dim.on(Node.EventType.TOUCH_MOVE, () => {}, this);
        dim.on(Node.EventType.TOUCH_END, () => {}, this);
        dim.on(Node.EventType.TOUCH_CANCEL, () => {}, this);

        const card = new Node('Card');
        card.layer = UI_2D;
        card.setPosition(0, 0, 0);
        card.addComponent(UITransform).setContentSize(DESIGN_W, DESIGN_H);
        layer.addChild(card);

        const topHeader = new Node('TopHeader');
        topHeader.layer = UI_2D;
        topHeader.setPosition(0, 0, 0);
        topHeader.addComponent(UITransform).setContentSize(720, 160);
        card.addChild(topHeader);

        const hudY = this.hudY();
        const home = new Node('BtnHome');
        home.layer = UI_2D;
        home.setPosition(-312, hudY, 0);
        home.addComponent(UITransform).setContentSize(88, 88);
        topHeader.addChild(home);
        this.addSprite(home, 'Icon', this.iconHome, 88, 88, 0, 0, Color.WHITE);
        this.bindHudPress(home, () => this.closeBulkPurchaseLayer());

        const titlePill = new Node('TitlePill');
        titlePill.layer = UI_2D;
        titlePill.setPosition(0, hudY, 0);
        titlePill.addComponent(UITransform).setContentSize(LEVEL_PILL_W, LEVEL_PILL_H);
        const titleG = titlePill.addComponent(Graphics);
        const titleR = LEVEL_PILL_H / 2;
        titleG.fillColor = MILK;
        titleG.roundRect(-LEVEL_PILL_W / 2, -titleR, LEVEL_PILL_W, LEVEL_PILL_H, titleR);
        titleG.fill();
        titleG.lineWidth = 2;
        titleG.strokeColor = new Color(107, 74, 58, 64);
        titleG.roundRect(-LEVEL_PILL_W / 2, -titleR, LEVEL_PILL_W, LEVEL_PILL_H, titleR);
        titleG.stroke();
        topHeader.addChild(titlePill);
        const protoIndex = bulkPrototypeIndex(proto.run.id);
        const titleLabel = this.addLabel(
            titlePill,
            'Label',
            `第 ${protoIndex + 1} 关`,
            LEVEL_LABEL_FONT,
            WALNUT,
            LEVEL_PILL_W - 20,
            LEVEL_LABEL_LINE,
        );
        this.tuneLabel(titleLabel, true);
        const titleLb = titleLabel.getComponent(Label);
        if (titleLb) titleLb.lineHeight = LEVEL_LABEL_LINE;

        const undo = this.addHudRoundBtn(topHeader, 'BtnUndo', 312, hudY);
        this.addSprite(undo, 'Icon', this.iconUndo, 48, 48, 0, 0, WALNUT);
        this.bindHudPress(undo, () => this.openBulkPurchaseLayer(proto.run.id, 0));

        const board = new Node('FridgeZone');
        board.layer = UI_2D;
        board.setPosition(0, BULK_CLUSTER_Y, 0);
        board.addComponent(UITransform).setContentSize(560, 360);
        card.addChild(board);

        const receiptZone = new Node('ReceiptZone');
        receiptZone.layer = UI_2D;
        const trayTop = BULK_CLUSTER_Y + BULK_TRAY_DY + BULK_TRAY_H / 2;
        receiptZone.setPosition(BULK_RECEIPT_X, trayTop - BULK_RECEIPT_H / 2, 0);
        receiptZone.addComponent(UITransform).setContentSize(BULK_RECEIPT_W, BULK_RECEIPT_H);
        card.addChild(receiptZone);

        const bagZone = new Node('BagZone');
        bagZone.layer = UI_2D;
        bagZone.setPosition(0, BULK_BAG_ZONE_Y, 0);
        bagZone.addComponent(UITransform).setContentSize(DESIGN_W, BULK_BAG_ZONE_H);
        card.addChild(bagZone);

        const counterZone = new Node('CounterZone');
        counterZone.layer = UI_2D;
        counterZone.setPosition(0, Y_BUFFER, 0);
        counterZone.addComponent(UITransform).setContentSize(BUF_BOARD_W, BUF_BOARD_H);
        card.addChild(counterZone);

        const footerZone = new Node('FooterZone');
        footerZone.layer = UI_2D;
        footerZone.setPosition(0, BULK_FOOTER_Y, 0);
        footerZone.addComponent(UITransform).setContentSize(300, 52);
        card.addChild(footerZone);

        let trayTargetIndex: number | null = demo.activeTrays.findIndex((tray) => !!tray && !tray.sealed && tray.filled < tray.cap);
        if (trayTargetIndex < 0) trayTargetIndex = null;

        const boxTitleChip = new Node('BoxTitleChip');
        boxTitleChip.layer = UI_2D;
        boxTitleChip.setPosition(0, 218, 0);
        boxTitleChip.addComponent(UITransform).setContentSize(244, 34);
        this.ensureBulkPillSkin(boxTitleChip, 'Bg', 244, 34, 17, Color.WHITE, new Color(255, 252, 247, 255), new Color(176, 130, 96, 120), 2);
        board.addChild(boxTitleChip);
        const boxTitle = this.addLabel(boxTitleChip, 'Label', '开放格 + 预告 + 小票', 20, WALNUT, 220, 24);
        boxTitle.setPosition(0, 0, 0);
        const boxBody = this.addLabel(board, 'BoxBody', '', 16, WALNUT, 600, 42);
        boxBody.setPosition(0, 214, 0);
        const boxBodyLabel = boxBody.getComponent(Label);
        if (boxBodyLabel) {
            boxBodyLabel.enableWrapText = true;
            boxBodyLabel.lineHeight = 22;
        }
        boxTitleChip.active = false;
        boxBody.active = false;
        let bagTarget: 'tray' | 'counter' = 'tray';
        let settleAfterMove = () => {};
        let handleBagTap = (_col: number) => {};
        const syncFooter = () => {
            const footer = footerZone.getChildByName('BulkFooter');
            if (footer) this.syncBulkP8Footer(footer, demo, stage + 1 < proto.run.stages.length);
        };
        let counterPanel: Node | null = null;
        let receipt: Node | null = null;
        const syncTrayDemo = () => {
            this.renderBulkP3QueueDemo(board, demo, bagTarget === 'tray' ? trayTargetIndex : null, (next) => {
                trayTargetIndex = next;
                bagTarget = 'tray';
                syncTrayDemo();
                if (counterPanel) this.syncBulkP4CounterDemo(counterPanel, demo, trayTargetIndex, bagTarget);
                syncBagDemo();
            });
            const pulseIdx = this.bulkPulseTrayIndex;
            this.bulkPulseTrayIndex = null;
            if (pulseIdx != null) this.pulseBulkTrayFood(board, pulseIdx);
        };
        const bagHost = new Node('BagHost');
        bagHost.layer = UI_2D;
        bagHost.setPosition(0, 0, 0);
        bagHost.addComponent(UITransform).setContentSize(DESIGN_W, BULK_BAG_ZONE_H);
        bagZone.addChild(bagHost);
        const syncBagDemo = () => {
            this.renderBulkP75BagDemo(bagHost, demo, trayTargetIndex, bagTarget);
            syncFooter();
        };
        syncTrayDemo();
        receipt = this.buildBulkP5ReceiptDemo(receiptZone);
        this.syncBulkP5ReceiptDemo(receipt, demo);

        const chip = this.addLabel(board, 'StepChip', '', 20, MILK, 140, 30);
        chip.setPosition(0, -230, 0);
        const chipBg = new Node('StepChipBg');
        chipBg.layer = UI_2D;
        chipBg.setPosition(0, -230, -1);
        chipBg.addComponent(UITransform).setContentSize(128, 36);
        this.ensureBulkPillSkin(chipBg, 'Bg', 128, 36, 18, SAGE, SAGE, null, 0);
        board.addChild(chipBg);
        chipBg.active = false;
        chip.active = false;
        chip.setSiblingIndex(board.children.length - 1);

        counterPanel = new Node('CounterPanel');
        counterPanel.layer = UI_2D;
        counterPanel.setPosition(0, 0, 0);
        counterPanel.addComponent(UITransform).setContentSize(BUF_BOARD_W, BUF_BOARD_H);
        counterZone.addChild(counterPanel);
        this.buildBulkP4CounterDemo(counterPanel, board, receipt, demo, () => trayTargetIndex, () => bagTarget, () => {
            bagTarget = 'counter';
            syncTrayDemo();
            this.syncBulkP4CounterDemo(counterPanel, demo, trayTargetIndex, bagTarget);
            syncBagDemo();
        }, () => {
            syncTrayDemo();
            this.syncBulkP4CounterDemo(counterPanel, demo, trayTargetIndex, bagTarget);
            syncBagDemo();
            settleAfterMove();
        }, () => {
            trayTargetIndex = null;
        });
        settleAfterMove = () => {
            this.settleBulkMove(layer, demo, proto.run.id, protoIndex, () => {
                trayTargetIndex = demo.activeTrays.findIndex((tray) => !!tray && !tray.sealed && tray.filled < tray.cap);
                if (trayTargetIndex < 0) trayTargetIndex = null;
                bagTarget = 'tray';
                syncTrayDemo();
                if (counterPanel) this.syncBulkP4CounterDemo(counterPanel, demo, trayTargetIndex, bagTarget);
                if (receipt) this.syncBulkP5ReceiptDemo(receipt, demo);
                syncBagDemo();
            });
        };
        handleBagTap = (col: number) => {
            if (this.busy || this.bulkSettleLock) return;
            const item = demo.peekBag(col);
            if (!item) return;
            const from = this.findBulkBagTop(bagHost, col);
            const commitBagPlace = () => {
                const placedTray = bagTarget === 'tray' ? trayTargetIndex : null;
                const slot = placedTray != null ? demo.activeTrays[placedTray] : null;
                let ok = false;
                if (bagTarget === 'tray') {
                    if (trayTargetIndex == null) return;
                    ok = demo.debugPlaceBagTopToTray(col, trayTargetIndex);
                } else {
                    ok = demo.debugPlaceBagTopToAnyCounter(col);
                }
                if (!ok) return;
                if (placedTray != null) {
                    const activeNow = demo.activeTrays[placedTray];
                    if (!activeNow || activeNow.sealed || activeNow.filled >= activeNow.cap) trayTargetIndex = null;
                    if (activeNow && activeNow.kind) this.bulkPulseTrayIndex = placedTray;
                    if (slot) this.playBulkFridgeArrive(slot.sealed);
                }
                syncTrayDemo();
                if (counterPanel) this.syncBulkP4CounterDemo(counterPanel, demo, trayTargetIndex, bagTarget);
                if (receipt) this.syncBulkP5ReceiptDemo(receipt, demo);
                if (counterPanel) this.syncBulkP6FailDemo(counterPanel, demo);
                syncBagDemo();
                settleAfterMove();
            };
            if (bagTarget === 'tray') {
                if (trayTargetIndex == null) {
                    this.showHomeToast('请先点一个可收的冰箱格');
                    return;
                }
                if (!demo.debugCanPlaceBagTopToTray(col, trayTargetIndex)) {
                    this.showHomeToast(demo.debugRejectsNewTray(item, trayTargetIndex)
                        ? this.bulkAntiSplitToast(item)
                        : '这件现在进不了当前目标格');
                    return;
                }
                const to = this.bulkFridgeLandNode(board, trayTargetIndex);
                if (from && to) this.flyBulkItem(card, from, to, item, { w: 48, h: 48 }, commitBagPlace, false);
                else commitBagPlace();
                return;
            }
            const counterIndex = demo.debugFindBagTopCounterIndex(col);
            if (counterIndex < 0 || !demo.debugCanPlaceBagTopToAnyCounter(col)) {
                this.showHomeToast('这件现在进不了柜台同种叠或空位');
                return;
            }
            const to = counterPanel?.getChildByName(`Counter${counterIndex}`);
            if (from && to) this.flyBulkItem(card, from, to, item, { w: BUF_FOOD, h: BUF_FOOD }, commitBagPlace, false);
            else commitBagPlace();
        };
        this.bulkDragCtx = {
            card,
            demo,
            bagHost,
            fridgeZone: board,
            getCounterPanel: () => counterPanel,
            onBagTap: (col) => handleBagTap(col),
            pourQuiet: (counterIndex, trayIndex) => this.pourBulkP4Counter(
                board,
                counterPanel as Node,
                receipt as Node,
                demo,
                counterIndex,
                trayIndex,
                true,
                () => {
                    syncTrayDemo();
                    this.syncBulkP4CounterDemo(counterPanel as Node, demo, trayTargetIndex, bagTarget);
                    syncBagDemo();
                    settleAfterMove();
                },
                () => {
                    trayTargetIndex = null;
                },
            ),
            setTrayTarget: (index) => {
                trayTargetIndex = index;
            },
            setBagTarget: (target) => {
                bagTarget = target;
            },
            afterPlace: (placedTray) => {
                if (placedTray != null) {
                    const activeNow = demo.activeTrays[placedTray];
                    if (!activeNow || activeNow.sealed || activeNow.filled >= activeNow.cap) trayTargetIndex = null;
                    if (activeNow && activeNow.kind) this.bulkPulseTrayIndex = placedTray;
                }
                syncTrayDemo();
                if (counterPanel) this.syncBulkP4CounterDemo(counterPanel, demo, trayTargetIndex, bagTarget);
                if (receipt) this.syncBulkP5ReceiptDemo(receipt, demo);
                if (counterPanel) this.syncBulkP6FailDemo(counterPanel, demo);
                syncBagDemo();
                settleAfterMove();
            },
        };
        syncBagDemo();
        if (BULK_GUIDE_ENABLED && sys.localStorage.getItem(BULK_GUIDE_SEEN_KEY) !== '1') this.openBulkGuideLayer(layer);
    }

    private settleBulkMove(
        layer: Node,
        demo: BulkPurchaseState,
        runId: string,
        protoIndex: number,
        resync: () => void,
    ): void {
        if (this.bulkSettleLock || !layer.isValid) return;
        if (demo.isStageResolved()) {
            try {
                if (demo.advanceStage()) {
                    demo.takeStageCheckpoint();
                    demo.takeBranchCheckpoint();
                    resync();
                    this.showHomeToast('这一袋收好了');
                    return;
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`[bulk] next stage ${runId} failed: ${message}`);
                this.showHomeToast('下一趟还铺不出来');
                return;
            }
            this.bulkSettleLock = true;
            const nextRunId = nextBulkRunId(runId);
            this.scheduleOnce(() => {
                if (!layer.isValid) return;
                this.spawnBulkWinCard(layer, demo.steps, protoIndex, nextRunId);
            }, SETTLE_DELAY);
            return;
        }
        const reason = demo.detectFail();
        if (!reason) {
            demo.takeBranchCheckpoint();
            return;
        }
        this.bulkSettleLock = true;
        this.scheduleOnce(() => {
            if (!layer.isValid) return;
            playSfx('game_failed');
            this.flashBulkFail(layer, reason, () => {
                this.spawnBulkFailCard(layer, reason, demo, runId, resync);
            });
        }, SETTLE_DELAY);
    }

    private flashBulkFail(layer: Node, reason: FailReason, done: () => void): void {
        const card = layer.getChildByName('Card');
        const targets: Node[] = [];
        if (reason === 'buffer_full') {
            const panel = card?.getChildByName('CounterZone')?.getChildByName('CounterPanel');
            for (let i = 0; i < 3; i++) {
                const slot = panel?.getChildByName(`Counter${i}`);
                if (slot) targets.push(slot);
            }
        } else {
            const shell = card?.getChildByName('FridgeZone')?.getChildByName('TrayDemo');
            if (shell) {
                for (let i = 0; i < 4; i++) {
                    const tray = shell.getChildByName(`BulkTray${i}`);
                    if (tray) targets.push(tray);
                }
            }
        }
        for (let i = 0; i < targets.length; i++) this.pulseCoral(targets[i]);
        this.scheduleOnce(done, 0.42);
    }

    private spawnBulkFailCard(
        layer: Node,
        reason: FailReason,
        demo: BulkPurchaseState,
        runId: string,
        resync: () => void,
    ): void {
        const old = layer.getChildByName('FailCard');
        if (old) old.destroy();
        const locked = reason === 'locked_out';
        const desc = locked ? '退回到还能收的一步' : '退回本关还能继续的位置';
        const cta = locked ? '退回可收的一步' : '退回保底点';

        const swallow = new Node('FailCard');
        swallow.layer = UI_2D;
        swallow.setPosition(0, 0, 0);
        swallow.addComponent(UITransform).setContentSize(DESIGN_W, DESIGN_H);
        const hit = swallow.addComponent(Graphics);
        hit.fillColor = new Color(255, 255, 255, 1);
        hit.rect(-DESIGN_W / 2, -DESIGN_H / 2, DESIGN_W, DESIGN_H);
        hit.fill();
        swallow.on(Node.EventType.TOUCH_START, () => {}, this);
        layer.addChild(swallow);

        const card = new Node('Card');
        card.layer = UI_2D;
        card.setPosition(0, -40, 0);
        card.setScale(0.86, 0.86, 1);
        card.addComponent(UITransform).setContentSize(600, 460);
        const cg = card.addComponent(Graphics);
        cg.fillColor = CREAM;
        cg.roundRect(-300, -230, 600, 460, 36);
        cg.fill();
        cg.lineWidth = 3;
        cg.strokeColor = new Color(107, 74, 58, 50);
        cg.roundRect(-300, -230, 600, 460, 36);
        cg.stroke();
        const cardOp = card.addComponent(UIOpacity);
        cardOp.opacity = 0;
        swallow.addChild(card);

        if (locked) this.addBulkLockedFailTitle(card, demo);
        else {
            const titleNode = this.addLabel(card, 'FailTitle', '柜台堆满了', 40, WALNUT, 520, 52);
            titleNode.setPosition(0, 168, 0);
            this.tuneLabel(titleNode, true);
        }
        const body = this.addLabel(card, 'FailDesc', desc, 26, FRAME, 520, 72);
        body.setPosition(0, 108, 0);
        this.tuneLabel(body);
        const bodyLb = body.getComponent(Label);
        if (bodyLb) {
            bodyLb.enableWrapText = true;
            bodyLb.overflow = Label.Overflow.CLAMP;
        }

        const main = new Node('FailCta');
        main.layer = UI_2D;
        main.setPosition(0, 18, 0);
        main.addComponent(UITransform).setContentSize(480, 88);
        const mg = main.addComponent(Graphics);
        mg.fillColor = CORAL;
        mg.roundRect(-240, -44, 480, 88, 44);
        mg.fill();
        const ctaLabel = this.addLabel(main, 'Txt', cta, 32, MILK, 440, 48);
        this.tuneLabel(ctaLabel, true);
        card.addChild(main);
        this.bindHudPress(main, () => {
            if (locked) demo.debugResolveLockedOut();
            else demo.debugResolveBufferFull();
            this.bulkSettleLock = false;
            if (swallow.isValid) swallow.destroy();
            resync();
        });

        const share = new Node('FailShare');
        share.layer = UI_2D;
        share.setPosition(0, -86, 0);
        share.addComponent(UITransform).setContentSize(480, 80);
        const sg = share.addComponent(Graphics);
        sg.fillColor = MILK;
        sg.roundRect(-240, -40, 480, 80, 40);
        sg.fill();
        sg.lineWidth = 2;
        sg.strokeColor = new Color(107, 74, 58, 51);
        sg.roundRect(-240, -40, 480, 80, 40);
        sg.stroke();
        const shareLabel = this.addLabel(share, 'Txt', '让好友也收这一层', 28, WALNUT, 440, 44);
        this.tuneLabel(shareLabel);
        card.addChild(share);
        const protoIndex = bulkPrototypeIndex(runId);
        this.bindHudPress(share, () => {
            this.showHomeToast(`第 ${protoIndex + 1} 关这层我收不进去了`);
        });

        const retry = this.addLabel(card, 'FailRetry', '重开本关', 26, new Color(107, 74, 58, 153), 280, 40);
        retry.setPosition(0, -168, 0);
        this.tuneLabel(retry);
        this.bindHudPress(retry, () => this.openBulkPurchaseLayer(runId, 0));

        tween(cardOp).to(0.2, { opacity: 255 }).start();
        tween(card)
            .to(0.32, { position: new Vec3(0, 0, 0), scale: new Vec3(1.04, 1.04, 1) }, { easing: easing.backOut })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private addBulkLockedFailTitle(card: Node, demo: BulkPurchaseState): void {
        const kind = demo.debugLockedOutKind();
        const frame = kind ? (this.frameForBag(kind) || this.frameForFood(kind)) : null;
        if (!kind || !frame) {
            const titleNode = this.addLabel(card, 'FailTitle', '这格锁错了', 40, WALNUT, 520, 52);
            titleNode.setPosition(0, 168, 0);
            this.tuneLabel(titleNode, true);
            return;
        }
        const fitted = this.fitAspect(this.foodKindAspect(kind), 48, 48);
        const iconW = Math.max(28, Math.round(fitted.w));
        const iconH = Math.max(28, Math.round(fitted.h));
        const gap = 8;
        const textW = 132;
        const rowW = iconW + gap + textW;
        const row = new Node('FailTitle');
        row.layer = UI_2D;
        row.setPosition(0, 168, 0);
        row.addComponent(UITransform).setContentSize(rowW, 52);
        card.addChild(row);
        this.addSprite(row, 'Icon', frame, iconW, iconH, -rowW / 2 + iconW / 2, 0, Color.WHITE);
        const text = this.addLabel(row, 'Txt', '锁错了', 40, WALNUT, textW, 52);
        text.setPosition(-rowW / 2 + iconW + gap + textW / 2, 0, 0);
        this.tuneLabel(text, true);
        const lb = text.getComponent(Label);
        if (lb) {
            lb.horizontalAlign = Label.HorizontalAlign.LEFT;
            lb.overflow = Label.Overflow.NONE;
        }
    }

    private spawnBulkWinCard(layer: Node, steps: number, protoIndex: number, nextRunId?: string): void {
        const old = layer.getChildByName('WinPack');
        if (old) old.destroy();
        playSfx('win_tg');
        const size = this.canvasSize();
        const wrap = new Node('WinPack');
        wrap.layer = UI_2D;
        wrap.setPosition(0, 0, 0);
        wrap.addComponent(UITransform).setContentSize(size.w, size.h);
        wrap.on(Node.EventType.TOUCH_START, () => {}, this);
        layer.addChild(wrap);

        const dim = this.addSprite(wrap, 'WinDim', this.builtin, size.w, size.h, 0, 0, new Color(48, 48, 48, 255));
        const dimOp = dim.addComponent(UIOpacity);
        dimOp.opacity = 0;
        tween(dimOp).to(0.4, { opacity: 178 }, { easing: easing.quadOut }).start();

        if (this.winPerfect) {
            const stamp = this.addWinPerfectStamp(wrap, 0, 470, 560);
            stamp.setScale(stamp.scale.x * 0.7, stamp.scale.y * 0.7, 1);
            const stampOp = stamp.addComponent(UIOpacity);
            stampOp.opacity = 0;
            const s = stamp.scale.x / 0.7;
            tween(stampOp).to(0.24, { opacity: 255 }).start();
            tween(stamp)
                .to(0.36, { scale: new Vec3(s * 1.04, s * 1.04, 1) }, { easing: easing.backOut })
                .to(0.1, { scale: new Vec3(s, s, 1) })
                .start();
        } else {
            const fallback = this.addLabel(wrap, 'WinStamp', '完美收纳！', 48, new Color(248, 240, 220, 255), 520, 58);
            fallback.setPosition(0, 470, 0);
            this.tuneLabel(fallback, true);
        }

        const cardW = 560;
        const cardH = 640;
        const card = new Node('WinCard');
        card.layer = UI_2D;
        card.setPosition(0, -48, 0);
        card.setScale(0.82, 0.82, 1);
        card.addComponent(UITransform).setContentSize(cardW, cardH);
        const cg = card.addComponent(Graphics);
        cg.fillColor = new Color(61, 50, 41, 36);
        cg.roundRect(-cardW / 2 + 8, -cardH / 2 - 12, cardW, cardH, 40);
        cg.fill();
        cg.fillColor = new Color(255, 249, 239, 255);
        cg.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 40);
        cg.fill();
        const cardOp = card.addComponent(UIOpacity);
        cardOp.opacity = 0;
        wrap.addChild(card);

        const trophy = this.makeTrophyFridge();
        trophy.setPosition(0, 196, 0);
        trophy.setScale(0.12, 0.12, 1);
        card.addChild(trophy);

        const status = this.addLabel(card, 'WinStatus', '这一关收好了', 30, WALNUT, 480, 40);
        status.setPosition(0, 64, 0);
        status.setScale(0, 0, 1);
        this.tuneLabel(status, true);

        const stepsNode = new Node('WinSteps');
        stepsNode.layer = UI_2D;
        stepsNode.setPosition(0, -28, 0);
        stepsNode.setScale(0, 0, 1);
        stepsNode.addComponent(UITransform).setContentSize(500, 120);
        card.addChild(stepsNode);
        const stepSize = 108;
        const unitSize = Math.round(stepSize * 0.5);
        const digits = String(steps).length;
        const numW = Math.max(unitSize, digits * Math.round(stepSize * 0.62));
        const unitW = unitSize + 8;
        const gap = 6;
        const totalW = numW + gap + unitW;
        const stepNum = this.addLabel(stepsNode, 'Num', `${steps}`, stepSize, CORAL, numW + 20, 120);
        const stepUnit = this.addLabel(stepsNode, 'Unit', '步', unitSize, CORAL, unitW, 64);
        stepNum.setPosition(-totalW / 2 + numW / 2, 0, 0);
        stepUnit.setPosition(totalW / 2 - unitW / 2, -Math.round(stepSize * 0.16), 0);

        const nextLabel = nextRunId ? '下一关  >' : '回主页';
        const nextBtn = this.makeWinPrimaryBtn(card, 'BtnNext', nextLabel, 0, -168);
        nextBtn.setScale(0, 0, 1);
        const shareBtn = this.makeWinSecondaryBtn(card, 'BtnShareSteps', '分享步数', 0, -268);
        shareBtn.setScale(0, 0, 1);

        tween(cardOp).to(0.22, { opacity: 255 }).start();
        tween(card)
            .to(0.4, { position: new Vec3(0, -28, 0), scale: new Vec3(1.03, 1.03, 1) }, { easing: easing.backOut })
            .to(0.12, { scale: new Vec3(1, 1, 1) })
            .start();
        this.scheduleOnce(() => {
            tween(trophy)
                .to(0.32, { scale: new Vec3(0.78, 0.78, 1) }, { easing: easing.backOut })
                .to(0.1, { scale: new Vec3(0.7, 0.7, 1) })
                .start();
        }, 0.16);
        this.scheduleOnce(() => {
            tween(status).to(0.22, { scale: new Vec3(1, 1, 1) }, { easing: easing.backOut }).start();
        }, 0.34);
        this.scheduleOnce(() => {
            tween(stepsNode)
                .to(0.3, { scale: new Vec3(1.12, 1.12, 1) }, { easing: easing.backOut })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
        }, 0.48);
        this.scheduleOnce(() => {
            tween(nextBtn)
                .to(0.28, { scale: new Vec3(1.06, 1.06, 1) }, { easing: easing.backOut })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
        }, 0.66);
        this.scheduleOnce(() => {
            tween(shareBtn)
                .to(0.26, { scale: new Vec3(1.04, 1.04, 1) }, { easing: easing.backOut })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
        }, 0.78);

        this.bindHudPress(nextBtn, () => {
            if (nextRunId) this.openBulkPurchaseLayer(nextRunId, 0);
            else this.closeBulkPurchaseLayer();
        });
        this.bindHudPress(shareBtn, () => {
            this.showHomeToast(`第 ${protoIndex + 1} 关我收好了，用了 ${steps} 步`);
        });
    }

    private renderBulkP3QueueDemo(
        parent: Node,
        demo: BulkPurchaseState,
        selectedTrayIndex: number | null,
        onSelectTray: (index: number) => void,
    ): void {
        const old = parent.getChildByName('TrayDemo');
        if (old) old.destroy();
        const shell = new Node('TrayDemo');
        shell.layer = UI_2D;
        parent.addChild(shell);
        const positions = [
            { x: BULK_TRAY_BLOCK_X - BULK_TRAY_DX, y: BULK_TRAY_DY },
            { x: BULK_TRAY_BLOCK_X + BULK_TRAY_DX, y: BULK_TRAY_DY },
            { x: BULK_TRAY_BLOCK_X - BULK_TRAY_DX, y: -BULK_TRAY_DY },
            { x: BULK_TRAY_BLOCK_X + BULK_TRAY_DX, y: -BULK_TRAY_DY },
        ];
        for (let i = 0; i < 4; i++) {
            const tray = demo.activeTrays[i];
            if (!tray) continue;
            const open = !tray.sealed && tray.filled < tray.cap;
            const tone = !open
                ? 'blocked'
                : i === selectedTrayIndex
                    ? 'selected'
                    : 'idle';
            const node = this.addBulkP3TrayCard(shell, tray.cap, tray.filled, tray.kind || null, positions[i].x, positions[i].y, tone, i);
            if (open) {
                if (!node.getComponent(Button)) node.addComponent(Button);
                this.bindHudPress(node, () => onSelectTray(i));
            }
        }

        const preview = demo.previewTrays();
        const showCount = Math.min(preview.length, Math.max(0, demo.stageDef.queuePreview));
        if (showCount > 0) {
            const row = new Node('QueuePreview');
            row.layer = UI_2D;
            const captionW = 120;
            const pillW = 76;
            const pillH = 36;
            const pillGap = 8;
            const captionGap = 10;
            const rowW = captionW + captionGap + showCount * pillW + (showCount - 1) * pillGap;
            row.setPosition(BULK_TRAY_BLOCK_X, -BULK_TRAY_DY - BULK_TRAY_H / 2 - 16 - pillH / 2, 0);
            row.addComponent(UITransform).setContentSize(rowW, pillH);
            shell.addChild(row);
            const caption = this.addLabel(row, 'Caption', '收满后补进', 20, WALNUT, captionW, 28);
            caption.setPosition(-rowW / 2 + captionW / 2, 0, 0);
            this.tuneLabel(caption, true);
            for (let i = 0; i < showCount; i++) {
                const cap = preview[i] ? preview[i].cap : 0;
                const x = -rowW / 2 + captionW + captionGap + pillW / 2 + i * (pillW + pillGap);
                const node = new Node(`Preview${i}`);
                node.layer = UI_2D;
                node.setPosition(x, 0, 0);
                node.addComponent(UITransform).setContentSize(pillW, pillH);
                this.ensureRoundedBg(
                    node,
                    'Bg',
                    pillW,
                    pillH,
                    pillH / 2,
                    new Color(255, 252, 247, 236),
                    new Color(176, 130, 96, 90),
                    2,
                );
                row.addChild(node);
                const label = this.addLabel(node, 'Label', `${cap}格`, 22, WALNUT, pillW - 10, 26);
                label.setPosition(0, 0, 0);
                this.tuneLabel(label, true);
                if (i > 0) {
                    const fade = node.addComponent(UIOpacity);
                    fade.opacity = 170;
                }
            }
        }
    }

    private renderBulkP75BagDemo(
        parent: Node,
        demo: BulkPurchaseState,
        trayTargetIndex: number | null,
        target: 'tray' | 'counter',
    ): void {
        const old = parent.getChildByName('BagDemo');
        if (old) old.destroy();
        const layerCard = parent.parent?.parent || null;
        if (layerCard) {
            const staleBar = layerCard.getChildByName('ControlBar');
            if (staleBar) staleBar.destroy();
        }
        const shell = new Node('BagDemo');
        shell.layer = UI_2D;
        parent.addChild(shell);
        const columnCount = Math.max(1, demo.bags.length);
        const tableTop = this.worktopTop
            ? this.addSprite(shell, 'TableTop', this.worktopTop, DESIGN_W, BULK_BAG_ZONE_H, 0, 0, Color.WHITE)
            : null;
        if (tableTop) tableTop.setSiblingIndex(0);
        const titleChip = new Node('TitleChip');
        titleChip.layer = UI_2D;
        titleChip.setPosition(-250, 76, 0);
        titleChip.addComponent(UITransform).setContentSize(188, 30);
        this.ensureBulkPillSkin(titleChip, 'Bg', 188, 30, 15, Color.WHITE, new Color(255, 252, 247, 255), new Color(176, 130, 96, 108), 2);
        shell.addChild(titleChip);
        const title = this.addLabel(titleChip, 'Label', `购物袋顶层 · ${columnCount} 列`, 16, WALNUT, 164, 20);
        title.setPosition(0, 0, 0);
        titleChip.active = false;

        const rowCount = columnCount >= BAG_TWO_ROW_MIN ? 2 : 1;
        const topCount = rowCount === 2 ? Math.ceil(columnCount / 2) : columnCount;
        const bottomCount = rowCount === 2 ? Math.max(0, columnCount - topCount) : 0;
        const layoutCols = rowCount === 2 ? Math.max(topCount, bottomCount, 1) : columnCount;
        const layout = this.bagLayout(layoutCols);
        const frontSeat = (rowCount === 2 ? BAG_FRONT_SEAT_Y : -360) - BULK_BAG_ZONE_Y;
        const backSeat = frontSeat + BAG_ROW_GAP + 30;
        for (let i = 0; i < columnCount; i++) {
            const item = demo.peekBag(i);
            const depth = demo.bagDepth(i);
            if (!item || depth <= 0) continue;
            const card = new Node(`BagCol${i}`);
            card.layer = UI_2D;
            const topRow = rowCount === 1 || i < topCount;
            const indexInRow = rowCount === 1 || topRow ? i : i - topCount;
            const rowCols = rowCount === 1 ? columnCount : topRow ? topCount : bottomCount;
            const scale = rowCount === 2 && topRow ? BAG_BACK_SCALE : 1;
            const shown = this.shownStack(depth);
            const stackH = Math.max(layout.trayH, this.columnHeight(layout, depth));
            const seat = rowCount === 1 ? frontSeat : topRow ? backSeat : frontSeat;
            const x = (indexInRow - (rowCols - 1) / 2) * (layout.w + layout.gap);
            card.setPosition(x, seat + (stackH * scale) / 2, 0);
            card.addComponent(UITransform).setContentSize(layout.w, stackH);
            card.setScale(scale, scale, 1);
            const canPlace = target === 'tray'
                ? trayTargetIndex != null && demo.debugCanPlaceBagTopToTray(i, trayTargetIndex)
                : demo.debugCanPlaceBagTopToAnyCounter(i);
            const strokeColor = canPlace ? SAGE : new Color(160, 130, 120, 180);
            const layers = Math.max(1, shown);
            for (let layer = 0; layer < layers; layer++) {
                const isTop = layer === layers - 1;
                const y = -stackH / 2 + layout.trayH / 2 + layer * layout.step;
                const tile = this.addSprite(
                    card,
                    isTop ? 'TopTray' : `BackTray${layer}`,
                    isTop
                        ? (this.bagTrayTop || this.bagTrayLower || this.builtin)
                        : (this.bagTrayLower || this.bagTrayTop || this.builtin),
                    layout.w,
                    layout.trayH,
                    0,
                    y,
                    isTop && item ? this.trayTint(item) : new Color(244, 238, 230, 255),
                );
                if (isTop && item) {
                    const foodSize = this.bagFoodSize(item, layout);
                    const foodY = Math.round(layout.trayH * -0.04) + Math.round(foodSize.h * 0.22);
                    const iconFrame = this.frameForBag(item) || this.frameForFood(item);
                    if (iconFrame) {
                        this.addSprite(tile, 'Icon', iconFrame, foodSize.w, foodSize.h, 0, foodY, Color.WHITE);
                    }
                }
            }
            const ring = new Node('PlaceRing');
            ring.layer = UI_2D;
            ring.setPosition(0, -stackH / 2 + layout.trayH / 2 + (layers - 1) * layout.step, 0);
            ring.addComponent(UITransform).setContentSize(layout.w, layout.trayH);
            card.addChild(ring);
            this.ensureRoundedBg(ring, 'Bg', layout.w, layout.trayH, 18, new Color(0, 0, 0, 0), strokeColor, 2);
            shell.addChild(card);
            const lipY = -stackH / 2 + (layers - 1) * layout.step + 12;
            const badge = new Node('Left');
            badge.layer = UI_2D;
            badge.setPosition(0, lipY, 0);
            badge.addComponent(UITransform).setContentSize(62, 30);
            this.ensureRoundedBg(
                badge,
                'Bg',
                62,
                30,
                12,
                new Color(255, 252, 247, 230),
                new Color(107, 74, 58, 48),
                1,
            );
            card.addChild(badge);
            const left = this.addLabel(badge, 'Label', `x${depth}`, 25, Color.BLACK, 56, 28);
            left.setPosition(0, 0, 0);
            this.tuneLabel(left, true);
            card.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
                const top = demo.peekBag(i);
                if (top) this.beginBulkPointer(e, { kind: 'bag', col: i }, top);
            }, this);
            card.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => this.moveBulkPointer(e), this);
            card.on(Node.EventType.TOUCH_END, (e: EventTouch) => this.endBulkPointer(e), this);
            card.on(Node.EventType.TOUCH_CANCEL, (e: EventTouch) => this.endBulkPointer(e), this);
        }
        const tableFront = this.worktopFront
            ? this.addSprite(shell, 'TableFront', this.worktopFront, DESIGN_W, 120, 0, Y_BUFFER + 76 - BULK_BAG_ZONE_Y, Color.WHITE)
            : null;
        if (tableFront) tableFront.setSiblingIndex(shell.children.length - 1);
    }

    private buildBulkP5ReceiptDemo(parent: Node): Node {
        const receipt = new Node('ReceiptPanel');
        receipt.layer = UI_2D;
        receipt.setPosition(0, 0, 0);
        receipt.addComponent(UITransform).setContentSize(BULK_RECEIPT_W, BULK_RECEIPT_H);
        this.ensureRoundedBg(receipt, 'Bg', BULK_RECEIPT_W, BULK_RECEIPT_H, 20, new Color(250, 252, 255, 255), new Color(122, 158, 176, 90));
        parent.addChild(receipt);
        const title = this.addLabel(receipt, 'Title', '购物小票', 22, WALNUT, BULK_RECEIPT_W - 16, 30);
        title.setPosition(0, BULK_RECEIPT_H / 2 - 28, 0);
        this.tuneLabel(title, true);
        const rule = new Node('Rule');
        rule.layer = UI_2D;
        rule.setPosition(0, BULK_RECEIPT_H / 2 - 48, 0);
        rule.addComponent(UITransform).setContentSize(100, 2);
        const ruleG = rule.addComponent(Graphics);
        ruleG.fillColor = new Color(176, 130, 96, 70);
        ruleG.roundRect(-50, -1, 100, 2, 1);
        ruleG.fill();
        receipt.addChild(rule);
        return receipt;
    }

    private syncBulkP5ReceiptDemo(receipt: Node, demo: BulkPurchaseState): void {
        for (let i = receipt.children.length - 1; i >= 0; i--) {
            const child = receipt.children[i];
            if (child.name.startsWith('Row')) child.destroy();
        }
        const kinds = FOOD_IDS.filter((id) => (demo.stageDef.receipt[id] || 0) > 0);
        for (let i = 0; i < kinds.length; i++) {
            const id = kinds[i];
            const row = new Node(`Row${i}`);
            row.layer = UI_2D;
            row.setPosition(0, BULK_RECEIPT_H / 2 - 78 - i * 44, 0);
            row.addComponent(UITransform).setContentSize(BULK_RECEIPT_W - 20, 36);
            receipt.addChild(row);
            const iconFrame = this.frameForBag(id) || this.frameForFood(id);
            if (iconFrame) {
                const icon = this.addSprite(row, 'Icon', iconFrame, 32, 32, -30, 0, Color.WHITE);
                icon.setScale(1, 1, 1);
            }
            const count = this.addLabel(row, 'Count', `x${demo.receiptRemaining[id] || 0}`, 24, WALNUT, 56, 28);
            count.setPosition(26, 0, 0);
            this.tuneLabel(count, true);
        }
    }

    private buildBulkP4CounterDemo(
        panel: Node,
        board: Node,
        receipt: Node,
        demo: BulkPurchaseState,
        getTrayTargetIndex: () => number | null,
        getBagTarget: () => 'tray' | 'counter',
        onSelectCounter: () => void,
        extraSync: () => void,
        clearTrayTarget: () => void,
    ): void {
        const slotW = BUF_SLOT_W;
        const slotH = BUF_SLOT_H;
        const titleChip = new Node('TitleChip');
        titleChip.layer = UI_2D;
        titleChip.setPosition(-278, 64, 0);
        titleChip.addComponent(UITransform).setContentSize(92, 30);
        this.ensureBulkPillSkin(titleChip, 'Bg', 92, 30, 15, Color.WHITE, new Color(255, 252, 247, 255), new Color(176, 130, 96, 108), 2);
        panel.addChild(titleChip);
        const title = this.addLabel(titleChip, 'Label', '柜台 3 格', 16, WALNUT, 72, 20);
        title.setPosition(0, 0, 0);
        const targetChip = new Node('Target');
        targetChip.layer = UI_2D;
        targetChip.setPosition(0, 86, 0);
        targetChip.addComponent(UITransform).setContentSize(242, 30);
        this.ensureBulkPillSkin(targetChip, 'Bg', 242, 30, 15, Color.WHITE, new Color(255, 252, 247, 255), new Color(176, 130, 96, 108), 2);
        panel.addChild(targetChip);
        const target = this.addLabel(targetChip, 'Label', '当前目标：请先选格', 16, FRAME, 222, 20);
        target.setPosition(0, 0, 0);

        const hintChip = new Node('Hint');
        hintChip.layer = UI_2D;
        hintChip.setPosition(196, 64, 0);
        hintChip.addComponent(UITransform).setContentSize(184, 30);
        this.ensureBulkPillSkin(hintChip, 'Bg', 184, 30, 15, Color.WHITE, new Color(255, 252, 247, 255), new Color(176, 130, 96, 108), 2);
        panel.addChild(hintChip);
        const hint = this.addLabel(hintChip, 'Label', '短按 +1  长按连倒', 16, FRAME, 164, 20);
        hint.setPosition(0, 0, 0);
        titleChip.active = false;
        targetChip.active = false;
        hintChip.active = false;
        if (this.bufferBoard) {
            const boardArt = this.addSprite(panel, 'BoardArt', this.bufferBoard, BUF_BOARD_W, BUF_BOARD_H, 0, 0, Color.WHITE);
            boardArt.setSiblingIndex(0);
            const boardSp = boardArt.getComponent(Sprite);
            if (boardSp) boardSp.sizeMode = Sprite.SizeMode.CUSTOM;
        }
        const hit = new Node('CounterHit');
        hit.layer = UI_2D;
        hit.setPosition(0, 0, 0);
        hit.addComponent(UITransform).setContentSize(BUF_BOARD_W, BUF_BOARD_H);
        const hitG = hit.addComponent(Graphics);
        hitG.fillColor = new Color(255, 253, 248, 4);
        hitG.roundRect(-BUF_BOARD_W / 2, -BUF_BOARD_H / 2, BUF_BOARD_W, BUF_BOARD_H, 28);
        hitG.fill();
        panel.addChild(hit);
        hit.on(Node.EventType.TOUCH_END, () => onSelectCounter(), this);
        const xs = this.bufferBoard ? BUF_WELL_XS : [-210, 0, 210];
        for (let i = 0; i < 3; i++) {
            const slot = new Node(`Counter${i}`);
            slot.layer = UI_2D;
            slot.setPosition(xs[i], this.bufferBoard ? BUF_WELL_Y : 10, 0);
            slot.addComponent(UITransform).setContentSize(slotW, slotH);
            this.ensureRoundedBg(
                slot,
                'Bg',
                slotW,
                slotH,
                26,
                this.bufferBoard ? new Color(0, 0, 0, 0) : new Color(240, 235, 228, 255),
                new Color(176, 130, 96, 72),
            );
            panel.addChild(slot);
            this.bindBulkP4CounterPress(slot, i, board, panel, receipt, demo, getTrayTargetIndex, getBagTarget, onSelectCounter, extraSync, clearTrayTarget);
        }
        this.syncBulkP4CounterDemo(panel, demo, getTrayTargetIndex(), getBagTarget());
    }

    private buildBulkP6FailDemo(
        panel: Node,
        board: Node,
        receipt: Node,
        demo: BulkPurchaseState,
        getTrayTargetIndex: () => number | null,
        extraSync: () => void,
        clearTrayTarget: () => void,
    ): void {
        void panel;
        void board;
        void receipt;
        void demo;
        void getTrayTargetIndex;
        void extraSync;
        void clearTrayTarget;
    }

    private bindBulkP4CounterPress(
        slot: Node,
        counterIndex: number,
        board: Node,
        panel: Node,
        receipt: Node,
        demo: BulkPurchaseState,
        getTrayTargetIndex: () => number | null,
        getBagTarget: () => 'tray' | 'counter',
        onSelectCounter: () => void,
        extraSync: () => void,
        clearTrayTarget: () => void,
    ): void {
        let pressing = false;
        let longActive = false;
        const canPourNow = () => getBagTarget() === 'tray' && (demo.counterStacks[counterIndex]?.count || 0) > 0;
        const repeatPour = () => {
            if (!pressing) return;
            if (!this.pourBulkP4Counter(board, panel, receipt, demo, counterIndex, getTrayTargetIndex(), true, extraSync, clearTrayTarget)) {
                pressing = false;
                longActive = false;
                this.unschedule(repeatPour);
            }
        };
        const armLong = () => {
            if (!pressing || !canPourNow()) return;
            longActive = true;
            repeatPour();
            if (pressing) this.schedule(repeatPour, 0.12);
        };
        slot.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            pressing = true;
            longActive = false;
            tween(slot).to(0.08, { scale: new Vec3(0.97, 0.97, 1) }).start();
            const stack = demo.counterStacks[counterIndex];
            if (stack?.kind && stack.count > 0) {
                this.beginBulkPointer(e, { kind: 'buffer', index: counterIndex }, stack.kind);
            }
            if (canPourNow()) this.scheduleOnce(armLong, 0.22);
        }, this);
        slot.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
            if (longActive) return;
            this.moveBulkPointer(e);
            if (this.bulkPress?.armed) {
                this.unschedule(armLong);
                this.unschedule(repeatPour);
                pressing = false;
                tween(slot).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
            }
        }, this);
        const release = (shortTap: boolean) => {
            const shouldTap = shortTap && pressing && !longActive;
            const pour = canPourNow();
            pressing = false;
            this.unschedule(armLong);
            this.unschedule(repeatPour);
            tween(slot).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
            if (!shouldTap) return;
            if (pour) this.pourBulkP4Counter(board, panel, receipt, demo, counterIndex, getTrayTargetIndex(), false, extraSync, clearTrayTarget);
            else onSelectCounter();
        };
        slot.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
            if (this.bulkPress && this.bulkPress.id === e.getID() && this.bulkPress.armed) {
                pressing = false;
                this.unschedule(armLong);
                this.unschedule(repeatPour);
                tween(slot).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
                this.endBulkPointer(e);
                return;
            }
            if (this.bulkPress && this.bulkPress.id === e.getID()) this.bulkPress = null;
            release(true);
        }, this);
        slot.on(Node.EventType.TOUCH_CANCEL, (e: EventTouch) => {
            if (this.bulkPress && this.bulkPress.id === e.getID() && this.bulkPress.armed) {
                pressing = false;
                this.unschedule(armLong);
                this.unschedule(repeatPour);
                tween(slot).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
                this.endBulkPointer(e);
                return;
            }
            if (this.bulkPress && this.bulkPress.id === e.getID()) this.bulkPress = null;
            release(false);
        }, this);
    }

    private pourBulkP4Counter(
        board: Node,
        panel: Node,
        receipt: Node,
        demo: BulkPurchaseState,
        counterIndex: number,
        trayIndex: number | null,
        quiet: boolean,
        extraSync: () => void,
        clearTrayTarget: () => void,
    ): boolean {
        if (!quiet && this.busy) return false;
        if (trayIndex == null) {
            if (!quiet) this.showHomeToast('请先点一个可收的冰箱格');
            return false;
        }
        if (!demo.debugCounterCanPour(counterIndex, trayIndex)) {
            if (!quiet) {
                const kind = demo.counterStacks[counterIndex]?.kind;
                this.showHomeToast(kind && demo.debugRejectsNewTray(kind, trayIndex)
                    ? this.bulkAntiSplitToast(kind)
                    : '这叠现在倒不进当前目标格');
            }
            return false;
        }
        const commit = (): boolean => {
            const slot = demo.activeTrays[trayIndex];
            const ok = demo.debugPourOneFromCounter(counterIndex, trayIndex);
            if (!ok) return false;
            const activeNow = demo.activeTrays[trayIndex];
            if (!activeNow || activeNow.sealed || activeNow.filled >= activeNow.cap) clearTrayTarget();
            if (activeNow && activeNow.kind) this.bulkPulseTrayIndex = trayIndex;
            if (slot) this.playBulkFridgeArrive(slot.sealed);
            extraSync();
            this.syncBulkP5ReceiptDemo(receipt, demo);
            this.syncBulkP6FailDemo(panel, demo);
            return true;
        };
        if (quiet) return commit();
        const item = demo.counterStacks[counterIndex]?.kind;
        const icon = panel.getChildByName(`Counter${counterIndex}`)?.getChildByName('Icon');
        const tray = this.bulkFridgeLandNode(board, trayIndex);
        const host = board.parent;
        if (!item || !icon || !tray || !host) return commit();
        this.flyBulkItem(host, icon, tray, item, { w: 48, h: 48 }, () => { commit(); }, false);
        return true;
    }

    private findBulkBagTop(bagHost: Node, col: number): Node | null {
        const shell = bagHost.getChildByName('BagDemo');
        const bag = shell?.getChildByName(`BagCol${col}`);
        const top = bag?.getChildByName('TopTray');
        return top?.getChildByName('Icon') || top || null;
    }

    private flyBulkItem(
        host: Node,
        from: Node,
        to: Node,
        item: FoodId,
        endSize: { w: number; h: number },
        onLand: () => void,
        playDrop: boolean,
    ): void {
        const hostUi = host.getComponent(UITransform);
        if (!hostUi) {
            onLand();
            return;
        }
        this.busy = true;
        const fromUi = from.getComponent(UITransform);
        const fromScale = from.worldScale;
        const startW = Math.max(24, fromUi ? fromUi.contentSize.width * Math.abs(fromScale.x) : 72);
        const startH = Math.max(24, fromUi ? fromUi.contentSize.height * Math.abs(fromScale.y) : 72);
        const fromPos = hostUi.convertToNodeSpaceAR(from.worldPosition.clone());
        const toPos = hostUi.convertToNodeSpaceAR(to.worldPosition.clone());
        const frame = this.frameForBag(item) || this.frameForFood(item);
        if (!frame) {
            this.busy = false;
            onLand();
            return;
        }
        const flyer = this.addSprite(host, 'BulkFlyer', frame, startW, startH, fromPos.x, fromPos.y, Color.WHITE);
        flyer.setSiblingIndex(host.children.length - 1);
        const hide = from.getComponent(UIOpacity) || from.addComponent(UIOpacity);
        hide.opacity = 0;
        const land = new Vec3(endSize.w / startW, endSize.h / startH, 1);
        tween(flyer)
            .to(FLY_SEC, { position: toPos, scale: land }, { easing: easing.cubicOut })
            .start();
        this.scheduleOnce(() => {
            if (flyer.isValid) flyer.destroy();
            this.busy = false;
            if (!host.isValid) return;
            onLand();
            if (playDrop) playFridgeDrop();
        }, FLY_SEC);
    }

    private clearBulkPress() {
        this.foodPressToken += 1;
        const press = this.bulkPress;
        this.bulkPress = null;
        this.clearDropHalo();
        if (!press) return;
        if (press.ghost && press.ghost.isValid) press.ghost.destroy();
        if (press.hidden && press.hidden.isValid) this.showDragSource(press.hidden);
    }

    private beginBulkPointer(e: EventTouch, source: FoodDragSource, item: FoodId) {
        if (this.bulkPress) {
            if (this.bulkPress.id === e.getID()) e.propagationStopped = true;
            return;
        }
        const ctx = this.bulkDragCtx;
        if (!ctx || this.busy || this.bulkSettleLock) return;
        const food = this.bulkSourceFoodNode(source);
        const cardUi = ctx.card.getComponent(UITransform);
        const origin = food && cardUi
            ? cardUi.convertToNodeSpaceAR(food.worldPosition.clone())
            : new Vec3();
        const p = e.getUILocation();
        this.bulkPress = {
            id: e.getID(),
            source,
            item,
            startX: p.x,
            startY: p.y,
            origin,
            armed: false,
            ghost: null,
            flyer: null,
            hidden: null,
            hover: null,
            hit: null,
            flyW: 72,
            flyH: 96,
        };
        e.propagationStopped = true;
    }

    private moveBulkPointer(e: EventTouch) {
        const press = this.bulkPress;
        if (!press || press.id !== e.getID()) return;
        e.propagationStopped = true;
        const p = e.getUILocation();
        const dx = p.x - press.startX;
        const dy = p.y - press.startY;
        if (!press.armed) {
            if (dx * dx + dy * dy < DRAG_SLOP * DRAG_SLOP) return;
            this.armBulkPress(press);
        }
        if (this.bulkPress !== press || !press.ghost) return;
        const finger = this.fingerInBulkCard(e);
        if (!finger) return;
        press.ghost.setPosition(finger.x, finger.y, 0);
        const hit = this.destAtBulkTouch(e);
        press.hit = hit;
        const hover = hit && this.bulkDragCanDrop(press, hit) ? hit : null;
        press.hover = hover;
        if (hover) this.showBulkDropHalo(hover);
        else this.clearDropHalo();
    }

    private endBulkPointer(e: EventTouch) {
        const press = this.bulkPress;
        if (!press || press.id !== e.getID()) return;
        e.propagationStopped = true;
        this.bulkPress = null;
        this.clearDropHalo();
        const ctx = this.bulkDragCtx;
        if (!press.armed) {
            if (press.source.kind === 'bag' && ctx) {
                playBtnClick();
                ctx.onBagTap(press.source.col);
            }
            return;
        }
        if (press.hover) {
            this.flyBulkGhostToDest(press, press.hover);
            return;
        }
        this.snapBulkGhostHome(press, press.hit);
    }

    private armBulkPress(press: FoodPress) {
        const ctx = this.bulkDragCtx;
        if (!ctx) return;
        press.armed = true;
        this.busy = true;
        const hidden = this.bulkSourceFoodNode(press.source);
        press.hidden = hidden;
        let flyW = 72;
        let flyH = 96;
        if (hidden) {
            const ui = hidden.getComponent(UITransform);
            const sc = hidden.worldScale;
            if (ui) {
                flyW = Math.max(8, ui.contentSize.width * Math.abs(sc.x));
                flyH = Math.max(8, ui.contentSize.height * Math.abs(sc.y));
            }
            const cardUi = ctx.card.getComponent(UITransform);
            if (cardUi) press.origin = cardUi.convertToNodeSpaceAR(hidden.worldPosition.clone());
            this.hideDragSource(hidden);
        }
        press.flyW = flyW;
        press.flyH = flyH;
        const ghost = new Node('DragGhost');
        ghost.layer = UI_2D;
        ghost.setPosition(press.origin);
        ctx.card.addChild(ghost);
        ghost.setSiblingIndex(ctx.card.children.length - 1);
        const shadow = new Node('Shadow');
        shadow.layer = UI_2D;
        shadow.setPosition(0, -flyH * 0.42, 0);
        shadow.addComponent(UITransform).setContentSize(flyW, 16);
        const shade = shadow.addComponent(Graphics);
        shade.fillColor = new Color(72, 54, 42, 140);
        shade.ellipse(0, 0, flyW * 0.36, 5);
        shade.fill();
        ghost.addChild(shadow);
        const frame = this.frameForBag(press.item) || this.frameForFood(press.item);
        if (!frame) {
            ghost.destroy();
            if (hidden) this.showDragSource(hidden);
            press.armed = false;
            press.ghost = null;
            this.busy = false;
            return;
        }
        const flyer = this.addSprite(ghost, 'Flyer', frame, flyW, flyH, 0, 0, Color.WHITE);
        const flyerUi = flyer.getComponent(UITransform);
        if (flyerUi) flyerUi.setAnchorPoint(0.5, 0.5);
        press.flyer = flyer;
        press.ghost = ghost;
    }

    private flyBulkGhostToDest(press: FoodPress, dest: Dest) {
        const ctx = this.bulkDragCtx;
        const ghost = press.ghost;
        const flyer = press.flyer;
        const token = this.foodPressToken;
        const host = dest.kind === 'tray'
            ? this.bulkTrayLandNode(this.bulkDestNode(dest))
            : this.bulkDestNode(dest);
        const cardUi = ctx?.card.getComponent(UITransform);
        const finish = () => {
            if (token !== this.foodPressToken) return;
            if (ghost && ghost.isValid) ghost.destroy();
            this.busy = false;
            this.commitBulkDrop(press, dest);
        };
        if (!ctx || !ghost || !flyer || !host || !cardUi) {
            finish();
            return;
        }
        const toPos = cardUi.convertToNodeSpaceAR(host.worldPosition.clone());
        const endW = dest.kind === 'tray' ? 48 : BUF_FOOD;
        const endH = dest.kind === 'tray' ? 48 : BUF_FOOD;
        const land = new Vec3(endW / Math.max(1, press.flyW), endH / Math.max(1, press.flyH), 1);
        tween(ghost)
            .to(FLY_SEC, { position: toPos }, { easing: easing.cubicOut })
            .start();
        tween(flyer)
            .to(FLY_SEC, { scale: land }, { easing: easing.linear })
            .call(finish)
            .start();
    }

    private snapBulkGhostHome(press: FoodPress, hit: Dest | null) {
        const ghost = press.ghost;
        const hidden = press.hidden;
        const token = this.foodPressToken;
        const back = () => {
            if (token !== this.foodPressToken) return;
            if (ghost && ghost.isValid) ghost.destroy();
            if (hidden && hidden.isValid) this.showDragSource(hidden);
            this.busy = false;
            if (!hit) return;
            const demo = this.bulkDragCtx?.demo;
            if (demo && hit.kind === 'tray') {
                const blockedKind = press.source.kind === 'bag'
                    ? press.item
                    : demo.counterStacks[press.source.index]?.kind;
                if (blockedKind && demo.debugRejectsNewTray(blockedKind, hit.index)) {
                    this.showHomeToast(this.bulkAntiSplitToast(blockedKind));
                    return;
                }
            }
            if (press.source.kind === 'bag') {
                this.showHomeToast(hit.kind === 'tray' ? '这件现在进不了这格' : '这件现在进不了这个柜台位');
                return;
            }
            this.showHomeToast(hit.kind === 'tray' ? '这叠现在倒不进这格' : '柜台不能对倒');
        };
        if (!ghost) {
            back();
            return;
        }
        tween(ghost)
            .to(0.12, { position: press.origin }, { easing: easing.quadOut })
            .call(back)
            .start();
    }

    private commitBulkDrop(press: FoodPress, dest: Dest) {
        const ctx = this.bulkDragCtx;
        if (!ctx) return;
        if (dest.kind === 'tray') {
            ctx.setTrayTarget(dest.index);
            ctx.setBagTarget('tray');
        } else {
            ctx.setBagTarget('counter');
        }
        if (press.source.kind === 'bag') {
            const slot = dest.kind === 'tray' ? ctx.demo.activeTrays[dest.index] : null;
            const ok = dest.kind === 'tray'
                ? ctx.demo.debugPlaceBagTopToTray(press.source.col, dest.index)
                : ctx.demo.debugPlaceBagTopToCounter(press.source.col, dest.index);
            if (!ok) return;
            if (slot) this.playBulkFridgeArrive(slot.sealed);
            ctx.afterPlace(dest.kind === 'tray' ? dest.index : null);
            return;
        }
        if (dest.kind === 'tray') ctx.pourQuiet(press.source.index, dest.index);
    }

    private bulkDragCanDrop(press: FoodPress, dest: Dest): boolean {
        const demo = this.bulkDragCtx?.demo;
        if (!demo) return false;
        if (press.source.kind === 'bag') {
            if (dest.kind === 'tray') return demo.debugCanPlaceBagTopToTray(press.source.col, dest.index);
            return demo.debugCanPlaceBagTopToCounter(press.source.col, dest.index);
        }
        if (dest.kind === 'buffer') return false;
        return demo.debugCounterCanPour(press.source.index, dest.index);
    }

    private bulkSourceFoodNode(source: FoodDragSource): Node | null {
        const ctx = this.bulkDragCtx;
        if (!ctx) return null;
        if (source.kind === 'bag') return this.findBulkBagTop(ctx.bagHost, source.col);
        return ctx.getCounterPanel()?.getChildByName(`Counter${source.index}`)?.getChildByName('Icon') || null;
    }

    private fingerInBulkCard(e: EventTouch): Vec3 | null {
        const card = this.bulkDragCtx?.card;
        const ui = card ? card.getComponent(UITransform) : null;
        if (!ui) return null;
        const p = e.getUILocation();
        return ui.convertToNodeSpaceAR(new Vec3(p.x, p.y, 0));
    }

    private destAtBulkTouch(e: EventTouch): Dest | null {
        const ctx = this.bulkDragCtx;
        if (!ctx) return null;
        const screen = e.getLocation();
        const trayDemo = ctx.fridgeZone.getChildByName('TrayDemo');
        if (trayDemo) {
            for (let i = ctx.demo.activeTrays.length - 1; i >= 0; i--) {
                const tray = trayDemo.getChildByName(`BulkTray${i}`);
                const ui = tray ? tray.getComponent(UITransform) : null;
                if (ui && ui.hitTest(screen)) return { kind: 'tray', index: i };
            }
        }
        const panel = ctx.getCounterPanel();
        if (panel) {
            for (let i = 2; i >= 0; i--) {
                const slot = panel.getChildByName(`Counter${i}`);
                const ui = slot ? slot.getComponent(UITransform) : null;
                if (ui && ui.hitTest(screen)) return { kind: 'buffer', index: i };
            }
        }
        return null;
    }

    private bulkDestNode(dest: Dest): Node | null {
        const ctx = this.bulkDragCtx;
        if (!ctx) return null;
        if (dest.kind === 'tray') {
            return ctx.fridgeZone.getChildByName('TrayDemo')?.getChildByName(`BulkTray${dest.index}`) || null;
        }
        return ctx.getCounterPanel()?.getChildByName(`Counter${dest.index}`) || null;
    }

    private bulkFridgeLandNode(board: Node, trayIndex: number): Node | null {
        const tray = board.getChildByName('TrayDemo')?.getChildByName(`BulkTray${trayIndex}`) || null;
        return this.bulkTrayLandNode(tray);
    }

    private bulkTrayLandNode(tray: Node | null): Node | null {
        if (!tray) return null;
        return tray.getChildByName('FoodSlot') || tray.getChildByName('Icon') || tray;
    }

    private playBulkFridgeArrive(sealed: boolean): void {
        playFridgeDrop();
        if (!sealed) return;
        playTrayDoorClose();
        playTrayDoorVibration();
    }

    private pulseBulkTrayFood(board: Node, trayIndex: number): void {
        const slot = this.bulkFridgeLandNode(board, trayIndex);
        if (!slot || !slot.isValid) return;
        Tween.stopAllByTarget(slot);
        slot.setScale(0.78, 0.78, 1);
        tween(slot)
            .to(0.16, { scale: new Vec3(1.16, 1.16, 1) }, { easing: easing.cubicOut })
            .to(0.18, { scale: new Vec3(1, 1, 1) }, { easing: easing.sineOut })
            .start();
    }

    private showBulkDropHalo(dest: Dest) {
        if (this.dropHalo && this.dropHalo.isValid && this.sameDest(this.dropHaloDest, dest)) return;
        this.clearDropHalo();
        const ctx = this.bulkDragCtx;
        const host = this.bulkDestNode(dest);
        const ui = host ? host.getComponent(UITransform) : null;
        const cardUi = ctx?.card.getComponent(UITransform) || null;
        if (!ctx || !host || !ui || !cardUi) return;
        const box = dest.kind === 'buffer'
            ? { w: BUF_SLOT_W + 4, h: BUF_SLOT_H + 4, inset: 2, radius: 32 }
            : { w: BULK_TRAY_W, h: BULK_TRAY_H, inset: 4, radius: 18 };
        const halo = new Node('DropHalo');
        halo.layer = UI_2D;
        const pos = cardUi.convertToNodeSpaceAR(ui.convertToWorldSpaceAR(new Vec3(0, 0, 0)));
        halo.setPosition(pos);
        halo.addComponent(UITransform).setContentSize(box.w + 24, box.h + 24);
        const g = halo.addComponent(Graphics);
        const x = -box.w / 2 + box.inset;
        const y = -box.h / 2 + box.inset;
        const rw = box.w - box.inset * 2;
        const rh = box.h - box.inset * 2;
        g.lineWidth = 16;
        g.strokeColor = new Color(255, 138, 18, 230);
        g.roundRect(x - 10, y - 10, rw + 20, rh + 20, box.radius + 8);
        g.stroke();
        g.lineWidth = 6;
        g.strokeColor = new Color(255, 226, 48, 255);
        g.roundRect(x - 2, y - 2, rw + 4, rh + 4, box.radius + 2);
        g.stroke();
        const op = halo.addComponent(UIOpacity);
        op.opacity = 255;
        ctx.card.addChild(halo);
        const ghost = ctx.card.getChildByName('DragGhost');
        if (ghost && ghost !== halo) halo.setSiblingIndex(ghost.getSiblingIndex());
        else halo.setSiblingIndex(ctx.card.children.length - 1);
        tween(op)
            .to(0.3, { opacity: 210 })
            .to(0.3, { opacity: 255 })
            .union()
            .repeatForever()
            .start();
        this.dropHalo = halo;
        this.dropHaloDest = dest;
    }

    private simulateBulkP6Failure(
        kind: 'locked_out' | 'buffer_full',
        board: Node,
        panel: Node,
        receipt: Node,
        demo: BulkPurchaseState,
        getTrayTargetIndex: () => number | null,
        extraSync: () => void,
    ): void {
        if (kind === 'locked_out') {
            demo.debugSetTray(0, 'meat', demo.activeTrays[0] ? Math.max(0, demo.activeTrays[0].cap - 1) : 0);
            demo.debugSetCounter(0, 'milk', 1);
            demo.debugSetCounter(1, 'meat', 0);
            demo.debugSetCounter(2, null, 0);
        } else {
            demo.debugSetCounter(0, 'veg', 5);
            demo.debugSetCounter(1, 'fruit', 5);
            demo.debugSetCounter(2, 'meat', 5);
        }
        extraSync();
        this.syncBulkP4CounterDemo(panel, demo, getTrayTargetIndex(), 'tray');
        this.syncBulkP5ReceiptDemo(receipt, demo);
        this.syncBulkP6FailDemo(panel, demo);
        this.scheduleOnce(() => {
            if (kind === 'locked_out') {
                const resolved = demo.debugResolveLockedOut();
                this.showHomeToast(resolved === 'branch' ? '这格锁错了，退回最近可解分叉' : '这格锁错了，退回本趟开头');
            } else {
                const resolved = demo.debugResolveBufferFull();
                this.showHomeToast(resolved === 'checkpoint' ? '柜台堆满了，退回本趟保底点' : '柜台堆满了，重开本趟');
            }
            extraSync();
            this.syncBulkP4CounterDemo(panel, demo, getTrayTargetIndex(), 'tray');
            this.syncBulkP5ReceiptDemo(receipt, demo);
            this.syncBulkP6FailDemo(panel, demo);
        }, 0.28);
    }

    private syncBulkP4CounterDemo(
        panel: Node,
        demo: BulkPurchaseState,
        trayIndex: number | null,
        bagTarget: 'tray' | 'counter' = 'tray',
    ): void {
        const slotW = BUF_SLOT_W;
        const slotH = BUF_SLOT_H;
        const foodSize = BUF_FOOD;
        const target = panel.getChildByName('Target');
        if (target) target.active = false;
        const oldSelect = panel.getChildByName('CounterSelect');
        if (oldSelect) oldSelect.destroy();
        if (bagTarget === 'counter') this.drawBulkCounterSelect(panel);
        for (let i = 0; i < 3; i++) {
            const slot = panel.getChildByName(`Counter${i}`);
            const stack = demo.counterStacks[i];
            if (!slot || !stack) continue;
            for (let c = slot.children.length - 1; c >= 0; c--) {
                const child = slot.children[c];
                if (child.name !== 'Bg' && child.name !== 'BgArt') child.destroy();
            }
            const canPour = bagTarget === 'tray' && trayIndex != null && demo.debugCounterCanPour(i, trayIndex);
            const fill = stack.count > 0 ? new Color(255, 252, 247, 255) : new Color(240, 235, 228, 255);
            const stroke = stack.count === 0
                ? new Color(176, 130, 96, 72)
                : canPour
                    ? SAGE
                    : new Color(160, 130, 120, 180);
            this.ensureRoundedBg(slot, 'Bg', slotW, slotH, 26, this.bufferBoard ? new Color(0, 0, 0, 0) : fill, stroke);
            if (stack.kind) {
                const iconFrame = this.frameForBag(stack.kind) || this.frameForFood(stack.kind);
                if (iconFrame) {
                    const icon = this.addSprite(slot, 'Icon', iconFrame, foodSize, foodSize, 0, 10, Color.WHITE);
                    icon.setScale(1, 1, 1);
                }
                const count = this.addLabel(slot, 'Count', `${stack.count}/${stack.cap}`, 22, WALNUT, 88, 26);
                count.setPosition(0, -46, 0);
                this.tuneLabel(count, true);
            }
        }
    }

    private syncBulkP6FailDemo(panel: Node, demo: BulkPurchaseState): void {
        void panel;
        void demo;
    }

    private buildBulkP8Footer(card: Node, runId: string, stageIndex: number, stageTotal: number, demo: BulkPurchaseState, nextRunId?: string): void {
        if (stageIndex + 1 < stageTotal) return;
        const footer = new Node('BulkFooter');
        footer.layer = UI_2D;
        footer.setPosition(0, 0, 0);
        const footerW = 520;
        const footerH = 72;
        footer.addComponent(UITransform).setContentSize(footerW, footerH);
        const plaque = footer.addComponent(Graphics);
        plaque.fillColor = new Color(92, 62, 48, 255);
        plaque.roundRect(-footerW / 2, -footerH / 2, footerW, footerH, 14);
        plaque.fill();
        plaque.fillColor = new Color(122, 82, 62, 255);
        plaque.roundRect(-footerW / 2 + 4, -footerH / 2 + 6, footerW - 8, footerH - 14, 10);
        plaque.fill();
        card.addChild(footer);

        const replay = new Node('ReplayBtn');
        replay.layer = UI_2D;
        replay.setPosition(-104, -12, 0);
        replay.addComponent(UITransform).setContentSize(200, 64);
        this.ensureBulkActionButtonSkin(replay, 200, 64, WALNUT, WALNUT);
        footer.addChild(replay);
        const replayText = this.addLabel(replay, 'Label', '再来一局', 26, MILK, 140, 32);
        replayText.setPosition(0, 0, 0);
        this.tuneLabel(replayText, true);
        if (!replay.getComponent(Button)) replay.addComponent(Button);
        this.bindHudPress(replay, () => this.openBulkPurchaseLayer(runId, 0));

        const close = new Node('CloseBtn');
        close.layer = UI_2D;
        close.setPosition(124, -12, 0);
        close.addComponent(UITransform).setContentSize(200, 64);
        this.ensureBulkActionButtonSkin(close, 200, 64, nextRunId ? WALNUT : new Color(140, 132, 124, 255), nextRunId ? WALNUT : new Color(140, 132, 124, 255));
        footer.addChild(close);
        const closeText = this.addLabel(close, 'Label', nextRunId ? '下一关' : '回主页', 26, MILK, 140, 32);
        closeText.setPosition(0, 0, 0);
        this.tuneLabel(closeText, true);
        if (!close.getComponent(Button)) close.addComponent(Button);
        this.bindHudPress(close, () => {
            if (nextRunId) this.openBulkPurchaseLayer(nextRunId, 0);
            else this.closeBulkPurchaseLayer();
        });
    }

    private syncBulkP8Footer(footer: Node, demo: BulkPurchaseState, hasNextStage: boolean): void {
        if (!hasNextStage) return;
        const title = footer.getChildByName('Title');
        const titleLabel = title ? title.getComponent(Label) : null;
        const statusChip = footer.getChildByName('StatusChip');
        const statusLabel = statusChip?.getChildByName('Status')?.getComponent(Label) || null;
        const ready = demo.isStageResolved();
        if (titleLabel) titleLabel.string = '';
        if (statusLabel) {
            statusLabel.string = ready ? '本趟已收好' : '本趟未完成';
            statusLabel.color = ready ? new Color(210, 232, 196, 255) : MILK;
        }
    }

    private openBulkGuideLayer(parent: Node): void {
        const old = parent.getChildByName('BulkGuideLayer');
        if (old) old.destroy();
        const tips = [
            '这是大容量格，看 0/12 这种数字，不看小坑位。',
            '格子收满会搬走，下面「收满后补进」会换上新格。',
            '柜台 1 格能叠同种，短按 +1，长按会连续倒入。',
            '购物小票只记还没进冰箱的件数，不是可操作区。',
        ];
        let index = 0;
        const layer = new Node('BulkGuideLayer');
        layer.layer = UI_2D;
        layer.addComponent(UITransform).setContentSize(720, 1280);
        parent.addChild(layer);
        const dim = layer.addComponent(Graphics);
        dim.fillColor = new Color(61, 50, 41, 138);
        dim.rect(-360, -640, 720, 1280);
        dim.fill();
        const card = new Node('GuideCard');
        card.layer = UI_2D;
        card.setPosition(0, 0, 0);
        card.addComponent(UITransform).setContentSize(560, 300);
        const g = card.addComponent(Graphics);
        g.fillColor = new Color(255, 252, 247, 255);
        g.roundRect(-280, -150, 560, 300, 30);
        g.fill();
        layer.addChild(card);
        const step = this.addLabel(card, 'Step', '', 20, FRAME, 200, 24);
        step.setPosition(0, 84, 0);
        const body = this.addLabel(card, 'Body', '', 28, WALNUT, 440, 120);
        body.setPosition(0, 10, 0);
        const bodyLabel = body.getComponent(Label);
        if (bodyLabel) {
            bodyLabel.enableWrapText = true;
            bodyLabel.lineHeight = 38;
        }
        const next = new Node('NextBtn');
        next.layer = UI_2D;
        next.setPosition(0, -90, 0);
        next.addComponent(UITransform).setContentSize(220, 62);
        this.ensureBulkActionButtonSkin(next, 220, 62, WALNUT, WALNUT);
        card.addChild(next);
        const nextText = this.addLabel(next, 'Label', '下一条', 26, MILK, 120, 30);
        nextText.setPosition(0, 0, 0);
        if (!next.getComponent(Button)) next.addComponent(Button);
        const sync = () => {
            const stepLabel = step.getComponent(Label);
            if (stepLabel) stepLabel.string = `新手提示 ${index + 1}/4`;
            const bodyText = body.getComponent(Label);
            if (bodyText) bodyText.string = tips[index];
            const buttonText = nextText.getComponent(Label);
            if (buttonText) buttonText.string = index + 1 >= tips.length ? '知道了' : '下一条';
        };
        this.bindHudPress(next, () => {
            index += 1;
            if (index >= tips.length) {
                sys.localStorage.setItem(BULK_GUIDE_SEEN_KEY, '1');
                if (layer.isValid) layer.destroy();
                return;
            }
            sync();
        });
        sync();
    }

    private addBulkP3TrayCard(
        parent: Node,
        cap: number,
        filled: number,
        kind: FoodId | null,
        x: number,
        y: number,
        tone: 'selected' | 'receivable' | 'idle' | 'blocked',
        index: number,
    ): Node {
        const node = new Node(`BulkTray${index}`);
        node.layer = UI_2D;
        node.setPosition(x, y, 0);
        const outerW = BULK_TRAY_W;
        const outerH = BULK_TRAY_H;
        const frame = 12;
        const slotW = outerW - frame * 2;
        const slotH = outerH - frame * 2;
        const selected = tone === 'selected';
        const closed = tone === 'blocked';
        node.addComponent(UITransform).setContentSize(outerW, outerH);
        parent.addChild(node);
        const gNode = new Node('Cell');
        gNode.layer = UI_2D;
        gNode.addComponent(UITransform).setContentSize(outerW, outerH);
        const g = gNode.addComponent(Graphics);
        g.fillColor = selected ? WALNUT : FRAME;
        g.roundRect(-outerW / 2, -outerH / 2, outerW, outerH, 24);
        g.fill();
        if (closed) {
            this.paintDoor(g, slotW, slotH);
        } else {
            g.fillColor = selected ? new Color(236, 248, 255, 255) : new Color(198, 210, 214, 255);
            g.roundRect(-slotW / 2, -slotH / 2, slotW, slotH, 14);
            g.fill();
            const glowR = selected ? 18 : 12;
            g.fillColor = selected ? new Color(255, 255, 255, 200) : new Color(255, 255, 255, 70);
            g.circle(0, slotH / 2 - 16, glowR);
            g.fill();
        }
        node.addChild(gNode);
        if (selected && !closed) this.drawCoralFramePulse(node, outerW, outerH, 4, 16, SELECT_PULSE_ICE, SELECT_PULSE_ICE_SOFT);

        const foodSlot = new Node('FoodSlot');
        foodSlot.layer = UI_2D;
        foodSlot.setPosition(-48, 2, 0);
        foodSlot.addComponent(UITransform).setContentSize(48, 48);
        node.addChild(foodSlot);
        const iconFrame = kind ? this.frameForBag(kind) : null;
        if (iconFrame) {
            this.addSprite(foodSlot, 'Icon', iconFrame, 48, 48, 0, 0, Color.WHITE);
        }

        const count = this.addLabel(node, 'Count', `${filled}/${cap}`, 32, WALNUT, 100, 40);
        count.setPosition(24, 4, 0);
        this.tuneLabel(count, true);

        const progressBg = new Node('ProgressBg');
        progressBg.layer = UI_2D;
        progressBg.setPosition(18, -30, 0);
        progressBg.addComponent(UITransform).setContentSize(96, 10);
        const progressBgG = progressBg.addComponent(Graphics);
        progressBgG.fillColor = new Color(221, 212, 201, 255);
        progressBgG.roundRect(-48, -5, 96, 10, 5);
        progressBgG.fill();
        node.addChild(progressBg);

        const progressFill = new Node('ProgressFill');
        progressFill.layer = UI_2D;
        const fillW = Math.round((Math.max(0, Math.min(filled, cap)) / Math.max(cap, 1)) * 96);
        progressFill.setPosition(-48, 0, 0);
        progressFill.addComponent(UITransform).setContentSize(fillW, 10);
        const progressFillG = progressFill.addComponent(Graphics);
        progressFillG.fillColor = tone === 'selected' ? SELECT_PULSE_BLUE : SAGE;
        progressFillG.roundRect(0, -5, fillW, 10, 5);
        progressFillG.fill();
        progressBg.addChild(progressFill);
        progressBg.active = false;
        return node;
    }

    private openSettingsLayer(): void {
        this.closeSettingsLayer();
        const size = this.canvasSize();
        const layer = new Node('SettingsLayer');
        layer.layer = UI_2D;
        layer.addComponent(UITransform).setContentSize(size.w, size.h);
        this.node.addChild(layer);

        const dim = this.addSprite(layer, 'Dim', this.builtin, size.w, size.h, 0, 0, new Color(61, 50, 41, 76));
        dim.on(Node.EventType.TOUCH_START, () => {}, this);
        dim.on(Node.EventType.TOUCH_MOVE, () => {}, this);
        dim.on(Node.EventType.TOUCH_END, () => {}, this);
        dim.on(Node.EventType.TOUCH_CANCEL, () => {}, this);

        const shadow = new Node('CardShadow');
        shadow.layer = UI_2D;
        shadow.setPosition(0, 10, 0);
        shadow.addComponent(UITransform).setContentSize(SETTINGS_CARD_W, SETTINGS_CARD_H);
        const sg = shadow.addComponent(Graphics);
        sg.fillColor = new Color(123, 88, 59, 34);
        sg.roundRect(-SETTINGS_CARD_W / 2, -SETTINGS_CARD_H / 2, SETTINGS_CARD_W, SETTINGS_CARD_H, 44);
        sg.fill();
        layer.addChild(shadow);

        const card = new Node('Card');
        card.layer = UI_2D;
        card.setPosition(0, 24, 0);
        card.addComponent(UITransform).setContentSize(SETTINGS_CARD_W, SETTINGS_CARD_H);
        const g = card.addComponent(Graphics);
        g.fillColor = new Color(250, 244, 236, 255);
        g.roundRect(-SETTINGS_CARD_W / 2, -SETTINGS_CARD_H / 2, SETTINGS_CARD_W, SETTINGS_CARD_H, 42);
        g.fill();
        g.lineWidth = 3;
        g.strokeColor = new Color(214, 193, 170, 120);
        g.roundRect(-SETTINGS_CARD_W / 2, -SETTINGS_CARD_H / 2, SETTINGS_CARD_W, SETTINGS_CARD_H, 42);
        g.stroke();
        const title = this.addLabel(card, 'Title', '设置', 44, WALNUT, 220, 56);
        title.setPosition(0, 188, 0);
        layer.addChild(card);

        this.addSettingsRow(card, 'SfxRow', 'sfx', '音效', 76, isSfxEnabled(), () => {
            const next = !isSfxEnabled();
            setSfxEnabled(next);
            this.syncSettingsRow(card, 'SfxRow', next);
        });
        this.addSettingsDivider(card, 18);
        this.addSettingsRow(card, 'VibrationRow', 'vibration', '振动', -86, isVibrationEnabled(), () => {
            const next = !isVibrationEnabled();
            setVibrationEnabled(next);
            this.syncSettingsRow(card, 'VibrationRow', next);
        });

        const close = new Node('Close');
        close.layer = UI_2D;
        close.setPosition(0, -222, 0);
        close.addComponent(UITransform).setContentSize(216, 68);
        const closeG = close.addComponent(Graphics);
        closeG.fillColor = SAGE;
        closeG.roundRect(-108, -34, 216, 68, 34);
        closeG.fill();
        closeG.lineWidth = 3;
        closeG.strokeColor = new Color(176, 130, 96, 120);
        closeG.roundRect(-108, -34, 216, 68, 34);
        closeG.stroke();
        const closeLabel = this.addLabel(close, 'Label', '关闭', 30, WALNUT, 120, 40);
        closeLabel.setPosition(0, 0, 0);
        card.addChild(close);
        this.bindHudPress(close, () => this.closeSettingsLayer());

        const op = card.addComponent(UIOpacity);
        op.opacity = 0;
        tween(op).to(0.18, { opacity: 255 }).start();
        card.setScale(0.94, 0.94, 1);
        tween(card).to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: easing.backOut }).start();
    }

    private addSettingsDivider(parent: Node, y: number): void {
        const line = new Node('Divider');
        line.layer = UI_2D;
        line.setPosition(0, y, 0);
        line.addComponent(UITransform).setContentSize(438, 2);
        const g = line.addComponent(Graphics);
        g.fillColor = new Color(176, 130, 96, 56);
        g.roundRect(-219, -1, 438, 2, 1);
        g.fill();
        parent.addChild(line);
    }

    private addSettingsRow(
        parent: Node,
        name: string,
        kind: 'sfx' | 'vibration',
        text: string,
        y: number,
        on: boolean,
        tap: () => void,
    ): void {
        const row = new Node(name);
        row.layer = UI_2D;
        row.setPosition(0, y, 0);
        row.addComponent(UITransform).setContentSize(452, 108);
        parent.addChild(row);

        const icon = new Node('Icon');
        icon.layer = UI_2D;
        icon.setPosition(-188, 0, 0);
        row.addChild(icon);
        this.paintSettingsRowIcon(icon, kind);

        const label = this.addLabel(row, 'Label', text, 34, WALNUT, 150, 46);
        label.setPosition(-120, 0, 0);
        const labelComp = label.getComponent(Label);
        if (labelComp) {
            labelComp.horizontalAlign = Label.HorizontalAlign.LEFT;
            labelComp.fontFamily = 'Microsoft YaHei';
        }

        const toggle = new Node('Toggle');
        toggle.layer = UI_2D;
        toggle.setPosition(164, 0, 0);
        toggle.addComponent(UITransform).setContentSize(SETTINGS_TOGGLE_W + 20, SETTINGS_TOGGLE_H + 20);
        row.addChild(toggle);
        this.paintSettingsToggle(toggle, on);
        this.bindHudPress(toggle, tap);
    }

    private paintSettingsRowIcon(node: Node, kind: 'sfx' | 'vibration'): void {
        const ui = node.getComponent(UITransform) ?? node.addComponent(UITransform);
        ui.setContentSize(46, 46);
        node.destroyAllChildren();
        const stale = node.getComponent(Graphics);
        if (stale) stale.clear();
        if (kind === 'sfx') {
            const body = new Node('Body');
            body.layer = UI_2D;
            node.addChild(body);
            const bodyG = body.addComponent(Graphics);
            bodyG.fillColor = WALNUT;
            bodyG.moveTo(-18, -6);
            bodyG.lineTo(-8, -6);
            bodyG.lineTo(2, -16);
            bodyG.lineTo(2, 16);
            bodyG.lineTo(-8, 6);
            bodyG.lineTo(-18, 6);
            bodyG.close();
            bodyG.fill();

            const wave1 = new Node('Wave1');
            wave1.layer = UI_2D;
            node.addChild(wave1);
            const wave1G = wave1.addComponent(Graphics);
            wave1G.lineWidth = 4;
            wave1G.strokeColor = WALNUT;
            wave1G.arc(6, 0, 8, -0.9, 0.9, false);
            wave1G.stroke();

            const wave2 = new Node('Wave2');
            wave2.layer = UI_2D;
            node.addChild(wave2);
            const wave2G = wave2.addComponent(Graphics);
            wave2G.lineWidth = 4;
            wave2G.strokeColor = WALNUT;
            wave2G.arc(7, 0, 14, -0.85, 0.85, false);
            wave2G.stroke();
            return;
        }

        const phone = new Node('Phone');
        phone.layer = UI_2D;
        node.addChild(phone);
        const phoneG = phone.addComponent(Graphics);
        phoneG.lineWidth = 4;
        phoneG.strokeColor = WALNUT;
        phoneG.roundRect(-8, -16, 16, 32, 4);
        phoneG.stroke();

        const slit = new Node('Slit');
        slit.layer = UI_2D;
        node.addChild(slit);
        const slitG = slit.addComponent(Graphics);
        slitG.lineWidth = 4;
        slitG.strokeColor = WALNUT;
        slitG.moveTo(-3, 11);
        slitG.lineTo(3, 11);
        slitG.stroke();

        const leftWave = new Node('LeftWave');
        leftWave.layer = UI_2D;
        node.addChild(leftWave);
        const leftWaveG = leftWave.addComponent(Graphics);
        leftWaveG.lineWidth = 4;
        leftWaveG.strokeColor = WALNUT;
        leftWaveG.moveTo(-17, -10);
        leftWaveG.lineTo(-22, -4);
        leftWaveG.lineTo(-17, 2);
        leftWaveG.stroke();

        const rightWave = new Node('RightWave');
        rightWave.layer = UI_2D;
        node.addChild(rightWave);
        const rightWaveG = rightWave.addComponent(Graphics);
        rightWaveG.lineWidth = 4;
        rightWaveG.strokeColor = WALNUT;
        rightWaveG.moveTo(17, -10);
        rightWaveG.lineTo(22, -4);
        rightWaveG.lineTo(17, 2);
        rightWaveG.stroke();
    }

    private syncSettingsRow(card: Node, rowName: string, on: boolean): void {
        const toggle = card.getChildByName(rowName)?.getChildByName('Toggle');
        if (toggle) this.paintSettingsToggle(toggle, on);
    }

    private paintSettingsToggle(toggle: Node, on: boolean): void {
        const g = toggle.getComponent(Graphics) ?? toggle.addComponent(Graphics);
        g.clear();
        g.fillColor = new Color(123, 88, 59, 24);
        g.roundRect(-SETTINGS_TOGGLE_W / 2, -SETTINGS_TOGGLE_H / 2 - 3, SETTINGS_TOGGLE_W, SETTINGS_TOGGLE_H, SETTINGS_TOGGLE_H / 2);
        g.fill();
        const trackColor = on ? new Color(242, 111, 90, 255) : new Color(224, 206, 189, 255);
        g.fillColor = trackColor;
        g.roundRect(-SETTINGS_TOGGLE_W / 2, -SETTINGS_TOGGLE_H / 2, SETTINGS_TOGGLE_W, SETTINGS_TOGGLE_H, SETTINGS_TOGGLE_H / 2);
        g.fill();
        const knobR = 18;
        const knobX = on ? SETTINGS_TOGGLE_W / 2 - knobR - 4 : -SETTINGS_TOGGLE_W / 2 + knobR + 4;
        g.fillColor = new Color(123, 88, 59, 20);
        g.circle(knobX, -2, knobR);
        g.fill();
        g.fillColor = Color.WHITE;
        g.circle(knobX, 0, knobR);
        g.fill();
    }

    private refreshAlbumLink() {
        const link = this.node.getChildByName('AlbumLink');
        if (!link) return;
        const label = link.getChildByName('Label')?.getComponent(Label)
            || link.getComponent(Label)
            || link.getComponentInChildren(Label);
        if (label && label.enabled) label.string = `我收过的冰箱  ${this.clearedId()}/${PLAYABLE.length}`;
    }

    /** 先出面板。食材图齐了再填看得见的卡片，槽位内容用存档里的种类。 */
    private openAlbum() {
        const token = ++this.albumToken;
        void this.ensureAlbumFrames().then(() => {
            if (token !== this.albumToken || !this.node || !this.node.isValid) return;
            const shell = this.mountAlbumShell(token);
            if (!shell) return;
            this.scheduleOnce(() => {
                void this.fillAlbumCards(token, shell);
            }, 0);
        });
    }

    /** 图鉴主面板：奶油底 + 胡桃木框，与 UI §6.5 一致，不依赖位图底。 */
    private drawAlbumPanelBg(panel: Node): void {
        const w = ALBUM_PANEL_W;
        const h = ALBUM_PANEL_H;
        const r = 36;
        const bg = new Node('PanelBg');
        bg.layer = UI_2D;
        bg.addComponent(UITransform).setContentSize(w, h);
        const g = bg.addComponent(Graphics);
        g.fillColor = new Color(61, 50, 41, 52);
        g.roundRect(-w / 2 + 5, -h / 2 - 8, w, h, r);
        g.fill();
        g.fillColor = MILK;
        g.roundRect(-w / 2, -h / 2, w, h, r);
        g.fill();
        g.fillColor = CREAM;
        g.roundRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, Math.max(24, r - 6));
        g.fill();
        g.lineWidth = 9;
        g.strokeColor = FRAME;
        g.roundRect(-w / 2, -h / 2, w, h, r);
        g.stroke();
        g.lineWidth = 5;
        g.strokeColor = WALNUT;
        g.roundRect(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, Math.max(26, r - 4));
        g.stroke();
        panel.addChild(bg);
        bg.setSiblingIndex(0);
    }

    private mountAlbumShell(token: number): {
        layer: Node;
        content: Node;
        viewH: number;
        cardW: number;
        cardH: number;
        pitch: number;
        cols: number;
        gapX: number;
        total: number;
        rows: number;
        maxShow: number;
        cleared: number;
        album: ReturnType<typeof prepareAlbum>;
        followScroll: (e: EventTouch) => void;
        setSync: (fn: () => void) => void;
    } | null {
        if (token !== this.albumToken || !this.node || !this.node.isValid) return null;
        const old = this.node.getChildByName('AlbumLayer');
        if (old) old.destroy();
        const size = this.canvasSize();
        const layer = new Node('AlbumLayer');
        layer.layer = UI_2D;
        layer.addComponent(UITransform).setContentSize(size.w, size.h);
        this.node.addChild(layer);

        const dim = new Node('Dim');
        dim.layer = UI_2D;
        dim.addComponent(UITransform).setContentSize(size.w, size.h);
        const dimG = dim.addComponent(Graphics);
        dimG.fillColor = new Color(61, 50, 41, 150);
        dimG.rect(-size.w / 2, -size.h / 2, size.w, size.h);
        dimG.fill();
        layer.addChild(dim);
        dim.on(Node.EventType.TOUCH_END, () => {
            playBtnClick();
            if (layer.isValid) layer.destroy();
        }, this);

        const panel = new Node('Panel');
        panel.layer = UI_2D;
        panel.setPosition(0, 20, 0);
        panel.addComponent(UITransform).setContentSize(ALBUM_PANEL_W, ALBUM_PANEL_H);
        this.drawAlbumPanelBg(panel);
        layer.addChild(panel);
        panel.on(Node.EventType.TOUCH_END, () => {}, this);

        if (this.albumTitle) {
            this.addSprite(panel, 'Title', this.albumTitle, 500, 110, 0, 462, Color.WHITE);
        } else {
            this.addLabel(panel, 'Title', '我收过的冰箱', 36, WALNUT, 560, 48).setPosition(0, 430, 0);
        }
        const cleared = this.clearedId();
        const album = prepareAlbum(sys.localStorage, cleared, (id) => this.levelById(id));
        this.addLabel(panel, 'Progress', `${cleared} / ${PLAYABLE.length}`, 26, SAGE, 200, 36).setPosition(0, 372, 0);
        this.addLabel(panel, 'ReplayHint', '点一下再收 · 按住可分享', 20, FRAME, 480, 28).setPosition(0, 340, 0);

        const cols = 3;
        const cardW = 184;
        const cardH = 248;
        const gapX = 14;
        const gapY = 16;
        const pitch = cardH + gapY;
        const maxShow = Math.min(cleared, PLAYABLE.length);
        const ghost = cleared >= 1 && cleared < PLAYABLE.length;
        const total = maxShow + (ghost ? 1 : 0);
        const rows = Math.max(1, Math.ceil(total / cols));
        const contentH = total > 0 ? rows * pitch - gapY : 0;

        const viewW = 600;
        const viewH = 680;
        const viewport = new Node('Viewport');
        viewport.layer = UI_2D;
        viewport.setPosition(0, -40, 0);
        viewport.addComponent(UITransform).setContentSize(viewW, viewH);
        const mask = viewport.addComponent(Mask);
        mask.type = Mask.Type.GRAPHICS_RECT;
        panel.addChild(viewport);

        const content = new Node('Grid');
        content.layer = UI_2D;
        const contentUi = content.addComponent(UITransform);
        contentUi.setAnchorPoint(0.5, 1);
        contentUi.setContentSize(viewW, Math.max(contentH, viewH));
        content.setPosition(0, viewH / 2, 0);
        viewport.addChild(content);

        let touchId = -1;
        let lastTouchY = 0;
        let dragStartY = 0;
        let dragging = false;
        let tracking = false;
        let seenY = Number.NaN;
        let syncCards = () => {};
        const scrollBy = (dy: number) => {
            if (contentH <= viewH) return;
            // 内容锚在顶边。手指上移，格子跟着上移，下面的关卡才进视口。
            const yMin = viewH / 2;
            const yMax = yMin + (contentH - viewH);
            const next = Math.min(yMax, Math.max(yMin, content.position.y + dy));
            content.setPosition(0, next, 0);
            syncCards();
        };
        const arm = (e: EventTouch) => {
            const id = e.getID();
            if (touchId === id && dragging) return;
            touchId = id;
            dragging = true;
            tracking = false;
            dragStartY = e.getUILocation().y;
            lastTouchY = dragStartY;
            seenY = Number.NaN;
        };
        const disarm = () => {
            dragging = false;
            tracking = false;
            touchId = -1;
        };
        const followScroll = (e: EventTouch) => {
            if (this.node.getChildByName('SharePreview')) return;
            const y = e.getUILocation().y;
            if (!dragging || e.getID() !== touchId) arm(e);
            if (y === seenY) return;
            seenY = y;
            if (!tracking) {
                if (Math.abs(y - dragStartY) <= ALBUM_SCROLL_SLOP) return;
                tracking = true;
                scrollBy(y - dragStartY);
                lastTouchY = y;
                return;
            }
            scrollBy(y - lastTouchY);
            lastTouchY = y;
        };
        viewport.on(Node.EventType.TOUCH_START, arm, this, true);
        viewport.on(Node.EventType.TOUCH_MOVE, followScroll, this, true);
        viewport.on(Node.EventType.TOUCH_END, disarm, this, true);
        viewport.on(Node.EventType.TOUCH_CANCEL, disarm, this, true);

        if (maxShow === 0) {
            this.addLabel(panel, 'Empty', '还没收过冰箱，先去收拾一层', 26, FRAME, 520, 40).setPosition(0, 80, 0);
        }

        const close = this.albumBackBtn
            ? this.addSprite(panel, 'Close', this.albumBackBtn, 160, 62, 0, ALBUM_CLOSE_Y, Color.WHITE)
            : this.addLabel(panel, 'Close', '返回', 28, new Color(107, 74, 58, 180), 160, 40);
        close.setPosition(0, ALBUM_CLOSE_Y, 0);
        this.bindHudPress(close, () => {
            if (layer.isValid) layer.destroy();
        });
        return {
            layer,
            content,
            viewH,
            cardW,
            cardH,
            pitch,
            cols,
            gapX,
            total,
            rows,
            maxShow,
            cleared,
            album,
            followScroll,
            setSync: (fn: () => void) => {
                syncCards = fn;
            },
        };
    }

    /** 封门和食材到位后，只创建视口里的卡。食材用存档 kinds，不按袋子重算。 */
    private async fillAlbumCards(token: number, shell: {
        layer: Node;
        content: Node;
        viewH: number;
        cardW: number;
        cardH: number;
        pitch: number;
        cols: number;
        gapX: number;
        total: number;
        rows: number;
        maxShow: number;
        cleared: number;
        album: ReturnType<typeof prepareAlbum>;
        followScroll: (e: EventTouch) => void;
        setSync: (fn: () => void) => void;
    }) {
        await Promise.all([this.ensureAlbumFrames(), this.ensureFoodFrames()]);
        if (token !== this.albumToken || !shell.layer.isValid) return;
        if (shell.total <= 0) return;
        const winRows = Math.min(shell.rows, Math.ceil(shell.viewH / shell.pitch) + 1);
        const poolCount = Math.min(shell.total, winRows * shell.cols);
        const slots: { index: number; node: Node }[] = [];
        for (let i = 0; i < poolCount; i++) {
            slots.push(this.makeAlbumPoolCard(shell, i));
        }
        let windowRow = -1;
        const sync = () => {
            const scrolled = shell.content.position.y - shell.viewH / 2;
            let row = Math.floor(scrolled / shell.pitch);
            if (row < 0) row = 0;
            const maxRow = Math.max(0, shell.rows - winRows);
            if (row > maxRow) row = maxRow;
            if (row === windowRow) return;
            windowRow = row;
            const start = row * shell.cols;
            for (let i = 0; i < poolCount; i++) {
                const index = start + i;
                const slot = slots[index % poolCount];
                if (index >= shell.total) {
                    slot.node.active = false;
                    continue;
                }
                slot.node.active = true;
                this.bindAlbumPoolCard(shell, slot, index);
            }
        };
        shell.setSync(sync);
        sync();
    }

    private makeAlbumPoolCard(shell: {
        content: Node;
        cardW: number;
        cardH: number;
        followScroll: (e: EventTouch) => void;
        maxShow: number;
        album: ReturnType<typeof prepareAlbum>;
    }, slotIndex: number): { index: number; node: Node } {
        const card = new Node(`AlbumSlot${slotIndex}`);
        card.layer = UI_2D;
        card.addComponent(UITransform).setContentSize(shell.cardW, shell.cardH);
        this.paintAlbumPlaque(card, shell.cardW, shell.cardH, MILK, WALNUT);
        shell.content.addChild(card);
        const slotW = shell.cardW - 48;
        const slotH = 112;
        const empty = new Node('Empty');
        empty.layer = UI_2D;
        empty.setPosition(0, 32, 0);
        empty.addComponent(UITransform).setContentSize(slotW, slotH);
        const sg = empty.addComponent(Graphics);
        sg.lineWidth = 3;
        sg.strokeColor = new Color(176, 130, 96, 150);
        sg.roundRect(-slotW / 2, -slotH / 2, slotW, slotH, 12);
        sg.stroke();
        empty.active = false;
        card.addChild(empty);
        const lv = this.addLabel(card, 'Lv', '', 22, WALNUT, shell.cardW - 16, 28);
        lv.setPosition(0, -82, 0);
        const status = this.addLabel(card, 'Status', '', 15, FRAME, shell.cardW - 16, 24);
        status.setPosition(0, -108, 0);
        const statusLabel = status.getComponent(Label);
        if (statusLabel) statusLabel.overflow = Label.Overflow.SHRINK;
        const slot = { index: -1, node: card };
        let pressAt = 0;
        let pressedIndex = -1;
        let shared = false;
        let startX = 0;
        let startY = 0;
        let scrolling = false;
        card.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
            if (slot.index < 0 || slot.index >= shell.maxShow) return;
            pressAt = Date.now();
            pressedIndex = slot.index;
            shared = false;
            scrolling = false;
            const p = e.getUILocation();
            startX = p.x;
            startY = p.y;
            this.scheduleOnce(() => {
                if (pressAt > 0 && !scrolling && Date.now() - pressAt >= ALBUM_LONG_PRESS_MS) {
                    if (shared || scrolling || pressedIndex < 0 || pressedIndex >= shell.maxShow) return;
                    shared = true;
                    const levelId = pressedIndex + 1;
                    this.showAlbumShare(levelId, this.levelById(levelId), shell.album.entries[String(levelId)]);
                }
            }, ALBUM_LONG_PRESS_MS / 1000);
        }, this);
        card.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
            const p = e.getUILocation();
            if (Math.abs(p.x - startX) > ALBUM_SCROLL_SLOP || Math.abs(p.y - startY) > ALBUM_SCROLL_SLOP) {
                pressAt = 0;
                scrolling = true;
            }
            shell.followScroll(e);
        }, this);
        card.on(Node.EventType.TOUCH_END, () => {
            const held = pressAt > 0 ? Date.now() - pressAt : 0;
            const wasPress = pressAt > 0;
            const index = pressedIndex;
            pressAt = 0;
            pressedIndex = -1;
            if (wasPress && !scrolling && !shared && held < ALBUM_LONG_PRESS_MS && index >= 0 && index < shell.maxShow) {
                const next = this.levelById(index + 1);
                if (!next) {
                    this.showToast('这一关还没收拾');
                } else {
                    playBtnClick();
                    const layer = this.node.getChildByName('AlbumLayer');
                    if (layer && layer.isValid) layer.destroy();
                    this.startLevel(next);
                }
            }
            scrolling = false;
        }, this);
        card.on(Node.EventType.TOUCH_CANCEL, () => {
            pressAt = 0;
            scrolling = false;
        }, this);
        return slot;
    }

    /** 把一张复用卡绑到列表下标。已收关的门心食材来自存档 kinds。 */
    private bindAlbumPoolCard(shell: {
        content: Node;
        cardW: number;
        cardH: number;
        pitch: number;
        cols: number;
        gapX: number;
        maxShow: number;
        cleared: number;
        album: ReturnType<typeof prepareAlbum>;
    }, slot: { index: number; node: Node }, index: number) {
        if (slot.index === index) return;
        slot.index = index;
        const col = index % shell.cols;
        const row = Math.floor(index / shell.cols);
        slot.node.setPosition((col - 1) * (shell.cardW + shell.gapX), -(row * shell.pitch + shell.cardH / 2), 0);
        const ghost = index >= shell.maxShow;
        const empty = slot.node.getChildByName('Empty');
        const thumb = slot.node.getChildByName('Thumb');
        const tag = slot.node.getChildByName('GradeTag');
        if (thumb) {
            thumb.removeFromParent();
            thumb.destroy();
        }
        if (tag) {
            tag.removeFromParent();
            tag.destroy();
        }
        if (empty) empty.active = ghost;
        const lv = slot.node.getChildByName('Lv');
        const lvLabel = lv ? lv.getComponent(Label) : null;
        const status = slot.node.getChildByName('Status');
        const statusLabel = status ? status.getComponent(Label) : null;
        if (ghost) {
            this.paintAlbumPlaque(slot.node, shell.cardW, shell.cardH, new Color(255, 253, 248, 120), new Color(107, 74, 58, 90));
            if (lvLabel) {
                lvLabel.string = `第 ${shell.cleared + 1} 关`;
                lvLabel.color = new Color(107, 74, 58, 140);
            }
            if (status) status.active = false;
            return;
        }
        this.paintAlbumPlaque(slot.node, shell.cardW, shell.cardH, MILK, WALNUT);
        const levelId = index + 1;
        const level = this.levelById(levelId);
        const entry = shell.album.entries[String(levelId)];
        if (level) this.paintAlbumThumb(slot.node, level, entry && entry.kinds ? entry.kinds : [], 0, 32, shell.cardW - 28, 104);
        this.paintAlbumGradeTag(slot.node, visibleAlbumGrade(level, entry), 0, -46);
        if (lvLabel) {
            lvLabel.string = `第 ${levelId} 关`;
            lvLabel.color = WALNUT;
        }
        if (status) status.active = true;
        if (statusLabel) statusLabel.string = albumStatusLine(entry, level);
    }

    /** 按这一关的竖格 / 横屉把封门贴进固定区域。容量大的格子更大。 */
    private paintAlbumThumb(
        parent: Node,
        level: LevelDef,
        kinds: (FoodId | null)[],
        x: number,
        y: number,
        boxW: number,
        boxH: number,
    ) {
        const thumb = new Node('Thumb');
        thumb.layer = UI_2D;
        thumb.setPosition(x, y, 0);
        thumb.addComponent(UITransform).setContentSize(boxW, boxH);
        parent.addChild(thumb);
        const caps = level.trays.map((tray) => tray.cap);
        const cells = this.albumThumbCells(level.id, caps, boxW - 8, boxH - 8);
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            const frame = new Node(`Cell${i}`);
            frame.layer = UI_2D;
            frame.setPosition(cell.x, cell.y, 0);
            frame.addComponent(UITransform).setContentSize(cell.w, cell.h);
            const g = frame.addComponent(Graphics);
            g.fillColor = FRAME;
            g.roundRect(-cell.w / 2, -cell.h / 2, cell.w, cell.h, 8);
            g.fill();
            thumb.addChild(frame);
            const doorW = Math.max(8, cell.w - 8);
            const doorH = Math.max(8, cell.h - 8);
            const doorFrame = cell.horizontal ? this.albumDoorWide : this.albumDoor;
            if (doorFrame) {
                this.addSprite(frame, 'Door', doorFrame, doorW, doorH, 0, 0, Color.WHITE);
            } else {
                const door = new Node('Door');
                door.layer = UI_2D;
                door.addComponent(UITransform).setContentSize(doorW, doorH);
                const dg = door.addComponent(Graphics);
                dg.fillColor = DOOR;
                dg.roundRect(-doorW / 2, -doorH / 2, doorW, doorH, 6);
                dg.fill();
                dg.fillColor = HANDLE;
                const handleH = Math.max(8, doorH * 0.4);
                dg.roundRect(doorW / 2 - 6, -handleH / 2, 4, handleH, 2);
                dg.fill();
                frame.addChild(door);
            }
            const kind = kinds[i] || null;
            if (kind) {
                const food = this.trayFridgeFoodFrame(kind, cell.horizontal);
                if (food) {
                    const box = this.milkThumbInDoor(kind, cell.horizontal, doorW, doorH);
                    this.addSprite(frame, 'Food', food, box.w, box.h, box.x, 0, Color.WHITE);
                }
            }
        }
    }

    private albumThumbCells(levelId: number, caps: number[], boxW: number, boxH: number): {
        x: number;
        y: number;
        w: number;
        h: number;
        horizontal: boolean;
    }[] {
        const cacheKey = `${levelId}:${boxW}:${boxH}`;
        const cached = this.albumCellCache[cacheKey];
        if (cached) return cached;
        const grid = packTrayGrid(levelId, caps);
        const pitch = Math.min(boxW / grid.cols, boxH / grid.rows);
        const gap = pitch * (TRAY_GAP / 109);
        const packW = grid.cols * pitch;
        const packH = grid.rows * pitch;
        const out: { x: number; y: number; w: number; h: number; horizontal: boolean }[] = [];
        for (let i = 0; i < grid.cells.length; i++) {
            const cell = grid.cells[i];
            const w = cell.spanW * pitch - gap;
            const h = cell.spanH * pitch - gap;
            out.push({
                x: -packW / 2 + cell.col * pitch + gap / 2 + w / 2,
                y: packH / 2 - (cell.row * pitch + gap / 2 + h / 2),
                w,
                h,
                horizontal: cell.horizontal,
            });
        }
        const shifted: { x: number; outerW: number }[] = [];
        for (let i = 0; i < out.length; i++) shifted.push({ x: out[i].x, outerW: out[i].w });
        this.centerLoneTrayRows(grid.cells, shifted, -packW / 2, packW);
        for (let i = 0; i < out.length; i++) out[i].x = shifted[i].x;
        this.albumCellCache[cacheKey] = out;
        return out;
    }

    /** 奶油底、胡桃木粗框。描边收在卡片里面，避免被列表裁掉。 */
    private paintAlbumPlaque(node: Node, w: number, h: number, fill: Color, stroke: Color) {
        const g = node.getComponent(Graphics) || node.addComponent(Graphics);
        g.clear();
        const radius = 20;
        const width = 8;
        g.fillColor = fill;
        g.roundRect(-w / 2, -h / 2, w, h, radius);
        g.fill();
        g.lineWidth = width;
        g.strokeColor = new Color(224, 150, 92, stroke.a);
        const inset = width * 0.5;
        g.roundRect(-w / 2 + inset, -h / 2 + inset, w - width, h - width, radius - 2);
        g.stroke();
    }

    /** 实色标签。章图本身是浅底，贴在奶油卡上会看不见。没达到不留空位。 */
    private paintAlbumGradeTag(parent: Node, grade: AlbumGrade | null, x: number, y: number) {
        if (grade !== 'sage' && grade !== 'walnut') return;
        const w = 88;
        const h = 32;
        const tag = new Node('GradeTag');
        tag.layer = UI_2D;
        tag.setPosition(x, y, 0);
        tag.addComponent(UITransform).setContentSize(w, h);
        const g = tag.addComponent(Graphics);
        g.fillColor = grade === 'walnut' ? WALNUT : SAGE;
        g.roundRect(-w / 2, -h / 2, w, h, 16);
        g.fill();
        parent.addChild(tag);
        this.addLabel(tag, 'Txt', grade === 'walnut' ? '完美' : '利落', 18, MILK, w - 8, 28);
    }

    /** 图鉴长按：现拼这一关的缩略、关号和步数。不用胜利分享底。 */
    private showAlbumShare(levelId: number, level: LevelDef | null, entry: AlbumEntry | undefined) {
        const old = this.node.getChildByName('SharePreview');
        if (old) old.destroy();
        const size = this.canvasSize();
        const layer = new Node('SharePreview');
        layer.layer = UI_2D;
        layer.addComponent(UITransform).setContentSize(size.w, size.h);
        this.node.addChild(layer);
        const dim = this.addSprite(layer, 'Dim', this.builtin, size.w, size.h, 0, 0, new Color(48, 48, 48, 160));
        const card = new Node('Card');
        card.layer = UI_2D;
        card.setPosition(0, 40, 0);
        card.addComponent(UITransform).setContentSize(480, 420);
        const g = card.addComponent(Graphics);
        g.fillColor = CREAM;
        g.roundRect(-240, -210, 480, 420, 32);
        g.fill();
        layer.addChild(card);
        if (level) this.paintAlbumThumb(card, level, entry ? entry.kinds : [], 0, 36, 360, 150);
        this.paintAlbumGradeTag(card, visibleAlbumGrade(level, entry), 0, -62);
        this.addLabel(card, 'Lv', `第 ${levelId} 关`, 32, WALNUT, 400, 42).setPosition(0, -108, 0);
        this.addLabel(card, 'Status', albumStatusLine(entry, level), 24, FRAME, 400, 36).setPosition(0, -156, 0);
        const close = () => {
            if (layer.isValid) layer.destroy();
        };
        dim.on(Node.EventType.TOUCH_END, () => {
            playBtnClick();
            close();
        }, this);
        this.scheduleOnce(close, 2.4);
    }

    /** 分享预览：叠 share_win 成品图 + 文案 Toast，不挡返回。 */
    private showSharePreview(tip: string) {
        const old = this.node.getChildByName('SharePreview');
        if (old) old.destroy();
        const size = this.canvasSize();
        const layer = new Node('SharePreview');
        layer.layer = UI_2D;
        layer.addComponent(UITransform).setContentSize(size.w, size.h);
        this.node.addChild(layer);
        const dim = this.addSprite(layer, 'Dim', this.builtin, size.w, size.h, 0, 0, new Color(48, 48, 48, 160));
        if (this.shareWin) {
            const art = this.addSprite(layer, 'Art', this.shareWin, 520, 650, 0, 40, Color.WHITE);
            art.setScale(0.92, 0.92, 1);
            tween(art)
                .to(0.28, { scale: new Vec3(1, 1, 1) }, { easing: easing.backOut })
                .start();
        }
        this.addLabel(layer, 'Tip', tip, 24, MILK, 600, 40).setPosition(0, -360, 0);
        const close = () => {
            if (layer.isValid) layer.destroy();
        };
        dim.on(Node.EventType.TOUCH_END, () => {
            playBtnClick();
            close();
        }, this);
        this.scheduleOnce(close, 2.4);
    }

    private milestoneSeen(n: number): boolean {
        return sys.localStorage.getItem(MILESTONE_KEY(n)) === '1';
    }

    private markMilestoneSeen(n: number) {
        sys.localStorage.setItem(MILESTONE_KEY(n), '1');
    }

    private clearedId(): number {
        const raw = sys.localStorage.getItem(CLEARED_KEY);
        const n = raw ? parseInt(raw, 10) : 0;
        return n > 0 ? n : 0;
    }

    private levelById(id: number): LevelDef | null {
        return levelDefById(id);
    }

    private markCleared(id: number) {
        const prev = this.clearedId();
        if (id <= prev) return;
        sys.localStorage.setItem(CLEARED_KEY, String(id));
        for (let i = 0; i < MILESTONE_NS.length; i++) {
            const m = MILESTONE_NS[i];
            if (prev < m && id >= m && !this.milestoneSeen(m)) {
                this.pendingMilestone = m;
            }
        }
    }

    /** 已在内存里的图不再请求。多张一起加载，不排队。 */
    private loadSlot(current: SpriteFrame | null, uuid: string, save: (frame: SpriteFrame) => void): Promise<void> {
        if (current) return Promise.resolve();
        return loadFrame(uuid).then((frame) => {
            if (frame) save(frame);
        });
    }

    private ensureLevel1Frames(): Promise<void> {
        if (!this.level1Ready) this.level1Ready = this.loadLevel1Frames();
        return this.level1Ready;
    }

    /** 第 1 关：背景、冰箱框、台面、托盘、牛奶、手指、重开。 */
    private loadLevel1Frames(): Promise<void> {
        return Promise.all([
            this.loadSlot(this.builtin, UUID.builtin, (frame) => { this.builtin = frame; }),
            this.loadSlot(this.bgPlay, UUID.bgPlay, (frame) => { this.bgPlay = frame; }),
            this.loadSlot(this.worktopTop, UUID.worktopTop, (frame) => { this.worktopTop = frame; }),
            this.loadSlot(this.worktopFront, UUID.worktopFront, (frame) => { this.worktopFront = frame; }),
            this.loadSlot(this.propBoard, UUID.propBoard, (frame) => { this.propBoard = frame; }),
            this.loadSlot(this.propCup, UUID.propCup, (frame) => { this.propCup = frame; }),
            this.loadSlot(this.propCloth, UUID.propCloth, (frame) => { this.propCloth = frame; }),
            this.loadSlot(this.bagTrayLower, UUID.bagTrayLower, (frame) => { this.bagTrayLower = frame; }),
            this.loadSlot(this.bagTrayTop, UUID.bagTrayTop, (frame) => { this.bagTrayTop = frame; }),
            this.loadSlot(this.foodMilk, UUID.foodMilk, (frame) => { this.foodMilk = frame; }),
            this.loadSlot(this.foodMilkSlot, UUID.foodMilkSlot, (frame) => { this.foodMilkSlot = frame; }),
            this.loadSlot(this.handPoint, UUID.handPoint, (frame) => { this.handPoint = frame; }),
            this.loadSlot(this.iconUndo, UUID.iconUndo, (frame) => { this.iconUndo = frame; }),
            this.loadSlot(this.iconHome, UUID.iconHome, (frame) => { this.iconHome = frame; }),
        ]).then(() => undefined);
    }

    private ensureRestFrames(): Promise<void> {
        if (!this.restReady) this.restReady = this.loadRestFrames();
        return this.restReady;
    }

    private ensureAlbumFrames(): Promise<void> {
        if (!this.albumReady) this.albumReady = this.loadAlbumFrames();
        return this.albumReady;
    }

    private ensureFoodFrames(): Promise<void> {
        if (!this.foodReady) this.foodReady = this.loadFoodFrames();
        return this.foodReady;
    }

    /** 图鉴门心里的食材。牛奶在第 1 关已经加载过的话不会再请求。 */
    private loadFoodFrames(): Promise<void> {
        return Promise.all([
            this.loadSlot(this.foodMilk, UUID.foodMilk, (frame) => { this.foodMilk = frame; }),
            this.loadSlot(this.foodVeg, UUID.foodVeg, (frame) => { this.foodVeg = frame; }),
            this.loadSlot(this.foodFruit, UUID.foodFruit, (frame) => { this.foodFruit = frame; }),
            this.loadSlot(this.foodMeat, UUID.foodMeat, (frame) => { this.foodMeat = frame; }),
            this.loadSlot(this.foodSauce, UUID.foodSauce, (frame) => { this.foodSauce = frame; }),
            this.loadSlot(this.foodSauceSlot, UUID.foodSauceSlot, (frame) => { this.foodSauceSlot = frame; }),
            this.loadSlot(this.foodLeftover, UUID.foodLeftover, (frame) => { this.foodLeftover = frame; }),
            this.loadSlot(this.foodGrape, UUID.foodGrape, (frame) => { this.foodGrape = frame; }),
            this.loadSlot(this.foodLemon, UUID.foodLemon, (frame) => { this.foodLemon = frame; }),
            this.loadSlot(this.foodKiwi, UUID.foodKiwi, (frame) => { this.foodKiwi = frame; }),
            this.loadSlot(this.foodPineapple, UUID.foodPineapple, (frame) => { this.foodPineapple = frame; }),
            this.loadSlot(this.foodWatermelon, UUID.foodWatermelon, (frame) => { this.foodWatermelon = frame; }),
            this.loadSlot(this.foodCoconut, UUID.foodCoconut, (frame) => { this.foodCoconut = frame; }),
        ]).then(() => undefined);
    }

    /** 图鉴封门和首通章。主页打开图鉴时就要在。 */
    private loadAlbumFrames(): Promise<void> {
        return Promise.all([
            this.loadSlot(this.albumDoor, UUID.albumDoor, (frame) => { this.albumDoor = frame; }),
            this.loadSlot(this.albumDoorWide, UUID.albumDoorWide, (frame) => { this.albumDoorWide = frame; }),
            this.loadSlot(this.albumBadge, UUID.albumBadge, (frame) => { this.albumBadge = frame; }),
            this.loadSlot(this.albumBackBtn, UUID.albumBackBtn, (frame) => { this.albumBackBtn = frame; }),
            this.loadSlot(this.albumTitle, UUID.albumTitle, (frame) => { this.albumTitle = frame; }),
        ]).then(() => undefined);
    }

    /** 第 2 关起才用到的食物、提示、通关和柜台。bag_xxx 合成图画面不用，不加载。 */
    private loadRestFrames(): Promise<void> {
        return Promise.all([
            this.ensureFoodFrames(),
            this.loadSlot(this.iconHint, UUID.iconHint, (frame) => { this.iconHint = frame; }),
            this.loadSlot(this.winPerfect, UUID.winPerfect, (frame) => { this.winPerfect = frame; }),
            this.loadSlot(this.shareWin, UUID.shareWin, (frame) => { this.shareWin = frame; }),
            this.loadSlot(this.shareMilestone, UUID.shareMilestone, (frame) => { this.shareMilestone = frame; }),
            this.loadSlot(this.bufferBoard, UUID.bufferBoard, (frame) => { this.bufferBoard = frame; }),
        ]).then(() => undefined);
    }

    private startLevel(level: LevelDef) {
        void this.openLevel(level);
    }

    /** 第 1 关只等自己的图。其它关等补齐后再画，避免先空白再闪现。 */
    private async openLevel(level: LevelDef) {
        if (this.enteringLevel) return;
        this.enteringLevel = true;
        try {
            if (level.id === 1) await this.ensureLevel1Frames();
            else await Promise.all([this.ensureLevel1Frames(), this.ensureRestFrames()]);
            if (!this.node || !this.node.isValid) return;
            this.presentLevel(level);
            if (level.id === 1) void this.ensureRestFrames();
        } finally {
            this.enteringLevel = false;
        }
    }

    private presentLevel(level: LevelDef) {
        this.unscheduleAllCallbacks();
        this.clearFoodPress();
        this.closeSettingsLayer();
        for (let i = 0; i < HOME_NODES.length; i++) {
            const n = this.node.getChildByName(HOME_NODES[i]);
            if (n) n.active = false;
        }
        this.board = BoardState.fromLevel(level);
        this.busy = false;
        this.levelFailed = false;
        this.animateDoorIndex = null;
        this.holdWin = false;
        this.firstKindToast = true;
        this.holdHintTrays = [];
        this.holdHintBuffers = [];
        this.holdHint = null;
        this.hintUsed = false;
        this.sizeTeach = level.id === 17 ? 'intro' : null;
        this.holdCapFlash = null;
        this.holdShakeKind = null;
        this.revealBagCol = null;
        this.lockedBagCol = null;
        this.l1Guide = level.id === 1 && this.clearedId() < 1;
        this.bagRowPlan = this.buildBagRowPlan(level);
        this.ensurePlayRoot();
        this.playRoot.active = true;
        this.render();
    }

    /**
     * ≥5 列：按开局深度深后浅前；同深按列号稳序；前后排内再按列号左→右。
     * 第 17 关 4 列也分两排，前排再错开半个盘位。
     */
    private buildBagRowPlan(level: LevelDef): { front: number[]; back: number[] } | null {
        if (level.id === 17) return { back: [0, 2], front: [1, 3] };
        const n = level.bags.length;
        if (n < BAG_TWO_ROW_MIN) return null;
        const ranked = level.bags.map((col, i) => ({ i, len: col.length }));
        ranked.sort((a, b) => (b.len !== a.len ? b.len - a.len : a.i - b.i));
        const backCount = Math.ceil(n / 2);
        const back = ranked.slice(0, backCount).map((x) => x.i).sort((a, b) => a - b);
        const front = ranked.slice(backCount).map((x) => x.i).sort((a, b) => a - b);
        return { front, back };
    }

    private nextPlayable(id: number): LevelDef | null {
        return nextPlayableLevel(id);
    }

    private continueLevel(): LevelDef {
        if (this.gmLevelId != null) {
            const forced = this.levelById(this.gmLevelId);
            if (forced) return forced;
        }
        const nextId = this.clearedId() + 1;
        const next = this.nextPlayable(nextId - 1);
        return next || PLAYABLE[PLAYABLE.length - 1];
    }

    private ensurePlayRoot() {
        if (this.playRoot && this.playRoot.isValid) return;
        const root = new Node('PlayRoot');
        root.layer = UI_2D;
        const size = this.canvasSize();
        root.addComponent(UITransform).setContentSize(size.w, size.h);
        this.node.addChild(root);
        this.playRoot = root;
    }

    private canvasSize(): { w: number; h: number } {
        const ui = this.node.getComponent(UITransform);
        if (ui && ui.width > 0 && ui.height > 0) return { w: ui.width, h: ui.height };
        const vis = view.getVisibleSize();
        return { w: vis.width || DESIGN_W, h: vis.height || DESIGN_H };
    }

    private render() {
        const root = this.playRoot;
        const board = this.board;
        if (!root || !board) return;
        // destroyAllChildren 本帧末才真正销毁；先 detach 避免旧 BufferBoard 继续吃触摸。
        const stale = root.children.slice();
        for (let i = 0; i < stale.length; i++) {
            stale[i].removeFromParent();
            stale[i].destroy();
        }

        const size = this.canvasSize();
        const rootUi = root.getComponent(UITransform);
        if (rootUi) rootUi.setContentSize(size.w, size.h);

        const playBg = this.bgPlay;
        this.addSprite(root, 'PlayBgWall', playBg || this.builtin, size.w, size.h, 0, 0, playBg ? Color.WHITE : CREAM);
        this.drawTrays(root, board);
        this.drawPropBoard(root);
        this.drawWorktopBack(root);
        this.drawMidProps(root);
        this.drawBags(root, board);
        this.drawWorktopFront(root);
        this.drawHud(root);
        // 柜台必须在 HUD 之后画，触摸优先于顶栏；空槽 HitPad 始终在最上以免被提示框挡住。
        this.drawBuffer(root, board);
        if (this.sizeTeach && !board.isWin()) this.drawSizeTeach(root);

        if (board.isWin() && !this.holdWin) {
            const size = this.canvasSize();
            this.addSprite(root, 'WinDim', this.builtin, size.w, size.h, 0, 0, new Color(48, 48, 48, 178));
            if (this.winPerfect) {
                this.addWinPerfectStamp(root, 0, 80, 560);
            } else {
                this.addLabel(root, 'WinTitle', '完美收纳！', 40, new Color(248, 240, 220, 255), 640, 80).setPosition(0, 80, 0);
            }
        }
    }

    private drawHud(parent: Node) {
        const y = this.hudY();
        const pill = new Node('LevelPill');
        pill.layer = UI_2D;
        pill.setPosition(0, y, 0);
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
        parent.addChild(pill);
        const lv = this.addLabel(
            pill,
            'LevelLabel',
            `第 ${this.board ? this.board.level.id : 1} 关`,
            LEVEL_LABEL_FONT,
            WALNUT,
            LEVEL_PILL_W - 20,
            LEVEL_LABEL_LINE,
        );
        const lvLabel = lv.getComponent(Label);
        if (lvLabel) {
            lvLabel.lineHeight = LEVEL_LABEL_LINE;
            lvLabel.fontFamily = 'Microsoft YaHei';
        }

        const home = new Node('BtnHome');
        home.layer = UI_2D;
        home.setPosition(-312, y, 0);
        home.addComponent(UITransform).setContentSize(88, 88);
        parent.addChild(home);
        this.addSprite(home, 'Icon', this.iconHome, 88, 88, 0, 0, Color.WHITE);
        this.bindHudPress(home, () => this.goHome());

        const showHint = !!(this.board && this.board.level.id >= 7);
        const undo = this.addHudRoundBtn(parent, 'BtnUndo', showHint ? 216 : 312, y);
        this.addSprite(undo, 'Icon', this.iconUndo, 48, 48, 0, 0, WALNUT);
        this.bindHudPress(undo, () => this.restartLevel());

        if (showHint) {
            const hint = this.addHudRoundBtn(parent, 'BtnHint', 312, y);
            this.addSprite(hint, 'Icon', this.iconHint, 48, 48, 0, 0, SAGE);
            if (this.board && this.board.level.id >= 8 && !this.hintUsed) {
                this.paintAdDot(hint);
            }
            if (this.hintUsed) {
                const dim = hint.addComponent(UIOpacity);
                dim.opacity = 110;
            }
            this.bindHudPress(hint, () => this.onHintTap());
        }
    }

    /** 微信刘海和右上角胶囊以下。编辑器里按顶栏 96px。只动 HUD。 */
    private hudY(): number {
        const canvasUi = this.node.getComponent(UITransform);
        const canvasH = canvasUi && canvasUi.height > 0 ? canvasUi.height : view.getVisibleSize().height;
        const top = canvasH / 2;
        const inset = this.wechatTopInset();
        return top - inset - 8 - 44;
    }

    private wechatTopInset(): number {
        const fallback = 96;
        const wxApi = (globalThis as { wx?: WechatMiniGame }).wx;
        if (!wxApi) return fallback;
        const visibleW = view.getVisibleSize().width || DESIGN_W;
        try {
            const info = wxApi.getWindowInfo ? wxApi.getWindowInfo() : wxApi.getSystemInfoSync?.();
            const windowW = info && (info.windowWidth || info.screenWidth);
            const scale = windowW ? visibleW / windowW : 1;
            let top = info && info.safeArea ? info.safeArea.top : info && info.statusBarHeight ? info.statusBarHeight : 0;
            const menu = wxApi.getMenuButtonBoundingClientRect?.();
            if (menu && menu.bottom) top = Math.max(top, menu.bottom);
            const design = Math.round(top * scale);
            return design > 0 ? design : fallback;
        } catch {
            return fallback;
        }
    }

    private addHudRoundBtn(parent: Node, name: string, x: number, y: number): Node {
        const btn = new Node(name);
        btn.layer = UI_2D;
        btn.setPosition(x, y, 0);
        btn.addComponent(UITransform).setContentSize(88, 88);
        const g = btn.addComponent(Graphics);
        g.fillColor = MILK;
        g.circle(0, 0, 40);
        g.fill();
        g.lineWidth = 2;
        g.strokeColor = new Color(107, 74, 58, 48);
        g.circle(0, 0, 40);
        g.stroke();
        parent.addChild(btn);
        return btn;
    }

    private bindHudPress(btn: Node, tap: () => void) {
        btn.on(Node.EventType.TOUCH_START, () => {
            tween(btn).to(0.08, { scale: new Vec3(0.97, 0.97, 1) }).start();
        }, this);
        btn.on(Node.EventType.TOUCH_CANCEL, () => {
            tween(btn).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
        }, this);
        btn.on(Node.EventType.TOUCH_END, () => {
            tween(btn).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
            playBtnClick();
            tap();
        }, this);
    }

    private restartLevel() {
        if (!this.board) return;
        if (this.busy && !this.levelFailed) return;
        this.startLevel(this.board.level);
    }

    private onHintTap() {
        if (!this.board || this.busy || this.board.isWin()) return;
        if (this.board.level.id < 7) return;
        if (this.hintUsed) {
            if (!this.holdHint) this.showToast('本关提示用过了');
            return;
        }
        const pick = this.board.findHint();
        if (!pick) {
            this.showToast('这一步已经收不回去了，点撤销');
            return;
        }
        if (this.board.level.id >= 8) {
            this.playHintAd(() => this.grantHint(pick));
            return;
        }
        this.grantHint(pick);
    }

    private grantHint(pick: HintPick) {
        this.hintUsed = true;
        this.holdHint = pick;
        this.busy = false;
        this.render();
    }

    private playHintAd(done: () => void) {
        const root = this.playRoot;
        if (!root) {
            done();
            return;
        }
        this.busy = true;
        const old = root.getChildByName('HintAd');
        if (old) old.destroy();
        const layer = new Node('HintAd');
        layer.layer = UI_2D;
        layer.addComponent(UITransform).setContentSize(DESIGN_W, DESIGN_H);
        this.addSprite(layer, 'Dim', this.builtin, DESIGN_W, DESIGN_H, 0, 0, new Color(61, 50, 41, 102));
        const card = new Node('Card');
        card.layer = UI_2D;
        card.addComponent(UITransform).setContentSize(420, 120);
        const g = card.addComponent(Graphics);
        g.fillColor = MILK;
        g.roundRect(-210, -60, 420, 120, 28);
        g.fill();
        this.addLabel(card, 'Txt', '看完这段就能提示', 28, WALNUT, 380, 48);
        layer.addChild(card);
        root.addChild(layer);
        this.scheduleOnce(() => {
            if (layer.isValid) layer.destroy();
            done();
        }, 0.9);
    }

    private paintAdDot(btn: Node) {
        const dot = new Node('AdDot');
        dot.layer = UI_2D;
        dot.setPosition(26, 26, 0);
        dot.addComponent(UITransform).setContentSize(24, 24);
        const g = dot.addComponent(Graphics);
        g.fillColor = CORAL;
        g.circle(0, 0, 12);
        g.fill();
        this.addLabel(dot, 'Txt', '广', 14, MILK, 22, 20);
        btn.addChild(dot);
    }

    private goHome() {
        this.unscheduleAllCallbacks();
        this.busy = false;
        this.levelFailed = false;
        this.holdWin = false;
        this.animateDoorIndex = null;
        this.board = null;
        if (this.playRoot && this.playRoot.isValid) {
            this.playRoot.destroyAllChildren();
            this.playRoot.active = false;
        }
        for (let i = 0; i < HOME_NODES.length; i++) {
            const n = this.node.getChildByName(HOME_NODES[i]);
            if (!n) continue;
            n.active = true;
        }
        this.refreshAlbumLink();
        this.polishHomeChrome();
        const mile = this.pendingMilestone;
        if (mile != null) {
            this.pendingMilestone = null;
            this.spawnMilestoneCard(mile);
        }
    }

    /** 主页里程碑拉新卡：同里程碑只弹一次（写 localStorage）。 */
    private spawnMilestoneCard(n: number) {
        if (this.milestoneSeen(n)) return;
        const old = this.node.getChildByName('MilestoneCard');
        if (old) old.destroy();

        const size = this.canvasSize();
        const layer = new Node('MilestoneCard');
        layer.layer = UI_2D;
        layer.setPosition(0, 0, 0);
        layer.addComponent(UITransform).setContentSize(size.w, size.h);
        this.node.addChild(layer);

        this.addSprite(layer, 'Dim', this.builtin, size.w, size.h, 0, 0, new Color(61, 50, 41, 140));

        const card = new Node('Card');
        card.layer = UI_2D;
        card.setPosition(0, 20, 0);
        card.setScale(0.9, 0.9, 1);
        card.addComponent(UITransform).setContentSize(560, 420);
        if (this.shareMilestone) {
            this.addSprite(card, 'Bg', this.shareMilestone, 560, 420, 0, 0, Color.WHITE);
        } else {
            const cg = card.addComponent(Graphics);
            cg.fillColor = CREAM;
            cg.roundRect(-280, -210, 560, 420, 36);
            cg.fill();
            cg.lineWidth = 4;
            cg.strokeColor = SAGE;
            cg.roundRect(-280, -210, 560, 420, 36);
            cg.stroke();
        }
        layer.addChild(card);

        this.addLabel(card, 'Title', `今晚已收 ${n} 关`, 40, WALNUT, 500, 52).setPosition(0, 20, 0);
        this.addLabel(
            card,
            'Sub',
            n >= 30 ? '图鉴 30 / 30 集齐了' : '冰箱一层一层收齐了',
            26,
            FRAME,
            480,
            36,
        ).setPosition(0, -28, 0);

        const share = new Node('Share');
        share.layer = UI_2D;
        share.setPosition(0, -100, 0);
        share.addComponent(UITransform).setContentSize(420, 88);
        const sg = share.addComponent(Graphics);
        sg.fillColor = SAGE;
        sg.roundRect(-210, -44, 420, 88, 44);
        sg.fill();
        this.addLabel(share, 'Txt', '叫朋友一起收', 32, MILK, 380, 48);
        card.addChild(share);

        const skip = this.addLabel(card, 'Skip', '先不用', 26, new Color(107, 74, 58, 153), 200, 40);
        skip.setPosition(0, -178, 0);

        const close = () => {
            this.markMilestoneSeen(n);
            if (layer.isValid) layer.destroy();
            this.refreshAlbumLink();
        };
        this.bindHudPress(share, () => {
            this.markMilestoneSeen(n);
            if (layer.isValid) layer.destroy();
            this.refreshAlbumLink();
            this.showSharePreview(`今晚已收 ${n} 关，来一起收冰箱`);
        });
        this.bindHudPress(skip, () => close());

        const op = card.addComponent(UIOpacity);
        op.opacity = 0;
        tween(op).to(0.2, { opacity: 255 }).start();
        tween(card)
            .to(0.32, { scale: new Vec3(1.04, 1.04, 1) }, { easing: easing.backOut })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private mixedCaps(): boolean {
        const board = this.board;
        if (!board || board.trays.length === 0) return false;
        const cap0 = board.trays[0].cap;
        return board.trays.some((t) => t.cap !== cap0);
    }

    /** 屏幕左上 y → Cocos 中心原点。 */
    private screenToCocosY(screenY: number): number {
        return DESIGN_H / 2 - screenY;
    }

    /** 短边 2P、长边 cap×P，整组居中铺进墙面。横格是竖格转 90 度。 */
    private trayLayout(board: BoardState): {
        horizontal: boolean;
        x: number;
        y: number;
        slotW: number;
        slotH: number;
        frame: number;
        outerW: number;
        outerH: number;
        cap: number;
    }[] {
        const caps = board.trays.map((t) => t.cap);
        const grid = packTrayGrid(board.level.id, caps);
        const pitch = Math.min(TRAY_WALL_W / grid.cols, TRAY_WALL_H / grid.rows);
        const packW = grid.cols * pitch;
        const packH = grid.rows * pitch;
        const originX = -packW / 2;
        const originTop = TRAY_WALL_TOP + (TRAY_WALL_H - packH) / 2;
        const frame = Math.max(8, Math.round(pitch * 0.12));
        const out: {
            horizontal: boolean;
            x: number;
            y: number;
            slotW: number;
            slotH: number;
            frame: number;
            outerW: number;
            outerH: number;
            cap: number;
        }[] = [];
        for (let i = 0; i < grid.cells.length; i++) {
            const cell = grid.cells[i];
            const outerW = cell.spanW * pitch - TRAY_GAP;
            const outerH = cell.spanH * pitch - TRAY_GAP;
            const left = originX + cell.col * pitch + TRAY_GAP / 2;
            const top = originTop + cell.row * pitch + TRAY_GAP / 2;
            out.push({
                horizontal: cell.horizontal,
                x: left + outerW / 2,
                y: this.screenToCocosY(top + outerH / 2),
                slotW: outerW - frame * 2,
                slotH: outerH - frame * 2,
                frame,
                outerW,
                outerH,
                cap: caps[i],
            });
        }
        this.centerLoneTrayRows(grid.cells, out, originX, packW);
        return out;
    }

    /** 某一行只有一个格子时，把这一格在该行里居中。 */
    private centerLoneTrayRows(
        cells: { row: number; spanH: number }[],
        metrics: { x: number; outerW: number }[],
        originX: number,
        packW: number,
    ) {
        for (let i = 0; i < cells.length; i++) {
            const cell = cells[i];
            let alone = true;
            for (let j = 0; j < cells.length; j++) {
                if (i === j) continue;
                const other = cells[j];
                if (cell.row < other.row + other.spanH && other.row < cell.row + cell.spanH) {
                    alone = false;
                    break;
                }
            }
            if (!alone) continue;
            metrics[i].x = originX + (packW - metrics[i].outerW) / 2 + metrics[i].outerW / 2;
        }
    }

    private trayAt(index: number) {
        const board = this.board;
        const layout = board ? this.trayLayout(board) : null;
        if (layout && layout[index]) return layout[index];
        return {
            horizontal: false, x: 0, y: 174, slotW: 116, slotH: 228, frame: 16, outerW: 148, outerH: 260, cap: 4,
        };
    }

    private drawTrays(root: Node, board: BoardState) {
        const n = board.trays.length;
        const metrics = this.trayLayout(board);
        for (let i = 0; i < n; i++) {
            const tray = board.trays[i];
            const m = metrics[i];
            const node = new Node(`Tray${i}`);
            node.layer = UI_2D;
            node.setPosition(m.x, m.y, 0);
            node.addComponent(UITransform).setContentSize(m.outerW, m.outerH);
            root.addChild(node);

            const selected = !!(board.dest && board.dest.kind === 'tray' && board.dest.index === i && !tray.sealed);
            const closing = this.animateDoorIndex === i;
            const closed = tray.sealed && !closing;
            const gNode = new Node('Cell');
            gNode.layer = UI_2D;
            gNode.addComponent(UITransform).setContentSize(m.outerW, m.outerH);
            const g = gNode.addComponent(Graphics);
            g.fillColor = selected ? WALNUT : FRAME;
            g.roundRect(-m.outerW / 2, -m.outerH / 2, m.outerW, m.outerH, 28);
            g.fill();
            if (closed) {
                this.paintDoor(g, m.slotW, m.slotH);
            } else {
                g.fillColor = selected ? new Color(245, 252, 255, 255) : new Color(198, 210, 214, 255);
                g.roundRect(-m.slotW / 2, -m.slotH / 2, m.slotW, m.slotH, m.horizontal ? 14 : 20);
                g.fill();
                const glowR = m.horizontal ? 12 : (selected ? 22 : 16);
                const glowY = m.slotH / 2 - (m.horizontal ? 16 : 28);
                g.fillColor = selected ? new Color(255, 255, 255, 200) : new Color(255, 255, 255, 70);
                g.circle(0, glowY, glowR);
                g.fill();
            }
            node.addChild(gNode);

            if (!closed) {
                this.drawCapacityLayers(node, m, tray.cap, tray.items.length, m.horizontal);
                this.drawFoodsInTray(node, tray.items, m.slotW, m.slotH, tray.cap, m.horizontal);
            }

            if (closing && tray.sealed) {
                const door = this.makeDoorNode(m.slotW, m.slotH);
                door.setScale(0.06, 1, 1);
                node.addChild(door);
            }

            if (!selected && !closed && this.holdHintTrays.indexOf(i) >= 0) {
                this.drawSwitchGuide(node, m);
            }
            if (
                this.holdHint
                && this.holdHint.dest.kind === 'tray'
                && this.holdHint.dest.index === i
                && !closed
            ) {
                this.drawSageDashedRing(node, m.outerW, m.outerH, 28, 'HintRing');
            }

            if (selected && !closed) {
                this.drawCoralFramePulse(node, m.outerW, m.outerH, 4, m.horizontal ? 16 : 24);
            }

            node.on(Node.EventType.TOUCH_END, () => {
                if (!this.board || this.busy || this.board.isWin() || tray.sealed) return;
                if (this.holdHintTrays.indexOf(i) >= 0) this.holdHintTrays = [];
                this.holdHintBuffers = [];
                this.board.selectTray(i);
                this.render();
            }, this);
        }
        this.raiseSwitchHands(root);
    }

    private paintDoor(g: Graphics, slotW: number, slotH: number) {
        g.fillColor = DOOR;
        g.roundRect(-slotW / 2, -slotH / 2, slotW, slotH, 20);
        g.fill();
        const handleH = Math.min(72, Math.max(28, Math.round(slotH * 0.46)));
        g.fillColor = HANDLE;
        g.roundRect(slotW / 2 - 20, -handleH / 2, 10, handleH, 5);
        g.fill();
    }

    private makeDoorNode(slotW: number, slotH: number): Node {
        const door = new Node('Door');
        door.layer = UI_2D;
        const ui = door.addComponent(UITransform);
        ui.setAnchorPoint(1, 0.5);
        ui.setContentSize(slotW, slotH);
        door.setPosition(slotW / 2, 0, 0);
        const g = door.addComponent(Graphics);
        g.fillColor = DOOR;
        g.roundRect(-slotW, -slotH / 2, slotW, slotH, 20);
        g.fill();
        const handleH = Math.min(72, Math.max(28, Math.round(slotH * 0.46)));
        g.fillColor = HANDLE;
        g.roundRect(-20, -handleH / 2, 10, handleH, 5);
        g.fill();
        return door;
    }

    private minTrayCap(): number {
        const board = this.board;
        if (!board || board.trays.length === 0) return 2;
        let min = board.trays[0].cap;
        for (let i = 1; i < board.trays.length; i++) {
            if (board.trays[i].cap < min) min = board.trays[i].cap;
        }
        return min;
    }

    private kindIsTall(kind: FoodId): boolean {
        return this.mixedCaps() && this.countKind(kind) > this.minTrayCap();
    }

    private unplacedKind(kind: FoodId): number {
        const board = this.board;
        if (!board) return 0;
        let n = 0;
        for (let c = 0; c < board.bags.length; c++) {
            const col = board.bags[c];
            for (let k = 0; k < col.length; k++) if (col[k] === kind) n += 1;
        }
        for (let i = 0; i < board.buffer.length; i++) {
            if (board.buffer[i] === kind) n += 1;
        }
        return n;
    }

    private kindTint(kind: FoodId): Color {
        if (kind === 'milk') return new Color(255, 253, 248, 255);
        if (kind === 'veg') return new Color(122, 158, 126, 255);
        if (kind === 'fruit') return new Color(224, 122, 95, 255);
        if (kind === 'meat') return new Color(166, 90, 70, 255);
        if (kind === 'sauce') return new Color(180, 80, 50, 255);
        if (kind === 'leftover') return new Color(118, 92, 128, 255);
        if (kind === 'grape') return new Color(142, 90, 158, 255);
        if (kind === 'lemon') return new Color(232, 196, 72, 255);
        if (kind === 'kiwi') return new Color(140, 160, 70, 255);
        if (kind === 'pineapple') return new Color(210, 170, 60, 255);
        if (kind === 'watermelon') return new Color(80, 140, 90, 255);
        if (kind === 'coconut') return new Color(150, 110, 80, 255);
        return FRAME;
    }

    private shouldDimKind(kind: FoodId): boolean {
        const board = this.board;
        if (!board || !this.mixedCaps() || !board.dest || board.dest.kind !== 'tray') return false;
        const tray = board.trays[board.dest.index];
        if (!tray || tray.sealed) return false;
        const tall = this.kindIsTall(kind);
        if (tray.cap <= 2) return tall;
        if (tray.cap >= 4) return !tall;
        return false;
    }

    /** 竖格里食物一列往上叠。横屉里并排。不在内腔再画座位格子。 */
    private seatBox(
        slotW: number,
        slotH: number,
        cap: number,
        index: number,
        horizontal: boolean,
    ): { x: number; y: number; w: number; h: number } {
        if (horizontal) {
            const pad = 8;
            const gap = 8;
            const w = (slotW - pad * 2 - gap * (cap - 1)) / cap;
            const h = slotH * 0.72;
            const x = -slotW / 2 + pad + index * (w + gap) + w / 2;
            return { x, y: 0, w, h };
        }
        const pad = 16;
        const gap = 8;
        const h = (slotH - pad * 2 - gap * (cap - 1)) / cap;
        const w = slotW * 0.72;
        const y = -slotH / 2 + pad + index * (h + gap) + h / 2;
        return { x: 0, y, w, h };
    }

    private foodSlotX(slotW: number, cap: number, index: number): number {
        const pad = 10;
        const step = (slotW - pad * 2) / Math.max(cap, 1);
        return -slotW / 2 + pad + step * (index + 0.5);
    }

    private foodSlotY(slotH: number, cap: number, index: number): number {
        const pad = 16;
        const step = (slotH - pad * 2) / Math.max(cap, 1);
        return -slotH / 2 + pad + step * (index + 0.5);
    }

    private drawCapacityLayers(
        node: Node,
        m: { slotW: number; slotH: number },
        cap: number,
        filled: number,
        horizontal = false,
    ) {
        const layers = new Node('Layers');
        layers.layer = UI_2D;
        layers.addComponent(UITransform).setContentSize(m.slotW, m.slotH);
        const g = layers.addComponent(Graphics);
        for (let i = 0; i < cap; i++) {
            const seat = this.seatBox(m.slotW, m.slotH, cap, i, horizontal);
            const x = seat.x - seat.w / 2;
            const y = seat.y - seat.h / 2;
            if (i < filled) {
                g.fillColor = new Color(255, 255, 255, 16);
                g.roundRect(x, y, seat.w, seat.h, 10);
                g.fill();
            } else {
                g.fillColor = new Color(255, 253, 248, 42);
                g.roundRect(x, y, seat.w, seat.h, 10);
                g.fill();
                g.strokeColor = new Color(255, 253, 248, 170);
                g.lineWidth = 2;
                g.roundRect(x, y, seat.w, seat.h, 10);
                g.stroke();
            }
        }
        node.addChild(layers);
    }

    private drawGhostStack(parent: Node, kind: FoodId, count: number, y: number) {
        if (count <= 0) return;
        const ghost = new Node('Ghost');
        ghost.layer = UI_2D;
        ghost.setPosition(0, y, 0);
        ghost.addComponent(UITransform).setContentSize(88, count * 18 + 12);
        const g = ghost.addComponent(Graphics);
        const tint = this.kindTint(kind);
        const layerH = 17;
        const w = 76;
        for (let i = 0; i < count; i++) {
            const gy = (i - (count - 1) / 2) * 14;
            g.fillColor = new Color(tint.r, tint.g, tint.b, 55 + i * 12);
            g.roundRect(-w / 2, gy - layerH / 2, w, layerH, 8);
            g.fill();
            g.strokeColor = new Color(tint.r, tint.g, tint.b, 120);
            g.lineWidth = 2;
            g.roundRect(-w / 2, gy - layerH / 2, w, layerH, 8);
            g.stroke();
        }
        parent.addChild(ghost);
    }

    private drawSizeTeach(root: Node) {
        if (this.sizeTeach !== 'intro') return;
        const old = root.getChildByName('SizeTeach');
        if (old) old.destroy();

        const note = new Node('SizeTeach');
        note.layer = UI_2D;
        note.setPosition(0, 6, 0);
        note.angle = -3;
        note.setScale(0.9, 0.9, 1);
        note.addComponent(UITransform).setContentSize(500, 88);
        const paper = note.addComponent(Graphics);
        paper.fillColor = MILK;
        paper.roundRect(-250, -44, 500, 88, 10);
        paper.fill();
        paper.strokeColor = new Color(107, 74, 58, 48);
        paper.lineWidth = 2;
        paper.roundRect(-250, -44, 500, 88, 10);
        paper.stroke();
        paper.fillColor = WHEAT;
        paper.roundRect(-196, 30, 52, 16, 3);
        paper.fill();
        paper.roundRect(144, 30, 52, 16, 3);
        paper.fill();
        root.addChild(note);

        this.drawHeightMatch(note, -150, 6, 2);
        this.drawHeightMatch(note, 150, 6, 4);
        this.addLabel(note, 'Rule', '合理收纳', 24, new Color(107, 74, 58, 200), 220, 36).setPosition(0, -4, 0);

        tween(note)
            .to(0.28, { scale: new Vec3(1, 1, 1) }, { easing: easing.backOut })
            .start();
    }

    private drawHeightMatch(parent: Node, x: number, y: number, layers: number) {
        const pair = new Node(`Match${layers}`);
        pair.layer = UI_2D;
        pair.setPosition(x, y, 0);
        pair.addComponent(UITransform).setContentSize(120, 72);
        const g = pair.addComponent(Graphics);
        const stackW = 28;
        const layerH = 10;
        const gap = 3;
        const stackH = layers * layerH + (layers - 1) * gap;
        const stackX = -34;
        const stackBottom = -stackH / 2;
        for (let i = 0; i < layers; i++) {
            const ly = stackBottom + i * (layerH + gap);
            g.fillColor = layers <= 2 ? SAGE : FRAME;
            g.roundRect(stackX - stackW / 2, ly, stackW, layerH, 3);
            g.fill();
        }
        const shelfH = 18 + layers * 10;
        const shelfW = 22;
        g.fillColor = WALNUT;
        g.roundRect(18, -shelfH / 2, shelfW, shelfH, 5);
        g.fill();
        g.fillColor = new Color(232, 243, 246, 255);
        g.roundRect(22, -shelfH / 2 + 4, 14, shelfH - 8, 3);
        g.fill();
        parent.addChild(pair);
    }

    private countKind(kind: FoodId): number {
        const board = this.board;
        if (!board) return 0;
        let n = 0;
        for (let i = 0; i < board.trays.length; i++) {
            const items = board.trays[i].items;
            for (let k = 0; k < items.length; k++) if (items[k] === kind) n += 1;
        }
        for (let c = 0; c < board.bags.length; c++) {
            const col = board.bags[c];
            for (let k = 0; k < col.length; k++) if (col[k] === kind) n += 1;
        }
        for (let i = 0; i < board.buffer.length; i++) {
            if (board.buffer[i] === kind) n += 1;
        }
        return n;
    }

    private dismissSizeIntro() {
        if (this.sizeTeach !== 'intro') return;
        this.sizeTeach = null;
        const note = this.playRoot?.getChildByName('SizeTeach');
        if (note) note.destroy();
    }

    private noteSizeTeach(item: FoodId, dest: Dest) {
        const board = this.board;
        if (!board || !this.mixedCaps() || board.isWin()) {
            this.sizeTeach = null;
            return;
        }
        if (dest.kind !== 'tray') {
            if (this.sizeTeach === 'intro') this.sizeTeach = null;
            return;
        }
        const tray = board.trays[dest.index];
        if (tray.cap < this.countKind(item)) {
            this.holdCapFlash = dest.index;
            this.holdShakeKind = item;
            return;
        }
        this.sizeTeach = null;
    }

    private prepareSizeFail(result: PlaceFail) {
        const board = this.board;
        if (!board || !this.mixedCaps() || result.reason !== 'dest_full') return;
        const dest = board.dest;
        if (!dest || dest.kind !== 'tray' || board.trays[dest.index].cap > 2) return;
        this.holdCapFlash = dest.index;
        this.holdShakeKind = result.item;
    }

    private playSizeFeedback() {
        if (this.holdCapFlash != null) this.flashCapacity(this.holdCapFlash);
        if (this.holdShakeKind) this.shakeKindBags(this.holdShakeKind);
        this.holdCapFlash = null;
        this.holdShakeKind = null;
    }

    private flashCapacity(index: number) {
        const root = this.playRoot;
        const board = this.board;
        if (!root || !board) return;
        const tray = root.getChildByName(`Tray${index}`);
        if (!tray) return;
        const m = this.trayAt(index);
        const cap = board.trays[index].cap;
        const filled = board.trays[index].items.length;
        const flash = new Node('CapFlash');
        flash.layer = UI_2D;
        flash.addComponent(UITransform).setContentSize(m.slotW, m.slotH);
        const g = flash.addComponent(Graphics);
        g.strokeColor = CORAL;
        g.lineWidth = 5;
        for (let i = filled; i < cap; i++) {
            const seat = this.seatBox(m.slotW, m.slotH, cap, i, m.horizontal);
            g.roundRect(seat.x - seat.w / 2, seat.y - seat.h / 2, seat.w, seat.h, 10);
            g.stroke();
        }
        const op = flash.addComponent(UIOpacity);
        op.opacity = 0;
        tray.addChild(flash);
        tween(op)
            .to(0.1, { opacity: 255 })
            .to(0.1, { opacity: 40 })
            .to(0.1, { opacity: 255 })
            .to(0.12, { opacity: 0 })
            .call(() => {
                if (flash.isValid) flash.destroy();
            })
            .start();
    }

    private shakeKindBags(kind: FoodId) {
        const board = this.board;
        if (!board) return;
        for (let c = 0; c < board.bags.length; c++) {
            if (board.peekBag(c) === kind) this.shakeBagTop(c);
        }
    }

    /** 选中框呼吸：描边 schedule 重绘 alpha。 */
    private drawCoralFramePulse(
        parent: Node,
        w: number,
        h: number,
        inset: number,
        radius: number,
        ring: Color = SELECT_PULSE_BLUE,
        soft: Color = SELECT_PULSE_BLUE_SOFT,
    ) {
        const pulse = new Node('CoralPulse');
        pulse.layer = UI_2D;
        pulse.addComponent(UITransform).setContentSize(w + 24, h + 24);
        const g = pulse.addComponent(Graphics);
        const x = -w / 2 + inset;
        const y = -h / 2 + inset;
        const rw = w - inset * 2;
        const rh = h - inset * 2;
        const paint = (haloA: number, ringA: number) => {
            if (!g.isValid) return;
            g.clear();
            const ha = Math.min(255, Math.max(0, Math.round(haloA)));
            const ra = Math.min(255, Math.max(0, Math.round(ringA)));
            g.lineWidth = 16;
            g.strokeColor = new Color(soft.r, soft.g, soft.b, ha);
            g.roundRect(x - 10, y - 10, rw + 20, rh + 20, radius + 8);
            g.stroke();
            g.lineWidth = 6;
            g.strokeColor = new Color(ring.r, ring.g, ring.b, ra);
            g.roundRect(x - 2, y - 2, rw + 4, rh + 4, radius + 2);
            g.stroke();
        };
        paint(160, 230);
        parent.addChild(pulse);
        let phase = 0;
        const tick = () => {
            if (!pulse.isValid || !g.isValid) {
                this.unschedule(tick);
                return;
            }
            phase += 0.07;
            const k = (Math.sin(phase) + 1) * 0.5;
            paint(90 + k * 165, 160 + k * 95);
        };
        this.schedule(tick, 0.033);
    }

    private drawSwitchGuide(tray: Node, m: { outerW: number; outerH: number }, tipText = '点这格') {
        const old = tray.getChildByName('SwitchGuide');
        if (old) old.destroy();
        const guide = new Node('SwitchGuide');
        guide.layer = UI_2D;
        guide.addComponent(UITransform).setContentSize(m.outerW + 16, m.outerH + 16);
        const g = guide.addComponent(Graphics);
        g.lineWidth = 8;
        g.strokeColor = SAGE;
        g.roundRect(-m.outerW / 2 - 6, -m.outerH / 2 - 6, m.outerW + 12, m.outerH + 12, 30);
        g.stroke();
        const op = guide.addComponent(UIOpacity);
        op.opacity = 255;
        tray.addChild(guide);
        tween(op)
            .to(0.35, { opacity: 90 })
            .to(0.35, { opacity: 255 })
            .union()
            .repeatForever()
            .start();

        const tip = new Node('TapTip');
        tip.layer = UI_2D;
        tip.setPosition(0, -m.outerH / 2 - 28, 0);
        tip.addComponent(UITransform).setContentSize(160, 44);
        const tg = tip.addComponent(Graphics);
        tg.fillColor = SAGE;
        tg.roundRect(-80, -22, 160, 44, 22);
        tg.fill();
        this.addLabel(tip, 'Txt', tipText, 24, MILK, 150, 36);
        tray.addChild(tip);
        tween(tip)
            .to(0.4, { position: new Vec3(0, -m.outerH / 2 - 16, 0) }, { easing: easing.sineInOut })
            .to(0.4, { position: new Vec3(0, -m.outerH / 2 - 28, 0) }, { easing: easing.sineInOut })
            .union()
            .repeatForever()
            .start();

        const root = tray.parent;
        const base = tray.position;
        const rest = new Vec3(base.x + m.outerW / 2 - 8, base.y - m.outerH / 2 + 96, 0);
        const tap = new Vec3(base.x + m.outerW / 2 - 28, base.y - m.outerH / 2 + 76, 0);
        const hand = this.addSprite(root || tray, 'SwitchHand', this.handPoint || this.builtin, SWITCH_HAND_W, SWITCH_HAND_H, rest.x, rest.y, Color.WHITE);
        if (root) hand.setSiblingIndex(root.children.length - 1);
        tween(hand)
            .to(0.45, { position: tap }, { easing: easing.sineInOut })
            .to(0.45, { position: rest }, { easing: easing.sineInOut })
            .union()
            .repeatForever()
            .start();
    }

    private drawSageDashedRing(parent: Node, w: number, h: number, radius: number, name: string) {
        const old = parent.getChildByName(name);
        if (old) old.destroy();
        const ring = new Node(name);
        ring.layer = UI_2D;
        ring.addComponent(UITransform).setContentSize(w + 24, h + 24);
        const g = ring.addComponent(Graphics);
        g.strokeColor = SAGE;
        g.lineWidth = 6;
        const x = -w / 2;
        const y = -h / 2;
        const sides = [
            { x0: x + radius, y0: y, x1: x + w - radius, y1: y },
            { x0: x + w, y0: y + radius, x1: x + w, y1: y + h - radius },
            { x0: x + w - radius, y0: y + h, x1: x + radius, y1: y + h },
            { x0: x, y0: y + h - radius, x1: x, y1: y + radius },
        ];
        const dash = 10;
        const gap = 7;
        for (let s = 0; s < sides.length; s++) {
            const side = sides[s];
            const dx = side.x1 - side.x0;
            const dy = side.y1 - side.y0;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const ux = dx / len;
            const uy = dy / len;
            let t = 0;
            while (t < len) {
                const t2 = Math.min(t + dash, len);
                g.moveTo(side.x0 + ux * t, side.y0 + uy * t);
                g.lineTo(side.x0 + ux * t2, side.y0 + uy * t2);
                g.stroke();
                t += dash + gap;
            }
        }
        const op = ring.addComponent(UIOpacity);
        op.opacity = 255;
        parent.addChild(ring);
        tween(op)
            .to(0.4, { opacity: 90 })
            .to(0.4, { opacity: 255 })
            .union()
            .repeatForever()
            .start();
    }

    private drawFoodsInTray(
        node: Node,
        items: FoodId[],
        slotW: number,
        slotH: number,
        cap = 4,
        horizontal = false,
    ) {
        for (let k = 0; k < items.length; k++) {
            const seat = this.seatBox(slotW, slotH, cap, k, horizontal);
            const size = this.trayItemDrawSize(items[k], horizontal, seat);
            const frame = this.trayFridgeFoodFrame(items[k], horizontal);
            this.addSprite(
                node,
                `Food${k}`,
                frame,
                size.w,
                size.h,
                seat.x,
                seat.y,
                Color.WHITE,
            );
        }
    }

    /** 竖格用扁盒 slot；横格与购物袋同一套高盒（UI §5 横格牛奶不缩放变形）。 */
    private trayItemDrawSize(
        item: FoodId,
        horizontal: boolean,
        seat: { w: number; h: number },
    ): { w: number; h: number } {
        const pad = FRIDGE_SEAT_FILL;
        if (item === 'milk') {
            if (horizontal) {
                const plate = this.plateFoodSize('milk');
                return this.fitAspect(plate.w / plate.h, seat.w * pad, seat.h * pad);
            }
            return this.fitMilkInSeat(seat);
        }
        if (item === 'sauce') {
            if (horizontal) {
                const plate = this.plateFoodSize('sauce');
                return this.fitAspect(plate.w / plate.h, seat.w * pad, seat.h * pad);
            }
            return this.fitSauceInSeat(seat);
        }
        const maxW = seat.w * pad;
        let maxH = seat.h * pad;
        if (!horizontal) {
            // 竖格按 cap 分层后 seat.h 常只有十几 px；用带宽托底，避免飞进格子缩成点
            maxH = Math.max(maxH, seat.w * 0.52);
        }
        const fitted = this.fitAspect(this.foodKindAspect(item), maxW, maxH);
        return { w: Math.round(fitted.w), h: Math.round(fitted.h) };
    }

    /** 竖格扁盒宽高比约 1.25。图没载入时退回高盒比例，避免把盘子图拉宽。 */
    private fitMilkInSeat(seat: { w: number; h: number }): { w: number; h: number } {
        const aspect = this.foodMilkSlot ? SLOT_MILK_ASPECT : PLATE_MILK_ASPECT;
        return this.fitAspect(aspect, seat.w * FRIDGE_SEAT_FILL, seat.h * FRIDGE_SEAT_FILL);
    }

    /** 竖格扁瓶 food_sauce_slot。 */
    private fitSauceInSeat(seat: { w: number; h: number }): { w: number; h: number } {
        const aspect = this.foodSauceSlot ? SLOT_SAUCE_ASPECT : PLATE_SAUCE_ASPECT;
        return this.fitAspect(aspect, seat.w * FRIDGE_SEAT_FILL, seat.h * FRIDGE_SEAT_FILL);
    }

    private fitAspect(aspect: number, maxW: number, maxH: number): { w: number; h: number } {
        let w = maxW;
        let h = w / aspect;
        if (h > maxH) {
            h = maxH;
            w = h * aspect;
        }
        return { w, h };
    }

    /** 横屉高盒；竖格扁盒 slot。图还没载入时退回 foodMilk。 */
    private trayMilkFrame(horizontal: boolean): SpriteFrame | null {
        if (horizontal) return this.foodMilk;
        return this.foodMilkSlot || this.foodMilk;
    }

    /** 横格立瓶 food_sauce；竖格扁瓶 food_sauce_slot（与牛奶横/竖贴图规则同构）。 */
    private traySauceFrame(horizontal: boolean): SpriteFrame | null {
        if (horizontal) return this.foodSauce;
        return this.foodSauceSlot || this.foodSauce;
    }

    /** 冰箱格内贴图：牛奶/酱瓶双资源，其余走 food_*。 */
    private trayFridgeFoodFrame(kind: FoodId, horizontal: boolean): SpriteFrame | null {
        if (kind === 'milk') return this.trayMilkFrame(horizontal);
        if (kind === 'sauce') return this.traySauceFrame(horizontal);
        return this.frameForFood(kind);
    }

    private slotFrameForFridge(kind: FoodId): SpriteFrame | null {
        if (kind === 'milk') return this.foodMilkSlot;
        if (kind === 'sauce') return this.foodSauceSlot;
        return null;
    }

    /** 飞入/绘制时切 slot 贴图：牛奶/酱瓶均为竖格。 */
    private fridgeUsesSlotFrame(kind: FoodId, horizontal: boolean): boolean {
        if (kind === 'milk' || kind === 'sauce') return !horizontal;
        return false;
    }

    private milkUsesSlotInTray(horizontal: boolean): boolean {
        return this.fridgeUsesSlotFrame('milk', horizontal);
    }

    /** 图鉴门心与对局同一套：牛奶/酱瓶按横竖格；其它食材按门区比例。 */
    private milkThumbInDoor(
        kind: FoodId,
        horizontal: boolean,
        doorW: number,
        doorH: number,
    ): { w: number; h: number; x: number } {
        const maxW = doorW * 0.72;
        const maxH = doorH * 0.62;
        if (kind === 'milk') {
            if (horizontal) {
                const fitted = this.fitAspect(PLATE_MILK_ASPECT, maxW, maxH);
                return { w: fitted.w, h: fitted.h, x: 0 };
            }
            const fitted = this.fitMilkInSeat({ w: maxW / 0.82, h: maxH / 0.82 });
            return { w: fitted.w, h: fitted.h, x: 0 };
        }
        if (kind === 'sauce') {
            if (horizontal) {
                const fitted = this.fitAspect(PLATE_SAUCE_ASPECT, maxW, maxH);
                return { w: fitted.w, h: fitted.h, x: 0 };
            }
            const fitted = this.fitSauceInSeat({ w: maxW / 0.82, h: maxH / 0.82 });
            return { w: fitted.w, h: fitted.h, x: 0 };
        }
        const foodH = Math.max(10, doorH * 0.62);
        return { w: foodH * 0.66, h: foodH, x: -doorW * 0.08 };
    }

    /** 和当前这一排盘子上的食材同一套宽高。 */
    private plateFoodSize(kind: FoodId): { w: number; h: number } {
        const board = this.board;
        const n = board ? board.bags.length : 1;
        const plan = this.bagRowPlan;
        const cols = plan && n >= BAG_TWO_ROW_MIN
            ? Math.max(plan.front.length, plan.back.length, 1)
            : n;
        const layout = this.bagLayout(cols);
        return this.bagFoodSize(kind, layout);
    }

    /** 三列时托盘接近示意图大小；列变多再缩小，避免挤出屏幕。 */
    private bagLayout(columns: number): {
        w: number;
        trayH: number;
        step: number;
        gap: number;
    } {
        const gap = columns <= 3 ? 28 : 16;
        const fit = Math.floor((660 - gap * Math.max(columns - 1, 0)) / Math.max(columns, 1));
        if (fit < 132) console.warn(`bagLayout ${columns} columns → width ${fit} < 132`);
        const w = Math.min(188, Math.max(132, fit));
        /** 整盘 512×302，前唇从 y=246 起，约 56px。栈顶食物按凹槽 fit，见 bagFoodSize。 */
        const trayH = Math.round(w * (302 / 512));
        const step = Math.max(12, Math.round(trayH * (56 / 302)));
        return { w, trayH, step, gap };
    }

    private foodKindAspect(kind: FoodId): number {
        if (kind === 'milk') return PLATE_MILK_ASPECT;
        if (kind === 'sauce') return PLATE_SAUCE_ASPECT;
        if (kind === 'pineapple') return 0.72;
        if (kind === 'veg' || kind === 'meat' || kind === 'leftover' || kind === 'watermelon') {
            return 0.92 / 0.82;
        }
        return 0.88;
    }

    /** 叠盘凹槽内食材：在凹槽矩形里等比 fit，最长边贴满 BAG_GROOVE_FILL（牛奶/圆果同一套槽，勿单独压低高度）。 */
    private bagFoodSize(kind: FoodId, layout: { w: number; trayH: number }): { w: number; h: number } {
        const maxW = layout.w * BAG_GROOVE_W * BAG_GROOVE_FILL;
        const maxH = layout.trayH * BAG_GROOVE_H * BAG_GROOVE_FILL;
        const fitted = this.fitAspect(this.foodKindAspect(kind), maxW, maxH);
        return { w: Math.round(fitted.w), h: Math.round(fitted.h) };
    }

    /** 5 层及以上只占 4 层柱高，多出来的层用数字标出。 */
    private shownStack(len: number): number {
        if (len <= 0) return 0;
        return len > 4 ? 4 : len;
    }

    /** 每层都是同一张整盘，层距只露出前唇。 */
    private columnHeight(layout: { trayH: number; step: number }, len: number): number {
        const shown = this.shownStack(len);
        if (shown <= 0) return 0;
        return layout.trayH + layout.step * (shown - 1);
    }

    private bagAnchorY(board: BoardState): number {
        let maxLen = 0;
        for (let c = 0; c < board.bags.length; c++) {
            if (board.bags[c].length > maxLen) maxLen = board.bags[c].length;
        }
        const plan = this.bagRowPlan;
        const layoutCols = plan ? Math.max(plan.front.length, plan.back.length, 1) : board.bags.length;
        const layout = this.bagLayout(layoutCols);
        const h = this.columnHeight(layout, maxLen);
        const seat = plan ? BAG_FRONT_SEAT_Y : -360;
        let anchor = seat + h / 2;
        const top = anchor + h / 2;
        if (top > BAG_TOP_LIMIT) anchor -= top - BAG_TOP_LIMIT;
        return anchor;
    }

    /** 前后排纵向间距；§5.7 第 41 关起 6 列深栈，后排整体上移避免被前排 lip 挡。 */
    private bagRowGap(levelId: number): number {
        if (levelId > 40) return BAG_ROW_GAP + 44;
        return BAG_ROW_GAP;
    }

    private bagSeatYForRow(
        row: 'front' | 'back',
        layout: { trayH: number; step: number },
        maxLenInRow: number,
        levelId: number,
    ): number {
        const h = this.columnHeight(layout, maxLenInRow);
        const rowGap = this.bagRowGap(levelId);
        let seat = row === 'front' ? BAG_FRONT_SEAT_Y : BAG_FRONT_SEAT_Y + rowGap;
        if (row === 'back') {
            const scale = BAG_BACK_SCALE;
            const top = seat + h * scale;
            if (top > BAG_TOP_LIMIT) seat -= top - BAG_TOP_LIMIT;
        } else {
            const top = seat + h;
            if (top > BAG_TOP_LIMIT) seat -= top - BAG_TOP_LIMIT;
        }
        return seat;
    }

    private drawBags(root: Node, board: BoardState) {
        const plan = this.bagRowPlan;
        if (!plan) {
            this.drawBagsSingleRow(root, board);
            return;
        }
        const layoutCols = Math.max(plan.front.length, plan.back.length, 1);
        const layout = this.bagLayout(layoutCols);
        // 先后排、再前排：前排叠在上面，可点不被挡
        const stagger = board.level.id === 17 ? (layout.w + layout.gap) / 2 : 0;
        this.drawBagRow(root, board, plan.back, layout, 'back', 0);
        this.drawBagRow(root, board, plan.front, layout, 'front', stagger);
        this.revealBagCol = null;
    }

    private drawBagsSingleRow(root: Node, board: BoardState) {
        const n = board.bags.length;
        const layout = this.bagLayout(n);
        let maxLen = 0;
        for (let c = 0; c < n; c++) {
            if (board.bags[c].length > maxLen) maxLen = board.bags[c].length;
        }
        const yBag = this.bagAnchorY(board);
        const baseline = yBag - this.columnHeight(layout, maxLen) / 2;
        for (let c = 0; c < n; c++) {
            this.drawOneBagColumn(root, board, c, layout, baseline, n, c);
        }
        this.revealBagCol = null;
    }

    private drawBagRow(
        root: Node,
        board: BoardState,
        cols: number[],
        layout: { w: number; trayH: number; step: number; gap: number },
        row: 'front' | 'back',
        xShift = 0,
    ) {
        let maxLen = 0;
        for (let i = 0; i < cols.length; i++) {
            const len = board.bags[cols[i]].length;
            if (len > maxLen) maxLen = len;
        }
        const scale = row === 'back' ? BAG_BACK_SCALE : 1;
        const seat = this.bagSeatYForRow(row, layout, maxLen, board.level.id);
        const rowN = cols.length;
        for (let slot = 0; slot < cols.length; slot++) {
            const c = cols[slot];
            const count = board.bags[c].length;
            if (count <= 0) continue;
            const h = this.columnHeight(layout, count);
            const x = (slot - (rowN - 1) / 2) * (layout.w + layout.gap) + xShift;
            const colNode = this.drawOneBagColumn(root, board, c, layout, seat, rowN, slot, xShift);
            if (colNode && scale !== 1) {
                colNode.setScale(scale, scale, 1);
                colNode.setPosition(x, seat + (h * scale) / 2, 0);
            }
        }
    }

    private drawOneBagColumn(
        root: Node,
        board: BoardState,
        c: number,
        layout: { w: number; trayH: number; step: number; gap: number },
        baseline: number,
        rowN: number,
        slot: number,
        xShift = 0,
    ): Node | null {
        const col = board.bags[c];
        const count = col.length;
        if (count <= 0) return null;
        const shown = this.shownStack(count);
        const x = (slot - (rowN - 1) / 2) * (layout.w + layout.gap) + xShift;
        const h = this.columnHeight(layout, count);
        const colNode = new Node(`Bag${c}`);
        colNode.layer = UI_2D;
        colNode.setPosition(x, baseline + h / 2, 0);
        colNode.addComponent(UITransform).setContentSize(layout.w, h);
        root.addChild(colNode);

        const shadow = new Node('ContactShadow');
        shadow.layer = UI_2D;
        shadow.setPosition(0, -h / 2 + 2, 0);
        shadow.addComponent(UITransform).setContentSize(layout.w, 28);
        const sg = shadow.addComponent(Graphics);
        sg.fillColor = new Color(61, 50, 41, 110);
        sg.ellipse(0, 0, layout.w * 0.42, 10);
        sg.fill();
        colNode.addChild(shadow);

        if (count > shown) {
            const mark = this.addLabel(colNode, 'Depth', String(count), 22, WALNUT, 48, 28);
            mark.setPosition(-layout.w / 2 + 22, -h / 2 + 16, 0);
        }

        for (let i = 0; i < shown; i++) {
            const isTop = i === shown - 1;
            const y = -h / 2 + layout.trayH / 2 + i * layout.step;
            const tileNode = this.addSprite(
                colNode,
                `T${i}`,
                this.bagTrayLower || this.bagTrayTop || this.builtin,
                layout.w,
                layout.trayH,
                0,
                y,
                isTop ? this.trayTint(col[count - 1]) : Color.WHITE,
            );
            if (!isTop) continue;
            const topKind = col[count - 1];
            const foodSize = this.bagFoodSize(topKind, layout);
            const seatY = Math.round(layout.trayH * -0.04);
            const foodY = seatY + Math.round(foodSize.h * 0.22);
            const foodShadow = new Node('FoodShadow');
            foodShadow.layer = UI_2D;
            foodShadow.setPosition(0, foodY - Math.round(foodSize.h * 0.4), 0);
            foodShadow.addComponent(UITransform).setContentSize(foodSize.w, 16);
            const foodShade = foodShadow.addComponent(Graphics);
            foodShade.fillColor = new Color(72, 54, 42, 150);
            foodShade.ellipse(0, 0, foodSize.w * 0.36, 5);
            foodShade.fill();
            tileNode.addChild(foodShadow);
            const foodNode = this.addSprite(
                tileNode,
                'Food',
                this.frameForFood(topKind),
                foodSize.w,
                foodSize.h,
                0,
                foodY,
                Color.WHITE,
            );
            if (this.revealBagCol === c) {
                tileNode.setPosition(0, y - layout.step, 0);
                const op = tileNode.addComponent(UIOpacity);
                op.opacity = 0;
                tween(tileNode).to(0.18, { position: new Vec3(0, y, 0) }, { easing: easing.cubicOut }).start();
                tween(op).to(0.18, { opacity: 255 }).start();
            }
            const src: FoodDragSource = { kind: 'bag', col: c };
            const down = (e: EventTouch) => this.beginFoodPointer(e, src);
            const move = (e: EventTouch) => this.moveFoodPointer(e);
            const up = (e: EventTouch) => this.endFoodPointer(e);
            tileNode.on(Node.EventType.TOUCH_START, down, this);
            tileNode.on(Node.EventType.TOUCH_MOVE, move, this);
            tileNode.on(Node.EventType.TOUCH_END, up, this);
            tileNode.on(Node.EventType.TOUCH_CANCEL, up, this);
            foodNode.on(Node.EventType.TOUCH_START, down, this);
            foodNode.on(Node.EventType.TOUCH_MOVE, move, this);
            foodNode.on(Node.EventType.TOUCH_END, up, this);
            foodNode.on(Node.EventType.TOUCH_CANCEL, up, this);
            if (this.holdHint && this.holdHint.bagCol === c) {
                this.drawSageDashedRing(foodNode, foodSize.w + 12, foodSize.h + 12, 18, 'HintRing');
            }
            if (this.l1Guide && board.level.id === 1) {
                this.drawL1Guide(colNode, layout.w, y);
            }
        }
        return colNode;
    }

    /** 第 1 关：手指指向栈顶。不挡点击。 */
    private drawL1Guide(colNode: Node, layoutW: number, topLocalY: number) {
        const rest = new Vec3(layoutW / 2 + 36, topLocalY + 64, 0);
        const tap = new Vec3(layoutW / 2 + 16, topLocalY + 44, 0);
        const hand = this.addSprite(colNode, 'L1Hand', this.handPoint || this.builtin, L1_HAND_W, L1_HAND_H, rest.x, rest.y, Color.WHITE);
        tween(hand)
            .to(0.45, { position: tap }, { easing: easing.sineInOut })
            .to(0.45, { position: rest }, { easing: easing.sineInOut })
            .union()
            .repeatForever()
            .start();
    }

    /** 砧板先画，台面后画，重叠处被 worktop_top 盖住。 */
    private drawPropBoard(root: Node) {
        if (!this.propBoard) return;
        const dim = new Color(255, 255, 255, 220);
        this.addSprite(root, 'PropBoard', this.propBoard, 150, 84, -216, -88, dim);
    }

    /** 冰箱与叠盘之间的空档：左右摆低对比厨房小物件，不挡点击、不挡飞行。 */
    private drawMidProps(root: Node) {
        const dim = new Color(255, 255, 255, 220);
        const y = -80;
        if (this.propCloth) {
            this.addSprite(root, 'PropCloth', this.propCloth, 120, 78, 248, y - 4, dim);
        }
        if (this.propCup) {
            this.addSprite(root, 'PropCup', this.propCup, 78, 66, 268, y + 36, dim);
        }
    }

    /** 工作台顶面托住叠盘；按设计宽，不再放大出屏。 */
    private drawWorktopBack(root: Node) {
        if (this.worktopTop) {
            this.addSprite(root, 'WorktopTop', this.worktopTop, DESIGN_W, 380, 0, -300, Color.WHITE);
            return;
        }
        const top = new Node('WorktopTop');
        top.layer = UI_2D;
        top.setPosition(0, -300, 0);
        top.addComponent(UITransform).setContentSize(DESIGN_W, 380);
        const g = top.addComponent(Graphics);
        g.fillColor = TABLE_TOP;
        g.moveTo(-340, 140);
        g.lineTo(340, 140);
        g.lineTo(312, -140);
        g.lineTo(-312, -140);
        g.close();
        g.fill();
        root.addChild(top);
    }

    /** 工作台前立面跟顶面同宽。 */
    private drawWorktopFront(root: Node) {
        if (this.worktopFront) {
            this.addSprite(root, 'WorktopFront', this.worktopFront, DESIGN_W, 120, 0, -448, Color.WHITE);
            return;
        }
        const front = new Node('WorktopFront');
        front.layer = UI_2D;
        front.setPosition(0, -462, 0);
        front.addComponent(UITransform).setContentSize(680, 120);
        const g = front.addComponent(Graphics);
        g.fillColor = TABLE_FRONT;
        g.roundRect(-340, -60, 680, 120, 28);
        g.fill();
        g.fillColor = new Color(255, 255, 255, 70);
        g.roundRect(-322, 32, 644, 16, 8);
        g.fill();
        root.addChild(front);
    }

    /** C：桌面槽位外框（每列一个凹槽），提升中层“收纳感”。 */
    private drawFoodSlotFrame(parent: Node, w: number, h: number) {
        const slot = new Node('FoodSlot');
        slot.layer = UI_2D;
        slot.addComponent(UITransform).setContentSize(w, h);
        const g = slot.addComponent(Graphics);
        g.fillColor = TABLE_SLOT;
        g.roundRect(-w / 2, -h / 2, w, h, 18);
        g.fill();
        g.fillColor = TABLE_SLOT_INNER;
        g.roundRect(-w / 2 + 6, -h / 2 + 10, w - 12, h - 20, 14);
        g.fill();
        g.strokeColor = new Color(255, 255, 255, 70);
        g.lineWidth = 2;
        g.roundRect(-w / 2 + 6, -h / 2 + 10, w - 12, h - 20, 14);
        g.stroke();
        parent.addChild(slot);
        return slot;
    }

    private bufferSlotX(index: number, count: number): number {
        if (count === BUF_WELL_XS.length) return BUF_WELL_XS[index];
        const span = BUF_WELL_XS[BUF_WELL_XS.length - 1] - BUF_WELL_XS[0];
        return (index - (count - 1) / 2) * (span / Math.max(count - 1, 1));
    }

    /** 空槽没有 Sprite 时点击会落到木板图上；垫一层几乎透明的 Graphics 承接触摸。 */
    private mountBufferSlotHitPad(slot: Node) {
        const pad = new Node('HitPad');
        pad.layer = UI_2D;
        pad.addComponent(UITransform).setContentSize(BUF_SLOT_W, BUF_SLOT_H);
        const g = pad.addComponent(Graphics);
        g.fillColor = new Color(255, 253, 248, 4);
        g.roundRect(-BUF_SLOT_W / 2, -BUF_SLOT_H / 2, BUF_SLOT_W, BUF_SLOT_H, 28);
        g.fill();
        slot.addChild(pad);
        return pad;
    }

    /** 空槽：提示环/选中呼吸框是 Graphics，会挡 HitPad；把 HitPad 提到最上。有食材时由 Food 接点击。 */
    private raiseBufferHitPad(slot: Node) {
        if (slot.getChildByName('Food')) return;
        const pad = slot.getChildByName('HitPad');
        if (pad) pad.setSiblingIndex(slot.children.length - 1);
    }

    /** 周末大采购：整柜选中框，对标主线柜台格呼吸描边。 */
    private drawBulkCounterSelect(panel: Node): void {
        const w = 640;
        const h = 168;
        const frame = new Node('CounterSelect');
        frame.layer = UI_2D;
        frame.setPosition(0, BUF_WELL_Y - 10, 0);
        frame.addComponent(UITransform).setContentSize(w + 28, h + 28);
        const g = frame.addComponent(Graphics);
        g.fillColor = new Color(45, 156, 255, 46);
        g.roundRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20, 36);
        g.fill();
        g.lineWidth = 8;
        g.strokeColor = SELECT_PULSE_ICE;
        g.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 32);
        g.stroke();
        g.lineWidth = 3;
        g.strokeColor = MILK;
        g.roundRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, 26);
        g.stroke();
        panel.addChild(frame);
        frame.setSiblingIndex(1);
        this.drawCoralFramePulse(frame, w, h, 2, 32, SELECT_PULSE_ICE, SELECT_PULSE_ICE_SOFT);
        frame.setScale(0.96, 0.96, 1);
        tween(frame)
            .to(0.08, { scale: new Vec3(1, 1, 1) }, { easing: easing.quadOut })
            .start();
    }

    /** 贴住奶油凹盘外沿：槽内暖光 + 珊瑚描边 + 奶色内圈。 */
    private drawBufferSelect(slot: Node) {
        const w = BUF_SLOT_W;
        const h = BUF_SLOT_H;
        const ring = new Node('Select');
        ring.layer = UI_2D;
        ring.addComponent(UITransform).setContentSize(w + 28, h + 28);
        const g = ring.addComponent(Graphics);
        g.fillColor = new Color(255, 186, 72, 72);
        g.roundRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20, 36);
        g.fill();
        g.fillColor = new Color(255, 236, 186, 96);
        g.roundRect(-w / 2 + 22, -h / 2 + 20, w - 44, h - 40, 22);
        g.fill();
        g.lineWidth = 8;
        g.strokeColor = CORAL;
        g.roundRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 32);
        g.stroke();
        g.lineWidth = 3;
        g.strokeColor = MILK;
        g.roundRect(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, 26);
        g.stroke();
        slot.addChild(ring);
        ring.setScale(0.94, 0.94, 1);
        tween(ring)
            .to(0.08, { scale: new Vec3(1, 1, 1) }, { easing: easing.quadOut })
            .start();
    }

    private drawBuffer(root: Node, board: BoardState) {
        if (!board.bufferEnabled) return;
        const n = board.buffer.length;
        const wrap = new Node('BufferBoard');
        wrap.layer = UI_2D;
        wrap.setPosition(0, Y_BUFFER, 0);
        wrap.addComponent(UITransform).setContentSize(BUF_BOARD_W, BUF_BOARD_H);
        root.addChild(wrap);
        const wood = this.addSprite(wrap, 'Wood', this.bufferBoard || this.builtin, BUF_BOARD_W, BUF_BOARD_H, 0, 0, Color.WHITE);
        // 贴图可半分辨率；固定 720×220 等比铺满，三格中心仍用 BUF_WELL_XS
        const woodSp = wood.getComponent(Sprite);
        if (woodSp) woodSp.sizeMode = Sprite.SizeMode.CUSTOM;

        const plaqueW = 300;
        const plaqueH = 52;
        const plaque = new Node('BufPlaque');
        plaque.layer = UI_2D;
        plaque.setPosition(0, -BUF_BOARD_H / 2 - 8, 0);
        plaque.addComponent(UITransform).setContentSize(plaqueW, plaqueH);
        const pg = plaque.addComponent(Graphics);
        pg.fillColor = new Color(92, 62, 48, 255);
        pg.roundRect(-plaqueW / 2, -plaqueH / 2, plaqueW, plaqueH, 14);
        pg.fill();
        pg.fillColor = new Color(122, 82, 62, 255);
        pg.roundRect(-plaqueW / 2 + 4, -plaqueH / 2 + 6, plaqueW - 8, plaqueH - 14, 10);
        pg.fill();
        wrap.addChild(plaque);

        let filled = 0;
        for (let i = 0; i < n; i++) {
            if (board.buffer[i] != null) filled += 1;
            const slotNode = new Node(`Buffer${i}`);
            slotNode.layer = UI_2D;
            slotNode.setPosition(this.bufferSlotX(i, n), BUF_WELL_Y, 0);
            slotNode.addComponent(UITransform).setContentSize(BUF_SLOT_W, BUF_SLOT_H);
            wrap.addChild(slotNode);
            const hitPad = this.mountBufferSlotHitPad(slotNode);

            const selected = !!(
                !board.isWin()
                && board.dest
                && board.dest.kind === 'buffer'
                && board.dest.index === i
            );
            if (selected) {
                this.drawBufferSelect(slotNode);
                this.drawCoralFramePulse(slotNode, BUF_SLOT_W + 4, BUF_SLOT_H + 4, 2, 32);
            }

            const item = board.buffer[i];
            if (item) {
                const food = this.addSprite(slotNode, 'Food', this.frameForFood(item), BUF_FOOD, BUF_FOOD, 0, 0, Color.WHITE);
                const src: FoodDragSource = { kind: 'buffer', index: i };
                food.on(Node.EventType.TOUCH_START, (e: EventTouch) => this.beginFoodPointer(e, src), this);
                food.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => this.moveFoodPointer(e), this);
                food.on(Node.EventType.TOUCH_END, (e: EventTouch) => this.endFoodPointer(e), this);
                food.on(Node.EventType.TOUCH_CANCEL, (e: EventTouch) => this.endFoodPointer(e), this);
                if (this.holdHint && this.holdHint.bufferIndex === i) {
                    this.drawSageDashedRing(slotNode, BUF_FOOD + 8, BUF_FOOD + 8, 18, 'HintRing');
                }
            } else if (this.holdHintBuffers.indexOf(i) >= 0) {
                this.drawSageDashedRing(slotNode, BUF_SLOT_W, BUF_SLOT_H, 28, 'HintRing');
            }
            if (
                this.holdHint
                && this.holdHint.dest.kind === 'buffer'
                && this.holdHint.dest.index === i
                && !item
            ) {
                this.drawSageDashedRing(slotNode, BUF_SLOT_W, BUF_SLOT_H, 28, 'HintRing');
            }

            const slotIndex = i;
            hitPad.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
                const live = this.board;
                if (!live || live.buffer[slotIndex] == null) return;
                this.beginFoodPointer(e, { kind: 'buffer', index: slotIndex });
            }, this);
            hitPad.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => this.moveFoodPointer(e), this);
            hitPad.on(Node.EventType.TOUCH_END, (e: EventTouch) => this.endBufferPointer(e, slotIndex), this);
            hitPad.on(Node.EventType.TOUCH_CANCEL, (e: EventTouch) => this.endBufferPointer(e, slotIndex), this);
            this.raiseBufferHitPad(slotNode);
        }

        this.addLabel(plaque, 'BufCount', `柜台 ${filled}/${n}`, 28, MILK, 260, 40);
    }

    private onBufferTap(index: number) {
        const board = this.board;
        if (!board || this.busy || board.isWin() || !board.bufferEnabled) return;
        if (board.buffer[index] == null) {
            this.holdHintBuffers = [];
            board.selectBuffer(index);
            this.render();
            return;
        }
        this.dismissSizeIntro();
        this.placeFromBuffer(index);
    }

    private frameForFood(id: FoodId): SpriteFrame | null {
        if (id === 'milk') return this.foodMilk;
        if (id === 'veg') return this.foodVeg;
        if (id === 'fruit') return this.foodFruit;
        if (id === 'meat') return this.foodMeat;
        if (id === 'sauce') return this.foodSauce;
        if (id === 'leftover') return this.foodLeftover;
        if (id === 'grape') return this.foodGrape;
        if (id === 'lemon') return this.foodLemon;
        if (id === 'kiwi') return this.foodKiwi;
        if (id === 'pineapple') return this.foodPineapple;
        if (id === 'watermelon') return this.foodWatermelon;
        if (id === 'coconut') return this.foodCoconut;
        return null;
    }

    private frameForBag(id: FoodId): SpriteFrame | null {
        return this.bagFrames[id] || this.frameForFood(id);
    }

    /** 只有栈顶整盘染色。下层前唇保持奶油色，避免泄露种类。 */
    private trayTint(id: FoodId): Color {
        const tint: Partial<Record<FoodId, [number, number, number]>> = {
            veg: [176, 198, 156],
            fruit: [224, 150, 142],
            meat: [210, 158, 146],
            sauce: [220, 170, 112],
            leftover: [176, 158, 172],
            grape: [214, 196, 214],
            lemon: [228, 208, 132],
            kiwi: [168, 196, 124],
            pineapple: [222, 190, 104],
            watermelon: [214, 136, 142],
            coconut: [232, 216, 188],
        };
        const rgb = tint[id];
        return rgb ? new Color(rgb[0], rgb[1], rgb[2], 255) : Color.WHITE;
    }

    private clearFoodPress() {
        this.foodPressToken += 1;
        const press = this.foodPress;
        this.foodPress = null;
        this.clearDropHalo();
        if (!press) return;
        if (press.ghost && press.ghost.isValid) press.ghost.destroy();
        if (press.hidden && press.hidden.isValid) this.showDragSource(press.hidden);
    }

    private beginFoodPointer(e: EventTouch, source: FoodDragSource) {
        if (this.foodPress) {
            if (this.foodPress.id === e.getID()) e.propagationStopped = true;
            return;
        }
        const board = this.board;
        const root = this.playRoot;
        if (!board || !root || this.busy || board.isWin()) return;
        let item: FoodId | null = null;
        if (source.kind === 'bag') {
            if (this.lockedBagCol === source.col) return;
            item = board.peekBag(source.col);
        } else {
            if (!board.bufferEnabled) return;
            item = board.buffer[source.index];
        }
        if (!item) return;
        const food = this.sourceFoodNode(source);
        const rootUi = root.getComponent(UITransform);
        const origin = food && rootUi
            ? rootUi.convertToNodeSpaceAR(food.worldPosition.clone())
            : new Vec3();
        const p = e.getUILocation();
        this.foodPress = {
            id: e.getID(),
            source,
            item,
            startX: p.x,
            startY: p.y,
            origin,
            armed: false,
            ghost: null,
            flyer: null,
            hidden: null,
            hover: null,
            hit: null,
            flyW: 72,
            flyH: 96,
        };
        e.propagationStopped = true;
    }

    private moveFoodPointer(e: EventTouch) {
        const press = this.foodPress;
        if (!press || press.id !== e.getID()) return;
        e.propagationStopped = true;
        const p = e.getUILocation();
        const dx = p.x - press.startX;
        const dy = p.y - press.startY;
        if (!press.armed) {
            if (dx * dx + dy * dy < DRAG_SLOP * DRAG_SLOP) return;
            this.dismissSizeIntro();
            this.armFoodPress(press);
        }
        if (this.foodPress !== press || !press.ghost) return;
        const finger = this.fingerInRoot(e);
        if (!finger) return;
        press.ghost.setPosition(finger.x, finger.y, 0);
        const hit = this.destAtTouch(e);
        press.hit = hit;
        const hover = hit && this.dragCanDrop(press, hit) ? hit : null;
        press.hover = hover;
        if (hover) this.showDropHalo(hover);
        else this.clearDropHalo();
    }

    private endFoodPointer(e: EventTouch) {
        const press = this.foodPress;
        if (!press || press.id !== e.getID()) return;
        e.propagationStopped = true;
        this.swallowedTouch = e.getID();
        this.foodPress = null;
        this.clearDropHalo();
        if (!press.armed) {
            if (press.source.kind === 'bag') this.onBagTap(press.source.col, true);
            else this.placeFromBuffer(press.source.index);
            return;
        }
        if (press.hover) {
            this.flyGhostToDest(press, press.hover);
            return;
        }
        this.snapGhostHome(press, press.hit);
    }

    private endBufferPointer(e: EventTouch, index: number) {
        if (this.foodPress && this.foodPress.id === e.getID()) {
            this.endFoodPointer(e);
            return;
        }
        if (this.swallowedTouch === e.getID()) return;
        this.onBufferTap(index);
    }

    private armFoodPress(press: FoodPress) {
        const root = this.playRoot;
        if (!root) return;
        press.armed = true;
        this.busy = true;
        const hidden = this.sourceFoodNode(press.source);
        press.hidden = hidden;
        let flyW = 72;
        let flyH = 96;
        if (hidden) {
            const ui = hidden.getComponent(UITransform);
            const sc = hidden.worldScale;
            if (ui) {
                flyW = Math.max(8, ui.contentSize.width * Math.abs(sc.x));
                flyH = Math.max(8, ui.contentSize.height * Math.abs(sc.y));
            }
            const rootUi = root.getComponent(UITransform);
            if (rootUi) press.origin = rootUi.convertToNodeSpaceAR(hidden.worldPosition.clone());
            // 不能 active=false：触摸目标一关掉，这次拖动会被系统取消。
            this.hideDragSource(hidden);
        }
        press.flyW = flyW;
        press.flyH = flyH;
        const ghost = new Node('DragGhost');
        ghost.layer = UI_2D;
        ghost.setPosition(press.origin);
        root.addChild(ghost);
        this.placeBelowHud(ghost);
        const shadow = new Node('Shadow');
        shadow.layer = UI_2D;
        shadow.setPosition(0, -flyH * 0.42, 0);
        shadow.addComponent(UITransform).setContentSize(flyW, 16);
        const shade = shadow.addComponent(Graphics);
        shade.fillColor = new Color(72, 54, 42, 140);
        shade.ellipse(0, 0, flyW * 0.36, 5);
        shade.fill();
        ghost.addChild(shadow);
        const flyer = this.addSprite(ghost, 'Flyer', this.frameForFood(press.item), flyW, flyH, 0, 0, Color.WHITE);
        const flyerUi = flyer.getComponent(UITransform);
        if (flyerUi) flyerUi.setAnchorPoint(0.5, 0.5);
        press.flyer = flyer;
        press.ghost = ghost;
    }

    private flyGhostToDest(press: FoodPress, dest: Dest) {
        const board = this.board;
        if (board) {
            if (dest.kind === 'tray') board.selectTray(dest.index);
            else board.selectBuffer(dest.index);
        }
        const ghost = press.ghost;
        const flyer = press.flyer;
        const token = this.foodPressToken;
        if ((press.item === 'milk' || press.item === 'sauce') && dest.kind === 'tray' && flyer) {
            this.syncFridgeBottleFlyer(press.item, dest.index, flyer, press);
        }
        const landing = this.placeLanding(press.item, dest, press.flyW, press.flyH);
        const finish = () => {
            if (token !== this.foodPressToken) return;
            if (ghost && ghost.isValid) ghost.destroy();
            if (press.source.kind === 'bag') this.commitPlace(press.source.col);
            else this.commitPlaceFromBuffer(press.source.index);
        };
        if (!ghost || !flyer || !landing) {
            finish();
            return;
        }
        tween(ghost)
            .to(FLY_SEC, { position: landing.to }, { easing: easing.cubicOut })
            .start();
        tween(flyer)
            .to(FLY_SEC, { scale: landing.scale }, { easing: easing.linear })
            .call(finish)
            .start();
    }

    private snapGhostHome(press: FoodPress, hit: Dest | null) {
        const ghost = press.ghost;
        const hidden = press.hidden;
        const token = this.foodPressToken;
        const back = () => {
            if (token !== this.foodPressToken) return;
            if (ghost && ghost.isValid) ghost.destroy();
            if (hidden && hidden.isValid) this.showDragSource(hidden);
            this.busy = false;
            const board = this.board;
            if (!hit || !board) return;
            const source = press.source.kind === 'bag' ? 'bag' : 'buffer';
            const depth = press.source.kind === 'bag' ? board.bags[press.source.col].length : 1;
            this.showPlaceFail(board.explainReject(hit, press.item, source, depth));
            if (press.source.kind === 'bag') this.shakeBagTop(press.source.col);
        };
        if (!ghost) {
            back();
            return;
        }
        tween(ghost)
            .to(0.12, { position: press.origin }, { easing: easing.quadOut })
            .call(back)
            .start();
    }

    private dragCanDrop(press: FoodPress, dest: Dest): boolean {
        const board = this.board;
        if (!board) return false;
        const source = press.source.kind === 'bag' ? 'bag' : 'buffer';
        const depth = press.source.kind === 'bag' ? board.bags[press.source.col].length : 1;
        return board.canAccept(dest, press.item, source, depth).ok;
    }

    private sourceFoodNode(source: FoodDragSource): Node | null {
        const root = this.playRoot;
        const board = this.board;
        if (!root || !board) return null;
        if (source.kind === 'bag') {
            const bag = root.getChildByName(`Bag${source.col}`);
            if (!bag) return null;
            const top = bag.getChildByName(`T${board.bags[source.col].length - 1}`);
            if (!top) return null;
            return top.getChildByName('Food') || top;
        }
        const wrap = root.getChildByName('BufferBoard');
        const slot = wrap ? wrap.getChildByName(`Buffer${source.index}`) : null;
        return slot ? slot.getChildByName('Food') : null;
    }

    /** 指尖在对局根节点里的位置。拖动时食物贴图中心放在这里。 */
    private fingerInRoot(e: EventTouch): Vec3 | null {
        const root = this.playRoot;
        const ui = root ? root.getComponent(UITransform) : null;
        if (!ui) return null;
        const p = e.getUILocation();
        return ui.convertToNodeSpaceAR(new Vec3(p.x, p.y, 0));
    }

    /** 只把贴图藏起来。关掉节点或中途加组件都会让这次触摸被取消。 */
    private hideDragSource(node: Node) {
        const sp = node.getComponent(Sprite);
        if (!sp) return;
        const c = sp.color;
        sp.color = new Color(c.r, c.g, c.b, 0);
    }

    private showDragSource(node: Node) {
        node.active = true;
        const sp = node.getComponent(Sprite);
        if (!sp) return;
        const c = sp.color;
        sp.color = new Color(c.r, c.g, c.b, 255);
    }

    /** 拖动落点：冰箱优先，再柜台（避免叠盘区误吸到空槽）。 */
    private destAtTouch(e: EventTouch): Dest | null {
        const root = this.playRoot;
        const board = this.board;
        if (!root || !board) return null;
        const screen = e.getLocation();
        for (let i = board.trays.length - 1; i >= 0; i--) {
            const tray = this.newestNamed(root, `Tray${i}`);
            const ui = tray ? tray.getComponent(UITransform) : null;
            if (ui && ui.hitTest(screen)) return { kind: 'tray', index: i };
        }
        if (board.bufferEnabled) {
            const wrap = root.getChildByName('BufferBoard');
            if (wrap) {
                for (let i = board.buffer.length - 1; i >= 0; i--) {
                    const slot = wrap.getChildByName(`Buffer${i}`);
                    const pad = slot ? slot.getChildByName('HitPad') : null;
                    const ui = pad ? pad.getComponent(UITransform) : slot ? slot.getComponent(UITransform) : null;
                    if (ui && ui.hitTest(screen)) return { kind: 'buffer', index: i };
                }
            }
        }
        return null;
    }

    /** 和选中呼吸灯同一圈：冰箱用木框外沿，柜台用凹槽外沿。 */
    private dropHaloBox(dest: Dest): { w: number; h: number; inset: number; radius: number } {
        if (dest.kind === 'buffer') {
            return { w: BUF_SLOT_W + 4, h: BUF_SLOT_H + 4, inset: 2, radius: 32 };
        }
        const m = this.trayAt(dest.index);
        return { w: m.outerW, h: m.outerH, inset: 4, radius: m.horizontal ? 16 : 24 };
    }

    private showDropHalo(dest: Dest) {
        if (this.dropHalo && this.dropHalo.isValid && this.sameDest(this.dropHaloDest, dest)) return;
        this.clearDropHalo();
        const root = this.playRoot;
        const host = this.destNode(dest);
        const ui = host ? host.getComponent(UITransform) : null;
        const rootUi = root ? root.getComponent(UITransform) : null;
        if (!root || !host || !ui || !rootUi) return;
        const box = this.dropHaloBox(dest);
        const halo = new Node('DropHalo');
        halo.layer = UI_2D;
        const pos = rootUi.convertToNodeSpaceAR(ui.convertToWorldSpaceAR(new Vec3(0, 0, 0)));
        halo.setPosition(pos);
        halo.addComponent(UITransform).setContentSize(box.w + 24, box.h + 24);
        const g = halo.addComponent(Graphics);
        const x = -box.w / 2 + box.inset;
        const y = -box.h / 2 + box.inset;
        const rw = box.w - box.inset * 2;
        const rh = box.h - box.inset * 2;
        g.lineWidth = 16;
        g.strokeColor = new Color(255, 138, 18, 230);
        g.roundRect(x - 10, y - 10, rw + 20, rh + 20, box.radius + 8);
        g.stroke();
        g.lineWidth = 6;
        g.strokeColor = new Color(255, 226, 48, 255);
        g.roundRect(x - 2, y - 2, rw + 4, rh + 4, box.radius + 2);
        g.stroke();
        const op = halo.addComponent(UIOpacity);
        op.opacity = 255;
        root.addChild(halo);
        this.raiseDropHalo(halo);
        tween(op)
            .to(0.3, { opacity: 210 })
            .to(0.3, { opacity: 255 })
            .union()
            .repeatForever()
            .start();
        this.dropHalo = halo;
        this.dropHaloDest = dest;
    }

    /** 外框盖过台面和格子，仍留在拖动的食材下面。 */
    private raiseDropHalo(node: Node) {
        const root = this.playRoot;
        if (!root || node.parent !== root) return;
        const ghost = root.getChildByName('DragGhost');
        if (ghost && ghost !== node) {
            node.setSiblingIndex(ghost.getSiblingIndex());
            return;
        }
        this.placeBelowHud(node);
    }

    private clearDropHalo() {
        const halo = this.dropHalo;
        if (halo && halo.isValid) {
            const op = halo.getComponent(UIOpacity);
            if (op) Tween.stopAllByTarget(op);
            halo.destroy();
        }
        this.dropHalo = null;
        this.dropHaloDest = null;
    }

    private sameDest(a: Dest | null, b: Dest | null): boolean {
        if (!a || !b) return false;
        return a.kind === b.kind && a.index === b.index;
    }

    private destNode(dest: Dest): Node | null {
        const root = this.playRoot;
        if (!root) return null;
        if (dest.kind === 'tray') return this.newestNamed(root, `Tray${dest.index}`);
        const wrap = root.getChildByName('BufferBoard');
        return wrap ? wrap.getChildByName(`Buffer${dest.index}`) : null;
    }

    private newestNamed(root: Node, name: string): Node | null {
        const kids = root.children;
        for (let i = kids.length - 1; i >= 0; i--) {
            if (kids[i].name === name) return kids[i];
        }
        return null;
    }

    private prepFridgeFlyVisual(
        item: FoodId,
        dest: Dest | null,
        flyW: number,
        flyH: number,
    ): { flyW: number; flyH: number; frame: SpriteFrame | null } {
        let frame = this.frameForFood(item);
        if (dest?.kind !== 'tray') return { flyW, flyH, frame };
        const horizontal = this.trayAt(dest.index).horizontal;
        if (item === 'milk' || item === 'sauce') {
            frame = this.trayFridgeFoodFrame(item, horizontal);
            const board = this.board;
            const tray = board?.trays[dest.index];
            if (board && tray) {
                const m = this.trayAt(dest.index);
                const seat = this.seatBox(m.slotW, m.slotH, tray.cap, tray.items.length, horizontal);
                const box = this.trayItemDrawSize(item, horizontal, seat);
                return { flyW: box.w, flyH: box.h, frame };
            }
        }
        if (!this.fridgeUsesSlotFrame(item, horizontal)) return { flyW, flyH, frame };
        const slotFrame = this.slotFrameForFridge(item);
        if (!slotFrame) return { flyW, flyH, frame };
        frame = slotFrame;
        const probe = { w: flyW / 0.82, h: flyH / 0.82 };
        const box = item === 'milk' ? this.fitMilkInSeat(probe) : this.fitSauceInSeat(probe);
        return { flyW: box.w, flyH: box.h, frame };
    }

    private prepFridgeFlyStartSize(
        item: FoodId,
        horizontal: boolean,
    ): { size: { w: number; h: number }; frame: SpriteFrame | null } {
        if (item === 'milk' || item === 'sauce') {
            const frame = this.trayFridgeFoodFrame(item, horizontal);
            const board = this.board;
            const dest = board?.dest;
            if (board && dest?.kind === 'tray') {
                const m = this.trayAt(dest.index);
                const tray = board.trays[dest.index];
                const seat = this.seatBox(m.slotW, m.slotH, tray.cap, tray.items.length, horizontal);
                return { size: this.trayItemDrawSize(item, horizontal, seat), frame };
            }
            return { size: this.plateFoodSize(item), frame: frame || this.frameForFood(item) };
        }
        return { size: { w: 64, h: 96 }, frame: this.frameForFood(item) };
    }

    /** 落点前对齐冰箱格贴图（牛奶/酱按 trayFridgeFoodFrame）。 */
    private syncFridgeBottleFlyer(
        item: FoodId,
        trayIndex: number,
        flyer: Node,
        press: FoodPress,
    ): void {
        if (item !== 'milk' && item !== 'sauce') return;
        const board = this.board;
        if (!board) return;
        const m = this.trayAt(trayIndex);
        const horizontal = m.horizontal;
        const tray = board.trays[trayIndex];
        const seat = this.seatBox(m.slotW, m.slotH, tray.cap, tray.items.length, horizontal);
        const frame = this.trayFridgeFoodFrame(item, horizontal);
        const size = this.trayItemDrawSize(item, horizontal, seat);
        const sp = flyer.getComponent(Sprite);
        const flyerUi = flyer.getComponent(UITransform);
        if (!sp || !flyerUi || !frame) return;
        sp.spriteFrame = frame;
        flyerUi.setContentSize(size.w, size.h);
        flyer.setScale(1, 1, 1);
        press.flyW = size.w;
        press.flyH = size.h;
    }

    /** 飞入落点。scale 乘上飞行图的宽高后等于格子里的成品尺寸。 */
    private placeLanding(item: FoodId, dest: Dest, flyW: number, flyH: number): { to: Vec3; scale: Vec3 } | null {
        const board = this.board;
        const root = this.playRoot;
        const ui = root ? root.getComponent(UITransform) : null;
        if (!board || !root || !ui || flyW <= 0 || flyH <= 0) return null;
        if (dest.kind === 'buffer') {
            const wrap = root.getChildByName('BufferBoard');
            const slot = wrap ? wrap.getChildByName(`Buffer${dest.index}`) : null;
            const slotUi = slot ? slot.getComponent(UITransform) : null;
            if (!slotUi) return null;
            const to = ui.convertToNodeSpaceAR(slotUi.convertToWorldSpaceAR(new Vec3(0, 0, 0)));
            return { to, scale: new Vec3(BUF_FOOD / flyW, BUF_FOOD / flyH, 1) };
        }
        const trayNode = this.newestNamed(root, `Tray${dest.index}`);
        const trayUi = trayNode ? trayNode.getComponent(UITransform) : null;
        const tray = board.trays[dest.index];
        if (!trayUi || !tray) return null;
        const m = this.trayAt(dest.index);
        const seat = this.seatBox(m.slotW, m.slotH, tray.cap, tray.items.length, m.horizontal);
        const to = ui.convertToNodeSpaceAR(trayUi.convertToWorldSpaceAR(new Vec3(seat.x, seat.y, 0)));
        const size = this.trayItemDrawSize(item, m.horizontal, seat);
        return { to, scale: new Vec3(size.w / flyW, size.h / flyH, 1) };
    }

    /** 飞行图 / 拖影 / 落点高亮：盖住冰箱与柜台，仍在 HUD 按钮下面。 */
    private placeBelowHud(node: Node) {
        const root = this.playRoot;
        if (!root || node.parent !== root) return;
        const hud = root.getChildByName('LevelPill');
        const buffer = root.getChildByName('BufferBoard');
        if (hud && buffer) {
            const hudIdx = hud.getSiblingIndex();
            const bufIdx = buffer.getSiblingIndex();
            node.setSiblingIndex(bufIdx >= hudIdx ? bufIdx + 1 : hudIdx);
            return;
        }
        if (hud) {
            node.setSiblingIndex(hud.getSiblingIndex());
            return;
        }
        node.setSiblingIndex(root.children.length - 1);
    }

    private onBagTap(col: number, isTop: boolean) {
        const board = this.board;
        const root = this.playRoot;
        if (!board || !root || this.busy || board.isWin()) return;
        if (!isTop || this.lockedBagCol === col) return;
        const item = board.peekBag(col);
        if (!item) return;
        this.dismissSizeIntro();
        const check = board.canAccept(board.dest, item, 'bag', board.bags[col].length);
        if (!check.ok) {
            const result = board.placeFromBag(col);
            if (!result.ok) this.showPlaceFail(result);
            this.shakeBagTop(col);
            return;
        }

        const bagNode = root.getChildByName(`Bag${col}`);
        const top = bagNode ? bagNode.getChildByName(`T${board.bags[col].length - 1}`) : null;
        if (!top) {
            this.commitPlace(col);
            return;
        }

        this.busy = true;
        const toBuffer = board.dest != null && board.dest.kind === 'buffer';
        const foodNode = top.getChildByName('Food');
        const fromNode = foodNode || top;
        const fromWorld = fromNode.worldPosition.clone();
        if (toBuffer || !foodNode) top.active = false;
        else foodNode.active = false;
        const ui = root.getComponent(UITransform)!;
        const from = ui.convertToNodeSpaceAR(fromWorld);
        const fromUi = fromNode.getComponent(UITransform);
        const fromScale = fromNode.worldScale;
        let flyW = fromUi ? fromUi.contentSize.width * Math.abs(fromScale.x) : 72;
        let flyH = fromUi ? fromUi.contentSize.height * Math.abs(fromScale.y) : 96;
        if (toBuffer) {
            flyW = 96;
            flyH = 96;
        }
        const flyVisual = this.prepFridgeFlyVisual(item, board.dest, flyW, flyH);
        flyW = flyVisual.flyW;
        flyH = flyVisual.flyH;
        const landing = board.dest ? this.placeLanding(item, board.dest, flyW, flyH) : null;
        if (!landing) {
            this.commitPlace(col);
            return;
        }

        const flyFrame = flyVisual.frame;
        const flyer = this.addSprite(root, 'Flyer', flyFrame, flyW, flyH, from.x, from.y, Color.WHITE);
        this.placeBelowHud(flyer);
        tween(flyer)
            .to(FLY_SEC, { position: landing.to }, { easing: easing.cubicOut })
            .start();
        tween(flyer)
            .to(FLY_SEC, { scale: landing.scale }, { easing: easing.linear })
            .start();

        this.scheduleOnce(() => {
            if (flyer.isValid) flyer.destroy();
            this.commitPlace(col);
        }, FLY_SEC);
    }

    private placeFromBuffer(index: number) {
        const board = this.board;
        const root = this.playRoot;
        if (!board || !root) return;
        const item = board.buffer[index];
        if (item == null) return;
        const check = board.canAccept(board.dest, item, 'buffer');
        if (!check.ok) {
            const result = board.placeFromBuffer(index);
            if (!result.ok) this.showPlaceFail(result);
            return;
        }

        const wrap = root.getChildByName('BufferBoard');
        const slot = wrap ? wrap.getChildByName(`Buffer${index}`) : null;
        const food = slot ? slot.getChildByName('Food') : null;
        const destIndex = board.dest && board.dest.kind === 'tray' ? board.dest.index : 0;
        const trayNode = root.getChildByName(`Tray${destIndex}`);
        if (!food || !trayNode) {
            this.commitPlaceFromBuffer(index);
            return;
        }

        this.busy = true;
        food.active = false;
        const ui = root.getComponent(UITransform)!;
        const from = ui.convertToNodeSpaceAR(food.worldPosition);
        const nextCount = board.trays[destIndex].items.length;
        const m = this.trayAt(destIndex);
        const cap = board.trays[destIndex].cap;
        const seat = this.seatBox(m.slotW, m.slotH, cap, nextCount, m.horizontal);
        const toWorld = trayNode.getComponent(UITransform)!.convertToWorldSpaceAR(new Vec3(seat.x, seat.y, 0));
        const to = ui.convertToNodeSpaceAR(toWorld);
        const startVisual = this.prepFridgeFlyStartSize(item, m.horizontal);
        const start = startVisual.size;
        const flyFrame = startVisual.frame;
        const flyer = this.addSprite(root, 'Flyer', flyFrame, start.w, start.h, from.x, from.y, Color.WHITE);
        this.placeBelowHud(flyer);
        const size = this.trayItemDrawSize(item, m.horizontal, seat);
        const land = new Vec3(size.w / start.w, size.h / start.h, 1);
        tween(flyer)
            .to(FLY_SEC, { position: new Vec3(to.x, to.y, 0), scale: land }, { easing: easing.cubicOut })
            .start();
        this.scheduleOnce(() => {
            if (flyer.isValid) flyer.destroy();
            this.commitPlaceFromBuffer(index);
        }, FLY_SEC);
    }

    private commitPlaceFromBuffer(index: number) {
        const board = this.board;
        const root = this.playRoot;
        if (!board || !root) {
            this.busy = false;
            return;
        }
        const result = board.placeFromBuffer(index);
        if (!result.ok) {
            this.busy = false;
            this.prepareSizeFail(result);
            this.render();
            this.showPlaceFail(result);
            this.playSizeFeedback();
            return;
        }
        this.holdHint = null;
        this.holdHintBuffers = [];
        this.noteSizeTeach(result.item, result.dest);
        const win = board.isWin();
        this.animateDoorIndex = result.sealed && result.dest.kind === 'tray' ? result.dest.index : null;
        this.holdWin = win;
        this.clearDropHalo();
        this.render();
        if (result.dest.kind === 'tray') playFridgeDrop();
        const doorPlayed = result.sealed && result.dest.kind === 'tray' && this.playDoorClose(result.dest.index, win);
        if (!doorPlayed) this.animateDoorIndex = null;
        this.squashLanded(result.dest);
        if (!doorPlayed) this.finishMove(win);
    }

    private commitPlace(col: number) {
        const board = this.board;
        const root = this.playRoot;
        if (!board || !root) {
            this.busy = false;
            return;
        }
        const result = board.placeFromBag(col);
        if (!result.ok) {
            this.busy = false;
            this.prepareSizeFail(result);
            this.render();
            this.showPlaceFail(result);
            this.playSizeFeedback();
            return;
        }
        this.holdHint = null;
        this.holdHintBuffers = [];
        this.l1Guide = false;
        this.revealBagCol = board.bags[col].length > 0 ? col : null;
        if (this.revealBagCol != null) {
            const locked = this.revealBagCol;
            this.lockedBagCol = locked;
            this.scheduleOnce(() => {
                if (this.lockedBagCol === locked) this.lockedBagCol = null;
            }, 0.18);
        }
        this.noteSizeTeach(result.item, result.dest);
        const win = board.isWin();
        this.animateDoorIndex = result.sealed && result.dest.kind === 'tray' ? result.dest.index : null;
        this.holdWin = win;
        this.clearDropHalo();
        this.render();
        if (result.dest.kind === 'tray') playFridgeDrop();
        const doorPlayed = result.sealed && result.dest.kind === 'tray' && this.playDoorClose(result.dest.index, win);
        if (!doorPlayed) this.animateDoorIndex = null;
        this.squashLanded(result.dest);
        if (!doorPlayed) this.finishMove(win);
    }

    /** render() 延迟销毁旧节点，getChildByName 会命中即将销毁的旧槽，门动画挂上去就丢了。 */
    private playDoorClose(index: number, win: boolean): boolean {
        const root = this.playRoot;
        if (!root) return false;
        const tray = this.newestNamed(root, `Tray${index}`);
        const door = tray ? tray.getChildByName('Door') : null;
        const doorUi = door ? door.getComponent(UITransform) : null;
        if (!door || !tray || !doorUi) return false;
        const slotW = doorUi.contentSize.width;
        const slotH = doorUi.contentSize.height;
        playTrayDoorClose();
        playTrayDoorVibration();
        tween(door)
            .delay(DOOR_SEC * 0.8)
            .call(() => {
                if (door.isValid) this.spawnHingeGlint(door, slotH);
            })
            .start();
        tween(door)
            .to(DOOR_SEC, { scale: new Vec3(1, 1, 1) }, { easing: easing.cubicOut })
            .call(() => {
                this.animateDoorIndex = null;
                if (door.isValid) {
                    this.spawnSeamPuff(door, slotW, slotH);
                }
                this.bounceNode(tray);
                this.finishMove(win);
            })
            .start();
        return true;
    }

    /** 门合到约八成时，右缘把手上一条短白高光。 */
    private spawnHingeGlint(door: Node, slotH: number) {
        const handleH = Math.min(72, Math.max(28, Math.round(slotH * 0.46)));
        const glintH = Math.round(handleH * 0.55);
        const glint = new Node('HingeGlint');
        glint.layer = UI_2D;
        glint.setPosition(-15, 0, 0);
        glint.addComponent(UITransform).setContentSize(6, glintH);
        const g = glint.addComponent(Graphics);
        g.fillColor = new Color(255, 255, 255, 230);
        g.roundRect(-3, -glintH / 2, 6, glintH, 3);
        g.fill();
        const op = glint.addComponent(UIOpacity);
        op.opacity = 255;
        door.addChild(glint);
        tween(op)
            .to(0.08, { opacity: 0 })
            .call(() => {
                if (glint.isValid) glint.destroy();
            })
            .start();
    }

    /** 门到位时，左缘三粒奶油圆点向外淡出。 */
    private spawnSeamPuff(door: Node, slotW: number, slotH: number) {
        const ys = [-slotH * 0.22, 0, slotH * 0.22];
        for (let i = 0; i < ys.length; i++) {
            const dot = new Node('SeamPuff');
            dot.layer = UI_2D;
            const x0 = -slotW - 2;
            dot.setPosition(x0, ys[i], 0);
            dot.addComponent(UITransform).setContentSize(16, 16);
            const g = dot.addComponent(Graphics);
            const radius = 4 + i;
            g.fillColor = new Color(246, 239, 230, 210);
            g.circle(0, 0, radius);
            g.fill();
            const op = dot.addComponent(UIOpacity);
            op.opacity = 220;
            door.addChild(dot);
            tween(dot)
                .to(0.12, { position: new Vec3(x0 - 16 - i * 6, ys[i], 0) }, { easing: easing.quadOut })
                .start();
            tween(op)
                .to(0.12, { opacity: 0 })
                .call(() => {
                    if (dot.isValid) dot.destroy();
                })
                .start();
        }
    }

    /** 食材落进格子后纵向轻压再弹回。 */
    private squashLanded(dest: Dest) {
        const root = this.playRoot;
        const board = this.board;
        if (!root || !board) return;
        let food: Node | null = null;
        if (dest.kind === 'tray') {
            const tray = this.newestNamed(root, `Tray${dest.index}`);
            const n = board.trays[dest.index] ? board.trays[dest.index].items.length : 0;
            food = tray && n > 0 ? tray.getChildByName(`Food${n - 1}`) : null;
        } else {
            const wrap = this.newestNamed(root, 'BufferBoard');
            const slot = wrap ? wrap.getChildByName(`Buffer${dest.index}`) : null;
            food = slot ? slot.getChildByName('Food') : null;
        }
        if (!food) return;
        const sx = food.scale.x;
        const sy = food.scale.y;
        tween(food)
            .to(0.045, { scale: new Vec3(sx * 1.06, sy * 0.86, 1) }, { easing: easing.quadOut })
            .to(0.045, { scale: new Vec3(sx, sy, 1) }, { easing: easing.quadOut })
            .start();
    }

    private finishMove(win: boolean) {
        if (win) {
            this.scheduleOnce(() => this.playWinReward(), SETTLE_DELAY);
            return;
        }
        this.holdWin = false;
        const board = this.board;
        const reason = board ? board.failReason() : null;
        if (reason) {
            this.playSizeFeedback();
            this.onFail(reason);
            return;
        }
        this.busy = false;
        this.swallowedTouch = -2;
        this.playSizeFeedback();
    }

    private onFail(reason: FailReason) {
        const board = this.board;
        if (!board) return;
        if (!board.level.loseable) {
            console.log(`[fridge] unexpected fail L${board.level.id} ${reason}`);
            this.busy = false;
            this.restartLevel();
            return;
        }
        this.levelFailed = true;
        this.busy = true;
        this.scheduleOnce(() => {
            playSfx('game_failed');
            this.flashFail(reason, () => this.spawnFailCard(reason));
        }, SETTLE_DELAY);
    }

    private flashFail(reason: FailReason, done: () => void) {
        const root = this.playRoot;
        const board = this.board;
        if (!root || !board) {
            done();
            return;
        }
        const targets: Node[] = [];
        if (reason === 'buffer_full') {
            const wrap = root.getChildByName('BufferBoard');
            if (wrap) {
                for (let i = 0; i < board.buffer.length; i++) {
                    const slot = wrap.getChildByName(`Buffer${i}`);
                    if (slot) targets.push(slot);
                }
            }
        } else {
            const doomed = board.unfillableTrayIndexes();
            const indexes = doomed.length > 0 ? doomed : board.trays.map((_, i) => i).filter((i) => board.trays[i].sealed);
            for (let n = 0; n < indexes.length; n++) {
                const tray = root.getChildByName(`Tray${indexes[n]}`);
                if (tray) targets.push(tray);
            }
        }
        for (let i = 0; i < targets.length; i++) {
            this.pulseCoral(targets[i]);
        }
        this.scheduleOnce(done, 0.42);
    }

    private pulseCoral(node: Node) {
        const ui = node.getComponent(UITransform);
        const w = ui ? ui.width : 160;
        const h = ui ? ui.height : 160;
        const flash = new Node('FailFlash');
        flash.layer = UI_2D;
        flash.addComponent(UITransform).setContentSize(w, h);
        const g = flash.addComponent(Graphics);
        g.fillColor = new Color(224, 122, 95, 140);
        g.roundRect(-w / 2, -h / 2, w, h, 22);
        g.fill();
        const op = flash.addComponent(UIOpacity);
        op.opacity = 0;
        node.addChild(flash);
        tween(op)
            .to(0.1, { opacity: 220 })
            .to(0.1, { opacity: 40 })
            .to(0.1, { opacity: 220 })
            .to(0.1, { opacity: 0 })
            .call(() => {
                if (flash.isValid) flash.destroy();
            })
            .start();
    }

    private spawnFailCard(reason: FailReason) {
        const root = this.playRoot;
        const board = this.board;
        if (!root || !board) {
            this.busy = false;
            return;
        }
        const old = root.getChildByName('FailCard');
        if (old) old.destroy();

        const locked = reason === 'locked_out';
        const title = locked ? '这格锁错了' : '柜台堆满了';
        const desc = locked ? '看一段广告，退回到还能收的一步' : '看一段广告，本关多一格继玩';
        const cta = locked ? '退回可收的一步' : '多一格继玩';

        const card = new Node('FailCard');
        card.layer = UI_2D;
        card.setPosition(0, -40, 0);
        card.setScale(0.86, 0.86, 1);
        card.addComponent(UITransform).setContentSize(600, 460);
        const cg = card.addComponent(Graphics);
        cg.fillColor = CREAM;
        cg.roundRect(-300, -230, 600, 460, 36);
        cg.fill();
        cg.lineWidth = 3;
        cg.strokeColor = new Color(107, 74, 58, 50);
        cg.roundRect(-300, -230, 600, 460, 36);
        cg.stroke();
        const cardOp = card.addComponent(UIOpacity);
        cardOp.opacity = 0;
        root.addChild(card);

        this.addLabel(card, 'FailTitle', title, 40, WALNUT, 520, 52).setPosition(0, 168, 0);
        const body = this.addLabel(card, 'FailDesc', desc, 26, FRAME, 520, 72);
        body.setPosition(0, 108, 0);
        const bodyLb = body.getComponent(Label);
        if (bodyLb) {
            bodyLb.enableWrapText = true;
            bodyLb.overflow = Label.Overflow.CLAMP;
        }

        const main = new Node('FailCta');
        main.layer = UI_2D;
        main.setPosition(0, 18, 0);
        main.addComponent(UITransform).setContentSize(480, 88);
        const mg = main.addComponent(Graphics);
        mg.fillColor = CORAL;
        mg.roundRect(-240, -44, 480, 88, 44);
        mg.fill();
        this.addLabel(main, 'Txt', cta, 32, MILK, 440, 48);
        card.addChild(main);
        this.paintAdDot(main);
        const ad = main.getChildByName('AdDot');
        if (ad) ad.setPosition(210, 28, 0);
        this.bindHudPress(main, () => this.showToast('广告还没接上'));

        const share = new Node('FailShare');
        share.layer = UI_2D;
        share.setPosition(0, -86, 0);
        share.addComponent(UITransform).setContentSize(480, 80);
        const sg = share.addComponent(Graphics);
        sg.fillColor = MILK;
        sg.roundRect(-240, -40, 480, 80, 40);
        sg.fill();
        sg.lineWidth = 2;
        sg.strokeColor = new Color(107, 74, 58, 51);
        sg.roundRect(-240, -40, 480, 80, 40);
        sg.stroke();
        this.addLabel(share, 'Txt', '让好友也收这一层', 28, WALNUT, 440, 44);
        card.addChild(share);
        const levelId = board.level.id;
        this.bindHudPress(share, () => {
            this.showToast(`第 ${levelId} 关这层我收不进去了`);
            this.busy = false;
            this.startLevel(board.level);
        });

        const retry = this.addLabel(card, 'FailRetry', '重开本关', 26, new Color(107, 74, 58, 153), 280, 40);
        retry.setPosition(0, -168, 0);
        this.bindHudPress(retry, () => {
            this.busy = false;
            this.restartLevel();
        });

        tween(cardOp).to(0.2, { opacity: 255 }).start();
        tween(card)
            .to(0.32, { position: new Vec3(0, 0, 0), scale: new Vec3(1.04, 1.04, 1) }, { easing: easing.backOut })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private bounceNode(node: Node) {
        tween(node)
            .to(0.07, { scale: new Vec3(1.04, 0.96, 1) }, { easing: easing.quadOut })
            .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: easing.quadOut })
            .start();
    }

    /** 先亮成品冰箱，再压暗出卡：奶油结算卡升起，步数与按钮依次弹出。 */
    private playWinReward() {
        const root = this.playRoot;
        const board = this.board;
        if (!root || !board) {
            this.busy = false;
            return;
        }
        this.holdWin = true;
        playSfx('win_tg');
        const prevCleared = this.clearedId();
        const trayKinds = board.trays.map((tray) => tray.kind);
        const recorded = noteAlbumWin(
            sys.localStorage,
            prevCleared,
            board.level,
            board.steps,
            trayKinds,
            (id) => this.levelById(id),
        );
        this.markCleared(board.level.id);
        this.pulseSealedFridge(root);
        this.spawnPrideFlash(root);

        const size = this.canvasSize();
        const dim = this.addSprite(
            root,
            'WinDim',
            this.builtin,
            size.w,
            size.h,
            0,
            0,
            new Color(48, 48, 48, 255),
        );
        const dimOp = dim.addComponent(UIOpacity);
        dimOp.opacity = 0;
        tween(dimOp).to(0.4, { opacity: 178 }, { easing: easing.quadOut }).start();

        this.scheduleOnce(() => {
            this.spawnWinCard(root, board.steps, recorded.firstClear);
            this.busy = false;
        }, 0.08);
    }

    private pulseSealedFridge(root: Node) {
        const board = this.board;
        const pack = new Node('PrideGlow');
        pack.layer = UI_2D;
        pack.setPosition(0, this.trayAt(0).y, 0);
        pack.addComponent(UITransform).setContentSize(8, 8);
        const first = root.getChildByName('Tray0');
        root.insertChild(pack, first ? first.getSiblingIndex() : 0);

        const core = this.drawDisk(pack, 'Core', 56, CORAL);
        core.setScale(0.15, 0.15, 1);
        const coreOp = core.getComponent(UIOpacity)!;
        coreOp.opacity = 255;
        tween(core)
            .to(0.12, { scale: new Vec3(1.4, 1.4, 1) }, { easing: easing.quadOut })
            .to(0.2, { scale: new Vec3(0.4, 0.4, 1) }, { easing: easing.quadIn })
            .start();
        tween(coreOp).delay(0.1).to(0.22, { opacity: 0 }).start();

        const cream = this.drawDisk(pack, 'Hit', 70, MILK);
        cream.setScale(0.2, 0.2, 1);
        const creamOp = cream.getComponent(UIOpacity)!;
        creamOp.opacity = 230;
        tween(cream).to(0.28, { scale: new Vec3(2.2, 2.2, 1) }, { easing: easing.cubicOut }).start();
        tween(creamOp).to(0.28, { opacity: 0 }).start();

        const rings: { name: string; color: Color; width: number; delay: number; to: number }[] = [
            { name: 'R0', color: CORAL, width: 18, delay: 0, to: 3.6 },
            { name: 'R1', color: MILK, width: 12, delay: 0.07, to: 4.1 },
            { name: 'R2', color: WALNUT, width: 10, delay: 0.14, to: 4.6 },
        ];
        for (let i = 0; i < rings.length; i++) {
            const spec = rings[i];
            const ring = this.drawRing(pack, spec.name, 64, spec.width, spec.color);
            ring.setScale(0.18, 0.18, 1);
            const op = ring.getComponent(UIOpacity)!;
            op.opacity = 0;
            tween(op).delay(spec.delay).to(0.06, { opacity: 255 }).to(0.42, { opacity: 0 }).start();
            tween(ring)
                .delay(spec.delay)
                .to(0.48, { scale: new Vec3(spec.to, spec.to, 1) }, { easing: easing.cubicOut })
                .start();
        }

        if (board) {
            for (let i = 0; i < board.trays.length; i++) {
                if (!board.trays[i].sealed) continue;
                const tray = root.getChildByName(`Tray${i}`);
                if (tray) this.bounceNode(tray);
            }
        }

        this.scheduleOnce(() => {
            if (pack.isValid) pack.destroy();
        }, 0.72);
    }

    private drawDisk(parent: Node, name: string, r: number, color: Color): Node {
        const n = new Node(name);
        n.layer = UI_2D;
        n.addComponent(UITransform).setContentSize(r * 2, r * 2);
        const g = n.addComponent(Graphics);
        g.fillColor = color;
        g.circle(0, 0, r);
        g.fill();
        n.addComponent(UIOpacity);
        parent.addChild(n);
        return n;
    }

    private drawRing(parent: Node, name: string, r: number, width: number, color: Color): Node {
        const n = new Node(name);
        n.layer = UI_2D;
        n.addComponent(UITransform).setContentSize((r + width) * 2, (r + width) * 2);
        const g = n.addComponent(Graphics);
        g.lineWidth = width;
        g.strokeColor = color;
        g.circle(0, 0, r);
        g.stroke();
        n.addComponent(UIOpacity);
        parent.addChild(n);
        return n;
    }

    private spawnPrideFlash(root: Node) {
        const coral = this.addSprite(root, 'PrideFlashCoral', this.builtin, DESIGN_W, DESIGN_H, 0, 0, CORAL);
        const coralOp = coral.addComponent(UIOpacity);
        coralOp.opacity = 0;
        tween(coralOp)
            .to(0.06, { opacity: 70 })
            .to(0.16, { opacity: 0 }, { easing: easing.quadOut })
            .call(() => {
                if (coral.isValid) coral.destroy();
            })
            .start();
        const flash = this.addSprite(root, 'PrideFlash', this.builtin, DESIGN_W, DESIGN_H, 0, 0, MILK);
        const op = flash.addComponent(UIOpacity);
        op.opacity = 0;
        tween(op)
            .delay(0.08)
            .to(0.08, { opacity: 140 })
            .to(0.22, { opacity: 0 }, { easing: easing.quadOut })
            .call(() => {
                if (flash.isValid) flash.destroy();
            })
            .start();
    }

    private spawnWinCard(root: Node, steps: number, showBadge: boolean) {
        const size = this.canvasSize();
        const wrap = new Node('WinPack');
        wrap.layer = UI_2D;
        wrap.setPosition(0, 0, 0);
        wrap.addComponent(UITransform).setContentSize(size.w, size.h);
        root.addChild(wrap);

        // 标题图在蒙版之上、卡片之外；按原图像素等比，避免压扁
        if (this.winPerfect) {
            const stamp = this.addWinPerfectStamp(wrap, 0, 470, 560);
            stamp.setScale(stamp.scale.x * 0.7, stamp.scale.y * 0.7, 1);
            const stampOp = stamp.addComponent(UIOpacity);
            stampOp.opacity = 0;
            const s = stamp.scale.x / 0.7;
            tween(stampOp).to(0.24, { opacity: 255 }).start();
            tween(stamp)
                .to(0.36, { scale: new Vec3(s * 1.04, s * 1.04, 1) }, { easing: easing.backOut })
                .to(0.1, { scale: new Vec3(s, s, 1) })
                .start();
        } else {
            const fallback = this.addLabel(wrap, 'WinStamp', '完美收纳！', 48, new Color(248, 240, 220, 255), 520, 58);
            fallback.setPosition(0, 470, 0);
        }

        const cardW = 560;
        const cardH = 760;
        const card = new Node('WinCard');
        card.layer = UI_2D;
        card.setPosition(0, -48, 0);
        card.setScale(0.82, 0.82, 1);
        card.addComponent(UITransform).setContentSize(cardW, cardH);
        const cg = card.addComponent(Graphics);
        cg.fillColor = new Color(61, 50, 41, 36);
        cg.roundRect(-cardW / 2 + 8, -cardH / 2 - 12, cardW, cardH, 40);
        cg.fill();
        cg.fillColor = new Color(255, 249, 239, 255);
        cg.roundRect(-cardW / 2, -cardH / 2, cardW, cardH, 40);
        cg.fill();
        const cardOp = card.addComponent(UIOpacity);
        cardOp.opacity = 0;
        wrap.addChild(card);

        // 沿用旧奖杯冰箱，略缩小
        const trophy = this.makeTrophyFridge();
        trophy.setPosition(0, 232, 0);
        trophy.setScale(0.12, 0.12, 1);
        card.addChild(trophy);

        const status = this.addLabel(card, 'WinStatus', '今晚冰箱收好了', 30, WALNUT, 480, 40);
        status.setPosition(0, 78, 0);
        status.setScale(0, 0, 1);

        const stepsNode = new Node('WinSteps');
        stepsNode.layer = UI_2D;
        stepsNode.setPosition(0, -20, 0);
        stepsNode.setScale(0, 0, 1);
        stepsNode.addComponent(UITransform).setContentSize(500, 120);
        card.addChild(stepsNode);
        const stepSize = 108;
        const unitSize = Math.round(stepSize * 0.5);
        const digits = String(steps).length;
        const numW = Math.max(unitSize, digits * Math.round(stepSize * 0.62));
        const unitW = unitSize + 8;
        const gap = 6;
        const totalW = numW + gap + unitW;
        const stepNum = this.addLabel(stepsNode, 'Num', `${steps}`, stepSize, CORAL, numW + 20, 120);
        const stepUnit = this.addLabel(stepsNode, 'Unit', '步', unitSize, CORAL, unitW, 64);
        stepNum.setPosition(-totalW / 2 + numW / 2, 0, 0);
        stepUnit.setPosition(totalW / 2 - unitW / 2, -Math.round(stepSize * 0.16), 0);
        const winLevel = this.board ? this.board.level : null;
        if (winLevel) {
            const line = this.addLabel(card, 'WinLine', winStepLine(winLevel, steps), 22, SAGE, 480, 32);
            line.setPosition(0, -108, 0);
            line.setScale(0, 0, 1);
            this.scheduleOnce(() => {
                tween(line).to(0.22, { scale: new Vec3(1, 1, 1) }, { easing: easing.backOut }).start();
            }, 0.56);
        }
        this.drawSpark(card, -132, 12, 10, WHEAT);
        this.drawSpark(card, 142, -40, 9, WHEAT);
        this.drawSpark(card, 118, 18, 7, new Color(255, 210, 140, 255));

        const levelId = this.board ? this.board.level.id : 0;
        const emphasizeShare = levelId === 25 || levelId === 30;
        const nextY = emphasizeShare ? -268 : -168;
        const shareY = emphasizeShare ? -168 : -268;
        const lastId = PLAYABLE[PLAYABLE.length - 1].id;
        const nextLabel = levelId === lastId ? '回主页' : '下一关  >';
        const nextBtn = this.makeWinPrimaryBtn(card, 'BtnNext', nextLabel, 0, nextY);
        nextBtn.setScale(0, 0, 1);
        const shareBtn = this.makeWinSecondaryBtn(card, 'BtnShareSteps', '分享步数', 0, shareY);
        shareBtn.setScale(0, 0, 1);
        if (emphasizeShare) {
            const shareHint = this.addLabel(card, 'ShareHint', '晒出你的步数', 22, CORAL, 360, 36);
            shareHint.setPosition(0, -148, 0);
            shareHint.setScale(0, 0, 1);
            this.scheduleOnce(() => {
                tween(shareHint)
                    .to(0.28, { scale: new Vec3(1.08, 1.08, 1) }, { easing: easing.backOut })
                    .to(0.1, { scale: new Vec3(1, 1, 1) })
                    .start();
            }, 0.7);
        }

        let badge: Node | null = null;
        if (showBadge) {
            badge = this.makeWinAlbumBadge();
            badge.setPosition(0, -350, 0);
            badge.setScale(0, 0, 1);
            card.addChild(badge);
        }

        tween(cardOp).to(0.22, { opacity: 255 }).start();
        tween(card)
            .to(0.4, { position: new Vec3(0, -28, 0), scale: new Vec3(1.03, 1.03, 1) }, { easing: easing.backOut })
            .to(0.12, { scale: new Vec3(1, 1, 1) })
            .start();

        this.scheduleOnce(() => {
            tween(trophy)
                .to(0.32, { scale: new Vec3(0.78, 0.78, 1) }, { easing: easing.backOut })
                .to(0.1, { scale: new Vec3(0.7, 0.7, 1) })
                .start();
        }, 0.16);
        this.scheduleOnce(() => {
            tween(status).to(0.22, { scale: new Vec3(1, 1, 1) }, { easing: easing.backOut }).start();
        }, 0.34);
        this.scheduleOnce(() => {
            tween(stepsNode)
                .to(0.3, { scale: new Vec3(1.12, 1.12, 1) }, { easing: easing.backOut })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
        }, 0.48);
        this.scheduleOnce(() => {
            const first = emphasizeShare ? shareBtn : nextBtn;
            tween(first)
                .to(0.28, { scale: new Vec3(1.06, 1.06, 1) }, { easing: easing.backOut })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
            if (emphasizeShare) {
                this.scheduleOnce(() => {
                    tween(shareBtn)
                        .to(0.35, { scale: new Vec3(1.08, 1.08, 1) })
                        .to(0.35, { scale: new Vec3(1, 1, 1) })
                        .union()
                        .repeat(4)
                        .start();
                }, 0.5);
            }
        }, 0.66);
        this.scheduleOnce(() => {
            const second = emphasizeShare ? nextBtn : shareBtn;
            tween(second)
                .to(0.26, { scale: new Vec3(1.04, 1.04, 1) }, { easing: easing.backOut })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
        }, 0.78);
        this.scheduleOnce(() => {
            if (!badge) return;
            tween(badge)
                .to(0.28, { scale: new Vec3(1.08, 1.08, 1) }, { easing: easing.backOut })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
        }, 0.92);

        const fromId = this.board ? this.board.level.id : 1;
        this.bindHudPress(nextBtn, () => {
            if (fromId >= PLAYABLE[PLAYABLE.length - 1].id) {
                this.goHome();
                return;
            }
            const next = this.nextPlayable(fromId);
            if (!next) {
                this.showToast('下一关还没收拾');
                return;
            }
            this.startLevel(next);
        });
        this.bindHudPress(shareBtn, () => {
            this.showSharePreview(`我把今晚的冰箱收好了，用了 ${steps} 步`);
        });
    }

    private drawSpark(parent: Node, x: number, y: number, r: number, color: Color) {
        const n = new Node('Spark');
        n.layer = UI_2D;
        n.setPosition(x, y, 0);
        n.addComponent(UITransform).setContentSize(r * 2, r * 2);
        const g = n.addComponent(Graphics);
        g.fillColor = color;
        g.moveTo(0, r);
        g.lineTo(r * 0.22, r * 0.22);
        g.lineTo(r, 0);
        g.lineTo(r * 0.22, -r * 0.22);
        g.lineTo(0, -r);
        g.lineTo(-r * 0.22, -r * 0.22);
        g.lineTo(-r, 0);
        g.lineTo(-r * 0.22, r * 0.22);
        g.close();
        g.fill();
        parent.addChild(n);
    }

    private makeWinPrimaryBtn(parent: Node, name: string, text: string, x: number, y: number): Node {
        const btn = new Node(name);
        btn.layer = UI_2D;
        btn.setPosition(x, y, 0);
        btn.addComponent(UITransform).setContentSize(420, 88);
        const g = btn.addComponent(Graphics);
        g.fillColor = CORAL;
        g.roundRect(-210, -44, 420, 88, 44);
        g.fill();
        this.addLabel(btn, 'Label', text, 34, MILK, 380, 48);
        parent.addChild(btn);
        return btn;
    }

    private makeWinSecondaryBtn(parent: Node, name: string, text: string, x: number, y: number): Node {
        const btn = new Node(name);
        btn.layer = UI_2D;
        btn.setPosition(x, y, 0);
        btn.addComponent(UITransform).setContentSize(420, 80);
        const g = btn.addComponent(Graphics);
        g.fillColor = MILK;
        g.roundRect(-210, -40, 420, 80, 40);
        g.fill();
        g.lineWidth = 3;
        g.strokeColor = new Color(107, 74, 58, 90);
        g.roundRect(-210, -40, 420, 80, 40);
        g.stroke();
        const shareIcon = new Node('ShareIcon');
        shareIcon.layer = UI_2D;
        shareIcon.setPosition(-78, 0, 0);
        shareIcon.addComponent(UITransform).setContentSize(28, 28);
        const ig = shareIcon.addComponent(Graphics);
        ig.fillColor = WALNUT;
        ig.circle(-6, 8, 4);
        ig.fill();
        ig.circle(8, 0, 4);
        ig.fill();
        ig.circle(-6, -8, 4);
        ig.fill();
        ig.lineWidth = 3;
        ig.strokeColor = WALNUT;
        ig.moveTo(-6, 8);
        ig.lineTo(8, 0);
        ig.moveTo(-6, -8);
        ig.lineTo(8, 0);
        ig.stroke();
        btn.addChild(shareIcon);
        this.addLabel(btn, 'Label', text, 30, WALNUT, 280, 44).setPosition(18, 0, 0);
        parent.addChild(btn);
        return btn;
    }

    private makeWinAlbumBadge(): Node {
        const chip = new Node('AlbumChip');
        chip.layer = UI_2D;
        chip.addComponent(UITransform).setContentSize(220, 56);
        if (this.albumBadge) {
            this.addSprite(chip, 'Art', this.albumBadge, 220, 56, 0, 0, Color.WHITE);
            return chip;
        }
        const chg = chip.addComponent(Graphics);
        chg.fillColor = new Color(255, 252, 246, 255);
        chg.roundRect(-110, -28, 220, 56, 14);
        chg.fill();
        chg.fillColor = new Color(176, 130, 96, 170);
        const dash = 7;
        const gap = 5;
        for (let x = -96; x < 96; x += dash + gap) {
            chg.rect(x, 24, dash, 2);
            chg.rect(x, -26, dash, 2);
            chg.fill();
        }
        for (let y = -16; y < 16; y += dash + gap) {
            chg.rect(-108, y, 2, dash);
            chg.rect(106, y, 2, dash);
            chg.fill();
        }

        const leaf = new Node('Leaf');
        leaf.layer = UI_2D;
        leaf.setPosition(-72, 0, 0);
        leaf.addComponent(UITransform).setContentSize(28, 28);
        const lg = leaf.addComponent(Graphics);
        lg.fillColor = FRAME;
        lg.ellipse(0, 0, 10, 14);
        lg.fill();
        lg.strokeColor = WALNUT;
        lg.lineWidth = 2;
        lg.moveTo(0, -12);
        lg.lineTo(0, 10);
        lg.stroke();
        chip.addChild(leaf);

        this.addLabel(chip, 'ChipText', '图鉴 +1', 26, WALNUT, 120, 36).setPosition(4, 0, 0);

        const plus = new Node('Plus');
        plus.layer = UI_2D;
        plus.setPosition(78, 0, 0);
        plus.addComponent(UITransform).setContentSize(28, 28);
        const pg = plus.addComponent(Graphics);
        pg.fillColor = CORAL;
        pg.circle(0, 0, 12);
        pg.fill();
        pg.strokeColor = MILK;
        pg.lineWidth = 3;
        pg.moveTo(-6, 0);
        pg.lineTo(6, 0);
        pg.moveTo(0, -6);
        pg.lineTo(0, 6);
        pg.stroke();
        chip.addChild(plus);
        return chip;
    }

    private makeTrophyFridge(): Node {
        const n = new Node('Trophy');
        n.layer = UI_2D;
        n.addComponent(UITransform).setContentSize(148, 210);
        const g = n.addComponent(Graphics);
        g.fillColor = WALNUT;
        g.roundRect(-74, -105, 148, 210, 24);
        g.fill();
        g.fillColor = FRAME;
        g.roundRect(-62, -93, 124, 186, 18);
        g.fill();
        g.fillColor = DOOR;
        g.roundRect(-52, -82, 104, 166, 14);
        g.fill();
        g.fillColor = HANDLE;
        g.roundRect(26, -22, 14, 52, 6);
        g.fill();
        g.fillColor = CORAL;
        g.circle(0, 78, 20);
        g.fill();
        g.strokeColor = MILK;
        g.lineWidth = 4;
        g.moveTo(-8, 78);
        g.lineTo(-2, 70);
        g.lineTo(10, 86);
        g.stroke();
        return n;
    }

    private ensureWinFx(root: Node): Node {
        let fx = root.getChildByName('WinFx');
        if (!fx || !fx.isValid) {
            fx = new Node('WinFx');
            fx.layer = UI_2D;
            fx.setPosition(0, 56, 0);
            fx.addComponent(UITransform).setContentSize(2, 2);
            root.addChild(fx);
        }
        return fx;
    }

    private raiseWinFx(root: Node) {
        const fx = root.getChildByName('WinFx');
        if (fx && fx.isValid) fx.setSiblingIndex(root.children.length - 1);
    }

    private spawnFallingRibbons(root: Node) {
        const layer = this.ensureWinFx(root);
        const colors = [CORAL, FRAME, WHEAT, FRIDGE_GLOW, MILK, WALNUT];
        for (let i = 0; i < 26; i++) {
            const a = (i / 26) * Math.PI * 2 + 0.08;
            const start = 70 + (i % 5) * 18;
            const dist = 280 + (i % 5) * 52;
            const piece = new Node(`Ribbon${i}`);
            piece.layer = UI_2D;
            piece.setPosition(Math.cos(a) * start, Math.sin(a) * start * 0.9, 0);
            piece.setScale(0.35, 0.35, 1);
            piece.angle = (a * 180) / Math.PI + 90;
            piece.addComponent(UITransform).setContentSize(16, 96);
            const g = piece.addComponent(Graphics);
            g.fillColor = colors[i % colors.length];
            g.roundRect(-8, -48, 16, 96, 7);
            g.fill();
            const op = piece.addComponent(UIOpacity);
            op.opacity = 240;
            layer.addChild(piece);
            const tx = Math.cos(a) * dist;
            const ty = Math.sin(a) * dist;
            tween(piece)
                .delay((i % 7) * 0.03)
                .to(0.42, {
                    position: new Vec3(tx, ty, 0),
                    scale: new Vec3(1, 1, 1),
                }, { easing: easing.cubicOut })
                .to(1.05, {
                    position: new Vec3(tx * 1.28, ty - 140, 0),
                    angle: piece.angle + (i % 2 === 0 ? 70 : -75),
                }, { easing: easing.quadIn })
                .start();
            tween(op).delay(0.95).to(0.45, { opacity: 0 }).start();
        }
    }

    private spawnStarBurst(fx: Node) {
        const starColors = [CORAL, WHEAT, MILK, FRAME];
        for (let i = 0; i < 12; i++) {
            const a = (i / 12) * Math.PI * 2 + 0.15;
            const dist = 150 + (i % 4) * 48;
            const r = 14 + (i % 3) * 6;
            const star = new Node(`Star${i}`);
            star.layer = UI_2D;
            star.setScale(0, 0, 1);
            star.addComponent(UITransform).setContentSize(r * 2, r * 2);
            const g = star.addComponent(Graphics);
            g.fillColor = starColors[i % starColors.length];
            this.drawStar(g, r);
            const op = star.addComponent(UIOpacity);
            fx.addChild(star);
            const tx = Math.cos(a) * dist;
            const ty = Math.sin(a) * dist;
            tween(star)
                .delay(0.03 * i)
                .to(0.28, { position: new Vec3(tx, ty, 0), scale: new Vec3(1.2, 1.2, 1) }, { easing: easing.backOut })
                .to(0.12, { scale: new Vec3(1, 1, 1) })
                .to(0.6, { position: new Vec3(tx * 1.15, ty - 36, 0) }, { easing: easing.quadIn })
                .start();
            tween(op).delay(0.75).to(0.35, { opacity: 0 }).start();
        }
        this.scheduleOnce(() => {
            const root = this.playRoot;
            if (root) this.raiseWinFx(root);
        }, 0.05);
    }

    private drawStar(g: Graphics, r: number) {
        const inner = r * 0.42;
        for (let i = 0; i < 10; i++) {
            const rad = i % 2 === 0 ? r : inner;
            const a = -Math.PI / 2 + (i * Math.PI) / 5;
            const x = Math.cos(a) * rad;
            const y = Math.sin(a) * rad;
            if (i === 0) g.moveTo(x, y);
            else g.lineTo(x, y);
        }
        g.close();
        g.fill();
    }

    private showPlaceFail(result: PlaceFail) {
        const id = this.board ? this.board.level.id : 0;
        const teachSwitch = result.reason === 'wrong_kind' && (id === 4 || id === 7) && this.firstKindToast;
        const sizeFail = this.mixedCaps() && result.reason === 'dest_full';
        if (!sizeFail) this.showToast(this.toastFor(result));
        this.flashTrays(result.hintTrays);
        this.flashBuffers(result.hintBuffers);
        if (teachSwitch) {
            this.holdHintTrays = result.hintTrays.slice();
            this.attachSwitchGuides();
        }
        if ((id === 10 || id === 14) && result.hintBuffers.length > 0 && (result.reason === 'wrong_kind' || result.reason === 'need_buffer')) {
            this.holdHintBuffers = result.hintBuffers.slice();
            this.attachBufferGuides();
        }
    }

    private attachBufferGuides() {
        const root = this.playRoot;
        const wrap = root ? root.getChildByName('BufferBoard') : null;
        if (!wrap) return;
        for (let n = 0; n < this.holdHintBuffers.length; n++) {
            const i = this.holdHintBuffers[n];
            const slot = wrap.getChildByName(`Buffer${i}`);
            if (!slot) continue;
            this.drawSageDashedRing(slot, BUF_SLOT_W, BUF_SLOT_H, 28, 'HintRing');
            this.raiseBufferHitPad(slot);
        }
    }

    private attachSwitchGuides() {
        const root = this.playRoot;
        const board = this.board;
        if (!root || !board) return;
        for (let n = 0; n < this.holdHintTrays.length; n++) {
            const i = this.holdHintTrays[n];
            const tray = root.getChildByName(`Tray${i}`);
            if (!tray) continue;
            this.drawSwitchGuide(tray, this.trayAt(i));
        }
        this.raiseSwitchHands(root);
    }

    /** 手指挂在格子上会被后画的呼吸框盖住，画完后提到根节点最上层。 */
    private raiseSwitchHands(root: Node) {
        const hands: Node[] = [];
        for (let i = 0; i < root.children.length; i++) {
            const child = root.children[i];
            if (child.name === 'SwitchHand') hands.push(child);
            const nested = child.getChildByName('SwitchHand');
            if (nested) hands.push(nested);
        }
        const ui = root.getComponent(UITransform);
        for (let i = 0; i < hands.length; i++) {
            const hand = hands[i];
            if (ui && hand.parent !== root) {
                const local = ui.convertToNodeSpaceAR(hand.worldPosition);
                hand.setParent(root);
                hand.setPosition(local);
            }
            hand.setSiblingIndex(root.children.length - 1);
        }
    }

    private bulkAntiSplitToast(item: FoodId): string {
        return `${FOOD_NAMES[item]}那格还没收满，不能新开一格`;
    }

    private toastFor(result: PlaceFail): string {
        if (result.reason === 'need_buffer') {
            return '冰箱放不下，先放到柜台';
        }
        if (result.reason === 'wrong_kind') {
            const id = this.board ? this.board.level.id : 0;
            if ((id === 4 || id === 7) && this.firstKindToast) {
                this.firstKindToast = false;
                return '换一格';
            }
            if (id === 10 && this.firstKindToast) {
                this.firstKindToast = false;
                return '可以点下面的空盘放下';
            }
            if (id === 11 && this.firstKindToast) {
                this.firstKindToast = false;
                return '去点空格，或已经在收这种的那一格';
            }
            if (id === 14 && this.firstKindToast) {
                this.firstKindToast = false;
                return '可以先放到柜台，少换几次格';
            }
            const dest = this.board && this.board.dest;
            const kind = dest && dest.kind === 'tray' ? this.board!.trays[dest.index].kind : null;
            const name = FOOD_NAMES[kind || result.item];
            return `这格只收${name}`;
        }
        if (result.reason === 'anti_split') {
            return `${FOOD_NAMES[result.item]}那格还没收满，不能新开一格`;
        }
        return TOAST[result.reason];
    }

    private flashTrays(indexes: number[]) {
        const root = this.playRoot;
        const board = this.board;
        if (!root || !board) return;
        for (let n = 0; n < indexes.length; n++) {
            const i = indexes[n];
            const tray = root.getChildByName(`Tray${i}`);
            if (!tray) continue;
            const m = this.trayAt(i);
            const flash = new Node('HintFlash');
            flash.layer = UI_2D;
            flash.addComponent(UITransform).setContentSize(m.outerW, m.outerH);
            const g = flash.addComponent(Graphics);
            g.strokeColor = SAGE;
            g.lineWidth = 8;
            g.roundRect(-m.outerW / 2 + 4, -m.outerH / 2 + 4, m.outerW - 8, m.outerH - 8, 24);
            g.stroke();
            const op = flash.addComponent(UIOpacity);
            op.opacity = 0;
            tray.addChild(flash);
            tween(op)
                .to(0.1, { opacity: 255 })
                .to(0.16, { opacity: 80 })
                .to(0.14, { opacity: 255 })
                .to(0.2, { opacity: 0 })
                .call(() => {
                    if (flash.isValid) flash.destroy();
                })
                .start();
        }
    }

    private flashBuffers(indexes: number[]) {
        const root = this.playRoot;
        const wrap = root ? root.getChildByName('BufferBoard') : null;
        if (!wrap) return;
        for (let n = 0; n < indexes.length; n++) {
            const slot = wrap.getChildByName(`Buffer${indexes[n]}`);
            if (!slot) continue;
            const flash = new Node('HintFlash');
            flash.layer = UI_2D;
            flash.addComponent(UITransform).setContentSize(BUF_SLOT_W, BUF_SLOT_H);
            const g = flash.addComponent(Graphics);
            g.strokeColor = SAGE;
            g.lineWidth = 8;
            g.roundRect(-BUF_SLOT_W / 2 + 4, -BUF_SLOT_H / 2 + 4, BUF_SLOT_W - 8, BUF_SLOT_H - 8, 28);
            g.stroke();
            const op = flash.addComponent(UIOpacity);
            op.opacity = 0;
            slot.addChild(flash);
            this.raiseBufferHitPad(slot);
            tween(op)
                .to(0.1, { opacity: 255 })
                .to(0.16, { opacity: 80 })
                .to(0.14, { opacity: 255 })
                .to(0.2, { opacity: 0 })
                .call(() => {
                    if (flash.isValid) flash.destroy();
                    if (slot.isValid) this.raiseBufferHitPad(slot);
                })
                .start();
        }
    }

    private shakeBagTop(col: number) {
        const root = this.playRoot;
        const board = this.board;
        if (!root || !board) return;
        const bag = root.getChildByName(`Bag${col}`);
        const top = bag && bag.getChildByName(`T${board.bags[col].length - 1}`);
        if (!top) return;
        const y = top.position.y;
        tween(top)
            .to(0.04, { position: new Vec3(14, y, 0) })
            .to(0.04, { position: new Vec3(-14, y, 0) })
            .to(0.04, { position: new Vec3(0, y, 0) })
            .start();
    }

    private showToast(text: string) {
        if (!this.playRoot) return;
        const old = this.playRoot.getChildByName('Toast');
        if (old) old.destroy();
        const n = this.addLabel(this.playRoot, 'Toast', text, 24, WALNUT, 640, 48);
        n.setPosition(0, -40, 0);
        this.scheduleOnce(() => {
            if (n.isValid) n.destroy();
        }, 1.2);
    }

    /** 完美收纳标题：按贴图原比例等比缩放，不写死宽高以免压瘪。 */
    private addWinPerfectStamp(parent: Node, x: number, y: number, targetW: number): Node {
        const frame = this.winPerfect || this.builtin;
        const node = new Node('WinStamp');
        node.layer = UI_2D;
        node.setPosition(x, y, 0);
        const ui = node.addComponent(UITransform);
        const sp = node.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.RAW;
        sp.color = Color.WHITE;
        if (frame) sp.spriteFrame = frame;
        parent.addChild(node);
        const srcW = frame && frame.originalSize ? frame.originalSize.width : 412;
        const scale = targetW / Math.max(srcW, 1);
        node.setScale(scale, scale, 1);
        // RAW 后 contentSize 跟贴图走；显式再同步一次，避免首帧为空
        if (frame) {
            const ow = frame.originalSize.width;
            const oh = frame.originalSize.height;
            ui.setContentSize(ow, oh);
        }
        return node;
    }

    private addSprite(
        parent: Node,
        name: string,
        frame: SpriteFrame | null | undefined,
        w: number,
        h: number,
        x: number,
        y: number,
        color: Color,
    ): Node {
        const node = new Node(name);
        node.layer = UI_2D;
        node.setPosition(x, y, 0);
        const ui = node.addComponent(UITransform);
        ui.setContentSize(w, h);
        const sp = node.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.color = color;
        const sf = frame || this.builtin;
        if (sf) sp.spriteFrame = sf;
        parent.addChild(node);
        return node;
    }

    private ensureSpriteBg(
        parent: Node,
        bgName: string,
        w: number,
        h: number,
        frame: SpriteFrame | null | undefined,
        z = -1,
    ): Node | null {
        let bg = parent.getChildByName(bgName);
        if (!frame) {
            if (bg) bg.destroy();
            return null;
        }
        if (!bg) {
            bg = new Node(bgName);
            bg.layer = UI_2D;
            parent.addChild(bg);
        }
        // UI 背景图不再依赖负 z，直接固定为最底层 sibling，避免 Sprite 在某些预览路径里被吞。
        bg.setPosition(0, 0, 0);
        bg.addComponent(UITransform).setContentSize(w, h);
        const oldGraphics = bg.getComponent(Graphics);
        if (oldGraphics) oldGraphics.destroy();
        const sp = bg.getComponent(Sprite) ?? bg.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM;
        sp.type = Sprite.Type.SIMPLE;
        sp.color = Color.WHITE;
        sp.spriteFrame = frame;
        bg.setSiblingIndex(0);
        return bg;
    }

    private ensureBulkPillSkin(
        parent: Node,
        bgName: string,
        w: number,
        h: number,
        radius: number,
        tint: Color,
        fillFallback: Color,
        strokeFallback: Color | null,
        lineWidth = 2,
    ): void {
        this.ensureRoundedBg(parent, bgName, w, h, radius, fillFallback, strokeFallback, lineWidth);
    }

    private ensureBulkActionButtonSkin(
        parent: Node,
        w: number,
        h: number,
        tint: Color,
        fillFallback: Color,
    ): void {
        const art = this.ensureSpriteBg(parent, 'BgArt', w, h, this.btnStart, -2);
        const artSprite = art?.getComponent(Sprite) || null;
        if (artSprite) {
            artSprite.color = tint;
            const oldBg = parent.getChildByName('Bg');
            if (oldBg) oldBg.destroy();
            return;
        }
        this.ensureRoundedBg(parent, 'Bg', w, h, 24, fillFallback);
    }

    private ensureRaisedPlate(
        parent: Node,
        bgName: string,
        w: number,
        h: number,
        radius: number,
        fillColor: Color,
        strokeColor: Color,
        shadowColor: Color,
        shadowOffsetY: number,
    ): void {
        const shadow = this.ensureRoundedBg(parent, `${bgName}Shadow`, w, h, radius, shadowColor, null, 0, -3);
        shadow.setPosition(0, shadowOffsetY, -3);
        this.ensureRoundedBg(parent, bgName, w, h, radius, fillColor, strokeColor, 3, -2);
    }

    /**
     * 资源接入准备：把灰盒底板拆成独立 Bg 子节点，后面替 sprite / 9-slice 时不必改业务节点结构。
     */
    private ensureRoundedBg(
        parent: Node,
        bgName: string,
        w: number,
        h: number,
        radius: number,
        fillColor: Color,
        strokeColor: Color | null = null,
        lineWidth = 3,
        z = -1,
    ): Node {
        let bg = parent.getChildByName(bgName);
        if (!bg) {
            bg = new Node(bgName);
            bg.layer = UI_2D;
            parent.addChild(bg);
        }
        bg.setPosition(0, 0, z);
        bg.addComponent(UITransform).setContentSize(w, h);
        const g = bg.getComponent(Graphics) ?? bg.addComponent(Graphics);
        g.clear();
        g.fillColor = fillColor;
        g.roundRect(-w / 2, -h / 2, w, h, radius);
        g.fill();
        if (strokeColor) {
            g.lineWidth = lineWidth;
            g.strokeColor = strokeColor;
            g.roundRect(-w / 2, -h / 2, w, h, radius);
            g.stroke();
        }
        return bg;
    }

    private tuneLabel(node: Node, bold = false): void {
        const lb = node.getComponent(Label);
        if (!lb) return;
        lb.fontFamily = 'Microsoft YaHei';
        lb.isBold = bold;
        lb.overflow = Label.Overflow.SHRINK;
    }

    private addLabel(
        parent: Node,
        name: string,
        text: string,
        size: number,
        color: Color,
        w: number,
        h: number,
    ): Node {
        const node = new Node(name);
        node.layer = UI_2D;
        node.addComponent(UITransform).setContentSize(w, h);
        const lb = node.addComponent(Label);
        lb.string = text;
        lb.fontSize = size;
        lb.lineHeight = Math.round(size * 1.3);
        lb.color = color;
        lb.horizontalAlign = Label.HorizontalAlign.CENTER;
        lb.verticalAlign = Label.VerticalAlign.CENTER;
        lb.overflow = Label.Overflow.NONE;
        lb.enableWrapText = false;
        lb.useSystemFont = true;
        lb.fontFamily = 'Arial';
        parent.addChild(node);
        return node;
    }
}

interface WechatMiniGame {
    getWindowInfo?: () => WechatWindowInfo;
    getSystemInfoSync?: () => WechatWindowInfo;
    getMenuButtonBoundingClientRect?: () => { bottom: number };
}

interface WechatWindowInfo {
    windowWidth?: number;
    screenWidth?: number;
    statusBarHeight?: number;
    safeArea?: { top: number };
}

let uiBundle: Promise<boolean> | null = null;
let uiBundleLogged = false;

function ensureUiBundle(): Promise<boolean> {
    if (assetManager.getBundle('ui')) return Promise.resolve(true);
    if (uiBundle) return uiBundle;
    uiBundle = new Promise((resolve) => {
        assetManager.loadBundle('ui', (err) => {
            if (err) {
                uiBundle = null;
                if (!uiBundleLogged) {
                    uiBundleLogged = true;
                    console.error('[fridge] 界面图包没进微信构建，请重新构建');
                }
                resolve(false);
                return;
            }
            resolve(true);
        });
    });
    return uiBundle;
}

function loadFrame(uuid: string): Promise<SpriteFrame | null> {
    return ensureUiBundle().then((ready) => {
        if (!ready) return null;
        return new Promise<SpriteFrame | null>((resolve) => {
        assetManager.loadAny({ uuid }, (err, asset) => {
            if (err || !asset) {
                resolve(null);
                return;
            }
            if (asset instanceof SpriteFrame) {
                resolve(asset);
                return;
            }
            if (asset instanceof Texture2D) {
                const frame = new SpriteFrame();
                frame.texture = asset;
                resolve(frame);
                return;
            }
            const maybeTexture = (asset as { texture?: Texture2D | null }).texture;
            if (maybeTexture instanceof Texture2D) {
                const frame = new SpriteFrame();
                frame.texture = maybeTexture;
                resolve(frame);
                return;
            }
            resolve(null);
        });
        });
    });
}

/**
 * 对局视图：把点击译成 selectTray / placeFromBag。不写规则。
 * 第 1 关：竖槽 + 牛奶托盘列。飞入 220ms，封格关门 280ms，胜利再延迟。
 */
import {
    _decorator,
    assetManager,
    Button,
    Color,
    Component,
    Graphics,
    Label,
    Layers,
    Node,
    Sprite,
    SpriteFrame,
    UIOpacity,
    UITransform,
    Vec3,
    easing,
    sys,
    tween,
    view,
} from 'cc';
import { BoardState } from './game/BoardState';
import { LEVEL_01, selfCheckLevel01 } from './game/level_01';
import { LEVEL_02, selfCheckLevel02 } from './game/level_02';
import { LEVEL_03, selfCheckLevel03 } from './game/level_03';
import { LEVEL_04, selfCheckLevel04 } from './game/level_04';
import { LEVEL_05, selfCheckLevel05 } from './game/level_05';
import { LEVEL_06, selfCheckLevel06 } from './game/level_06';
import { LEVEL_07, selfCheckLevel07 } from './game/level_07';
import { LEVEL_08, selfCheckLevel08 } from './game/level_08';
import { LEVEL_09, selfCheckLevel09 } from './game/level_09';
import { LEVEL_10, selfCheckLevel10 } from './game/level_10';
import { LEVEL_11, selfCheckLevel11 } from './game/level_11';
import { LEVEL_12, selfCheckLevel12 } from './game/level_12';
import { LEVEL_13, selfCheckLevel13 } from './game/level_13';
import { LEVEL_14, selfCheckLevel14 } from './game/level_14';
import { LEVEL_15, selfCheckLevel15 } from './game/level_15';
import { LEVEL_16, selfCheckLevel16 } from './game/level_16';
import { LEVEL_17, selfCheckLevel17 } from './game/level_17';
import { LEVEL_18, selfCheckLevel18 } from './game/level_18';
import type { Dest, FailReason, FoodId, HintPick, LevelDef, PlaceFail, PlaceReason } from './game/types';
import { FOOD_NAMES } from './game/types';

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

const Y_TRAY = 250;
const Y_BUFFER = -524;
/** buffer_board.png 720×220 上三格奶油盘：中心相对木板中心（Y 向上）。 */
const BUF_BOARD_W = 720;
const BUF_BOARD_H = 220;
const BUF_SLOT_W = 168;
const BUF_SLOT_H = 140;
/** 柜台格里只放食物图标，不带托盘。 */
const BUF_FOOD = 112;
const BUF_WELL_Y = 16;
const BUF_WELL_XS = [-198, 0, 194];
const TRAY_FOOD_W = 46;
const TRAY_FOOD_H = 70;
const TRAY_FOOD_GAP = 4;
const FLY_SEC = 0.22;
const DOOR_SEC = 0.28;
const WIN_DELAY = 0.5;
const WHEAT = new Color(212, 176, 120, 255);
const TABLE_TOP = new Color(248, 240, 228, 255);
const TABLE_FRONT = new Color(186, 154, 122, 255);
const TABLE_SHADOW = new Color(61, 50, 41, 46);
const TABLE_SLOT = new Color(126, 92, 72, 120);
const TABLE_SLOT_INNER = new Color(255, 255, 255, 60);

const UUID = {
    foodMilk: '518eca01-d30f-4b58-8867-0cc149828d77@f9941',
    foodVeg: 'daae9542-5e08-4113-b2ab-f4f41c5837c6@f9941',
    foodFruit: '87f8396a-b237-44ee-bfcf-6856a22a2794@f9941',
    foodMeat: '948637a0-ae61-4105-bbf7-ddf5988257e2@f9941',
    foodSauce: 'cc9a1cd4-86d6-4590-bf78-e264c01e8c06@f9941',
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
    bgPlayWall: 'd1012f55-9340-4b85-ae10-2091d7f20001@f9941',
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
    trayEmpty: '6f229be7-9378-4d91-a617-1d2d45218e74@f9941',
    traySealed: '8085b3c5-21f0-4bcc-b990-c97f4c899dca@f9941',
    iconUndo: '73fbe16c-3f5c-4230-854b-1948ab7cf28f@f9941',
    iconHint: '9be83f96-829c-4c60-9e25-590aa93e4e46@f9941',
    builtin: '20835ba4-6145-4fbc-a58a-051ce700aa3e@f9941',
};

const HOME_NODES = ['Bg', 'Title', 'BtnStart', 'AlbumLink', 'HomeBarMask'];
const PLAYABLE: LevelDef[] = [LEVEL_01, LEVEL_02, LEVEL_03, LEVEL_04, LEVEL_05, LEVEL_06, LEVEL_07, LEVEL_08, LEVEL_09, LEVEL_10, LEVEL_11, LEVEL_12, LEVEL_13, LEVEL_14, LEVEL_15, LEVEL_16, LEVEL_17, LEVEL_18];
const CLEARED_KEY = 'fridge_cleared';

const TOAST: Record<PlaceReason, string> = {
    wrong_kind: '这格只收牛奶',
    anti_split: '牛奶那格还没收满，不能新开一格',
    no_target: '先点要放进的格子',
    dest_full: '这格收好了，换一格',
};

@ccclass('GameController')
export class GameController extends Component {
    @property({ type: SpriteFrame })
    foodMilk: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodVeg: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodFruit: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodMeat: SpriteFrame | null = null;

    @property({ type: SpriteFrame })
    foodSauce: SpriteFrame | null = null;

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
    iconHint: SpriteFrame | null = null;

    private board: BoardState | null = null;
    private playRoot: Node | null = null;
    private builtin: SpriteFrame | null = null;
    private bgPlay: SpriteFrame | null = null;
    private bgPlayWall: SpriteFrame | null = null;
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
    private trayEmpty: SpriteFrame | null = null;
    private traySealed: SpriteFrame | null = null;
    private bagFrames: Partial<Record<FoodId, SpriteFrame>> = {};
    private busy = false;
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

    onLoad() {
        selfCheckLevel01();
        selfCheckLevel02();
        selfCheckLevel03();
        selfCheckLevel04();
        selfCheckLevel05();
        selfCheckLevel06();
        selfCheckLevel07();
        selfCheckLevel08();
        selfCheckLevel09();
        selfCheckLevel10();
        selfCheckLevel11();
        selfCheckLevel12();
        selfCheckLevel13();
        selfCheckLevel14();
        selfCheckLevel15();
        selfCheckLevel16();
        selfCheckLevel17();
        selfCheckLevel18();
        this.bindHome();
        void this.ensureFrames();
    }

    private bindHome() {
        const btn = this.node.getChildByName('BtnStart');
        if (!btn) return;
        if (!btn.getComponent(Button)) btn.addComponent(Button);
        btn.on(Node.EventType.TOUCH_END, () => this.startLevel(this.continueLevel()), this);
    }

    private async ensureFrames() {
        if (!this.foodMilk) this.foodMilk = await loadFrame(UUID.foodMilk);
        if (!this.foodVeg) this.foodVeg = await loadFrame(UUID.foodVeg);
        if (!this.foodFruit) this.foodFruit = await loadFrame(UUID.foodFruit);
        if (!this.foodMeat) this.foodMeat = await loadFrame(UUID.foodMeat);
        if (!this.foodSauce) this.foodSauce = await loadFrame(UUID.foodSauce);
        if (!this.foodGrape) this.foodGrape = await loadFrame(UUID.foodGrape);
        if (!this.foodLemon) this.foodLemon = await loadFrame(UUID.foodLemon);
        if (!this.foodKiwi) this.foodKiwi = await loadFrame(UUID.foodKiwi);
        if (!this.foodPineapple) this.foodPineapple = await loadFrame(UUID.foodPineapple);
        if (!this.foodWatermelon) this.foodWatermelon = await loadFrame(UUID.foodWatermelon);
        if (!this.foodCoconut) this.foodCoconut = await loadFrame(UUID.foodCoconut);
        const bagIds: [FoodId, string][] = [
            ['milk', UUID.bagMilk],
            ['veg', UUID.bagVeg],
            ['fruit', UUID.bagFruit],
            ['meat', UUID.bagMeat],
            ['sauce', UUID.bagSauce],
            ['leftover', UUID.bagLeftover],
            ['grape', UUID.bagGrape],
            ['lemon', UUID.bagLemon],
            ['kiwi', UUID.bagKiwi],
            ['pineapple', UUID.bagPineapple],
            ['watermelon', UUID.bagWatermelon],
            ['coconut', UUID.bagCoconut],
        ];
        for (let i = 0; i < bagIds.length; i++) {
            const id = bagIds[i][0];
            if (!this.bagFrames[id]) this.bagFrames[id] = await loadFrame(bagIds[i][1]);
        }
        if (!this.iconUndo) this.iconUndo = await loadFrame(UUID.iconUndo);
        if (!this.iconHint) this.iconHint = await loadFrame(UUID.iconHint);
        if (!this.bgPlay) this.bgPlay = await loadFrame(UUID.bgPlay);
        if (!this.bgPlayWall) this.bgPlayWall = await loadFrame(UUID.bgPlayWall);
        if (!this.worktopTop) this.worktopTop = await loadFrame(UUID.worktopTop);
        if (!this.worktopFront) this.worktopFront = await loadFrame(UUID.worktopFront);
        if (!this.propBoard) this.propBoard = await loadFrame(UUID.propBoard);
        if (!this.propCup) this.propCup = await loadFrame(UUID.propCup);
        if (!this.propCloth) this.propCloth = await loadFrame(UUID.propCloth);
        if (!this.bagHidden) this.bagHidden = await loadFrame(UUID.bagHidden);
        if (!this.bagTrayLip) this.bagTrayLip = await loadFrame(UUID.bagTrayLip);
        if (!this.bagTrayLower) this.bagTrayLower = await loadFrame(UUID.bagTrayLower);
        if (!this.bagTrayTop) this.bagTrayTop = await loadFrame(UUID.bagTrayTop);
        if (!this.bufferBoard) this.bufferBoard = await loadFrame(UUID.bufferBoard);
        if (!this.trayEmpty) this.trayEmpty = await loadFrame(UUID.trayEmpty);
        if (!this.traySealed) this.traySealed = await loadFrame(UUID.traySealed);
        this.builtin = await loadFrame(UUID.builtin);
        if (this.board) this.render();
    }

    private startLevel(level: LevelDef) {
        this.unscheduleAllCallbacks();
        for (let i = 0; i < HOME_NODES.length; i++) {
            const n = this.node.getChildByName(HOME_NODES[i]);
            if (n) n.active = false;
        }
        this.board = BoardState.fromLevel(level);
        this.busy = false;
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
        this.ensurePlayRoot();
        this.playRoot.active = true;
        this.render();
    }

    private nextPlayable(id: number): LevelDef | null {
        for (let i = 0; i < PLAYABLE.length; i++) {
            if (PLAYABLE[i].id === id + 1) return PLAYABLE[i];
        }
        return null;
    }

    private continueLevel(): LevelDef {
        const nextId = this.clearedId() + 1;
        const next = this.nextPlayable(nextId - 1);
        return next || PLAYABLE[PLAYABLE.length - 1];
    }

    private clearedId(): number {
        const raw = sys.localStorage.getItem(CLEARED_KEY);
        const n = raw ? parseInt(raw, 10) : 0;
        return n > 0 ? n : 0;
    }

    private markCleared(id: number) {
        if (id > this.clearedId()) sys.localStorage.setItem(CLEARED_KEY, String(id));
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
        return { w: vis.width || 720, h: vis.height || 1280 };
    }

    private render() {
        const root = this.playRoot;
        const board = this.board;
        if (!root || !board) return;
        root.removeAllChildren();

        const size = this.canvasSize();
        const rootUi = root.getComponent(UITransform);
        if (rootUi) rootUi.setContentSize(size.w, size.h);

        const wall = this.bgPlay || this.bgPlayWall;
        this.addSprite(root, 'PlayBgWall', wall || this.builtin, size.w, size.h, 0, 0, wall ? Color.WHITE : CREAM);
        this.drawTrays(root, board);
        this.drawWorktopBack(root);
        this.drawMidProps(root);
        this.drawBags(root, board);
        this.drawWorktopFront(root);
        this.drawBuffer(root, board);
        this.drawHud(root);
        if (this.sizeTeach && !board.isWin()) this.drawSizeTeach(root);

        if (board.isWin() && !this.holdWin) {
            this.addSprite(root, 'WinDim', this.builtin, size.w, size.h, 0, 0, new Color(61, 50, 41, 102));
            this.addLabel(root, 'WinTitle', '今晚的冰箱收好了', 40, WALNUT, 640, 80).setPosition(0, 40, 0);
        }
    }

    private drawHud(parent: Node) {
        const y = this.hudY();
        const pill = new Node('LevelPill');
        pill.layer = UI_2D;
        pill.setPosition(0, y, 0);
        pill.addComponent(UITransform).setContentSize(200, 56);
        const g = pill.addComponent(Graphics);
        g.fillColor = MILK;
        g.roundRect(-100, -28, 200, 56, 28);
        g.fill();
        g.lineWidth = 2;
        g.strokeColor = new Color(107, 74, 58, 64);
        g.roundRect(-100, -28, 200, 56, 28);
        g.stroke();
        parent.addChild(pill);
        this.addLabel(pill, 'LevelLabel', `第 ${this.board ? this.board.level.id : 1} 关`, 28, WALNUT, 180, 40);

        const home = this.addHudRoundBtn(parent, 'BtnHome', -312, y);
        this.paintHomeIcon(home);
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
        const visibleW = view.getVisibleSize().width || 720;
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

    private paintHomeIcon(btn: Node) {
        const icon = new Node('Icon');
        icon.layer = UI_2D;
        icon.addComponent(UITransform).setContentSize(56, 56);
        const g = icon.addComponent(Graphics);
        g.fillColor = WALNUT;
        g.moveTo(0, 22);
        g.lineTo(-22, 2);
        g.lineTo(22, 2);
        g.close();
        g.fill();
        g.roundRect(-16, -20, 32, 24, 4);
        g.fill();
        g.fillColor = MILK;
        g.roundRect(-5, -20, 10, 14, 2);
        g.fill();
        btn.addChild(icon);
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
            tap();
        }, this);
    }

    private restartLevel() {
        if (!this.board || this.busy) return;
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
        layer.addComponent(UITransform).setContentSize(720, 1280);
        this.addSprite(layer, 'Dim', this.builtin, 720, 1280, 0, 0, new Color(61, 50, 41, 102));
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
        this.holdWin = false;
        this.animateDoorIndex = null;
        this.board = null;
        if (this.playRoot && this.playRoot.isValid) {
            this.playRoot.removeAllChildren();
            this.playRoot.active = false;
        }
        for (let i = 0; i < HOME_NODES.length; i++) {
            const n = this.node.getChildByName(HOME_NODES[i]);
            if (!n) continue;
            n.active = HOME_NODES[i] !== 'Title';
        }
    }

    private mixedCaps(): boolean {
        const board = this.board;
        if (!board || board.trays.length === 0) return false;
        const cap0 = board.trays[0].cap;
        return board.trays.some((t) => t.cap !== cap0);
    }

    private trayY(): number {
        return Y_TRAY;
    }

    /** 胡桃木色外框 + 冷光内腔；收满后灰门合上。 */
    private trayMetrics(cap: number) {
        const n = this.board ? this.board.trays.length : 2;
        const mixed = !!(this.board && this.board.trays.some((t) => t.cap !== this.board!.trays[0].cap));
        let scale = cap >= 4 ? 1.15 : cap <= 2 ? 0.85 : 1;
        if (mixed) scale = cap >= 4 ? 1.05 : cap <= 2 ? 0.72 : 0.9;
        else if (n >= 4 && cap >= 3) scale = Math.min(scale, 0.88);
        const slotW = 140 * scale;
        const slotH = 340 * scale;
        const frame = 18 * scale;
        return { slotW, slotH, frame, outerW: slotW + frame * 2, outerH: slotH + frame * 2, cap };
    }

    private drawTrays(root: Node, board: BoardState) {
        const n = board.trays.length;
        const gap = n >= 4 ? 12 : 24;
        const metrics = board.trays.map((t) => this.trayMetrics(t.cap));
        let total = gap * Math.max(n - 1, 0);
        for (let i = 0; i < n; i++) total += metrics[i].outerW;
        let cursor = -total / 2;
        for (let i = 0; i < n; i++) {
            const tray = board.trays[i];
            const m = metrics[i];
            const x = cursor + m.outerW / 2;
            cursor += m.outerW + gap;
            const node = new Node(`Tray${i}`);
            node.layer = UI_2D;
            node.setPosition(x, this.trayY(), 0);
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
            if (selected) {
                g.lineWidth = 8;
                g.strokeColor = CORAL;
                g.roundRect(-m.outerW / 2 + 4, -m.outerH / 2 + 4, m.outerW - 8, m.outerH - 8, 24);
                g.stroke();
            }
            if (closed) {
                this.paintDoor(g, m.slotW, m.slotH);
            } else {
                g.fillColor = selected ? new Color(245, 252, 255, 255) : new Color(198, 210, 214, 255);
                g.roundRect(-m.slotW / 2, -m.slotH / 2, m.slotW, m.slotH, 20);
                g.fill();
                g.fillColor = selected ? new Color(255, 255, 255, 200) : new Color(255, 255, 255, 70);
                g.circle(0, m.slotH / 2 - 28, selected ? 28 : 18);
                g.fill();
            }
            node.addChild(gNode);
            if (selected && !closed) node.setScale(1.06, 1.06, 1);

            if (!closed) {
                if (this.mixedCaps()) this.drawCapacityLayers(node, m, tray.cap, tray.items.length);
                this.drawFoodsInTray(node, tray.items, m.slotH, tray.cap);
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

            node.on(Node.EventType.TOUCH_END, () => {
                if (!this.board || this.busy || this.board.isWin()) return;
                if (this.holdHintTrays.indexOf(i) >= 0) this.holdHintTrays = [];
                this.holdHintBuffers = [];
                this.board.selectTray(i);
                this.render();
            }, this);
        }
    }

    private paintDoor(g: Graphics, slotW: number, slotH: number) {
        g.fillColor = DOOR;
        g.roundRect(-slotW / 2, -slotH / 2, slotW, slotH, 20);
        g.fill();
        g.fillColor = HANDLE;
        g.roundRect(slotW / 2 - 22, -36, 12, 72, 6);
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
        g.fillColor = HANDLE;
        g.roundRect(-22, -36, 12, 72, 6);
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
        if (kind === 'leftover') return new Color(140, 100, 160, 255);
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

    private foodSlotY(slotH: number, cap: number, index: number): number {
        const pad = 16;
        const step = (slotH - pad * 2) / Math.max(cap, 1);
        return -slotH / 2 + pad + step * (index + 0.5);
    }

    private trayFoodSize(slotH: number, cap: number) {
        const step = (slotH - 32) / Math.max(cap, 1);
        const h = Math.min(TRAY_FOOD_H, Math.max(42, step * 0.88));
        return { w: h * (TRAY_FOOD_W / TRAY_FOOD_H), h };
    }

    private drawCapacityLayers(
        node: Node,
        m: { slotW: number; slotH: number },
        cap: number,
        filled: number,
    ) {
        const layers = new Node('Layers');
        layers.layer = UI_2D;
        layers.addComponent(UITransform).setContentSize(m.slotW, m.slotH);
        const g = layers.addComponent(Graphics);
        const pad = 18;
        const step = (m.slotH - pad * 2) / cap;
        const h = Math.max(step - 8, 22);
        const w = m.slotW * 0.7;
        for (let i = 0; i < cap; i++) {
            const y = this.foodSlotY(m.slotH, cap, i);
            if (i < filled) {
                g.fillColor = new Color(255, 255, 255, 16);
                g.roundRect(-w / 2, y - h / 2, w, h, 10);
                g.fill();
            } else {
                g.fillColor = new Color(255, 253, 248, 42);
                g.roundRect(-w / 2, y - h / 2, w, h, 10);
                g.fill();
                g.strokeColor = new Color(255, 253, 248, 170);
                g.lineWidth = 2;
                g.roundRect(-w / 2, y - h / 2, w, h, 10);
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
        const m = this.trayMetrics(board.trays[index].cap);
        const cap = board.trays[index].cap;
        const filled = board.trays[index].items.length;
        const flash = new Node('CapFlash');
        flash.layer = UI_2D;
        flash.addComponent(UITransform).setContentSize(m.slotW, m.slotH);
        const g = flash.addComponent(Graphics);
        g.strokeColor = CORAL;
        g.lineWidth = 5;
        const pad = 18;
        const step = (m.slotH - pad * 2) / cap;
        const h = Math.max(step - 8, 22);
        const w = m.slotW * 0.7;
        for (let i = filled; i < cap; i++) {
            const y = this.foodSlotY(m.slotH, cap, i);
            g.roundRect(-w / 2, y - h / 2, w, h, 10);
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
            .start();
    }

    private shakeKindBags(kind: FoodId) {
        const board = this.board;
        if (!board) return;
        for (let c = 0; c < board.bags.length; c++) {
            if (board.peekBag(c) === kind) this.shakeBagTop(c);
        }
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

    private drawFoodsInTray(node: Node, items: FoodId[], slotH: number, cap = 4, centerY = 0) {
        const size = this.trayFoodSize(slotH, cap);
        for (let k = 0; k < items.length; k++) {
            const fy = centerY + this.foodSlotY(slotH, cap, k);
            this.addSprite(node, `Food${k}`, this.frameForFood(items[k]), size.w, size.h, 0, fy, Color.WHITE);
        }
    }

    /** 三列时托盘接近示意图大小；列变多再缩小，避免挤出屏幕。 */
    private bagLayout(columns: number): {
        w: number;
        trayH: number;
        step: number;
        gap: number;
        food: number;
    } {
        const gap = columns <= 3 ? 28 : 16;
        const w = Math.min(188, Math.floor((680 - gap * Math.max(columns - 1, 0)) / Math.max(columns, 1)));
        /** 整盘 512×302，前唇从 y=246 起，约 56px。食物按凹槽收，不按整盘宽放大。 */
        const trayH = Math.round(w * (302 / 512));
        const step = Math.max(12, Math.round(trayH * (56 / 302)));
        const food = Math.round(w * 0.39);
        return { w, trayH, step, gap, food };
    }

    /** 叠盘凹槽内食材尺寸：高盒略瘦高，圆果近方，避免正方形撑出前唇。 */
    private bagFoodSize(kind: FoodId, food: number): { w: number; h: number } {
        if (kind === 'milk' || kind === 'sauce' || kind === 'pineapple') {
            return { w: Math.round(food * 0.72), h: food };
        }
        if (kind === 'veg' || kind === 'meat' || kind === 'leftover' || kind === 'watermelon') {
            return { w: Math.round(food * 0.92), h: Math.round(food * 0.82) };
        }
        return { w: Math.round(food * 0.88), h: Math.round(food * 0.88) };
    }

    /** 每层都是同一张整盘，层距只露出前唇。 */
    private columnHeight(layout: { trayH: number; step: number }, len: number): number {
        if (len <= 0) return 0;
        return layout.trayH + layout.step * (len - 1);
    }

    private bagAnchorY(board: BoardState): number {
        let maxLen = 0;
        for (let c = 0; c < board.bags.length; c++) {
            if (board.bags[c].length > maxLen) maxLen = board.bags[c].length;
        }
        const layout = this.bagLayout(board.bags.length);
        const h = this.columnHeight(layout, maxLen);
        /** 落在台面上，底边留在柜台木板上方。 */
        const seat = -360;
        let anchor = seat + h / 2;
        const top = anchor + h / 2;
        const limit = 36;
        if (top > limit) anchor -= top - limit;
        return anchor;
    }

    /** 冰箱与叠盘之间的空档：左右摆低对比厨房小物件，不挡点击、不挡飞行。 */
    private drawMidProps(root: Node) {
        const dim = new Color(255, 255, 255, 220);
        const y = -80;
        if (this.propBoard) {
            this.addSprite(root, 'PropBoard', this.propBoard, 150, 84, -248, y - 8, dim);
        }
        if (this.propCloth) {
            this.addSprite(root, 'PropCloth', this.propCloth, 118, 92, 248, y - 4, dim);
        }
        if (this.propCup) {
            this.addSprite(root, 'PropCup', this.propCup, 78, 66, 268, y + 36, dim);
        }
    }

    /** 工作台顶面托住叠盘；按设计宽，不再放大出屏。 */
    private drawWorktopBack(root: Node) {
        if (this.worktopTop) {
            this.addSprite(root, 'WorktopTop', this.worktopTop, 720, 380, 0, -300, Color.WHITE);
            return;
        }
        const top = new Node('WorktopTop');
        top.layer = UI_2D;
        top.setPosition(0, -300, 0);
        top.addComponent(UITransform).setContentSize(720, 380);
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
            this.addSprite(root, 'WorktopFront', this.worktopFront, 720, 120, 0, -448, Color.WHITE);
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

    private drawBags(root: Node, board: BoardState) {
        const n = board.bags.length;
        const layout = this.bagLayout(n);
        let maxLen = 0;
        for (let c = 0; c < n; c++) {
            if (board.bags[c].length > maxLen) maxLen = board.bags[c].length;
        }
        const yBag = this.bagAnchorY(board);
        const baseline = yBag - this.columnHeight(layout, maxLen) / 2;
        for (let c = 0; c < n; c++) {
            const col = board.bags[c];
            const count = col.length;
            if (count <= 0) continue;
            const x = (c - (n - 1) / 2) * (layout.w + layout.gap);
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

            for (let i = 0; i < count; i++) {
                const isTop = i === count - 1;
                const y = -h / 2 + layout.trayH / 2 + i * layout.step;
                const tileNode = this.addSprite(
                    colNode,
                    `T${i}`,
                    this.bagTrayLower || this.bagTrayTop || this.builtin,
                    layout.w,
                    layout.trayH,
                    0,
                    y,
                    isTop ? this.trayTint(col[i]) : Color.WHITE,
                );
                if (!isTop) continue;
                const foodSize = this.bagFoodSize(col[i], layout.food);
                // 盘心偏前：前唇约占底 18%，落点取几何中心略靠前唇一侧。
                // 中心 = 落点 + 高度系数，保证高盒/矮果底边落在同一接触面。
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
                    this.frameForFood(col[i]),
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
                const tap = () => this.onBagTap(c, true);
                tileNode.on(Node.EventType.TOUCH_END, tap, this);
                foodNode.on(Node.EventType.TOUCH_END, tap, this);
                if (this.holdHint && this.holdHint.bagCol === c) {
                    this.drawSageDashedRing(foodNode, foodSize.w + 12, foodSize.h + 12, 18, 'HintRing');
                }
            }
        }
        this.revealBagCol = null;
    }

    private bufferSlotX(index: number, count: number): number {
        if (count === BUF_WELL_XS.length) return BUF_WELL_XS[index];
        const span = BUF_WELL_XS[BUF_WELL_XS.length - 1] - BUF_WELL_XS[0];
        return (index - (count - 1) / 2) * (span / Math.max(count - 1, 1));
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
        // 柜台图必须按原图像素对齐，避免裁切/拉伸把左右格中心拉开
        const woodSp = wood.getComponent(Sprite);
        if (woodSp) woodSp.sizeMode = Sprite.SizeMode.RAW;
        const woodUi = wood.getComponent(UITransform);
        if (woodUi) woodUi.setContentSize(BUF_BOARD_W, BUF_BOARD_H);

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

            const selected = !!(
                !board.isWin()
                && board.dest
                && board.dest.kind === 'buffer'
                && board.dest.index === i
            );
            if (selected) this.drawBufferSelect(slotNode);

            const item = board.buffer[i];
            if (item) {
                this.addSprite(slotNode, 'Food', this.frameForFood(item), BUF_FOOD, BUF_FOOD, 0, 0, Color.WHITE);
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

            slotNode.on(Node.EventType.TOUCH_END, () => {
                this.onBufferTap(i);
            }, this);
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
            leftover: [206, 190, 168],
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

    private onBagTap(col: number, isTop: boolean) {
        const board = this.board;
        const root = this.playRoot;
        if (!board || !root || this.busy || board.isWin()) return;
        if (!isTop || this.lockedBagCol === col) return;
        const item = board.peekBag(col);
        if (!item) return;
        this.dismissSizeIntro();
        const check = board.canAccept(board.dest, item, 'bag');
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
        let to = new Vec3(from.x, from.y, 0);
        let land = new Vec3(1, 1, 1);
        let flyFrame = this.frameForFood(item);
        let flyW = 72;
        let flyH = 96;
        if (board.dest && board.dest.kind === 'buffer') {
            const wrap = root.getChildByName('BufferBoard');
            const slot = wrap ? wrap.getChildByName(`Buffer${board.dest.index}`) : null;
            if (!slot) {
                this.commitPlace(col);
                return;
            }
            const toWorld = slot.getComponent(UITransform)!.convertToWorldSpaceAR(new Vec3(0, 0, 0));
            to = ui.convertToNodeSpaceAR(toWorld);
            flyFrame = this.frameForFood(item);
            flyW = 96;
            flyH = 96;
            land = new Vec3(BUF_FOOD / 96, BUF_FOOD / 96, 1);
        } else {
            const destIndex = board.dest && board.dest.kind === 'tray' ? board.dest.index : 0;
            const trayNode = root.getChildByName(`Tray${destIndex}`);
            if (!trayNode) {
                this.commitPlace(col);
                return;
            }
            const nextCount = board.trays[destIndex].items.length;
            const m = this.trayMetrics(board.trays[destIndex].cap);
            const fy = this.foodSlotY(m.slotH, board.trays[destIndex].cap, nextCount);
            const toWorld = trayNode.getComponent(UITransform)!.convertToWorldSpaceAR(new Vec3(0, fy, 0));
            to = ui.convertToNodeSpaceAR(toWorld);
            const size = this.trayFoodSize(m.slotH, board.trays[destIndex].cap);
            land = new Vec3(size.w / flyW, size.h / flyH, 1);
        }

        const flyer = this.addSprite(root, 'Flyer', flyFrame, flyW, flyH, from.x, from.y, Color.WHITE);
        tween(flyer)
            .to(FLY_SEC, { position: new Vec3(to.x, to.y, 0), scale: land }, { easing: easing.cubicOut })
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
        const m = this.trayMetrics(board.trays[destIndex].cap);
        const fy = this.foodSlotY(m.slotH, board.trays[destIndex].cap, nextCount);
        const toWorld = trayNode.getComponent(UITransform)!.convertToWorldSpaceAR(new Vec3(0, fy, 0));
        const to = ui.convertToNodeSpaceAR(toWorld);
        const flyer = this.addSprite(root, 'Flyer', this.frameForFood(item), 64, 96, from.x, from.y, Color.WHITE);
        const size = this.trayFoodSize(m.slotH, board.trays[destIndex].cap);
        const land = new Vec3(size.w / 64, size.h / 96, 1);
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
        this.render();
        if (result.sealed) {
            const tray = root.getChildByName(`Tray${result.dest.kind === 'tray' ? result.dest.index : 0}`);
            const door = tray ? tray.getChildByName('Door') : null;
            if (door) {
                tween(door)
                    .to(DOOR_SEC, { scale: new Vec3(1, 1, 1) }, { easing: easing.cubicOut })
                    .call(() => {
                        this.animateDoorIndex = null;
                        if (tray) this.bounceNode(tray);
                        this.finishMove(win);
                    })
                    .start();
                return;
            }
        }
        this.animateDoorIndex = null;
        this.finishMove(win);
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
        this.render();
        if (result.sealed) {
            const tray = root.getChildByName(`Tray${result.dest.kind === 'tray' ? result.dest.index : 0}`);
            const door = tray ? tray.getChildByName('Door') : null;
            if (door) {
                tween(door)
                    .to(DOOR_SEC, { scale: new Vec3(1, 1, 1) }, { easing: easing.cubicOut })
                    .call(() => {
                        this.animateDoorIndex = null;
                        const sealedTray = tray;
                        if (sealedTray) this.bounceNode(sealedTray);
                        this.finishMove(win);
                    })
                    .start();
                return;
            }
        }
        this.animateDoorIndex = null;
        this.finishMove(win);
    }

    private finishMove(win: boolean) {
        if (win) {
            this.scheduleOnce(() => this.playWinReward(), WIN_DELAY);
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
        this.playSizeFeedback();
    }

    private onFail(reason: FailReason) {
        const board = this.board;
        const id = board ? board.level.id : 0;
        if (id < 17) {
            console.log(`[fridge] unexpected fail L${id} ${reason}`);
            this.restartLevel();
            return;
        }
        this.busy = true;
        this.flashFail(reason, () => this.spawnFailCard(reason));
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
            for (let i = 0; i < board.trays.length; i++) {
                if (!board.trays[i].sealed) continue;
                const tray = root.getChildByName(`Tray${i}`);
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
        card.setPosition(0, -200, 0);
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
            this.startLevel(board.level);
        });

        const retry = this.addLabel(card, 'FailRetry', '重开本关', 26, new Color(107, 74, 58, 153), 280, 40);
        retry.setPosition(0, -168, 0);
        this.bindHudPress(retry, () => this.restartLevel());

        tween(cardOp).to(0.2, { opacity: 255 }).start();
        tween(card)
            .to(0.32, { position: new Vec3(0, -180, 0), scale: new Vec3(1.04, 1.04, 1) }, { easing: easing.backOut })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    private bounceNode(node: Node) {
        tween(node)
            .to(0.07, { scale: new Vec3(1.04, 0.96, 1) }, { easing: easing.quadOut })
            .to(0.1, { scale: new Vec3(1, 1, 1) }, { easing: easing.quadOut })
            .start();
    }

    /** 先亮成品冰箱，再压暗出卡：奖杯砸入、大字、步数、丝带落下、下一关弹出。 */
    private playWinReward() {
        const root = this.playRoot;
        const board = this.board;
        if (!root || !board) {
            this.busy = false;
            return;
        }
        this.holdWin = true;
        this.markCleared(board.level.id);
        this.pulseSealedFridge(root);
        this.spawnPrideFlash(root);

        this.scheduleOnce(() => {
            const dim = this.addSprite(root, 'WinDim', this.builtin, 720, 1280, 0, 0, new Color(61, 50, 41, 255));
            const dimOp = dim.addComponent(UIOpacity);
            dimOp.opacity = 0;
            tween(dimOp).to(0.4, { opacity: 110 }, { easing: easing.quadOut }).start();
        }, 0.42);

        this.scheduleOnce(() => {
            this.spawnWinCard(root, board.steps);
            this.spawnFallingRibbons(root);
            this.raiseWinFx(root);
        }, 0.62);

        this.scheduleOnce(() => {
            this.spawnNextLevelBtn(root);
            this.spawnShareStepsBtn(root, board.steps);
            this.busy = false;
        }, 2.05);
    }

    private pulseSealedFridge(root: Node) {
        const board = this.board;
        const pack = new Node('PrideGlow');
        pack.layer = UI_2D;
        pack.setPosition(0, this.trayY(), 0);
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
        const coral = this.addSprite(root, 'PrideFlashCoral', this.builtin, 720, 1280, 0, 0, CORAL);
        const coralOp = coral.addComponent(UIOpacity);
        coralOp.opacity = 0;
        tween(coralOp)
            .to(0.06, { opacity: 70 })
            .to(0.16, { opacity: 0 }, { easing: easing.quadOut })
            .call(() => {
                if (coral.isValid) coral.destroy();
            })
            .start();
        const flash = this.addSprite(root, 'PrideFlash', this.builtin, 720, 1280, 0, 0, MILK);
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

    private spawnWinCard(root: Node, steps: number) {
        const card = new Node('WinCard');
        card.layer = UI_2D;
        card.setPosition(0, -220, 0);
        card.setScale(0.78, 0.78, 1);
        card.addComponent(UITransform).setContentSize(600, 520);
        const cg = card.addComponent(Graphics);
        cg.fillColor = CREAM;
        cg.roundRect(-300, -260, 600, 520, 36);
        cg.fill();
        cg.lineWidth = 3;
        cg.strokeColor = new Color(107, 74, 58, 50);
        cg.roundRect(-300, -260, 600, 520, 36);
        cg.stroke();
        const cardOp = card.addComponent(UIOpacity);
        cardOp.opacity = 0;
        root.addChild(card);

        const trophy = this.makeTrophyFridge();
        trophy.setPosition(0, 155, 0);
        trophy.setScale(0.15, 0.15, 1);
        card.addChild(trophy);

        const sub = this.addLabel(card, 'WinSub', '今晚的冰箱', 26, FRAME, 500, 36);
        sub.setPosition(0, 28, 0);
        sub.setScale(0, 0, 1);
        const title = this.addLabel(card, 'WinTitle', '收好了', 52, WALNUT, 500, 64);
        title.setPosition(0, -28, 0);
        title.setScale(0, 0, 1);

        const stepsNode = this.addLabel(card, 'WinSteps', `${steps} 步`, 72, CORAL, 480, 88);
        stepsNode.setPosition(0, -110, 0);
        stepsNode.setScale(0, 0, 1);

        const chip = new Node('AlbumChip');
        chip.layer = UI_2D;
        chip.setPosition(0, -188, 0);
        chip.setScale(0, 0, 1);
        chip.angle = -14;
        chip.addComponent(UITransform).setContentSize(240, 52);
        const chg = chip.addComponent(Graphics);
        chg.fillColor = MILK;
        chg.roundRect(-120, -26, 240, 52, 26);
        chg.fill();
        chg.lineWidth = 3;
        chg.strokeColor = CORAL;
        chg.roundRect(-120, -26, 240, 52, 26);
        chg.stroke();
        this.addLabel(chip, 'ChipText', '图鉴 +1', 26, WALNUT, 220, 36);
        card.addChild(chip);

        tween(cardOp).to(0.2, { opacity: 255 }).start();
        tween(card)
            .to(0.42, { position: new Vec3(0, 56, 0), scale: new Vec3(1.05, 1.05, 1) }, { easing: easing.backOut })
            .to(0.12, { scale: new Vec3(1, 1, 1) })
            .start();

        this.scheduleOnce(() => {
            tween(trophy)
                .to(0.32, { scale: new Vec3(1.16, 1.16, 1) }, { easing: easing.backOut })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
            this.spawnStarBurst(this.ensureWinFx(root));
            this.raiseWinFx(root);
        }, 0.18);
        this.scheduleOnce(() => {
            tween(sub).to(0.2, { scale: new Vec3(1, 1, 1) }, { easing: easing.backOut }).start();
            tween(title)
                .to(0.28, { scale: new Vec3(1.12, 1.12, 1) }, { easing: easing.backOut })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
        }, 0.42);
        this.scheduleOnce(() => {
            tween(stepsNode)
                .to(0.28, { scale: new Vec3(1.18, 1.18, 1) }, { easing: easing.backOut })
                .to(0.12, { scale: new Vec3(1, 1, 1) })
                .start();
        }, 0.72);
        this.scheduleOnce(() => {
            tween(chip)
                .to(0.28, { scale: new Vec3(1.1, 1.1, 1), angle: 0 }, { easing: easing.backOut })
                .to(0.1, { scale: new Vec3(1, 1, 1) })
                .start();
        }, 0.98);
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

    private spawnNextLevelBtn(root: Node) {
        const old = root.getChildByName('BtnNext');
        if (old) old.destroy();

        const btn = new Node('BtnNext');
        btn.layer = UI_2D;
        btn.setPosition(0, -460, 0);
        btn.setScale(0.55, 0.55, 1);
        btn.addComponent(UITransform).setContentSize(520, 96);
        const g = btn.addComponent(Graphics);
        g.fillColor = CORAL;
        g.roundRect(-260, -48, 520, 96, 48);
        g.fill();
        this.addLabel(btn, 'NextLabel', '下一关', 36, MILK, 480, 52);
        const op = btn.addComponent(UIOpacity);
        op.opacity = 0;
        root.addChild(btn);

        tween(op).to(0.18, { opacity: 255 }).start();
        tween(btn)
            .to(0.38, { position: new Vec3(0, -330, 0), scale: new Vec3(1.1, 1.1, 1) }, { easing: easing.backOut })
            .to(0.12, { scale: new Vec3(1, 1, 1) })
            .start();

        const fromId = this.board ? this.board.level.id : 1;
        btn.on(Node.EventType.TOUCH_START, () => {
            tween(btn).to(0.08, { scale: new Vec3(0.97, 0.97, 1) }).start();
        }, this);
        btn.on(Node.EventType.TOUCH_CANCEL, () => {
            tween(btn).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
        }, this);
        btn.on(Node.EventType.TOUCH_END, () => {
            tween(btn).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
            const next = this.nextPlayable(fromId);
            if (!next) {
                this.showToast('下一关还没收拾');
                return;
            }
            this.startLevel(next);
        }, this);
    }

    private spawnShareStepsBtn(root: Node, steps: number) {
        const id = this.board ? this.board.level.id : 0;
        if (id !== 15 && id !== 25 && id !== 30) return;
        const old = root.getChildByName('BtnShareSteps');
        if (old) old.destroy();

        const btn = new Node('BtnShareSteps');
        btn.layer = UI_2D;
        btn.setPosition(0, -430, 0);
        btn.setScale(0.55, 0.55, 1);
        btn.addComponent(UITransform).setContentSize(520, 80);
        const g = btn.addComponent(Graphics);
        g.fillColor = SAGE;
        g.roundRect(-260, -40, 520, 80, 40);
        g.fill();
        this.addLabel(btn, 'ShareLabel', '分享步数', 32, MILK, 480, 48);
        const op = btn.addComponent(UIOpacity);
        op.opacity = 0;
        root.addChild(btn);

        tween(op).delay(0.12).to(0.18, { opacity: 255 }).start();
        tween(btn)
            .delay(0.12)
            .to(0.34, { position: new Vec3(0, -430, 0), scale: new Vec3(1.06, 1.06, 1) }, { easing: easing.backOut })
            .to(0.1, { scale: new Vec3(1, 1, 1) })
            .start();

        this.bindHudPress(btn, () => {
            this.showToast(`我把今晚的冰箱收好了，用了 ${steps} 步`);
        });
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
        if ((id === 10 || id === 14) && result.reason === 'wrong_kind' && result.hintBuffers.length > 0) {
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
            this.drawSwitchGuide(tray, this.trayMetrics(board.trays[i].cap));
        }
    }

    private toastFor(result: PlaceFail): string {
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
            const m = this.trayMetrics(board.trays[i].cap);
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

function loadFrame(uuid: string): Promise<SpriteFrame | null> {
    return new Promise((resolve) => {
        assetManager.loadAny({ uuid }, (err, asset) => {
            if (err || !asset) {
                resolve(null);
                return;
            }
            resolve(asset as SpriteFrame);
        });
    });
}

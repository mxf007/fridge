/**
 * 对局视图：把点击译成 selectTray / placeFromBag。不写规则。
 * 第 1 关对照 03_play_l1：竖槽 + 牛奶盒列。飞入 220ms，封格关门 280ms，胜利再延迟。
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
} from 'cc';
import { BoardState } from './game/BoardState';
import { LEVEL_01, selfCheckLevel01 } from './game/level_01';
import { LEVEL_02, selfCheckLevel02 } from './game/level_02';
import { LEVEL_03, selfCheckLevel03 } from './game/level_03';
import { LEVEL_04, selfCheckLevel04 } from './game/level_04';
import { LEVEL_05, selfCheckLevel05 } from './game/level_05';
import type { FoodId, LevelDef, PlaceFail, PlaceReason } from './game/types';
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
const Y_BAG = -220;
const CARTON_W = 108;
const CARTON_H = 177;
const CARTON_OVERLAP = 78;
const TRAY_FOOD_W = 50.4;
const TRAY_FOOD_H = 76.8;
const TRAY_FOOD_GAP = 4;
const FLY_SEC = 0.22;
const DOOR_SEC = 0.28;
const WIN_DELAY = 0.5;
const WHEAT = new Color(212, 176, 120, 255);

const UUID = {
    foodMilk: '518eca01-d30f-4b58-8867-0cc149828d77@f9941',
    foodVeg: 'daae9542-5e08-4113-b2ab-f4f41c5837c6@f9941',
    foodFruit: '87f8396a-b237-44ee-bfcf-6856a22a2794@f9941',
    iconUndo: '73fbe16c-3f5c-4230-854b-1948ab7cf28f@f9941',
    builtin: '20835ba4-6145-4fbc-a58a-051ce700aa3e@f9941',
};

const HOME_NODES = ['Bg', 'Title', 'BtnStart', 'AlbumLink', 'HomeBarMask'];
const PLAYABLE: LevelDef[] = [LEVEL_01, LEVEL_02, LEVEL_03, LEVEL_04, LEVEL_05];
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
    iconUndo: SpriteFrame | null = null;

    private board: BoardState | null = null;
    private playRoot: Node | null = null;
    private builtin: SpriteFrame | null = null;
    private busy = false;
    private animateDoorIndex: number | null = null;
    private holdWin = false;
    private firstKindToast = true;
    private holdHintTrays: number[] = [];

    onLoad() {
        selfCheckLevel01();
        selfCheckLevel02();
        selfCheckLevel03();
        selfCheckLevel04();
        selfCheckLevel05();
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
        if (!this.iconUndo) this.iconUndo = await loadFrame(UUID.iconUndo);
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
        root.addComponent(UITransform).setContentSize(720, 1280);
        this.node.addChild(root);
        this.playRoot = root;
    }

    private render() {
        const root = this.playRoot;
        const board = this.board;
        if (!root || !board) return;
        root.removeAllChildren();

        this.addSprite(root, 'PlayBg', this.builtin, 720, 1280, 0, 0, CREAM);
        this.drawHud(root);
        this.drawTrays(root, board);
        this.drawBags(root, board);

        if (board.isWin() && !this.holdWin) {
            this.addSprite(root, 'WinDim', this.builtin, 720, 1280, 0, 0, new Color(61, 50, 41, 102));
            this.addLabel(root, 'WinTitle', '今晚的冰箱收好了', 40, WALNUT, 640, 80).setPosition(0, 40, 0);
        }
    }

    private drawHud(parent: Node) {
        const y = 544;
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

        const undo = this.addHudRoundBtn(parent, 'BtnUndo', 312, y);
        this.addSprite(undo, 'Icon', this.iconUndo, 48, 48, 0, 0, WALNUT);
        this.bindHudPress(undo, () => this.restartLevel());
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

    private trayMetrics(cap: number) {
        const scale = cap >= 4 ? 1.15 : cap <= 2 ? 0.85 : 1;
        const slotW = 140 * scale;
        const slotH = 340 * scale;
        const frame = 18 * scale;
        return { slotW, slotH, frame, outerW: slotW + frame * 2, outerH: slotH + frame * 2, cap };
    }

    private drawTrays(root: Node, board: BoardState) {
        const n = board.trays.length;
        const gap = 24;
        for (let i = 0; i < n; i++) {
            const tray = board.trays[i];
            const m = this.trayMetrics(tray.cap);
            const x = (i - (n - 1) / 2) * (m.outerW + gap);
            const node = new Node(`Tray${i}`);
            node.layer = UI_2D;
            node.setPosition(x, Y_TRAY, 0);
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
            if (selected && !closed && n > 1) this.drawDestBadge(node, m.outerH);

            if (!closed) {
                this.drawFoodsInTray(node, tray.items, m.slotH);
            }

            if (closing && tray.sealed) {
                const door = this.makeDoorNode(m.slotW, m.slotH);
                door.setScale(0.06, 1, 1);
                node.addChild(door);
            }

            if (!selected && !closed && this.holdHintTrays.indexOf(i) >= 0) {
                this.drawSwitchGuide(node, m);
            }

            node.on(Node.EventType.TOUCH_END, () => {
                if (!this.board || this.busy || this.board.isWin()) return;
                if (this.holdHintTrays.indexOf(i) >= 0) this.holdHintTrays = [];
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

    private drawDestBadge(tray: Node, outerH: number) {
        const badge = new Node('DestBadge');
        badge.layer = UI_2D;
        badge.setPosition(0, outerH / 2 + 6, 0);
        badge.addComponent(UITransform).setContentSize(140, 40);
        const g = badge.addComponent(Graphics);
        g.fillColor = CORAL;
        g.roundRect(-70, -20, 140, 40, 20);
        g.fill();
        this.addLabel(badge, 'Txt', '放这里', 22, MILK, 130, 32);
        tray.addChild(badge);
        badge.setScale(0.86, 0.86, 1);
        tween(badge)
            .to(0.22, { scale: new Vec3(1, 1, 1) }, { easing: easing.backOut })
            .start();
    }

    private drawSwitchGuide(tray: Node, m: { outerW: number; outerH: number }) {
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
        this.addLabel(tip, 'Txt', '点这格', 24, MILK, 150, 36);
        tray.addChild(tip);
        tween(tip)
            .to(0.4, { position: new Vec3(0, -m.outerH / 2 - 16, 0) }, { easing: easing.sineInOut })
            .to(0.4, { position: new Vec3(0, -m.outerH / 2 - 28, 0) }, { easing: easing.sineInOut })
            .union()
            .repeatForever()
            .start();
    }

    private drawFoodsInTray(node: Node, items: FoodId[], slotH: number) {
        const bottom = -slotH / 2 + 20;
        for (let k = 0; k < items.length; k++) {
            const fy = bottom + TRAY_FOOD_H / 2 + k * (TRAY_FOOD_H + TRAY_FOOD_GAP);
            this.addSprite(node, `Food${k}`, this.frameForFood(items[k]), TRAY_FOOD_W, TRAY_FOOD_H, 0, fy, Color.WHITE);
        }
    }

    private bagAnchorY(board: BoardState): number {
        let maxLen = 0;
        for (let c = 0; c < board.bags.length; c++) {
            if (board.bags[c].length > maxLen) maxLen = board.bags[c].length;
        }
        const h = CARTON_H + CARTON_OVERLAP * Math.max(maxLen - 1, 0);
        const top = Y_BAG + h / 2;
        const limit = 48;
        return top <= limit ? Y_BAG : Y_BAG - (top - limit);
    }

    private drawBags(root: Node, board: BoardState) {
        const n = board.bags.length;
        const yBag = this.bagAnchorY(board);
        for (let c = 0; c < n; c++) {
            const col = board.bags[c];
            const x = (c - (n - 1) / 2) * (CARTON_W + 28);
            const h = CARTON_H + CARTON_OVERLAP * Math.max(col.length - 1, 0);
            const colNode = new Node(`Bag${c}`);
            colNode.layer = UI_2D;
            colNode.setPosition(x, yBag, 0);
            colNode.addComponent(UITransform).setContentSize(CARTON_W, Math.max(h, 88));
            root.addChild(colNode);

            for (let i = 0; i < col.length; i++) {
                const isTop = i === col.length - 1;
                const y = (i - (col.length - 1) / 2) * CARTON_OVERLAP;
                const w = isTop ? CARTON_W : CARTON_W * 0.92;
                const ht = isTop ? CARTON_H : CARTON_H * 0.92;
                const tint = isTop ? Color.WHITE : new Color(153, 153, 153, 255);
                const tileNode = this.addSprite(
                    colNode,
                    `T${i}`,
                    this.frameForFood(col[i]),
                    w,
                    ht,
                    0,
                    y,
                    tint,
                );
                tileNode.on(Node.EventType.TOUCH_END, () => {
                    this.onBagTap(c, isTop);
                }, this);
            }
        }
    }

    private frameForFood(id: FoodId): SpriteFrame | null {
        if (id === 'milk') return this.foodMilk;
        if (id === 'veg') return this.foodVeg;
        if (id === 'fruit') return this.foodFruit;
        return null;
    }

    private onBagTap(col: number, isTop: boolean) {
        const board = this.board;
        const root = this.playRoot;
        if (!board || !root || this.busy || board.isWin()) return;
        if (!isTop) return;
        const item = board.peekBag(col);
        if (!item) return;
        const check = board.canAccept(board.dest, item, 'bag');
        if (!check.ok) {
            const result = board.placeFromBag(col);
            if (!result.ok) this.showPlaceFail(result);
            this.shakeBagTop(col);
            return;
        }

        const bagNode = root.getChildByName(`Bag${col}`);
        const top = bagNode ? bagNode.getChildByName(`T${board.bags[col].length - 1}`) : null;
        const destIndex = board.dest && board.dest.kind === 'tray' ? board.dest.index : 0;
        const trayNode = root.getChildByName(`Tray${destIndex}`);
        if (!top || !trayNode) {
            this.commitPlace(col);
            return;
        }

        this.busy = true;
        top.active = false;
        const ui = root.getComponent(UITransform)!;
        const from = ui.convertToNodeSpaceAR(top.worldPosition);
        const nextCount = board.trays[destIndex].items.length;
        const m = this.trayMetrics(board.trays[destIndex].cap);
        const fy = -m.slotH / 2 + 20 + TRAY_FOOD_H / 2 + nextCount * (TRAY_FOOD_H + TRAY_FOOD_GAP);
        const toWorld = trayNode.getComponent(UITransform)!.convertToWorldSpaceAR(new Vec3(0, fy, 0));
        const to = ui.convertToNodeSpaceAR(toWorld);

        const flyer = this.addSprite(root, 'Flyer', this.frameForFood(item), CARTON_W, CARTON_H, from.x, from.y, Color.WHITE);
        const land = new Vec3(TRAY_FOOD_W / CARTON_W, TRAY_FOOD_H / CARTON_H, 1);
        tween(flyer)
            .to(FLY_SEC, { position: new Vec3(to.x, to.y, 0), scale: land }, { easing: easing.cubicOut })
            .start();

        this.scheduleOnce(() => {
            if (flyer.isValid) flyer.destroy();
            this.commitPlace(col);
        }, FLY_SEC);
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
            this.render();
            this.showPlaceFail(result);
            return;
        }
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
                        if (win) {
                            this.scheduleOnce(() => this.playWinReward(), WIN_DELAY);
                        } else {
                            this.busy = false;
                            this.render();
                        }
                    })
                    .start();
                return;
            }
        }
        this.animateDoorIndex = null;
        if (win) {
            this.scheduleOnce(() => this.playWinReward(), WIN_DELAY);
        } else {
            this.holdWin = false;
            this.busy = false;
        }
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
            this.busy = false;
        }, 2.05);
    }

    private pulseSealedFridge(root: Node) {
        const board = this.board;
        const pack = new Node('PrideGlow');
        pack.layer = UI_2D;
        pack.setPosition(0, Y_TRAY, 0);
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

    private showPlaceFail(result: PlaceFail) {
        const id = this.board ? this.board.level.id : 0;
        const teachSwitch = result.reason === 'wrong_kind' && (id === 4 || id === 7) && this.firstKindToast;
        this.showToast(this.toastFor(result));
        this.flashTrays(result.hintTrays);
        if (teachSwitch) {
            this.holdHintTrays = result.hintTrays.slice();
            this.attachSwitchGuides();
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

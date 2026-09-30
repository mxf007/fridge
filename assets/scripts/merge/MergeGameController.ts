import {
    _decorator,
    BoxCollider2D,
    Button,
    CircleCollider2D,
    Color,
    Component,
    EventTouch,
    ERigidBody2DType,
    director,
    Director,
    Graphics,
    Input,
    Label,
    Layers,
    Node,
    PhysicsSystem2D,
    resources,
    RigidBody2D,
    Size,
    Sprite,
    SpriteFrame,
    sys,
    tween,
    UIOpacity,
    UITransform,
    Vec2,
    Vec3,
} from 'cc';
import { MergeBall } from './MergeBall';
import { playMergeSfx } from './MergeSfx';

const { ccclass } = _decorator;
const UI_2D = Layers.Enum.UI_2D;

const DESIGN_W = 720;
const DESIGN_H = 1280;
const BOARD_W = 620;
const BOARD_H = 850;
const BOARD_BOTTOM = -500;
const BOARD_TOP = BOARD_BOTTOM + BOARD_H;
const FAIL_Y = BOARD_TOP - 75;
const DROP_Y = BOARD_TOP + 75;
const WALL = 24;
const BEST_KEY = 'fridge_merge_best_score';

const CREAM = new Color(246, 239, 230, 255);
const WALNUT = new Color(107, 74, 58, 255);
const FRAME = new Color(176, 130, 96, 255);
const MILK = new Color(255, 253, 248, 255);
const CORAL = new Color(224, 122, 95, 255);
const SAGE = new Color(122, 158, 126, 255);

type FruitSpec = {
    name: string;
    radius: number;
    color: Color;
};

/** 首版用程序化占位图，后续只需把绘制函数替换成 SpriteFrame。 */
export const MERGE_FRUITS: readonly FruitSpec[] = [
    { name: '冬枣', radius: 27, color: new Color(198, 132, 62, 255) },
    { name: '草莓', radius: 34, color: new Color(230, 101, 92, 255) },
    { name: '李子', radius: 42, color: new Color(176, 92, 122, 255) },
    { name: '橙子', radius: 51, color: new Color(235, 151, 73, 255) },
    { name: '柠檬', radius: 61, color: new Color(239, 205, 87, 255) },
    { name: '猕猴桃', radius: 73, color: new Color(143, 154, 91, 255) },
    { name: '桃子', radius: 86, color: new Color(233, 149, 132, 255) },
    { name: '菠萝', radius: 100, color: new Color(219, 176, 82, 255) },
    { name: '椰子', radius: 116, color: new Color(148, 109, 81, 255) },
    { name: '哈密瓜', radius: 134, color: new Color(171, 190, 112, 255) },
    { name: '大西瓜', radius: 154, color: new Color(91, 151, 103, 255) },
];

@ccclass('MergeGameController')
export class MergeGameController extends Component {
    private board: Node | null = null;
    private current: MergeBall | null = null;
    private scoreLabel: Label | null = null;
    private bestLabel: Label | null = null;
    private nextLabel: Label | null = null;
    private nextIcon: Node | null = null;
    private gameOverLayer: Node | null = null;
    private closeCallback: (() => void) | null = null;
    private score = 0;
    private best = 0;
    private serial = 0;
    private spawnCount = 0;
    private nextLevel = 0;
    private inputLocked = false;
    private gameOver = false;
    private overflowSince = 0;
    private fruitFrames = new Map<string, SpriteFrame>();
    private burstFrame: SpriteFrame | null = null;
    private bgSprite: Sprite | null = null;
    private titleArt: Sprite | null = null;
    /** 水果图片层。和刚体分开，避免物理节点上的 Sprite 不绘制。 */
    private fruitLayer: Node | null = null;

    open(onClose: () => void): void {
        this.closeCallback = onClose;
        this.best = Number(sys.localStorage.getItem(BEST_KEY) || 0) || 0;
        this.buildView();
        this.startRound();
        this.loadMergeUiAssets();
    }

    onDestroy(): void {
        this.node.off(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
        director.off(Director.EVENT_AFTER_PHYSICS, this.syncFruitViews, this);
        this.unscheduleAllCallbacks();
    }

    requestMerge(a: MergeBall, b: MergeBall): void {
        if (this.gameOver || a === b || a.merging || b.merging || a.level !== b.level) return;
        // 与源玩法一致：较早生成的球保留并升级，较晚生成的球被合并。
        const keep = a.serial < b.serial ? a : b;
        const remove = keep === a ? b : a;
        if (!keep.node.isValid || !remove.node.isValid) return;

        // 碰撞回调处于 Box2D 步进锁内，不可立刻改刚体/销毁节点。
        keep.merging = true;
        remove.merging = true;
        this.scheduleOnce(() => this.applyMerge(keep, remove), 0);
    }

    private applyMerge(keep: MergeBall, remove: MergeBall): void {
        if (!keep.node?.isValid || !remove.node?.isValid) return;
        const next = keep.level + 1;
        // 源玩法按合并前等级计分（2、4、8……），不是按升级后的等级计分。
        const score = 2 ** (keep.level + 1);
        this.score += score;
        this.updateScore();
        playMergeSfx('merge');
        this.playBurst(keep.node.position, next);
        this.playBurst(remove.node.position, next);

        const midpoint = new Vec3(
            (keep.node.position.x + remove.node.position.x) / 2,
            (keep.node.position.y + remove.node.position.y) / 2,
            0,
        );
        this.destroyPhysicsNode(remove.node);

        if (next >= MERGE_FRUITS.length) {
            this.destroyPhysicsNode(keep.node);
            this.scheduleOnce(() => this.checkGameOverOrContinue(), 0.2);
            return;
        }

        keep.level = next;
        keep.node.setPosition(midpoint);
        this.paintBall(keep);
        keep.merging = false;
        const body = keep.getComponent(RigidBody2D);
        if (body && body.type === ERigidBody2DType.Dynamic) {
            body.linearVelocity = new Vec2(0, 0);
            body.angularVelocity = 0;
        }
    }

    /** 物理步进外再销毁；碰撞回调里不要直接调用。 */
    private destroyPhysicsNode(node: Node): void {
        if (!node?.isValid) return;
        const ball = node.getComponent(MergeBall);
        if (ball?.view?.isValid) ball.view.destroy();
        const body = node.getComponent(RigidBody2D);
        if (body) body.enabledContactListener = false;
        node.destroy();
    }

    private buildView(): void {
        const rootUi = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
        rootUi.setContentSize(DESIGN_W, DESIGN_H);
        this.node.layer = UI_2D;

        const bg = new Node('Background');
        bg.layer = UI_2D;
        bg.addComponent(UITransform).setContentSize(DESIGN_W, DESIGN_H);
        const bgSp = bg.addComponent(Sprite);
        bgSp.sizeMode = Sprite.SizeMode.CUSTOM;
        bgSp.color = Color.WHITE;
        this.bgSprite = bgSp;
        // 加载前先垫奶油底，避免闪空
        const fallback = bg.addComponent(Graphics);
        fallback.fillColor = CREAM;
        fallback.rect(-DESIGN_W / 2, -DESIGN_H / 2, DESIGN_W, DESIGN_H);
        fallback.fill();
        this.node.addChild(bg);

        const titleArt = new Node('TitleArt');
        titleArt.layer = UI_2D;
        titleArt.setPosition(-8, 614);
        titleArt.addComponent(UITransform).setContentSize(300, 52);
        const titleSprite = titleArt.addComponent(Sprite);
        titleSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        titleSprite.color = Color.WHITE;
        titleArt.active = false;
        this.titleArt = titleSprite;
        this.node.addChild(titleArt);
        this.addLabel(this.node, 'Title', '冰箱合合乐', 32, WALNUT, 280, 44, -20, 612);

        const scoreCard = this.scoreShelf();
        scoreCard.setPosition(-36, 548);
        this.node.addChild(scoreCard);
        this.addLabel(scoreCard, 'ScoreCaption', '本局', 16, SAGE, 150, 22, -92, 16);
        this.scoreLabel = this.addLabel(scoreCard, 'Score', '0', 32, CORAL, 150, 38, -92, -12).getComponent(Label);
        this.addLabel(scoreCard, 'BestCaption', '最高', 16, SAGE, 150, 22, 92, 16);
        this.bestLabel = this.addLabel(scoreCard, 'Best', String(this.best), 32, WALNUT, 150, 38, 92, -12).getComponent(Label);

        const nextToken = new Node('NextToken');
        nextToken.layer = UI_2D;
        nextToken.setPosition(286, 548);
        nextToken.addComponent(UITransform).setContentSize(96, 120);
        this.node.addChild(nextToken);
        const captionPlate = new Node('CaptionPlate');
        captionPlate.layer = UI_2D;
        captionPlate.setPosition(0, 58);
        captionPlate.addComponent(UITransform).setContentSize(76, 28);
        const plate = captionPlate.addComponent(Graphics);
        plate.fillColor = new Color(255, 253, 248, 235);
        plate.roundRect(-38, -14, 76, 28, 14);
        plate.fill();
        nextToken.addChild(captionPlate);
        const caption = this.addLabel(captionPlate, 'Caption', '下一个', 16, WALNUT, 72, 24, 0, 0);
        const captionLabel = caption.getComponent(Label);
        if (captionLabel) captionLabel.isBold = true;
        this.nextIcon = new Node('NextIcon');
        this.nextIcon.layer = UI_2D;
        this.nextIcon.addComponent(UITransform).setContentSize(80, 80);
        this.nextIcon.addComponent(Sprite).sizeMode = Sprite.SizeMode.CUSTOM;
        nextToken.addChild(this.nextIcon);
        this.nextLabel = this.addLabel(nextToken, 'Next', '', 18, WALNUT, 110, 24, 0, -52).getComponent(Label);

        const close = new Node('BtnClose');
        close.layer = UI_2D;
        close.setPosition(-312, 612);
        close.addComponent(UITransform).setContentSize(88, 88);
        const cg = close.addComponent(Graphics);
        cg.fillColor = MILK;
        cg.circle(0, 0, 40);
        cg.fill();
        cg.lineWidth = 2;
        cg.strokeColor = new Color(107, 74, 58, 48);
        cg.circle(0, 0, 40);
        cg.stroke();
        this.paintHomeIcon(close);
        close.on(Node.EventType.TOUCH_START, () => {
            tween(close).to(0.08, { scale: new Vec3(0.97, 0.97, 1) }).start();
        }, this);
        close.on(Node.EventType.TOUCH_CANCEL, () => {
            tween(close).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
        }, this);
        close.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            tween(close).to(0.08, { scale: new Vec3(1, 1, 1) }).start();
            playMergeSfx('click');
            this.closeMerge();
        }, this);
        this.node.addChild(close);

        this.board = new Node('Board');
        this.board.layer = UI_2D;
        this.board.addComponent(UITransform).setContentSize(BOARD_W, BOARD_H);
        this.board.setPosition(0, BOARD_BOTTOM + BOARD_H / 2);
        this.node.addChild(this.board);
        this.paintBoard();
        const views = new Node('FruitViews');
        views.layer = UI_2D;
        views.addComponent(UITransform).setContentSize(DESIGN_W, DESIGN_H);
        this.node.addChild(views);
        this.fruitLayer = views;

        this.node.on(Input.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Input.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Input.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Input.EventType.TOUCH_CANCEL, this.onTouchCancel, this);

        PhysicsSystem2D.instance.enable = true;
        // 与原项目一致：世界重力用引擎默认的 -320，松手时再把倍率提到 20。
        PhysicsSystem2D.instance.gravity = new Vec2(0, -320);
        director.on(Director.EVENT_AFTER_PHYSICS, this.syncFruitViews, this);
    }

    private paintBoard(): void {
        if (!this.board) return;
        const g = this.board.addComponent(Graphics);
        g.fillColor = new Color(255, 253, 248, 70);
        g.roundRect(-BOARD_W / 2, -BOARD_H / 2, BOARD_W, BOARD_H, 22);
        g.fill();
        g.strokeColor = FRAME;
        g.lineWidth = 6;
        g.roundRect(-BOARD_W / 2, -BOARD_H / 2, BOARD_W, BOARD_H, 22);
        g.stroke();

        const line = new Node('FailLine');
        line.layer = UI_2D;
        const lineUi = line.addComponent(UITransform);
        lineUi.setContentSize(BOARD_W - 34, 8);
        const lg = line.addComponent(Graphics);
        lg.strokeColor = new Color(CORAL.r, CORAL.g, CORAL.b, 150);
        lg.lineWidth = 4;
        lg.moveTo(-(BOARD_W - 34) / 2, 0);
        lg.lineTo((BOARD_W - 34) / 2, 0);
        lg.stroke();
        line.setPosition(0, FAIL_Y - (BOARD_BOTTOM + BOARD_H / 2));
        this.board.addChild(line);

        const floorTop = -BOARD_H / 2 + 4;
        const floorH = 520;
        this.addStaticWall('Floor', 0, floorTop - floorH / 2, BOARD_W + 80, floorH);
        const wallTop = DROP_Y - (BOARD_BOTTOM + BOARD_H / 2) + 80;
        const wallH = wallTop - (floorTop - 40);
        const wallY = (wallTop + floorTop - 40) / 2;
        this.addStaticWall('LeftWall', -BOARD_W / 2 + WALL / 2, wallY, WALL, wallH);
        this.addStaticWall('RightWall', BOARD_W / 2 - WALL / 2, wallY, WALL, wallH);
    }

    private addStaticWall(name: string, x: number, y: number, w: number, h: number): void {
        if (!this.board) return;
        const wall = new Node(name);
        wall.layer = UI_2D;
        wall.setPosition(x, y);
        wall.addComponent(UITransform).setContentSize(w, h);
        const body = wall.addComponent(RigidBody2D);
        body.type = ERigidBody2DType.Static;
        const collider = wall.addComponent(BoxCollider2D);
        collider.friction = 0.7;
        collider.restitution = 0.05;
        this.board.addChild(wall);
        collider.size = new Size(w, h);
        collider.apply();
    }

    private closeMerge(): void {
        const done = this.closeCallback;
        this.closeCallback = null;
        this.teardownPhysicsBodies();
        this.node.destroy();
        done?.();
    }

    private teardownPhysicsBodies(): void {
        this.unscheduleAllCallbacks();
        if (!this.board?.isValid) return;
        for (const child of [...this.board.children]) {
            if (child.getComponent(MergeBall) || child.getComponent(RigidBody2D)) {
                this.destroyPhysicsNode(child);
            }
        }
    }

    private startRound(): void {
        if (!this.board) return;
        this.unscheduleAllCallbacks();
        for (const child of [...this.board.children]) {
            if (child.getComponent(MergeBall)) this.destroyPhysicsNode(child);
        }
        this.gameOverLayer?.destroy();
        this.gameOverLayer = null;
        this.current = null;
        this.score = 0;
        this.spawnCount = 0;
        this.serial = 0;
        this.gameOver = false;
        this.overflowSince = 0;
        this.inputLocked = false;
        this.updateScore();
        this.chooseNext();
        this.spawnBall();
    }

    private chooseNext(): void {
        this.nextLevel = this.spawnCount < 2 ? 0 : Math.floor(Math.random() * 4);
        this.refreshNextPreview();
    }

    private refreshNextPreview(): void {
        const spec = MERGE_FRUITS[this.nextLevel];
        if (this.nextLabel) this.nextLabel.string = spec.name;
        const icon = this.nextIcon;
        if (!icon?.isValid) return;
        const number = this.nextLevel + 1;
        const frame = this.fruitFrames.get(`fruit_${number < 10 ? '0' : ''}${number}`);
        let sprite = icon.getComponent(Sprite);
        const textureReady = !!(frame?.texture && frame.texture.width > 0);
        if (textureReady && frame) {
            if (!sprite) sprite = icon.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.color = Color.WHITE;
            sprite.spriteFrame = frame;
            icon.getComponent(UITransform)?.setContentSize(80, 80);
            sprite.enabled = true;
            return;
        }
        if (sprite) sprite.enabled = false;
        let g = icon.getComponent(Graphics);
        if (!g) g = icon.addComponent(Graphics);
        g.enabled = true;
        g.clear();
        g.fillColor = spec.color;
        g.circle(0, 0, 24);
        g.fill();
    }

    private spawnBall(): void {
        if (!this.board || !this.fruitLayer || this.gameOver) return;
        const level = this.nextLevel;
        const spec = MERGE_FRUITS[level];
        const node = new Node('MergeFruit');
        node.layer = UI_2D;
        node.addComponent(UITransform).setContentSize(spec.radius * 2, spec.radius * 2);
        // 手里的水果先不要刚体。刚体默认是 Dynamic，一创建就会被物理写走，图跟着消失。
        this.board.addChild(node);
        node.setPosition(0, DROP_Y - (BOARD_BOTTOM + BOARD_H / 2));
        const ball = node.addComponent(MergeBall);
        ball.level = level;
        ball.serial = ++this.serial;
        ball.owner = this;
        const view = new Node('FruitView');
        view.layer = UI_2D;
        view.addComponent(UITransform);
        this.fruitLayer.addChild(view);
        ball.view = view;
        this.current = ball;
        this.paintBall(ball);
        this.placeFruitView(ball);
        this.spawnCount++;
        this.chooseNext();
        this.inputLocked = false;
    }

    /** 物理步进之后把图片挪到刚体位置。图片不挂在刚体节点上。 */
    private syncFruitViews(): void {
        if (!this.board?.isValid) return;
        for (const child of this.board.children) {
            const ball = child.getComponent(MergeBall);
            if (ball?.released) this.placeFruitView(ball);
        }
    }

    private placeFruitView(ball: MergeBall): void {
        const view = ball.view;
        if (!view?.isValid || !ball.node?.isValid || !this.board) return;
        const boardPos = this.board.position;
        const fruitPos = ball.node.position;
        view.setPosition(boardPos.x + fruitPos.x, boardPos.y + fruitPos.y, 0);
        view.setRotation(ball.node.rotation);
    }

    /** 松手后才挂刚体。节点先关掉，避免刚体按默认 Dynamic 在 onLoad 里生成。 */
    private armPhysics(ball: MergeBall): void {
        const node = ball.node;
        const spec = MERGE_FRUITS[ball.level];
        const pos = node.position.clone();
        node.active = false;
        const body = node.addComponent(RigidBody2D);
        body.type = ERigidBody2DType.Dynamic;
        body.gravityScale = 20;
        body.enabledContactListener = true;
        body.fixedRotation = false;
        body.bullet = true;
        body.linearDamping = 0.99;
        body.angularDamping = 0;
        const collider = node.addComponent(CircleCollider2D);
        collider.radius = spec.radius;
        collider.density = 1;
        collider.friction = 0.7;
        collider.restitution = 0.08;
        node.active = true;
        node.setPosition(pos);
        collider.apply();
        ball.bindContact();
        body.wakeUp();
    }

    private paintBall(ball: MergeBall): void {
        const spec = MERGE_FRUITS[ball.level];
        const collider = ball.node.getComponent(CircleCollider2D);
        if (collider) {
            collider.radius = spec.radius;
            collider.apply();
        }
        const view = ball.view;
        if (!view?.isValid) return;
        const size = spec.radius * 2;
        const ui = view.getComponent(UITransform);
        ui?.setContentSize(size, size);
        const number = ball.level + 1;
        const frame = this.fruitFrames.get(`fruit_${number < 10 ? '0' : ''}${number}`);
        let icon = view.getChildByName('Icon');
        if (!icon) {
            icon = new Node('Icon');
            icon.layer = view.layer;
            icon.addComponent(UITransform);
            view.addChild(icon);
        }
        const art = size;
        const iconUi = icon.getComponent(UITransform);
        iconUi?.setContentSize(art, art);
        let sprite = icon.getComponent(Sprite);
        const textureReady = !!(frame?.texture && frame.texture.width > 0);
        if (textureReady && frame) {
            if (!sprite) sprite = icon.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.color = Color.WHITE;
            sprite.spriteFrame = frame;
            iconUi?.setContentSize(art, art);
            sprite.markForUpdateRenderData(true);
            sprite.enabled = true;
        } else if (sprite) {
            sprite.enabled = false;
        }
        let g = view.getComponent(Graphics);
        if (!textureReady) {
            if (!g) g = view.addComponent(Graphics);
            g.enabled = true;
            g.clear();
            g.fillColor = spec.color;
            g.circle(0, 0, spec.radius - 2);
            g.fill();
        } else if (g) {
            g.enabled = false;
        }

        let labelNode = view.getChildByName('FruitName');
        if (!labelNode) {
            labelNode = this.addLabel(view, 'FruitName', '', Math.max(16, Math.min(28, spec.radius * 0.34)), MILK, spec.radius * 1.7, 38, 0, 0);
        }
        const label = labelNode.getComponent(Label);
        if (label) {
            label.string = spec.name;
            label.fontSize = Math.max(15, Math.min(26, Math.round(spec.radius * 0.34)));
        }
        labelNode.active = !frame;
    }

    /** 原项目 boom：白星染色、0.1 秒放大、0.2 秒淡出。音效是 boom.mp3。 */
    private playBurst(at: Vec3, resultLevel: number): void {
        if (!this.board?.isValid) return;
        const colors = [
            new Color(131, 46, 118, 255),
            new Color(255, 54, 39, 255),
            new Color(232, 143, 32, 255),
            new Color(246, 235, 28, 255),
            new Color(121, 223, 31, 255),
            new Color(218, 86, 77, 255),
            new Color(243, 210, 114, 255),
            new Color(243, 219, 40, 255),
            new Color(253, 251, 231, 255),
            new Color(217, 53, 58, 255),
            new Color(108, 205, 46, 255),
        ];
        const tint = colors[Math.max(0, Math.min(colors.length - 1, resultLevel - 1))];
        const spec = MERGE_FRUITS[Math.max(0, Math.min(MERGE_FRUITS.length - 1, resultLevel))];
        const size = Math.round(spec.radius * 2.2);
        const node = new Node('MergeBurst');
        node.layer = UI_2D;
        node.setPosition(at);
        const ui = node.addComponent(UITransform);
        ui.setContentSize(size, size);
        const opacity = node.addComponent(UIOpacity);
        opacity.opacity = 255;
        if (this.burstFrame) {
            const sprite = node.addComponent(Sprite);
            sprite.sizeMode = Sprite.SizeMode.CUSTOM;
            sprite.spriteFrame = this.burstFrame;
            ui.setContentSize(size, size);
            sprite.color = tint;
        } else {
            const g = node.addComponent(Graphics);
            g.fillColor = tint;
            g.circle(0, 0, size * 0.35);
            g.fill();
        }
        this.board.addChild(node);
        node.setScale(0.65, 0.65, 1);
        tween(node).to(0.1, { scale: new Vec3(1, 1, 1) }).start();
        tween(opacity).delay(0.1).to(0.2, { opacity: 0 }).call(() => {
            if (node.isValid) node.destroy();
        }).start();
    }

    /** 食材贴图 + 背景同一目录加载；背景图缺失时保留奶油垫底。 */
    private loadMergeUiAssets(): void {
        resources.loadDir('merge/ui', SpriteFrame, (error, frames) => {
            if (error || !this.node.isValid) {
                console.warn('[merge] loadDir merge/ui failed', error);
                this.loadBackgroundFallback();
                return;
            }
            let bgFrame: SpriteFrame | null = null;
            let titleFrame: SpriteFrame | null = null;
            for (const frame of frames) {
                const name = frame.name || '';
                const fruit = name.match(/fruit_\d{2}/);
                if (fruit) this.fruitFrames.set(fruit[0], frame);
                if (/merge_bg/i.test(name)) bgFrame = frame;
                if (/merge_burst/i.test(name)) this.burstFrame = frame;
                if (/merge_title/i.test(name)) titleFrame = frame;
            }
            if (this.board) {
                for (const child of this.board.children) {
                    const ball = child.getComponent(MergeBall);
                    if (ball) this.paintBall(ball);
                }
            }
            if (bgFrame) this.applyBackground(bgFrame);
            else this.loadBackgroundFallback();
            if (titleFrame) this.applyTitle(titleFrame);
            this.refreshNextPreview();
        });
    }

    private loadBackgroundFallback(): void {
        const paths = ['merge/ui/merge_bg', 'merge/ui/merge_bg/spriteFrame'];
        const tryLoad = (i: number) => {
            if (i >= paths.length) {
                console.warn('[merge] merge_bg not found under resources/merge/ui');
                return;
            }
            resources.load(paths[i], SpriteFrame, (error, frame) => {
                if (!error && frame && this.node.isValid) {
                    this.applyBackground(frame);
                    return;
                }
                tryLoad(i + 1);
            });
        };
        tryLoad(0);
    }

    private applyBackground(frame: SpriteFrame): void {
        if (!this.bgSprite?.isValid) return;
        this.bgSprite.spriteFrame = frame;
        this.bgSprite.sizeMode = Sprite.SizeMode.CUSTOM;
        const ui = this.bgSprite.node.getComponent(UITransform);
        ui?.setContentSize(DESIGN_W, DESIGN_H);
        const fallback = this.bgSprite.node.getComponent(Graphics);
        if (fallback) fallback.enabled = false;
        // 保证背景在最底层
        this.bgSprite.node.setSiblingIndex(0);
    }

    private applyTitle(frame: SpriteFrame): void {
        const sprite = this.titleArt;
        if (!sprite?.isValid) return;
        const ui = sprite.node.getComponent(UITransform);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frame;
        ui?.setContentSize(300, 52);
        sprite.node.active = true;
        const label = this.node.getChildByName('Title');
        if (label) label.active = false;
    }

    lateUpdate(): void {
        if (!this.board?.isValid) return;
        const floorTop = -BOARD_H / 2 + 4;
        for (const child of this.board.children) {
            const ball = child.getComponent(MergeBall);
            if (!ball || ball.merging || !child.isValid) continue;
            const radius = MERGE_FRUITS[ball.level].radius;
            const minY = floorTop + radius + 1;
            if (child.position.y >= minY) continue;
            const body = child.getComponent(RigidBody2D);
            if (!body || !body.enabled || body.type !== ERigidBody2DType.Dynamic) continue;
            const velocity = body.linearVelocity;
            if (velocity.y < 0) body.linearVelocity = new Vec2(velocity.x, 0);
        }
    }

    private onTouchStart(event: EventTouch): void {
        if (!this.current || this.inputLocked || this.gameOver) return;
        this.moveCurrent(event);
    }

    private onTouchMove(event: EventTouch): void {
        if (!this.current || this.inputLocked || this.gameOver) return;
        this.moveCurrent(event);
    }

    private onTouchEnd(event: EventTouch): void {
        if (!this.current || this.inputLocked || this.gameOver) return;
        this.moveCurrent(event);
        this.armPhysics(this.current);
        this.current.released = true;
        this.placeFruitView(this.current);
        this.current = null;
        this.inputLocked = true;
        playMergeSfx('drop');
        this.scheduleOnce(() => this.checkGameOverOrContinue(), 0.45);
    }

    private onTouchCancel(): void {
        // 取消触摸不投放，保持当前球等待下一次操作。
    }

    private moveCurrent(event: EventTouch): void {
        if (!this.current || !this.board) return;
        const p = event.getUILocation();
        const local = this.board.getComponent(UITransform)?.convertToNodeSpaceAR(new Vec3(p.x, p.y));
        if (!local) return;
        const radius = MERGE_FRUITS[this.current.level].radius;
        const min = -BOARD_W / 2 + WALL + radius;
        const max = BOARD_W / 2 - WALL - radius;
        this.current.node.setPosition(Math.max(min, Math.min(max, local.x)), DROP_Y - (BOARD_BOTTOM + BOARD_H / 2));
        this.placeFruitView(this.current);
    }

    private checkGameOverOrContinue(): void {
        if (!this.board || this.gameOver) return;
        const lineLocalY = FAIL_Y - (BOARD_BOTTOM + BOARD_H / 2);
        let fallingThrough = false;
        let restingOver = false;
        for (const node of this.board.children) {
            const ball = node.getComponent(MergeBall);
            if (!ball || !ball.released || ball.merging || !node.isValid || ball === this.current) continue;
            const body = node.getComponent(RigidBody2D);
            if (!body || body.type !== ERigidBody2DType.Dynamic) continue;
            const radius = MERGE_FRUITS[ball.level].radius;
            if (node.position.y + radius < lineLocalY) continue;
            // linearVelocity 是米/秒，32 像素为 1 米。按像素比，下落中的水果才会被算成还在动。
            const velocity = body.linearVelocity;
            const moving = Math.hypot(velocity.x, velocity.y) * 32 > 30;
            if (moving) fallingThrough = true;
            else restingOver = true;
        }
        if (restingOver) {
            if (this.overflowSince <= 0) this.overflowSince = Date.now();
            if (Date.now() - this.overflowSince >= 1000) {
                this.finishRound();
                return;
            }
            this.scheduleOnce(() => this.checkGameOverOrContinue(), 0.25);
            return;
        }
        this.overflowSince = 0;
        if (fallingThrough) {
            this.scheduleOnce(() => this.checkGameOverOrContinue(), 0.25);
            return;
        }
        this.spawnBall();
    }

    private finishRound(): void {
        this.gameOver = true;
        this.inputLocked = true;
        this.current = null;
        if (this.score > this.best) {
            this.best = this.score;
            sys.localStorage.setItem(BEST_KEY, String(this.best));
        }
        this.updateScore();
        playMergeSfx('gameOver');

        const layer = new Node('GameOverLayer');
        layer.layer = UI_2D;
        layer.addComponent(UITransform).setContentSize(DESIGN_W, DESIGN_H);
        const dim = layer.addComponent(Graphics);
        dim.fillColor = new Color(61, 50, 41, 150);
        dim.rect(-DESIGN_W / 2, -DESIGN_H / 2, DESIGN_W, DESIGN_H);
        dim.fill();
        this.node.addChild(layer);
        this.gameOverLayer = layer;

        const panel = this.roundRectNode('Panel', 530, 330, CREAM, 34, FRAME, 4);
        panel.setPosition(0, 20);
        layer.addChild(panel);
        this.addLabel(panel, 'Title', '冰箱装满啦', 40, WALNUT, 440, 58, 0, 100);
        this.addLabel(panel, 'Score', `本局 ${this.score}　最高 ${this.best}`, 28, SAGE, 450, 48, 0, 35);
        const again = this.roundRectNode('BtnAgain', 300, 82, CORAL, 30, new Color(184, 87, 67, 255), 3);
        again.setPosition(0, -75);
        again.addComponent(Button);
        this.addLabel(again, 'Label', '再合一次', 30, MILK, 260, 48, 0, 0);
        again.on(Node.EventType.TOUCH_END, (event: EventTouch) => {
            event.propagationStopped = true;
            playMergeSfx('click');
            this.startRound();
        }, this);
        panel.addChild(again);
    }

    private updateScore(): void {
        if (this.score > this.best) this.best = this.score;
        if (this.scoreLabel) this.scoreLabel.string = String(this.score);
        if (this.bestLabel) this.bestLabel.string = String(this.best);
    }

    private rectNode(name: string, w: number, h: number, color: Color, radius: number): Node {
        const node = new Node(name);
        node.layer = UI_2D;
        node.addComponent(UITransform).setContentSize(w, h);
        const g = node.addComponent(Graphics);
        g.fillColor = color;
        if (radius > 0) g.roundRect(-w / 2, -h / 2, w, h, radius);
        else g.rect(-w / 2, -h / 2, w, h);
        g.fill();
        return node;
    }

    private roundRectNode(name: string, w: number, h: number, fill: Color, radius: number, stroke: Color, lineWidth: number): Node {
        const node = this.rectNode(name, w, h, fill, radius);
        const g = node.getComponent(Graphics);
        if (g) {
            g.strokeColor = stroke;
            g.lineWidth = lineWidth;
            g.roundRect(-w / 2, -h / 2, w, h, radius);
            g.stroke();
        }
        return node;
    }

    /** 本局和最高并排的胶囊，让开中间的投放位。 */
    private scoreShelf(): Node {
        const w = 392;
        const h = 78;
        const node = new Node('ScoreShelf');
        node.layer = UI_2D;
        node.addComponent(UITransform).setContentSize(w, h);
        const g = node.addComponent(Graphics);
        g.fillColor = new Color(61, 50, 41, 36);
        g.roundRect(-w / 2, -h / 2 - 4, w, h, h / 2);
        g.fill();
        g.fillColor = new Color(255, 253, 248, 236);
        g.roundRect(-w / 2, -h / 2, w, h, h / 2);
        g.fill();
        g.strokeColor = FRAME;
        g.lineWidth = 3;
        g.roundRect(-w / 2, -h / 2, w, h, h / 2);
        g.stroke();
        g.strokeColor = new Color(176, 130, 96, 90);
        g.lineWidth = 2;
        g.moveTo(0, -18);
        g.lineTo(0, 18);
        g.stroke();
        return node;
    }

    /** 与对局顶栏回主页相同：奶油圆钮 + 小屋。 */
    private paintHomeIcon(btn: Node): void {
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

    private addLabel(
        parent: Node,
        name: string,
        text: string,
        size: number,
        color: Color,
        w: number,
        h: number,
        x: number,
        y: number,
    ): Node {
        const node = new Node(name);
        node.layer = UI_2D;
        node.addComponent(UITransform).setContentSize(w, h);
        node.setPosition(x, y);
        const label = node.addComponent(Label);
        label.string = text;
        label.fontSize = size;
        label.lineHeight = Math.round(size * 1.25);
        label.color = color;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.overflow = Label.Overflow.SHRINK;
        label.enableWrapText = false;
        label.useSystemFont = true;
        label.fontFamily = 'Microsoft YaHei';
        label.isBold = false;
        label.isItalic = false;
        parent.addChild(node);
        return node;
    }
}

/** 从今晚冰箱主页打开独立合成层。 */
export function openMergeGame(parent: Node, onClose: () => void): void {
    const old = parent.getChildByName('MergeGameRoot');
    if (old?.isValid) {
        for (const body of old.getComponentsInChildren(RigidBody2D)) {
            body.enabledContactListener = false;
        }
        old.destroy();
    }
    const root = new Node('MergeGameRoot');
    root.layer = UI_2D;
    root.addComponent(UITransform).setContentSize(DESIGN_W, DESIGN_H);
    parent.addChild(root);
    root.addComponent(MergeGameController).open(onClose);
}

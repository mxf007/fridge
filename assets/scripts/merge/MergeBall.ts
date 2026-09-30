import {
    _decorator,
    CircleCollider2D,
    Collider2D,
    Component,
    Contact2DType,
    Node,
    RigidBody2D,
} from 'cc';

const { ccclass } = _decorator;

export interface MergeBallOwner {
    requestMerge(a: MergeBall, b: MergeBall): void;
}

/**
 * 挂在球节点上的最小碰撞桥。
 * 源项目的 Ball 同时依赖全局资源、消息总线与对象池，这里仅保留同级合成。
 * Cocos 要求每个脚本文件最多一个 @ccclass，因此与控制器分文件。
 */
@ccclass('MergeBall')
export class MergeBall extends Component {
    level = 0;
    serial = 0;
    merging = false;
    /** 已经松手放下。手里待投的球不参与越线结算。 */
    released = false;
    owner: MergeBallOwner | null = null;
    /** 显示节点。不能挂在刚体节点下面，否则 UI 不绘制。 */
    view: Node | null = null;

    onLoad(): void {
        this.bindContact();
    }

    bindContact(): void {
        const collider = this.getComponent(CircleCollider2D);
        if (!collider) return;
        collider.off(Contact2DType.BEGIN_CONTACT, this.onContact, this);
        collider.on(Contact2DType.BEGIN_CONTACT, this.onContact, this);
    }

    onDestroy(): void {
        const collider = this.getComponent(CircleCollider2D);
        collider?.off(Contact2DType.BEGIN_CONTACT, this.onContact, this);
    }

    private onContact(_self: Collider2D, other: Collider2D): void {
        const peer = other.getComponent(MergeBall);
        if (!peer || !this.owner || peer.owner !== this.owner) return;
        // 原项目：两颗水果一碰上，重力倍率从 20 降到 2，堆叠不再猛砸。
        const body = this.getComponent(RigidBody2D);
        if (body && body.gravityScale !== 2) body.gravityScale = 2;
        this.owner.requestMerge(this, peer);
    }
}

# 切图目录 `docs/ui_cuts`

**不要从整屏效果图裁。** 效果图只定气质；进包资源用「一件一图 + 品红底去背」。

## 当前可用（已去背）

| 目录 | 文件 | 规格 | 用途 |
|------|------|------|------|
| `food/` | milk / veg / fruit / meat / sauce / leftover | 256² | 冰箱格里的黏土道具 |
| `bag/` | bag_milk 等 6 张 | 256² | 购物袋方砖，列对齐叠放 |
| `board/` | tray_empty / tray_sealed | 200×280 | 空槽、封盒 |
| `board/` | tray_lid | 200×80 | Coral 薄盖，封格时落下 |
| `board/` | buffer_slot | 160×160 | Milk 方盘 |
| `board/` | buffer_board | 720×220 | 胡桃木底板，上排叠 3 槽 |
| `ui/` | btn_primary / btn_secondary | 624×96 | 主按钮、描边次按钮 |
| `ui/` | icon_undo / icon_hint | 80² | 回箭头、灯泡 |
| `_iso/` | 去背前的品红底原图 | — | 方便重抠 |

同名文件在 `assets/ui/`，用 Cocos 3.8.3 打开会导入。

重做去背：`python tools/matte_iso_sprites.py`

选中描边、提示虚线、失败闪红仍用代码画，不出图。

## 为什么不用整图裁切

整屏效果图里物体叠在一起、有投影和标签，裁出来会带邻居和碎边。正确做法是每个道具单独生成在 **#FF00E5 品红底** 上，再按色度去背。

## 和 VberAI 的关系

VberAI Studio 才是「生成 → 画布拆层 → Super Matting → 推进 Cocos」的完整链。本仓库 Cursor 会话 **没有接入 VberAI MCP**，所以现在用本地一件一图代替。

要接到 VberAI：

1. 在 [vberai.com](https://vberai.com/) 下载 **Cocos Creator 3.x MCP**
2. 用 3.8.3 打开本项目 → 扩展管理器导入并激活
3. 启动 MCP Server（默认 3000）→ Quick configure → Cursor
4. 之后可在 Studio 里生图、抠图，再同步进 `assets/ui/`

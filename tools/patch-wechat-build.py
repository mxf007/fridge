"""打完微信小游戏包后执行一次。

Cocos 3.8.3 分离引擎会重新生成 build/wechatgame。
这个脚本补上两处构建面板写不进去的设置：

- game.json 里给官方引擎插件加上 path，这个目录不计入 4MB 主包
- 关掉 ES6 转译和增强编译，避免插件脚本去找 @babel/runtime
- 删掉未启用的 spine wasm，主包仍超 4MB 时再收构建结果里的两张背景
- 用 build-templates/wechatgame/first-screen.js 覆盖首屏（Cream 占位，无 Cocos logo、无黑屏）

不移动物理脚本，不分包。可重复执行。

用法：双击 tools/patch-wechat-build.bat
"""

from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build" / "wechatgame"
PLUGIN_DIR = "cocos"
LIMIT_BYTES = 4 * 1024 * 1024
# 留一点余量，微信统计通常比磁盘少几十 KB，目标仍要低于 4096。
TARGET_BYTES = 4000 * 1024
BACKGROUNDS = (
    ("b4d8e2a0-6c19-4f3b-91d7-5e8a0c2f4b63", "对局背景", "median"),
    ("e3b7c4a1-5d28-4f6e-9b13-8a0c2d7e1f45", "主页背景", "adaptive"),
)
PROVIDER = "wx0446ba2621dda60a"
ENGINE_VERSION = "3.8.3"

LOCAL_FILES = (
    "cc.js",
    "animation.js",
    "animation-component-142ba6e9.js",
    "physics-2d-box2d.js",
    "physics-2d-framework.js",
    "index-fd5c57ca.js",
)
FIRST_SCREEN_TEMPLATE = ROOT / "build-templates" / "wechatgame" / "first-screen.js"


def main() -> int:
    if not BUILD.is_dir():
        print(f"找不到构建目录：{BUILD}")
        print("先在 Cocos 里构建微信小游戏。")
        return 1

    plugin = BUILD / PLUGIN_DIR / "plugin.json"
    cc_js = BUILD / "cocos-js" / "cc.js"
    if not plugin.is_file() or not cc_js.is_file():
        print("这次构建没有分离引擎。")
        print("请在 Cocos 构建面板勾选「分离引擎」，重新构建后再执行本脚本。")
        return 1
    if cc_js.stat().st_size > 200_000:
        print("cocos-js/cc.js 仍是整份引擎，分离引擎没有生效。")
        return 1

    patch_game_json()
    patch_project_config()
    patch_first_screen()
    patch_import_map()
    drop_unused_spine_wasm()
    shrink_backgrounds_if_needed()
    missing = missing_local_files()
    main_bytes = main_package_bytes()
    main_kb = round(main_bytes / 1024)

    print(f"主包（不含 {PLUGIN_DIR}/ 插件目录）{main_kb} KB，上限 4096 KB")
    if missing:
        print("本地引擎文件缺失：")
        for name in missing:
            print(f"  cocos-js/{name}")
        return 1
    if main_bytes > LIMIT_BYTES:
        print(f"仍超出 {main_kb - 4096} KB。体积最大的文件：")
        for size, rel in largest_main_files(8):
            print(f"  {round(size / 1024):5} KB  {rel}")
        return 1
    print("可以真机调试。")
    return 0


def patch_game_json() -> None:
    path = BUILD / "game.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    cocos = data.setdefault("plugins", {}).setdefault("cocos", {})
    cocos["version"] = cocos.get("version") or ENGINE_VERSION
    cocos["provider"] = PROVIDER
    before = cocos.get("path")
    cocos["path"] = PLUGIN_DIR
    path.write_text(json.dumps(data, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
    if before == PLUGIN_DIR:
        print("game.json 插件目录已是 cocos")
    else:
        print("game.json 已把官方引擎目录标为插件，不计入主包")


def patch_first_screen() -> None:
    if not FIRST_SCREEN_TEMPLATE.is_file():
        print("缺少 build-templates/wechatgame/first-screen.js")
        return
    content = FIRST_SCREEN_TEMPLATE.read_text(encoding="utf-8")
    hits = sorted(BUILD.glob("first-screen*.js"))
    if not hits:
        print("构建包里没有 first-screen.js，请在 Cocos 里重新构建微信小游戏")
        return
    changed: list[str] = []
    for path in hits:
        if path.read_text(encoding="utf-8") != content:
            path.write_text(content, encoding="utf-8")
            changed.append(path.name)
    if changed:
        print("已更新首屏 Cream 占位：" + ", ".join(changed))
    else:
        print("首屏已是 Cream 占位（无 Cocos logo）")


def patch_project_config() -> None:
    path = BUILD / "project.config.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    setting = data.setdefault("setting", {})
    changed = setting.get("es6") is not False or setting.get("enhance") is not False
    setting["es6"] = False
    setting["enhance"] = False
    path.write_text(json.dumps(data, ensure_ascii=False, indent=4) + "\n", encoding="utf-8")
    if changed:
        print("project.config.json 已关闭 ES6 转译和增强编译")
    else:
        print("project.config.json 增强编译已关闭")


def patch_import_map() -> None:
    path = BUILD / "src" / "import-map.js"
    if not path.is_file():
        print("没有 src/import-map.js")
        return
    text = path.read_text(encoding="utf-8")
    old = '"cc": "plugin:cocos/cc.js"'
    new = '"cc": "./../cocos-js/cc.js"'
    if old not in text:
        return
    path.write_text(text.replace(old, new, 1), encoding="utf-8")
    print("import-map.js 已改回本地 cc.js")


def drop_unused_spine_wasm() -> None:
    cc_text = (BUILD / "cocos-js" / "cc.js").read_text(encoding="utf-8", errors="ignore")
    if "spine" in cc_text:
        return
    assets = BUILD / "cocos-js" / "assets"
    if not assets.is_dir():
        return
    for wasm in assets.glob("spine-*.wasm"):
        size = wasm.stat().st_size
        wasm.unlink()
        print(f"已去掉未启用的 spine wasm {round(size / 1024)} KB")


def shrink_backgrounds_if_needed() -> None:
    if main_package_bytes() <= TARGET_BYTES:
        return
    try:
        from PIL import Image
    except ImportError:
        print("没有 Pillow，背景图无法再收。")
        return
    for uuid, label, mode in BACKGROUNDS:
        if main_package_bytes() <= TARGET_BYTES:
            return
        for file in BUILD.rglob(uuid + ".png"):
            if file.relative_to(BUILD).parts[0] == PLUGIN_DIR:
                continue
            before = file.stat().st_size
            image = Image.open(file).convert("RGB")
            if mode == "adaptive":
                quantized = image.convert("RGBA").convert("P", palette=Image.Palette.ADAPTIVE, colors=192)
            else:
                quantized = image.quantize(
                    colors=192,
                    method=Image.Quantize.MEDIANCUT,
                    dither=Image.Dither.FLOYDSTEINBERG,
                )
            handle = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
            temp = Path(handle.name)
            handle.close()
            try:
                quantized.save(temp, optimize=True)
                after = temp.stat().st_size
                if after < before - 4096:
                    file.write_bytes(temp.read_bytes())
                    print(f"{label} {round(before / 1024)} KB -> {round(after / 1024)} KB")
            finally:
                temp.unlink(missing_ok=True)


def missing_local_files() -> list[str]:
    missing: list[str] = []
    base = BUILD / "cocos-js"
    for name in LOCAL_FILES:
        file = base / name
        if not file.is_file():
            missing.append(name)
            continue
        if name == "physics-2d-box2d.js" and file.stat().st_size < 100_000:
            missing.append(name + "（文件过小，不是完整物理模块）")
    return missing


def main_package_bytes() -> int:
    total = 0
    for file in BUILD.rglob("*"):
        if not file.is_file():
            continue
        rel = file.relative_to(BUILD)
        if rel.parts and rel.parts[0] == PLUGIN_DIR:
            continue
        total += file.stat().st_size
    return total


def largest_main_files(limit: int) -> list[tuple[int, str]]:
    rows: list[tuple[int, str]] = []
    for file in BUILD.rglob("*"):
        if not file.is_file():
            continue
        rel = file.relative_to(BUILD)
        if rel.parts and rel.parts[0] == PLUGIN_DIR:
            continue
        rows.append((file.stat().st_size, rel.as_posix()))
    rows.sort(reverse=True)
    return rows[:limit]


if __name__ == "__main__":
    sys.exit(main())

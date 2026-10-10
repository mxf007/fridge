# Cut bx_title from pure white source with GIMP corner flood + soft edge export.

from __future__ import annotations

import os
import shutil

import gi

gi.require_version("Gimp", "3.0")
gi.require_version("Gegl", "0.4")
from gi.repository import Gegl, Gimp, Gio

SRC = r"F:/fridge/tools/_bx_title_white_src.jpg"
DST = r"F:/fridge/assets/ui/scene/bx_title.png"
PREVIEW = r"F:/fridge/tools/_bx_title_gimp_preview.png"


def main() -> None:
    Gegl.init(None)
    image = Gimp.file_load(Gimp.RunMode.NONINTERACTIVE, Gio.File.new_for_path(SRC))
    layer = image.get_selected_layers()[0]
    if not layer.has_alpha():
        layer.add_alpha()

    Gimp.context_set_antialias(True)
    Gimp.context_set_feather(True)
    Gimp.context_set_feather_radius(0.8, 0.8)
    Gimp.context_set_sample_criterion(Gimp.SelectCriterion.COMPOSITE)
    Gimp.context_set_sample_transparent(False)
    Gimp.context_set_sample_threshold(0.08)

    Gimp.Selection.none(image)
    w = image.get_width()
    h = image.get_height()
    seeds = []
    for x in (1.5, w * 0.25, w * 0.5, w * 0.75, w - 2.5):
        seeds.append((float(x), 1.5))
        seeds.append((float(x), float(h - 2.5)))
    for y in (1.5, h * 0.5, h - 2.5):
        seeds.append((1.5, float(y)))
        seeds.append((float(w - 2.5), float(y)))

    first = True
    for x, y in seeds:
        op = Gimp.ChannelOps.REPLACE if first else Gimp.ChannelOps.ADD
        image.select_contiguous_color(op, layer, x, y)
        first = False

    layer.edit_clear()
    Gimp.Selection.none(image)

    try:
        image.autocrop(layer)
    except Exception as exc:
        print("autocrop failed:", exc)

    Gimp.file_save(Gimp.RunMode.NONINTERACTIVE, image, Gio.File.new_for_path(DST), None)
    Gimp.file_save(Gimp.RunMode.NONINTERACTIVE, image, Gio.File.new_for_path(PREVIEW), None)
    print(f"OK {image.get_width()}x{image.get_height()} -> {DST}")


main()
print("GIMP_CUT_DONE")

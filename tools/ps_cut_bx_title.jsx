#target photoshop
// Cut 「今晚冰箱」from white JPG via Magic Wand, export transparent PNG.

app.bringToFront();
app.displayDialogs = DialogModes.NO;
preferences.rulerUnits = Units.PIXELS;

var SRC = new File("F:/fridge/tools/_bx_title_white_src.jpg");
var DST = new File("F:/fridge/assets/ui/scene/bx_title.png");
var PREVIEW = new File("F:/fridge/tools/_bx_title_ps_preview.png");
var LOG = new File("F:/fridge/tools/_ps_cut_bx_title.log");

function log(msg) {
    LOG.open("a");
    LOG.writeln(new Date().toString() + "  " + msg);
    LOG.close();
}

function magicWand(x, y, tolerance, antialias, contiguous, addTo) {
    var desc = new ActionDescriptor();
    var ref = new ActionReference();
    ref.putProperty(charIDToTypeID("Chnl"), charIDToTypeID("fsel"));
    desc.putReference(charIDToTypeID("null"), ref);

    var pt = new ActionDescriptor();
    pt.putUnitDouble(charIDToTypeID("Hrzn"), charIDToTypeID("#Pxl"), x);
    pt.putUnitDouble(charIDToTypeID("Vrtc"), charIDToTypeID("#Pxl"), y);
    desc.putObject(charIDToTypeID("T   "), charIDToTypeID("Pnt "), pt);

    desc.putInteger(charIDToTypeID("Tlrn"), tolerance);
    desc.putBoolean(charIDToTypeID("AntA"), antialias);
    desc.putBoolean(charIDToTypeID("Cntg"), contiguous);
    // addToSelection when true
    try {
        desc.putBoolean(stringIDToTypeID("addToSelection"), !!addTo);
    } catch (e) {}

    var eventId = addTo ? charIDToTypeID("AddT") : charIDToTypeID("setd");
    if (addTo) {
        // Add to selection via setd + addToSelection flag (CS6)
        eventId = charIDToTypeID("setd");
        desc.putEnumerated(
            stringIDToTypeID("selectionModifier"),
            stringIDToTypeID("selectionModifierType"),
            stringIDToTypeID("addToSelection")
        );
    }
    executeAction(eventId, desc, DialogModes.NO);
}

function savePNG(doc, file) {
    var opt = new PNGSaveOptions();
    opt.compression = 9;
    opt.interlaced = false;
    doc.saveAs(file, opt, true, Extension.LOWERCASE);
}

try {
    if (LOG.exists) LOG.remove();
    log("start");
    if (!SRC.exists) {
        throw new Error("missing src: " + SRC.fsName);
    }

    var doc = app.open(SRC);
    var layer = doc.activeLayer;
    if (layer.isBackgroundLayer) {
        layer.isBackgroundLayer = false;
    }

    // Contiguous flood from edges first (safe), then fill holes with non-contiguous white pick.
    var w = doc.width.value;
    var h = doc.height.value;
    var tol = 18;

    magicWand(2, 2, tol, true, true, false);
    magicWand(w - 3, 2, tol, true, true, true);
    magicWand(2, h - 3, tol, true, true, true);
    magicWand(w - 3, h - 3, tol, true, true, true);
    magicWand(Math.floor(w / 2), 2, tol, true, true, true);
    magicWand(Math.floor(w / 2), h - 3, tol, true, true, true);

    // Non-contiguous: catch white pockets inside characters without eating cream.
    magicWand(2, 2, 12, true, false, true);

    // Crisp delete (no feather — avoids milky fringe).
    doc.selection.clear();
    doc.selection.deselect();

    // Trim transparent + tiny pad via canvas if needed
    doc.trim(TrimType.TRANSPARENT, true, true, true, true);

    // Drop watermark leftovers: if any pale remnant at bottom-right, already gone with white.
    savePNG(doc, DST);
    log("saved " + DST.fsName + "  " + doc.width.value + "x" + doc.height.value);

    // Black preview for edge check
    var pw = doc.width.value;
    var ph = doc.height.value;
    var prev = app.documents.add(pw, ph, 72, "bx_title_preview", NewDocumentMode.RGB, DocumentFill.BLACK);
    app.activeDocument = doc;
    doc.selection.selectAll();
    doc.selection.copy(true);
    doc.selection.deselect();
    app.activeDocument = prev;
    prev.paste();
    savePNG(prev, PREVIEW);
    prev.close(SaveOptions.DONOTSAVECHANGES);

    doc.close(SaveOptions.DONOTSAVECHANGES);
    log("done");
} catch (e) {
    try { log("ERR " + e); } catch (e2) {}
}

try { app.quit(); } catch (e3) {}

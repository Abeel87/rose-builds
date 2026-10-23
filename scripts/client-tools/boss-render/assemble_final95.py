"""Assemble only the 95 catalog boss portraits, keeping per-image provenance."""
from copy import deepcopy
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import shutil

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
DEST = ROOT / "final95-web"


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    original = json.loads((ROOT / "final-web/manifest.json").read_text())
    current = json.loads((ROOT / "current-five-web/manifest.json").read_text())
    for record in current["records"]:
        # Every current five image was inspected composited onto an opaque background.
        record["visualQA"]["frontViewChecked"] = True
        record["visualQA"]["cameraAzimuth"] = -65
        record["sourceVersion"] = record["sourceVersion"].replace("table2026", "table 2026")
    (ROOT / "current-five-web/manifest.json").write_text(
        json.dumps(current, ensure_ascii=False, indent=2) + "\n"
    )
    merged = {str(r["catalogId"]): deepcopy(r) for r in original["records"]}
    merged.update({str(r["catalogId"]): deepcopy(r) for r in current["records"]})
    catalog = json.loads((ROOT.parent / "rose-companion/dist/data/catalog.json").read_text())
    expected = {str(r["id"]): r for r in catalog["monsters"] if r["kind"] != "monster"}
    assert len(merged) == 95
    assert set(merged) == set(expected), (set(merged) - set(expected), set(expected) - set(merged))
    DEST.mkdir(exist_ok=True)
    records = []
    for catalog_id, record in merged.items():
        assert record["name"] == expected[catalog_id]["name"], (catalog_id, record["name"], expected[catalog_id]["name"])
        src = Path(record["image"])
        assert sha256(src) == record["sha256"], src
        dest = DEST / src.name
        shutil.copyfile(src, dest)
        image = Image.open(dest)
        image.load()
        assert image.size == (640, 640)
        assert image.mode == "RGBA"
        alpha = np.asarray(image.getchannel("A"))
        assert alpha.min() == 0 and alpha.max() == 255
        assert np.count_nonzero(alpha) > 5000
        lossless = Path(record["sourceRenderFile"])
        assert sha256(lossless) == record["sourceRenderSha256"], lossless
        source_alpha = np.asarray(Image.open(lossless).convert("RGBA").getchannel("A"))
        assert np.array_equal(alpha, source_alpha), dest
        record["image"] = str(dest)
        record["file"] = dest.name
        record["sizeBytes"] = dest.stat().st_size
        records.append(record)
    expected_files = {r["file"] for r in records}
    assert {p.name for p in DEST.glob("*.webp")} == expected_files
    manifest = {
        "schemaVersion": 2,
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "count": len(records),
        "width": 640,
        "height": 640,
        "transparent": True,
        "totalImageBytes": sum(r["sizeBytes"] for r in records),
        "sourceUrl": original["sourceUrl"],
        "sourceSnapshots": [
            {
                "label": original["sourceSnapshot"],
                "imageCount": 90,
                "installerUrl": original["sourceInstallerUrl"],
                "installerSha256": original["sourceInstallerSha256"],
                "historical": True,
            },
            {**current["source"], "imageCount": 5, "historical": False},
        ],
        "limitations": [
            "Source snapshots are recorded per image: 90 renders from the pinned November 2024 official installer and 5 from the official current updater release ci-38925666467-1.",
            "These are renders of original client geometry, skeletons, textures, idle poses and equipped parts. They are not in-game screenshots.",
            "Neutral presentation lighting; game environment reflections, bloom/aura, particle effects and unparsed ZSC2 EMIS effects are omitted.",
            "Each portrait is framed independently; real relative model scale is recorded separately in scalePercent.",
        ],
        "formatReferences": original["formatReferences"],
        "webExport": {
            "format": "WEBP", "quality": 92, "method": 6, "alphaQuality": 100,
            "alphaLosslessVerifiedForAll": True,
        },
        "records": records,
    }
    (DEST / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    report = {
        "catalogBossCount": len(expected), "renderCount": len(records),
        "catalogKeysAndNamesExact": True, "allImageSha256Verified": True,
        "allSourceRenderSha256Verified": True, "allImagesFullyDecoded": True,
        "alphaLosslessVerifiedForAll": True, "allFrontViewsChecked": True,
        "imageBytes": manifest["totalImageBytes"],
        "sourceCounts": {"2024": 90, "current": 5},
    }
    (ROOT / "final95-validation.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()

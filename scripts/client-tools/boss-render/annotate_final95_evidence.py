"""Record completed current-client comparisons without relabeling old renders."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REF = ROOT.parent / "boss-appearance-reference"
MANIFEST = ROOT / "final95-web/manifest.json"


def evidence_file(name):
    path = REF / name
    raw = path.read_bytes()
    return json.loads(raw), {"file": str(path), "sha256": hashlib.sha256(raw).hexdigest()}


manifest = json.loads(MANIFEST.read_text())
definitions, definitions_file = evidence_file("current-boss-table-comparison.json")
model_definitions, model_definitions_file = evidence_file("current-boss-model-manifest.json")
textures, textures_file = evidence_file("current-95-all-body-texture-verification.json")
by_id = {str(r["catalogId"]): r for r in definitions["records"]}
by_texture = {r["path"]: r for r in textures["records"]}
assert len(by_id) == 92
assert len(by_texture) == 157
assert sum(r.get("sameDecodedRGBA", False) for r in by_texture.values()) == 147
assert sum(r.get("newAsset", False) for r in by_texture.values()) == 10
assert not [r for r in by_texture.values() if not r.get("newAsset") and not r.get("sameDecodedRGBA")]
assert all(set(r["differences"]) <= {"level", "effects", "resolvedZsc"} for r in by_id.values())

evidence = {
    "status": "partial-current-client-cross-check",
    "checkedAt": "2026-10-23",
    "currentSource": textures["source"],
    "definitionComparison": {
        **definitions_file,
        "modelManifest": model_definitions_file,
        "recordCount": 92,
        "result": "Catalog names, NPC/CHR IDs, body-part IDs, skeleton and idle paths, scale, equipped-weapon IDs and glow definitions agree with the pinned 2024 snapshot.",
        "bodyMaterialChanges": [
            {"catalogId": "654", "change": "Head alpha test disabled in current client; render replaced with current-client version."},
            {"catalogId": "1806", "change": "Body03_02 alpha threshold changed from 128 to 200; render replaced with current-client version."},
        ],
        "notes": "Effect index renumbering retains resolved effect paths and dummy attachments. Combat-level differences are outside this appearance comparison.",
        "scopeLimit": "Definition/reference comparison does not establish binary identity of every geometry, skeleton, animation or weapon asset.",
    },
    "bodyTextureComparison": {
        **textures_file,
        "uniqueBodyTextureCount": 157,
        "existingTexturesWithIdenticalDecodedRGBA": 147,
        "changedExistingTextures": 0,
        "newBalloonTextures": 10,
        "scopeLimit": "Body textures only; weapon textures are not included. Equality is for the decoded base image, not every mip level or container byte.",
    },
    "doesNotVerifyLiveGameplayAppearance": True,
    "originalRenderProvenancePreserved": True,
}
manifest["currentClientCrossCheck"] = evidence
for record in manifest["records"]:
    catalog_id = str(record["catalogId"])
    paths = sorted({p["texturePath"] for p in record["presentation"]["parts"] if p.get("role") == "body"})
    texture_records = [by_texture[p] for p in paths]
    record["currentClientCrossCheck"] = {
        "status": "partial-current-client-cross-check",
        "release": textures["source"]["release"],
        "checkedAt": "2026-10-23",
        "definitionReportSha256": definitions_file["sha256"] if catalog_id in by_id else None,
        "bodyTextureReportSha256": textures_file["sha256"],
        "bodyTextureCount": len(texture_records),
        "bodyTexturesIdenticalTo2024": sum(r.get("sameDecodedRGBA", False) for r in texture_records),
        "newBodyTextures": sum(r.get("newAsset", False) for r in texture_records),
        "wholeModelBinaryEqualityEstablished": False,
        "renderProvenanceChanged": False,
    }
    if record["historical"]:
        record["currentClientAssetVerified"] = False
    else:
        record["visualQA"]["independentReviewPassed"] = True

MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
(ROOT / "final95-evidence.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n")
print(json.dumps({"manifest": str(MANIFEST), "count": len(manifest["records"]), "historical": sum(r["historical"] for r in manifest["records"]), "current": sum(not r["historical"] for r in manifest["records"]), "textureCount": len(by_texture), "imagesUnchanged": True}, indent=2))

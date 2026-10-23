# King and boss map points — extraction report

## Result

`spawns-client.json` follows the agreed runtime schema and contains **427 unique
locations from 428 source objects, for 81 of the 95 catalog bosses, on 38 exact
client zones**. All coordinates come
from the current public Global updater release `releases/ci-38925666467-1`,
retrieved 2026-10-23. No historical installer positions or guessed coordinates
are included in the runtime data.

The extraction inspected **1,339 IFO files across 44 current-client zones**.
All inspected MonsterSpawn/NPC blocks parsed exactly to their declared block
boundary: **zero parse errors, zero out-of-image markers, and no duplicate
marker IDs**. Every runtime point is tied to a catalog ID, exact zone ID,
`terrain` layer and the SHA256 of the actual WEBP bytes.

### Wastelands regression case

| Zone / variant | Grand Master Devourer 2226 | Desert Scavenger King 2247 | Ikaness Mecha 2296 | Total |
| --- | ---: | ---: | ---: | ---: |
| 78 / Obszar 1 | 3 | 2 | 1 | 6 |
| 79 / Obszar 2 | 2 | 2 | 1 | 5 |

These are separate sets tied to separate image hashes. A combined Wastelands
card must select the displayed variant before matching any marker.

## Evidence and coordinate conversion

IFO block **8** provides the spawn object's raw position, basic/tactic NPC ID
lists, interval, count limit, range and tactic points. Block **2** provides
placed NPC objects. The format is documented by the
[primary IFO reader](https://github.com/exjam/rose-offline/blob/4a648ba720278f69bb8ee6257564175c271e081c/rose-file-readers/src/ifo.rs).

The projection follows the
[client minimap implementation](https://github.com/exjam/rose-offline-client/blob/9802251b1f99921cc67408273e0c1e0133153a55/src/ui/ui_minimap_system.rs)
and [IFO world offset](https://github.com/exjam/rose-offline/blob/4a648ba720278f69bb8ee6257564175c271e081c/rose-data-irose/src/zone_database.rs):

```text
B = 16 × gridPerPatch × gridSize            (centimetres per block)
globalX = rawIFOx + 32.5 × B
globalY = rawIFOy + 32.5 × B
pixelX = 64 + (globalX − minimapStartX × B) / (B / 64)
pixelY = 64 + ((65 − minimapStartY) × B − globalY) / (B / 64)
x = pixelX / fullImageWidth
y = pixelY / fullImageHeight
```

The 64-pixel border is included. Points were not clamped or fitted to community
markers. Repeated basic/tactic slots in one IFO object create one marker per
monster. Exact coincident monster/zone/image/position entries become one tappable
location; their separate source objects remain in provenance. Giant Kaiman
Ranger 1369 in zone 27 has two identical source positions in
`3ddata/maps/junon/jg05/35_31.ifo`, offsets 15679 and 16322. They map to stable
runtime ID `client-27-1369-76d1529455` with `sourceObjectCount: 2`. Nearby but
nonidentical points are not merged.

Independent checks found the Pomic King point at `(193.33, 189.96)` inside the
archival Breezy Hills circle and two Grunter King points inside the southwest
Anima Lake circles. A Wastelands screenshot with displayed world coordinates
independently confirmed the axes and scale. These archival checks validate
projection, not current server behavior.

## Uncovered catalog entries

No usable exact marker was found for the following 14 entries in the inspected
current IFO blocks:

| Catalog ID | Name |
| --- | --- |
| 201 | Worm Dragon |
| 2305 | Wandering Asper |
| 2309 | Wandering Mastyx |
| wandering-devourer | Wandering Devourer |
| wandering-terrasaurus | Wandering Terrasaurus |
| wandering-scarab | Wandering Golden Scarab |
| wandering-snapper | Wandering Snapper |
| 3583 | Anansi Recluse |
| 3587 | Arachne Recluse |
| 3588 | Ulverick |
| 2685 | Kepris |
| super-hornet | Super Hornet |
| super-ulverick | Super Ulverick |
| dolphin-balloon | Dolphin Island Balloon |

Dolphin Island, OCF Temple, Cave of Ulverick, Halls of Oblivion, Sea of Dawn and
Sikuku Catacombs were explicitly checked and contain no MonsterSpawn records.
This does not establish absence of bosses in gameplay; scripted encounters,
server-side configuration and events are outside these client blocks. The
inspection is not a claim to have searched every file in the client.

Client points do not establish live presence, encounter availability or a
respawn timer. Raw range is retained in evidence but omitted from runtime:
the reference server uses independent x/y offsets within ±range metres, a
square rather than a proven circular roaming radius.

## Minimal checkpoint and reproduction

Keep `spawns-client.json` as `dist/data/spawns.json`, plus `spawn-coverage.json`
and `spawn-provenance.json` under the repository's source/evidence directory.
The latter records the pinned public updater URLs and hashes, 220 used IFO
file hashes, exact source offsets/positions and map hashes. It contains no
raw client files. The larger `spawns-client-evidence.json` is optional scratch
detail and is not needed in the site.

Keep `extract_ifo_spawns.py`, `export_spawn_markers.py` and
`finalize_spawn_evidence.py` with the existing
`scripts/client-tools/` sources. They use `client_assets.py`, `current_assets.py`
and `dungeon_geometry.py`; configure their `BASE` paths before reuse. Inputs
are the pinned updater manifest/index/cache, the checked reference executable,
the repository's `scripts/boss-appearances-manifest.json`, catalog, world data
and map WEBPs. The current reader can fetch only missing verified CBA chunks;
it does not require downloading the full VFS again.

After configuring those paths, the exact inspected zone set is:

```sh
python extract_ifo_spawns.py --current --fetch --zones 1 2 3 21 22 23 24 25 26 27 28 29 31 32 33 42 43 44 51 52 53 54 55 56 57 58 59 61 62 63 64 65 66 78 79 81 83 85 89 90 138 143 148 169 --output-name spawns-current-data.json
python export_spawn_markers.py /configured/workdir/king-spawn-analysis/spawns-current-data.json --output spawns-client.json
python finalize_spawn_evidence.py /configured/workdir/king-spawn-analysis/spawns-current-data.json
```

For this historical result, use the release and hashes in provenance, not the
future contents of the mutable updater manifest URL. The runtime image files
and world map hashes must match the snapshot being projected.

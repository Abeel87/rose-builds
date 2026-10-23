# Client asset tools — source checkpoint

These are the Python sources used to recover named ROSE Global maps and render
original boss models on 23 October 2026. Their working interfaces and relative
directory layout are preserved. They require external inputs and path
configuration before reuse; this directory is not part of the website runtime.

## Contents

| Directory | Purpose |
| --- | --- |
| `official-maps/` | Pinned installer reader; current updater CBA reader with verified HTTP ranges; STB/STL and ZSC2 readers; named minimap extraction; ZON/IFO inventory; HIM/TIL terrain and level rendering; map export. |
| `boss-render/` | ZMS/ZMD/ZMO and legacy ZSC parsers; skeletal posing, equipped parts and transparent rendering; contact sheets; lossless and mobile WEBP export; final catalog assembly and evidence annotation. |
| `boss-appearance-reference/` | CHR parser and catalog identity mapping; comparison of current definitions and decoded body textures. |

Only our Python sources and this README are included. Client executables,
archives, indexes, caches, game meshes/textures, generated images, manifests and
credentials must be supplied separately and kept outside this source checkpoint.

## Requirements

- Python 3.10+ with `numpy`, `Pillow` (DDS and WEBP support), `cryptography`,
  `blake3`, `zstandard`, `moderngl` and `glcontext`.
- EGL/OpenGL support for rendering. This run used Mesa llvmpipe, ModernGL 5.13.0
  and glcontext 3.1.0; a GPU is not required.
- `curl` with HTTP Range support for selective current-client downloads. Offline
  readers require the corresponding cache to have been provisioned already.

## Configure before running

Use a separate writable work directory with the same three sibling directories.
Several scripts write outputs or start downloads at module import, so inspect
their entry points before importing them as libraries.

1. In `client_assets.py`, set `DEFAULT_EXE`, `DEFAULT_IDX`, `DEFAULT_VFS` and any
   output location. The original VFS path was `/tmp/rose-full-client/app/rose.vfs`.
   The reader checks the inspected executable SHA256; it is deliberately pinned
   to the November 2024 public installer, not an arbitrary client release.
2. In `current_assets.py`, configure `MANIFEST`, `CURRENT` and the reference
   executable location. Provision the official updater manifest and its verified
   decoded `data.idx`; `CbaArchive` can read local CBA files or selected remote
   chunks. The original manifest was `orlo-current-manifest.json` beside the
   three directories. Network fetching is explicit in the reader, but some
   extraction scripts opt into it. Do not run concurrent processes against the
   same chunk cache.
3. Replace the old `/workspace/scratch/520b87b7114a` constants in the reference
   scripts and the old `/tmp/rose-pylibs`, `/tmp/rose-render-pylibs` dependency
   paths, or install dependencies in the active environment. Preserve sibling
   imports between `official-maps/` and `boss-render/`.
4. Configure `ROOT`, `REFERENCE`/`REF`, catalog and output paths in render/export
   scripts. They expect generated identity manifests, table exports and geometry
   inventories that are not included here. The original catalog path was
   `rose-companion/dist/data/catalog.json` in the surrounding work directory.
   Recreate or adapt those inputs from named client tables and the repository's
   import manifests. The five-model script and final assembly are specific to
   the 95-entry catalog used in this checkpoint.
5. Revalidate release hashes and replace hard-coded retrieval dates when working
   with a later snapshot. Do not carry the 2026 verification labels forward
   automatically. The preserved comparison script is exploratory; use
   `zsc_extensions.read_zsc` for validated ZSC2 framing in production extraction.

## Rendering scope and evidence

Boss renders use original geometry, skinning, idle poses, material textures and
equipped parts. The renderer preserves the runtime extra root dummy, CCW face
winding and the distinction between specular-mask alpha and transparency.
Neutral lighting omits environment reflection, bloom/aura and particle effects.
ZSC2 A2C framing is parsed; EMIS is retained by hash but not rendered.

Level views preserve static object placement and heightfields. A cutaway omits
explicitly named Sikuku ceiling meshes. These views are derived renders, not
shipped minimap artwork. Client presence does not establish server availability,
boss spawn positions or drops. Neither rendering pipeline invents spawn markers.

Format references: [ROSE formats](https://ralphminderhoud.com/rose-formats/),
[rose-tools readers](https://github.com/rminderhoud/rose-tools/tree/master/rose-lib/src/files),
[model loader](https://github.com/exjam/rose-offline-client/blob/9802251b1f99921cc67408273e0c1e0133153a55/src/model_loader.rs),
[level transforms](https://github.com/exjam/rose-offline-client/blob/9802251b1f99921cc67408273e0c1e0133153a55/src/zone_loader.rs),
and [runtime dummy behavior](https://github.com/shid0x/rose-next/blob/ca675d5fc0dea34d0f44bd1dc6dadf4bd469d5f1/src/engine/src/zz_skeleton.cpp).
The CBA reader follows the public `bitar` 0.14.0 format used by the updater.

This checkpoint copied the working sources without rerendering, changing client
data, or modifying the published image and manifest outputs.

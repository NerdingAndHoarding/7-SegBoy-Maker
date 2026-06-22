# Decisions and Test Evidence

## Product

- Public name: 7-SegBoy v1.0.
- License: AGPL-3.0.
- Plain browser application with no required CDN for core behavior.
- One official wiring profile; alternate wiring is unsupported.
- JSON is canonical; IndexedDB is recovery only.
- Minimum complete project: one 5 x 5-minus-2 section-1 starter map, one
  two-room section-2 boss area, 1 hero, 1 normal enemy type, and 1 boss enemy.
- Undo is a visible button and Ctrl+Z for supported editor actions. Ctrl+U may
  still work in some browsers, but Chrome can reserve it for View Source, so
  it is not the primary shortcut.

## Battle

- Every hero and foe has an independent swiftness timer.
- Timers charge together only in CHARGING state.
- A filled actor acts; only that actor's timer resets.
- Exact tie order: You1, You2, Foe1, Foe2.
- Foe swiftness is randomized 1..10 per battle.
- Foe timers are not visible.
- Commands are HIT, CAST, ABILITY, ITEM.
- Dead targets are excluded except approved revival item/spell behavior.
- Escape is not used.

## Saves

- 3 manual EEPROM slots.
- No automatic game saves.
- No EEPROM wear-leveling system.
- Save anywhere on worldmap/town.
- Dungeon saves require authored save points.

## Audio

- Melody D3; bass D9.
- Audio volume is passive.
- Audio is reserved for a later beta step, not implemented in the current fast
  beta path.
- Projects with no authored music or sound effects should not receive audio
  timer blockers.
- Projects with authored music or sound effects remain blocked for final
  export until an audio driver and timer policy are implemented.

## Text

The exact supported alphabet, punctuation, word-breaking, and fallback glyph
remain unresolved. Resolve this in a focused text/glyph beta step before
public release.

## Accepted Hardware Evidence

### 26 x 32 combined game

- Flash: 17,580 / 30,720 bytes (57%).
- Globals: 473 / 2,048 bytes (23%).
- Remaining SRAM reported by compiler: 1,575 bytes.
- Upload, movement, blocking, transitions, and combined gameplay accepted.

### 2 x 2 combined game

- Flash: 10,072 / 30,720 bytes (32%).
- Globals: 580 / 2,048 bytes (28%).
- Upload and gameplay accepted.

## Browser Evidence

- B03 JSON round-trip accepted.
- B04 v2 tests: 9 of 9 passing.
- V1 hardware example migration preserves Arduino output.
- B05 IndexedDB recovery Recover/Not now/Discard accepted.
- Saving JSON clears recovery after the synthetic-click fix.

### B05-P04 automated regression - 2026-06-14

- Schema construction, validation, migration, preservation, and
  non-mutation: 9 of 9 tests passed.
- Recovery save, summary, load, malformed-data rejection, clear, and
  unavailable-IndexedDB behavior: 7 of 7 checks passed.
- Text, glyph, worldmap, battle, and combined Arduino generators all
  produced SPI-based sketches without LedControl or Arduino String.
- All four specialist links resolve to files in `References`.
- Project organization check passed.
- No B05 code defect was found by these checks. The manual browser lifecycle
  checklist in `Prompts/CURRENT_MILESTONE.md` remains the acceptance gate.

### B06-P01 visual workflow inventory - 2026-06-14

- B05-P04 accepted when work advanced to the next step.
- Studied the complete 018 world-map tool and mapped its visual workflow to
  schema v2 in `Documentation/SCHEMA_V2.md`.
- Retained direct segment editing, DP, the eight-slot palette, drag painting,
  coordinate navigation, and room previews.
- Rejected legacy TXT/C state, implicit room saves, wiring mirroring, and
  tightly coupled global data handling.
- Confirmed that the first hardware path remains one global eight-glyph
  palette; region palettes stay postponed.

### B06-P02 shared visual asset model - 2026-06-14

- Added pure shared helpers for glyphs, exact 8 x 3 frames, and fixed-duration
  frame animations.
- Supports `segment-bytes-v1` and explicit `glyph-refs-v1` frame encodings.
- Glyph-reference frames resolve deterministically to 24 hardware segment
  bytes and report missing references.
- The official byte order remains DP bit 7 and A..G bits 6..0. Legacy 018
  bytes require translation during the later import milestone.
- Raw byte estimates are intentionally logical estimates before PROGMEM
  packing, deduplication, or world compression.
- JavaScript syntax checks passed, project model tests passed 15 of 15, all
  five Arduino generators passed smoke checks, and organization passed.

### B06-P03 shared segment editor - 2026-06-14

- Added one reusable 8 x 3 renderer/editor with independent 24-byte state.
- Uses the hardware-tested bits: A `0x40`, B `0x20`, C `0x10`, D `0x08`,
  E `0x04`, F `0x02`, G `0x01`, and DP `0x80`.
- Supports direct segment clicks, selected-cell controls, keyboard-accessible
  A-G/DP buttons, and arrow-key cell selection.
- The passive hub preview now mounts this editor; world and battle emulators
  remain unchanged.
- Automated tests passed for every segment bit, indexes 0 and 23, exact
  24-byte round trip, clone safety, partial-frame rejection, and independent
  state instances.
- Project model tests passed 15 of 15, all five Arduino generators passed
  smoke checks, CSS braces matched, script order passed, and organization
  passed.
- Automatic browser launch is prohibited, so final visual/click inspection
  remains a short manual check in `index.html`.

### B06-P04 glyph library editor - 2026-06-14

- Added schema-v2 glyph create, duplicate, rename, referenced-delete
  protection, copy, cut, paste, clear, randomize, labels, and memory figures.
- Stable glyph IDs do not change when names change.
- Undo restores randomize, cut, and deletion as one command each.
- Ctrl+Z routes to the glyph editor only while that editor is active.
  Ctrl+U is optional because Chrome can reserve it.
- The glyph clipboard is internal; browser text-field clipboard shortcuts are
  not intercepted.
- Undo history and the glyph clipboard reset when a project is loaded,
  created, or refreshed, preventing cross-project restoration.
- Focused controller checks, schema save/load preservation, JavaScript
  syntax, 15 of 15 model tests, all five Arduino generator smoke checks,
  script order, and CSS structure passed.
- The organization checker recognizes `glyphEditor.js`, but currently reports
  the unrelated user-created root folder `Saved_json`. Its contents were not
  moved or changed.
- Automatic browser launch remains prohibited; visual clicking is the only
  remaining manual inspection.

### B06-P05A frame library editor - 2026-06-14

- Added frame create, duplicate, rename, tags, protected deletion, clear,
  randomize, raw/glyph-reference conversion, memory figures, and undo.
- Both `segment-bytes-v1` and `glyph-refs-v1` remain exactly 24 cells and
  resolve to an exact 24-byte display preview.
- Raw-to-glyph conversion is blocked unless every raw byte has a matching
  project glyph; no guessed or partial conversion is saved.
- Room and animation references block deletion.
- Room-owned frame cell data is temporarily read-only because the current
  proof-of-concept world editor still regenerates those bytes during save.
  Independent and animation frames remain editable. B08 owns that migration.
- Focused encoding, resolution, reference, stable-ID, save/load, randomize,
  delete, and undo checks passed. JavaScript syntax, 15 of 15 model tests,
  all five Arduino generator smoke checks, script order, and CSS structure
  passed.
- The organization checker recognizes `frameEditor.js`; its only failure is
  the pre-existing user folder `Saved_json`, which remains untouched.
- Automatic browser launch remains prohibited; visual clicking is the only
  remaining manual inspection.

### B06-P05B animation library editor - 2026-06-14

- Added animation create, duplicate, rename, protected deletion, frame
  add/remove/reorder, fixed duration, loop, randomize order, memory figures,
  playback controls, and undo.
- New animations require an existing frame and always retain at least one
  frame, keeping schema v2 valid during editing.
- Playback cursor, playing state, and timer are temporary UI state and never
  mutate authored JSON.
- The single playback timer is cleared on pause, stop, selection change,
  authored edits, undo, project refresh, and project replacement.
- Missing frames or unresolved glyph references block playback and are shown
  as warnings.
- Hero, enemy, spell, and ability references block animation deletion.
- Focused order, timing, loop, non-loop stop, missing-reference, stable-ID,
  save/load, protected-delete, randomize, reorder, delete, and undo checks
  passed. JavaScript syntax, 15 of 15 model tests, all five Arduino generator
  smoke checks, script order, and CSS structure passed.
- The organization check continues to report only the untouched user folder
  `Saved_json`.
- Automatic browser launch remains prohibited; visual playback is the only
  remaining manual inspection.

### B06-P06 safe 018 visual import - 2026-06-15

- Added preview-first import for one eight-bit digit, the exact
  `1 2 3 4 Q W E R` sprite set, 24-digit frames, `Frame n` blocks, and old
  `{ 'A', 0, { 24 bytes } }` map rows.
- Legacy A-through-DP bit order is translated to official DP-through-G order
  before preview and commit.
- Preview reports complete translated bytes, source names, collisions,
  unsupported region data, and errors. Cancel leaves project JSON unchanged.
- Commit appends unique schema-v2 glyphs and frames as one undoable command;
  existing IDs and names are never overwritten.
- Region and compressed-region records remain postponed.
- Focused format, rejection, collision, cancel, commit, undo, byte-translation,
  schema-v2 validation, and JSON round-trip tests passed.
- JavaScript syntax, 15 of 15 project-model tests, CSS structure, script
  order, and all five Arduino generator smoke checks passed.
- The organization checker recognizes `visualImport018.js`; its only failure
  remains the untouched user-created root folder `Saved_json`.
- Automatic browser launch remains prohibited; file selection, preview,
  commit, editor refresh, and Ctrl+Z still need a short manual check.

### B07-P01 ATmega328P resource budget - 2026-06-15

- Browser planning uses the observed Arduino Nano compile capacity of 30,720
  bytes, while recording the physical ATmega328P flash as 32,768 bytes.
- Flash warns above 80%, requires release review above 90%, and blocks above
  30,720 bytes.
- Known SRAM globals/fixed buffers warn above 1,280 bytes and block above
  1,536 bytes, preserving at least 512 bytes for stack and temporary use.
- EEPROM accounts for exactly three manual slots plus metadata, warns above
  768 bytes, and blocks above 1,024 bytes. Older notes marked the encoding as
  future work; B12-P05 later locked the current position-only encoding.
- Every required subsystem has one accounting owner. Unimplemented required
  costs are `Unknown`, never silently zero.
- D3 and D9 remain the approved audio pins. This older B07 audio-timer note is
  superseded by B13-P02; Timer0 remains reserved by the core.
- Browser exact table counts and planning allowances cannot replace Arduino
  compile output or required real-hardware evidence.

### B07-P02 pure resource estimator - 2026-06-15

- Added deterministic, DOM-free estimation with separate exact, estimated,
  and unknown costs plus structured warnings and blockers.
- Dense current-world storage is exact: 2 x 2 is 45 bytes and 26 x 32 is
  7,497 bytes including the 9-byte global palette/flags table.
- Current visual accounting uses one byte per glyph, 24 bytes per frame, and
  two-byte frame references plus three animation control bytes.
- The planning engine allowance is 10,032 bytes, calibrated from accepted
  proof-of-concept compiles. It remains explicitly estimated.
- The predicted 2 x 2 total is 10,101 bytes versus the measured 10,072. The
  predicted 26 x 32 total is 17,553 versus the measured 17,580.
- Fixed/runtime SRAM reports active actor scaling separately from the
  512-byte stack reserve. Older notes treated EEPROM as a known minimum;
  B12-P05 later locked the current position-only encoding.
- Excessive world dimensions, visual flash, actor SRAM, and save EEPROM each
  produced the intended blocker. Final-export mode also blocks unresolved
  required costs and audio timer ownership.
- Determinism, byte-for-byte non-mutation, purity, script order, JavaScript
  syntax, 15 of 15 model tests, and all five Arduino generator smoke checks
  passed.
- The organization checker recognizes `resourceEstimator.js`; its only
  failure remains the untouched user-created root folder `Saved_json`.

### B07-P03 reference and structure preflight - 2026-06-15

- Added deterministic, DOM-free preflight that combines structural findings
  with the unchanged B07-P02 resource report.
- Checks stable/duplicate IDs, typed references, 8 x 3 frame data, room
  coordinates, duplicate room positions, global palette capacity and
  consistency, compression mode, starting world/room/cell/party, hardware
  profile, nine-section limit, and required event reachability.
- Generated pin tables must contain every official assignment on its fixed
  pin. Duplicate claims, remaps, and Timer0 conflicts block preflight.
- This older B07 audio-timer warning is superseded by B13-P02.
- The current world table is known to use PROGMEM. Other immutable generated
  tables of 256 bytes or more block until their exporter supplies an explicit
  PROGMEM classification.
- Default schema-v2 project has zero structural errors. Focused failing cases
  passed for every implemented check, including pin/timer and storage-policy
  inputs.
- Determinism, byte-for-byte non-mutation, purity, script order, application
  syntax, 15 of 15 model tests, and all five Arduino generator smoke checks
  passed.
- The organization checker recognizes `preflight.js`; its only failure
  remains the untouched user-created root folder `Saved_json`.

### B13-P02 fast-beta audio preflight policy - 2026-06-17

- Supersedes older B07 wording that referenced the archived B22 audio
  milestone.
- D3 and D9 remain reserved for future melody and bass output.
- Timer1 and Timer2 are inactive while a project has no authored music or
  sound effects.
- Preflight no longer warns or blocks a no-audio project only because audio is
  unimplemented.
- If music or sound effects are authored, preflight still reports unresolved
  audio flash, SRAM, and timer ownership until an audio driver is added.

### B13-P03 active roadmap label cleanup - 2026-06-17

- Removed active references to archived B18, B21, and B22 milestone numbering
  from current decision text.
- Historical B07 evidence remains recognizable, but later accepted work now
  states which old notes it supersedes.
- Text/glyph policy remains unresolved, but is now described as a future
  focused beta step instead of an old milestone number.

### B13-P04 start-here quick-start refresh - 2026-06-17

- Rewrote `START_HERE.md` as the short beta entry point.
- It now explains opening `index.html`, using Hardware Preflight, exporting
  Combined Game `.ino`, and finding timestamped Arduino sketches.
- It summarizes the official hardware and links to
  `Documentation/HARDWARE_PROFILE.md`.
- It removes the stale B05 current-task text.

### B13-P05 beta release checklist - 2026-06-17

- Added `Documentation/BETA_RELEASE_CHECKLIST.md`.
- The checklist records the minimum browser, JSON, export, compile, upload,
  and real-hardware passes expected before sharing a beta copy.
- It lists known beta exclusions so unfinished audio, full text policy, and
  unsupported wiring are not treated as surprise failures.
- `START_HERE.md` now links to the checklist.

### B13-P06 AGPL license file - 2026-06-17

- Added root `LICENSE.md`.
- The file uses `SPDX-License-Identifier: AGPL-3.0-only`.
- The note applies the accepted AGPL v3 decision to the browser source,
  generated Arduino code, bundled example projects, and bundled authored
  example assets.
- `START_HERE.md` and the beta release checklist now point to the license file.

### B13-P07 public hardware wiring checklist - 2026-06-17

- Added **Builder Wiring Checklist** to `Documentation/HARDWARE_PROFILE.md`.
- The checklist covers common ground, MAX7219 SPI wiring, A4 direction/menu
  pot, A0 BrightnessPot, D5/D4 buttons, and the current no-audio beta status.
- Added **First Hardware Check** to the same official hardware profile.
- `START_HERE.md` and the beta release checklist now point to the hardware
  checklist without creating a second wiring profile.

### B13-P08 tutorial video outline - 2026-06-17

- Added `Documentation/TUTORIAL_VIDEO_OUTLINE.md`.
- The outline covers opening the tool, official wiring, tiny world creation,
  browser battle, save/reload, export/upload, and first hardware test.
- The outline explicitly excludes audio authoring, full text policy,
  unsupported wiring fixes, terrain/treasure/goal/beast/map-trigger systems,
  and hand-editing generated Arduino code.
- `START_HERE.md` and the beta release checklist now point to the outline.

### B13-P09 beta test-record template - 2026-06-17

- Added `Documentation/BETA_TEST_RECORD.md`.
- The template captures candidate details, browser result, Arduino compile
  result, hardware result, and release decision.
- The template includes fields for flash, SRAM, upload, A0, A4, D5/D4, room
  movement, transitions, battle outcomes, and visible mismatch.
- `START_HERE.md` and the beta release checklist now point to the test record.

### B13-P10 beta package contents checklist - 2026-06-17

- Added `Documentation/BETA_PACKAGE_CONTENTS.md`.
- The checklist names files and folders to include in a clean public beta copy.
- It identifies working folders that should usually stay out of a public copy,
  including `backups`, `old`, `Arduino_Tests`, and `Saved_json`.
- It explicitly says not to delete working folders from the development copy.
- `START_HERE.md` and the beta release checklist now point to the package
  contents checklist.

### B13-P11 exact beta package source list - 2026-06-17

- Updated `Documentation/BETA_PACKAGE_CONTENTS.md` to list the exact root
  JavaScript files loaded by `index.html`.
- Kept the required app scripts in load order.
- Listed browser self-test files separately as optional package files.
- Updated `START_HERE.md` Active Source to match the current root app source.

### B07-P04 preflight UI and export gating - 2026-06-15

- Added a non-modal Hardware Preflight panel with flash, SRAM, EEPROM,
  wiring, subsystem, warning, blocker, and reduction-advice views.
- Project changes schedule recalculation with a 180 ms debounce.
- The combined-game test export is disabled for known blockers. Text,
  glyph/data, worldmap, and standalone battle test exports remain separate.
- `generateCombinedGameIno()` now defensively runs the same planning
  preflight and throws `SevenSegPreflightError` for blocked projects.
- Warning-only starter projects still generate combined SPI sketches.
  Missing references and known flash overflow are rejected.
- Added the single running `Documentation/MANUAL_TESTS.md` requested for the
  current multi-step sequence.
- Syntax, CSS/UI structure, 15 of 15 model tests, warning-only export,
  defensive missing-reference/overflow rejection, and all five test-export
  availability checks passed.
- The organization checker recognizes the new manual-test document; its only
  failure remains the untouched user-created root folder `Saved_json`.

### B08-P01 world and compression contract - 2026-06-15

- World dimensions are 1..26 by 1..32 and every in-range coordinate exists
  logically.
- Every coordinate belongs to exactly one of up to nine sections. Non-default
  section coordinate overrides allow arbitrary shapes without 832 room
  objects; overlap is invalid.
- Room types are empty, normal, special, and raw. Special uses the active
  global/section palette plus a future-behavior marker; raw stores 24 exact
  segment bytes.
- Locked global/section palette ownership, 1/2/3/4-bit capacities, readable
  JSON, dense/sparse representations, current little-endian bit packing,
  PROGMEM random access, cost formulas, metadata separation, and 018 region
  mapping.
- Contract coverage and formula checks passed.

### B08-P02 schema-v2 world and section model - 2026-06-15

- Added bounded world dimensions, area types, palette ownership, stable
  sections, coordinate ownership, and empty/normal/special/raw room types.
- Missing coordinates now resolve as implicit empty rooms without allocating
  832 room objects or mutating the project.
- Section overrides, explicit room overrides, raw 24-byte rooms, palette
  capacity, dimensions, ownership, overlaps, and room types are validated.
- Existing v1 migration, schema-v2 JSON round trips, and current start
  behavior remain compatible.
- Focused world-model checks, 15 of 15 existing model tests, JavaScript
  syntax, and all five Arduino generator smoke checks passed.

### B08-P03 pure world compression packers - 2026-06-15

- Added one DOM-free compression module for 1/2/3/4-bit palette rooms,
  exact raw rooms, dense room blocks, sparse overrides, and dense/sparse
  section membership.
- Cell data uses the locked low-bit-first continuous bitstream. The existing
  3-bit packer produced byte-for-byte identical output.
- Added exact room, palette, dense-world, sparse-entry, and section-membership
  byte-count helpers. The resource estimator now reads the authored palette
  bit width through these formulas.
- All palette modes, raw, dense lookup, sparse lookup, section membership,
  overflow rejection, no-mutation, 26 x 32 totals, JavaScript syntax,
  15 of 15 model tests, and all five Arduino generator smoke checks passed.
- The organization checker recognizes `worldCompression.js`; its only
  failure remains the untouched user-created root folder `Saved_json`.

### B08-P04 visible compression regression tests - 2026-06-15

- Added a standalone no-framework test page with an overall result, one row
  per named test, automatic page-load execution, and a Run tests button.
- The suite covers all-zero, maximum, alternating, deterministic random,
  boundary crossing, legacy 3-bit bytes, invalid overflow, raw rooms, dense
  and sparse lookup, section lookup, exact 26 x 32 totals, malformed input,
  and no-mutation behavior.
- The local JavaScript run passed 15 of 15 tests. The visible browser check
  is included in the one combined manual-test document.
- The organization checker recognizes both test files; its only failure
  remains the untouched user-created root folder `Saved_json`.

### B08-P05 standalone Arduino world decoder - 2026-06-15

- Added a separate World Data Modes export for 1/2/3/4-bit palette rooms and
  raw segment-byte rooms. All descriptors, palettes, and payloads are in
  PROGMEM.
- The generated sketch uses SPI, the confirmed 8 x 3 mapping, D5 next, D4
  previous, internal pullups, 30 ms debounce, 500 ms hold, 200 ms repeat,
  live A0 brightness mapped to MAX7219 levels 0..15, and Serial mode labels.
- It decodes only the selected room into one fixed 24-byte frame buffer and
  uses no Arduino String or dynamic allocation.
- Arduino Nano compile passed with Arduino AVR platform 1.8.7 and SPI 1.0:
  3,860 bytes flash (12%) and 246 bytes global SRAM (12%), leaving 1,802
  bytes for local variables.
- JavaScript syntax, model 15/15, compression 15/15, and all six Arduino
  generator smoke checks passed.
- Real-display orientation, button behavior, brightness, all five patterns,
  and Serial labels remain the required hardware acceptance gate.

### B08-P05 manual hardware results - 2026-06-15

- Nano compile/upload, D5/D4 selection, held-button repeat, Serial mode
  labels, all five storage modes, display orientation, and legacy 3-bit
  compatibility passed on the real hardware.
- User compile evidence matches the automatic compile: 3,860 bytes flash and
  246 bytes global SRAM.
- USB Serial and the display were tested in separate powered phases because
  the current hardware setup could not drive both together.
- Brightness exposed about six visually distinct levels, while Serial
  reported the complete valid range from 0 through 15. The upper settings
  looking alike is accepted. Diagnostic output says `level X/15` and
  hard-clamps to 15.
- B07 manual testing also exposed a separate world-editor/schema mismatch:
  generated maps contain legacy room objects, causing valid preflight
  blockers. This must be corrected before relying on generated-map preflight.

### B08-P06 generated-map schema correction - 2026-06-15

- Generated maps and individually created rooms now normalize through the
  canonical schema-v2 preparation and validation path.
- Stable room IDs, section ownership, room reference arrays, section room
  IDs, world dimensions, start references, version data, and exact
  compatibility frames remain synchronized.
- Compatibility map frames stay in room data unless a room explicitly owns a
  shared frame reference. A 26 x 32 map therefore keeps one existing shared
  frame instead of creating 832 duplicate frame-library records.
- Actual Generate Map and Create/select room event paths passed in a DOM
  harness. Both 2 x 2 and 26 x 32 maps had zero structural or resource
  blockers.
- A 26 x 32 JSON round trip preserved frames and start position. Worldmap and
  combined Arduino generation passed.
- Corrected 26 x 32 combined Nano compile: 17,600 bytes flash (57%) and 472
  bytes global SRAM (23%), leaving 1,576 bytes for local variables.
- Model tests pass 16 of 16, compression tests 15 of 15, and all six Arduino
  generator smoke checks pass.

### B09-P01 world editor UI and ownership design - 2026-06-15

- Defined one compact editor with top world controls, section/coordinate
  overview, fixed 8 x 3 active room, palette/properties, previews, and exact
  estimates.
- Assigned canonical ownership for worlds, sections, rooms, visuals, start,
  settings, editor selection, runtime state, and generated data.
- Locked implicit-room selection without authored allocation, section rules,
  palette capacities, room types, start blocking, generate/randomize command
  boundaries, preview-first 018 import, Undo/Ctrl+Z, validation boundaries,
  responsive behavior, and B09 implementation order.
- Terrain, treasure, goals, beast markers, interaction systems, battle
  triggers, redo, and unsupported hardware controls remain excluded.
- Requirement and ownership coverage checks passed.

### B09-P02 section and coordinate overview - 2026-06-15

- Added area type, section selection, create/delete/reassign, random section
  assignment, visible Undo, and Ctrl+Z support.
- The overview now renders exactly the logical world dimensions with A.00
  coordinate labels and section distinction. A 26 x 32 world renders 832
  stable coordinate cells.
- Selecting an implicit empty coordinate changes editor state only and was
  verified byte-for-byte not to mutate project JSON.
- Section create, delete/reassign, randomize, area-type change, and Generate
  are one-transaction undo operations. One through nine sections are
  supported; overlap and a tenth section remain validation errors.
- Generated maps correctly retain section ownership, preflight with zero
  blockers, and survive JSON round trip at 26 x 32 with nine sections.
- Model tests pass 16/16, compression tests 15/15, and all six Arduino
  generator smoke checks pass.

### B09-P03 room type and palette editing - 2026-06-15

- Replaced the legacy text/grid room edit path with the shared fixed 8 x 3
  seven-segment editor.
- Empty rooms store no visual payload. Normal and special rooms store exactly
  24 palette indexes. Raw rooms store exactly 24 segment bytes including DP.
- Added global/section palette ownership, 1/2/3/4-bit capacity controls,
  project-glyph slots, blocking labels, painting, raw segment editing, Clear,
  Randomize, and player-start placement.
- All authored room and palette actions validate before commit and create one
  Undo record. Too-small palettes, missing glyph references, invalid cell
  indexes, and blocking start positions are rejected.
- The active display resolves the same glyph segment bytes supplied to the
  packer. Compatibility frames remain synchronized only for canonical
  palette rooms, so palette edits cannot overwrite untouched legacy rooms.
- Exact room payload, sparse record, palette, and section-coordinate byte
  totals are shown. The player `1` remains a preview overlay.
- Focused event-path tests passed palette references, resolved bytes,
  blocking start rejection, raw DP retention, Clear/Randomize/type undo,
  capacity rejection, and JSON round trip.
- Model tests pass 16/16, compression tests 15/15, all six Arduino generators
  pass, and a palette-room project passes combined preflight/export.
- The organization check still reports only the pre-existing `Saved_json`
  root folder.

### B09-P02 manual-test fixes - 2026-06-16

- Manual testing found that Generate still authored every logical coordinate
  as an explicit room, so unedited coordinates could not report `implicit
  empty`.
- Generate now keeps plain worlds sparse: only the start room is explicit.
  With Random `#`, only rooms that actually contain generated blocking
  content are authored explicitly.
- Added **Assign selected** for section editing. It assigns the active
  coordinate to the selected section without creating room visual data.
  Assigning to the default section removes the coordinate from non-default
  section lists.
- Focused event-path test passed: 26 x 32 plain Generate creates one explicit
  start room, B.00 reports implicit empty, assigning B.00 to a new section
  resolves correctly, and Undo removes the assignment without creating a room.
- Implicit 26 x 32 preflight, world export, and combined export passed.
- Syntax checks, model tests 16/16, compression tests 15/15, and all six
  Arduino generator smoke checks passed.
- The organization check now reports two unrelated existing workspace issues:
  `Prompts\Combined Manual Tests_answers.txt` and `Saved_json`.

### B09-P02 undo shortcut clarification - 2026-06-16

- Manual testing confirmed Chrome can reserve `Ctrl+U`, so it is not a
  dependable shortcut for non-coder testing.
- Added `Ctrl+Z` as the normal browser-editor Undo shortcut when focus is not
  inside an input, textarea, or select.
- The visible **Undo** button remains the primary acceptance-test control.
- Clarified the delete-section manual test: assign one coordinate to a
  non-default section, delete that section, then Undo and confirm both the
  section and coordinate assignment return.

### B09-P04 generation, section randomize, and 018 world import - 2026-06-16

- Plain Generate remains sparse: the editor keeps only the start room
  explicit, while untouched coordinates remain implicit empty.
- Added **Randomize section rooms**, which uses the active palette to author
  decorative palette-index rooms only when the user explicitly requests bulk
  content. Raw rooms are left untouched and the start cell is forced onto a
  non-blocking glyph.
- Extended the 018 importer from glyph/frame preview into world import:
  region blocks now preview as proposed sections, map rows preview as raw
  rooms, and valid commit creates sections plus raw room visuals in one undo
  transaction.
- Preview is still non-mutating. Cancel leaves the project byte-for-byte
  unchanged. Invalid sources are blocked before commit for overlaps,
  out-of-range coordinates, missing region assignments, region coordinates
  without matching map rows, and total sections above nine.
- Import commit snapshots the whole project, applies changes, runs schema-v2
  validation, and restores on failure. Undo import restores the exact prior
  project state.
- Focused tests passed for section-room randomize authoring/undo, 018 preview
  non-mutation, valid import commit, undo restore, and imported-project
  world/combined export regression.
- Syntax checks, project-model tests 16/16, compression tests 15/15, and all
  six Arduino generator smoke checks passed.

### B10-P01 authored browser battle data - 2026-06-16

- Browser battle now prefers authored schema-v2 party and foe data instead of
  relying only on the older fixed HP test values.
- Combined browser battle reads the current room's first encounter group when
  present, else falls back to the project's first encounter group and then to
  the first available enemy records.
- Party and foe names, max HP, attacks, healing, and swiftness now come from
  authored project data where available. The two HP inputs remain as fallback
  values only.
- Battle preview labels now refresh from project data so the panel shows the
  expected names and HP before battle starts.

### B11-P01 browser intro and restart flow - 2026-06-16

- Browser movement play now shows a short start message based on the project
  title before movement begins.
- Manual reset and combined defeat restart both show the same short start
  message again before movement resumes.
- Movement is locked while the short lifecycle message is on screen so the
  browser test behaves like a simple real game start/restart loop.

### B11-P02 editable browser intro text - 2026-06-16

- Added one 24-character **Intro text** control beside the browser movement
  settings.
- The intro text is stored in schema-v2 `texts` and referenced from
  `gameFlow.introTextId`, with the project title still used as a fallback.
- Browser start, reset, and defeat restart now use the authored intro text.
- Text entries now receive the same `dataVersion` and `data` repair handling
  as other schema-v2 libraries during validation.

### B11-P03 editable browser victory and game-over texts - 2026-06-16

- Added 24-character **Victory text** and **Game over text** controls beside
  the browser movement settings.
- Browser battle endings now use authored schema-v2 text entries instead of
  hardcoded display strings.
- End-of-battle flow now checks stable outcome keys, so custom text no longer
  risks breaking world return after victory or restart after defeat.

### B12-P01 browser save slots for current position - 2026-06-16

- Added a browser-only three-slot save panel for the current play position.
- These slots are stored separately from Project JSON and are keyed per
  project ID in the current browser.
- Save/load currently restores room and cell only, which matches the current
  browser play-state scope.
- Saving is blocked during battle, transition, intro text, and in `dungeon`
  because save points are not authored yet.

### B12-P02 browser save-slot management polish - 2026-06-16

- Added per-slot **Clear** buttons and overwrite confirmation for non-empty
  slots.
- Added clear confirmation so slot removal is deliberate.
- Slot summaries now include a simple saved-time hint.
- Reused the existing project dialog instead of creating a second prompt
  system.

### B12-P03 live save-availability feedback - 2026-06-16

- The browser save panel now shows a live allow/blocked message instead of
  only reporting failure after a blocked click.
- Slot **Save** buttons now disable whenever the existing save rules block
  saving.
- Valid slot **Load** buttons remain available even when saving is blocked.

### B12-P04 authored dungeon save-point rooms - 2026-06-16

- Added a simple `Save point` room property in the world editor.
- The flag is stored as authored room data.
- In `dungeon`, browser saving is now allowed only when the current room is
  marked as a save point.
- The save panel refreshes immediately after room-property edits and undo.

### B12-P05 exact position save-state definition - 2026-06-17

- Locked the first save-state scope to position only: world index, room x,
  room y, player x, and player y.
- The beta still uses exactly three manual save slots and no EEPROM
  wear-leveling system.
- `saveData.data.encodingLocked` is now true for this position-only scope, so
  Hardware Preflight can report exact EEPROM cost for the current save model.
- HP, items, money, flags, and battle state remain outside this step.

### B12-P06 live browser recovery status - 2026-06-17

- The header now shows `Recovery pending` when edits have queued a browser
  recovery write.
- After a successful IndexedDB recovery write, the header shows
  `Recovery saved HH:MM`.
- Existing recovery states remain: `No recovery`, `Recovery available`,
  `Recovery needs attention`, and `Recovery unavailable`.
- Project JSON save still clears browser recovery.

### B12-P07 visible save-model preflight summary - 2026-06-17

- Hardware Preflight now includes a **Save model** field.
- The visible summary reports `3 slots, position-only` for the current beta
  save scope.
- The field title lists the current save fields and save rules without adding
  a separate save editor.

### B13-P01 shared A0 BrightnessPot export - 2026-06-17

- The shared Arduino display foundation now defines A0 as the official
  `DISPLAY_BRIGHTNESS_POT_PIN`.
- Generated sketches map A0 to the MAX7219 intensity range 0..15.
- Brightness is set during `initDisplay()` and refreshed from the main loop in
  the text, glyph/data, worldmap, battle, and combined-game sketches.
- The existing world-data-modes hardware test keeps its serial brightness
  reporting and remains compatible with the shared A0 rule.

### R01-P01 minimal RPG contract - 2026-06-18

- Updated the beta direction from a generic tiny loop to the approved minimal
  Arduino RPG: two sections, section enemies, locked gate, chests, key, sword,
  potions, leveling, final boss, and ending text.
- Added the project rule that this small RPG must work before full shops,
  full inventory, story graph, audio, multi-party, or broad editor expansion.
- Added schema ownership for authored JSON, runtime state, save state, Arduino
  `PROGMEM`, SRAM, and EEPROM.
- Added resource-budget ownership so chests, flags, inventory, rewards, and
  save bytes cannot be silently treated as free.
- Advanced the active prompt to `R01-P02`, which should add starter default
  data only.
- No browser or Arduino behavior changed in this document-only step.

### R01-P02 minimal RPG starter defaults - 2026-06-18

- Updated `createDefaultProjectV2()` so new schema-v2 projects contain the
  approved minimal RPG starter data.
- The starter now has a 2 x 2 world, two sections, section-one normal enemy,
  section-two final boss, authored gate/wall metadata, eight section-one
  chests, key/sword/potion/gold item data, ending/key texts, level-up
  constants, and expanded minimal-RPG save fields.
- Added a dedicated project-model regression test for the starter defaults.
- Existing gameplay behavior was not intentionally wired to the new data in
  this step. Gate/chest/potion/level/boss behavior remains for later prompts.
- Local JS execution was not available in this environment, so the browser
  model test still needs to be run manually from `projectModelTests.html`.
- Follow-up fix: V1 migration now resets to a simple one-section migrated
  project instead of inheriting the two-section minimal RPG starter metadata.
- Follow-up fix: generated-map preparation now assigns generated rooms to the
  section that owns each coordinate, so two-section starter defaults no longer
  break generated-map preparation tests.

### R01-P03 minimal RPG summary panel - 2026-06-18

- Added a read-only minimal RPG summary block to the main project hub.
- The summary reports worlds/sections, section enemy assignment, chest counts,
  key and sword chest presence, potion heal amount, sword attack bonus, hero
  level/XP target, key flag, boss flag, and save scope.
- The summary refreshes through the existing hub refresh path, so it updates
  after creating or loading project JSON.
- Corrected the new-project dialog/status text so it no longer describes the
  starter as only two rooms and one enemy type.
- No chest, gate, potion, leveling, battle, or Arduino behavior was added in
  this status-view step.

### R02-P01 section-based browser battles - 2026-06-18

- Browser movement now resolves the current section and prefers that section's
  authored encounter group when a battle starts.
- Standalone/browser battle start now also falls back to the emulator's current
  section encounter group if no explicit encounter group ID is passed.
- This keeps section 1 on the normal enemy and section 2 on the boss without
  adding locked-gate, chest, XP, potion, sword, or ending behavior yet.
- Trigger battles on/off behavior remains unchanged.
- Follow-up fix: one-enemy encounter groups now stay one-enemy battles instead
  of filling the second foe slot from the full enemy library.

### R02-P02 locked-gate browser movement - 2026-06-18

- Browser movement now checks authored locked-gate data when movement crosses
  from one room to another.
- The minimal RPG gate between section 1 and section 2 blocks movement until
  `hasAncientKey` is true.
- Added a console-only test hook:
  `SevenSegEmulator.setMinimalRpgFlag("hasAncientKey", true)`.
- Ordinary wall blocking remains unchanged.
- Chest opening, loot, XP, potion, sword, and ending behavior remain for later
  prompts.
- Follow-up fix: starter rooms now show visible `8` wall cells and a visible
  `1` gate cell. Browser movement treats `8` as a wall and treats edge `1`
  cells with locked-gate metadata as keyed gates.
- Follow-up fix: the browser can also draw those wall/gate symbols from the
  authored section/gate metadata, so older blank starter rooms still show the
  intended border.

### R02-P03 browser chests and loot - 2026-06-18

- Browser movement now draws unopened starter chests as `C`.
- Stepping onto an unopened chest opens it once and removes the visible `C`.
- Gold chests add `10 Gold` to `minimalRpg.currentGold`.
- The key chest sets `minimalRpg.flags.hasAncientKey` and shows
  `You now hold the anchent key`.
- Potion chests increase `minimalRpg.potionCount`.
- The sword chest marks the sword obtained/equipped, equips `equipment_sword`
  on the starter hero, and applies the sword attack bonus to browser hero
  weapon state.
- The existing Minimal RPG summary now shows current gold, opened chest count,
  potion count, and sword equipped state.
- Battle potion use, XP, leveling, ending behavior, and Arduino export remain
  for later prompts.

### R03-P01 browser XP and leveling - 2026-06-19

- Browser battle victory now awards XP from the active encounter group's enemy
  `stats.xpReward`.
- The starter `Gob` remains worth 7 XP, with the hero's first XP target at 20,
  so roughly three normal wins produce the first level-up.
- Level-up increases hero level by 1, max/current HP by 5, and attack by 2.
- Combined browser battles award XP before returning to the same worldmap
  position.
- The standalone browser battle button also awards XP through the emulator's
  current encounter hook.
- The Minimal RPG summary now shows level, current XP/target XP, HP, and ATK.
- Follow-up fix: XP is now added before the battle end message is shown, so
  the visible victory text/status includes the XP result.
- Follow-up fix: battle end now writes party current HP back to hero stats, so
  the next battle starts with the HP left after the previous battle instead of
  always starting full.
- Follow-up fix: long gameplay text is now paged into 24-character screens
  and advances one page per button/key press. This applies to browser movement
  text screens and battle result text, and is now a project rule for future
  text work.
- Potion use, final boss ending, and Arduino export remain for later prompts.

### R03-P02 browser sword attack bonus - 2026-06-19

- Battle equipment now preserves direct equipment IDs such as
  `equipment_sword` instead of converting them only to numeric item codes.
- Direct project equipment records can now contribute attack, armor, speed,
  accuracy, evasion, and resistance bonuses to browser battle stats.
- The starter sword's `attackPowerBonus: 4` is applied through battle equipment
  calculation, not by repeatedly increasing the hero's base attack.
- The Minimal RPG summary now shows battle-effective ATK, including the sword
  bonus only when the sword is equipped.
- Re-opening the same sword chest remains blocked by the opened-chest flag, so
  the reward cannot stack.

### R03-P03 browser potion in battle - 2026-06-19

- The browser battle `ITEM` submenu now shows a real potion entry when
  `minimalRpg.potionCount` is above zero.
- Potion labels include the current count, such as `POT1`.
- Using a potion targets a living party member, heals by the potion item's
  configured heal amount, defaulting to 10 HP, and caps at max HP.
- Potion use decreases `minimalRpg.potionCount` by 1 and refreshes the Minimal
  RPG summary.
- When potion count is zero, the item menu shows `NO POT` and does not spend a
  hero action.
- This is browser-only. Arduino battle item export remains for a later step.

### R03-P04 browser potion outside battle - 2026-06-19

- Added a simple outside-battle item view to the Browser Movement Test.
- The `Item` button opens/closes the item view, and `Use` spends a potion when
  the view is open.
- The item view shows potion count and current hero HP, for example
  `POT1 HP 12/30`.
- Potion use heals by the configured potion amount, defaulting to 10 HP, caps
  at max HP, and decreases `minimalRpg.potionCount`.
- Potion use writes the new HP to `minimalRpg.heroCurrentHP` and the starter
  hero's current HP fields.
- Potions are not spent when count is zero or HP is already full.
- Movement and browser save-slot actions are blocked while the item view is
  open.
- Keyboard support is small: `I` opens/closes the item view, `Enter` uses a
  potion while open, and `Escape` closes it.
- This remains browser-only. Full inventory and Arduino export are later work.

### R04-P01 browser final boss battle - 2026-06-19

- Browser battle config now carries `isFinalBossEncounter` from project data.
- A battle is treated as a final-boss encounter when its encounter group has
  `data.finalBoss: true`, or one of its member enemies has
  `data.finalBoss: true`.
- Starting a boss battle now sets browser status to `Boss battle: Boss.`.
- Section 1 still uses the normal encounter and section 2 still uses
  `encounter_final_boss` from the starter project data.
- The final-boss enemy remains stronger than the section-1 enemy.
- This step does not set `bossDefeated`, show ending text, change post-boss
  behavior, or alter Arduino export.

### Battle menu cancel fix - 2026-06-19

- Added a visible `Esc / No` battle button.
- The same cancel action is also available from the keyboard `Escape` key.
- In a submenu such as `ITEM`, cancel returns to the main battle menu without
  spending the actor's turn.
- If `ITEM` shows `NO POT`, Confirm now reports that there are no potions and
  explicitly tells the user to press `Esc / No` to go back.

### R04-P02 browser ending text - 2026-06-19

- Final-boss victory now sets the authored final boss flag.
- The default final boss flag remains `bossDefeated`.
- Final-boss victory now uses the authored final boss victory text ID.
- The default final boss victory text ID remains `text_ending`, with starter
  text `You have saved the world, Thank you.`.
- Final-boss victory skips the normal XP append so the ending text stays clear.
- Normal non-boss victory XP and level behavior remains unchanged.
- The boss flag lives in Project JSON state, so saving and reloading Project
  JSON preserves it.
- Post-boss repeat behavior is still intentionally left for R04-P03.

### R04-P03 post-boss behavior - 2026-06-19

- Browser movement now checks encounter conditions before a random battle can
  start.
- Supported first-pass encounter conditions are `flagFalse` and `flagTrue`.
- The starter final-boss encounter already uses `flagFalse bossDefeated`.
- After final-boss victory sets `bossDefeated` to true, section 2 no longer has
  an available random boss encounter.
- If no encounter is available, the random battle trigger simply does nothing.
- This keeps the post-ending world stable without adding a replay-ending
  command yet.
- This step is browser-only. Arduino export remains for a later milestone.

### R04-P03 boss swiftness fix - 2026-06-19

- Enemy battle setup now reads `swiftness.mode: "fixed"` with `value`.
- Enemy battle setup also falls back to canonical `stats.speed` when
  `stats.swiftness` is absent.
- This fixes the starter boss, which is authored with fixed swiftness 6 but was
  previously allowed to fall through to a random speed.
- The intent is that the boss reliably reaches a `FOE_DECIDE` turn if the
  player does not defeat it first.

### R05-P01 browser save-state expansion - 2026-06-19

- Browser save slots now store a version-2 play-test snapshot.
- The position fields remain unchanged, so old position-only slots can still be
  loaded for position.
- New slots also store Minimal RPG state: gold, potion count, sword state, key
  flag, boss flag, opened chests, and any other current minimal RPG fields.
- New slots also store the starter hero's stats, equipment IDs, and hero data,
  so level, XP, HP, max HP, attack/stat changes, and sword equipment can be
  restored.
- Loading a version-2 browser slot restores the saved RPG snapshot and marks
  the in-memory project dirty so the summary/preflight refresh.
- This remains browser-only. Arduino EEPROM save layout is still R05-P02.

### R05-P01 level-up HP battle sync fix - 2026-06-19

- Battle hero HP now prefers current canonical `maxHP` / `maxHp` before the
  older `maxHpBase` alias.
- Level-up now also updates `maxHpBase` to match the new max HP.
- This fixes the case where Minimal RPG summary showed level-up HP 35, but a
  new battle still started the hero at 30/30 because stale `maxHpBase` was read
  first.

### R05-P01 runtime progress versus editor defaults fix - 2026-06-19

- Runtime level-up progress must not be overwritten by stale manual battle-stat
  editor controls.
- After emulator or battle changes the project, the manual battle-stat inputs
  are refreshed from current hero stats.
- When project syncing uses `resetHeroHp: false`, the sync preserves a higher
  existing hero level and max HP instead of lowering them to stale input values.
- This protects the Level 2 / 35 HP runtime state when a new battle starts.

### R05-P02 EEPROM save contract - 2026-06-19

- Minimal RPG EEPROM save remains exactly three manual save slots.
- Browser save slots remain separate from Arduino EEPROM save.
- The fixed per-slot EEPROM payload is now 17 bytes:
  world index, room x/y, player x/y, hero current HP, hero max HP, hero level,
  hero XP, hero attack, gold, potion count, equipment flags, story flags, and
  chest flags.
- Global header is 4 bytes. Each slot header is 4 bytes.
- Total EEPROM estimate is exact: `4 + 3 * (4 + 17) = 67 bytes`.
- Equipment flags use bit 0 for sword obtained and bit 1 for sword equipped.
- Story flags use bit 0 for ancient key, bit 1 for gate opened, and bit 2 for
  boss defeated.
- Chest flags use bits 0-7 for the eight starter chests.
- Preflight now warns if the declared EEPROM contract bytes disagree with the
  state-field byte counts.
- This step does not implement Arduino EEPROM read/write yet.

New compile and hardware results should be appended here briefly. Detailed
historical reports remain archived.

### R06-P01 Arduino gate/chest test - 2026-06-19

- Added a standalone **Gate And Chest Test** Arduino export.
- The export name is `SevenSeg_Gate_Chest_Test`.
- It uses the normal timestamped `Arduino_Tests/<sketch>/<sketch>.ino`
  folder system.
- This test is deliberately separate from battle and the combined Arduino
  game.
- Hardware controls:
  - A0 controls MAX7219 brightness.
  - A4 controls facing direction using the existing measured thresholds.
  - D5 moves forward.
  - D4 moves backward.
  - Holding D5 or D4 for 500 ms repeats about every 200 ms.
- The test map has two sections/rooms.
- Room A shows visible `8` wall cells on the right side and a visible `1`
  locked gate in the middle.
- Unopened chests display as `C`.
- Opening chests updates simple runtime state:
  gold, ancient key, sword obtained, and potion count.
- The `1` gate blocks before the key and allows travel to the second room after
  the key chest is opened.
- Text messages stay on the display until D5 or D4 is pressed.
- No EEPROM read/write is included in this step.

### R06-P02 Arduino reward/level test - 2026-06-19

- Added a standalone **Reward And Level Test** Arduino export.
- The export name is `SevenSeg_Reward_Level_Test`.
- It uses the normal timestamped `Arduino_Tests/<sketch>/<sketch>.ino`
  folder system.
- This test is deliberately separate from battle, world movement, and EEPROM.
- Hardware controls:
  - A0 controls MAX7219 brightness.
  - D5 advances the scripted reward sequence.
  - D4 resets the test to the starting state.
- The compact stat line is:
  `L1 XP00 HP30 A06 P0`
- The scripted proof sequence is:
  - fight reward 1: XP becomes 10
  - fight reward 2: level becomes 2, XP becomes 0, HP/max HP becomes 35
  - sword reward: attack becomes 10
  - potion reward: potion count becomes 1
  - damage step: HP becomes 25
  - use potion: HP heals to 35 and potion count becomes 0
- Text messages stay on the display until D5 or D4 is pressed.
- No Serial Monitor is required for this test.

### R06-P02 reward/level button-repeat fix - 2026-06-19

- Hardware test showed the first XP-only reward step could be skipped.
- Cause: after D5 opened a message, the debounce state could still be LOW long
  enough for hold-repeat timing to fire once after the user dismissed the
  message.
- Fix: standalone test hold-repeat now requires the physical button reading to
  still be LOW before repeat can fire.
- This change was applied to the gate/chest and reward/level generated test
  helpers.

### R06-P03 Arduino boss-ending test - 2026-06-19

- Added a standalone **Boss Ending Test** Arduino export.
- The export name is `SevenSeg_Boss_Ending_Test`.
- It uses the normal timestamped `Arduino_Tests/<sketch>/<sketch>.ino`
  folder system.
- This test is deliberately separate from the full battle system, world
  movement, and EEPROM.
- Hardware controls:
  - A0 controls MAX7219 brightness.
  - D5 hits the boss or continues text.
  - D4 resets the test.
- The test starts at `BOSS HP20 FLAG0`.
- First D5 hit lowers boss HP to 10.
- Second D5 hit lowers boss HP to 0, blinks `BOSS DEFEATED`, sets the
  boss-defeated flag, shows the ending text, then displays `END FLAG1`.
- Ending text is the minimal RPG target text:
  `YOU HAVE SAVED THE WORLD THANK YOU`.
- No Serial Monitor is required for this test.

### R07-P01 combined Minimal RPG data packing - 2026-06-19

- Combined Arduino export now emits a fixed **Minimal RPG packed generated data**
  section.
- This is data packing only. Full behavior parity remains R07-P02.
- The generated tables use PROGMEM and classic C data. No Arduino `String` or
  dynamic allocation is introduced.
- Packed data includes:
  - text strings and a text pointer table
  - chest records
  - gate records
  - enemy records
  - encounter records
  - potion heal value
  - sword attack bonus
  - story/equipment/chest flag bit positions
- Hardware Preflight now treats the `minimal-rpg-v1` starter data categories as
  exact generated data instead of unknown:
  text, interactions/events, heroes, enemies, encounters, items/equipment, and
  battle rules.
- Spells/abilities and audio remain outside the fast Minimal RPG target and can
  still warn if authored.

### R07-P01 victory event preflight fix - 2026-06-19

- Hardware Preflight could still block combined export with:
  `The required victory event cannot be reached from an event entry point.`
- The Minimal RPG victory event is not reached by normal event-graph walking.
  It is triggered by battle victory.
- Preflight reachability now treats `gameStartEventNodeId`, `victoryEventNodeId`,
  and `defeatEventNodeId` as system-triggered event entry points.
- This keeps the victory event reference validated while allowing the combined
  export to proceed.

### R07-P02 combined browser/Arduino parity wiring - 2026-06-19

- Combined Arduino export now uses the Minimal RPG packed data for runtime
  behavior, not only storage inspection.
- The generated sketch now includes:
  - `minimalRoomSections` for section-based encounter selection
  - dynamic chest overlay and chest-open bits
  - key/gate checks
  - potion count and potion use
  - sword attack bonus
  - persistent hero HP across battles
  - XP and level-up rewards
  - boss-defeated flag
  - ending text after final-boss victory
- Starter hero HP and attack now prefer canonical hero stats from the project
  instead of old manual battle defaults.
- Room indexes in chest/gate records are now 16-bit so larger worlds do not
  silently overflow past 255 rooms.
- Intentional remaining gap: full compile/upload/playthrough is R07-P03.

### R07-P03 combined hardware acceptance gate - 2026-06-19

- R07-P03 is a hardware gate, not a feature-building step.
- The required test is to export the combined game, compile/upload it to the
  official Arduino Nano hardware, and play the Minimal RPG path end to end.
- Required result notes:
  - Arduino IDE flash usage line
  - Arduino IDE global variable/SRAM usage line
  - whether key, gate, chests, rewards, potion, sword, battles, boss, and ending
    all worked
- If compile/upload/playthrough fails, the exact failing step becomes the next
  fix before any R08 work begins.

### R07-P03 combined hardware acceptance pass - 2026-06-20

- Full Minimal RPG hardware playthrough passed after focused fixes.
- Recorded Arduino IDE footprint:
  - Sketch uses 11870 bytes, 38% of program storage.
  - Global variables use 638 bytes, 31% of dynamic memory.
- Confirmed on hardware:
  - world display appears
  - section 1 movement works
  - gold, potion, sword, and key chests open and disappear
  - ancient-key text appears
  - gate blocks before key and allows travel after key
  - section 1 battles start and show `GOB`
  - boss battle starts in section 2 and shows `BOSS`
  - boss fights back
  - victory ending text appears
  - section 2 battles stop after boss-defeated flag is set
  - visible `8 / 1 / 8` gate border blocks the wall cells

### R08-P01 Minimal Game Preset - 2026-06-20

- Added a visible **Use Minimal RPG Preset** button to the Minimal RPG summary.
- The button reuses the approved schema v2 starter data.
- It refuses to run during an active battle.
- It asks for confirmation before replacing unsaved work.
- After confirmation, the starter is ready to play, save, or export.

### R08-P02 Simple Main Screen - 2026-06-20

- Added a top-row **Show advanced tools** / **Hide advanced tools** switch.
- The default screen now keeps the beta path visible:
  - Minimal RPG summary and preset
  - Hardware Preflight
  - Worldmap/browser movement test
  - Combined Browser Test and Combined Game export
- Older separate hardware tests and specialist editors are hidden by default.
- Hidden tools are not deleted and remain available from the advanced switch.
- This is a UI simplification only; it does not change game data or generated
  Arduino behavior.

### Minimal RPG larger starter map - 2026-06-20

- Updated the approved starter map shape.
- Section 1 is now a 5 x 5 room area with the two bottom-right rooms reserved
  for section 2.
- Section 2 remains a two-room final-boss area.
- The locked gate moved to the bottom-right section boundary:
  `room_d04` -> `room_e04`.
- The room above the gate has a wall between sections instead of a passable
  gate.
- The eight starter chests are scattered through section 1.
- Section 1 rooms now include fixed random-looking `#` blocking cells.
- The change is deterministic so browser tests and Arduino exports stay
  repeatable.

### R08-P04 shared browser world/battle display - 2026-06-20

- Simplified mode now uses the Browser Movement Test display for both world
  movement and battle.
- The visible browser display remains a 24 digit `7-seg + dp` display in world,
  text, transition, and battle states.
- Random battles no longer draw only into the hidden advanced Battle Test
  display.
- Added visible battle controls beside the Browser Movement Test:
  `Battle Up`, `Battle Down`, `Esc / No`, and `Confirm`.
- This is browser UI/runtime wiring only. Arduino display export behavior was
  not changed by this step.

### R08-P05 browser music assignment and preview - 2026-06-20

- The Chiptune Song Machine now has **Export song JSON**.
- The main app now has a **Minimal RPG Music** panel.
- The panel imports pasted or opened song JSON into `project.music`.
- The first imported song is assigned to worldmap music by default.
- The second imported song is assigned to battle music by default.
- The user can manually change the worldmap and battle song assignments.
- Browser music preview uses a plain Web Audio runtime with square melody,
  square harmony, and triangle bass voices.
- Browser movement starts/resumes worldmap music when preview is enabled.
- Random battle start switches to battle music.
- Battle victory or reset returns to worldmap music.
- Follow-up fix: the browser runtime now preserves fractional gate values from
  the Chiptune Song Machine, such as `0.82`, instead of rounding them to `1`.
- Follow-up fix: mode switching now stops already scheduled notes so the old
  song does not continue briefly over the new song.
- This is browser-only audio integration. Arduino combined export remains
  no-audio until a separate hardware audio export passes.

### R09-P01 next audio hardware gate - 2026-06-20

- The next audio step is a standalone Arduino music hardware export.
- It must use the imported `project.music` songs and the two Minimal RPG
  assignments: worldmap and battle.
- It must be separate from the combined game export.
- Approved pins remain:
  - D3 melody.
  - D9 bass.
- Song data must be stored in PROGMEM and played with non-blocking timing.
- Do not add combined-game music until the standalone test compiles, uploads,
  and plays both melodies on hardware.

### R09-P01 standalone music hardware export implementation - 2026-06-20

- Added **Export Music Test .ino** to the Minimal RPG Music panel.
- The export name is `SevenSeg_Music_Hardware_Test`.
- The generated sketch uses:
  - D3 melody square wave.
  - D9 bass square wave.
  - D5 next song.
  - D4 previous song.
- It exports up to two assigned songs:
  - Worldmap music.
  - Battle music.
- Melody and bass are precomputed to half-period microsecond values during
  export.
- Song data is stored in PROGMEM:
  - melody half-period table.
  - bass half-period table.
  - duration ticks.
  - song offsets, lengths, BPM, and gate percentages.
- The sketch does not use Arduino `tone()` so it can toggle D3 and D9
  independently.
- Playback is non-blocking. Note changes use `millis()` timing, while audio
  square waves use Timer1 compare interrupts and direct port writes:
  - D3 is `PORTD` bit `PD3`.
  - D9 is `PORTB` bit `PB1`.
- The sketch plays a startup pin test before song playback:
  - D3 melody beep.
  - D9 bass beep.
  This separates wiring/amplifier problems from song-player problems.
- After the first silent hardware result, the music test also initializes the
  normal 8 x 3 MAX7219 display as a visible heartbeat:
  - `D3` during the D3 pin test.
  - `D9` during the D9 pin test.
  - `S1` / `S2` while each selected song plays.
  If the display changes but audio stays silent, the sketch is running and the
  next suspect is the physical audio path.
- After the display heartbeat worked but audio was still silent, the startup
  test was expanded again:
  - first raw blocking square wave on D3.
  - then raw blocking square wave on D9.
  - then Timer1 square wave on D3.
  - then Timer1 square wave on D9.
  If both raw blocking pin tests are silent while the display labels advance,
  the music driver is no longer the main suspect; check the physical audio
  circuit and whether the approved pins are actually wired to it.
- This export is intentionally separate from the combined Minimal RPG game.
- Hardware compile/upload/playback results are still required before R09-P02.

### R09-P02 combined game music export implementation - 2026-06-20

- R09-P01 passed after the hardware audio output was rewired, so the proven
  software path is now used in the combined Minimal RPG export.
- The combined export uses the assigned `project.music` songs:
  - song 1 for worldmap music.
  - song 2 for battle music, or song 1 again if only one song exists.
- Song melody, bass, durations, offsets, BPM, and gate values are stored in
  PROGMEM.
- Audio uses the same approved pins:
  - D3 melody.
  - D9 bass.
- Audio square-wave output uses Timer1 compare interrupts and direct port
  writes. The main loop only advances song events and switches songs.
- If no music is assigned, the combined export generates no-op audio functions
  so no-audio projects remain valid.
- Worldmap music starts in `resetWorldmap()`.
- Battle music starts in `startBattle()`.
- Worldmap music resumes after battle returns to world mode.
- Combined-game pauses now use `audioDelay()` where needed so display updates
  and music event stepping continue during short messages and animations.
- Manual Arduino compile/upload/playback results are required before the next
  roadmap step.
- Hardware compile report from the first combined-audio test:
  - Flash: 13694 bytes, 44% of 30720.
  - SRAM globals: 674 bytes, 32% of 2048.
  - Free SRAM after globals: 1374 bytes.

### Minimal RPG E.02 to E.03 boundary fix - 2026-06-20

- Hardware playtest showed the player could walk from `E.02` directly into
  `E.03`, accidentally entering section 2 without using the locked gate.
- The intended section transition remains the ancient-key gate route.
- The default Minimal RPG starter now draws a visible `8` wall:
  - bottom edge of `E.02`.
  - top edge of `E.03`.
- Minimal RPG data now includes an explicit room-to-room wall:
  - `room_e02` to `room_e03`.
- The Arduino combined export packs explicit room walls into PROGMEM and blocks
  crossing those room boundaries.
- The browser emulator also checks explicit room walls and synthesizes this
  `E.02` / `E.03` wall for older already-loaded starter projects.

### Battle actor prompt HP alternation - 2026-06-20

- When a living hero actor becomes ready, the prompt now alternates every
  800 ms between:
  - the actor name, for example `YOU1`.
  - current HP and max HP, for example `30-30`.
- Both prompt pages are right-aligned on row 3 of the 8 x 3 display.
- The existing blinking DP underline remains active on whichever text is
  currently shown.
- This is implemented in both the browser battle simulator and the combined
  Arduino export.

### Public beta roadmap refresh - 2026-06-20

- The roadmap was rechecked after the project became playable on hardware.
- The old "current next step" pointing back to R09-P01 was replaced.
- The active path is now:
  - R10: final regression, scope lock, clean public package.
  - R11: public GitHub release and GitLab mirror.
  - R12: tutorial scripts, tutorial assets, and published tutorial links.
- The release checklist now includes:
  - audio in combined Arduino export,
  - `E.02` / `E.03` boundary check,
  - right-aligned actor prompt HP alternation,
  - public GitHub/GitLab publication evidence,
  - tutorial links or tutorial file names.
- The tutorial outline now includes audio wiring/use, music assignment, public
  package explanation, and GitHub/GitLab release walkthrough.

### R10-P01 final beta regression started - 2026-06-21

- R10-P01 is a regression and evidence step, not a feature-building step.
- `Documentation/MANUAL_TESTS.md` now contains one compact final hardware
  regression checklist for:
  - fresh combined export,
  - Arduino compile and memory figures,
  - upload,
  - movement/blocking/transitions,
  - `E.02` / `E.03` boundary,
  - ancient-key gate route,
  - chests and rewards,
  - battle and boss ending,
  - worldmap/battle music switching,
  - right-aligned actor prompt HP alternation.
- `Documentation/BETA_TEST_RECORD.md` now has fields for the same beta
  evidence plus GitHub/GitLab/tutorial readiness.
- Local environment note: no usable local Node, Arduino CLI, or bundled
  workspace runtime is available in this thread, so Arduino compile/upload
  remains a manual hardware gate.

### R10-P01 first hardware regression result - 2026-06-21

- User exported and uploaded:
  - Project JSON: `BETA_JSON_EVIDENCE.json`.
  - Sketch folder: `SevenSeg_BETA_EVIDENCE_ARDUINO_INO_20260621_133418_329`.
- Compile result:
  - Flash: 14222 bytes, 46% of 30720.
  - SRAM globals: 679 bytes, 33% of 2048.
  - Free SRAM after globals: 1369 bytes.
- Hardware result was broadly playable:
  - upload, brightness, A4, D5, D4, movement, transitions, blocking,
    `E.02` / `E.03`, gate route, chests, music switching, actor prompt,
    normal battles, boss battle, ending text, and no boss restart passed.
- Bugs found:
  - battle effect text was still partly hardcoded.
  - enemy attacks displayed `-10` while actual HP dropped by the enemy's real
    attack value.
  - HEAL displayed `50` while actual HP changed by the hero's real heal value.
  - potion test wording expected exactly 10 HP even when max HP capped the
    actual gain.
  - leveling currently only reaches level 2 in the tested export.
- Fix policy:
  - display the actual applied amount, not the nominal action label.
  - potion power remains 10 HP, but if max HP caps the gain, display the capped
    amount actually added.
  - this fix affects the browser battle simulator and newly generated combined
    Arduino sketches.
  - combined Arduino export now keeps an XP target that starts at 20 and grows
    by 10 after each level, so fresh exports can continue leveling past level 2.

### Combined export battle calculation selector - 2026-06-21

- The `index.html` battle calculation selector is stored as
  `project.battleRules.calculationMethod`.
- The combined Arduino export now writes that selected method into
  `BATTLE_CALC_METHOD`.
- The generated combined sketch supports the same 11 method IDs as the browser
  battle test:
  - Dungeons & Dragons 5e.
  - Pathfinder 2e.
  - GURPS.
  - Fate Core.
  - Call of Cthulhu / BRP.
  - Shadowrun 5e.
  - World of Darkness / Storyteller.
  - Final Fantasy I NES.
  - Dragon Quest NES.
  - Pokemon.
  - Ultra simple attack vs defense.
- The Arduino version uses compact integer math and the canonical hero/enemy
  stats already used by the browser test.
- Both hero attacks and foe attacks in the combined sketch now call the shared
  generated `battleAttackDamage(...)` function.
- Manual hardware check: select a non-simple calculation method, export a fresh
  combined sketch, compile/upload, and confirm battle damage/misses are no
  longer fixed to the old direct attack values.

### Combined export hardware system menu - 2026-06-21

- The generated combined Arduino game now has a world-map system menu.
- Access: hold D4 and D5 together for one second while on the world map.
- Hardware menu labels are shortened for the 8-column display:
  - `SAVE` = Save state.
  - `LOAD` = Load state.
  - `ITEM` = Use Items.
  - `STATS` = Stats.
- A4 selects menu row, D5 confirms, D4 closes/back.
- First save version uses one EEPROM slot through Arduino's built-in
  `EEPROM.h`.
- Saved state includes room index, player cell, story/equipment/chest flags,
  gold, potion count, level, XP, next XP target, max/current HP, and attack.
- `ITEM` currently uses one potion outside battle, capped at max HP.
- `STATS` shows a compact paged text summary: level, XP, HP, attack, gold, and
  potions.

### R10-P02 public beta scope lock - 2026-06-21

- Added `Documentation/BETA_SCOPE.md` as the active public-beta scope document.
- The first public beta is now defined as the Minimal RPG maker/export path:
  browser project editing, Minimal RPG starter, JSON save/load, combined
  Arduino export, official 7-SegBoy hardware, world movement, chests, key gate,
  section battles, boss ending, selected battle calculation method, D3/D9
  music, and one EEPROM runtime-state save slot.
- Full object editors, full story/event systems, complete RPG inventory,
  unsupported wiring, multiple EEPROM save slots, and full project save/load on
  Arduino EEPROM remain out of scope for the first beta.
- Release docs were updated so active public-beta documentation no longer says
  combined Arduino audio is missing or that Arduino saves are only the old
  three-slot position-only model.
- Active milestone advanced to R10-P03: clean public package.

### R10-P03 public package preparation - 2026-06-21

- Added public-root `README.md` for the first beta.
- Added public-root `CHANGELOG.md` with the first public beta candidate notes.
- Added public-root `.gitignore` to keep generated Arduino exports, backups,
  private saved JSON, and temporary files out of public repositories.
- Updated `Documentation/BETA_PACKAGE_CONTENTS.md` so these root files are
  required package contents.
- Created clean public package folder:
  `C:\Users\ake_s\Documents\MAKE_a_Game__maker\7-SegBoy_Maker_BETA_public_20260621`.
- The package includes the root app files, active documentation, current
  milestone prompt, optional browser self-tests, `References/Original_Tools`,
  and the new `Documentation/Hardware` EasyEDA/Gerber/BOM files.
- The package excludes development backups, `old`, `Arduino_Tests`,
  `Saved_json`, root backup files, documentation backup files, prompt backup
  files, and the backend/experimental folders listed in the package rules.
- Verification check found required public files present and no accidental
  backup/generated/private folders in the package copy.
- Active milestone advanced to R11-P01: repository readiness.

### R11-P01 repository readiness - 2026-06-21

- `README.md` explains the beta, official hardware, hardware design files,
  fast test path, saving model, and license.
- `CHANGELOG.md` describes the first public beta candidate.
- `.gitignore` excludes generated Arduino exports, backups, private saved JSON,
  and temporary files.
- `Documentation/BETA_PACKAGE_CONTENTS.md` now includes public repository
  metadata:
  - repository name `7-SegBoy-Maker`,
  - short GitHub/GitLab description,
  - topics,
  - first beta tag `v0.1.0-beta`,
  - first beta release title,
  - PCB/Gerber verification warning.
- No GitHub or GitLab publishing was performed in this step.
- Active milestone advanced to R11-P02: GitHub public beta.

### R11-P02 GitHub release preparation - 2026-06-21

- Added first beta release notes text to `CHANGELOG.md`.
- Added a GitHub release body draft to `Documentation/BETA_PACKAGE_CONTENTS.md`.
- Added manual GitHub publish steps to `Documentation/BETA_PACKAGE_CONTENTS.md`.
- Updated `Documentation/BETA_RELEASE_CHECKLIST.md` so the release checklist
  points to the repository metadata and release body draft.
- No public GitHub action was performed because publishing still needs explicit
  user approval.

### R11-P02 publish attempt - 2026-06-21

- User approved public publishing.
- Automatic publishing could not be completed from this Codex shell because:
  - `git` is not available in PATH,
  - GitHub CLI `gh` is not available in PATH,
  - no GitHub login token or authenticated publishing tool is available to
    Codex.
- Prepared release ZIP for manual upload:
  `C:\Users\ake_s\Documents\MAKE_a_Game__maker\7-SegBoy-Maker-v0.1.0-beta.zip`.
- R11-P02 remains open until the GitHub repository and `v0.1.0-beta` release
  are actually published.

### R11-P02 GitHub public beta published - 2026-06-21

- GitHub repository published:
  `https://github.com/NerdingAndHoarding/7-SegBoy-Maker`.
- Release `v0.1.0-beta` published:
  `https://github.com/NerdingAndHoarding/7-SegBoy-Maker/releases/tag/v0.1.0-beta`.
- Release asset uploaded:
  `7-SegBoy-Maker-v0.1.0-beta.zip`.
- Verified repository visibility: public.
- Verified repository topics:
  `agplv3`, `arduino`, `arduino-nano`, `browser-tool`, `max7219`,
  `rpg-maker`, `seven-segment-display`.
- Verified release asset digest from GitHub:
  `sha256:320f36b9cd16cb6fbab86eb28403fa7c203055c356e4bc8372419383962c6cdc`.
- GitHub Pages enabled from branch `main`, path `/`:
  `https://nerdingandhoarding.github.io/7-SegBoy-Maker/`.
- Active milestone advanced to R11-P03: GitLab public mirror.

### Post-beta feature milestone plan - 2026-06-22

- Converted `Prompts/Additional_features_to_add_to_7-seg-maker.txt` into
  `Documentation/POST_BETA_FEATURE_MILESTONES.md`.
- The plan follows the public-beta maintenance rule: new features start in the
  development folder and only move to the public package after browser,
  preflight, Arduino export, and hardware testing when relevant.
- The milestone order favors item/equipment and battle visuals before larger
  map nesting, multi-enemy battles, hero selection, and improved music tools.
- Updated `Documentation/ROADMAP.md` so the post-beta backlog points to the new
  milestone document and no longer names `R10-P03` as the current next step.

### Post-beta fast-track roadmap revision - 2026-06-22

- Re-read `Prompts/Additional_features_to_add_to_7-seg-maker.txt`.
- Rewrote `Documentation/POST_BETA_FEATURE_MILESTONES.md` into a faster,
  moderately safe plan.
- Removed the separate giant schema-foundation milestone. Schema work is now
  added only when a feature needs it.
- Merged items, equipment, and world-map menu into one playable feature group.
- Merged imported battle visuals and `BattleModeActionAnimations` into one
  feature group.
- Merged two-hero party and multiple enemies into one expanded battle group.
- Kept separate Arduino tests only for risky changes such as display layout,
  nested map transitions, EEPROM/save expansion, audio timing, and large
  memory changes.
- Switched the requested order so battle visuals/action animations come before
  the longer RPG Section 3 expansion.

### Tool access implementation - 2026-06-22

- Implemented safe local helper scaffolding from `access_and_gains.txt`.
- Added `Maintenance/Check-ToolAccess.ps1` and `.cmd` wrapper.
- Added `Maintenance/Compile-ArduinoSketch.ps1` and `.cmd` wrapper.
- Verified Git is installed:
  `C:\Program Files\Git\cmd\git.exe`, version `2.54.0.windows.1`.
- Verified GitHub CLI is installed and authenticated for
  `NerdingAndHoarding`, version `2.95.0`.
- Initial check found Node.js missing from this Codex environment.
- Initial check found Arduino CLI missing from this Codex environment.
- Arduino upload automation is intentionally excluded. The Arduino helper is
  compile-only.
- Direct `.ps1` execution may be blocked by Windows policy. The helper scripts
  work after a process-only PowerShell bypass:
  `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force`.
- Verified the compile helper fails safely when `arduino-cli` is missing and
  does not attempt upload.

### Tool access completed - 2026-06-22

- Installed Node.js LTS with winget:
  `OpenJS.NodeJS.LTS`, version `v24.17.0`.
- Installed Arduino CLI with winget:
  `ArduinoSA.CLI`, version `1.5.1`.
- Installed/verified Arduino AVR core:
  `arduino:avr@1.8.8`.
- Updated `Maintenance/Check-ToolAccess.ps1` to find Node.js at:
  `C:\Program Files\nodejs\node.exe`.
- Verified access check now reports OK for:
  Git, GitHub CLI, Node.js, and Arduino CLI.
- Ran compile-only Arduino check on:
  `Arduino_Tests\SevenSeg_Combined_Game_Test_20260621_161810_852`.
- Compile result:
  - flash `16124 / 30720 bytes`,
  - global variables `725 / 2048 bytes`,
  - free SRAM after globals `1323 bytes`.
- No Arduino upload was performed.

### R11-P03 GitLab mirror preparation - 2026-06-22

- Installed GitLab CLI package with winget:
  `GLab.GLab`, version `1.103.0`.
- The current Codex shell did not yet expose `glab.exe` after install; a Codex
  restart may be needed before command-line GitLab login/publishing.
- Added `.gitlab-ci.yml` for GitLab Pages static hosting.
- Added `Documentation/GITLAB_MIRROR_STEPS.md` with manual and command-line
  mirror instructions.
- Updated package/checklist/test-record docs to include GitLab Pages and mirror
  steps.
- No GitLab repository was created and no GitLab publishing was performed in
  this step.

### R12-P01 tutorial scripts prepared - 2026-06-22

- Added numbered tutorial script drafts under `tutorials`.
- Added `tutorials/README.txt` as the script index and asset-needs checklist.
- Tutorial set currently includes:
  - `001_short_intro_turn_based_rpg_7segboy.txt`,
  - `001b_funComersial_short_intro_turn_based_rpg_7segboy.txt`,
  - `002_game_maker_description_hidden_advanced_tools.txt`,
  - `003_game_maker_description_advanced_tools_active.txt`,
  - `004_hardware_files_schematic_pcb_gerber_bom_ordering.txt`,
  - `005_hardware_assembly_tutorial.txt`,
  - `006_edit_your_own_rpg_and_save_project.txt`,
  - `007_planned_future_features.txt`.
- Updated tutorial outline. The `tutorials` folder is local recording material
  and should not be included in public source releases.
- Active milestone advanced to R12-P02: tutorial assets.

### R12-P02 tutorial asset checklist - 2026-06-22

- Added `tutorials/ASSET_CHECKLIST.txt`.
- The checklist lists screenshots, photos, diagrams, and example files needed
  for each tutorial script.
- Hardware tutorial assets are required to match only the official wiring from
  `Documentation/HARDWARE_PROFILE.md`.
- Assets that are not present yet are marked `NEEDED` instead of being treated
  as complete.

### Tutorial publication policy corrected - 2026-06-22

- User clarified that tutorial scripts should not be published.
- Tutorials will be uploaded manually to YouTube.
- Removed `tutorials` from public package contents.
- Removed tutorial script links from public release-note link list.
- Public package local history was reset to remove the unpushed tutorial
  commits.

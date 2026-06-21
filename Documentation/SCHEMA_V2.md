# Project Schema V2

Exact construction, validation, repair, and migration behavior is implemented
in `projectModel.js`. This document defines ownership and compatibility.

## Identity

- `format`: `sevenseg-quest-project`
- `schemaVersion`: `2`
- `project.id`: stable lowercase ID
- `project.title`: user-facing project name
- Official hardware profile only

## Root Areas

- `project`, `settings`
- `glyphs`, `frames`, `animations`
- `worlds`, `sections`, `rooms`, `interactions`
- `heroes`, `enemies`, `encounterGroups`
- `items`, `equipment`, `spells`, `abilities`
- `battleRules`, `texts`, `eventGraph`
- `music`, `soundEffects`
- `gameFlow`, `saveData`
- `editor`, `migration`, `extensions`

Reusable authored objects use stable IDs and references. IDs are unique
across the project.

## Ownership

- Hub: project identity, settings, game flow.
- Visual tools: glyphs, frames, animations.
- World editor: worlds, sections, rooms, interactions.
- Character editors: heroes, enemies, encounter groups.
- Content editors: items, equipment, spells, abilities.
- Battle editor: battle rules.
- Story tools: texts and event graph.
- Audio tools: music and sound effects.
- Each tool preserves areas it does not own.

## Minimum Project

- 1 official hardware profile
- 1 world and 1 section
- 2 world rooms
- 1 hero in the starting party
- 1 enemy type
- 1 encounter group using that enemy
- Valid starting world, room, and cell references

`createDefaultProjectV2()` is the approved starter constructor.

## Minimal RPG Beta Contract

The beta reference game is a small complete RPG. It is larger than the bare
minimum schema project above, but still deliberately fixed and hobby-sized.
`R01-P02` should make the default project contain this data.

### Authored Project JSON

Authored JSON is the saved project design. It should contain:

- one worldmap with two section IDs,
- section-to-enemy assignment:
  - section 1 uses the normal enemy kind,
  - section 2 uses the final-boss enemy kind,
- wall and locked-gate definitions between the two sections,
- chest definitions in section 1,
- chest contents from this fixed set:
  - `gold10`,
  - `ancientKey`,
  - `sword`,
  - `potion`,
- text entries for:
  - `You now hold the anchent key`,
  - `You have saved the world, Thank you.`,
  - short chest/reward/menu messages as needed,
- one hero definition using the canonical actor stats,
- one normal enemy definition,
- one final-boss enemy definition,
- one sword equipment definition with an attack bonus,
- one potion item definition with `healAmount: 10`,
- one XP/level rule tuned so the hero levels approximately every three normal
  fights,
- one final-boss victory rule that sets `bossDefeated` and shows the ending
  text,
- initial game state defaults for gold, potion count, sword state, key flag,
  boss flag, and chest-opened bits.

Suggested root ownership:

- `worlds`, `sections`, `rooms`, and `interactions` own world layout,
  section membership, wall/gate/chest positions, and map triggers.
- `enemies` owns the normal enemy and final boss.
- `encounterGroups` owns section enemy assignment until a fuller encounter
  editor exists.
- `items` owns potion.
- `equipment` owns sword.
- `heroes` owns base hero stats and level fields.
- `battleRules` owns the simple damage method and level-up rule.
- `texts` owns key, loot, level, and ending messages.
- `gameFlow` owns start position and initial reference-game flow.
- `saveData` owns save-slot shape and version.

### Runtime State

Runtime state is the current play session. It is not the authored design.
Browser and Arduino runtime should track:

- current world/room/cell position,
- current section,
- hero current HP,
- hero level and XP,
- current gold,
- potion count,
- sword obtained/equipped state,
- `hasAncientKey`,
- `gateOpened` if the implementation needs a separate flag,
- `bossDefeated`,
- opened chest bits,
- current battle state and temporary enemy HP.

Runtime battle state, menu cursor state, animation state, and transition state
must not be saved as authored project JSON.

### Save State

The minimal RPG save state should include only progress needed to resume the
small game:

- save version,
- current world/room/cell position,
- hero current HP,
- hero level,
- hero XP,
- gold,
- potion count,
- sword obtained/equipped bit,
- key bit,
- gate-opened bit if used,
- boss-defeated bit,
- opened chest bitset.

Do not include full authored world data, enemy definitions, item definitions,
visual assets, menus, or temporary battle animation state in save slots.

### Arduino Ownership

- Immutable authored data belongs in `PROGMEM`: world layout, section data,
  gate/chest definitions, text bytes, hero base stats, enemy stats, potion
  definition, sword definition, reward values, and level-up constants.
- Mutable progress belongs in fixed SRAM structs while the game runs: hero HP,
  level, XP, gold, potion count, flags, opened chest bitset, current position,
  and current battle enemy HP.
- EEPROM save slots store the compact save state above, not the project JSON.
- All IDs exported to Arduino should become small numeric indexes or enums.
  Do not store repeated long names in SRAM.

### Postponed

These are not part of the first minimal RPG contract:

- full shops and prices beyond gold rewards,
- full object designer integration,
- arbitrary inventory lists,
- armor and multiple equipment slots,
- multiple party members,
- many enemies per section,
- full story graph,
- NPC conversations,
- music and SFX,
- full status-effect system,
- general scripting.

## Validation

- Duplicate IDs and missing references are errors.
- Room coordinates are x `0..25`, y `0..31`.
- Segment-byte frames contain exactly 24 bytes.
- Unknown top-level v2 fields are preserved in
  `extensions.unrecognizedTopLevel`.
- Runtime/session state is not authored project data.
- Repairs, warnings, and errors are reported separately.

## V1 Migration

- V1 has no `format` or `schemaVersion`.
- Migration occurs in temporary data and never mutates the source.
- Preserve title, text, rooms, start, battle values, hardware settings, and
  safe unknown legacy fields.
- Migrated data is schema v2 in memory.
- Save it as a new distinguishable `_v2.json` file.
- Loading v2 never runs v1 migration.

The former full v1/v2 contracts are archived under
`old/control-document-archive-20260614/Prompts`.

## Visual Workflow Contract

This is the B06 mapping of the useful workflow in
`References/Original_Tools/018-World-map-drawing.html`.

### Reuse

- Show the display as a black 8 x 3 grid with red A-G and DP segments.
- Toggle individual segments directly on a cell.
- Keep the hardware-tested byte convention DP=bit 7 and A..G=bits 6..0.
  The 018 tool's A=bit 7 through DP=bit 0 bytes are legacy input and must
  be translated during import rather than copied directly.
- Offer eight visible palette slots with keyboard shortcuts
  `1 2 3 4 Q W E R`.
- Paint a palette glyph into cells by click or click-drag.
- Navigate the 26 x 32 room grid with arrows and show coordinates as
  `A.00` through `Z.31`.
- Show miniature 8 x 3 previews on the room overview.
- Keep the compact, practical editor layout and clear on/off contrast.

### Adapt To Schema V2

- Glyphs, frames, and animations are project objects with stable IDs and
  user-facing names. They are not loose globals or independent TXT files.
- A glyph owns one segment byte. Its behavior labels may include
  `decorative`, `blocking`, `animated`, and `interactive`; labels describe
  use and do not alter the byte.
- Preserve existing `segment-bytes-v1` frames as exactly 24 bytes.
- Add a reference-based frame encoding only through an explicit encoding
  name. It must contain exactly 24 glyph references and resolve
  deterministically to 24 bytes.
- Cell order is always `index = y * 8 + x`. Display mirroring is not
  authored project data.
- Animations reference frames by stable ID and define ordered playback,
  duration, and looping without duplicating frame arrays.
- Palette selection points to project glyph IDs. The first hardware test
  uses one global eight-glyph palette.
- Save, load, import, and export operate through the canonical schema v2
  project. Imported legacy data is previewed and validated before commit.
- Coordinate and palette changes become explicit editor commands so later
  Undo and Ctrl+Z can reverse them. Ctrl+U is optional because Chrome can
  reserve it for View Source.

### Postpone

- Freehand polygon regions and separate eight-glyph palettes per region.
  These return only after the global eight-glyph hardware test succeeds.
- World compression generation, region assignment, and room-boundary
  validation. These belong to the world milestones.
- Automatic coordinate glyphs drawn into room cells.
- Remembering a default export folder. Normal project JSON and the existing
  Arduino export workflow are sufficient for now.
- Importing arbitrary C source or undocumented TXT variants.

### Reject

- One HTML file owning rendering, project state, storage, parsing, and
  export through shared global variables and inline event handlers.
- A textarea or generated C text acting as the editable source of truth.
- Silent save of the current room whenever coordinate navigation occurs.
- A user-facing mirror-position option for unsupported wiring.
- TXT files, folder handles, or IndexedDB as the main project save system.
- Direct hardware export that bypasses schema validation and preflight.
- Browser prompts and alerts as the normal editing workflow.

### Legacy Import Formats

The B06-P06 importer recognizes these formats only in a preview-first path:

- One digit: exactly eight binary digits.
- Eight sprites: exact `Sprite 1/2/3/4/Q/W/E/R: 00000000` lines, with
  optional matching hex.
- One frame: 24 `Digit n: 00000000` lines.
- Old map rows: C-like `{ 'A', 0, { 24 byte values } }` records.
- Old `Frame n` blocks containing digit lines.

Legacy bytes use A=bit 7 through DP=bit 0. Preview and commit translate each
byte with `((legacy >> 1) & 0x7F) | ((legacy & 1) << 7)` into the official
DP=bit 7 and A..G=bits 6..0 format.

All imported bytes must be integers `0..255`. Frames resolve to exactly 24
cells in `index = y * 8 + x` order. Preview reports translated values, source
names, ID/name collisions, regions, unsupported records, and errors. Cancel
does not mutate the project. Commit appends unique schema-v2 glyph/frame IDs
as one undoable command and never overwrites existing assets. Region and
compressed-region records remain unsupported and uncommitted.

The old compressed-region export is not a canonical format. Although each
cell uses only a three-bit palette index, it stores that index inside a full
byte together with the cell number. It also emits names and arrays without
the final PROGMEM strategy. Its overlap, unassigned-room, missing-palette,
and out-of-palette validation ideas should be reused later.

### Coupling To Remove

The old renderer reads and writes DOM elements directly, while keyboard
handlers, room data, region data, folder access, parsing, and exporters all
share mutable globals. B06 helpers must instead be pure where practical:
input data goes in, validated cloned data comes out, and UI state remains
separate from authored project data.

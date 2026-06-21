# Beta World Editor Design

This is the B09 implementation contract. It maps the B08 world model and B06
visual core into one compact editor for non-coders. It does not add gameplay
interactions, terrain, treasure, goals, beast markers, or magic characters.

## Working Layout

The world editor remains inside the main application as a dense work area,
not a landing page and not a set of nested cards.

### Top Toolbar

Always visible within the editor:

- world selector and world name,
- area type: worldmap, town, or dungeon,
- width `1..26` and height `1..32`,
- palette ownership: global or section,
- Generate, Randomize, Undo, and Import 018 commands,
- exact world-data estimate and current preflight state.

Generate and Randomize are separate commands. Generate changes dimensions
and section coverage. Randomize changes decorative visual content inside the
current approved structure. Each command creates one undo record.

### Left: Sections And Coordinates

The left work area contains:

- ordered section list with at most nine entries,
- active-section selection and a distinct swatch/marker per section,
- Create Section and Delete Section commands,
- complete logical coordinate overview for the selected world,
- coordinate labels `A.00` through `Z.31`,
- clear active coordinate and starting-room markers,
- compact visual indication of implicit empty, normal, special, and raw.

Every coordinate inside the selected dimensions is shown even when no
explicit room object exists. Selecting an implicit coordinate changes only
editor selection. It must not create authored room data.

At 26 x 32 the overview uses a stable scrollable grid with fixed-size cells.
Changing one active room must update only the affected overview cell rather
than rebuilding all 832 cells.

### Center: Active 8 X 3 Room

The main work area contains:

- fixed 8-column by 3-row segment display editor,
- active coordinate and section,
- room type: empty, normal, special, or raw,
- player-start preview when the active room contains the start,
- exact room storage cost,
- transition and coordinate-display preview.

Palette rooms paint glyph references into exactly 24 cells. Raw rooms edit
exact official segment bytes, including DP. The player preview is an overlay
and is never stored as a room glyph.

Selecting an implicit empty room shows a blank editor. The first authored
change creates one explicit override as a single undoable command. A command
named **Return To Implicit Empty** removes only that room's visual override
when no metadata requires the explicit room. General room deletion is not
needed.

### Right: Palette And Properties

The right work area contains tabbed or segmented views:

- **Palette**: visible ordered slots, glyph preview, selected slot, and
  palette bit width.
- **Cell**: visual segment byte, blocking state, and behavior labels.
- **Room**: room type, section ownership, and storage representation.
- **Preview**: movement, transition, coordinate display, and packed bytes.

The first eight palette slots retain the useful 018 shortcuts
`1 2 3 4 Q W E R`. A 4-bit palette may expose slots 9 through 16 without
changing those first shortcuts.

Visual shape and blocking behavior are displayed separately. A glyph may
look identical to another glyph while having different behavior metadata;
the UI must not imply that segment shape alone determines blocking.

## Data Ownership

| Data | Canonical owner |
| --- | --- |
| world ID, name, dimensions, area type | `project.worlds[]` |
| palette ownership and section order | `project.worlds[]` |
| section ID, name, coordinate overrides | `project.sections[]` |
| section palette and bit width | `project.sections[].palette` |
| explicit room coordinate/type/metadata | `project.rooms[]` |
| palette-index or raw 24-cell visual | `project.rooms[].visual` |
| reusable segment shape and blocking label | `project.glyphs[]` |
| reusable complete visual frame | `project.frames[]` |
| starting world, room, and cell | `project.gameFlow` |
| transition and coordinate-display settings | `project.settings` |
| active world/section/coordinate/tool/tab | session editor state |
| undo history and import preview | session editor state |
| emulator player position and changed runtime state | runtime state |
| packed bytes and generated offsets | derived output only |

Compatibility `room.data.pocV1Frame` remains a temporary bridge for current
proof-of-concept exports. It is not a second authored world model. B09 edits
must keep it synchronized until all active exporters consume
`room.visual` directly.

Editor selection, scroll position, hover, active palette slot, preview
player position, and undo stacks must not affect Arduino output.

## Section Rules

- A world owns one through nine stable-ID sections.
- One section is the default.
- Every coordinate resolves to exactly one section.
- Non-default section coordinate lists may have arbitrary shapes.
- Overlap is blocked before commit.
- Deleting a section is allowed only through one undoable command that first
  moves its owned coordinates and explicit rooms to a selected remaining
  section. The default section cannot be deleted until another is chosen.
- Section colors are editor swatches only and are not gameplay data.

## Palette And Room Rules

- Global mode uses one ordered palette for every section.
- Section mode allows each section its own ordered palette.
- Valid bit widths are 1, 2, 3, and 4, supporting 2, 4, 8, and 16 glyphs.
- The editor may recommend the smallest fitting width but never silently
  changes authored cells or an explicit user choice.
- A too-small mode blocks commit/export and identifies the offending slot or
  cell.
- Empty rooms have no visual payload.
- Normal and special rooms use exactly 24 palette indexes.
- Raw rooms use exactly 24 segment bytes.
- Special reserves future behavior metadata; it does not own a hidden
  per-room palette.
- Blocking is resolved from the active glyph at each cell.

## Start Position

- The start references an existing world, logical coordinate, and cell
  `x=0..7`, `y=0..2`.
- Setting the start is one undoable command.
- The start cannot remain on a blocking cell.
- Changing a glyph to blocking must either reject the edit or require a
  confirmed start relocation in the same transaction.
- The player marker is preview-only.

## Generate And Randomize

Generate:

- validates dimensions before commit,
- preserves unrelated project libraries,
- creates logical coordinates without forcing 832 explicit room objects,
- creates or updates section coverage,
- guarantees a valid non-blocking start,
- reports expected dense and sparse storage before confirmation,
- commits as one undoable action.

Randomize:

- uses only the selected active palette,
- changes decorative content only,
- never introduces terrain, interactions, treasure, goals, foes, or events,
- never blocks the start,
- shows a preview or clear affected scope,
- commits as one undoable action.

## Import From 018

Import remains preview-first:

1. Parse and translate legacy segment bytes.
2. List glyphs, frames, coordinates, and old regions found.
3. Map accepted old regions to proposed sections.
4. Report overlaps, uncovered/out-of-range coordinates, ID collisions, more
   than nine sections, and unsupported records.
5. Let the user choose global or section palette ownership when both are
   valid.
6. Cancel without mutation.
7. Commit accepted changes as one undoable command.

Old symbols do not create interactions, terrain, treasure, goals, or beast
markers during B09.

## Preview And Estimates

The preview resolves the same effective room data used by packing:

- implicit empty fallback,
- section ownership,
- active palette,
- blocking flags,
- room type,
- 24 decoded segment bytes.

It supports valid in-room movement and confirmed room transitions, including
the current transition animation and optional coordinate display. It does
not trigger random battles during world-editor QA.

Visible estimates separate:

- room visual bytes,
- palettes and blocking flags,
- section membership,
- metadata,
- total known project flash,
- known SRAM and EEPROM,
- unresolved future costs.

The estimate updates after authored commands, not after selection-only
changes.

## Undo And Command Boundary

Undo is available through a visible button and `Ctrl+Z`. `Ctrl+U` can be
accepted as an extra shortcut only when the browser does not reserve it. One
command record stores before/after data only for its owned project fields.

Undoable commands include:

- Generate,
- Randomize,
- create/delete/reassign section,
- paint or clear cells,
- room type change,
- palette order/content/bit-width change,
- raw segment edit,
- set start,
- Return To Implicit Empty,
- accepted 018 import.

Coordinate selection, scrolling, tab changes, preview movement, and failed or
canceled operations do not create undo entries.

## Validation Boundary

Before an authored command commits:

- validate dimensions, coordinate, section, palette capacity, exact 24-cell
  shape, segment bytes, and start blocking.

After commit:

- run schema-v2 validation and resource preflight,
- keep the project dirty and recovery scheduled,
- update only affected visuals and estimates.

Save and Arduino export still run full preparation, validation, and
preflight. The editor must never hide blockers by repairing unrelated data.

## Responsive And Accessibility Rules

- Keep fixed 8 x 3 display proportions.
- Use labels in addition to section colors.
- Maintain keyboard focus and visible selected state.
- Do not hijack shortcuts while typing in text or numeric controls.
- Avoid motion that is required to understand state.
- Keep text concise and dyslexia-friendly with ordinary spacing.
- On narrow screens, stack coordinate overview, active room, and properties
  in that order while retaining the same controls.

## Explicitly Postponed

- Doors, keys, cuttable obstacles, portals, messages, and save points.
- Terrain systems.
- Treasure, goals, beast markers, `T`, `G`, or map-`0` triggers.
- Town/dungeon gameplay differences beyond authored area type and preview.
- Battle triggering in editor preview.
- Redo.
- Unsupported wiring or display orientation controls.

## B09 Implementation Order

1. Section list, dimensions, area type, and complete logical overview.
2. Room type, palette, 8 x 3 editing, blocking display, start, and undo.
3. Generate, Randomize, and preview-first 018 import.
4. Transition/coordinate preview, performance, save/load, packing, and QA.

No later step may create authored objects merely because the user selected or
previewed them.

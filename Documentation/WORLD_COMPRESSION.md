# World And Compression Contract

This is the authored world model and Arduino storage contract for B08 onward.
Browser JSON stays readable. Compression is deterministic generated output.

## World And Coordinates

- World width is `1..26`; height is `1..32`.
- Every coordinate inside the selected width and height logically exists.
- Coordinate index is `roomIndex = y * width + x`.
- Room display cells are always 8 x 3, with `cellIndex = y * 8 + x`.
- Browser labels use `A.00` through `Z.31`.
- Coordinates outside the selected dimensions do not exist.

A world owns:

- stable ID and name,
- area type: `worldmap`, `town`, or `dungeon`,
- width and height,
- ordered section IDs,
- one default section ID,
- start-room reference.

## Sections

- A world has one through nine stable-ID sections.
- Every logical coordinate belongs to exactly one section.
- Section overlap is invalid.
- A coordinate not explicitly assigned to another section belongs to the
  world's default section. This gives complete coverage without 832 room
  objects or 832 repeated section IDs.
- Non-default sections store readable coordinate keys such as `A.00`.
- A section may have any shape; rectangular sections are not required.
- Section membership is gameplay ownership as well as compression ownership.

An 018 region maps to one section. Its coordinate list becomes that section's
coordinate keys. Import preview must report overlaps, uncovered coordinates,
out-of-range coordinates, and more than nine resulting sections. Import does
not invent content for old coordinates absent from the source.

## Palettes

Palette ownership is chosen per world:

- `global`: every section references the same palette.
- `section`: each section references its own palette.

A palette is an ordered list of glyph IDs. Glyph visual bytes and behavior
labels remain owned by the visual library. Blocking is per visible cell and
comes from the selected glyph; there is no hidden whole-room collision.

| Mode | Bits per cell | Maximum glyphs | Room bytes |
| --- | ---: | ---: | ---: |
| 1-bit | 1 | 2 | 3 |
| 2-bit | 2 | 4 | 6 |
| 3-bit | 3 | 8 | 9 |
| 4-bit | 4 | 16 | 12 |
| raw | 8 | no palette | 24 |

The smallest mode that fits the active palette may be recommended. The user
may choose a larger valid palette mode. Choosing a smaller mode than the
palette or cell indexes require is an error.

Palette generated cost for `P` glyphs is:

`P segment bytes + ceil(P / 8) blocking-flag bytes`

Shared global palettes are emitted once. Section palettes are emitted once
per distinct section palette after deterministic deduplication.

## Room Types

Authored room visual data and room metadata are separate.

### Empty

- No explicit room object is required.
- Effective cells are 24 blank/non-blocking cells.
- Sparse visual cost is zero bytes.
- Metadata overrides may still exist separately when later features require
  them.

### Normal

- Contains exactly 24 palette indexes.
- Uses the active global or section palette.
- Uses a validated 1/2/3/4-bit mode.
- Has no special-behavior meaning merely because it is non-empty.

### Special

- Contains exactly 24 palette indexes using the same active global or section
  palette rules as a normal room.
- Carries a special-room type marker.
- The marker reserves later doors, towns, dungeons, portals, messages, sound,
  or scripts; B08 does not implement those behaviors.
- It does not own a hidden per-room palette.

### Raw

- Contains exactly 24 official segment bytes, including DP.
- Each byte is `0..255`.
- Visual cost is 24 bytes before metadata.
- Raw rooms bypass palette indexes but use the same room coordinate and
  metadata ownership rules.

## Authored JSON

Only non-default visual or metadata overrides need explicit room objects.
Selecting or viewing an implicit empty coordinate must not create one.

An explicit room keeps:

- stable room ID,
- section ID,
- x/y coordinate,
- room type,
- visual encoding and 24 cells where the type requires them,
- interaction/encounter/music references and versioned future metadata.

Compressed bytes, generated offsets, rank tables, and PROGMEM declarations
are not canonical JSON.

## Bit Packing

Palette cells form one continuous little-endian bitstream:

1. Cell order is index `0..23`.
2. Cell `i` starts at bit offset `i * bitsPerCell`.
3. The low bit of a palette index is written first.
4. Bit offset zero is the least-significant bit of byte zero.
5. Values crossing a byte boundary continue in the next byte.
6. Unused high bits in the final byte are zero.

This is the existing hardware-tested 3-bit packing order and must remain
compatible.

Raw rooms store cell bytes in index order `0..23`.

## Dense Storage

Dense storage emits one fixed-size payload for every logical coordinate.

For global palettes:

`denseBytes = width * height * roomBytes(mode)`

For section palettes, each section emits its coordinates in global
room-index order using that section's validated mode. A generated section
membership lookup resolves the correct section block.

Dense empty rooms use 24 palette index zero cells. Therefore palette index
zero must resolve to a blank, non-blocking glyph when dense empty rooms are
used.

Dense storage is simple and remains the compatibility path for the existing
global 3-bit exporter:

`26 * 32 * 9 = 7,488 room bytes`

The existing global eight-glyph palette and blocking flags add 9 bytes.

## Sparse Storage

Sparse storage emits only explicit non-empty visual overrides, sorted by
global room index.

Each simple sparse entry contains:

- coordinate: 2 bytes,
- room type/mode header: 1 byte,
- palette payload: 3, 6, 9, or 12 bytes; or raw payload: 24 bytes.

Section is derived from the section membership table and is not duplicated in
the room entry.

`sparseBytes = sum(3 + payloadBytes for each stored visual override)`

An absent coordinate resolves to the effective empty room. Lookup may use a
simple ordered scan or binary search; slower lookup is acceptable. Metadata
tables are separate and keyed by room index.

Exporter preflight compares approved dense and sparse totals and may recommend
the smaller representation. It must not silently change an explicitly chosen
mode that would alter decoded cells.

## Section Membership Storage

Browser JSON uses the default section plus readable coordinate overrides.
Generated code chooses the smaller deterministic representation:

- dense 4-bit section map: `ceil(roomCount / 2)` bytes, or
- sparse overrides: `3 bytes * nonDefaultCoordinateCount`.

The sparse section entry is two coordinate bytes plus one section index byte.
Section indexes are `0..8`.

## Random Access

All immutable palettes, membership data, room data, offsets, and metadata
tables live in PROGMEM.

To resolve one room:

1. Validate x/y and calculate global room index.
2. Resolve section from default plus generated membership data.
3. Check sparse visual override table when sparse/override storage is used.
4. Otherwise calculate the dense payload address.
5. Decode only the requested room into one fixed 24-byte frame buffer.
6. Resolve palette indexes to official segment bytes and blocking flags.

To resolve one palette cell directly:

- calculate `bitOffset = cellIndex * bitsPerCell`,
- read at most two PROGMEM bytes,
- shift and mask the palette index,
- read the glyph segment byte/flag from the active palette.

No complete world, section, or visual library is copied into SRAM.

## Metadata

Room visuals never contain gameplay metadata. Separate sorted tables own:

- room type marker where not encoded in a sparse header,
- interactions and later persistent flags,
- encounters,
- music,
- future special-room behavior.

Metadata cost is reported by its owning subsystem and is not hidden inside
the visual room-byte total.

## Validation

Compilation/export blocks when:

- dimensions exceed 26 x 32 or are below 1 x 1,
- there are zero sections or more than nine,
- section references are missing,
- section coordinate overrides overlap or are out of range,
- a room's section disagrees with resolved coordinate ownership,
- cells are not exactly 24 values,
- a palette index exceeds the active palette,
- selected bits per cell cannot represent the palette/indexes,
- dense empty index zero is not blank and non-blocking,
- raw cells are not bytes,
- required generated tables are not classified as PROGMEM.

## Cost Summary

For `R = width * height`:

- dense 1-bit: `R * 3`,
- dense 2-bit: `R * 6`,
- dense 3-bit: `R * 9`,
- dense 4-bit: `R * 12`,
- dense raw: `R * 24`,
- sparse palette room: `3 + roomBytes(mode)`,
- sparse raw room: `27`,
- dense section membership: `ceil(R / 2)`,
- sparse section membership: `3 * nonDefaultCoordinateCount`,
- palette: `P + ceil(P / 8)` per emitted distinct palette.

Every report lists room visuals, palettes, section membership, and metadata
as separate contributions.

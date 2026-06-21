# Project Rules

## Scope

- Keep the project hobby-sized and understandable.
- Work one milestone prompt at a time.
- Do not add adjacent features without approval.
- Prefer existing plain HTML, CSS, and classic JavaScript patterns.
- Do not use npm, frameworks, TypeScript, bundlers, CDNs, or install steps.
- Do not automatically launch the in-app browser.

## Editing

- Inspect current files before editing.
- Edit only files allowed by `Prompts/CURRENT_MILESTONE.md`.
- Back up existing files before heavy or risky edits.
- Never revert unrelated user changes.
- Use structured parsing for structured data.
- Keep authored project data separate from editor and runtime state.

## Project Data

- Schema v2 JSON is canonical.
- IndexedDB is secondary interruption recovery, never the main save system.
- Preserve unknown project data according to `Documentation/SCHEMA_V2.md`.
- Never overwrite an imported old project automatically.
- Failed load, migration, or recovery must leave the active project intact.

## Minimal RPG Beta Target

- The beta target is one complete small RPG on official hardware, not a full
  RPG-maker feature set.
- The first complete Arduino RPG must include:
  - one worldmap,
  - two world sections,
  - section 1 as a 5 x 5 room area minus the two bottom-right rooms,
  - section 2 as the two bottom-right final-boss rooms,
  - one normal enemy kind for section 1,
  - one final-boss enemy kind for section 2,
  - a blocking wall and one locked gate between the sections,
  - several section-1 chests,
  - chests scattered through section 1,
  - fixed random-looking `#` blocker cells in section 1,
  - gold chests worth `10 Gold`,
  - one key chest that shows `You now hold the anchent key`,
  - one sword chest that raises attack points,
  - potion chests,
  - potion use in battle and from an outside-battle item menu,
  - leveling approximately every three normal fights,
  - final-boss victory text `You have saved the world, Thank you.`
- Keep the beta data fixed and tiny before generalizing into full editors.
- Do not add shops, full inventory, full story graph, audio, multi-party, or
  many-enemy expansion until this minimal RPG works on Arduino.
- Browser behavior and generated Arduino behavior should match for the
  minimal RPG unless a difference is explicitly documented.
- Authored JSON defines the game. Runtime state and EEPROM save data record
  the player's progress through that authored game.

## Text Display

- A seven-segment text screen has 24 cells.
- Text longer than 24 cells must not be silently cut away in gameplay text.
- Split long gameplay text into pages of at most 24 characters.
- Prefer word boundaries when splitting. If one word is longer than 24
  characters, split that word into 24-character chunks.
- Show one page at a time.
- Advance to the next text page only when the player presses a button/key.
- The first press after a text page should only advance or close the text; it
  should not also move the player or choose a battle command.

## Actor Stats JSON

- Hero, party member, foe, enemy, and monster JSON uses one shared stat
  vocabulary in camelCase.
- Required battle stats for exported actors:
  - `level` 1..99
  - `currentHP` 0..999
  - `maxHP` 1..999
  - `attackPower` 0..255
  - `magicPower` 0..255
  - `defense` 0..255
  - `magicDefense` 0..255
  - `accuracy` 0..100
  - `evasion` 0..100
  - `criticalChance` 0..100
  - `resistancePhysical` 0..200
  - `resistanceMagic` 0..200
  - `weaponPower` 0..255
  - `spellPower` 0..255
  - `speed` 0..255
- Resistance values are percent multipliers: `0` immune, `50` half damage,
  `100` normal damage, `200` double damage.
- Hero-only exported stats may include `currentMP`, `maxMP`, `healPower`,
  and `xpNext`.
- Monster-only exported stats may include `xpReward`.
- Old stat names such as `hp`, `mp`, `attack`, `magic`, `heal`, `xp`,
  `crit`, `dodge`, and `hitRate` are import-only aliases. New exports should
  use the shared camelCase names above.
- Arduino battle structs should use fixed-size integers, avoid floats, and
  treat HP as signed 16-bit while most other stats can fit in unsigned 8-bit.

## Battle Calculation Methods

- The browser battle tester may select one battle damage method in
  `battleRules.calculationMethod`.
- Supported method IDs:
  - `dnd5e` - Dungeons & Dragons 5e style
  - `pathfinder2e` - Pathfinder 2e style
  - `gurps` - GURPS style
  - `fate` - Fate Core style
  - `coc` - Call of Cthulhu / BRP style
  - `shadowrun5e` - Shadowrun 5e style
  - `worldofdarkness` - World of Darkness / Storyteller style
  - `ff1` - Final Fantasy I NES style
  - `dragonquest` - Dragon Quest NES style
  - `pokemon` - Pokemon style
  - `simple11` - Ultra simple attack power versus defense
- These methods must read the canonical actor stats above. Old stat aliases are
  only a loading/import compatibility layer.

## Equipment And Battle Animation Triggers

- Equipment should be stored as compact authored data that can be generated to
  Arduino `PROGMEM`.
- Equipment records should use numeric IDs for slot, kind, material, size,
  damage type, and animation tags. Avoid storing repeated names in Arduino SRAM.
- Modular equipment creation should keep these concepts separate:
  - `slot` - weapon, armor, shield, accessory, consumable, etc.
  - `kind` - sword, knife, wand, armor, ring, etc.
  - `material` - bronze, iron, silver, leather, crystal, etc.
  - `size` - small, normal, large, etc.
  - stat modifiers - `attackPower`, `defense`, `magicPower`, `magicDefense`,
    `speed`, and similar canonical stat effects.
  - animation tags - reusable tags such as sword, bronze, fire, heal, etc.
- At battle start, generated Arduino code should fetch only the active heroes'
  equipped item records from `PROGMEM` into small SRAM structs.
- Battle stats should then be calculated once from base actor stats plus fetched
  equipment modifiers.
- The same fetched equipment records should also provide animation properties
  for the current battle event.
- A battle event should be built when an action happens. It may include:
  - actor side: hero or foe
  - action type: physical attack, magic attack, heal, item, get hit, defeated
  - equipped weapon kind
  - equipped weapon material
  - equipped weapon size
  - damage type or magic kind
  - target side
  - row case: same row, shifted down, shifted up
- Battle animations should be selected by matching this battle event against
  animation rules.
- Animation rules should support broad and specific matches. For example:
  - all hero physical attacks
  - all sword attacks
  - all bronze weapons
  - all fire magic
  - one specific weapon ID
- The matching system should choose the highest priority matching rule. If
  priorities tie, choose the rule with the most matching fields.
- Recommended first implementation order:
  1. Match by `actionType` only.
  2. Add `weaponKind`.
  3. Add `weaponMaterial`.
  4. Add `magicKind` or `damageType`.
  5. Add specific equipment ID overrides.
- Battle effect frames are 8-digit effect data. Browser and Arduino battle
  display should OR effect segments onto hero/foe segment bytes so the effect is
  visually overlaid, not replacing the actor image.
- Row-shifted battle effects should use the approved display cases:
  - same row: use the 8-digit effect as drawn
  - hero row 1 to target row 2: D5 G, D4 D, D11 A, D10 G for the simple line
  - hero row 2 to target row 1: D13 G, D12 A, D3 D, D2 G for the simple line

## Arduino

- Follow `Documentation/HARDWARE_PROFILE.md`.
- Use `SPI.h`; do not use LedControl or another display library.
- Avoid Arduino `String`, heap allocation, and unbounded arrays.
- Put large immutable data in PROGMEM.
- Keep generated code readable.
- Browser estimates do not replace Arduino compilation and hardware tests.

## Files

- Live web source stays at the project root.
- Current focused documents stay in `Documentation`.
- The current task stays in `Prompts/CURRENT_MILESTONE.md`.
- Source material stays in `References`.
- Generated sketches stay in `Arduino_Tests`.
- Backups and superseded documents stay in `old`.

Arduino exports use:

`Arduino_Tests/Sketch_Name_YYYYMMDD_HHmmss_SSS/Sketch_Name_YYYYMMDD_HHmmss_SSS.ino`

The sketch folder and `.ino` base name must match. Never overwrite an
earlier export.

## Testing

- Add focused tests proportional to the change.
- Hardware-facing milestones require separate test sketches before combined
  integration.
- Record compile flash/SRAM figures and real-hardware results when tested.
- A final export must be blocked when it is known not to fit ATmega328P.

## Completion Report

Report:

- files changed,
- backups created,
- what changed,
- tests performed,
- generated Arduino sketch path, if any,
- compile and hardware results, if any,
- unresolved issues.

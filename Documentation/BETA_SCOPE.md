# Public Beta Scope

This is the feature scope for the first public 7-SegBoy Maker beta.

## Beta Goal

The beta proves that a small JRPG-style game can be designed in a browser and
exported as an Arduino sketch for the official 7-SegBoy hardware.

The beta is intentionally small. It is not a general RPG Maker yet.

## What Works

- Open `index.html` directly in a browser.
- Use the Minimal RPG starter project.
- Edit and save/load project JSON files.
- Use browser recovery as protection against interruption.
- Draw and test 8 x 3 world rooms for a 24-digit seven-segment display.
- Use the browser movement test.
- Turn random battle triggering on/off in the browser movement test.
- Edit global text glyphs used by game text.
- Import simple worldmap and battle music JSON from the Chiptune Song Machine.
- Assign one song to worldmap mode and one song to battle mode.
- Export a combined Arduino game sketch.

## Minimal RPG Content

The beta Minimal RPG contains:

- one playable hero,
- one worldmap with two sections,
- section 1 normal enemy encounters,
- section 2 boss encounter,
- visible walls and a locked key gate between sections,
- chests with gold, potions, sword, and ancient key,
- key text message,
- sword attack bonus,
- potion use in battle and from the world-map system menu,
- XP and level-up,
- final boss victory text.

## Browser Battle

The browser battle test supports:

- hero and foe stats in the canonical stat format,
- selectable battle calculation methods,
- hit/miss and variable damage,
- potion use,
- battle victory/defeat flow,
- visual 24-digit seven-segment battle display.

## Arduino Combined Export

The combined Arduino export supports:

- Arduino Nano / ATmega328P,
- 3 daisy-chained MAX7219 chips,
- `SPI.h` display output,
- 24 digits as an 8 x 3 grid,
- A0 brightness pot,
- A4 direction/menu pot,
- D5 forward/confirm,
- D4 backward/reject,
- D4 + D5 one-second world-map system menu,
- world movement and room transitions,
- visible blocking walls and locked gate,
- chests and rewards,
- random section-based battles,
- selected battle calculation method,
- battle animations/messages on the 24-digit display,
- worldmap and battle music on D3/D9,
- boss ending and no immediate boss restart after victory,
- one EEPROM save-state slot from the world-map system menu.

The EEPROM save-state slot stores current runtime progress: room, cell,
story/equipment/chest flags, gold, potion count, level, XP, HP, and attack.

## Official Hardware Only

Only the wiring in `Documentation/HARDWARE_PROFILE.md` is supported.

Unsupported display orientation, alternate MAX7219 order, alternate boards, or
alternate pins are not beta features. The beta may include written
troubleshooting for the official wiring only.

## Not Supported Yet

The first public beta does not include:

- full object designer inside the main app,
- full hero designer inside the main app,
- full monster designer inside the main app,
- full story graph editor,
- NPC/talk editor,
- shops,
- terrain systems,
- treasure/goal/beast map markers,
- custom event-object systems beyond the Minimal RPG starter,
- multiple active heroes,
- multiple simultaneous normal enemy types per section,
- full inventory/equipment system,
- full magic/item lists,
- full animation-trigger editor in the main app,
- full built-in music editor,
- SFX designer,
- unsupported wiring profiles,
- automatic public bug-report system,
- large documentation site.

## Known Limitations

- The beta is designed around one official hardware build.
- The Arduino game is intentionally tiny to fit the ATmega328P.
- Browser editor tools are still hobby-sized and not polished like commercial
  game engines.
- Project JSON is the main editor save format.
- Arduino EEPROM save is a small runtime save, not a full project save.
- Browser recovery is only emergency protection, not the main save system.
- The clean public package must be created from the development folder; the
  development folder itself contains backups and test history that should not
  be published directly.

## Release Rule

If a feature is not listed under "What Works", "Minimal RPG Content",
"Browser Battle", or "Arduino Combined Export", it should be treated as not
part of the first public beta.

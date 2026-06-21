# Changelog

## v0.1.0-beta

This is the first public beta candidate for 7-SegBoy Maker.

### Added

- Minimal RPG starter with two world sections, chests, key gate, sword, potion,
  XP, normal enemy, final boss, and ending text.
- Browser movement and battle test using the 24-digit 7-segment display.
- Project JSON save/load and browser recovery.
- Global text glyph editing.
- Chiptune JSON music import for worldmap and battle music.
- Combined Arduino export for Arduino Nano / ATmega328P.
- Official 7-SegBoy hardware profile with MAX7219 SPI display, A0 brightness,
  A4 direction/menu pot, D5 confirm, D4 reject, D3 melody, and D9 bass.
- Arduino world-map system menu opened by holding D4 + D5 for one second.
- One Arduino EEPROM runtime-state save slot.

### Known Limits

- This is not yet a general RPG Maker.
- Only the official hardware wiring is supported.
- Advanced object, story, NPC, shop, SFX, animation-trigger, and full inventory
  editors are not part of this beta.
- The Arduino save slot stores compact runtime progress, not the full project
  JSON.

See `Documentation/BETA_SCOPE.md` for the exact scope.

### Release Notes Text

7-SegBoy Maker v0.1.0-beta is a small browser-based RPG maker for a custom
24-digit seven-segment display driven by an Arduino Nano and three MAX7219
chips.

This beta proves the full path from browser editing to real hardware gameplay:
open `index.html`, test the Minimal RPG, export a combined Arduino sketch, and
play it on the official 7-SegBoy hardware.

Important links:

- `START_HERE.md`
- `Documentation/BETA_SCOPE.md`
- `Documentation/HARDWARE_PROFILE.md`
- `Documentation/BETA_RELEASE_CHECKLIST.md`
- `Documentation/TUTORIAL_VIDEO_OUTLINE.md`

Hardware note: `Documentation/Hardware` includes EasyEDA schematic/PCB files,
a BOM, schematic image, and Gerber ZIP. These PCB/Gerber files are beta
reference files based on the working beta hardware, but they have not yet been
fully verified on a manufactured board.

# 7-SegBoy Maker Beta

7-SegBoy Maker is a small browser tool for making a minimal RPG for a custom
24-digit seven-segment display.

The beta goal is simple: open the tool, test the Minimal RPG in the browser,
export an Arduino sketch, upload it to the official 7-SegBoy hardware, and play
the game on the real display.

## Run The Tool

Open this file directly in Chrome:

`index.html`

No install step is needed. Do not run `npm`. The beta uses plain HTML, CSS, and
classic JavaScript files.

## What The Beta Can Do

- Load the Minimal RPG starter project.
- Edit and save project JSON files.
- Test movement and battles in the browser.
- Use a 24-digit 7-segment display preview.
- Export a combined Arduino game sketch.
- Play the Minimal RPG on official 7-SegBoy hardware.

The exact supported feature list and known limits are in:

`Documentation/BETA_SCOPE.md`

## Official Hardware

Only this hardware profile is supported in the beta:

- Arduino Nano / ATmega328P.
- 3 daisy-chained MAX7219 chips.
- 24 seven-segment digits with decimal points.
- Physical layout: 8 columns x 3 rows.
- A0 BrightnessPot.
- A4 direction/menu pot.
- D5 forward/confirm button.
- D4 backward/reject button.
- D3 melody audio.
- D9 bass audio.

Full wiring notes are in:

`Documentation/HARDWARE_PROFILE.md`

## Hardware Design Files

Hardware reference files are included in:

`Documentation/Hardware`

This folder contains EasyEDA schematic and PCB design files, a BOM, a
schematic image, and a Gerber ZIP for ordering a custom PCB.

These hardware files are designed from the working beta hardware, but the PCB
files have not yet been fully verified on a manufactured board. Treat them as
beta hardware files until a real ordered PCB has been built and tested. Once
the PCB is verified, this README and the hardware documentation should be
updated to say so.

## Fast Test Path

1. Open `index.html`.
2. Use or create the Minimal RPG starter.
3. Test movement in the browser.
4. Check Hardware Preflight.
5. Export **Combined Game .ino**.
6. Open the newest folder under `Arduino_Tests`.
7. Compile and upload the `.ino` in Arduino IDE.

## Saving

- Use Project JSON files as the main save format for the tool.
- Browser recovery is only a safety backup.
- The generated Arduino game has one manual EEPROM runtime save slot, opened
  from the world map by holding D4 + D5 for one second.

## License

AGPL-3.0-only. See `LICENSE.md`.

## Start Here

For the current project status and active documents, read:

`START_HERE.md`

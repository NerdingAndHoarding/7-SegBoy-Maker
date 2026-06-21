# 7-SegBoy Beta: Start Here

This is the front door for the current beta project. Keep this file short.
Detailed rules live in the documents it links to.

## How To Run The Tool

Open this file in a browser:

`index.html`

No install step, npm, framework, server, or internet connection is required for
the core tool.

## Fast Manual Path

1. Open `index.html`.
2. Use the starter project, or create a small world in the visual editor.
3. Test movement in the Browser Movement Test.
4. Check **Hardware Preflight**.
5. Export **Combined Game .ino**.
6. Open the newest folder under `Arduino_Tests`.
7. Compile and upload the matching `.ino` in Arduino IDE.

Generated Arduino sketches are written as:

`Arduino_Tests/Sketch_Name_YYYYMMDD_HHmmss_SSS/Sketch_Name_YYYYMMDD_HHmmss_SSS.ino`

The folder name and `.ino` name must match for Arduino IDE.

## Current Status

- The Minimal RPG beta path is playable on official hardware.
- The exact public beta feature list and exclusions are in
  `Documentation/BETA_SCOPE.md`.
- The current stage is final regression, public package cleanup, GitHub/GitLab
  release preparation, and tutorials.
- Current task: `Prompts/CURRENT_MILESTONE.md`.

Older accepted 26 x 32 combined-game hardware test:

- Flash: 17,580 / 30,720 bytes.
- Globals: 473 / 2,048 bytes.
- Result: upload, movement, blocking, transitions, and combined gameplay
  accepted.

Recent playable Minimal RPG combined-audio hardware test:

- Flash: 13,694 / 30,720 bytes.
- Globals: 674 / 2,048 bytes.
- Result: hardware gameplay, display, and music are working after audio
  rewiring.

## Official Hardware

Only this wiring profile is supported:

- Arduino Nano / ATmega328P.
- 3 daisy-chained MAX7219 chips.
- 24 seven-segment digits with decimal points.
- Physical display: 8 columns x 3 rows.
- `SPI.h` display code.
- Direction/menu pot on A4.
- BrightnessPot on A0.
- D5 confirm/forward button, `INPUT_PULLUP`, pressed LOW.
- D4 reject/backward button, `INPUT_PULLUP`, pressed LOW.
- D3 melody audio output.
- D9 bass audio output.

Full wiring and display behavior live in `Documentation/HARDWARE_PROFILE.md`.
That file also contains the beta builder wiring checklist.

## Saving

- Project JSON is the main user save format.
- Browser recovery is only protection against interruption.
- Browser save slots are play-test helpers.
- The current Arduino combined-game save model is one manual EEPROM runtime
  save slot, opened from the world-map system menu by holding D4 + D5 for one
  second.

## License

- License: AGPL-3.0-only.
- See `LICENSE.md`.

## Authority Order

When information conflicts, use this order:

1. The user's newest direct instruction.
2. Confirmed real-hardware behavior.
3. `Documentation/HARDWARE_PROFILE.md`.
4. `PROJECT_RULES.md`.
5. `Documentation/SCHEMA_V2.md`.
6. `Prompts/CURRENT_MILESTONE.md`.
7. `Documentation/ROADMAP.md`.
8. Current source code and focused subsystem documents.

Files under `old`, `References`, and `Arduino_Tests` are evidence or source
material, not current instructions.

## Active Documents

- `PROJECT_RULES.md`: working rules and file organization.
- `Documentation/HARDWARE_PROFILE.md`: official pins and display behavior.
- `Documentation/SCHEMA_V2.md`: canonical project data contract.
- `Documentation/ROADMAP.md`: milestone status and future order.
- `Documentation/BETA_RELEASE_CHECKLIST.md`: short checklist before sharing a
  beta copy.
- `Documentation/BETA_SCOPE.md`: exact first public beta feature list and
  known limitations.
- `Documentation/BETA_PACKAGE_CONTENTS.md`: what to include or exclude when
  making a clean beta copy.
- `Documentation/TUTORIAL_VIDEO_OUTLINE.md`: tutorial plan for public beta.
- `Documentation/BETA_TEST_RECORD.md`: fill-in record for final beta candidate
  browser, compile, upload, and hardware results.
- `Documentation/TUTORIAL_VIDEO_OUTLINE.md`: static first beta tutorial plan.
- `Documentation/DECISIONS_AND_TESTS.md`: accepted decisions and measurements.
- `Documentation/WORLD_COMPRESSION.md`: world storage contract.
- `Prompts/CURRENT_MILESTONE.md`: the only active coding/QA prompt.

Do not copy shared rules into new documents. Link to the authoritative file.

## Active Source

- `index.html`, `style.css`
- `visualAssets.js`, `displayEditor.js`, `glyphEditor.js`
- `frameEditor.js`, `animationEditor.js`, `visualImport018.js`
- `projectModel.js`, `worldCompression.js`, `resourceEstimator.js`
- `preflight.js`, `worldEditor.js`, `emulator.js`, `battle.js`
- `exportArduino.js`, `projectStorage.js`, `app.js`
- `examples.js`
- `projectModelTests.html`, `projectModelTests.js`
- `worldCompressionTests.html`, `worldCompressionTests.js`

Source ownership:

- `projectModel.js` owns exact schema construction and validation.
- `exportArduino.js` owns generated Arduino code.
- JSON project files are the canonical user save format.
- IndexedDB is interruption recovery only.

## Archive

The former prompt packs, reports, question sheets, old schemas, and detailed
contracts are preserved under:

`old/control-document-archive-20260614`

Consult the archive only for historical reasoning or measurements absent from
the active documents. Never let an archived instruction override the authority
order above.

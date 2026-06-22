# Beta Release Checklist

Use this short checklist before sharing a beta copy of the tool.

## Required Passes

- `index.html` opens directly in Chrome without an install step.
- The starter project loads and Hardware Preflight has no blockers.
- Browser Movement Test can move between rooms.
- Trigger battles can be turned on and off.
- A battle can be won, and victory returns to the same world position.
- A battle can be lost, and game over restarts from the beginning.
- Project JSON save and reload preserves the current test project.
- Browser recovery does not appear after a clean Project JSON save.
- **Export Combined Game .ino** creates a timestamped sketch under
  `Arduino_Tests`.
- The generated sketch compiles for Arduino Nano / ATmega328P.
- The generated sketch uploads to the official 7-SegBoy hardware.
- On hardware, movement, blocking, transitions, battle entry, battle victory,
  and battle defeat behave like the browser test.
- On hardware, the `E.02` / `E.03` boundary is blocked and section 2 can only
  be reached through the intended key gate.
- On hardware, the battle turn prompt alternates right-aligned actor name and
  current/max HP, for example `YOU1` then `30-30`.
- On hardware, assigned worldmap and battle music play and switch at battle
  start/end.
- A0 BrightnessPot changes MAX7219 brightness while the sketch is running.

## Required Notes

- `Documentation/BETA_SCOPE.md` exists and says exactly what the public beta
  supports and does not support.
- `LICENSE.md` exists and says AGPL-3.0-only.
- Only the official wiring in `Documentation/HARDWARE_PROFILE.md` is supported.
- The builder wiring checklist in `Documentation/HARDWARE_PROFILE.md` has been
  checked against the beta hardware.
- `Documentation/TUTORIAL_VIDEO_OUTLINE.md` exists and matches the current
  beta feature scope.
- `Documentation/BETA_PACKAGE_CONTENTS.md` exists and has been checked before
  sharing a clean beta copy.
- Project JSON is the main save format.
- Browser recovery is only a backup against interruption.
- Arduino combined-game save scope is currently one manual EEPROM runtime-state
  slot opened from the world-map system menu.
- Browser music preview can import two Chiptune Song Machine JSON songs and
  assign worldmap/battle music.
- D3 and D9 are used for Arduino audio:
  - D3 melody.
  - D9 bass.
- The standalone music hardware test passed after rewiring the physical audio
  output.
- The combined Minimal RPG export includes the proven music runtime.
- Public repository links are planned for both GitHub and GitLab.
- Tutorial scripts or tutorial links are prepared before public sharing.

## Known Beta Exclusions

These are not blockers for the first public beta if they are clearly described:

- Full built-in audio editor and SFX designer.
- Full text/glyph alphabet policy.
- Treasure, goal, terrain, beast markers, and map-trigger objects.
- Unsupported display wiring or orientation options.
- Large documentation site or interactive bug-report system.
- General RPG-maker systems beyond the approved Minimal RPG target.
- Multiple Arduino EEPROM save slots.
- Full project save/load on Arduino EEPROM.

## Evidence To Record

For the final beta candidate, record the result in
`Documentation/BETA_TEST_RECORD.md`:

- Date of test.
- Browser used.
- Arduino IDE board and processor setting.
- Flash bytes used and maximum.
- Global variable SRAM bytes used, maximum, and remaining.
- Whether upload succeeded.
- Any visible hardware mismatch.
- Whether music played on hardware.
- Whether the final beta was published to GitHub.
- Whether the final beta was mirrored to GitLab.
- Tutorial links or tutorial file names.

## Public Release Checklist

- Create a clean public beta copy using
  `Documentation/BETA_PACKAGE_CONTENTS.md`.
- Confirm no private notes, backups, generated Arduino history, or unrelated
  old/trash files are included.
- Add or confirm public `README.md`, `LICENSE.md`, and release notes.
- Add a `.gitignore` that excludes generated exports, backups, local recovery,
  and private saved test files.
- Use the repository metadata and release body draft in
  `Documentation/BETA_PACKAGE_CONTENTS.md`.
- Publish the tested beta to GitHub.
- Create a GitHub beta tag/release with the tested package.
- Publish or mirror the same tested beta to GitLab.
- Confirm `.gitlab-ci.yml` is present if GitLab Pages should serve the app.
- Confirm GitHub and GitLab link to each other.
- Link tutorial videos or written tutorials from both repository READMEs.

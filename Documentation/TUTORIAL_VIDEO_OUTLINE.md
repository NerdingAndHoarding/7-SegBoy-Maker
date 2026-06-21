# Tutorial Video Outline

This is the static tutorial plan for the first beta. Keep the videos short and
practical. Do not promise features that are not in the beta.

## Video 1: Open The Tool

- Open `index.html` directly in Chrome.
- Show `START_HERE.md`.
- Point out Hardware Preflight.
- Explain that Project JSON is the main save format.

## Video 2: Wire The Official Hardware

- Use only `Documentation/HARDWARE_PROFILE.md`.
- Show the official Nano, MAX7219, A4, A0, D5, D4, D3, and D9 wiring.
- Explain that unsupported wiring is not part of the beta.
- Explain that D3 is melody audio and D9 is bass audio.

## Video 3: Make A Tiny World

- Start from the starter project.
- Generate or edit a very small world.
- Move in the Browser Movement Test.
- Turn Trigger battles on and off.

## Video 4: Test A Battle

- Start a browser battle.
- Show the basic command flow.
- Win once and confirm return to the same world position.
- Lose once and confirm restart from the beginning.

## Video 5: Save, Reload, And Recover

- Save Project JSON.
- Reload Project JSON.
- Explain that browser recovery is only interruption protection.
- Show that clean JSON save clears recovery.

## Video 6: Export And Upload

- Check Hardware Preflight.
- Export **Combined Game .ino**.
- Open the newest timestamped folder under `Arduino_Tests`.
- Compile and upload in Arduino IDE.
- Record flash and SRAM numbers.

## Video 7: First Hardware Test

- Turn A0 and confirm brightness changes.
- Turn A4 and confirm facing/menu selection changes.
- Press D5 for forward/confirm.
- Press D4 for backward/reject.
- Test room movement, battle start, victory, and defeat.
- Confirm worldmap music plays.
- Confirm battle music starts during battle and returns to worldmap music after
  victory.
- Confirm `E.02` cannot enter `E.03`; the key gate is the intended route.

## Video 8: Make And Assign Music

- Open the Chiptune Song Machine.
- Generate one worldmap melody and one battle melody.
- Export song JSON from the music tool.
- Import both songs into the main tool.
- Assign worldmap music and battle music.
- Preview in browser.
- Export and confirm the songs play on hardware.

## Video 9: Public Beta Package

- Show the clean public beta folder.
- Explain which folders are excluded from the public package.
- Point to `LICENSE.md`, `README.md`, the hardware profile, and this tutorial
  outline.
- Explain that generated Arduino test folders are local output, not source.

## Video 10: GitHub And GitLab Release

- Show the GitHub repository page.
- Show the GitLab mirror page.
- Point to the beta release/tag.
- Show where users find:
  - `index.html`,
  - wiring instructions,
  - tutorial links,
  - known beta limitations.

## Keep Out Of The First Tutorial Series

- Advanced audio/SFX editor design.
- Full text/glyph alphabet policy.
- Unsupported wiring fixes.
- Terrain, treasure, goal, beast markers, or map triggers.
- Any workflow that requires editing generated Arduino code by hand.
- General-purpose RPG systems beyond the approved Minimal RPG beta.

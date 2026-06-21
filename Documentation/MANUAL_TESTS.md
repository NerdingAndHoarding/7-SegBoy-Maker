# Combined Manual Tests

This is the single running manual-test document for the current sequence of
lean milestones. Results supplied on 2026-06-15 are recorded below.

## B07-P04 Preflight UI And Export Gating

Open `index.html` directly.

1. Find **Hardware Preflight** below the project summary.
2. Confirm Flash, SRAM, EEPROM, and Wiring all show values.
3. Confirm Subsystems lists exact values or clearly says `Unknown`/`about`.
4. Confirm Warnings and blockers contains warnings but no blocker for the
   normal starter project.
5. Confirm **Export Combined Game .ino** is enabled.
6. Confirm the Text, Glyph/Data, Worldmap, and Battle export buttons remain
   enabled.
7. Change an ordinary value such as transition time. Within about one second,
   confirm Hardware Preflight recalculates without opening a dialog.
8. Save and reload project JSON. Confirm the report returns and the combined
   export remains available.

Expected result: the report is readable, estimates are labeled, editing is
not interrupted, and the existing test-export order still works.

### Recorded Result

- Steps 1-7 passed. All five Arduino export buttons remained functional.
- Step 8 was not completed because Save As downloaded the file without making
  its location clear. Save and Save As use ordinary browser downloads in this
  beta. The status now explicitly identifies the browser's Downloads folder.
- Generating a map produced many blockers. Investigation reproduced 20
  blockers on a 2 x 2 generated map: invalid room IDs, missing room/section
  references, and missing room reference lists.
- Root cause: the older world editor replaces schema-v2 rooms with legacy
  `{x, y, frame}` objects. This is a real editor/model mismatch and remains a
  required corrective step; preflight must not be weakened to hide it.

Status: **partial pass; world-editor schema correction still required.**

## B08-P04 World Compression Test Page

Open `worldCompressionTests.html` directly.

1. Confirm the summary says `15 of 15 tests passed`.
2. Confirm every listed row says `PASS`.
3. Select **Run tests** and confirm the same result appears again.

Expected result: all compression modes, lookups, byte totals, and validation
checks pass without changing any project data.

### Recorded Result

- 15 of 15 passed on load.
- Every row showed `PASS`.
- Running the tests again produced the same result.

Status: **passed.**

## B08-P05 Arduino World Data Modes Hardware Gate

This test must pass before work begins on B09.

1. Open `index.html` and select **Export World Data Modes Test .ino**.
2. Open the newest timestamped
   `Arduino_Tests/SevenSeg_World_Data_Modes_Test_...` sketch in Arduino IDE.
3. Select Arduino Nano and the processor option that works with the existing
   7-SegBoy hardware.
4. Compile and upload. Record the reported flash and global-variable SRAM.
5. Open Serial Monitor at 9600 baud. Confirm it starts with:
   `Room 1/5: 1-bit palette`.
6. Press D5 four times. Confirm Serial advances through 2-bit, 3-bit, 4-bit,
   and raw, and each press changes the complete 8 x 3 display.
7. Press D4. Confirm it returns to the previous room.
8. Hold D5 for more than 500 ms. Confirm it advances about once every 200 ms
   without rapid uncontrolled movement.
9. Turn the A0 BrightnessPot from minimum to maximum. In Serial Monitor,
   confirm `Brightness A0=... level=0/15` reaches `level=15/15`.
   Visual changes need not look evenly spaced, but the display must respond
   across the range.
10. In the 1-bit room, confirm a blank/all-segments checker pattern.
11. In the 2-bit room, confirm repeating blank, middle segment, `1`, and `0`
    glyphs.
12. In the 3-bit room, confirm the familiar numbered pattern is correctly
    oriented and not mirrored. This is the compatibility-critical room.
13. In the 4-bit room, confirm a wider sequence of digit/letter-like glyphs.
14. In the raw room, confirm individual segments sweep across the first two
    rows and the third row includes decimal points.

Expected result: all five modes are stable, correctly oriented, selectable in
both directions, brightness responds, Serial labels agree, and the sketch
fits the Arduino Nano. Report the flash/SRAM figures and any visual mismatch.

### Recorded Result

- Export, Nano selection, compile, upload, and Serial startup passed.
- Compile result: 3,860 bytes flash (12%) and 246 bytes global SRAM (12%),
  leaving 1,802 bytes for local variables.
- D5/D4 selection and held-button repeat passed. Serial and display were
  checked in separate powered phases because this hardware setup could not
  operate the display and USB Serial together.
- 1-bit checker, 2-bit pattern, 3-bit `1234567` pattern, 4-bit wider glyph
  pattern, raw segment sweep, orientation, and mirroring all passed.
- Brightness visibly changed only from minimum through about five higher
  levels. Serial traversed all 16 settings. Upper MAX7219 settings looking
  alike is accepted because the register range is still exercised.
- The updated diagnostic sketch compiles at 3,950 bytes flash (12%) and 246
  bytes global SRAM (12%).

Status: **passed. Serial was confirmed to show 0/15 through 15/15.**

## B08-P06 Generated Map Schema Correction

Automatic checks passed for 2 x 2 and 26 x 32 maps. One short browser check
remains useful:

1. Open `index.html` and generate a 26 x 32 map with Random # enabled.
2. Confirm Hardware Preflight shows no blockers.
3. Confirm **Export Combined Game .ino** remains enabled.
4. Save Project JSON and confirm the status names the downloaded file and
   browser Downloads folder.
5. Reload that JSON and confirm the map, start position, and combined export
   remain available.

Expected result: generated maps no longer produce missing-ID or
missing-reference blockers.

## B09-P02 Section And Coordinate Overview

Automatic data and event-path checks passed. Manual visual check:

1. Open `index.html` and find the world overview.
2. Generate a 26 x 32 world and confirm the scrollable overview contains
   coordinates `A.00` through `Z.31`.
3. Select an unedited coordinate. Confirm it says `implicit empty` and does
   not mark the project dirty merely from selection.
4. Create sections until there are nine. Confirm a tenth cannot be created.
5. Select a section and confirm its coordinates are visually distinguished.
6. Use **Randomize sections**, then the visible **Undo** button. Confirm the
   previous assignments return in one step. `Ctrl+Z` should also work when
   focus is not inside an input. `Ctrl+U` is not reliable because Chrome can
   reserve it for View Source.
7. To test deleting a non-default section: create a section, assign one
   coordinate to it with **Assign selected**, delete that section, then use
   **Undo**. Confirm the deleted section and that coordinate assignment both
   return.
8. Change area type among Worldmap, Town, and Dungeon, save JSON, reload it,
   and confirm the chosen type and sections remain.

Expected result: the full overview remains usable, selection does not create
rooms, and every section command is reversible.

### Recorded Result

- Opening the world overview, generating a 26 x 32 world, creating up to nine
  sections, selecting implicit rooms, assigning selected coordinates, and
  saving/loading area type all passed.
- Manual testing found two defects: generated worlds marked unedited
  coordinates as `explicit room`, and there was no direct way to assign the
  selected coordinate to the selected section.
- Fix applied: plain Generate keeps only the start room explicit and leaves
  other untouched coordinates as implicit empty. Random `#` generation creates
  sparse explicit rooms only where blocking content exists.
- Fix applied: **Assign selected** assigns only the current coordinate to the
  selected section. Assigning to the default section removes that coordinate
  from non-default section lists. Undo reverses the assignment in one step.

Status: **needs quick re-check for the two fixed B09-P02 items.**

### Recorded Result 2026-06-16

- Re-check passed for generated 26 x 32 coordinates and implicit empty
  selection.
- Re-check passed for selecting a section and visually distinguishing assigned
  coordinates.
- Manual testing found that `Ctrl+U` can be reserved by Chrome and `Ctrl+Z`
  did not yet route to editor Undo.
- Fix applied: `Ctrl+Z` now routes to the same editor Undo system as the
  visible **Undo** button when focus is not inside an input. `Ctrl+U` remains
  supported only where the browser allows it.
- The delete-section test text was rewritten with clearer steps.

Status: **needs quick re-check for Randomize sections + Undo, using the
visible Undo button first and Ctrl+Z second.**

## B09-P03 Room Type And Palette Editing

Automatic data, round-trip, preflight, and exporter checks passed. Complete
this visual check in `index.html`:

1. In the Glyph editor, make or select one blank/non-blocking glyph, one
   visible non-blocking glyph, and one visible glyph tagged `blocking`.
2. In the World editor, add those glyphs to the active palette. Confirm every
   slot shows its index, glyph name, segment byte, and blocking state.
3. Set the active room to **Normal**, select a palette slot, and select cells
   in the 8 x 3 display. Confirm the selected glyph shape appears in exactly
   those cells.
4. Set the room to **Special** and confirm the same 24 palette cells remain.
5. Select **Start 1**. Confirm a blocking cell is rejected and a non-blocking
   cell shows the red player `1` overlay without changing its glyph.
6. Set the room to **Raw**. Toggle several individual segments, including a
   decimal point. Confirm the exact shapes and DP remain after selecting
   another room and returning.
7. Use **Clear**, **Randomize**, room-type changes, and palette painting.
   After each kind of action, use **Undo** or `Ctrl+Z` and confirm one action
   is reversed.
8. Add at least three palette glyphs, then try selecting 1-bit mode. Confirm
   it is rejected because two slots are insufficient.
9. With two sections, switch between Global and Section palette ownership.
   Confirm Global uses the same palette in both sections and Section allows
   the active section to be edited independently.
10. Confirm the storage line updates for room payload, sparse room record,
    palette, and section-coordinate bytes.
    This line is only an Arduino-memory estimate: room payload is the display
    data, sparse room record is its small lookup header plus data, palette is
    the active glyph list, and section-coordinate bytes are the coordinates
    assigned to non-default sections.
11. Save Project JSON, reload it, and confirm room type, palette indexes, raw
    DP bits, blocking tags, and start position remain.
12. Confirm Hardware Preflight has no new blocker and the Combined Game
    export remains available.

Expected result: palette and raw rooms edit exactly 24 cells, visual shape and
blocking behavior remain separate, invalid starts/capacities are rejected,
and each authored command is reversible.

### Recorded Result

- Glyph selection, palette slots, Normal/Special painting, blocking start
  rejection, raw DP retention, Clear/Randomize/type/paint Undo, 1-bit
  rejection, Global/Section palette behavior, JSON reload, Hardware Preflight,
  and Combined Game export all passed.
- The storage line was unclear, so the manual test now explains it as an
  Arduino-memory estimate.

Status: **passed, with storage wording clarified.**

## B09-P04 Generate, Section Randomize, And 018 Import

Automatic event-path and export checks passed. Complete this browser check in
`index.html`:

1. Generate a plain 26 x 32 world with Random `#` off. Confirm only the start
   room is explicit and untouched coordinates still report `implicit empty`.
2. Create a second section, select one coordinate in that section, and use
   **Randomize section rooms**. Confirm a visible authored room appears only
   because randomize was requested.
3. Use the visible **Undo** button. Confirm the new authored room created by
   section randomize is removed or reverted in one step.
4. Paste or load an 018 TXT export that contains:
   one region block and at least one map row such as `B.00`.
5. Select **Preview** in the Import From 018 panel. Confirm the project does
   not change yet and the preview lists glyph/frame counts plus imported
   sections and rooms.
6. If the source has overlapping region coordinates, out-of-range
   coordinates, or a map row with no region while regions are present,
   confirm Preview reports errors and **Commit import** stays disabled.
7. Preview a valid 018 source and select **Commit import**. Confirm the
   imported rooms appear in the world overview, imported regions become
   sections, and the project becomes dirty only after commit.
8. Use **Undo import** or global **Undo** with `Ctrl+Z` focus on the page.
   Confirm the imported sections and rooms are removed in one step.
9. Save Project JSON, reload it, and confirm imported room coordinates,
   section assignments, and raw room bytes remain.
10. Confirm Hardware Preflight has no new blocker and both Worldmap Test and
    Combined Game exports remain available after a valid import.

Expected result: Generate stays sparse, section randomize only creates
authored data when asked, 018 preview is non-mutating, invalid sources are
blocked before commit, and commit/undo boundaries are exact.

## B09-P05 World Preview, Timing, And Save/Load QA

Complete this browser check in `index.html`:

1. Load or generate a 26 x 32 world.
2. Set **Transition animation time** to a visible value and move into a
   valid new room. Confirm the room transition still animates.
3. Set **Show coordinates** to `yes` or a timed value, enter a new room, and
   confirm the top-right coordinate notice appears and then clears.
4. Turn **Trigger battles** off. Move around and confirm the Browser Movement
   Test does not start battle mode.
5. Turn **Trigger battles** on again. Move around and confirm battles can
   start after successful moves.
6. Save Project JSON, reload it, and confirm the world size, section
   assignments, transition time, coordinate settings, and battle toggle
   remain.
7. Make one small room edit in the large world and confirm the editor stays
   usable and the export buttons still remain available.

Expected result: the world preview stays readable, timing controls survive
save/load, and the full-size editor remains comfortable to use.

## B10-P01 Authored Browser Battle Data

Complete this browser check in `index.html`:

1. Start a standalone battle and confirm the visible party and foe names come
   from the project instead of only fixed test labels.
2. Confirm starting HP also follows the project data.
3. In the world test, turn **Trigger battles** on and move until battle
   starts. Confirm the combined battle still opens and finishes normally.
4. Win the battle and confirm the player returns to the same world position.
5. Save Project JSON, reload it, and confirm the same battle names and
   behavior remain.

Expected result: browser battle uses authored project data, combined battle
still works, and victory still returns to the same room and cell.

## B11-P01 Browser Intro And Restart Flow

Complete this browser check in `index.html`:

1. Reload `index.html`.
   Look at the Browser Movement Test display immediately after the page opens.
   It should first show a short text message using the project title, for
   example `SMALL QUEST`, instead of showing the player on the map right away.

2. While that start message is still visible, press one movement button such
   as **Right**.
   The player should not move during the message. After about one second, the
   normal map display should appear and movement should work again.

3. Press the center **Reset** button in the Browser Movement Test movement
   controls. It is between **Left** and **Right**.
   The same short start message should appear again. After the message clears,
   the player should be back at the start position.

4. Set **Trigger battles** to `Yes`.
   Move around in the Browser Movement Test until a battle starts. If battle
   does not start quickly, keep making successful moves; this is still random.

5. Lose the battle on purpose.
   One easy way is to avoid healing and let the foes defeat the party. After
   `Game over`, the Browser Movement Test should restart from the beginning
   and show the short start message again before movement works.

6. Start another battle and win it.
   After `Victory`, the Browser Movement Test should return to the exact same
   room and cell where the battle started. It should not show the start
   message after victory, because victory keeps the current world position.

Expected result: browser play feels like a real start/restart loop, and
movement stays paused until the intro/restart message finishes.

### Recorded Result

- Step 1 passed: the short start message appeared before movement.
- Step 2 passed: movement was locked while the start message was visible.
- Step 3 passed after clarification: **Reset** means the center
  movement-control button between **Left** and **Right**.
- Step 4 passed: battles can trigger when **Trigger battles** is `Yes`.
- Step 5 passed: defeat restarts from the beginning and shows the start flow.
- Step 6 passed: victory returns to the same world position.

Status: **passed.**

## B11-P02 Editable Browser Intro Text

Complete this browser check in `index.html`:

1. Find **Intro text** above the Browser Movement Test.
   It is in the same settings area as transition time, show coordinates, and
   trigger battles.

2. Write a short test text, for example `HELLO`.
   Use 1 to 24 characters.

3. Press the center **Reset** button between **Left** and **Right**.
   The display should show your custom intro text before the player can move.

4. Try writing more than 24 characters.
   The text should be cut at 24 characters.

5. Select **Save Project JSON**.
   Reload that JSON file with **Load Project JSON**.
   Confirm **Intro text** still shows your custom text.

6. With **Trigger battles** set to `Yes`, win a battle.
   After `Victory`, the player should return to the same world position.
   The intro text should not appear after victory.

Expected result: the intro text is easy to edit, survives save/load, and the
browser play loop still behaves the same as B11-P01.

## B11-P03 Editable Browser Victory And Game-Over Texts

Complete this browser check in `index.html`:

1. Find **Victory text** and **Game over text** above the Browser Movement
   Test.

2. Write a short custom Victory text, for example `YOU WIN`.
   Set **Trigger battles** to `Yes`, start a battle, and win it.
   Confirm your custom Victory text appears during the ending message.

3. After that victory, confirm the player returns to the exact same world
   position where the battle started.

4. Write a short custom Game over text, for example `TRY AGAIN`.
   Start another battle and lose it on purpose.
   Confirm your custom Game over text appears during the ending message.

5. After that defeat, confirm the Browser Movement Test restarts from the
   beginning and then shows the intro text again before movement works.

6. Try writing more than 24 characters in one of the new text boxes.
   Confirm it is cut at 24 characters.

7. Select **Save Project JSON**.
   Reload that JSON file with **Load Project JSON**.
   Confirm both custom texts are still present in their boxes.

Expected result: the battle ending texts are editable, save/load correctly,
victory still returns to the battle-start position, and defeat still restarts
from the beginning.

## B12-P01 Browser Save Slots For Current Position

Complete this browser check in `index.html`:

1. Find **Browser Save Slots** below the Browser Movement Test.
   Confirm there are three rows named Slot 1, Slot 2, and Slot 3.

2. Leave **Trigger battles** set to `No`.
   Move the player to a room and cell that is easy to recognize.

3. Press **Save** on Slot 1.
   Confirm the Slot 1 label changes from `Empty` to a coordinate and cell
   summary such as `A.00 x3 y1 worldmap`.

4. Move somewhere else.
   Press **Load** on Slot 1.
   Confirm the player returns to the exact saved room and cell.

5. Reload `index.html`.
   Confirm Slot 1 still shows its saved summary instead of `Empty`.

6. Change the world area type to `Dungeon`.
   Press **Save** on any slot.
   Confirm saving is rejected with a clear message about dungeon saves
   requiring save points.

7. Confirm empty slots show `Empty` and their **Load** buttons are disabled.

Expected result: browser slots save and load the current play position, remain
separate from Project JSON, survive page reloads in the same browser, and
refuse dungeon saves until save points exist.

## B12-P02 Browser Save-Slot Management Polish

Complete this browser check in `index.html`:

1. In **Browser Save Slots**, save the current position into Slot 1.
   Confirm the Slot 1 summary now includes a saved time after the coordinate
   and area type.

2. Without clearing Slot 1 first, press **Save** on Slot 1 again.
   Confirm a dialog asks before overwriting the slot.

3. Cancel that dialog once.
   Confirm the save is cancelled and the slot stays unchanged.

4. Press **Save** on Slot 1 again and confirm the overwrite this time.
   Confirm the slot still contains a valid saved summary.

5. Press **Clear** on Slot 1.
   Confirm a dialog asks before clearing the slot.

6. Confirm the clear.
   Confirm Slot 1 returns to `Empty`.

7. Confirm **Clear** is disabled for any empty slot.

Expected result: save slots can be managed safely, overwrites are deliberate,
clearing is easy, and the saved-time hint makes the three slots easier to use.

## B12-P03 Live Save-Availability Feedback

Complete this browser check in `index.html`:

1. Open **Browser Save Slots** during ordinary world movement.
   Confirm the small note says `Save allowed.`

2. While the intro text is showing after a reset, look at the same note.
   Confirm it changes to a blocked message about waiting for the current text
   message to finish.

3. After the intro ends, confirm the note returns to `Save allowed.`

4. Set **Trigger battles** to `Yes` and enter a battle.
   Confirm the note changes to `Battle is active.` and the slot **Save**
   buttons are disabled.

5. Change the world area type to `Dungeon`.
   Confirm the note says dungeon saves require save points and the slot
   **Save** buttons are disabled.

6. If you already have a valid saved slot, press **Load** while saving is
   blocked.
   Confirm **Load** still works for that valid slot.

Expected result: the browser save panel clearly shows whether saving is
allowed, disables Save when it is not, and still allows loading a valid slot.

## B12-P04 Authored Dungeon Save-Point Rooms

Complete this browser check in `index.html`:

1. In the world editor, change the world area type to `Dungeon`.
   Confirm the Browser Save Slots note says dungeon saves require save points.

2. In the active room properties, find the `Save point` checkbox.
   Confirm it is available for the current room.

3. Check `Save point`.
   Confirm the Browser Save Slots note changes immediately to `Save allowed.`
   and the slot **Save** buttons become enabled.

4. Press **Save** on one slot.
   Confirm the save succeeds from this dungeon room.

5. Uncheck `Save point`.
   Confirm the Browser Save Slots note changes back to the dungeon blocked
   message and the slot **Save** buttons disable again.

Expected result: dungeon saves are blocked by default, allowed on authored
save-point rooms, and the browser save panel updates immediately when the room
checkbox changes.

## B12-P05 Exact Position Save-State Definition

Complete this browser check in `index.html`:

1. Open **Hardware Preflight**.
   Confirm the EEPROM line shows an exact byte count, not `at least`.

2. In **Warnings and blockers**, confirm there is no warning that says the
   three-slot EEPROM encoding is incomplete.

3. Select **Save Project JSON**.
   Reload that JSON file with **Open Project JSON**.

4. Confirm the EEPROM line still shows an exact byte count and the incomplete
   EEPROM encoding warning does not return.

Expected result: the current beta save scope is position-only and exact:
world index, room x/y, and player x/y stored in three manual slots.

## B12-P06 Live Browser Recovery Status

Complete this browser check in `index.html`:

1. Change a simple project value, such as **Intro text** or the project title.
   Confirm the header recovery label changes to `Recovery pending`.

2. Wait about 2 seconds without saving JSON.
   Confirm the header recovery label changes to `Recovery saved HH:MM`, using
   the current browser time.

3. Select **Save Project JSON**.
   Confirm the header recovery label changes to `No recovery`.

4. Reload `index.html`.
   Confirm no browser recovery offer appears for that cleanly saved project.

Expected result: browser recovery is visibly queued, visibly written, and then
cleared by a normal Project JSON save.

## B12-P07 Visible Save-Model Preflight Summary

Complete this browser check in `index.html`:

1. Open **Hardware Preflight**.
   Confirm there is a **Save model** field.

2. Confirm **Save model** says `3 slots, position-only`.

3. Hover the **Save model** value.
   Confirm the browser tooltip lists the position fields and save rules.

4. Confirm the EEPROM line still shows an exact byte count.

Expected result: the save model is visible in the app, matches the current
position-only beta scope, and EEPROM remains exact.

## B13-P01 Shared A0 BrightnessPot Export

Only do the hardware part if you already have the Arduino connected.

1. Open `index.html`.

2. Export either **Text display export test** or **Combined Game .ino**.

3. Open the newest exported sketch folder in `Arduino_Tests`.

4. In the Arduino IDE, use search and confirm the sketch contains:
   `DISPLAY_BRIGHTNESS_POT_PIN = A0`

5. Also confirm the sketch contains:
   `updateDisplayBrightness();`

6. Optional hardware check: upload the sketch and turn the A0 BrightnessPot.
   Confirm the display gets dimmer at one end and brighter at the other.

Expected result: generated sketches now share the same A0 brightness rule, and
the display brightness can be changed while the sketch is running.

## B13-P02 Fast-Beta Audio Preflight Policy

This is a browser-only check. No Arduino upload is needed.

1. Open `index.html`.

2. Look at **Hardware Preflight**.

3. In **Warnings and blockers**, confirm there is no warning that says audio
   timers are unresolved when you have not created music or sound effects.

4. Confirm **Export Combined Game .ino** is still enabled, unless the project
   has another clear blocker such as too much flash or SRAM.

Expected result: no-audio projects are not slowed down by audio warnings.

Historical note: this B13 step was written before R09. It is superseded for
the current beta by the R09 audio hardware path. D3 is now melody output and
D9 is now bass output in the combined Minimal RPG export.

## B13-P03 Active Roadmap Label Cleanup

No browser or Arduino test is needed.

This step only updates control documents so future work follows the fast beta
roadmap instead of archived milestone numbers.

Expected result: active beta documents no longer tell the next agent to wait
for old B18/B21/B22 milestones. Any remaining old labels are historical notes
or marked as superseded.

## B13-P04 Start Here Quick-Start Refresh

No browser or Arduino test is needed.

1. Open `START_HERE.md`.

2. Confirm it says to open `index.html` to run the tool.

3. Confirm it explains that exported sketches go under `Arduino_Tests`.

4. Confirm it lists the official hardware summary and points to
   `Documentation/HARDWARE_PROFILE.md` for details.

5. Confirm it no longer says the current task is B05.

Expected result: a new person can open one short file and understand how to
start the beta tool without reading the old prompt archive.

## B13-P05 Beta Release Checklist

No browser or Arduino test is needed for creating the checklist.

1. Open `Documentation/BETA_RELEASE_CHECKLIST.md`.

2. Confirm it has four short sections:
   **Required Passes**, **Required Notes**, **Known Beta Exclusions**, and
   **Evidence To Record**.

3. Open `START_HERE.md`.

4. Confirm the active document list links to
   `Documentation/BETA_RELEASE_CHECKLIST.md`.

Expected result: the project has one short beta-readiness checklist without
adding a new feature or another large control document.

## B13-P06 AGPL License File

No browser or Arduino test is needed.

1. Confirm `LICENSE.md` exists in the project root.

2. Open `LICENSE.md`.

3. Confirm it says `SPDX-License-Identifier: AGPL-3.0-only`.

4. Confirm `START_HERE.md` has a **License** section that points to
   `LICENSE.md`.

5. Confirm `Documentation/BETA_RELEASE_CHECKLIST.md` requires the license file
   before sharing a beta copy.

Expected result: the beta folder contains a clear license note matching the
accepted AGPL v3 decision.

## B13-P07 Public Hardware Wiring Checklist

No browser or Arduino test is needed for creating the checklist.

1. Open `Documentation/HARDWARE_PROFILE.md`.

2. Confirm it has a **Builder Wiring Checklist** section.

3. Confirm that checklist mentions D10, D11, D13, A4, A0, D5, D4, 5V, GND,
   common ground, and the three MAX7219 modules.

4. Confirm it has a **First Hardware Check** section.

5. Open `START_HERE.md` and confirm it points to the wiring checklist.

6. Open `Documentation/BETA_RELEASE_CHECKLIST.md` and confirm it requires the
   builder wiring checklist to be checked before sharing a beta copy.

Expected result: public beta hardware setup has one simple checklist, and it
still points back to the single official wiring profile.

## B13-P08 Tutorial Video Outline

No browser or Arduino test is needed.

1. Open `Documentation/TUTORIAL_VIDEO_OUTLINE.md`.

2. Confirm it has short topics for opening the tool, official wiring, making a
   tiny world, testing battle, saving/reloading, exporting/uploading, and first
   hardware test.

3. Confirm the outline says to keep audio, full text policy, unsupported
   wiring, and map-trigger systems out of the first tutorial series.

4. Open `START_HERE.md` and confirm it links to the tutorial outline.

5. Open `Documentation/BETA_RELEASE_CHECKLIST.md` and confirm it requires the
   tutorial outline before sharing a beta copy.

Expected result: the first beta has a simple tutorial-video plan without
creating a large documentation site.

## B13-P09 Beta Test Record Template

No browser or Arduino test is needed for creating the template.

1. Open `Documentation/BETA_TEST_RECORD.md`.

2. Confirm it has these sections: **Candidate**, **Browser Result**,
   **Arduino Compile Result**, **Hardware Result**, and **Release Decision**.

3. Confirm the compile section has fields for flash, SRAM, compile result, and
   notes.

4. Confirm the hardware section has fields for upload, A0, A4, D5, D4, room
   movement, transitions, battle victory, battle defeat, and visible mismatch.

5. Open `Documentation/BETA_RELEASE_CHECKLIST.md` and confirm its evidence
   section points to `Documentation/BETA_TEST_RECORD.md`.

6. Open `START_HERE.md` and confirm it lists the test record as an active
   document.

Expected result: final beta evidence has one simple fill-in place.

## B13-P10 Beta Package Contents Checklist

No browser or Arduino test is needed for creating the checklist.

1. Open `Documentation/BETA_PACKAGE_CONTENTS.md`.

2. Confirm it has **Include**, **Usually Exclude From A Public Copy**,
   **Before Sharing**, and **Rule** sections.

3. Confirm it says to exclude working folders such as `backups`, `old`,
   `Arduino_Tests`, and `Saved_json` from a clean public copy.

4. Confirm it says not to delete working folders from the development copy.

5. Open `START_HERE.md` and confirm it lists the package contents checklist.

6. Open `Documentation/BETA_RELEASE_CHECKLIST.md` and confirm it requires the
   package contents checklist before sharing a beta copy.

Expected result: beta packaging has a simple include/exclude guide without
changing the current working folder.

## B13-P11 Exact Beta Package Source List

No browser or Arduino test is needed.

1. Open `index.html`.

2. Look at the script tags near the bottom of the file.

3. Open `Documentation/BETA_PACKAGE_CONTENTS.md`.

4. Confirm **Required Root JavaScript Files** lists the same app scripts in the
   same order.

5. Confirm browser test files are listed separately under **Optional Test
   Files**.

6. Open `START_HERE.md` and confirm **Active Source** includes the same app
   source files.

Expected result: making a clean beta copy no longer depends on guessing which
root JavaScript files belong beside `index.html`.

## R01-P01 Minimal RPG Contract

No browser or Arduino test is needed for this document-only step.

1. Open `Documentation/ROADMAP.md`.

2. Confirm the approved minimal RPG target includes two sections, two section
   enemies, a locked gate, chests, key, sword, potions, leveling, final boss,
   and ending text.

3. Open `Documentation/SCHEMA_V2.md`.

4. Confirm **Minimal RPG Beta Contract** separates authored project JSON,
   runtime state, save state, and Arduino ownership.

5. Open `Documentation/RESOURCE_BUDGET.md`.

6. Confirm **Minimal RPG Storage Contract** says which data belongs in
   `PROGMEM`, fixed SRAM buffers, and EEPROM save slots.

Expected result: the next step can add starter default data without guessing
which systems the minimal RPG requires.

## R01-P02 Minimal RPG Starter Defaults

No Arduino test is needed for this data-only step.

1. Open `projectModelTests.html`.

2. Confirm the summary says all tests passed.

3. Confirm one test is named **Minimal RPG starter defaults**.

4. Open `index.html`.

5. Save Project JSON.

6. Reload that JSON.

7. Confirm the project opens without validation errors or a recovery warning.

Expected result: the starter data survives JSON save/load. The new minimal RPG
content does not need to affect gameplay yet.

## R01-P03 Minimal RPG Summary

No Arduino test is needed for this status-view step.

1. Open `index.html`.

2. Find the **Minimal RPG summary** area near the project summary.

3. Confirm it shows `1 world, 2 sections`.

4. Confirm section enemies mention `Gob` and `Boss`.

5. Confirm chests show `8 total, 4 gold, 2 potion`.

6. Confirm key chest says `Yes`.

7. Confirm sword chest says `Yes`.

8. Confirm potion says `+10HP`.

9. Confirm sword bonus says `+4 attack`.

10. Confirm the key flag and boss flag begin as `false`.

11. Save Project JSON, reload it, and confirm the summary still shows the
    same values.

Expected result: the non-coder can see what the starter RPG contains before
the behavior is implemented.

## R02-P01 Section-Based Browser Battles

No Arduino test is needed for this browser-only step.

1. Open `index.html`.

2. Confirm Trigger battles is `No`.

3. Move around in section 1 and confirm no battle starts.

4. Set Trigger battles to `Yes`.

5. Move in section 1 until a battle starts, or use **Start Battle** while the
   player is still in section 1.

6. Confirm the enemy is the normal section-1 enemy, not the boss.

7. Move the player to section 2.

8. Trigger or start a battle there.

9. Confirm the enemy is the boss.

10. Win the battle and confirm the player returns to the same world position.

Expected result: battle enemy selection follows section ownership, while gate,
chests, loot, leveling, and ending behavior are still inactive.

## R02-P02 Locked Gate Browser Movement

No Arduino test is needed for this browser-only step.

1. Open `index.html`.

2. Make sure the browser movement test is visible and Trigger battles can stay
   `No`.

3. Move the player to the right edge of room `A.00`.

4. Confirm the section border shows visible `8` wall cells and a visible `1`
   gate cell.

5. Try to step onto the visible `1` gate cell.

6. Confirm the player stays before the gate and the status says
   `Gate locked. Find the key.`

7. Confirm visible `8` wall cells block movement with the normal blocked
   message.

8. Change `Has ancient key` to `Yes`.

9. Confirm the status says `Has ancient key = Yes.`

10. Try the same `1` gate again.

11. Confirm the player can step onto the gate and then cross into `B.00`.

12. Optional check: set Trigger battles to `Yes`, start or trigger one battle
    in each section, and confirm section 1 still uses `Gob` while section 2
    still uses `Boss`.

Expected result: `8` is a visible wall, `1` is the visible locked gate, and
only the gate changes with the key flag. Chests, loot, XP, potion use, sword
use, and ending behavior are still inactive.

## R02-P03 Browser Chests And Loot

No Arduino test is needed for this browser-only step.

Open `index.html`.

The browser movement display uses `C` for unopened chests. Step onto a `C` to
open it. After opening, that chest disappears and cannot give its reward again.

Starter chest locations:

- `A.00`: gold at x2 y0 and x5 y0.
- `A.00`: ancient key at x3 y1.
- `A.01`: gold at x1 y0 and x6 y0.
- `A.01`: sword at x2 y2.
- `A.01`: potions at x4 y2 and x6 y2.

1. Keep `Has ancient key` set to `No`.

2. In `A.00`, step onto the `C` at x3 y1.

3. Confirm the status says `You now hold the anchent key`.

4. Confirm the `Has ancient key` switch changes to `Yes`.

5. Confirm the `Key flag` summary says `true`.

6. Try the `1` gate between `A.00` and `B.00`.

7. Confirm the gate now allows movement.

8. Open one gold chest and confirm the status says `+10 Gold`.

9. Move away and step back onto the same cell. Confirm it does not give another
   `+10 Gold`.

10. Open one potion chest in `A.01` and confirm the summary shows the potion
    count increased.

11. Open the sword chest in `A.01` and confirm the status says the sword is
    equipped and the summary says the sword is equipped.

Expected result: each authored chest opens once, rewards update browser project
state, and gate/battle behavior from the previous steps still works.

## R03-P01 Browser XP And Leveling

No Arduino test is needed for this browser-only step.

Open `index.html`.

1. Confirm the Minimal RPG summary shows hero progress with level, XP, HP, and
   ATK.

2. Start and win a section-1 battle against `Gob`. You can set Trigger battles
   to `Yes` and walk until battle starts, or use **Start Battle** while the
   emulator is still in section 1.

3. Confirm the status reports `XP +7`.

4. After the next battle starts, confirm the hero starts with the HP left from
   the previous battle, not automatically full HP.

5. Repeat section-1 victories. After about three wins, confirm the status says
   `Level up!`.

6. Confirm the summary now shows a higher level, higher HP, and higher ATK.

7. Move to section 2 and confirm the boss battle still uses `Boss`.

Expected result: normal battle victories advance hero XP and level, while
potion use, final boss ending, and Arduino export remain inactive.

## R03-P02 Browser Sword Attack Bonus

No Arduino test is needed for this browser-only step.

Open `index.html`.

1. Check the Minimal RPG summary ATK before opening the sword chest.

2. Move to `A.01` and step onto the sword chest at x2 y2.

3. Confirm the message says the sword is equipped.

4. Confirm the Minimal RPG summary says `+4 attack, equipped` and ATK is 4
   higher than before.

5. Move away and step back onto the same chest cell.

6. Confirm ATK does not increase again.

7. Start a browser battle and confirm hero hit damage is higher than before the
   sword.

Expected result: the sword is a one-time equipment reward and browser battle
uses the higher attack value.

## R03-P03 Browser Potion In Battle

No Arduino test is needed for this browser-only step.

Open `index.html`.

1. Move to `A.01` and step onto one potion chest.

2. Confirm the Minimal RPG summary shows the potion count increased.

3. Start a browser battle.

4. Let the hero take some damage.

5. On the hero's turn, choose `ITEM`.

6. Confirm the item menu shows `POT1`, `POT2`, or another `POT` count.

7. Select the potion, choose the damaged hero, and confirm.

8. Confirm the potion can restore up to 10 HP, but does not go above max HP.
   The number shown during the heal should match the actual HP gained.

9. Confirm the potion count decreases by 1.

10. When potion count is zero, choose `ITEM` again and confirm it shows
    `NO POT` and cannot use a potion.

Expected result: potions are usable in browser battle, spend one owned potion,
and heal the selected living party member.

## R03-P04 Browser Potion Outside Battle

No Arduino test is needed for this browser-only step.

Open `index.html`.

1. Move to `A.01` and open one potion chest.

2. Confirm the Minimal RPG summary says you own at least one potion.

3. Make the hero lose HP. One simple way is to start a browser battle, let the
   hero take damage, and then win.

4. In the Browser Movement Test, click `Item`.

5. Confirm the display changes to an item view, for example `POT1 HP 20/30`.

6. While that item view is open, click an arrow button.

7. Confirm the player does not move.

8. Click `Use`.

9. Confirm HP increases by 10, without going above max HP.

10. Confirm the potion count decreases by 1 in the summary.

11. Click `Item` again to close the item view if it is still open.

12. If HP is full, open `Item` and click `Use`. Confirm no potion is spent.

13. When you have zero potions, open `Item` and confirm the display says
    `NO POT`.

Expected result: outside-battle potion use heals the damaged hero, spends one
potion, and locks movement while the item view is open.

## R04-P01 Browser Final Boss Battle

No Arduino test is needed for this browser-only step.

Open `index.html`.

1. Stay in section 1 and start a browser battle.

2. Confirm the foe is the normal section-1 enemy, usually `Gob`.

3. End or reset that battle.

4. Get into section 2. The quickest test path is to set `Has ancient key` to
   `Yes`, then walk through the gate.

5. Start or trigger a browser battle in section 2.

6. Confirm the status says `Boss battle: Boss.`.

7. Confirm the foe name/HP looks different from the section-1 enemy.

Expected result: section 2 clearly starts the final boss battle, but boss
victory still behaves like a normal victory until the next step.

## Battle Menu Cancel Fix

No Arduino test is needed for this browser-only fix.

Open `index.html`.

1. Start a browser battle with zero potions.

2. On a hero turn, choose `ITEM`.

3. Confirm the display shows `NO POT`.

4. Press `Confirm`.

5. Confirm the status says there are no potions and suggests `Esc / No`.

6. Click `Esc / No`.

7. Confirm you return to the main battle menu and can choose `HIT`.

8. Repeat step 2 and press the keyboard `Escape` key.

9. Confirm it also returns to the main battle menu.

Expected result: `NO POT` never traps the player in the item menu, and no turn
is spent by backing out.

## R04-P02 Browser Ending Text

No Arduino test is needed for this browser-only step.

Open `index.html`.

1. Get access to section 2. The quickest test path is to set `Has ancient key`
   to `Yes`.

2. Move through the gate into section 2.

3. Start or trigger the boss battle.

4. Win the battle.

5. Confirm the ending text appears:
   `You have saved the world, Thank you.`

6. Confirm the Minimal RPG summary shows boss flag `true`.

7. Save Project JSON.

8. Reload that saved JSON.

9. Confirm boss flag is still `true`.

10. Optional quick regression: start a section-1 battle and confirm normal
    victory/XP behavior still appears there.

Expected result: boss victory shows the ending text and stores the
boss-defeated flag in Project JSON.

## R04-P03 Post-Boss Behavior

No Arduino test is needed for this browser-only step.

Open `index.html`.

1. Set `Has ancient key` to `Yes`, or open the key chest normally.

2. Move through the gate into section 2.

3. Start or trigger the boss battle.

4. Win the boss battle.

5. Confirm the ending text appears:
   `You have saved the world, Thank you.`

6. Confirm the Minimal RPG summary shows boss flag `true`.

7. Set `Trigger battles` to `Yes`.

8. Walk around in section 2 for many steps.

9. Confirm the boss battle does not start again.

10. Confirm movement still works normally.

Expected result: defeating the boss finishes that encounter for this saved
project state. Section 2 remains playable, but the final boss does not keep
re-triggering after the `bossDefeated` flag is true.

## R04-P03 Boss Action Regression

No Arduino test is needed for this browser-only fix.

Open `index.html`.

1. Set `Has ancient key` to `Yes`.

2. Move into section 2 and start the boss battle.

3. Do not rush to kill the boss. Take one or two normal hero turns, then wait
   during the timer-dot charging phase.

4. Confirm the boss gets its own turn and attacks a living hero.

Expected result: the boss uses its fixed swiftness value and eventually acts in
the battle instead of silently doing nothing.

## R05-P01 Browser Save-State Expansion

No Arduino test is needed for this browser-only step.

Open `index.html`.

1. Move to a chest and open it.

2. Check the Minimal RPG summary. Notice at least one changed value, such as
   opened chests, Gold, potion count, key flag, or sword state.

3. Save to Browser Save Slot 1.

4. Change the game state after saving. Good simple choices are:
   open another chest, use a potion, move to another room, or win a battle.

5. Load Browser Save Slot 1.

6. Confirm the player position returns to the saved place.

7. Confirm the Minimal RPG summary returns to the saved values from step 2.

8. If you saved after gaining XP or taking damage, confirm level/XP/HP also
   return to the saved values.

Expected result: browser save slots restore the saved RPG progress, not only
the room position.

## R05-P01 Level-Up HP Battle Sync

No Arduino test is needed for this browser-only fix.

Open `index.html`.

1. Win enough battles to level up.

2. Confirm the Minimal RPG summary shows the new max HP, for example `35`.

3. Start another battle.

4. Confirm the battle HP uses the same max HP, for example `35/35` or the
   correct current HP out of `35`.

5. Confirm the Minimal RPG summary still says Level 2 after the battle starts.

Expected result: level-up max HP in the summary and battle display match.

## R05-P02 EEPROM Save Contract And Estimate

No Arduino upload is needed for this contract/preflight step.

Open `index.html`.

1. Find **Hardware Preflight** near the top of the page.

2. Confirm **EEPROM** shows `67 / 1024 bytes`.

3. Confirm **Save model** says:
   `3 slots, 17 bytes/slot, 67 EEPROM bytes`.

4. Open `projectModelTests.html`.

5. Confirm all tests pass.

Expected result: the save model has an exact, tiny EEPROM estimate. Arduino
EEPROM read/write is still a later step.

## R06-P01 Arduino Gate And Chest Test

This is a hardware test. It does not include battle.

Open `index.html`.

1. Select **Export Gate And Chest Test .ino**.

2. Open the newest exported sketch folder:
   `Arduino_Tests/SevenSeg_Gate_Chest_Test_...`

3. Compile and upload the sketch to the Arduino Nano.

4. At startup, the display shows `GATE CHEST TEST`. Press D5 or D4 once to
   continue.

5. Look at room A. Confirm you can see:
   - `8` on the right side top and bottom as walls
   - `1` on the right side middle as the gate
   - `C` cells as unopened chests

6. Move to the `1` gate before finding the key. Confirm the display says the
   gate is locked and the player does not enter the second room.

7. Move onto each `C` chest. After each chest:
   - a message appears
   - the message stays until D5 or D4 is pressed
   - that chest disappears from the map

8. Find the key chest.

9. Move to the `1` gate again. Confirm the player enters the second room.

10. Hold D5 or D4 for more than 500 ms. Confirm movement repeats slowly, about
    once every 200 ms.

11. Turn the A0 BrightnessPot. Confirm display brightness changes.

Expected result: walls, locked gate, key, gold, sword, potion, chest-open state,
and hold-repeat movement all work on hardware.

## R06-P02 Arduino Reward And Level Test

This is a hardware test. It does not include battle, world movement, Serial, or
EEPROM.

Open `index.html`.

1. Select **Export Reward And Level Test .ino**.

2. Open the newest exported sketch folder:
   `Arduino_Tests/SevenSeg_Reward_Level_Test_...`

3. Compile and upload the sketch to the Arduino Nano.

4. At startup, the display shows `REWARD LEVEL TEST`. Press D5 or D4 once to
   continue.

5. Confirm the display shows:
   `L1 XP00 HP30 A06 P0`

6. Press D5 once. The display shows an XP message. Press D5 or D4 to continue.
   Confirm the display shows:
   `L1 XP10 HP30 A06 P0`

7. Press D5 again. The display shows a level-up message. Press D5 or D4 to
   continue. Confirm the display shows:
   `L2 XP00 HP35 A06 P0`

8. Press D5 again. The display shows a sword message. Press D5 or D4 to
   continue. Confirm the display shows:
   `L2 XP00 HP35 A10 P0`

9. Press D5 again. The display shows a potion message. Press D5 or D4 to
   continue. Confirm the display shows:
   `L2 XP00 HP35 A10 P1`

10. Press D5 again. The display shows a damage message. Press D5 or D4 to
    continue. Confirm the display shows:
    `L2 XP00 HP25 A10 P1`

11. Press D5 again. The display shows a potion-use message. Press D5 or D4 to
    continue. Confirm the display shows:
    `L2 XP00 HP35 A10 P0`

12. Press D4. The startup message appears again. Press D5 or D4 to continue.
    Confirm the display resets to:
    `L1 XP00 HP30 A06 P0`

13. Turn the A0 BrightnessPot. Confirm display brightness changes.

Expected result: XP, level-up HP, sword attack bonus, potion gain, potion use,
and reset all work on hardware.

## R06-P03 Arduino Boss Ending Test

This is a hardware test. It does not include the full battle system, world
movement, Serial, or EEPROM.

Open `index.html`.

1. Select **Export Boss Ending Test .ino**.

2. Open the newest exported sketch folder:
   `Arduino_Tests/SevenSeg_Boss_Ending_Test_...`

3. Compile and upload the sketch to the Arduino Nano.

4. At startup, the display shows `BOSS ENDING TEST`. Press D5 or D4 once to
   continue.

5. Confirm the display shows:
   `BOSS HP20 FLAG0`

6. Press D5 once. The display shows a hit message. Press D5 or D4 to continue.
   Confirm the display shows:
   `BOSS HP10 FLAG0`

7. Press D5 again. Confirm `BOSS DEFEATED` blinks.

8. Confirm the ending text appears:
   `YOU HAVE SAVED THE WORLD THANK YOU`

9. Press D5 or D4 through the ending text pages.

10. Confirm the final display shows:
    `END FLAG1`

11. Press D4. The startup message appears again. Press D5 or D4 to continue.
    Confirm the display resets to:
    `BOSS HP20 FLAG0`

12. Turn the A0 BrightnessPot. Confirm display brightness changes.

Expected result: final boss defeated state and ending text work on hardware.

## R07-P01 Combined Export Data Packing

This is a browser/export inspection test. It does not require uploading to
Arduino yet.

Open `index.html`.

1. Find **Hardware Preflight**.

2. Confirm these rows do not say `Unknown`:
   - Text
   - Interactions/events
   - Heroes
   - Enemies
   - Encounters
   - Items/equipment
   - Battle rules

3. In **Warnings and blockers**, confirm there is no blocker saying:
   `The required victory event cannot be reached from an event entry point.`

4. Select **Export Combined Game .ino**.

5. Open the newest exported folder:
   `Arduino_Tests/SevenSeg_Combined_Game_Test_...`

6. Open the `.ino` file in that folder.

7. Search for:
   `Minimal RPG packed generated data`

8. Confirm the sketch includes these generated names:
   - `minimalTextTable`
   - `minimalChests`
   - `minimalGates`
   - `minimalEnemies`
   - `minimalEncounters`

Expected result: the combined sketch contains fixed PROGMEM data tables for the
Minimal RPG starter. Full Arduino behavior parity is tested in the next step.

## R07-P02 Combined Browser/Arduino Parity Wiring

This is an export inspection test. Full upload/playthrough is R07-P03.

Open `index.html`.

1. Select **Export Combined Game .ino**.

2. Open the newest exported folder:
   `Arduino_Tests/SevenSeg_Combined_Game_Test_...`

3. Open the `.ino` file in that folder.

4. Search for these names and confirm they exist:
   - `Minimal RPG packed generated data`
   - `minimalRoomSections`
   - `openCurrentChestIfAny`
   - `gateBetweenRooms`
   - `applyBattleVictoryRewards`
   - `MINIMAL_FLAG_BOSS_DEFEATED`

5. Search for `String ` with a space after it. Confirm it is not present in the
   generated Arduino code.

6. Optional early hardware check:
   compile the sketch in Arduino IDE, but save the full playthrough for R07-P03.

Expected result: combined Arduino export contains the same Minimal RPG state
rules as the browser starter path.

## R07-P03 Combined Hardware Acceptance

This is the full hardware gate for the current Minimal RPG.

Stop here if compile or upload fails. Copy the exact Arduino IDE error into the
chat before continuing to later milestones.

### Compile And Upload

1. Open `index.html`.

2. Select **Export Combined Game .ino**.

3. Open the newest exported folder:
   `Arduino_Tests/SevenSeg_Combined_Game_Test_...`

4. Open the `.ino` file in Arduino IDE.

5. Select the Arduino Nano board and processor option that worked for previous
   tests.

6. Compile and upload.

7. Copy these Arduino IDE lines into the chat:
   - `Sketch uses ... bytes ...`
   - `Global variables use ... bytes ...`

### Controls

- A4 pot chooses facing direction in world mode.
- D5 moves one step forward.
- D4 moves one step backward.
- In battle, A4 chooses menu/target.
- In battle, D5 confirms.
- In battle, D4 backs/rejects.
- A0 controls brightness.

### World And Chests

1. Confirm the world appears on the 8 x 3 display.

2. Move around section 1.

3. Open at least one gold chest. Confirm the `C` disappears after opening.

4. Open the potion chest. Confirm a potion message appears and the `C`
   disappears.

5. Open the sword chest. Confirm a sword/attack message appears and the `C`
   disappears.

6. Try the visible gate before the key if possible. Confirm it blocks with a
   locked-gate message.

7. Open the key chest. Confirm the ancient-key message appears.

8. Move through the gate. Confirm section 2 can now be reached.

### Battles And Rewards

1. In section 1, move until a random battle starts.

2. Confirm battle UI appears.

3. Take hero turns using `HIT`.

4. Win a normal battle. Confirm the game returns to the same world position.

5. Fight enough normal battles to level up. Watch for a level-up message.

6. If the hero has taken damage and a potion is available, open the item menu
   and use `IT1`. Confirm it heals and consumes the potion.

### Boss And Ending

1. In section 2, move until the boss battle starts.

2. Confirm the boss fights back.

3. Defeat the boss.

4. Confirm the ending text appears:
   `YOU HAVE SAVED THE WORLD THANK YOU`

5. After the ending, keep moving in section 2. Confirm the same boss does not
   immediately restart again after the boss-defeated flag is set.

Expected result: the complete Minimal RPG can be finished on the real display.
Record anything that differs from the browser behavior.

## R08-P01 Minimal Game Preset

Open `index.html`.

1. Find **Use Minimal RPG Preset** in the Minimal RPG summary near the top.

2. Click **Use Minimal RPG Preset**.

3. If a confirmation dialog appears, choose **Use preset**.

4. Confirm the Minimal RPG summary shows the starter game:
   - `1 world, 2 sections`
   - Section 1 has `Gob`
   - Section 2 has `Boss`
   - chests, key, sword, potion, and save scope are listed
   - the browser world overview covers A.00 through E.04

5. Move in the browser worldmap and confirm section 1 is larger than before
   and contains scattered `#` blockers.

6. Find the bottom-right section boundary and confirm the gate leads into the
   two-room section 2 boss area after the key is obtained.

7. Confirm **Export Combined Game .ino** is enabled.

Expected result: the approved beta starter game can be created in one visible
action and is ready to play, save, or export.

## R08-P02 Simple Main Screen

Open `index.html`.

1. Confirm **Show advanced tools** is visible in the top project command row.

2. Confirm these beta path areas are visible without opening advanced tools:
   - Minimal RPG summary
   - Hardware Preflight
   - Worldmap Test / Browser Movement Test
   - Combined Browser Test
   - **Export Combined Game .ino**

3. Click **Show advanced tools**.

4. Confirm older tools appear, such as Text Display Test, Glyph/Data Test,
   Glyph Library, Frame Library, and Battle Test.

5. Click **Hide advanced tools** and confirm those older tools are hidden again.

6. Move in the browser worldmap and confirm the starter remains playable.

Expected result: the first screen is simpler, but no old tool has been removed.

## R08-P04 Shared Browser World/Battle Display

Open `index.html`.

1. Keep advanced tools hidden.

2. Confirm the Browser Movement Test display is visible as an 8 x 3 group of
   24 seven-segment cells.

3. Set **Trigger battles** to `Yes`.

4. Move until a random battle starts.

5. Confirm the battle appears in the same Browser Movement Test display, not
   in a separate hidden area.

6. Use **Battle Up**, **Battle Down**, **Confirm**, and **Esc / No** to play.

7. Win or lose the battle.

8. Confirm the same display returns to world movement.

Expected result: simplified mode uses one visible 24 digit `7-seg + dp`
display for both exploration and battle.

## R08-P05 Browser Music Assignment And Preview

This is a browser-only test. No Arduino upload is needed.

1. Open `References/Music/8-bit JRPG Chiptune Song Machine.html`.

2. Generate one worldmap-style song and click **Export song JSON**.

3. Generate one battle-style song and click **Export song JSON**.

4. Open `index.html`.

5. In **Minimal RPG Music**, import both song JSON files.

6. Confirm the dropdowns show one assigned Worldmap song and one assigned
   Battle song.

7. Click **Enable music preview**.

8. Move around in the Browser Movement Test and confirm worldmap music plays.

9. Trigger a battle and confirm the music switches to battle music without the
   worldmap song continuing underneath.

10. Win the battle and confirm the music returns to worldmap music without the
    battle song continuing underneath.

11. Compare note lengths with the Chiptune Song Machine preview. They should
    sound broadly similar, with no very short unintended gate/silence problem.

Expected result: the browser can import, assign, preview, and switch two
Minimal RPG songs.

Historical note: the old Arduino no-audio limitation was removed by R09-P01
and R09-P02. The combined Minimal RPG export now includes music playback.

## R09-P01 Standalone Music Hardware Export

1. Open `index.html`.

2. Import two song JSON files from the Chiptune Song Machine.

3. Assign one song to Worldmap music and one song to Battle music.

4. Click **Export Music Test .ino** in the Minimal RPG Music panel.

5. Open the newest generated sketch in Arduino IDE.

6. Compile for Arduino Nano / ATmega328P.

7. Upload to the official hardware/audio wiring:
   - D3 melody.
   - D9 bass.
   - D5 next song button.
   - D4 previous song button.

8. After reset/upload, listen for the startup pin tests:
   - `D3` raw blocking pin beep.
   - `D9` raw blocking pin beep.
   - `D3` Timer1 pin beep.
   - `D9` Timer1 pin beep.

9. At the same time, confirm the 24-digit display shows:
   - `D3` during the D3 tests.
   - `D9` during the D9 tests.
   - `S1` when song 1 starts playing.

10. If the display shows `D3`, `D9`, and `S1` but there is no raw blocking
   beep or Timer1 beep,
   the sketch is running and the likely problem is the audio circuit, speaker,
   amplifier, shared ground, or wiring to D3/D9.

11. If the display also stays blank, stop and check whether the sketch really
   uploaded, the board reset, and the normal MAX7219 wiring/power is present.

12. If there is no startup beep on either pin, stop and check the speaker,
   amplifier, shared ground, and whether the audio circuit is actually
   connected to D3/D9.

13. If the startup beeps work, confirm the worldmap melody can be heard.

14. Press D5 and confirm the battle melody can be heard. The display should
   change to `S2`.

15. Press D4 and confirm the worldmap melody returns. The display should
   change to `S1`.

16. Record flash and SRAM usage.

Expected result: music playback is proven on hardware separately before audio
is added to the combined Minimal RPG export.

## R09-P02 Combined Game Music Hardware Test

Use this after the standalone Music Test sketch has produced sound on the real
hardware.

1. Open `index.html`.

2. Confirm two songs are imported in **Minimal RPG Music**.

3. Confirm one song is assigned to **Worldmap music** and one song is assigned
   to **Battle music**.

4. Click **Export Combined Game .ino**.

5. Open the newest generated `SevenSeg_Combined_Game_Test_...` sketch in
   Arduino IDE.

6. Compile for Arduino Nano / ATmega328P and record flash/SRAM usage.

7. Upload to the hardware.

8. Confirm the 8 x 3 display still shows the worldmap correctly.

9. Move around the worldmap and confirm the worldmap music plays.

10. Trigger a random battle and confirm the battle music starts.

11. Play the battle normally. Confirm display animations and D5/D4 controls
   still work.

12. Win the battle and confirm the worldmap music resumes after returning to
   the map.

Expected result: adding music does not break world movement, battle controls,
display refresh, or memory limits.

## Minimal RPG E.02 / E.03 Boundary Wall Check

Use this after exporting a fresh combined game.

1. Move to room `E.02`.

2. Confirm a visible `8` wall appears along the bottom edge of the room.

3. Try to walk down from `E.02` into `E.03`.

4. Confirm movement is blocked.

5. Use the intended locked-gate route instead:
   - find the ancient key.
   - go to the visible `1` gate.
   - pass through the gate into section 2.

Expected result: section 2 cannot be entered from `E.02`; it can only be
entered through the key gate.

## Battle Actor Prompt HP Alternation Check

1. Start a battle.

2. Wait until the hero actor is ready.

3. Confirm the right side of row 3 alternates about every 800 ms:
   - `YOU1`
   - current HP and max HP, for example `30-30`

4. Confirm both texts are right-aligned.

5. Confirm the blinking DP underline still appears under the currently shown
   prompt text.

Expected result: the player can see whose turn it is and that actor's current
HP before pressing confirm to open the menu.

## R10-P01 Final Beta Hardware Regression

Use this for the current beta candidate after exporting a fresh combined game.
Record the result in `Documentation/BETA_TEST_RECORD.md`.

### Browser Prep

1. Open `index.html`.

2. Confirm the Minimal RPG starter is loaded or create it from the preset.

3. Confirm Hardware Preflight has no blockers.

4. Confirm worldmap and battle music are assigned if this beta candidate
   includes music.

5. Save Project JSON once so the tested project can be kept with the release
   evidence.

### Export And Compile

1. Click **Export Combined Game .ino**.

2. Open the newest `SevenSeg_Combined_Game_Test_...` folder under
   `Arduino_Tests`.

3. Compile for Arduino Nano / ATmega328P.

4. Record:
   - flash bytes used and maximum,
   - global SRAM bytes used and maximum,
   - remaining SRAM.

5. If compile fails, stop and fix the compile error before doing hardware
   testing.

### Hardware Pass

1. Upload to the official 7-SegBoy hardware.

2. Confirm A0 changes display brightness.

3. Confirm A4 changes facing direction on the map and selection in battle.

4. Confirm D5 moves forward / confirms.

5. Confirm D4 moves backward / rejects.

6. Move through several rooms and confirm room transitions still animate.

7. Confirm visible blocking cells stop movement.

8. Go to `E.02`, try to walk down into `E.03`, and confirm movement is
   blocked.

9. Find the ancient key, then confirm the visible `1` gate is the intended
   route to section 2.

10. Open at least one gold chest, one potion chest, the sword chest, and the
    key chest. Confirm each `C` disappears after opening.

11. Trigger a normal battle in section 1.

12. Confirm worldmap music changes to battle music.

13. Wait for the hero turn prompt. Confirm row 3 alternates right-aligned:
    - `YOU1`
    - current/max HP, for example `30-30`

14. Win the normal battle and confirm the game returns to the same world
    position.

15. Confirm worldmap music resumes after victory.

16. Use a potion in battle if one is available. Confirm it can restore up to
    10 HP, capped at the hero's max HP, and that the number shown on the
    display matches the actual HP gained.

17. Enter section 2 through the key gate.

18. Trigger and win the boss battle.

19. Confirm the ending text appears.

20. Keep moving in section 2 and confirm the boss battle does not immediately
    restart after the boss-defeated flag is set.

Expected result: the beta candidate is hardware-playable from world start to
boss ending without compile, wiring, movement, battle, audio, or display
regressions.

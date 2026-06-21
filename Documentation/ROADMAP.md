# Beta Roadmap

The beta goal is a minimal working RPG on official 7-SegBoy hardware, not a
large RPG-maker feature collection.

The finished beta should let a non-coder create, test, export, upload, and
play one small 7-segment RPG from beginning to end.

This roadmap is based on `Documentation/RPG_DESIGN_GAP_REPORT.md` and the
approved minimal RPG target below.

## Already Done

- Hardware display model: 24 digits with decimal points as an 8 x 3 grid.
- Arduino Nano / ATmega328P export discipline using `SPI.h`.
- MAX7219 hardware tests and brightness pot rule on A0.
- Browser emulator and visual display editor.
- Glyph, frame, and animation asset basics.
- World movement, blocking, room transitions, and coordinate display.
- 26 x 32 compressed world proof that fits hardware.
- Random battle trigger toggle.
- Basic battle display and imported hero/monster stat experiments.
- Editable intro, victory, and game-over text.
- Browser project JSON save/load and recovery.
- Browser save/load for project JSON plus one Arduino EEPROM runtime-state
  save slot in the generated game.
- Hardware preflight and resource budget policy.

## Beta Design Rules

- Build one prompt-step at a time.
- Each step must feed the minimal RPG target.
- Do not add a new editor unless its data reaches browser play and Arduino
  export.
- Browser proof comes before hardware export.
- Hardware-facing work needs a small test export before combined export.
- Keep all generated code readable and compatible with ATmega328P.
- Keep advanced options out of the normal path when possible.
- JSON remains the canonical project file.
- When a feature cannot fit on Arduino Nano, reduce data before adding UI.

## Approved Minimal RPG Target

The first real beta game target is:

- One worldmap.
- Two different sections.
- Section 1 is a 5 x 5 room area with the two bottom-right rooms reserved for
  section 2.
- Section 2 is a two-room final-boss area attached at the bottom-right gate.
- One enemy kind assigned to section 1.
- One different enemy kind assigned to section 2.
- Section 2 enemy is the final boss.
- A wall between section 1 and section 2.
- A locked gate between section 1 and section 2.
- Several chests in section 1.
- Chests are scattered across section 1 instead of grouped in the first rooms.
- Section 1 contains fixed random-looking `#` blocking cells.
- About half of the chests contain `10 Gold`.
- One chest contains the gate key.
- Opening the key chest triggers this text screen:
  `You now hold the anchent key`
- One chest contains a sword that raises attack points.
- The remaining chests contain potions.
- Potion restores `+10HP`.
- Potion can be used in battle mode.
- Potion can be used from the outside-battle item menu.
- Leveling should happen approximately every 3 fights.
- Winning against the final boss triggers this text screen:
  `You have saved the world, Thank you.`
- The complete target must work in browser first.
- The complete target must then generate an Arduino combined game sketch that
  compiles, uploads, and plays on the official hardware.

## Required Subsystems

These subsystems must exist before the minimal RPG can function on Arduino.
Each one should stay as small as possible.

### World And Sections

- Store one worldmap.
- Store two section IDs.
- Assign each room or coordinate to section 1 or section 2.
- Know which section the player is currently in.
- Use the current section to choose the enemy kind.

### Walls And Locked Gate

- Store blocking wall cells or rooms.
- Store one gate position.
- Gate blocks movement while the key flag is false.
- Gate allows movement after the key flag is true.
- Gate behavior must work in browser and Arduino export.

### Chests And Loot

- Store chest positions in section 1.
- Store chest contents:
  - gold,
  - key,
  - sword,
  - potion.
- Store opened/closed chest state.
- Prevent opened chests from giving loot again.
- Show short loot text on the display.

### Story Flags

- Store at least:
  - `hasAncientKey`,
  - `gateOpened` if needed,
  - `bossDefeated`,
  - chest opened flags.
- Flags must affect world behavior, text, and save data.

### Inventory And Money

- Store current gold.
- Store potion count.
- Store whether the sword has been found or equipped.
- Keep this as fixed small data, not a general inventory system yet.

### Equipment And Stats

- Store one hero.
- Store one sword attack bonus.
- Apply sword bonus to battle attack.
- Keep the first version to one weapon slot only.

### Battle And Encounters

- Store two enemy kinds.
- Section 1 uses enemy kind 1.
- Section 2 uses final boss enemy kind 2.
- Use the existing timer/menu battle direction.
- On victory, give XP and any defined reward.
- On final boss victory, set `bossDefeated` and show the ending text.

### Leveling

- Store hero level and XP.
- Give enough XP that level-up happens approximately every 3 normal fights.
- Level-up should increase useful battle stats, at minimum max HP and attack.
- Level and XP must save/load.

### Menus

- Battle item menu must allow potion use.
- Outside-battle item menu must allow potion use.
- A simple status view should show at least level, HP, gold, and potion count.
- Menus must fit the 8 x 3 display model.

### Save State

- Save current world position.
- Save hero level, XP, current HP, and max HP if it can change.
- Save gold.
- Save potion count.
- Save sword obtained/equipped state.
- Save story flags.
- Save chest opened flags.
- Keep the format fixed and tiny for EEPROM.

### Arduino Export And Resource Budget

- Immutable world, enemy, chest, item, text, and visual data belongs in
  `PROGMEM`.
- Mutable hero state, flags, chest-opened bits, potion count, gold, and current
  position belong in fixed runtime buffers and EEPROM save slots.
- Preflight must estimate or show unknown costs before final export.
- The final combined sketch must compile for Arduino Nano / ATmega328P.

## Milestones And Prompt-Steps

### R01 - Minimal RPG Data Contract

Goal: lock the exact data shape before adding behavior.

#### R01-P01: Write Minimal RPG Contract

Task:
Update the active control documents with the data contract for the approved
minimal RPG target. Include world sections, enemies, wall, locked gate, chests,
loot, key text, sword, potion, XP/leveling, boss ending text, flags, and save
state.

Acceptance test:

- The contract clearly separates authored JSON, runtime state, EEPROM save
  state, and Arduino `PROGMEM` data.
- It names postponed systems.
- No browser or Arduino behavior changes.

#### R01-P02: Add Minimal RPG Starter Defaults

Task:
Update the default project so a new project contains the minimal RPG starter
data: two sections, two enemies, gate, wall, chests, loot table, hero, sword,
potion, XP rule, texts, and flags.

Acceptance test:

- Opening `index.html` still works.
- Project JSON save/reload preserves the starter data.
- Project tests pass.

#### R01-P03: Show Minimal RPG Summary

Task:
Add a simple summary panel showing the minimal RPG state: sections, enemies,
chests, key flag, boss flag, gold, potions, sword, level, XP, and current
section.

Acceptance test:

- Summary is readable.
- Summary updates after loading JSON.
- No Arduino export behavior changes.

### R02 - World Gate And Chest Loop

Goal: prove exploration, locked gate, and loot in browser.

#### R02-P01: Browser Two-Section World Rules

Task:
Make the browser movement test know which section the player is in and choose
the correct enemy kind from that section.

Acceptance test:

- Section 1 starts normal fights with enemy 1.
- Section 2 starts boss fights with enemy 2.
- Trigger battles off still prevents random battle starts.

#### R02-P02: Browser Wall And Locked Gate

Task:
Add the gate rule in browser movement. The gate blocks movement until
`hasAncientKey` is true.

Acceptance test:

- Gate blocks before key.
- Gate opens or allows movement after key.
- Wall remains blocking.

#### R02-P03: Browser Chests And Loot

Task:
Add chest interaction in browser movement. Chests can give 10 Gold, key,
sword, or potion.

Acceptance test:

- Opening a gold chest adds 10 Gold.
- Opening the key chest sets `hasAncientKey` and shows
  `You now hold the anchent key`.
- Opening the sword chest gives/equips the sword.
- Opening a potion chest increases potion count.
- Opened chests do not give loot again.

### R03 - Rewards, Leveling, And Inventory Use

Goal: make battle and items change player state.

#### R03-P01: Browser XP And Leveling

Task:
After battle victory, give XP. Tune normal enemy XP so the hero levels
approximately every 3 fights. Level-up increases max HP and attack.

Acceptance test:

- Winning normal fights increases XP.
- Around every 3 normal wins causes level-up.
- Level-up changes battle stats.

#### R03-P02: Browser Sword Attack Bonus

Task:
Apply the sword attack bonus once the sword has been obtained or equipped.

Acceptance test:

- Damage is lower before sword.
- Damage is higher after sword.
- Save/load keeps sword state.

#### R03-P03: Browser Potion In Battle

Task:
Let the player use potion from the battle item menu. Potion restores up to
10 HP, capped at max HP, displays the actual HP gained, and decreases potion
count.

Acceptance test:

- Potion appears in battle item menu when count is above zero.
- Using it restores up to 10 HP and displays the actual HP gained.
- Count decreases.
- It cannot be used when count is zero.

#### R03-P04: Browser Potion Outside Battle

Task:
Add the outside-battle item menu and let potion restore up to 10 HP there too.

Acceptance test:

- User can open item menu outside battle.
- Potion restores up to 10 HP without going above max HP.
- Count decreases.
- Movement is locked while menu is open.

### R04 - Boss And Ending

Goal: make the RPG finishable.

#### R04-P01: Browser Final Boss Battle

Task:
Make section 2 use the final boss enemy. The boss should be clearly identified
in the battle display or status text.

Acceptance test:

- Battles in section 2 use the boss enemy.
- Boss stats are different from section 1 enemy.

#### R04-P02: Browser Ending Text

Task:
After winning against the final boss, set `bossDefeated` and show:
`You have saved the world, Thank you.`

Acceptance test:

- Boss victory shows ending text.
- `bossDefeated` becomes true.
- Save/load preserves boss defeated state.

#### R04-P03: Post-Boss Behavior

Task:
Define and implement simple post-boss behavior. First version may stop random
battles in section 2 or show the ending text again from a status action.

Acceptance test:

- Boss does not endlessly re-trigger unless the contract says it should.
- The game remains stable after victory.

### R05 - Save State For The Minimal RPG

Goal: preserve real RPG progress, not only position.

#### R05-P01: Browser Save-State Expansion

Task:
Expand browser save slots to include position, hero stats, level, XP, gold,
potion count, sword state, key flag, boss flag, and chest opened flags.

Acceptance test:

- Gain loot and XP.
- Save.
- Change state.
- Load.
- All minimal RPG state returns.

#### R05-P02: EEPROM Save Contract And Estimate

Task:
Define the compact EEPROM save shape for the minimal RPG and update resource
preflight estimates.

Acceptance test:

- Preflight shows exact or clearly estimated EEPROM bytes.
- The three-slot save policy remains clear.

### R06 - Arduino Subsystem Tests

Goal: test hardware pieces separately before combined export.

#### R06-P01: Arduino Gate And Chest Test

Task:
Generate a small Arduino test sketch for gate, chest, key, gold, sword, and
potion state. Keep it separate from battle.

Acceptance test:

- Sketch exports to `Arduino_Tests`.
- Sketch compiles and uploads.
- Hardware shows chest/gate behavior clearly enough to verify.

#### R06-P02: Arduino Reward And Level Test

Task:
Generate a small Arduino test sketch for XP, level-up, sword attack bonus, and
potion count.

Acceptance test:

- Sketch exports to `Arduino_Tests`.
- Sketch compiles and uploads.
- Display or Serial-free hardware flow proves the state changes.

#### R06-P03: Arduino Boss Ending Test

Task:
Generate a small Arduino test sketch that shows the final boss victory path
and ending text.

Acceptance test:

- Sketch compiles and uploads.
- Ending text displays correctly.

### R07 - Combined Arduino Minimal RPG

Goal: export the whole approved minimal RPG to hardware.

#### R07-P01: Combined Export Data Packing

Task:
Pack world sections, gate, chests, enemies, rewards, texts, item data, sword
data, and flags for generated Arduino code.

Acceptance test:

- Hardware Preflight shows no silent unknowns for required minimal RPG data.
- Generated code avoids dynamic memory and Arduino `String`.

#### R07-P02: Combined Browser/Arduino Parity Check

Task:
Make sure browser rules and generated Arduino rules match for movement,
chests, key, gate, battles, rewards, leveling, potion, sword, boss, and ending.

Acceptance test:

- Same starter project behaves the same in browser and generated code.
- Any intentional difference is documented.

#### R07-P03: Combined Hardware Acceptance

Task:
Export, compile, upload, and manually play the minimal RPG path on hardware:
find key, open gate, use or collect items, level through fights, defeat boss,
see ending text.

Acceptance test:

- Generated sketch compiles for Arduino Nano.
- Sketch uploads to official hardware.
- Complete game can be finished.
- Flash/SRAM figures are recorded.

### R08 - Non-Coder Beta Flow

Goal: make the minimal RPG maker understandable.

#### R08-P01: Minimal Game Preset

Task:
Add a clear preset/reset path that creates the approved minimal RPG without
technical choices.

Acceptance test:

- User can create the minimal game in one action.
- It is immediately playable in browser.

#### R08-P02: Simple Main Screen

Task:
Hide or group advanced controls so the normal path emphasizes play, edit,
save, export, and upload.

Acceptance test:

- Main screen is easier to follow.
- Advanced tools remain available.

#### R08-P03: Quick Start And Beta Notes

Task:
Update quick start, tutorial outline, package contents, and beta release notes
so they describe the approved minimal RPG target accurately.

Acceptance test:

- A new hobby builder can follow the document from open file to upload.
- Unsupported future systems are not promised as beta features.

#### R08-P04: Shared Browser Play Display

Status: completed.

Task:
Wire the simplified Browser Movement Test so world movement and random battles
use the same visible 24 digit `7-seg + dp` display.

Acceptance result:

- The simplified mode no longer depends on the hidden advanced Battle Test
  display.
- World movement, text, transitions, and battle all draw on the same 8 x 3
  browser display.
- Battle controls are visible beside the Browser Movement Test.

#### R08-P05: Browser Music Assignment And Preview

Status: completed for browser and continued into Arduino export through R09.

Task:
Let the user generate two melodies in the Chiptune Song Machine, import them
into the main project, and assign one to worldmap mode and one to battle mode.

Acceptance result:

- Chiptune Song Machine exports song JSON.
- `index.html` imports song JSON into `project.music`.
- The Minimal RPG Music panel assigns one song to worldmap and one to battle.
- Browser preview plays worldmap music, switches to battle music, and returns
  to worldmap music after battle.
- The browser runtime preserves gate length and stops old scheduled notes when
  changing mode.

Current note:

- Browser preview is implemented here. Arduino playback is handled by R09 and
  now belongs to the combined-game hardware test path.

### R09 - Minimal RPG Audio Hardware Path

Goal: make authored music reach Arduino safely, one hardware step at a time.

#### R09-P01: Standalone Music Hardware Export

Status: passed on hardware after rewiring the physical audio output.

Task:
Export a separate Arduino music test from the two assigned Minimal RPG songs.

Rules:

- Do not add music to the combined game yet.
- Use D3 for melody and D9 for bass.
- Store note/duration data in PROGMEM.
- Use non-blocking playback timing.
- Avoid Arduino `String` and dynamic memory.
- Let the user switch between worldmap and battle songs if both exist.

Acceptance test:

- Generated sketch compiles for Arduino Nano.
- Sketch uploads to official hardware/audio wiring.
- Worldmap and battle melodies are both audible and selectable.
- Flash/SRAM figures are recorded.

#### R09-P02: Combined Game Audio Integration

Status: implemented and hardware-playable. Keep testing for regressions during
the final beta pass.

Task:
After R09-P01 passes, add the proven audio runtime to the combined Minimal RPG
export.

Acceptance test:

- Worldmap music plays during movement.
- Battle music starts when battle starts.
- Worldmap music resumes after battle victory.
- Audio does not break display refresh, movement controls, battle controls, or
  memory limits.

### R10 - Final Beta Fix Pass

Goal: stop adding systems and make the current minimal RPG reliable enough to
share.

#### R10-P01: Compile And Hardware Regression Pass

Task:
Export a fresh combined game and run one full hardware pass after the latest
small fixes.

Acceptance test:

- Sketch compiles on Arduino Nano / ATmega328P.
- Flash/SRAM figures are recorded.
- World movement, walls, key gate, chests, battles, boss ending, and music all
  still work.
- Actor turn prompt alternates right-aligned `YOU1` and `HP-MAX`.
- `E.02` cannot enter `E.03`; section 2 is reached only through the key gate.

#### R10-P02: Public-Beta Scope Lock

Task:
Write the final beta feature list and known limitations in the release docs.

Acceptance test:

- The public beta says exactly what works.
- The public beta says exactly what is not supported yet.
- No document still claims combined Arduino audio is missing.

Status: complete. See `Documentation/BETA_SCOPE.md`.

#### R10-P03: Clean Public Package

Task:
Create a clean shareable beta folder from the approved package contents list.

Acceptance test:

- Development backups, old/trash files, generated Arduino test history, and
  private notes are not included in the clean public copy.
- The public copy opens `index.html` directly and exports a combined game.
- Required reference tools and docs are included.

Status: complete. Clean package created at:
`C:\Users\ake_s\Documents\MAKE_a_Game__maker\7-SegBoy_Maker_BETA_public_20260621`.

### R11 - Public Release On GitHub And GitLab

Goal: publish the beta in two public mirrors without changing the hobby-sized
tool itself.

#### R11-P01: Repository Readiness

Task:
Prepare the public repository metadata.

Acceptance test:

- `README.md` explains what 7-SegBoy Maker is, what hardware it targets, and
  how to open the tool.
- `LICENSE.md` is AGPL-3.0-only.
- A short `CHANGELOG.md` or release note describes the first beta.
- `.gitignore` excludes generated Arduino exports, browser recovery files,
  backups, private notes, and local saved test JSON unless intentionally shared.

Status: complete. Public README, changelog, gitignore, package list, and
repository metadata draft are ready.

#### R11-P02: GitHub Public Beta

Task:
Publish the clean beta to GitHub.

Acceptance test:

- GitHub repository is public.
- Repository description and topics mention Arduino Nano, MAX7219,
  seven-segment display, and RPG maker.
- A beta release/tag is created with the tested public package.
- README links to wiring, tutorials, and beta limitations.

Status: complete. Published at:
`https://github.com/NerdingAndHoarding/7-SegBoy-Maker`

Release:
`https://github.com/NerdingAndHoarding/7-SegBoy-Maker/releases/tag/v0.1.0-beta`

#### R11-P03: GitLab Public Mirror

Task:
Publish the same clean beta to GitLab.

Acceptance test:

- GitLab repository is public or clearly marked as the official mirror.
- GitLab README matches GitHub.
- GitLab tag/release matches the GitHub beta tag.
- The two repositories point to each other.

### R12 - Tutorial Generation

Goal: make the beta understandable to a new hobby builder.

#### R12-P01: Tutorial Scripts

Task:
Turn the tutorial outline into short scripts or shot lists.

Acceptance test:

- Each tutorial has a simple goal, required files, steps, and expected result.
- The tutorials avoid future features that are not in the beta.

#### R12-P02: Tutorial Assets

Task:
Prepare screenshots, wiring photos/diagrams, and example JSON/song files.

Acceptance test:

- A new user can follow the tutorial without needing this development chat.
- Hardware wiring images match the one official wiring only.

#### R12-P03: Publish Tutorials

Task:
Publish tutorial videos or written tutorials and link them from GitHub/GitLab.

Acceptance test:

- README links to the tutorials.
- Tutorial links are also listed in the beta release notes.
- Tutorial files are static and do not require an account or install step to
  read.

## Post-Beta Expansion Backlog

These are important, but they should wait until the minimal RPG works on
hardware:

- Full object designer with batch material/kind/attribute generation.
- Full hero and monster editors inside the main app.
- Multiple party members.
- Multiple normal enemy types per section.
- Multiple spells and ability learning.
- More encounter tables.
- Story graph editor.
- NPC/talk editor.
- More treasure and event-object types.
- Shops and economy balancing.
- Full music/SFX editor. The beta has simple imported music assignment and
  Arduino playback, but not a full built-in audio editor.
- More animation-trigger matching.
- Larger save-state model with more flags and inventory.
- More battle formulas exposed to users.

## Current Next Step

Continue with `R10-P03: Clean Public Package`.

The project is now hardware-playable. The remaining beta work is mostly:

- clean the package,
- publish GitHub and GitLab mirrors,
- generate tutorials.

# RPG Design Gap Report

This report compares a normal RPG videogame design against the current
7-SegBoy Maker beta project. It is written from a game-design point of view,
not only from a programming point of view.

## Short Verdict

The project has made unusually strong progress on the special hardware
problem: drawing to a 24 digit 7-segment display, moving through an 8 x 3
world room model, compressing a large map, exporting Arduino sketches, and
keeping memory use visible.

It is not yet close to a full RPG maker. It is closer to a strong proof of
concept for:

- world movement,
- basic random battles,
- a visual 7-segment editor,
- project JSON save/load,
- Arduino export discipline,
- and hardware memory budgeting.

The largest missing layer is not another display feature. The missing layer is
the game-design content system: objects, character growth, battle rewards,
story events, menus, audio triggers, and clear rules for how these systems
connect.

## What RPG Videogames Usually Contain

### 1. Core Game Loop

A normal RPG has a repeated loop:

1. Explore.
2. Discover events, enemies, items, or story.
3. Fight or solve a problem.
4. Gain rewards.
5. Improve party, inventory, or story state.
6. Unlock new areas or choices.

Current project status:

- Exploration exists in browser and hardware tests.
- Random battle entry exists.
- Battle victory and defeat exist at a simple level.
- Rewards, progression, story state, and unlocks are not yet a working loop.

Critical point:

The project can move and fight, but it cannot yet make the player feel that
anything has changed because of play.

### 2. World And Level Design

RPG worlds usually contain:

- maps,
- rooms or areas,
- blocking tiles,
- transitions,
- area types,
- encounters,
- save points,
- event points,
- treasure,
- NPCs,
- story gates,
- and player start/respawn rules.

Current project status:

- Strong 26 x 32 world concept.
- 8 x 3 room display model is defined and hardware-tested.
- Blocking glyphs work.
- Room transitions exist.
- Area types exist: worldmap, town, dungeon.
- Save-point room property exists.
- Random battle toggle exists.
- Coordinate display and transition animations exist.

Missing or weak:

- No real treasure/event/object placement system.
- No NPC/talk system.
- No story gates.
- No authored encounter placement beyond simple current test behavior.
- No full room-event scripting.

Critical point:

The world editor is probably the most mature RPG subsystem, but it still
behaves more like a movement/map test than a playable adventure editor.

### 3. Battle System

RPG battles usually contain:

- actors with stats,
- targeting,
- turn or timer logic,
- commands,
- attacks,
- magic,
- items,
- enemy AI,
- damage formulas,
- status effects,
- death/defeat behavior,
- rewards,
- animations,
- and balance tuning.

Current project status:

- Basic party and foe battle display exists.
- Timer/swiftness concept exists.
- Hit/heal/magic/item menu direction exists.
- Hero and monster JSON import has begun.
- Canonical stats and multiple calculation-method ideas have been introduced.
- Battle animations are being designed around hero/monster/action overlays.
- Defeated foes blink and disappear in the simulation concept.

Missing or weak:

- Enemy AI is still tiny.
- Rewards are not a real system.
- Items and magic are not complete game systems.
- Status effects are not present.
- Equipment effects are not integrated end-to-end.
- Balance tooling is not yet mature.
- Arduino battle export may lag behind browser simulation features.

Critical point:

Battle is visually promising, but mechanically fragile. The next danger is
adding many commands before the smallest complete combat loop is locked:
choose action, resolve formula, animate, update HP, give reward, return to
world.

### 4. Character Development

RPGs usually need:

- level,
- experience points,
- HP/MP growth,
- stat growth,
- equipment slots,
- abilities learned,
- party membership,
- dead/revived state,
- and save/load of character progress.

Current project status:

- Hero stats exist or are being normalized.
- Party members exist in battle tests.
- Dead party member targeting exception has been discussed for Phoenix Down
  and Life.

Missing or weak:

- No complete XP economy.
- No level-up rules.
- No stat growth curves.
- No learned skills.
- No persistent party state in save data.
- No equipment-to-stat pipeline.

Critical point:

This is one of the biggest gaps. Without character development, the project is
more like a battle/map toy than an RPG maker.

### 5. Items, Equipment, And Economy

RPG item systems usually contain:

- consumables,
- weapons,
- armor,
- key items,
- event objects,
- shops or rewards,
- prices,
- drops,
- inventory limits,
- equipment slots,
- and effects in battle or world.

Current project status:

- Object design ideas exist.
- Object compression research exists.
- A standalone object-design tool was requested.
- Equipment and battle-animation trigger policy has begun.
- Schema contains items/equipment/spells/abilities as root areas.

Missing or weak:

- No integrated object editor in the main tool.
- No inventory model.
- No drop/reward model.
- No shop or money loop.
- No equipment slot rules.
- No Arduino export for inventory/equipment.

Critical point:

Items and equipment should not be built as decoration. They must connect to
stats, battle formulas, rewards, save data, and animation triggers.

### 6. Story, Events, And Quest Logic

RPGs usually contain:

- text messages,
- flags,
- conditions,
- event triggers,
- cutscenes or short scenes,
- NPC dialogue,
- quest progress,
- locked/unlocked areas,
- and endings.

Current project status:

- Intro, victory, and game-over text are editable.
- Schema has `texts` and `eventGraph`.
- The need for an overall story design tool has been identified.

Missing or weak:

- No real event graph editor.
- No flag system.
- No conditional dialogue.
- No quest-state model.
- No map-trigger object system.
- No story-to-world integration.

Critical point:

The project has text labels, but not yet story design. This should be kept
small: start with flags, text nodes, and simple triggers before any complex
quest editor.

### 7. Menu System

RPGs usually need menus for:

- status,
- items,
- magic,
- equipment,
- save,
- settings,
- party,
- and battle commands.

Current project status:

- Battle menus exist in early form.
- Text menus can scroll.
- Hardware menu input uses A4 pot and buttons.

Missing or weak:

- No global menu design tool.
- No inventory menu.
- No equipment menu.
- No status menu.
- No menu layout policy for the 8 x 3 display beyond individual tests.

Critical point:

Because the display is tiny, menu design is not a small detail. It is a core
RPG subsystem. A bad menu system will make all later content feel impossible
to use.

### 8. Audio

RPGs usually contain:

- background music,
- battle music,
- victory/defeat jingles,
- sound effects,
- area-based music triggers,
- battle-action sound triggers,
- and audio memory budgeting.

Current project status:

- D3 and D9 are reserved for melody and bass.
- Audio preflight policy exists.
- Music/SFX schema areas exist.
- Imported worldmap and battle music can be assigned in the browser and are
  exported to the combined Arduino game for D3 melody and D9 bass output.

Missing or weak:

- No SFX editor.
- No separate SFX trigger editor.
- No full music composition workflow inside the main tool.
- Audio is intentionally limited to the beta worldmap/battle music path.

Critical point:

Audio must remain small and hardware-tested because timer and flash budget are
high-risk on ATmega328P.

### 9. Save And Persistence

RPGs usually save:

- position,
- party state,
- HP/MP,
- level/XP,
- inventory,
- equipment,
- money,
- flags,
- defeated bosses,
- opened chests,
- and play time.

Current project status:

- Browser project JSON save/load exists.
- Browser recovery exists.
- The generated Arduino game has one manual EEPROM runtime-state slot opened
  from the D4+D5 world-map system menu.
- Save points exist for dungeon policy.
- EEPROM budget policy exists.

Missing or weak:

- Multiple Arduino save slots are not part of the first beta.
- Full browser-style project save/load is not stored in Arduino EEPROM.
- Inventory and equipment state are minimal: potions, gold, sword/key flags,
  opened chests, level/XP/HP/attack, and boss flag.

Critical point:

The beta save system is useful for the minimal RPG but deliberately tiny. It
should be described as a compact runtime save, not a full RPG save framework.

### 10. Content Authoring Tools

An RPG maker needs editors for:

- maps,
- characters,
- enemies,
- objects,
- battle formulas,
- animations,
- dialogue,
- events,
- menus,
- audio,
- and export settings.

Current project status:

- Main index tool exists.
- World editor exists.
- Visual asset tools exist.
- Hero and monster design tools exist in references.
- Battle animation tool exists as a reference/original tool.
- RPG backend constructor exists as a separate tool.
- Object design tool exists as standalone.

Missing or weak:

- Tools are not yet one coherent workflow.
- Several tools live as references rather than canonical project editors.
- The project risks tool sprawl.
- The user experience may be too complex for the original hobby-sized goal.

Critical point:

The project should not add every editor at once. It needs one narrow vertical
slice: create tiny game -> export -> upload -> play -> save -> win.

## Critical Comparison Table

| RPG subsystem | Current maturity | Main risk |
| --- | --- | --- |
| Hardware display/export | Strong | Later systems may exceed flash/SRAM |
| World movement | Strong proof of concept | Events and objects are missing |
| World editor | Medium/strong | Complexity can confuse non-coders |
| Visual glyph/frame tools | Medium/strong | Tool fragmentation |
| Battle display | Medium | Browser and hardware may diverge |
| Battle mechanics | Early/medium | Too many formulas before one full loop |
| Character progression | Early | No XP/level/save integration |
| Items/equipment | Early | Not connected to battle/save/export |
| Story/events | Early | Text exists, event logic does not |
| Menu system | Early | Tiny display makes this central |
| Audio | Planned only | Timer/memory risk on Nano |
| Save game | Early/medium | Position-only, not RPG-state save |
| Documentation/release | Medium | More useful than the game may be complete |

## Biggest Design Risks

### Risk 1: The Project Becomes A Tool Collection Instead Of A Game Maker

There are now separate ideas/tools for world maps, animation, heroes,
monsters, objects, backend calculations, battle animations, audio, and story.
That is normal for a mature RPG maker, but dangerous for this project.

Recommendation:

Every new tool must prove how its data reaches the combined browser game and
the Arduino export. If it cannot reach gameplay, keep it as reference only.

### Risk 2: The Beta Definition Is Too Large

A full RPG contains many systems. A beta for this hardware should not mean
"complete RPG maker." It should mean "smallest complete RPG loop on real
hardware."

Recommendation:

Define beta as:

- one small world,
- one hero,
- one enemy,
- one item or reward type,
- one battle formula,
- one victory condition,
- JSON project save/load,
- Arduino export that compiles and uploads.

Then expand.

### Risk 3: Browser Features Run Ahead Of Hardware

The browser can easily simulate more than the Nano can store or run. The
project already solved some memory problems, but future content systems will
increase pressure quickly.

Recommendation:

Every major RPG subsystem needs an Arduino byte estimate from the beginning:
items, equipment, text, events, audio, animations, and saves.

### Risk 4: The User Interface Becomes Too Hard For Non-Coders

The original goal is visual and hobby-sized. The current documents and tools
are already heavy. If users must understand schema versions, compression
modes, event graphs, and resource categories before making a game, the tool
will fail its audience.

Recommendation:

Hide advanced controls behind simple presets:

- Tiny Game
- Small Game
- Hardware Test
- Advanced

The default path should not ask the user to make technical decisions.

## What Is Most Missing Before A Real Beta

The project needs these missing pieces more than it needs more visual polish:

1. A smallest complete reward loop:
   win battle -> gain XP or item/money -> state is saved.

2. Character development:
   level, XP, HP growth, and one simple stat increase rule.

3. Inventory/equipment minimum:
   one consumable type, one weapon slot, one armor slot, and their stat
   effects.

4. Event/flag minimum:
   one flag, one text event, and one map condition.

5. Menu minimum:
   status, item, save, and battle command menus that work on the 8 x 3
   display model.

6. Arduino export parity:
   the browser test and generated sketch must share the same smallest complete
   game loop.

## Recommended Next Design Direction

Do not try to build a full RPG maker next. Build a "minimum complete RPG"
inside the maker.

Suggested minimum:

- 2 rooms.
- 1 hero.
- 1 enemy.
- 1 weapon.
- 1 consumable healing item.
- 1 story flag.
- 1 text event.
- 1 battle reward.
- 1 save slot test.
- 1 Arduino export.

This will reveal the real system connections:

- world -> event,
- world -> battle,
- battle -> reward,
- reward -> inventory/XP,
- inventory/equipment -> battle stats,
- story flag -> world/text,
- save -> persistent state,
- export -> hardware.

Once that loop works, adding more enemies, objects, spells, music, and story
will be expansion work instead of guessing.

## Final Judgment

From a design point of view, the project is impressive but unbalanced.

It is advanced in the hardware/display/export foundation and still young in
actual RPG systems. That is not a failure. For this unusual hardware, solving
the display and memory foundation first was probably necessary.

But from now on, progress should be judged by playable RPG loops, not by the
number of editors. A new editor is only valuable when it feeds a tested
browser loop and a tested Arduino export.

The next good milestone is not "more RPG maker features." The next good
milestone is "one tiny RPG that can be authored, exported, uploaded, played,
won, and saved."

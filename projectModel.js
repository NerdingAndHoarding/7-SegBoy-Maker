(function () {
  "use strict";

  var DISPLAY_COLS = 8;
  var DISPLAY_ROWS = 3;
  var DISPLAY_CELLS = 24;
  var ROOM_X_COUNT = 26;
  var ROOM_Y_MIN = 0;
  var ROOM_Y_MAX = 31;
  var TEXT_ERROR_1_TO_24 = "Please write 1-24 letters";
  var TEXT_GLYPH_CHARACTERS = " 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-_.+#";
  var DEFAULT_TEXT_GLYPH_BYTES = {
    " ": 0x00,
    "0": 0x7E,
    "1": 0x30,
    "2": 0x6D,
    "3": 0x79,
    "4": 0x33,
    "5": 0x5B,
    "6": 0x5F,
    "7": 0x70,
    "8": 0x7F,
    "9": 0x7B,
    "A": 0x77,
    "B": 0x1F,
    "C": 0x4E,
    "D": 0x3D,
    "E": 0x4F,
    "F": 0x47,
    "G": 0x5E,
    "H": 0x37,
    "I": 0x30,
    "J": 0x3C,
    "K": 0x57,
    "L": 0x0E,
    "M": 0x55,
    "N": 0x15,
    "O": 0x7E,
    "P": 0x67,
    "Q": 0x73,
    "R": 0x05,
    "S": 0x5B,
    "T": 0x0F,
    "U": 0x3E,
    "V": 0x23,
    "W": 0x2B,
    "X": 0x14,
    "Y": 0x3B,
    "Z": 0x6C,
    "-": 0x01,
    "_": 0x08,
    ".": 0x80,
    "+": 0x07,
    "#": 0x7F
  };

  function cellIndex(x, y) {
    return y * DISPLAY_COLS + x;
  }

  function xyFromIndex(index) {
    return {
      x: index % DISPLAY_COLS,
      y: Math.floor(index / DISPLAY_COLS)
    };
  }

  function trimTo24(text) {
    return String(text || "").slice(0, DISPLAY_CELLS);
  }

  function padFrame24(text) {
    return String(text || "").padEnd(DISPLAY_CELLS, " ").slice(0, DISPLAY_CELLS);
  }

  function validateText1to24(text) {
    var value = String(text || "");

    if (value.length === 0) {
      return {
        ok: false,
        error: TEXT_ERROR_1_TO_24,
        value: value
      };
    }

    return {
      ok: true,
      error: "",
      value: trimTo24(value)
    };
  }

  function normalizeFrame24(text) {
    return padFrame24(trimTo24(text));
  }

  function clampNumber(value, min, max, fallback) {
    var number = Number(value);

    if (!isFinite(number)) {
      number = fallback;
    }

    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function defaultTextGlyphs() {
    return Object.assign({}, DEFAULT_TEXT_GLYPH_BYTES);
  }

  function normalizeTextGlyphs(project) {
    var settings;
    var source;
    var glyphs = defaultTextGlyphs();

    if (!project || typeof project !== "object") {
      return glyphs;
    }
    if (!project.settings || typeof project.settings !== "object" || Array.isArray(project.settings)) {
      project.settings = {};
    }
    settings = project.settings;
    source = settings.textGlyphs && typeof settings.textGlyphs === "object" && !Array.isArray(settings.textGlyphs) ?
      settings.textGlyphs :
      {};

    TEXT_GLYPH_CHARACTERS.split("").forEach(function (character) {
      var key = character.toUpperCase();
      var value = Number(source[key]);

      if (Number.isFinite(value)) {
        glyphs[key] = Math.max(0, Math.min(255, Math.round(value)));
      }
    });

    settings.textGlyphs = glyphs;
    return glyphs;
  }

  function textGlyphByte(project, character) {
    var key = String(character || " ").charAt(0).toUpperCase();
    var glyphs = normalizeTextGlyphs(project);

    return Object.prototype.hasOwnProperty.call(glyphs, key) ? glyphs[key] : 0;
  }

  function setTextGlyphByte(project, character, value) {
    var key = String(character || " ").charAt(0).toUpperCase();
    var glyphs = normalizeTextGlyphs(project);

    if (TEXT_GLYPH_CHARACTERS.indexOf(key) === -1) {
      return false;
    }

    glyphs[key] = Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
    project.settings.textGlyphs = glyphs;
    return true;
  }

  function normalizeHardwareSettings(project) {
    var hardware = project && project.hardware ? project.hardware : {};
    var showCoordinates = hardware.showCoordinates;
    var triggerBattles = hardware.triggerBattles;

    if (showCoordinates === "no" || showCoordinates === 0) {
      showCoordinates = false;
    }
    if (triggerBattles === "yes" || triggerBattles === 1) {
      triggerBattles = true;
    } else if (triggerBattles === "no" || triggerBattles === 0) {
      triggerBattles = false;
    }

    return {
      transitionAnimationMs: clampNumber(hardware.transitionAnimationMs, 0, 2000, 500),
      showCoordinates: showCoordinates !== false,
      coordinateTimeMs: clampNumber(hardware.coordinateTimeMs, 1, 2000, 1000),
      triggerBattles: triggerBattles === true
    };
  }

  function roomXNumber(value) {
    if (typeof value === "string" && /^[a-z]$/i.test(value)) {
      return value.toLowerCase().charCodeAt(0) - 97;
    }

    return Number(value);
  }

  function cleanLoadedFrame(value, warnings, roomLabelText) {
    var source = typeof value === "string" ? value : "";
    var normalized = normalizeFrame24(source);
    var cleaned = "";
    var changedChars = false;

    if (typeof value !== "string" || source.length !== DISPLAY_CELLS) {
      warnings.push(roomLabelText + " frame was repaired to 24 cells.");
    }

    for (var index = 0; index < DISPLAY_CELLS; index += 1) {
      var c = normalized.charAt(index);

      if (c === " " || c === "." || c === "#" || c === "8" || c === "1") {
        cleaned += c;
      } else {
        cleaned += " ";
        changedChars = true;
      }
    }

    if (changedChars) {
      warnings.push(roomLabelText + " contained unsupported map characters; they were changed to spaces.");
    }

    return cleaned;
  }

  function firstOpenCell(room) {
    for (var index = 0; index < DISPLAY_CELLS; index += 1) {
      if (room.frame.charAt(index) !== "#" && room.frame.charAt(index) !== "8") {
        return xyFromIndex(index);
      }
    }

    room.frame = " " + room.frame.slice(1);
    return { x: 0, y: 0 };
  }

  function validateProjectData(rawProject) {
    var warnings = [];
    var source = rawProject && typeof rawProject === "object" && !Array.isArray(rawProject) ? rawProject : {};
    var project = {
      title: typeof source.title === "string" && source.title.trim() ?
        source.title.slice(0, 100) :
        defaultProject.title,
      displayTestText: typeof source.displayTestText === "string" ?
        trimTo24(source.displayTestText) :
        defaultProject.displayTestText,
      rooms: [],
      start: {},
      battle: {},
      hardware: {}
    };
    var sourceRooms = Array.isArray(source.rooms) ? source.rooms : [];
    var usedRooms = {};

    if (!source.title || typeof source.title !== "string") {
      warnings.push("Missing project title was replaced with the default title.");
    }

    if (typeof source.displayTestText !== "string") {
      warnings.push("Missing text-test data was replaced with the default text.");
    } else if (source.displayTestText.length > DISPLAY_CELLS) {
      warnings.push("Text-test data was cut to 24 characters.");
    }

    for (var i = 0; i < sourceRooms.length; i += 1) {
      var sourceRoom = sourceRooms[i];

      if (!sourceRoom || typeof sourceRoom !== "object") {
        warnings.push("An invalid room entry was skipped.");
        continue;
      }

      var rawX = roomXNumber(sourceRoom.x);
      var rawY = Number(sourceRoom.y);

      if (!isFinite(rawX) || !isFinite(rawY)) {
        warnings.push("A room with invalid coordinates was skipped.");
        continue;
      }

      var x = clampNumber(rawX, 0, ROOM_X_COUNT - 1, 0);
      var y = clampNumber(rawY, ROOM_Y_MIN, ROOM_Y_MAX, 0);
      var key = x + "," + y;

      if (x !== Math.round(rawX) || y !== Math.round(rawY)) {
        warnings.push("Room coordinates were limited to the supported map area.");
      }

      if (usedRooms[key]) {
        warnings.push("Duplicate room " + roomXLabel(x) + "," + y + " was skipped.");
        continue;
      }

      usedRooms[key] = true;
      project.rooms.push({
        x: x,
        y: y,
        frame: cleanLoadedFrame(sourceRoom.frame, warnings, "Room " + roomXLabel(x) + "," + y)
      });
    }

    if (!project.rooms.length) {
      project.rooms.push({
        x: 0,
        y: 0,
        frame: normalizeFrame24("")
      });
      warnings.push("No usable rooms were found, so an empty room a,0 was added.");
    }

    var sourceStart = source.start && typeof source.start === "object" ? source.start : {};

    if (!source.start || typeof source.start !== "object") {
      warnings.push("Missing start-position data was replaced with a safe start.");
    }

    var startRoomX = clampNumber(roomXNumber(sourceStart.roomX), 0, ROOM_X_COUNT - 1, project.rooms[0].x);
    var startRoomY = clampNumber(sourceStart.roomY, ROOM_Y_MIN, ROOM_Y_MAX, project.rooms[0].y);
    var startRoom = findRoom(project, startRoomX, startRoomY);

    if (!startRoom) {
      startRoom = project.rooms[0];
      warnings.push("The saved start room did not exist, so the first room was used.");
    }

    project.start.roomX = startRoom.x;
    project.start.roomY = startRoom.y;
    project.start.playerX = clampNumber(sourceStart.playerX, 0, DISPLAY_COLS - 1, 0);
    project.start.playerY = clampNumber(sourceStart.playerY, 0, DISPLAY_ROWS - 1, 0);

    if (startRoom.frame.charAt(cellIndex(project.start.playerX, project.start.playerY)) === "#") {
      var openCell = firstOpenCell(startRoom);
      project.start.playerX = openCell.x;
      project.start.playerY = openCell.y;
      warnings.push("The start position was on #, so it was moved to an open cell.");
    }

    var sourceBattle = source.battle && typeof source.battle === "object" ? source.battle : {};
    project.battle = {
      playerHp: clampNumber(sourceBattle.playerHp, 1, 99, defaultProject.battle.playerHp),
      beastHp: clampNumber(sourceBattle.beastHp, 1, 99, defaultProject.battle.beastHp),
      playerAttack: clampNumber(sourceBattle.playerAttack, 1, 99, defaultProject.battle.playerAttack),
      playerHeal: clampNumber(sourceBattle.playerHeal, 1, 99, defaultProject.battle.playerHeal)
    };

    if (!source.battle || typeof source.battle !== "object") {
      warnings.push("Missing battle settings were replaced with defaults.");
    } else if (
      Number(sourceBattle.playerHp) !== project.battle.playerHp ||
      Number(sourceBattle.beastHp) !== project.battle.beastHp ||
      Number(sourceBattle.playerAttack) !== project.battle.playerAttack ||
      Number(sourceBattle.playerHeal) !== project.battle.playerHeal
    ) {
      warnings.push("Battle values were limited to the supported range.");
    }

    project.hardware = normalizeHardwareSettings(source);

    if (!source.hardware || typeof source.hardware !== "object") {
      warnings.push("Missing hardware timing settings were replaced with defaults.");
    } else if (
      Number(source.hardware.transitionAnimationMs) !== project.hardware.transitionAnimationMs ||
      Number(source.hardware.coordinateTimeMs) !== project.hardware.coordinateTimeMs
    ) {
      warnings.push("Hardware timing values were limited to the supported range.");
    }

    return {
      project: project,
      warnings: warnings
    };
  }

  function roomXLabel(x) {
    var safeX = Math.max(0, Math.min(ROOM_X_COUNT - 1, Number(x) || 0));
    return String.fromCharCode(97 + safeX);
  }

  function roomKey(x, y) {
    return roomXLabel(x) + "," + String(Number(y) || 0);
  }

  function findRoom(project, x, y) {
    for (var i = 0; i < project.rooms.length; i += 1) {
      if (project.rooms[i].x === x && project.rooms[i].y === y) {
        return project.rooms[i];
      }
    }

    return null;
  }

  var PROJECT_FORMAT_V2 = "sevenseg-quest-project";
  var PROJECT_SCHEMA_VERSION_V2 = 2;
  var OFFICIAL_HARDWARE_PROFILE_ID = "sevenseg-nano-3xmax7219-v1";
  var V2_ID_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
  var WORLD_WIDTH_MIN = 1;
  var WORLD_WIDTH_MAX = 26;
  var WORLD_HEIGHT_MIN = 1;
  var WORLD_HEIGHT_MAX = 32;
  var WORLD_SECTION_MAX = 9;
  var WORLD_AREA_TYPES = ["worldmap", "town", "dungeon"];
  var WORLD_ROOM_TYPES = ["empty", "normal", "special", "raw"];
  var WORLD_PALETTE_MODES = ["global", "section"];
  var WORLD_PALETTE_BITS = [1, 2, 3, 4];
  var V2_LIBRARY_FIELDS = [
    "glyphs",
    "frames",
    "animations",
    "worlds",
    "sections",
    "rooms",
    "interactions",
    "heroes",
    "enemies",
    "encounterGroups",
    "items",
    "equipment",
    "spells",
    "abilities",
    "texts",
    "music",
    "soundEffects"
  ];
  var V2_ROOT_FIELDS = [
    "format",
    "schemaVersion",
    "project",
    "hardwareProfileId",
    "settings",
    "glyphs",
    "frames",
    "animations",
    "worlds",
    "sections",
    "rooms",
    "interactions",
    "heroes",
    "enemies",
    "encounterGroups",
    "items",
    "equipment",
    "spells",
    "abilities",
    "battleRules",
    "texts",
    "eventGraph",
    "music",
    "soundEffects",
    "gameFlow",
    "saveData",
    "editor",
    "migration",
    "extensions"
  ];

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function cloneJson(value) {
    if (value === undefined) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value));
  }

  function isoNow() {
    return new Date().toISOString();
  }

  function ensureObject(parent, key, fallback, repairs) {
    if (!isPlainObject(parent[key])) {
      parent[key] = cloneJson(fallback || {});
      repairs.push(key + " was replaced with a safe object.");
    }

    return parent[key];
  }

  function ensureArray(parent, key, repairs) {
    if (!Array.isArray(parent[key])) {
      parent[key] = [];
      repairs.push(key + " was replaced with an empty array.");
    }

    return parent[key];
  }

  function ensureString(object, key, fallback, repairs, label) {
    if (typeof object[key] !== "string" || !object[key].trim()) {
      object[key] = fallback;
      repairs.push((label || key) + " was replaced with a default value.");
    }

    return object[key];
  }

  function firstFiniteStat(stats, keys, fallback) {
    var index;
    var value;

    for (index = 0; index < keys.length; index += 1) {
      if (stats[keys[index]] !== undefined) {
        value = Number(stats[keys[index]]);
        if (Number.isFinite(value)) {
          return Math.round(value);
        }
      }
    }

    return fallback;
  }

  function fillCanonicalStat(stats, key, aliases, fallback) {
    if (stats[key] === undefined) {
      stats[key] = firstFiniteStat(stats, aliases, fallback);
      return true;
    }

    return false;
  }

  function normalizeActorCanonicalStats(actor, label, repairs, isHero) {
    var stats;
    var changed = false;

    if (!isPlainObject(actor)) return;
    stats = ensureObject(actor, "stats", {}, repairs);

    changed = fillCanonicalStat(stats, "level", ["level"], 1) || changed;
    changed = fillCanonicalStat(stats, "maxHP", ["maxHP", "maxHp", "hp"], 10) || changed;
    changed = fillCanonicalStat(stats, "currentHP", ["currentHP", "currentHp", "hp"], stats.maxHP) || changed;
    changed = fillCanonicalStat(stats, "maxMP", ["maxMP", "maxMp", "mp"], isHero ? 10 : 0) || changed;
    changed = fillCanonicalStat(stats, "currentMP", ["currentMP", "currentMp", "mp"], stats.maxMP) || changed;
    changed = fillCanonicalStat(stats, "attackPower", ["attackPower", "attack", "str"], isHero ? 6 : 4) || changed;
    changed = fillCanonicalStat(stats, "magicPower", ["magicPower", "magic", "int"], isHero ? 5 : 0) || changed;
    changed = fillCanonicalStat(stats, "defense", ["defense", "armor"], isHero ? 5 : 2) || changed;
    changed = fillCanonicalStat(stats, "magicDefense", ["magicDefense", "magicArmor", "wis"], isHero ? 4 : 0) || changed;
    changed = fillCanonicalStat(stats, "accuracy", ["accuracy", "hitRate"], isHero ? 75 : 70) || changed;
    changed = fillCanonicalStat(stats, "evasion", ["evasion", "dodge"], isHero ? 3 : 4) || changed;
    changed = fillCanonicalStat(stats, "criticalChance", ["criticalChance", "crit"], isHero ? 5 : 3) || changed;
    changed = fillCanonicalStat(stats, "resistancePhysical", ["resistancePhysical"], 100) || changed;
    changed = fillCanonicalStat(stats, "resistanceMagic", ["resistanceMagic"], 100) || changed;
    changed = fillCanonicalStat(stats, "weaponPower", ["weaponPower"], 0) || changed;
    changed = fillCanonicalStat(stats, "spellPower", ["spellPower"], 0) || changed;
    changed = fillCanonicalStat(stats, "speed", ["speed", "swiftness"], isHero ? 10 : 5) || changed;

    if (isHero) {
      changed = fillCanonicalStat(stats, "healPower", ["healPower", "healing", "heal"], 8) || changed;
      changed = fillCanonicalStat(stats, "xpNext", ["xpNext"], 20) || changed;
    } else {
      changed = fillCanonicalStat(stats, "xpReward", ["xpReward", "xp"], 6) || changed;
    }

    if (changed) {
      repairs.push(label + ".stats canonical battle fields were filled from defaults or aliases.");
    }
  }

  function ensureVersionedData(object, repairs, label) {
    if (!isPlainObject(object)) {
      return;
    }

    if (!Number.isInteger(object.dataVersion) || object.dataVersion < 1) {
      object.dataVersion = 1;
      repairs.push(label + " dataVersion was set to 1.");
    }

    if (!isPlainObject(object.data)) {
      object.data = {};
      repairs.push(label + " data was replaced with an empty object.");
    }
  }

  function defaultSaveStateFields() {
    return [
      {
        id: "world_index",
        label: "World index",
        byteCount: 1,
        encoding: "uint8"
      },
      {
        id: "room_x",
        label: "Room X",
        byteCount: 1,
        encoding: "uint8"
      },
      {
        id: "room_y",
        label: "Room Y",
        byteCount: 1,
        encoding: "uint8"
      },
      {
        id: "player_x",
        label: "Player X",
        byteCount: 1,
        encoding: "uint8"
      },
      {
        id: "player_y",
        label: "Player Y",
        byteCount: 1,
        encoding: "uint8"
      }
    ];
  }

  function minimalRpgSaveStateFields() {
    return defaultSaveStateFields().concat([
      { id: "hero_current_hp", label: "Hero current HP", byteCount: 1, encoding: "uint8" },
      { id: "hero_max_hp", label: "Hero max HP", byteCount: 1, encoding: "uint8" },
      { id: "hero_level", label: "Hero level", byteCount: 1, encoding: "uint8" },
      { id: "hero_xp", label: "Hero XP", byteCount: 2, encoding: "uint16" },
      { id: "hero_attack_power", label: "Hero attack", byteCount: 1, encoding: "uint8" },
      { id: "gold", label: "Gold", byteCount: 2, encoding: "uint16" },
      { id: "potion_count", label: "Potion count", byteCount: 1, encoding: "uint8" },
      { id: "equipment_flags", label: "Equipment flags", byteCount: 1, encoding: "bitset8" },
      { id: "story_flags", label: "Story flags", byteCount: 1, encoding: "bitset8" },
      { id: "chest_flags", label: "Opened chests", byteCount: 1, encoding: "bitset8" }
    ]);
  }

  function minimalRpgSaveDataContract() {
    return {
      encodingLocked: true,
      scope: "minimal-rpg-v1",
      payloadBytesPerSlot: 17,
      globalHeaderBytes: 4,
      slotHeaderBytes: 4,
      totalEepromBytes: 67,
      bitPacking: {
        equipment_flags: {
          bit0: "swordObtained",
          bit1: "swordEquipped"
        },
        story_flags: {
          bit0: "hasAncientKey",
          bit1: "gateOpened",
          bit2: "bossDefeated"
        },
        chest_flags: {
          bit0: "chest_gold_1",
          bit1: "chest_gold_2",
          bit2: "chest_gold_3",
          bit3: "chest_gold_4",
          bit4: "chest_key",
          bit5: "chest_sword",
          bit6: "chest_potion_1",
          bit7: "chest_potion_2"
        }
      }
    };
  }

  function createDefaultProjectV2() {
    var now = isoNow();
    var minimalRpgSaveFields = minimalRpgSaveStateFields();
    var saveDataContract = minimalRpgSaveDataContract();
    var sectionOneCoords = [];
    var sectionTwoCoords = [
      { x: 4, y: 3 },
      { x: 4, y: 4 }
    ];
    var chestDefinitions = [
      { id: "chest_gold_1", roomId: "room_b00", x: 5, y: 1, lootKind: "gold10", amount: 10 },
      { id: "chest_gold_2", roomId: "room_d00", x: 2, y: 2, lootKind: "gold10", amount: 10 },
      { id: "chest_gold_3", roomId: "room_a02", x: 6, y: 0, lootKind: "gold10", amount: 10 },
      { id: "chest_gold_4", roomId: "room_c03", x: 1, y: 2, lootKind: "gold10", amount: 10 },
      { id: "chest_key", roomId: "room_d04", x: 3, y: 1, lootKind: "ancientKey", itemId: "item_ancient_key" },
      { id: "chest_sword", roomId: "room_b03", x: 5, y: 2, lootKind: "sword", equipmentId: "equipment_sword" },
      { id: "chest_potion_1", roomId: "room_e00", x: 2, y: 0, lootKind: "potion", itemId: "item_potion", count: 1 },
      { id: "chest_potion_2", roomId: "room_a04", x: 6, y: 2, lootKind: "potion", itemId: "item_potion", count: 1 }
    ];
    var roomRecords;
    var interactionRecords;

    function roomIdForCoord(coord) {
      return "room_" + String.fromCharCode(97 + coord.x) + String(coord.y).padStart(2, "0");
    }

    function coordKey(coord) {
      return String.fromCharCode(65 + coord.x) + "." + String(coord.y).padStart(2, "0");
    }

    function roomHasChest(roomId, cellX, cellY) {
      return chestDefinitions.some(function (chest) {
        return chest.roomId === roomId && chest.x === cellX && chest.y === cellY;
      });
    }

    function starterRoomFrame(coord, sectionId) {
      var roomId = roomIdForCoord(coord);
      var cells = new Array(DISPLAY_CELLS).fill(" ");

      for (var index = 0; index < DISPLAY_CELLS; index += 1) {
        var cellX = index % DISPLAY_COLS;
        var cellY = Math.floor(index / DISPLAY_COLS);
        var seed = (coord.x + 1) * 11 + (coord.y + 1) * 7 + cellX * 5 + cellY * 3;

        if (roomHasChest(roomId, cellX, cellY)) continue;
        if (coord.x === 0 && coord.y === 0 && cellX === 0 && cellY === 1) continue;
        if (sectionId === "section_one" && (seed % 17 === 0 || seed % 23 === 0)) {
          cells[index] = "#";
        }
      }

      if (sectionId === "section_one" && coord.x === 3 && coord.y === 3) {
        cells[7] = "8";
        cells[15] = "8";
        cells[23] = "8";
      }
      if (sectionId === "section_one" && coord.x === 3 && coord.y === 4) {
        cells[7] = "8";
        cells[15] = "1";
        cells[23] = "8";
      }
      if (sectionId === "section_one" && coord.x === 4 && coord.y === 2) {
        for (var bottomX = 0; bottomX < DISPLAY_COLS; bottomX += 1) {
          cells[16 + bottomX] = "8";
        }
      }
      if (sectionId === "section_two" && coord.x === 4 && coord.y === 3) {
        cells[0] = "8";
        cells[8] = "8";
        cells[16] = "8";
        for (var topX = 0; topX < DISPLAY_COLS; topX += 1) {
          cells[topX] = "8";
        }
      }
      if (sectionId === "section_two" && coord.x === 4 && coord.y === 4) {
        cells[0] = "8";
        cells[8] = "1";
        cells[16] = "8";
      }

      return normalizeFrame24(cells.join(""));
    }

    function makeRoom(coord, sectionId, interactionIds, encounterGroupId) {
      var roomId = roomIdForCoord(coord);
      var data = {
        pocV1Frame: starterRoomFrame(coord, sectionId)
      };

      if (roomId === "room_d04") {
        data.boundary = {
          east: {
            kind: "lockedGate",
            interactionId: "interaction_locked_gate",
            requiredFlag: "hasAncientKey"
          }
        };
      } else if (roomId === "room_e04") {
        data.boundary = {
          west: {
            kind: "lockedGate",
            interactionId: "interaction_locked_gate",
            requiredFlag: "hasAncientKey"
          }
        };
      }

      return {
        id: roomId,
        sectionId: sectionId,
        x: coord.x,
        y: coord.y,
        roomType: "empty",
        frameId: "frame_blank",
        interactionIds: interactionIds || [],
        encounterGroupIds: [encounterGroupId],
        musicId: null,
        dataVersion: 1,
        data: data
      };
    }

    for (var y = 0; y < 5; y += 1) {
      for (var x = 0; x < 5; x += 1) {
        if (x === 4 && (y === 3 || y === 4)) continue;
        sectionOneCoords.push({ x: x, y: y });
      }
    }

    roomRecords = sectionOneCoords.map(function (coord) {
      var roomId = roomIdForCoord(coord);
      var interactionIds = chestDefinitions.filter(function (chest) {
        return chest.roomId === roomId;
      }).map(function (chest) {
        return "interaction_" + chest.id;
      });

      if (roomId === "room_d04") {
        interactionIds.push("interaction_locked_gate");
      }

      return makeRoom(coord, "section_one", interactionIds, "encounter_section_one");
    }).concat(sectionTwoCoords.map(function (coord) {
      return makeRoom(coord, "section_two", [], "encounter_final_boss");
    }));

    interactionRecords = chestDefinitions.map(function (chest) {
      return {
        id: "interaction_" + chest.id,
        roomId: chest.roomId,
        eventNodeId: "event_" + chest.id,
        trigger: { kind: "cell", x: chest.x, y: chest.y },
        dataVersion: 1,
        data: { kind: "chest", chestId: chest.id }
      };
    }).concat([
      {
        id: "interaction_locked_gate",
        roomId: "room_d04",
        eventNodeId: "event_locked_gate",
        trigger: { kind: "edge", direction: "east", targetRoomId: "room_e04" },
        dataVersion: 1,
        data: {
          kind: "lockedGate",
          requiredFlag: "hasAncientKey",
          fromSectionId: "section_one",
          toSectionId: "section_two"
        }
      }
    ]);

    return {
      format: PROJECT_FORMAT_V2,
      schemaVersion: PROJECT_SCHEMA_VERSION_V2,
      project: {
        id: "project_ancient_key",
        title: "Ancient Key Quest",
        createdAt: now,
        modifiedAt: now,
        license: "AGPL-3.0"
      },
      hardwareProfileId: OFFICIAL_HARDWARE_PROFILE_ID,
      settings: {
        displayTestText: "HELLO",
        transitionAnimationMs: 500,
        showRoomCoordinates: true,
        roomCoordinateTimeMs: 1000,
        triggerBattles: false,
        worldCompressionMode: "global-8-glyph",
        language: "en",
        musicAssignments: {
          worldmapMusicId: null,
          battleMusicId: null
        },
        textGlyphs: defaultTextGlyphs()
      },
      glyphs: [],
      frames: [
        {
          id: "frame_blank",
          name: "Blank",
          width: 8,
          height: 3,
          encoding: "segment-bytes-v1",
          cells: new Array(DISPLAY_CELLS).fill(0),
          tags: ["room"],
          editor: {
            notes: ""
          },
          dataVersion: 1,
          data: {}
        }
      ],
      animations: [],
      worlds: [
        {
          id: "world_main",
          name: "Main world",
          kind: "worldmap",
          areaType: "worldmap",
          width: 5,
          height: 5,
          paletteMode: "global",
          sectionIds: ["section_one", "section_two"],
          defaultSectionId: "section_one",
          startRoomId: "room_a00"
        }
      ],
      sections: [
        {
          id: "section_one",
          worldId: "world_main",
          name: "Section 1",
          kind: "biome",
          roomIds: sectionOneCoords.map(roomIdForCoord),
          coordinateKeys: sectionOneCoords.map(coordKey),
          palette: {
            mode: "global",
            bitsPerCell: 3,
            glyphIds: []
          },
          dataVersion: 1,
          data: {
            enemyKind: "enemy_gob",
            encounterGroupId: "encounter_section_one",
            description: "Starter section with chests and the locked gate."
          }
        },
        {
          id: "section_two",
          worldId: "world_main",
          name: "Section 2",
          kind: "biome",
          roomIds: sectionTwoCoords.map(roomIdForCoord),
          coordinateKeys: sectionTwoCoords.map(coordKey),
          palette: {
            mode: "global",
            bitsPerCell: 3,
            glyphIds: []
          },
          dataVersion: 1,
          data: {
            enemyKind: "enemy_final_boss",
            encounterGroupId: "encounter_final_boss",
            description: "Boss section behind the locked gate."
          }
        }
      ],
      rooms: roomRecords,
      interactions: interactionRecords,
      heroes: [
        {
          id: "hero_you1",
          name: "You",
          role: "balanced",
          footprint: { width: 1, height: 1 },
          stats: {
            level: 1,
            currentHP: 30,
            maxHP: 30,
            currentMP: 10,
            maxMP: 10,
            attackPower: 6,
            magicPower: 5,
            accuracy: 75,
            evasion: 3,
            criticalChance: 5,
            resistancePhysical: 100,
            resistanceMagic: 100,
            weaponPower: 0,
            spellPower: 0,
            speed: 10,
            healPower: 8,
            maxHp: 30,
            maxMp: 10,
            attack: 6,
            defense: 5,
            magic: 5,
            magicDefense: 4,
            swiftness: 10,
            healing: 8,
            xp: 0,
            xpNext: 20
          },
          equipmentIds: [],
          spellIds: [],
          abilityIds: [],
          animationIds: {},
          dataVersion: 1,
          data: {
            runtimeDefaults: {
              xp: 0,
              gold: 0,
              potionCount: 0,
              swordEquipped: false
            }
          }
        }
      ],
      enemies: [
        {
          id: "enemy_gob",
          name: "Gob",
          footprint: { width: 1, height: 1 },
          stats: {
            level: 1,
            currentHP: 10,
            maxHP: 10,
            currentMP: 0,
            maxMP: 0,
            attackPower: 4,
            magicPower: 0,
            accuracy: 70,
            evasion: 4,
            criticalChance: 3,
            resistancePhysical: 100,
            resistanceMagic: 100,
            weaponPower: 0,
            spellPower: 0,
            speed: 5,
            xpReward: 7,
            maxHp: 10,
            attack: 4,
            defense: 2,
            magic: 0,
            magicDefense: 0
          },
          swiftness: {
            mode: "randomPerBattle",
            min: 1,
            max: 10
          },
          dropTable: [],
          animationIds: {},
          dataVersion: 1,
          data: {
            sectionId: "section_one",
            goldReward: 0
          }
        },
        {
          id: "enemy_final_boss",
          name: "Boss",
          footprint: { width: 1, height: 1 },
          stats: {
            level: 3,
            currentHP: 35,
            maxHP: 35,
            currentMP: 0,
            maxMP: 0,
            attackPower: 8,
            magicPower: 0,
            accuracy: 75,
            evasion: 3,
            criticalChance: 5,
            resistancePhysical: 100,
            resistanceMagic: 100,
            weaponPower: 0,
            spellPower: 0,
            speed: 6,
            xpReward: 20,
            maxHp: 35,
            attack: 8,
            defense: 4,
            magic: 0,
            magicDefense: 1
          },
          swiftness: {
            mode: "fixed",
            value: 6
          },
          dropTable: [],
          animationIds: {},
          dataVersion: 1,
          data: {
            sectionId: "section_two",
            finalBoss: true,
            victoryTextId: "text_ending"
          }
        }
      ],
      encounterGroups: [
        {
          id: "encounter_section_one",
          name: "Section 1 enemy",
          members: [
            {
              enemyId: "enemy_gob",
              position: { x: 0, y: 0 }
            }
          ],
          weight: 10,
          conditions: [],
          dataVersion: 1,
          data: {
            sectionId: "section_one",
            randomBattle: true
          }
        },
        {
          id: "encounter_final_boss",
          name: "Final boss",
          members: [
            {
              enemyId: "enemy_final_boss",
              position: { x: 0, y: 0 }
            }
          ],
          weight: 10,
          conditions: [
            { type: "flagFalse", flagId: "bossDefeated" }
          ],
          dataVersion: 1,
          data: {
            sectionId: "section_two",
            finalBoss: true
          }
        }
      ],
      items: [
        {
          id: "item_potion",
          name: "Potion",
          kind: "consumable",
          textId: "text_found_potion",
          useEventNodeId: null,
          dataVersion: 1,
          data: {
            itemCode: 1,
            effect: "heal",
            healAmount: 10,
            usableInBattle: true,
            usableInWorldMenu: true
          }
        },
        {
          id: "item_sword",
          name: "Sword",
          kind: "equipment",
          textId: "text_found_sword",
          useEventNodeId: null,
          dataVersion: 1,
          data: {
            itemCode: 2,
            slot: "weapon",
            attackPowerBonus: 4
          }
        },
        {
          id: "item_ancient_key",
          name: "Ancient key",
          kind: "key",
          textId: "text_key_obtained",
          useEventNodeId: null,
          dataVersion: 1,
          data: {
            itemCode: 3,
            flagId: "hasAncientKey",
            opensGateId: "gate_section_two"
          }
        },
        {
          id: "item_gold10",
          name: "10 Gold",
          kind: "money",
          textId: "text_found_gold",
          useEventNodeId: null,
          dataVersion: 1,
          data: {
            itemCode: 4,
            goldAmount: 10
          }
        }
      ],
      equipment: [
        {
          id: "equipment_sword",
          itemId: "item_sword",
          slot: "weapon",
          kind: "sword",
          abilityIds: [],
          dataVersion: 1,
          data: {
            itemCode: 2,
            attackPowerBonus: 4,
            attack: 4,
            animationTags: ["heroPhysicalAttack", "sword"]
          }
        }
      ],
      spells: [],
      abilities: [],
      battleRules: {
        calculationMethod: "simple11",
        timerMode: "individualSwiftness",
        timersChargeOnlyDuring: "charging",
        tieOrder: ["partySlot0", "partySlot1", "foesByPlacement"],
        commands: ["hit", "cast", "ability", "item"],
        escapeEnabled: false,
        deadTargetExceptions: {
          itemIds: [],
          spellIds: []
        },
        enemyArea: { width: 4, height: 2 },
        dataVersion: 1,
        data: {
          calculationMethod: "simple11",
          xpPerNormalFight: 7,
          approximateFightsPerLevel: 3,
          levelUp: {
            xpNextStart: 20,
            xpNextIncrease: 10,
            maxHPIncrease: 5,
            attackPowerIncrease: 1
          },
          finalBossEnemyId: "enemy_final_boss",
          finalBossVictoryFlag: "bossDefeated",
          finalBossVictoryTextId: "text_ending"
        }
      },
      texts: [
        {
          id: "text_key_obtained",
          name: "Key obtained",
          text: "You now hold the anchent key",
          dataVersion: 1,
          data: { purpose: "keyChest" }
        },
        {
          id: "text_ending",
          name: "Ending",
          text: "You have saved the world, Thank you.",
          dataVersion: 1,
          data: { purpose: "finalBossVictory" }
        },
        {
          id: "text_found_gold",
          name: "Found gold",
          text: "Found 10 Gold",
          dataVersion: 1,
          data: { purpose: "goldChest" }
        },
        {
          id: "text_found_sword",
          name: "Found sword",
          text: "Found Sword",
          dataVersion: 1,
          data: { purpose: "swordChest" }
        },
        {
          id: "text_found_potion",
          name: "Found potion",
          text: "Found Potion",
          dataVersion: 1,
          data: { purpose: "potionChest" }
        },
        {
          id: "text_gate_locked",
          name: "Gate locked",
          text: "Gate locked",
          dataVersion: 1,
          data: { purpose: "lockedGate" }
        },
        {
          id: "text_level_up",
          name: "Level up",
          text: "Level up",
          dataVersion: 1,
          data: { purpose: "levelUp" }
        }
      ],
      eventGraph: {
        entryNodeIds: ["event_game_start"],
        nodes: [
          {
            id: "event_game_start",
            type: "start",
            nextIds: [],
            dataVersion: 1,
            data: {}
          },
          {
            id: "event_chest_gold_1",
            type: "chest",
            nextIds: [],
            dataVersion: 1,
            data: { chestId: "chest_gold_1", lootKind: "gold10", amount: 10, textId: "text_found_gold" }
          },
          {
            id: "event_chest_gold_2",
            type: "chest",
            nextIds: [],
            dataVersion: 1,
            data: { chestId: "chest_gold_2", lootKind: "gold10", amount: 10, textId: "text_found_gold" }
          },
          {
            id: "event_chest_gold_3",
            type: "chest",
            nextIds: [],
            dataVersion: 1,
            data: { chestId: "chest_gold_3", lootKind: "gold10", amount: 10, textId: "text_found_gold" }
          },
          {
            id: "event_chest_gold_4",
            type: "chest",
            nextIds: [],
            dataVersion: 1,
            data: { chestId: "chest_gold_4", lootKind: "gold10", amount: 10, textId: "text_found_gold" }
          },
          {
            id: "event_chest_key",
            type: "chest",
            nextIds: [],
            dataVersion: 1,
            data: {
              chestId: "chest_key",
              lootKind: "ancientKey",
              itemId: "item_ancient_key",
              setFlag: "hasAncientKey",
              textId: "text_key_obtained"
            }
          },
          {
            id: "event_chest_sword",
            type: "chest",
            nextIds: [],
            dataVersion: 1,
            data: {
              chestId: "chest_sword",
              lootKind: "sword",
              itemId: "item_sword",
              equipmentId: "equipment_sword",
              textId: "text_found_sword"
            }
          },
          {
            id: "event_chest_potion_1",
            type: "chest",
            nextIds: [],
            dataVersion: 1,
            data: { chestId: "chest_potion_1", lootKind: "potion", itemId: "item_potion", count: 1, textId: "text_found_potion" }
          },
          {
            id: "event_chest_potion_2",
            type: "chest",
            nextIds: [],
            dataVersion: 1,
            data: { chestId: "chest_potion_2", lootKind: "potion", itemId: "item_potion", count: 1, textId: "text_found_potion" }
          },
          {
            id: "event_locked_gate",
            type: "gate",
            nextIds: [],
            dataVersion: 1,
            data: {
              gateId: "gate_section_two",
              requiredFlag: "hasAncientKey",
              lockedTextId: "text_gate_locked"
            }
          },
          {
            id: "event_final_boss_victory",
            type: "ending",
            nextIds: [],
            dataVersion: 1,
            data: {
              setFlag: "bossDefeated",
              textId: "text_ending"
            }
          }
        ]
      },
      music: [],
      soundEffects: [],
      gameFlow: {
        introTextId: null,
        startingWorldId: "world_main",
        startingRoomId: "room_a00",
        startingCell: { x: 0, y: 1 },
        startingHeroIds: ["hero_you1"],
        startingItemIds: [],
        gameStartEventNodeId: "event_game_start",
        victoryEventNodeId: "event_final_boss_victory",
        defeatEventNodeId: null,
        dataVersion: 1,
        data: {
          minimalRpg: {
            version: 1,
            currentGold: 0,
            potionCount: 0,
            swordObtained: false,
            swordEquipped: false,
            flags: {
              hasAncientKey: false,
              gateOpened: false,
              bossDefeated: false
            },
            openedChests: {
              chest_gold_1: false,
              chest_gold_2: false,
              chest_gold_3: false,
              chest_gold_4: false,
              chest_key: false,
              chest_sword: false,
              chest_potion_1: false,
              chest_potion_2: false
            },
            chests: chestDefinitions,
            gates: [
              {
                id: "gate_section_two",
                fromRoomId: "room_d04",
                toRoomId: "room_e04",
                requiredFlag: "hasAncientKey"
              }
            ],
            walls: [
              {
                id: "wall_between_sections",
                fromSectionId: "section_one",
                toSectionId: "section_two"
              },
              {
                id: "wall_e02_e03",
                fromRoomId: "room_e02",
                toRoomId: "room_e03"
              }
            ]
          }
        }
      },
      saveData: {
        slotCount: 3,
        mode: "manualOnly",
        wearLeveling: false,
        saveRules: {
          worldmap: "anyTime",
          town: "anyTime",
          dungeon: "savePointOnly"
        },
        stateDefinitionVersion: 1,
        stateFields: minimalRpgSaveFields,
        data: {
          encodingLocked: saveDataContract.encodingLocked,
          scope: saveDataContract.scope,
          payloadBytesPerSlot: saveDataContract.payloadBytesPerSlot,
          globalHeaderBytes: saveDataContract.globalHeaderBytes,
          slotHeaderBytes: saveDataContract.slotHeaderBytes,
          totalEepromBytes: saveDataContract.totalEepromBytes,
          bitPacking: saveDataContract.bitPacking,
          initialState: {
            heroCurrentHP: 30,
            heroMaxHP: 30,
            heroLevel: 1,
            heroXP: 0,
            heroAttackPower: 6,
            gold: 0,
            potionCount: 0,
            equipmentFlags: {
              swordObtained: false,
              swordEquipped: false
            },
            storyFlags: {
              hasAncientKey: false,
              gateOpened: false,
              bossDefeated: false
            },
            chestFlags: {
              chest_gold_1: false,
              chest_gold_2: false,
              chest_gold_3: false,
              chest_gold_4: false,
              chest_key: false,
              chest_sword: false,
              chest_potion_1: false,
              chest_potion_2: false
            }
          }
        }
      },
      editor: {
        lastTool: "hub",
        notes: "",
        toolData: {},
        extensions: {}
      },
      extensions: {}
    };
  }

  function detectProjectVersion(rawProject) {
    var v1Fields = ["title", "displayTestText", "rooms", "start", "battle", "hardware"];

    if (!isPlainObject(rawProject)) {
      return 0;
    }

    if (rawProject.format === PROJECT_FORMAT_V2 && Number(rawProject.schemaVersion) === PROJECT_SCHEMA_VERSION_V2) {
      return 2;
    }

    if (rawProject.format === undefined && rawProject.schemaVersion === undefined) {
      for (var i = 0; i < v1Fields.length; i += 1) {
        if (Object.prototype.hasOwnProperty.call(rawProject, v1Fields[i])) {
          return 1;
        }
      }

      return 0;
    }

    return -1;
  }

  function preserveUnknownRootFields(source, project, warnings) {
    var recognized = {};
    var unknown = {};

    for (var i = 0; i < V2_ROOT_FIELDS.length; i += 1) {
      recognized[V2_ROOT_FIELDS[i]] = true;
    }

    Object.keys(source).forEach(function (key) {
      if (!recognized[key]) {
        if (key === "runtime" || key === "session") {
          delete project[key];
          warnings.push(key + " state was not preserved because it is not authored project data.");
          return;
        }

        unknown[key] = cloneJson(source[key]);
        delete project[key];
      }
    });

    if (Object.keys(unknown).length) {
      if (!isPlainObject(project.extensions.unrecognizedTopLevel)) {
        project.extensions.unrecognizedTopLevel = {};
      }

      Object.keys(unknown).forEach(function (key) {
        project.extensions.unrecognizedTopLevel[key] = unknown[key];
      });
      warnings.push("Unknown top-level fields were preserved in extensions.unrecognizedTopLevel.");
    }
  }

  function collectV2Ids(project, errors) {
    var ids = {};
    var byType = {};

    function addId(id, path, type) {
      if (typeof id !== "string" || !V2_ID_PATTERN.test(id)) {
        errors.push(path + " must use a stable lowercase ID.");
        return;
      }

      if (type) {
        if (!byType[type]) byType[type] = {};
        byType[type][id] = true;
      }

      if (ids[id]) {
        errors.push("Duplicate ID " + id + " appears at " + ids[id] + " and " + path + ".");
        return;
      }

      ids[id] = path;
    }

    addId(project.project.id, "project.id", "project");

    V2_LIBRARY_FIELDS.forEach(function (field) {
      project[field].forEach(function (entry, index) {
        if (isPlainObject(entry)) {
          addId(entry.id, field + "[" + index + "].id", field);
        }
      });
    });

    project.eventGraph.nodes.forEach(function (node, index) {
      if (isPlainObject(node)) {
        addId(node.id, "eventGraph.nodes[" + index + "].id", "eventNodes");
      }
    });

    return {
      all: ids,
      byType: byType
    };
  }

  function validateV2References(project, idIndex, errors) {
    function required(id, path, expectedType) {
      var typeIds = idIndex.byType[expectedType] || {};

      if (typeof id !== "string" || !typeIds[id]) {
        errors.push(path + " references missing ID " + String(id) + ".");
      }
    }

    function optional(id, path, expectedType) {
      if (id !== null && id !== undefined && id !== "") {
        required(id, path, expectedType);
      }
    }

    function list(values, path, expectedType) {
      if (!Array.isArray(values)) {
        errors.push(path + " must be an ordered array of IDs.");
        return;
      }

      values.forEach(function (id, index) {
        required(id, path + "[" + index + "]", expectedType);
      });
    }

    project.animations.forEach(function (entry, index) {
      list(entry.frameIds || [], "animations[" + index + "].frameIds", "frames");
    });
    project.frames.forEach(function (entry, index) {
      if (entry.encoding === "glyph-refs-v1") {
        list(entry.cells || [], "frames[" + index + "].cells", "glyphs");
      }
    });
    project.worlds.forEach(function (entry, index) {
      list(entry.sectionIds || [], "worlds[" + index + "].sectionIds", "sections");
      optional(entry.startRoomId, "worlds[" + index + "].startRoomId", "rooms");
    });
    project.sections.forEach(function (entry, index) {
      required(entry.worldId, "sections[" + index + "].worldId", "worlds");
      list(entry.roomIds || [], "sections[" + index + "].roomIds", "rooms");
      if (isPlainObject(entry.palette)) {
        list(entry.palette.glyphIds || [], "sections[" + index + "].palette.glyphIds", "glyphs");
      }
    });
    project.rooms.forEach(function (entry, index) {
      required(entry.sectionId, "rooms[" + index + "].sectionId", "sections");
      optional(entry.frameId, "rooms[" + index + "].frameId", "frames");
      list(entry.interactionIds || [], "rooms[" + index + "].interactionIds", "interactions");
      list(entry.encounterGroupIds || [], "rooms[" + index + "].encounterGroupIds", "encounterGroups");
      optional(entry.musicId, "rooms[" + index + "].musicId", "music");
    });
    project.interactions.forEach(function (entry, index) {
      required(entry.roomId, "interactions[" + index + "].roomId", "rooms");
      required(entry.eventNodeId, "interactions[" + index + "].eventNodeId", "eventNodes");
    });
    project.heroes.forEach(function (entry, index) {
      list(entry.equipmentIds || [], "heroes[" + index + "].equipmentIds", "equipment");
      list(entry.spellIds || [], "heroes[" + index + "].spellIds", "spells");
      list(entry.abilityIds || [], "heroes[" + index + "].abilityIds", "abilities");
      if (isPlainObject(entry.animationIds)) {
        Object.keys(entry.animationIds).forEach(function (key) {
          optional(entry.animationIds[key], "heroes[" + index + "].animationIds." + key, "animations");
        });
      }
    });
    project.enemies.forEach(function (entry, index) {
      if (isPlainObject(entry.animationIds)) {
        Object.keys(entry.animationIds).forEach(function (key) {
          optional(entry.animationIds[key], "enemies[" + index + "].animationIds." + key, "animations");
        });
      }
    });
    project.encounterGroups.forEach(function (entry, index) {
      var members = Array.isArray(entry.members) ? entry.members : [];
      members.forEach(function (member, memberIndex) {
        if (!isPlainObject(member)) {
          errors.push("encounterGroups[" + index + "].members[" + memberIndex + "] must be an object.");
          return;
        }
        required(member.enemyId, "encounterGroups[" + index + "].members[" + memberIndex + "].enemyId", "enemies");
      });
    });
    project.items.forEach(function (entry, index) {
      optional(entry.textId, "items[" + index + "].textId", "texts");
      optional(entry.useEventNodeId, "items[" + index + "].useEventNodeId", "eventNodes");
    });
    project.equipment.forEach(function (entry, index) {
      required(entry.itemId, "equipment[" + index + "].itemId", "items");
      list(entry.abilityIds || [], "equipment[" + index + "].abilityIds", "abilities");
    });
    project.spells.forEach(function (entry, index) {
      optional(entry.animationId, "spells[" + index + "].animationId", "animations");
      optional(entry.textId, "spells[" + index + "].textId", "texts");
    });
    project.abilities.forEach(function (entry, index) {
      optional(entry.animationId, "abilities[" + index + "].animationId", "animations");
      optional(entry.textId, "abilities[" + index + "].textId", "texts");
    });
    project.eventGraph.nodes.forEach(function (entry, index) {
      list(entry.nextIds || [], "eventGraph.nodes[" + index + "].nextIds", "eventNodes");
    });
    list(project.eventGraph.entryNodeIds, "eventGraph.entryNodeIds", "eventNodes");
    optional(project.gameFlow.introTextId, "gameFlow.introTextId", "texts");
    optional(project.gameFlow.startingWorldId, "gameFlow.startingWorldId", "worlds");
    optional(project.gameFlow.startingRoomId, "gameFlow.startingRoomId", "rooms");
    list(project.gameFlow.startingHeroIds || [], "gameFlow.startingHeroIds", "heroes");
    list(project.gameFlow.startingItemIds || [], "gameFlow.startingItemIds", "items");
    optional(project.gameFlow.gameStartEventNodeId, "gameFlow.gameStartEventNodeId", "eventNodes");
    optional(project.gameFlow.victoryEventNodeId, "gameFlow.victoryEventNodeId", "eventNodes");
    optional(project.gameFlow.defeatEventNodeId, "gameFlow.defeatEventNodeId", "eventNodes");
  }

  function validateV2Frames(project, errors) {
    var visualAssets = window.SevenSegVisualAssets;

    if (!visualAssets || typeof visualAssets.validateProjectVisualAssets !== "function") {
      errors.push("Shared visual asset validation is unavailable.");
      return;
    }

    visualAssets.validateProjectVisualAssets(project, false).forEach(function (message) {
      errors.push(message);
    });
  }

  function validateV2Rooms(project, errors) {
    var sectionWorld = {};
    var usedCoordinates = {};

    project.sections.forEach(function (section) {
      if (isPlainObject(section) && typeof section.id === "string") {
        sectionWorld[section.id] = section.worldId;
      }
    });

    project.rooms.forEach(function (room, index) {
      var x = Number(room.x);
      var y = Number(room.y);
      var worldId = sectionWorld[room.sectionId];

      if (!Number.isInteger(x) || x < 0 || x >= ROOM_X_COUNT) {
        errors.push("rooms[" + index + "].x must be an integer from 0 through 25.");
      }
      if (!Number.isInteger(y) || y < ROOM_Y_MIN || y > ROOM_Y_MAX) {
        errors.push("rooms[" + index + "].y must be an integer from 0 through 31.");
      }

      if (worldId && Number.isInteger(x) && Number.isInteger(y)) {
        var key = worldId + ":" + x + "," + y;
        if (usedCoordinates[key]) {
          errors.push("rooms[" + index + "] duplicates coordinate " + x + "," + y + " in world " + worldId + ".");
        } else {
          usedCoordinates[key] = room.id || "rooms[" + index + "]";
        }
      }
    });
  }

  function worldCoordinateKey(x, y) {
    var safeX = Number(x);
    var safeY = Number(y);

    if (!Number.isInteger(safeX) || safeX < 0 || safeX >= WORLD_WIDTH_MAX ||
        !Number.isInteger(safeY) || safeY < 0 || safeY >= WORLD_HEIGHT_MAX) {
      return "";
    }

    return String.fromCharCode(65 + safeX) + "." + String(safeY).padStart(2, "0");
  }

  function parseWorldCoordinateKey(value) {
    var match = String(value || "").trim().match(/^([A-Z])\.(\d{2})$/i);
    var x;
    var y;

    if (!match) return null;
    x = match[1].toUpperCase().charCodeAt(0) - 65;
    y = Number(match[2]);
    if (x < 0 || x >= WORLD_WIDTH_MAX || y < 0 || y >= WORLD_HEIGHT_MAX) {
      return null;
    }

    return {
      x: x,
      y: y,
      key: worldCoordinateKey(x, y)
    };
  }

  function worldSections(project, worldId) {
    return (Array.isArray(project && project.sections) ? project.sections : []).filter(
      function (section) {
        return isPlainObject(section) && section.worldId === worldId;
      }
    );
  }

  function resolveSectionForCoordinate(project, worldId, x, y) {
    var world = findV2Entry(project, "worlds", worldId);
    var key = worldCoordinateKey(x, y);
    var sections;
    var match = null;

    if (!world || !key || x >= Number(world.width) || y >= Number(world.height)) {
      return null;
    }

    sections = worldSections(project, worldId);
    sections.forEach(function (section) {
      if (Array.isArray(section.coordinateKeys) &&
          section.coordinateKeys.indexOf(key) !== -1) {
        if (match && match.id !== section.id) {
          match = { overlap: true, key: key };
        } else if (!match) {
          match = section;
        }
      }
    });

    if (match && match.overlap) return match;
    return match || findV2Entry(project, "sections", world.defaultSectionId) || null;
  }

  function explicitRoomForCoordinate(project, worldId, x, y) {
    var sections = {};

    worldSections(project, worldId).forEach(function (section) {
      sections[section.id] = true;
    });

    for (var index = 0; index < (Array.isArray(project && project.rooms) ?
        project.rooms.length : 0); index += 1) {
      var room = project.rooms[index];
      if (sections[room.sectionId] &&
          Number(room.x) === Number(x) &&
          Number(room.y) === Number(y)) {
        return room;
      }
    }

    return null;
  }

  function resolveEffectiveRoom(project, worldId, x, y) {
    var section = resolveSectionForCoordinate(project, worldId, x, y);
    var explicit = explicitRoomForCoordinate(project, worldId, x, y);
    var result;

    if (!section || section.overlap) return null;
    if (!explicit) {
      return {
        id: null,
        worldId: worldId,
        sectionId: section.id,
        x: Number(x),
        y: Number(y),
        roomType: "empty",
        visual: {
          encoding: "empty-v1",
          cells: []
        },
        metadata: {},
        implicit: true
      };
    }

    result = cloneJson(explicit);
    result.worldId = worldId;
    result.sectionId = section.id;
    result.implicit = false;
    if (!isPlainObject(result.visual)) {
      if (result.roomType === "empty") {
        result.visual = { encoding: "empty-v1", cells: [] };
      } else {
        result.visual = {
          encoding: "frame-ref-v1",
          frameId: result.frameId || ""
        };
      }
    }
    result.metadata = {
      interactionIds: Array.isArray(result.interactionIds) ? result.interactionIds.slice() : [],
      encounterGroupIds: Array.isArray(result.encounterGroupIds) ?
        result.encounterGroupIds.slice() :
        [],
      musicId: result.musicId === undefined ? null : result.musicId,
      dataVersion: result.dataVersion,
      data: cloneJson(result.data || {})
    };
    return result;
  }

  function validateV2WorldModel(project, errors) {
    var worldById = {};
    var sectionsByWorld = {};

    project.worlds.forEach(function (world, worldIndex) {
      var path = "worlds[" + worldIndex + "]";
      var width = Number(world.width);
      var height = Number(world.height);
      var areaType = world.areaType;
      var paletteMode = world.paletteMode;

      worldById[world.id] = world;
      if (!Number.isInteger(width) || width < WORLD_WIDTH_MIN || width > WORLD_WIDTH_MAX) {
        errors.push(path + ".width must be an integer from 1 through 26.");
      }
      if (!Number.isInteger(height) || height < WORLD_HEIGHT_MIN || height > WORLD_HEIGHT_MAX) {
        errors.push(path + ".height must be an integer from 1 through 32.");
      }
      if (WORLD_AREA_TYPES.indexOf(areaType) === -1) {
        errors.push(path + ".areaType must be worldmap, town, or dungeon.");
      }
      if (WORLD_PALETTE_MODES.indexOf(paletteMode) === -1) {
        errors.push(path + ".paletteMode must be global or section.");
      }
      if (!Array.isArray(world.sectionIds) || world.sectionIds.length < 1 ||
          world.sectionIds.length > WORLD_SECTION_MAX) {
        errors.push(path + ".sectionIds must contain 1 through 9 section IDs.");
      }
      if (typeof world.defaultSectionId !== "string" ||
          !Array.isArray(world.sectionIds) ||
          world.sectionIds.indexOf(world.defaultSectionId) === -1) {
        errors.push(path + ".defaultSectionId must be one of the world's section IDs.");
      }
    });

    project.sections.forEach(function (section, sectionIndex) {
      var path = "sections[" + sectionIndex + "]";
      var world = worldById[section.worldId];
      var palette = isPlainObject(section.palette) ? section.palette : {};
      var coordinateKeys = section.coordinateKeys;

      if (!sectionsByWorld[section.worldId]) sectionsByWorld[section.worldId] = [];
      sectionsByWorld[section.worldId].push(section);
      if (!Array.isArray(coordinateKeys)) {
        errors.push(path + ".coordinateKeys must be an array.");
      } else {
        coordinateKeys.forEach(function (key, coordinateIndex) {
          var coordinate = parseWorldCoordinateKey(key);
          if (!coordinate || !world ||
              coordinate.x >= Number(world.width) ||
              coordinate.y >= Number(world.height)) {
            errors.push(
              path + ".coordinateKeys[" + coordinateIndex +
              "] must be inside its world dimensions."
            );
          }
        });
      }
      if (WORLD_PALETTE_MODES.indexOf(palette.mode) === -1) {
        errors.push(path + ".palette.mode must be global or section.");
      }
      if (WORLD_PALETTE_BITS.indexOf(Number(palette.bitsPerCell)) === -1) {
        errors.push(path + ".palette.bitsPerCell must be 1, 2, 3, or 4.");
      }
      if (Array.isArray(palette.glyphIds) &&
          palette.glyphIds.length > Math.pow(2, Number(palette.bitsPerCell))) {
        errors.push(path + ".palette.glyphIds exceeds its selected bit capacity.");
      }
    });

    Object.keys(sectionsByWorld).forEach(function (worldId) {
      var used = {};
      sectionsByWorld[worldId].forEach(function (section) {
        arrayOrEmpty(section.coordinateKeys).forEach(function (key) {
          if (used[key] && used[key] !== section.id) {
            errors.push(
              "Sections " + used[key] + " and " + section.id +
              " overlap at coordinate " + key + "."
            );
          } else {
            used[key] = section.id;
          }
        });
      });
    });

    project.rooms.forEach(function (room, roomIndex) {
      var path = "rooms[" + roomIndex + "]";
      var section = findV2Entry(project, "sections", room.sectionId);
      var world = section ? worldById[section.worldId] : null;
      var resolved = world ?
        resolveSectionForCoordinate(project, world.id, Number(room.x), Number(room.y)) :
        null;
      var visual = room.visual;

      if (WORLD_ROOM_TYPES.indexOf(room.roomType) === -1) {
        errors.push(path + ".roomType must be empty, normal, special, or raw.");
      }
      if (world && (Number(room.x) >= Number(world.width) ||
          Number(room.y) >= Number(world.height))) {
        errors.push(path + " lies outside its world dimensions.");
      }
      if (resolved && !resolved.overlap && resolved.id !== room.sectionId) {
        errors.push(path + ".sectionId disagrees with coordinate section ownership.");
      }
      if ((room.roomType === "normal" || room.roomType === "special") &&
          isPlainObject(visual) && visual.encoding === "palette-indexes-v1") {
        if (!Array.isArray(visual.cells) || visual.cells.length !== DISPLAY_CELLS) {
          errors.push(path + ".visual.cells must contain exactly 24 palette indexes.");
        }
      }
      if (room.roomType === "raw") {
        if (!isPlainObject(visual) || visual.encoding !== "segment-bytes-v1" ||
            !Array.isArray(visual.cells) || visual.cells.length !== DISPLAY_CELLS) {
          errors.push(path + ".visual must contain exactly 24 raw segment bytes.");
        } else {
          visual.cells.forEach(function (value, cellIndex) {
            if (!Number.isInteger(value) || value < 0 || value > 255) {
              errors.push(path + ".visual.cells[" + cellIndex + "] must be a byte.");
            }
          });
        }
      }
    });
  }

  function arrayOrEmpty(value) {
    return Array.isArray(value) ? value : [];
  }

  function validateProjectV2(rawProject) {
    var errors = [];
    var warnings = [];
    var repairs = [];
    var sourceVersion = detectProjectVersion(rawProject);
    var source = isPlainObject(rawProject) ? cloneJson(rawProject) : {};
    var project = source;
    var now = isoNow();

    if (sourceVersion !== 2) {
      errors.push(sourceVersion === 1 ?
        "This is a v1 project and must be migrated before v2 validation." :
        "Project format or schemaVersion is not supported.");
    }

    if (project.format !== PROJECT_FORMAT_V2) {
      errors.push("format must be " + PROJECT_FORMAT_V2 + ".");
    }
    if (Number(project.schemaVersion) !== PROJECT_SCHEMA_VERSION_V2) {
      errors.push("schemaVersion must be 2.");
    }

    project.format = PROJECT_FORMAT_V2;
    project.schemaVersion = PROJECT_SCHEMA_VERSION_V2;

    var identity = ensureObject(project, "project", {}, repairs);
    ensureString(identity, "id", "project_untitled", repairs, "project.id");
    ensureString(identity, "title", "Untitled Quest", repairs, "project.title");
    ensureString(identity, "createdAt", now, repairs, "project.createdAt");
    ensureString(identity, "modifiedAt", identity.createdAt, repairs, "project.modifiedAt");
    ensureString(identity, "license", "AGPL-3.0", repairs, "project.license");

    if (project.hardwareProfileId === undefined) {
      project.hardwareProfileId = OFFICIAL_HARDWARE_PROFILE_ID;
      repairs.push("hardwareProfileId was set to the official beta profile.");
    } else if (project.hardwareProfileId !== OFFICIAL_HARDWARE_PROFILE_ID) {
      errors.push("hardwareProfileId is not supported by this beta.");
    }

    var settings = ensureObject(project, "settings", {}, repairs);
    if (typeof settings.displayTestText !== "string") {
      settings.displayTestText = "HELLO";
      repairs.push("settings.displayTestText was replaced with HELLO.");
    } else if (settings.displayTestText.length > DISPLAY_CELLS) {
      settings.displayTestText = settings.displayTestText.slice(0, DISPLAY_CELLS);
      repairs.push("settings.displayTestText was cut to 24 characters.");
    }
    var transitionMs = Number(settings.transitionAnimationMs);
    if (!Number.isFinite(transitionMs)) {
      transitionMs = 500;
      repairs.push("settings.transitionAnimationMs was replaced with 500.");
    }
    settings.transitionAnimationMs = Math.max(0, Math.min(2000, Math.round(transitionMs)));
    if (typeof settings.showRoomCoordinates !== "boolean") {
      settings.showRoomCoordinates = true;
      repairs.push("settings.showRoomCoordinates was replaced with true.");
    }
    var coordinateMs = Number(settings.roomCoordinateTimeMs);
    if (!Number.isFinite(coordinateMs)) {
      coordinateMs = 1000;
      repairs.push("settings.roomCoordinateTimeMs was replaced with 1000.");
    }
    settings.roomCoordinateTimeMs = Math.max(1, Math.min(2000, Math.round(coordinateMs)));
    if (typeof settings.triggerBattles !== "boolean") {
      settings.triggerBattles = false;
      repairs.push("settings.triggerBattles was replaced with false.");
    }
    ensureString(settings, "worldCompressionMode", "global-8-glyph", repairs, "settings.worldCompressionMode");
    ensureString(settings, "language", "en", repairs, "settings.language");
    normalizeTextGlyphs(project);

    V2_LIBRARY_FIELDS.forEach(function (field) {
      ensureArray(project, field, repairs);
      project[field] = project[field].filter(function (entry, index) {
        if (!isPlainObject(entry)) {
          errors.push(field + "[" + index + "] must be an object.");
          return false;
        }
        return true;
      });
    });

    project.worlds.forEach(function (world, index) {
      var roomXs = [];
      var roomYs = [];

      project.rooms.forEach(function (room) {
        var section = project.sections.filter(function (entry) {
          return entry.id === room.sectionId && entry.worldId === world.id;
        })[0];
        if (section) {
          roomXs.push(Number(room.x));
          roomYs.push(Number(room.y));
        }
      });
      if (!Number.isInteger(world.width)) {
        world.width = Math.max(1, Math.min(26, roomXs.length ? Math.max.apply(null, roomXs) + 1 : 1));
        repairs.push("worlds[" + index + "].width was derived from its rooms.");
      }
      if (!Number.isInteger(world.height)) {
        world.height = Math.max(1, Math.min(32, roomYs.length ? Math.max.apply(null, roomYs) + 1 : 1));
        repairs.push("worlds[" + index + "].height was derived from its rooms.");
      }
      if (typeof world.areaType !== "string") {
        world.areaType = WORLD_AREA_TYPES.indexOf(world.kind) !== -1 ? world.kind : "worldmap";
        repairs.push("worlds[" + index + "].areaType was set to worldmap.");
      }
      if (typeof world.paletteMode !== "string") {
        world.paletteMode = "global";
        repairs.push("worlds[" + index + "].paletteMode was set to global.");
      }
      if (!Array.isArray(world.sectionIds)) world.sectionIds = [];
      if (!world.defaultSectionId) {
        world.defaultSectionId = world.sectionIds[0] || null;
        repairs.push("worlds[" + index + "].defaultSectionId was restored.");
      }
    });

    project.sections.forEach(function (section, index) {
      if (!Array.isArray(section.coordinateKeys)) {
        section.coordinateKeys = [];
        repairs.push("sections[" + index + "].coordinateKeys was restored.");
      }
      if (!isPlainObject(section.palette)) section.palette = {};
      if (typeof section.palette.mode !== "string") {
        section.palette.mode = "global";
      }
      if (section.palette.bitsPerCell === undefined) {
        section.palette.bitsPerCell = 3;
      }
      if (!Array.isArray(section.palette.glyphIds)) section.palette.glyphIds = [];
    });

    project.rooms.forEach(function (room) {
      if (typeof room.roomType !== "string") room.roomType = "normal";
    });
    project.heroes.forEach(function (hero, index) {
      normalizeActorCanonicalStats(hero, "heroes[" + index + "]", repairs, true);
    });
    project.enemies.forEach(function (enemy, index) {
      normalizeActorCanonicalStats(enemy, "enemies[" + index + "]", repairs, false);
    });

    var battleRules = ensureObject(project, "battleRules", {}, repairs);
    var eventGraph = ensureObject(project, "eventGraph", {}, repairs);
    var gameFlow = ensureObject(project, "gameFlow", {}, repairs);
    var saveData = ensureObject(project, "saveData", {}, repairs);
    var editor = ensureObject(project, "editor", {}, repairs);
    var extensions = ensureObject(project, "extensions", {}, repairs);

    ensureArray(eventGraph, "entryNodeIds", repairs);
    ensureArray(eventGraph, "nodes", repairs);
    ensureArray(gameFlow, "startingHeroIds", repairs);
    ensureArray(gameFlow, "startingItemIds", repairs);
    if (!Array.isArray(saveData.stateFields) || saveData.stateFields.length === 0) {
      saveData.stateFields = defaultSaveStateFields();
      repairs.push("saveData.stateFields was set to the default position save fields.");
    }
    if (saveData.slotCount !== 3) {
      saveData.slotCount = 3;
      repairs.push("saveData.slotCount was set to 3.");
    }
    if (saveData.mode !== "manualOnly") {
      saveData.mode = "manualOnly";
      repairs.push("saveData.mode was set to manualOnly.");
    }
    if (saveData.wearLeveling !== false) {
      saveData.wearLeveling = false;
      repairs.push("saveData.wearLeveling was set to false.");
    }
    if (!isPlainObject(saveData.saveRules)) {
      saveData.saveRules = {};
      repairs.push("saveData.saveRules was restored.");
    }
    if (saveData.saveRules.worldmap !== "anyTime") {
      saveData.saveRules.worldmap = "anyTime";
      repairs.push("saveData.saveRules.worldmap was set to anyTime.");
    }
    if (saveData.saveRules.town !== "anyTime") {
      saveData.saveRules.town = "anyTime";
      repairs.push("saveData.saveRules.town was set to anyTime.");
    }
    if (saveData.saveRules.dungeon !== "savePointOnly") {
      saveData.saveRules.dungeon = "savePointOnly";
      repairs.push("saveData.saveRules.dungeon was set to savePointOnly.");
    }
    if (saveData.stateDefinitionVersion !== 1) {
      saveData.stateDefinitionVersion = 1;
      repairs.push("saveData.stateDefinitionVersion was set to 1.");
    }
    ensureObject(editor, "toolData", {}, repairs);
    ensureObject(editor, "extensions", {}, repairs);
    ensureObject(saveData, "data", {}, repairs);
    if (gameFlow.data && gameFlow.data.minimalRpg && saveData.data.scope !== "minimal-rpg-v1") {
      saveData.data.scope = "minimal-rpg-v1";
      repairs.push("saveData.data.scope was set to minimal-rpg-v1.");
    }
    if (saveData.data.scope === "minimal-rpg-v1") {
      var saveContract = minimalRpgSaveDataContract();
      var requiredSaveFields = minimalRpgSaveStateFields();
      var currentFieldIds = Array.isArray(saveData.stateFields) ? saveData.stateFields.map(function (field) {
        return field && field.id;
      }) : [];
      var saveFieldsMissing = requiredSaveFields.some(function (field) {
        return currentFieldIds.indexOf(field.id) === -1;
      });

      if (saveFieldsMissing || saveData.stateFields.length !== requiredSaveFields.length) {
        saveData.stateFields = requiredSaveFields;
        repairs.push("saveData.stateFields was upgraded to the minimal RPG EEPROM contract.");
      }
      ["encodingLocked", "payloadBytesPerSlot", "globalHeaderBytes", "slotHeaderBytes", "totalEepromBytes"].forEach(function (key) {
        if (saveData.data[key] !== saveContract[key]) {
          saveData.data[key] = saveContract[key];
          repairs.push("saveData.data." + key + " was set from the minimal RPG EEPROM contract.");
        }
      });
      saveData.data.bitPacking = cloneJson(saveContract.bitPacking);
    }
    ensureObject(battleRules, "data", {}, repairs);
    if (typeof battleRules.calculationMethod !== "string") {
      battleRules.calculationMethod = battleRules.data.calculationMethod || "simple11";
      repairs.push("battleRules.calculationMethod was set to a default.");
    }
    battleRules.data.calculationMethod = battleRules.calculationMethod;
    if (saveData.data.encodingLocked !== true) {
      saveData.data.encodingLocked = true;
      repairs.push("saveData.data.encodingLocked was set to true.");
    }
    ensureObject(extensions, "unrecognizedTopLevel", {}, repairs);

    ensureVersionedData(battleRules, repairs, "battleRules");
    ensureVersionedData(gameFlow, repairs, "gameFlow");
    project.sections.forEach(function (entry, index) {
      ensureVersionedData(entry, repairs, "sections[" + index + "]");
    });
    project.rooms.forEach(function (entry, index) {
      ensureVersionedData(entry, repairs, "rooms[" + index + "]");
    });
    project.interactions.forEach(function (entry, index) {
      ensureVersionedData(entry, repairs, "interactions[" + index + "]");
    });
    project.heroes.forEach(function (entry, index) {
      ensureVersionedData(entry, repairs, "heroes[" + index + "]");
    });
    project.enemies.forEach(function (entry, index) {
      ensureVersionedData(entry, repairs, "enemies[" + index + "]");
    });
    project.encounterGroups.forEach(function (entry, index) {
      ensureVersionedData(entry, repairs, "encounterGroups[" + index + "]");
    });
    project.items.forEach(function (entry, index) {
      ensureVersionedData(entry, repairs, "items[" + index + "]");
    });
    project.equipment.forEach(function (entry, index) {
      ensureVersionedData(entry, repairs, "equipment[" + index + "]");
    });
    project.spells.forEach(function (entry, index) {
      ensureVersionedData(entry, repairs, "spells[" + index + "]");
    });
    project.abilities.forEach(function (entry, index) {
      ensureVersionedData(entry, repairs, "abilities[" + index + "]");
    });
    project.texts.forEach(function (entry, index) {
      ensureVersionedData(entry, repairs, "texts[" + index + "]");
    });
    project.eventGraph.nodes.forEach(function (entry, index) {
      if (isPlainObject(entry)) ensureVersionedData(entry, repairs, "eventGraph.nodes[" + index + "]");
    });

    preserveUnknownRootFields(source, project, warnings);
    var ids = collectV2Ids(project, errors);
    validateV2Frames(project, errors);
    validateV2WorldModel(project, errors);
    validateV2Rooms(project, errors);
    validateV2References(project, ids, errors);

    if (project.rooms.length < 2 || project.heroes.length < 1 || project.enemies.length < 1) {
      warnings.push("Project is structurally editable but does not yet meet the minimum complete-game content.");
    }

    return {
      project: project,
      errors: errors,
      warnings: warnings,
      repairs: repairs,
      sourceVersion: sourceVersion
    };
  }

  function stableIdPart(value, fallback) {
    var id = String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48);

    if (!id || !/^[a-z]/.test(id)) {
      id = fallback || "item";
    }

    return id;
  }

  function mapFrameToSegmentBytes(frame) {
    var normalized = normalizeFrame24(frame);
    var cells = [];
    var c;

    for (var i = 0; i < DISPLAY_CELLS; i += 1) {
      c = normalized.charAt(i);
      if (c === "#" || c === "8") {
        cells.push(0x7F);
      } else if (c === "1") {
        cells.push(0x06);
      } else {
        cells.push(0x00);
      }
    }

    return cells;
  }

  function frameTextFromV2(project, room) {
    if (isPlainObject(room.data) && typeof room.data.pocV1Frame === "string") {
      return normalizeFrame24(room.data.pocV1Frame);
    }
    if (typeof room.frame === "string") {
      return normalizeFrame24(room.frame);
    }

    for (var i = 0; i < project.frames.length; i += 1) {
      if (project.frames[i].id === room.frameId && Array.isArray(project.frames[i].cells)) {
        return project.frames[i].cells.map(function (value) {
          return Number(value) === 0x7F ? "#" : " ";
        }).join("").slice(0, DISPLAY_CELLS).padEnd(DISPLAY_CELLS, " ");
      }
    }

    return normalizeFrame24("");
  }

  function findV2RoomByCoordinates(project, x, y) {
    for (var i = 0; i < project.rooms.length; i += 1) {
      if (Number(project.rooms[i].x) === Number(x) && Number(project.rooms[i].y) === Number(y)) {
        return project.rooms[i];
      }
    }

    return null;
  }

  function findV2Entry(project, field, id) {
    var list = Array.isArray(project[field]) ? project[field] : [];

    for (var i = 0; i < list.length; i += 1) {
      if (list[i].id === id) return list[i];
    }

    return null;
  }

  function defineCompatibilityProperty(object, key, getter, setter) {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: false,
      get: getter,
      set: setter
    });
  }

  function attachV1CompatibilityToV2(project) {
    if (detectProjectVersion(project) !== 2) {
      return project;
    }

    if (!isPlainObject(project.settings)) project.settings = {};
    if (!isPlainObject(project.gameFlow)) project.gameFlow = {};
    if (!isPlainObject(project.gameFlow.data)) project.gameFlow.data = {};
    if (!isPlainObject(project.editor)) project.editor = {};
    if (!isPlainObject(project.editor.toolData)) project.editor.toolData = {};
    if (!isPlainObject(project.editor.toolData.pocV1)) project.editor.toolData.pocV1 = {};

    defineCompatibilityProperty(project, "title", function () {
      return project.project.title;
    }, function (value) {
      project.project.title = String(value || "Untitled Quest");
    });

    defineCompatibilityProperty(project, "displayTestText", function () {
      return project.settings.displayTestText || "";
    }, function (value) {
      project.settings.displayTestText = trimTo24(value);
    });

    var startState = project.gameFlow.data.pocV1Start;
    var startingRoom = findV2Entry(project, "rooms", project.gameFlow.startingRoomId);

    if (!isPlainObject(startState)) {
      startState = {
        roomX: startingRoom ? startingRoom.x : 0,
        roomY: startingRoom ? startingRoom.y : 0
      };
      project.gameFlow.data.pocV1Start = startState;
    }
    if (!isPlainObject(project.gameFlow.startingCell)) {
      project.gameFlow.startingCell = { x: 0, y: 0 };
    }

    function syncStartingRoom() {
      var room = findV2RoomByCoordinates(project, startState.roomX, startState.roomY);
      if (room) project.gameFlow.startingRoomId = room.id;
    }

    var startView = {};
    defineCompatibilityProperty(startView, "roomX", function () {
      return Number(startState.roomX) || 0;
    }, function (value) {
      startState.roomX = Number(value) || 0;
      syncStartingRoom();
    });
    defineCompatibilityProperty(startView, "roomY", function () {
      return Number(startState.roomY) || 0;
    }, function (value) {
      startState.roomY = Number(value) || 0;
      syncStartingRoom();
    });
    defineCompatibilityProperty(startView, "playerX", function () {
      return Number(project.gameFlow.startingCell.x) || 0;
    }, function (value) {
      project.gameFlow.startingCell.x = Number(value) || 0;
    });
    defineCompatibilityProperty(startView, "playerY", function () {
      return Number(project.gameFlow.startingCell.y) || 0;
    }, function (value) {
      project.gameFlow.startingCell.y = Number(value) || 0;
    });
    defineCompatibilityProperty(project, "start", function () {
      return startView;
    }, function (value) {
      if (!isPlainObject(value)) return;
      startView.roomX = value.roomX;
      startView.roomY = value.roomY;
      startView.playerX = value.playerX;
      startView.playerY = value.playerY;
    });

    var hero = project.heroes[0];
    var enemy = project.enemies[0];
    var battleView = {};

    function heroStats() {
      if (!hero) {
        hero = { id: "hero_you1", name: "You1", stats: {}, dataVersion: 1, data: {} };
        project.heroes.push(hero);
      }
      if (!isPlainObject(hero.stats)) hero.stats = {};
      return hero.stats;
    }

    function enemyStats() {
      if (!enemy) {
        enemy = { id: "enemy_one", name: "Foe", stats: {}, dataVersion: 1, data: {} };
        project.enemies.push(enemy);
      }
      if (!isPlainObject(enemy.stats)) enemy.stats = {};
      return enemy.stats;
    }

    defineCompatibilityProperty(battleView, "playerHp", function () {
      return Number(heroStats().maxHp) || 99;
    }, function (value) {
      heroStats().maxHp = Number(value) || 99;
    });
    defineCompatibilityProperty(battleView, "beastHp", function () {
      return Number(enemyStats().maxHp) || 50;
    }, function (value) {
      enemyStats().maxHp = Number(value) || 50;
    });
    defineCompatibilityProperty(battleView, "playerAttack", function () {
      return Number(heroStats().attack) || 10;
    }, function (value) {
      heroStats().attack = Number(value) || 10;
    });
    defineCompatibilityProperty(battleView, "playerHeal", function () {
      return Number(heroStats().healing) || 50;
    }, function (value) {
      heroStats().healing = Number(value) || 50;
    });
    defineCompatibilityProperty(project, "battle", function () {
      return battleView;
    }, function (value) {
      if (!isPlainObject(value)) return;
      battleView.playerHp = value.playerHp;
      battleView.beastHp = value.beastHp;
      battleView.playerAttack = value.playerAttack;
      battleView.playerHeal = value.playerHeal;
    });

    var hardwareView = {};
    defineCompatibilityProperty(hardwareView, "transitionAnimationMs", function () {
      return Number(project.settings.transitionAnimationMs) || 0;
    }, function (value) {
      project.settings.transitionAnimationMs = Number(value) || 0;
    });
    defineCompatibilityProperty(hardwareView, "showCoordinates", function () {
      return project.settings.showRoomCoordinates !== false;
    }, function (value) {
      project.settings.showRoomCoordinates = value !== false;
    });
    defineCompatibilityProperty(hardwareView, "coordinateTimeMs", function () {
      return Number(project.settings.roomCoordinateTimeMs) || 1000;
    }, function (value) {
      project.settings.roomCoordinateTimeMs = Number(value) || 1000;
    });
    defineCompatibilityProperty(hardwareView, "triggerBattles", function () {
      return project.settings.triggerBattles === true;
    }, function (value) {
      project.settings.triggerBattles = value === true;
    });
    defineCompatibilityProperty(project, "hardware", function () {
      return hardwareView;
    }, function (value) {
      if (!isPlainObject(value)) return;
      hardwareView.transitionAnimationMs = value.transitionAnimationMs;
      hardwareView.showCoordinates = value.showCoordinates;
      hardwareView.coordinateTimeMs = value.coordinateTimeMs;
      hardwareView.triggerBattles = value.triggerBattles;
    });

    project.rooms.forEach(function (room) {
      if (!isPlainObject(room.data)) room.data = {};
      if (typeof room.data.pocV1Frame !== "string") {
        room.data.pocV1Frame = frameTextFromV2(project, room);
      }
      defineCompatibilityProperty(room, "frame", function () {
        return normalizeFrame24(room.data.pocV1Frame);
      }, function (value) {
        room.data.pocV1Frame = normalizeFrame24(value);
      });
    });

    return project;
  }

  function prepareV2ProjectForValidation(rawProject) {
    var project = cloneJson(rawProject);
    var defaultSection;
    var usedRoomIds = {};
    var frameById = {};

    if (detectProjectVersion(project) !== 2) {
      return project;
    }

    if (!Array.isArray(project.frames)) project.frames = [];
    if (!Array.isArray(project.rooms)) project.rooms = [];
    if (!Array.isArray(project.sections)) project.sections = [];
    if (!Array.isArray(project.worlds)) project.worlds = [];

    if (!project.worlds.length) {
      project.worlds.push({
        id: "world_main",
        name: "Main world",
        kind: "worldmap",
        areaType: "worldmap",
        width: 1,
        height: 1,
        paletteMode: "global",
        sectionIds: ["section_main"],
        defaultSectionId: "section_main",
        startRoomId: null
      });
    }
    if (!project.sections.length) {
      project.sections.push({
        id: "section_main",
        worldId: project.worlds[0].id,
        name: "Main",
        kind: "biome",
        roomIds: [],
        coordinateKeys: [],
        palette: { mode: "global", bitsPerCell: 3, glyphIds: [] },
        dataVersion: 1,
        data: {}
      });
    }
    defaultSection = project.sections[0];
    project.worlds.forEach(function (world) {
      if (!Number.isInteger(world.width)) world.width = 1;
      if (!Number.isInteger(world.height)) world.height = 1;
      if (!world.areaType) world.areaType = WORLD_AREA_TYPES.indexOf(world.kind) !== -1 ?
        world.kind :
        "worldmap";
      if (!world.paletteMode) world.paletteMode = "global";
      if (!world.defaultSectionId) world.defaultSectionId =
        arrayOrEmpty(world.sectionIds)[0] || defaultSection.id;
    });
    project.sections.forEach(function (section) {
      if (!Array.isArray(section.coordinateKeys)) section.coordinateKeys = [];
      if (!isPlainObject(section.palette)) section.palette = {};
      if (!section.palette.mode) section.palette.mode = "global";
      if (!section.palette.bitsPerCell) section.palette.bitsPerCell = 3;
      if (!Array.isArray(section.palette.glyphIds)) section.palette.glyphIds = [];
    });

    project.frames.forEach(function (frame) {
      if (isPlainObject(frame) && typeof frame.id === "string") frameById[frame.id] = frame;
    });

    project.rooms.forEach(function (room, index) {
      var baseId = "room_" + roomXLabel(room.x) + String(Math.max(0, Number(room.y) || 0)).padStart(2, "0");
      var roomId = V2_ID_PATTERN.test(room.id || "") ? room.id : baseId;
      var suffix = 2;
      var frameText = normalizeFrame24(
        typeof room.frame === "string" ? room.frame :
          (isPlainObject(room.data) ? room.data.pocV1Frame : "")
      );
      var ownedSection = null;

      while (usedRoomIds[roomId]) {
        roomId = baseId + "_" + suffix;
        suffix += 1;
      }
      usedRoomIds[roomId] = true;
      room.id = roomId;
      if (!findV2Entry(project, "sections", room.sectionId)) {
        project.worlds.some(function (world) {
          var section = resolveSectionForCoordinate(project, world.id, Number(room.x), Number(room.y));
          if (section && !section.overlap) {
            ownedSection = section;
            return true;
          }
          return false;
        });
        room.sectionId = ownedSection ? ownedSection.id : defaultSection.id;
      }
      if (!isPlainObject(room.data)) room.data = {};
      room.data.pocV1Frame = frameText;
      room.dataVersion = Number.isInteger(room.dataVersion) ? room.dataVersion : 1;
      if (!Array.isArray(room.interactionIds)) room.interactionIds = [];
      if (!Array.isArray(room.encounterGroupIds)) room.encounterGroupIds = [];
      if (room.musicId === undefined) room.musicId = null;
      if (typeof room.roomType !== "string") room.roomType = "normal";

      if (V2_ID_PATTERN.test(room.frameId || "")) {
        if (!frameById[room.frameId]) {
          frameById[room.frameId] = {
            id: room.frameId,
            name: "Room " + roomXLabel(room.x).toUpperCase() + "." + String(room.y).padStart(2, "0"),
            width: 8,
            height: 3,
            encoding: "segment-bytes-v1",
            cells: mapFrameToSegmentBytes(frameText),
            tags: ["room"],
            editor: {
              notes: ""
            },
            dataVersion: 1,
            data: {}
          };
          project.frames.push(frameById[room.frameId]);
        } else {
          frameById[room.frameId].cells = mapFrameToSegmentBytes(frameText);
        }
      } else {
        room.frameId = null;
      }
      delete room.frame;
    });

    project.sections.forEach(function (section) {
      section.roomIds = project.rooms.filter(function (room) {
        return room.sectionId === section.id;
      }).map(function (room) {
        return room.id;
      });
    });

    if (project.gameFlow && project.gameFlow.data && project.gameFlow.data.pocV1Start) {
      var startState = project.gameFlow.data.pocV1Start;
      var startRoom = findV2RoomByCoordinates(project, startState.roomX, startState.roomY);
      if (startRoom) {
        project.gameFlow.startingRoomId = startRoom.id;
        project.worlds[0].startRoomId = startRoom.id;
      }
    }

    return project;
  }

  function migrateProjectV1ToV2(rawProject) {
    var errors = [];
    var warnings = [];
    var repairs = [];
    var sourceVersion = detectProjectVersion(rawProject);
    var v1Validation;
    var source;
    var project;
    var knownV1 = {
      title: true,
      displayTestText: true,
      rooms: true,
      start: true,
      battle: true,
      hardware: true
    };
    var preservedLegacyData = {};
    var mappings = [
      "title -> project.title",
      "displayTestText -> settings.displayTestText",
      "hardware -> settings",
      "rooms -> worlds/sections/rooms/frames",
      "start -> gameFlow",
      "battle -> heroes/enemies/battleRules.data"
    ];

    if (sourceVersion !== 1) {
      return {
        project: null,
        errors: [sourceVersion === 2 ? "Project is already schema v2." : "File is not a recognized v1 project."],
        warnings: [],
        repairs: [],
        sourceVersion: sourceVersion,
        migrationReport: null
      };
    }

    source = cloneJson(rawProject);
    v1Validation = validateProjectData(source);
    repairs = v1Validation.warnings.slice();

    Object.keys(source).forEach(function (key) {
      if (!knownV1[key]) preservedLegacyData[key] = cloneJson(source[key]);
    });

    project = createDefaultProjectV2();
    project.worlds = [
      {
        id: "world_main",
        name: "Main world",
        kind: "worldmap",
        areaType: "worldmap",
        width: 1,
        height: 1,
        paletteMode: "global",
        sectionIds: ["section_main"],
        defaultSectionId: "section_main",
        startRoomId: null
      }
    ];
    project.sections = [
      {
        id: "section_main",
        worldId: "world_main",
        name: "Main",
        kind: "biome",
        roomIds: [],
        coordinateKeys: [],
        palette: {
          mode: "global",
          bitsPerCell: 3,
          glyphIds: []
        },
        dataVersion: 1,
        data: {}
      }
    ];
    project.interactions = [];
    project.encounterGroups = [
      {
        id: "encounter_one_enemy",
        name: "One enemy",
        members: [
          {
            enemyId: project.enemies[0].id,
            position: { x: 0, y: 0 }
          }
        ],
        weight: 10,
        conditions: [],
        dataVersion: 1,
        data: {}
      }
    ];
    project.items = [];
    project.equipment = [];
    project.texts = [];
    project.eventGraph = {
      entryNodeIds: ["event_game_start"],
      nodes: [
        {
          id: "event_game_start",
          type: "start",
          nextIds: [],
          dataVersion: 1,
          data: {}
        }
      ]
    };
    project.gameFlow.victoryEventNodeId = null;
    project.gameFlow.defeatEventNodeId = null;
    project.gameFlow.data = {};
    project.saveData.stateFields = defaultSaveStateFields();
    project.saveData.data = { encodingLocked: true };
    project.project.id = "project_" + stableIdPart(v1Validation.project.title, "migrated");
    project.project.title = v1Validation.project.title;
    project.settings.displayTestText = v1Validation.project.displayTestText;
    project.settings.transitionAnimationMs = v1Validation.project.hardware.transitionAnimationMs;
    project.settings.showRoomCoordinates = v1Validation.project.hardware.showCoordinates;
    project.settings.roomCoordinateTimeMs = v1Validation.project.hardware.coordinateTimeMs;
    project.settings.triggerBattles = false;

    project.frames = [];
    project.rooms = v1Validation.project.rooms.map(function (room) {
      var roomId = "room_" + roomXLabel(room.x) + String(room.y).padStart(2, "0");
      var frameId = "frame_" + roomId.slice(5);
      project.frames.push({
        id: frameId,
        name: "Room " + roomXLabel(room.x).toUpperCase() + "." + String(room.y).padStart(2, "0"),
        width: 8,
        height: 3,
        encoding: "segment-bytes-v1",
        cells: mapFrameToSegmentBytes(room.frame),
        tags: ["room"]
      });
      return {
        id: roomId,
        sectionId: "section_main",
        x: room.x,
        y: room.y,
        roomType: "normal",
        frameId: frameId,
        interactionIds: [],
        encounterGroupIds: room.x === v1Validation.project.start.roomX &&
          room.y === v1Validation.project.start.roomY ? ["encounter_one_enemy"] : [],
        musicId: null,
        dataVersion: 1,
        data: { pocV1Frame: room.frame }
      };
    });
    project.sections[0].roomIds = project.rooms.map(function (room) { return room.id; });
    project.worlds[0].width = Math.max.apply(null, project.rooms.map(function (room) {
      return Number(room.x) + 1;
    }));
    project.worlds[0].height = Math.max.apply(null, project.rooms.map(function (room) {
      return Number(room.y) + 1;
    }));
    project.worlds[0].areaType = "worldmap";
    project.worlds[0].paletteMode = "global";
    project.worlds[0].defaultSectionId = "section_main";
    project.sections[0].coordinateKeys = [];
    project.sections[0].palette.bitsPerCell = 3;

    var startRoom = findV2RoomByCoordinates(
      project,
      v1Validation.project.start.roomX,
      v1Validation.project.start.roomY
    ) || project.rooms[0];
    project.worlds[0].startRoomId = startRoom.id;
    project.gameFlow.startingRoomId = startRoom.id;
    project.gameFlow.startingCell = {
      x: v1Validation.project.start.playerX,
      y: v1Validation.project.start.playerY
    };
    project.gameFlow.data.pocV1Start = {
      roomX: startRoom.x,
      roomY: startRoom.y
    };

    project.heroes[0].stats.maxHp = v1Validation.project.battle.playerHp;
    project.heroes[0].stats.maxHP = v1Validation.project.battle.playerHp;
    project.heroes[0].stats.currentHP = v1Validation.project.battle.playerHp;
    project.heroes[0].stats.attack = v1Validation.project.battle.playerAttack;
    project.heroes[0].stats.attackPower = v1Validation.project.battle.playerAttack;
    project.heroes[0].stats.healing = v1Validation.project.battle.playerHeal;
    project.heroes[0].stats.healPower = v1Validation.project.battle.playerHeal;
    project.enemies[0].stats.maxHp = v1Validation.project.battle.beastHp;
    project.enemies[0].stats.maxHP = v1Validation.project.battle.beastHp;
    project.enemies[0].stats.currentHP = v1Validation.project.battle.beastHp;
    project.battleRules.data.pocV1Battle = cloneJson(v1Validation.project.battle);

    project.migration = {
      sourceFormat: "sevenseg-poc-v1",
      sourceSchemaVersion: 1,
      migratedAt: isoNow(),
      migrationToolVersion: "b04-p03",
      repairs: repairs.slice(),
      warnings: warnings.slice(),
      preservedLegacyData: preservedLegacyData
    };

    var prepared = prepareV2ProjectForValidation(project);
    var validation = validateProjectV2(prepared);
    errors = validation.errors.slice();
    warnings = warnings.concat(validation.warnings);
    repairs = repairs.concat(validation.repairs);

    if (errors.length) {
      return {
        project: null,
        errors: errors,
        warnings: warnings,
        repairs: repairs,
        sourceVersion: 1,
        migrationReport: {
          sourceVersion: 1,
          targetVersion: 2,
          mappedRooms: project.rooms.length,
          mappings: mappings.slice(),
          preservedUnknownFields: Object.keys(preservedLegacyData),
          errors: errors.slice(),
          warnings: warnings.slice(),
          repairs: repairs.slice()
        }
      };
    }

    validation.project.migration.repairs = repairs.slice();
    validation.project.migration.warnings = warnings.slice();
    validation.project.migration.report = {
      sourceVersion: 1,
      targetVersion: 2,
      mappedRooms: validation.project.rooms.length,
      mappings: mappings.slice(),
      preservedUnknownFields: Object.keys(preservedLegacyData)
    };
    attachV1CompatibilityToV2(validation.project);
    return {
      project: validation.project,
      errors: [],
      warnings: warnings,
      repairs: repairs,
      sourceVersion: 1,
      migrationReport: {
        sourceVersion: 1,
        targetVersion: 2,
        mappedRooms: validation.project.rooms.length,
        mappings: mappings.slice(),
        preservedUnknownFields: Object.keys(preservedLegacyData),
        errors: [],
        warnings: warnings.slice(),
        repairs: repairs.slice()
      }
    };
  }

  var defaultProject = {
    title: "SevenSeg Quest Maker Project",
    displayTestText: "HELLO",
    rooms: [
      {
        x: 0,
        y: 0,
        frame: normalizeFrame24("")
      }
    ],
    start: {
      roomX: 0,
      roomY: 0,
      playerX: 0,
      playerY: 0
    },
    battle: {
      playerHp: 99,
      beastHp: 50,
      playerAttack: 10,
      playerHeal: 50
    },
    hardware: {
      transitionAnimationMs: 500,
      showCoordinates: true,
      coordinateTimeMs: 1000,
      triggerBattles: false
    },
    settings: {
      textGlyphs: defaultTextGlyphs()
    }
  };

  window.SevenSegModel = {
    DISPLAY_COLS: DISPLAY_COLS,
    DISPLAY_ROWS: DISPLAY_ROWS,
    DISPLAY_CELLS: DISPLAY_CELLS,
    ROOM_X_COUNT: ROOM_X_COUNT,
    ROOM_Y_MIN: ROOM_Y_MIN,
    ROOM_Y_MAX: ROOM_Y_MAX,
    TEXT_ERROR_1_TO_24: TEXT_ERROR_1_TO_24,
    cellIndex: cellIndex,
    xyFromIndex: xyFromIndex,
    padFrame24: padFrame24,
    trimTo24: trimTo24,
    validateText1to24: validateText1to24,
    normalizeFrame24: normalizeFrame24,
    TEXT_GLYPH_CHARACTERS: TEXT_GLYPH_CHARACTERS,
    defaultTextGlyphs: defaultTextGlyphs,
    normalizeTextGlyphs: normalizeTextGlyphs,
    textGlyphByte: textGlyphByte,
    setTextGlyphByte: setTextGlyphByte,
    normalizeHardwareSettings: normalizeHardwareSettings,
    validateProjectData: validateProjectData,
    PROJECT_FORMAT_V2: PROJECT_FORMAT_V2,
    PROJECT_SCHEMA_VERSION_V2: PROJECT_SCHEMA_VERSION_V2,
    OFFICIAL_HARDWARE_PROFILE_ID: OFFICIAL_HARDWARE_PROFILE_ID,
    WORLD_WIDTH_MIN: WORLD_WIDTH_MIN,
    WORLD_WIDTH_MAX: WORLD_WIDTH_MAX,
    WORLD_HEIGHT_MIN: WORLD_HEIGHT_MIN,
    WORLD_HEIGHT_MAX: WORLD_HEIGHT_MAX,
    WORLD_SECTION_MAX: WORLD_SECTION_MAX,
    WORLD_AREA_TYPES: WORLD_AREA_TYPES.slice(),
    WORLD_ROOM_TYPES: WORLD_ROOM_TYPES.slice(),
    WORLD_PALETTE_MODES: WORLD_PALETTE_MODES.slice(),
    WORLD_PALETTE_BITS: WORLD_PALETTE_BITS.slice(),
    createDefaultProjectV2: createDefaultProjectV2,
    detectProjectVersion: detectProjectVersion,
    validateProjectV2: validateProjectV2,
    attachV1CompatibilityToV2: attachV1CompatibilityToV2,
    prepareV2ProjectForValidation: prepareV2ProjectForValidation,
    migrateProjectV1ToV2: migrateProjectV1ToV2,
    worldCoordinateKey: worldCoordinateKey,
    parseWorldCoordinateKey: parseWorldCoordinateKey,
    resolveSectionForCoordinate: resolveSectionForCoordinate,
    resolveEffectiveRoom: resolveEffectiveRoom,
    roomXLabel: roomXLabel,
    roomKey: roomKey,
    findRoom: findRoom,
    defaultProject: defaultProject
  };

  window.DISPLAY_COLS = DISPLAY_COLS;
  window.DISPLAY_ROWS = DISPLAY_ROWS;
  window.DISPLAY_CELLS = DISPLAY_CELLS;
  window.ROOM_X_COUNT = ROOM_X_COUNT;
  window.ROOM_Y_MIN = ROOM_Y_MIN;
  window.ROOM_Y_MAX = ROOM_Y_MAX;
  window.cellIndex = cellIndex;
  window.xyFromIndex = xyFromIndex;
  window.padFrame24 = padFrame24;
  window.trimTo24 = trimTo24;
  window.validateText1to24 = validateText1to24;
  window.normalizeFrame24 = normalizeFrame24;
  window.normalizeHardwareSettings = normalizeHardwareSettings;
  window.validateProjectData = validateProjectData;
  window.createDefaultProjectV2 = createDefaultProjectV2;
  window.detectProjectVersion = detectProjectVersion;
  window.validateProjectV2 = validateProjectV2;
  window.attachV1CompatibilityToV2 = attachV1CompatibilityToV2;
  window.prepareV2ProjectForValidation = prepareV2ProjectForValidation;
  window.migrateProjectV1ToV2 = migrateProjectV1ToV2;
  window.roomXLabel = roomXLabel;
  window.roomKey = roomKey;
  window.findRoom = findRoom;
  window.defaultProject = defaultProject;
}());

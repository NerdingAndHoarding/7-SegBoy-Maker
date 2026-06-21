(function () {
  "use strict";

  var model = null;
  var project = null;
  var statusHandler = null;
  var cells = [];
  var battle = null;
  var battleActive = false;
  var busy = false;
  var pendingAction = "";
  var currentTextMenu = null;
  var selectedTarget = "foe1";
  var blinkOn = true;
  var blinkTimer = null;
  var actorPromptPage = 0;
  var actorPromptStartedAt = 0;
  var actorPromptLastBlinkAt = 0;
  var chargeTimer = null;
  var endHandler = null;
  var endMessageDismissHandler = null;
  var changeHandler = null;
  var displayElementId = "battleGrid";
  var TIMER_FULL = 28800;
  var TIMER_DOT_COUNT = 4;
  var TIMER_TICK_MS = 50;
  var ACTOR_YOU1 = 0;
  var ACTOR_YOU2 = 1;
  var ACTOR_FOE1 = 2;
  var ACTOR_FOE2 = 3;
  var ACTOR_COUNT = 4;
  var DEFEATED_BLINK_STEPS = 5;
  var DEFEATED_BLINK_MS = 200;
  var VICTORY_TEXT_ID = "text_victory";
  var GAME_OVER_TEXT_ID = "text_game_over";
  var BATTLE_ANIMATION_STATE = {
    hitCommand: "attack",
    magicCommand: "cast",
    targetHit: "hit",
    defeated: "defeated"
  };
  var BATTLE_CALC_METHODS = [
    { id: "dnd5e", name: "1. Dungeons & Dragons 5e" },
    { id: "pathfinder2e", name: "2. Pathfinder 2e" },
    { id: "gurps", name: "3. GURPS" },
    { id: "fate", name: "4. Fate Core" },
    { id: "coc", name: "5. Call of Cthulhu / BRP" },
    { id: "shadowrun5e", name: "6. Shadowrun 5e" },
    { id: "worldofdarkness", name: "7. World of Darkness / Storyteller" },
    { id: "ff1", name: "8. Final Fantasy I NES" },
    { id: "dragonquest", name: "9. Dragon Quest NES" },
    { id: "pokemon", name: "10. Pokemon" },
    { id: "simple11", name: "11. Ultra simple attack vs defense" }
  ];
  var SEGMENT_ORDER = ["a", "b", "c", "d", "e", "f", "g", "dp"];
  var SEGMENT_BITS = {
    a: 0x40,
    b: 0x20,
    c: 0x10,
    d: 0x08,
    e: 0x04,
    f: 0x02,
    g: 0x01,
    dp: 0x80
  };
  var DEFAULT_BATTLE_EFFECT_FRAME = [0, 0, SEGMENT_BITS.g, SEGMENT_BITS.g, SEGMENT_BITS.g, SEGMENT_BITS.g, 0, 0];
  var SEGMENT_POINTS = {
    a: "1,1 2,0 8,0 9,1 8,2 2,2",
    b: "9,1 10,2 10,8 9,9 8,8 8,2",
    c: "9,9 10,10 10,16 9,17 8,16 8,10",
    d: "9,17 8,18 2,18 1,17 2,16 8,16",
    e: "2,17 0,16 0,10 2,9 3,10 3,16",
    f: "2,9 0,8 0,2 2,1 3,2 3,8",
    g: "1,9 2,8 8,8 9,9 8,10 2,10",
    dp: "11,16 13,16 13,18 11,18"
  };
  var SEGMENT_GLYPHS = {
    " ": 0x00,
    "-": SEGMENT_BITS.g,
    "_": SEGMENT_BITS.d,
    ".": SEGMENT_BITS.dp,
    "0": SEGMENT_BITS.a | SEGMENT_BITS.b | SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.e | SEGMENT_BITS.f,
    "1": SEGMENT_BITS.b | SEGMENT_BITS.c,
    "2": SEGMENT_BITS.a | SEGMENT_BITS.b | SEGMENT_BITS.d | SEGMENT_BITS.e | SEGMENT_BITS.g,
    "3": SEGMENT_BITS.a | SEGMENT_BITS.b | SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.g,
    "4": SEGMENT_BITS.b | SEGMENT_BITS.c | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "5": SEGMENT_BITS.a | SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "6": SEGMENT_BITS.a | SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.e | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "7": SEGMENT_BITS.a | SEGMENT_BITS.b | SEGMENT_BITS.c,
    "8": SEGMENT_BITS.a | SEGMENT_BITS.b | SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.e | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "9": SEGMENT_BITS.a | SEGMENT_BITS.b | SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "A": SEGMENT_BITS.a | SEGMENT_BITS.b | SEGMENT_BITS.c | SEGMENT_BITS.e | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "B": SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.e | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "C": SEGMENT_BITS.a | SEGMENT_BITS.d | SEGMENT_BITS.e | SEGMENT_BITS.f,
    "D": SEGMENT_BITS.b | SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.e | SEGMENT_BITS.g,
    "E": SEGMENT_BITS.a | SEGMENT_BITS.d | SEGMENT_BITS.e | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "F": SEGMENT_BITS.a | SEGMENT_BITS.e | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "G": SEGMENT_BITS.a | SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.e | SEGMENT_BITS.f,
    "H": SEGMENT_BITS.b | SEGMENT_BITS.c | SEGMENT_BITS.e | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "I": SEGMENT_BITS.b | SEGMENT_BITS.c,
    "J": SEGMENT_BITS.b | SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.e,
    "K": SEGMENT_BITS.e | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "L": SEGMENT_BITS.d | SEGMENT_BITS.e | SEGMENT_BITS.f,
    "M": SEGMENT_BITS.a | SEGMENT_BITS.c | SEGMENT_BITS.e,
    "N": SEGMENT_BITS.c | SEGMENT_BITS.e | SEGMENT_BITS.g,
    "O": SEGMENT_BITS.a | SEGMENT_BITS.b | SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.e | SEGMENT_BITS.f,
    "P": SEGMENT_BITS.a | SEGMENT_BITS.b | SEGMENT_BITS.e | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "Q": SEGMENT_BITS.a | SEGMENT_BITS.b | SEGMENT_BITS.c | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "R": SEGMENT_BITS.e | SEGMENT_BITS.g,
    "S": SEGMENT_BITS.a | SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "T": SEGMENT_BITS.d | SEGMENT_BITS.e | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "U": SEGMENT_BITS.b | SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.e | SEGMENT_BITS.f,
    "V": SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.e,
    "W": SEGMENT_BITS.b | SEGMENT_BITS.d | SEGMENT_BITS.f,
    "X": SEGMENT_BITS.b | SEGMENT_BITS.c | SEGMENT_BITS.e | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "Y": SEGMENT_BITS.b | SEGMENT_BITS.c | SEGMENT_BITS.d | SEGMENT_BITS.f | SEGMENT_BITS.g,
    "Z": SEGMENT_BITS.a | SEGMENT_BITS.b | SEGMENT_BITS.d | SEGMENT_BITS.e | SEGMENT_BITS.g
  };

  var textMenus = {
    main: {
      phase: "menu",
      items: [
        { label: "HIT", kind: "target", action: "hit" },
        { label: "HEAL", kind: "target", action: "heal" },
        { label: "MAGIC", kind: "submenu", menu: "magic" },
        { label: "ITEM", kind: "submenu", menu: "items" }
      ]
    },
    magic: {
      phase: "magic",
      items: [
        { label: "M1", kind: "test" },
        { label: "M2", kind: "test" },
        { label: "M3", kind: "test" },
        { label: "M4", kind: "test" },
        { label: "M5", kind: "test" }
      ]
    },
    items: {
      phase: "items",
      items: [
        { label: "NO POT", kind: "none" }
      ]
    }
  };

  function setStatus(message) {
    if (statusHandler) {
      statusHandler(message);
    }
  }

  function readableName(name) {
    var text = String(name || "").trim();

    if (!text) {
      return "";
    }

    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  function readSetting(id, fallback) {
    var value = Number(document.getElementById(id).value);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  function clampStat(value, fallback, min, max) {
    var number = Number(value);

    if (!Number.isFinite(number)) {
      number = fallback;
    }

    return Math.max(min, Math.min(max, Math.round(number)));
  }

  function statValue(stats, names, fallback) {
    for (var index = 0; index < names.length; index += 1) {
      if (stats && stats[names[index]] !== undefined) {
        return Number(stats[names[index]]);
      }
    }

    return fallback;
  }

  function clampResist(value) {
    return clampStat(value, 0, -100, 100);
  }

  function makeBonus() {
    return {
      hp: 0,
      mp: 0,
      str: 0,
      dex: 0,
      int: 0,
      wis: 0,
      con: 0,
      attack: 0,
      magicAttack: 0,
      armor: 0,
      magicArmor: 0,
      speed: 0,
      crit: 0,
      dodge: 0,
      hitRate: 0,
      fireRes: 0,
      iceRes: 0,
      poisonRes: 0,
      darkRes: 0,
      holyRes: 0
    };
  }

  function emptyBattleStats(name) {
    return {
      name: name,
      level: 0,
      maxHp: 0,
      currentHp: 0,
      maxMp: 0,
      currentMp: 0,
      str: 0,
      dex: 0,
      int: 0,
      wis: 0,
      con: 0,
      attack: 0,
      magicAttack: 0,
      armor: 0,
      magicArmor: 0,
      speed: 0,
      crit: 0,
      dodge: 0,
      hitRate: 0,
      fireRes: 0,
      iceRes: 0,
      poisonRes: 0,
      darkRes: 0,
      holyRes: 0,
      healing: 0,
      swiftness: 0,
      visualByte: 0,
      equippedItemIds: []
    };
  }

  function importedVisuals(source) {
    return source && source.data && source.data.importedVisuals ? source.data.importedVisuals : null;
  }

  function animationForState(visuals, stateName, isHero) {
    if (!visuals) {
      return null;
    }

    if (visuals[stateName]) {
      return visuals[stateName];
    }

    if (!isHero && stateName === "defeated" && visuals.hit) {
      return visuals.hit;
    }
    if (stateName === "heal" && visuals.cast) {
      return visuals.cast;
    }
    if (stateName === "cast" && visuals.attack) {
      return visuals.attack;
    }
    if (stateName !== "idle" && visuals.idle) {
      return visuals.idle;
    }

    return null;
  }

  function firstFrameByteFromAnimation(animation) {
    var frame;
    var value;

    if (!animation || !Array.isArray(animation.frames) || !animation.frames.length) {
      return null;
    }

    frame = animation.frames[0];
    if (Array.isArray(frame)) {
      value = Number(frame[0]);
    } else {
      value = Number(frame);
    }

    if (Number.isInteger(value) && value >= 0 && value <= 255) {
      return value;
    }

    return null;
  }

  function firstAnimationFrameByte(source) {
    return firstFrameByteFromAnimation(animationForState(importedVisuals(source), "idle", true));
  }

  function visualStateByteFromStats(stats, stateName, fallbackText, isHero) {
    var visuals = stats && stats.importedVisuals;
    var byte = firstFrameByteFromAnimation(animationForState(visuals, stateName || "idle", isHero));

    if (byte !== null) {
      return byte;
    }

    if (stats && Number.isInteger(stats.visualByte) && stats.visualByte >= 0 && stats.visualByte <= 255) {
      return stats.visualByte;
    }

    return charToSegmentByte(fallbackText);
  }

  var fallbackEquipmentFactors = {
    what: [
      { name: "Empty", slot: "none" },
      { name: "Sword", slot: "weapon", attack: 4, allowedClassMask: 255 },
      { name: "Axe", slot: "weapon", attack: 6, speed: -1, allowedClassMask: 255 },
      { name: "Dagger", slot: "weapon", attack: 2, speed: 1, hitRate: 3, allowedClassMask: 255 },
      { name: "Wand", slot: "weapon", magicAttack: 5, hitRate: 1, allowedClassMask: 255 },
      { name: "Shield", slot: "shield", armor: 3, dodge: -1, speed: -1, allowedClassMask: 255 },
      { name: "Armor", slot: "armor", armor: 8, magicArmor: 1, allowedClassMask: 255 },
      { name: "Helmet", slot: "armor", armor: 2, magicArmor: 1, allowedClassMask: 255 },
      { name: "Ring", slot: "accessory", magicArmor: 2, allowedClassMask: 255 }
    ],
    material: [
      { name: "Plain" },
      { name: "Wood", attack: 1, magicAttack: 1 },
      { name: "Iron", attack: 4, armor: 5, speed: -1 },
      { name: "Steel", attack: 10, armor: 8, speed: -1 },
      { name: "Silver", attack: 6, armor: 4, magicAttack: 4, magicArmor: 3, holyRes: 5 },
      { name: "Mythril", attack: 8, armor: 6, magicAttack: 6, magicArmor: 6, speed: 1 },
      { name: "Bone", attack: 3, armor: 2, poisonRes: 5 },
      { name: "Crystal", attack: 2, armor: 1, magicAttack: 8, magicArmor: 8 }
    ],
    size: [
      { name: "Tiny", attack: -1, speed: 2, dodge: 2, minStr: 0 },
      { name: "Small", speed: 1, dodge: 1, minStr: 0 },
      { name: "Medium", attack: 3, armor: 3, minStr: 0 },
      { name: "Large", attack: 10, armor: 3, speed: -2, dodge: -1, minStr: 8 },
      { name: "Giant", attack: 14, armor: 5, speed: -4, dodge: -3, minStr: 14 },
      { name: "Light", speed: 2, dodge: 1, minStr: 0 },
      { name: "Heavy", attack: 6, armor: 6, speed: -3, dodge: -2, minStr: 10 },
      { name: "Magic", magicAttack: 5, magicArmor: 4, minStr: 0 }
    ]
  };

  function projectEquipmentFactors() {
    var candidates = [
      project && project.objectLibrary,
      project && project.objectDesign,
      project && project.objectData,
      project && project.data && project.data.objectLibrary,
      project && project.extensions && project.extensions.objectLibrary
    ];

    for (var index = 0; index < candidates.length; index += 1) {
      if (candidates[index] && candidates[index].factors) {
        return candidates[index].factors;
      }
    }

    return fallbackEquipmentFactors;
  }

  function normalizeFactorRecord(record) {
    return record && typeof record === "object" ? record : {};
  }

  function factorByIndex(records, index) {
    if (!Array.isArray(records)) {
      return {};
    }

    for (var i = 0; i < records.length; i += 1) {
      if (records[i] && (records[i].index === index || records[i].id === index || records[i].what_id === index || records[i].material_id === index || records[i].size_id === index)) {
        return normalizeFactorRecord(records[i]);
      }
    }

    return normalizeFactorRecord(records[index]);
  }

  function decodeItemId(itemId) {
    var number = Number(itemId);

    if (!Number.isFinite(number) || number < 0) {
      return null;
    }

    number = Math.round(number);
    return {
      raw: number,
      whatId: number & 31,
      materialId: (number >> 5) & 7,
      sizeId: (number >> 8) & 7,
      flags: (number >> 11) & 31
    };
  }

  function numericItemCode(value) {
    var number = Number(value);

    if (Number.isFinite(number) && number > 0) {
      return Math.round(number);
    }

    return 0;
  }

  function dataNumber(record, keys) {
    for (var index = 0; index < keys.length; index += 1) {
      if (record && record[keys[index]] !== undefined) {
        var directNumber = Number(record[keys[index]]);
        return Number.isFinite(directNumber) && directNumber >= 0 ? Math.round(directNumber) : null;
      }
      if (record && record.data && record.data[keys[index]] !== undefined) {
        var dataValue = Number(record.data[keys[index]]);
        return Number.isFinite(dataValue) && dataValue >= 0 ? Math.round(dataValue) : null;
      }
    }

    return null;
  }

  function itemCodeFromRecord(record) {
    return dataNumber(record, ["objectNumber", "objectId", "itemCode", "encodedId", "encodedItemId", "sevenSegObjectId", "code"]);
  }

  function equipmentItemCode(equipmentId) {
    var directCode = numericItemCode(equipmentId);
    var equipment = findById(project && project.equipment, equipmentId);
    var item = null;

    if (equipment && equipment.itemId) {
      item = findById(project && project.items, equipment.itemId);
    } else {
      item = findById(project && project.items, equipmentId);
    }

    var equipmentCode = itemCodeFromRecord(equipment);
    var itemCode = itemCodeFromRecord(item);

    if (directCode > 0) {
      return directCode;
    }
    if (equipmentCode !== null) {
      return equipmentCode;
    }
    if (itemCode !== null) {
      return itemCode;
    }

    return null;
  }

  function addEquipmentSlot(result, value) {
    if (typeof value === "string" && findById(project && project.equipment, value)) {
      if (result.indexOf(value) === -1) {
        result.push(value);
      }
      return;
    }

    var code = equipmentItemCode(value);

    if (code !== null && code >= 0 && result.indexOf(code) === -1) {
      result.push(code);
    }
  }

  function equippedItemIds(hero) {
    var result = [];
    var stats = hero && hero.stats ? hero.stats : {};
    var data = hero && hero.data ? hero.data : {};

    if (Array.isArray(hero && hero.equipmentIds)) {
      hero.equipmentIds.forEach(function (id) {
        addEquipmentSlot(result, id);
      });
    }

    ["weaponId", "armorId", "shieldId", "helmetId", "accessory1Id", "accessory2Id"].forEach(function (key) {
      addEquipmentSlot(result, hero && hero[key]);
      addEquipmentSlot(result, stats[key]);
      addEquipmentSlot(result, data[key]);
    });

    return result.slice(0, 4);
  }

  function factorNumber(record, keys) {
    for (var index = 0; index < keys.length; index += 1) {
      if (record && record[keys[index]] !== undefined) {
        return Number(record[keys[index]]) || 0;
      }
    }

    return 0;
  }

  function fetchEquipmentStats(itemId) {
    var directEquipment = typeof itemId === "string" ? findById(project && project.equipment, itemId) : null;
    var directData = directEquipment && directEquipment.data ? directEquipment.data : {};
    var decoded = decodeItemId(itemId);

    if (directEquipment) {
      return {
        slot: String(directEquipment.slot || directData.slot || directEquipment.kind || directData.kind || "accessory").toLowerCase(),
        minStr: factorNumber(directData, ["minStr", "min_str"]),
        allowedClassMask: Number(directData.allowedClassMask || directData.allowed_class_mask || 255),
        attack: factorNumber(directData, ["attack", "attackPowerBonus", "attackPower", "hit_bonus", "hit"]),
        armor: factorNumber(directData, ["armor", "armor_bonus"]),
        magicAttack: factorNumber(directData, ["magicAttack", "magicPowerBonus", "magic", "magic_bonus"]),
        magicArmor: factorNumber(directData, ["magicArmor", "magicDefense", "magic_armor"]),
        speed: factorNumber(directData, ["speed", "swiftness"]),
        crit: factorNumber(directData, ["crit", "criticalChance"]),
        dodge: factorNumber(directData, ["dodge", "evasion"]),
        hitRate: factorNumber(directData, ["hitRate", "accuracy"]),
        fireRes: factorNumber(directData, ["fireRes", "fire_res"]),
        iceRes: factorNumber(directData, ["iceRes", "ice_res"]),
        poisonRes: factorNumber(directData, ["poisonRes", "poison_res"]),
        darkRes: factorNumber(directData, ["darkRes", "dark_res"]),
        holyRes: factorNumber(directData, ["holyRes", "holy_res"])
      };
    }

    if (!decoded) {
      return null;
    }

    var factors = projectEquipmentFactors();
    var what = factorByIndex(factors.what || factors.whats, decoded.whatId);
    var material = factorByIndex(factors.material || factors.materials, decoded.materialId);
    var size = factorByIndex(factors.size || factors.sizes, decoded.sizeId);
    var slot = String(what.slot || what.kind || "accessory").toLowerCase();

    return {
      slot: slot,
      minStr: factorNumber(size, ["minStr", "min_str"]),
      allowedClassMask: Number(what.allowedClassMask || what.allowed_class_mask || 255),
      attack: factorNumber(what, ["attack", "base_hit", "hit"]) +
        factorNumber(material, ["attack", "hit_bonus", "hit"]) +
        factorNumber(size, ["attack", "hit_bonus", "hit"]),
      armor: factorNumber(what, ["armor", "base_armor"]) +
        factorNumber(material, ["armor", "armor_bonus"]) +
        factorNumber(size, ["armor", "armor_bonus"]),
      magicAttack: factorNumber(what, ["magicAttack", "base_magic", "magic"]) +
        factorNumber(material, ["magicAttack", "magic_bonus", "magic"]) +
        factorNumber(size, ["magicAttack", "magic_bonus", "magic"]),
      magicArmor: factorNumber(what, ["magicArmor", "magic_armor"]) +
        factorNumber(material, ["magicArmor", "magic_armor", "magicArmorBonus"]) +
        factorNumber(size, ["magicArmor", "magic_armor", "magicArmorBonus"]),
      speed: factorNumber(what, ["speed", "base_speed", "speed_mod"]) +
        factorNumber(material, ["speed", "speed_mod"]) +
        factorNumber(size, ["speed", "speed_mod"]),
      crit: factorNumber(what, ["crit", "critical"]) +
        factorNumber(material, ["crit", "critical"]) +
        factorNumber(size, ["crit", "critical"]),
      dodge: factorNumber(what, ["dodge", "dodge_mod"]) +
        factorNumber(material, ["dodge", "dodge_mod"]) +
        factorNumber(size, ["dodge", "dodge_mod"]),
      hitRate: factorNumber(what, ["hitRate", "hit_rate"]) +
        factorNumber(material, ["hitRate", "hit_rate"]) +
        factorNumber(size, ["hitRate", "hit_rate"]),
      fireRes: factorNumber(material, ["fireRes", "fire_res", "resistance_bonus"]),
      iceRes: factorNumber(material, ["iceRes", "ice_res"]),
      poisonRes: factorNumber(material, ["poisonRes", "poison_res"]),
      darkRes: factorNumber(material, ["darkRes", "dark_res"]),
      holyRes: factorNumber(material, ["holyRes", "holy_res"]),
      flags: (Number(what.flags) || 0) | (Number(material.flags) || 0) | (Number(size.flags) || 0) | decoded.flags
    };
  }

  function canUseEquipment(base, equipment) {
    var classMask = Number(base.classMask || 255);

    if ((classMask & equipment.allowedClassMask) === 0) {
      return false;
    }

    return base.str >= equipment.minStr;
  }

  function applyEquipmentBonus(base, itemId, bonus) {
    var equipment = fetchEquipmentStats(itemId);

    if (!equipment || !canUseEquipment(base, equipment)) {
      return;
    }

    if (equipment.slot.indexOf("weapon") !== -1) {
      bonus.attack += equipment.attack;
      bonus.magicAttack += equipment.magicAttack;
    } else if (equipment.slot.indexOf("shield") !== -1) {
      bonus.armor += equipment.armor;
      bonus.magicArmor += equipment.magicArmor;
      bonus.dodge -= 1;
    } else if (equipment.slot.indexOf("armor") !== -1 || equipment.slot.indexOf("body") !== -1 || equipment.slot.indexOf("head") !== -1) {
      bonus.armor += equipment.armor;
      bonus.magicArmor += equipment.magicArmor;
    } else {
      bonus.attack += Math.max(0, equipment.attack);
      bonus.magicAttack += Math.max(0, equipment.magicAttack);
      bonus.armor += Math.max(0, equipment.armor);
      bonus.magicArmor += Math.max(0, equipment.magicArmor);
    }

    bonus.speed += equipment.speed;
    bonus.crit += equipment.crit;
    bonus.dodge += equipment.dodge;
    bonus.hitRate += equipment.hitRate;
    bonus.fireRes += equipment.fireRes;
    bonus.iceRes += equipment.iceRes;
    bonus.poisonRes += equipment.poisonRes;
    bonus.darkRes += equipment.darkRes;
    bonus.holyRes += equipment.holyRes;
  }

  function clampBattleStats(stats) {
    stats.maxHp = clampStat(stats.maxHp, 1, 1, 999);
    stats.currentHp = clampStat(stats.currentHp, stats.maxHp, 0, stats.maxHp);
    stats.maxMp = clampStat(stats.maxMp, 0, 0, 999);
    stats.currentMp = clampStat(stats.currentMp, stats.maxMp, 0, stats.maxMp);
    stats.attack = clampStat(stats.attack, 1, 1, 999);
    stats.magicAttack = clampStat(stats.magicAttack, 0, 0, 999);
    stats.armor = clampStat(stats.armor, 0, 0, 999);
    stats.magicArmor = clampStat(stats.magicArmor, 0, 0, 999);
    stats.speed = clampStat(stats.speed, 1, 1, 99);
    stats.crit = clampStat(stats.crit, 0, 0, 75);
    stats.dodge = clampStat(stats.dodge, 0, 0, 60);
    stats.hitRate = clampStat(stats.hitRate, 75, 5, 95);
    stats.fireRes = clampResist(stats.fireRes);
    stats.iceRes = clampResist(stats.iceRes);
    stats.poisonRes = clampResist(stats.poisonRes);
    stats.darkRes = clampResist(stats.darkRes);
    stats.holyRes = clampResist(stats.holyRes);
    stats.healing = clampStat(stats.healing, 1, 1, 999);
    stats.swiftness = clampStat(stats.speed, 1, 1, 20);
    stats.level = clampStat(stats.level, 1, 1, 99);
    stats.currentHP = stats.currentHp;
    stats.maxHP = stats.maxHp;
    stats.attackPower = clampStat(stats.attackPower !== undefined ? stats.attackPower : stats.attack, stats.attack, 0, 255);
    stats.magicPower = clampStat(stats.magicPower !== undefined ? stats.magicPower : stats.magicAttack, stats.magicAttack, 0, 255);
    stats.defense = clampStat(stats.defense !== undefined ? stats.defense : stats.armor, stats.armor, 0, 255);
    stats.magicDefense = clampStat(stats.magicDefense !== undefined ? stats.magicDefense : stats.magicArmor, stats.magicArmor, 0, 255);
    stats.accuracy = clampStat(stats.accuracy !== undefined ? stats.accuracy : stats.hitRate, stats.hitRate, 0, 100);
    stats.evasion = clampStat(stats.evasion !== undefined ? stats.evasion : stats.dodge, stats.dodge, 0, 100);
    stats.criticalChance = clampStat(stats.criticalChance !== undefined ? stats.criticalChance : stats.crit, stats.crit, 0, 100);
    stats.resistancePhysical = clampStat(stats.resistancePhysical !== undefined ? stats.resistancePhysical : 100, 100, 0, 200);
    stats.resistanceMagic = clampStat(stats.resistanceMagic !== undefined ? stats.resistanceMagic : 100, 100, 0, 200);
    stats.weaponPower = clampStat(stats.weaponPower || 0, 0, 0, 255);
    stats.spellPower = clampStat(stats.spellPower || 0, 0, 0, 255);
    return stats;
  }

  function findById(list, id) {
    if (!Array.isArray(list)) {
      return null;
    }

    for (var index = 0; index < list.length; index += 1) {
      if (list[index] && list[index].id === id) {
        return list[index];
      }
    }

    return null;
  }

  function readProjectText(id, fallback) {
    var entry = findById(project && project.texts, id);
    var text = entry ? String(entry.text || entry.content || (entry.data && (entry.data.text || entry.data.content)) || "") : "";
    return String(text || fallback || "").toUpperCase().trim() || String(fallback || "");
  }

  function fallbackPartyName(index) {
    return "YOU" + String(index + 1);
  }

  function fallbackFoeName(index) {
    return "FOE" + String(index + 1);
  }

  function minimalRpgState() {
    return project && project.gameFlow && project.gameFlow.data &&
      project.gameFlow.data.minimalRpg &&
      typeof project.gameFlow.data.minimalRpg === "object" &&
      !Array.isArray(project.gameFlow.data.minimalRpg)
      ? project.gameFlow.data.minimalRpg
      : null;
  }

  function gameFlowData() {
    return project && project.gameFlow && project.gameFlow.data &&
      typeof project.gameFlow.data === "object" &&
      !Array.isArray(project.gameFlow.data)
      ? project.gameFlow.data
      : {};
  }

  function finalBossVictoryFlag() {
    return gameFlowData().finalBossVictoryFlag || "bossDefeated";
  }

  function finalBossVictoryTextId() {
    return gameFlowData().finalBossVictoryTextId || "text_ending";
  }

  function setMinimalRpgFlag(flagId, value) {
    var state = minimalRpgState();

    if (!state) {
      return;
    }
    if (!state.flags || typeof state.flags !== "object" || Array.isArray(state.flags)) {
      state.flags = {};
    }
    if (state.flags[flagId] !== (value === true)) {
      state.flags[flagId] = value === true;
      notifyProjectChanged();
    }
  }

  function notifyProjectChanged() {
    if (typeof changeHandler === "function") {
      changeHandler();
    }
  }

  function potionCount() {
    var state = minimalRpgState();
    var value = state ? Number(state.potionCount) : 0;
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  }

  function setPotionCount(value) {
    var state = minimalRpgState();

    if (!state) {
      return;
    }

    state.potionCount = Math.max(0, Math.round(Number(value) || 0));
    notifyProjectChanged();
  }

  function potionHealAmount() {
    var item = findById(project && project.items, "item_potion");
    var data = item && item.data ? item.data : {};
    var value = Number(data.healAmount);
    return Number.isFinite(value) ? Math.max(1, Math.round(value)) : 10;
  }

  function runtimeHeroHp(index) {
    var state = minimalRpgState();
    var value;

    if (!state) {
      return null;
    }

    value = index === 0 ? state.heroCurrentHP : state["hero" + String(index + 1) + "CurrentHP"];
    value = Number(value);
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : null;
  }

  function writeRuntimeHeroHp(index, hp) {
    var state = minimalRpgState();
    var value = Math.max(0, Math.round(Number(hp || 0)));

    if (!state) {
      return;
    }

    if (index === 0) {
      state.heroCurrentHP = value;
    } else {
      state["hero" + String(index + 1) + "CurrentHP"] = value;
    }
  }

  function calculateHeroBattleStats(hero, index) {
    var fallbackHp = readSetting("playerHpInput", 99);
    var stats = hero && hero.stats ? hero.stats : {};
    var savedHp = runtimeHeroHp(index);
    var base = {
      name: String(hero.name || fallbackPartyName(index)).toUpperCase(),
      level: clampStat(statValue(stats, ["level"], 1), 1, 1, 99),
      classMask: clampStat(statValue(stats, ["classMask", "class_mask"], 255), 255, 0, 255),
      maxHpBase: clampStat(statValue(stats, ["maxHP", "maxHp", "maxHpBase", "max_hp_base"], fallbackHp), fallbackHp, 1, 999),
      currentHp: savedHp === null ? statValue(stats, ["currentHp", "current_hp", "currentHP", "hp"], null) : savedHp,
      maxMpBase: clampStat(statValue(stats, ["maxMpBase", "max_mp_base", "maxMp", "maxMP"], 0), 0, 0, 999),
      currentMp: statValue(stats, ["currentMp", "current_mp", "currentMP", "mp"], null),
      str: clampStat(statValue(stats, ["strBase", "str_base", "str", "strength", "attackPower"], stats.attack || project.battle.playerAttack || 10), 10, 0, 99),
      dex: clampStat(statValue(stats, ["dexBase", "dex_base", "dex", "dexterity"], 0), 0, 0, 99),
      int: clampStat(statValue(stats, ["intBase", "int_base", "int", "intelligence", "magicPower", "magic"], stats.magic || 0), 0, 0, 99),
      wis: clampStat(statValue(stats, ["wisBase", "wis_base", "wis", "wisdom"], stats.magicDefense || 0), 0, 0, 99),
      con: clampStat(statValue(stats, ["conBase", "con_base", "con", "constitution"], 0), 0, 0, 99),
      armorBase: clampStat(statValue(stats, ["armorBase", "armor_base", "armor", "defense"], stats.defense || 0), 0, 0, 99),
      magicArmorBase: clampStat(statValue(stats, ["magicArmorBase", "magic_armor_base", "magicArmor", "magic_armor", "magicDefense"], stats.magicDefense || 0), 0, 0, 99),
      speedBase: clampStat(statValue(stats, ["speedBase", "speed_base", "speed", "swiftness"], index === 0 ? 10 : 5), index === 0 ? 10 : 5, 0, 99),
      critBase: clampStat(statValue(stats, ["critBase", "crit_base", "criticalChance", "crit"], 5), 5, 0, 75),
      dodgeBase: clampStat(statValue(stats, ["dodgeBase", "dodge_base", "evasion", "dodge"], 3), 3, 0, 60),
      hitRateBase: clampStat(statValue(stats, ["hitRateBase", "hit_rate_base", "accuracy", "hitRate", "hit_rate"], 75), 75, 5, 95),
      fireResBase: clampResist(statValue(stats, ["fireResBase", "fire_res_base", "fireRes", "fire_res"], 0)),
      iceResBase: clampResist(statValue(stats, ["iceResBase", "ice_res_base", "iceRes", "ice_res"], 0)),
      poisonResBase: clampResist(statValue(stats, ["poisonResBase", "poison_res_base", "poisonRes", "poison_res"], 0)),
      darkResBase: clampResist(statValue(stats, ["darkResBase", "dark_res_base", "darkRes", "dark_res"], 0)),
      holyResBase: clampResist(statValue(stats, ["holyResBase", "holy_res_base", "holyRes", "holy_res"], 0))
    };
    var bonus = makeBonus();
    var itemIds = equippedItemIds(hero);

    itemIds.forEach(function (itemId) {
      applyEquipmentBonus(base, itemId, bonus);
    });

    var battleStats = {
      name: base.name,
      level: base.level,
      maxHp: base.maxHpBase + base.con * 5 + bonus.hp,
      currentHp: base.currentHp === null ? base.maxHpBase + base.con * 5 + bonus.hp : base.currentHp,
      maxMp: base.maxMpBase + base.int * 3 + bonus.mp,
      currentMp: base.currentMp === null ? base.maxMpBase + base.int * 3 + bonus.mp : base.currentMp,
      str: base.str + bonus.str,
      dex: base.dex + bonus.dex,
      int: base.int + bonus.int,
      wis: base.wis + bonus.wis,
      con: base.con + bonus.con,
      attack: base.str + bonus.str + bonus.attack,
      magicAttack: base.int + bonus.int + bonus.magicAttack,
      armor: base.armorBase + bonus.armor + Math.floor((base.con + bonus.con) / 4),
      magicArmor: base.magicArmorBase + bonus.magicArmor + Math.floor((base.wis + bonus.wis) / 3),
      speed: base.speedBase + base.dex + bonus.dex + bonus.speed,
      crit: base.critBase + bonus.crit,
      dodge: base.dodgeBase + Math.floor((base.dex + bonus.dex) / 4) + bonus.dodge,
      hitRate: base.hitRateBase + Math.floor((base.dex + bonus.dex) / 3) + bonus.hitRate,
      fireRes: base.fireResBase + bonus.fireRes,
      iceRes: base.iceResBase + bonus.iceRes,
      poisonRes: base.poisonResBase + bonus.poisonRes,
      darkRes: base.darkResBase + bonus.darkRes,
      holyRes: base.holyResBase + bonus.holyRes,
      healing: statValue(stats, ["healing", "healPower", "heal"], Math.max(1, base.wis + base.int)),
      resistancePhysical: statValue(stats, ["resistancePhysical"], 100),
      resistanceMagic: statValue(stats, ["resistanceMagic"], 100),
      weaponPower: statValue(stats, ["weaponPower"], 0),
      spellPower: statValue(stats, ["spellPower"], 0),
      visualByte: firstAnimationFrameByte(hero),
      importedVisuals: importedVisuals(hero),
      isHero: true,
      equippedItemIds: itemIds
    };

    return clampBattleStats(battleStats);
  }

  function readHeroSlot(hero, index) {
    if (!hero) {
      return emptyBattleStats(fallbackPartyName(index));
    }

    return calculateHeroBattleStats(hero, index);
  }

  function readEnemySwiftness(enemy, index, randomSource, requestedFoeSwiftness) {
    if (requestedFoeSwiftness && requestedFoeSwiftness[index] !== undefined) {
      return clampStat(requestedFoeSwiftness[index], 1 + Math.floor(randomSource() * 10), 1, 10);
    }

    if (enemy && enemy.swiftness && enemy.swiftness.mode === "fixed") {
      return clampStat(enemy.swiftness.value, 5, 1, 20);
    }

    if (enemy && enemy.swiftness && enemy.swiftness.mode === "randomPerBattle") {
      var min = clampStat(enemy.swiftness.min, 1, 1, 10);
      var max = clampStat(enemy.swiftness.max, 10, min, 10);
      return min + Math.floor(randomSource() * (max - min + 1));
    }

    if (enemy && enemy.stats && enemy.stats.swiftness !== undefined) {
      return clampStat(enemy.stats.swiftness, 5, 1, 20);
    }

    if (enemy && enemy.stats && enemy.stats.speed !== undefined) {
      return clampStat(enemy.stats.speed, 5, 1, 20);
    }

    return clampStat(1 + Math.floor(randomSource() * 10), 5, 1, 10);
  }

  function readEnemySlot(enemy, index, randomSource, requestedFoeSwiftness) {
    var fallbackHp = readSetting("beastHpInput", 50);
    var stats = enemy && enemy.stats ? enemy.stats : {};

    if (!enemy) {
      return emptyBattleStats(fallbackFoeName(index));
    }

    var base = {
      name: String(enemy.name || fallbackFoeName(index)).toUpperCase(),
      level: clampStat(statValue(stats, ["level"], 1), 1, 1, 99),
      maxHpBase: clampStat(statValue(stats, ["maxHpBase", "max_hp_base", "maxHp", "maxHP"], fallbackHp), fallbackHp, 1, 999),
      currentHp: statValue(stats, ["currentHp", "current_hp", "currentHP", "hp"], null),
      maxMpBase: clampStat(statValue(stats, ["maxMpBase", "max_mp_base", "maxMp", "maxMP"], 0), 0, 0, 999),
      currentMp: statValue(stats, ["currentMp", "current_mp", "currentMP", "mp"], null),
      str: clampStat(statValue(stats, ["strBase", "str_base", "str", "strength", "attackPower"], stats.attack || 10), 10, 0, 99),
      dex: clampStat(statValue(stats, ["dexBase", "dex_base", "dex", "dexterity"], 0), 0, 0, 99),
      int: clampStat(statValue(stats, ["intBase", "int_base", "int", "intelligence", "magicPower", "magic"], stats.magic || 0), 0, 0, 99),
      wis: clampStat(statValue(stats, ["wisBase", "wis_base", "wis", "wisdom"], stats.magicDefense || 0), 0, 0, 99),
      con: clampStat(statValue(stats, ["conBase", "con_base", "con", "constitution"], 0), 0, 0, 99),
      armor: clampStat(statValue(stats, ["armor", "defense"], stats.defense || 0), 0, 0, 99),
      magicArmor: clampStat(statValue(stats, ["magicArmor", "magic_armor", "magicDefense"], stats.magicDefense || 0), 0, 0, 99),
      speed: readEnemySwiftness(enemy, index, randomSource, requestedFoeSwiftness),
      crit: clampStat(statValue(stats, ["criticalChance", "crit"], 3), 3, 0, 75),
      dodge: clampStat(statValue(stats, ["evasion", "dodge"], 4), 4, 0, 60),
      hitRate: clampStat(statValue(stats, ["accuracy", "hitRate", "hit_rate"], 70), 70, 5, 95),
      weaponPower: clampStat(statValue(stats, ["weaponPower", "weapon_power"], stats.str !== undefined ? statValue(stats, ["attackPower", "attack_power"], 0) : 0), 0, 0, 99),
      spellPower: clampStat(statValue(stats, ["spellPower", "spell_power"], 0), 0, 0, 99)
    };
    var battleStats = {
      name: base.name,
      level: base.level,
      maxHp: base.maxHpBase + base.con * 5,
      currentHp: base.currentHp === null ? base.maxHpBase + base.con * 5 : base.currentHp,
      maxMp: base.maxMpBase + base.int * 3,
      currentMp: base.currentMp === null ? base.maxMpBase + base.int * 3 : base.currentMp,
      str: base.str,
      dex: base.dex,
      int: base.int,
      wis: base.wis,
      con: base.con,
      attack: base.str + base.weaponPower,
      magicAttack: base.int + base.spellPower,
      armor: base.armor + Math.floor(base.con / 4),
      magicArmor: base.magicArmor + Math.floor(base.wis / 3),
      speed: base.speed + base.dex,
      crit: base.crit,
      dodge: base.dodge + Math.floor(base.dex / 4),
      hitRate: base.hitRate + Math.floor(base.dex / 3),
      fireRes: clampResist(statValue(stats, ["fireRes", "fire_res"], 0)),
      iceRes: clampResist(statValue(stats, ["iceRes", "ice_res"], 0)),
      poisonRes: clampResist(statValue(stats, ["poisonRes", "poison_res"], 0)),
      darkRes: clampResist(statValue(stats, ["darkRes", "dark_res"], 0)),
      holyRes: clampResist(statValue(stats, ["holyRes", "holy_res"], 0)),
      healing: 0,
      resistancePhysical: statValue(stats, ["resistancePhysical"], 100),
      resistanceMagic: statValue(stats, ["resistanceMagic"], 100),
      weaponPower: base.weaponPower,
      spellPower: base.spellPower,
      visualByte: firstAnimationFrameByte(enemy),
      importedVisuals: importedVisuals(enemy),
      isHero: false,
      equippedItemIds: []
    };

    return clampBattleStats(battleStats);
  }

  function partyHeroes() {
    var result = [];
    var seen = {};
    var startingIds = project.gameFlow && Array.isArray(project.gameFlow.startingHeroIds) ?
      project.gameFlow.startingHeroIds :
      [];

    startingIds.forEach(function (heroId) {
      var hero = findById(project.heroes, heroId);

      if (hero && !seen[hero.id] && result.length < 2) {
        seen[hero.id] = true;
        result.push(hero);
      }
    });

    (project.heroes || []).forEach(function (hero) {
      if (hero && !seen[hero.id] && result.length < 2) {
        seen[hero.id] = true;
        result.push(hero);
      }
    });

    while (result.length < 2) {
      result.push(null);
    }

    return result.slice(0, 2);
  }

  function resolveEncounterGroup(encounterGroupId) {
    var roomGroup = encounterGroupId ? findById(project.encounterGroups, encounterGroupId) : null;

    if (roomGroup) {
      return roomGroup;
    }

    if (Array.isArray(project.encounterGroups) && project.encounterGroups.length) {
      return project.encounterGroups[0];
    }

    return null;
  }

  function enemyIsFinalBoss(enemy) {
    return Boolean(enemy && enemy.data && enemy.data.finalBoss === true);
  }

  function encounterGroupIsFinalBoss(group) {
    var members = group && Array.isArray(group.members) ? group.members : [];

    if (group && group.data && group.data.finalBoss === true) {
      return true;
    }

    for (var i = 0; i < members.length; i += 1) {
      if (enemyIsFinalBoss(findById(project.enemies, members[i] && members[i].enemyId))) {
        return true;
      }
    }

    return false;
  }

  function foeEnemies(encounterGroupId) {
    var result = [];
    var group = resolveEncounterGroup(encounterGroupId);

    if (group && Array.isArray(group.members)) {
      group.members.forEach(function (member) {
        var enemy = member ? findById(project.enemies, member.enemyId) : null;

        if (enemy && result.length < 2) {
          result.push(enemy);
        }
      });
    } else {
      (project.enemies || []).forEach(function (enemy) {
        if (enemy && result.length < 2 && result.indexOf(enemy) === -1) {
          result.push(enemy);
        }
      });
    }

    while (result.length < 2) {
      result.push(null);
    }

    return result.slice(0, 2);
  }

  function createBattleConfig(options) {
    var randomSource = options && typeof options.random === "function" ? options.random : Math.random;
    var requestedFoeSwiftness = options && Array.isArray(options.foeSwiftness) ? options.foeSwiftness : null;
    var encounterGroupId = options && options.encounterGroupId ? options.encounterGroupId : null;
    var heroes = partyHeroes();
    var emulatorEncounterGroupId = null;
    var encounterGroup;

    if (!encounterGroupId &&
        window.SevenSegEmulator &&
        typeof window.SevenSegEmulator.currentEncounterGroupId === "function") {
      emulatorEncounterGroupId = window.SevenSegEmulator.currentEncounterGroupId();
      encounterGroupId = emulatorEncounterGroupId || encounterGroupId;
    }

    encounterGroup = resolveEncounterGroup(encounterGroupId);
    var foes = foeEnemies(encounterGroupId);
    var partySlots = heroes.map(function (hero, index) {
      return readHeroSlot(hero, index);
    });
    var foeSlots = foes.map(function (enemy, index) {
      return readEnemySlot(enemy, index, randomSource, requestedFoeSwiftness);
    });

    return {
      randomSource: randomSource,
      encounterGroupId: encounterGroupId || "",
      isFinalBossEncounter: encounterGroupIsFinalBoss(encounterGroup),
      encounterName: encounterGroup && encounterGroup.name ? String(encounterGroup.name) : "",
      partySlots: partySlots,
      foeSlots: foeSlots
    };
  }

  function nameForTarget(target) {
    if (!battle) {
      return targetName(target);
    }

    if (target === "foe1") return battle.foeNames[0];
    if (target === "foe2") return battle.foeNames[1];
    if (target === "you1") return battle.partyNames[0];
    return battle.partyNames[1];
  }

  function setBattleButtonLabels(partyNames, foeNames) {
    document.getElementById("targetFoe1Button").textContent = foeNames[0];
    document.getElementById("targetFoe2Button").textContent = foeNames[1];
    document.getElementById("targetYou1Button").textContent = partyNames[0];
    document.getElementById("targetYou2Button").textContent = partyNames[1];
  }

  function updateBattleButtons() {
    if (battle && battle.partyNames && battle.foeNames) {
      setBattleButtonLabels(battle.partyNames, battle.foeNames);
      return;
    }

    setBattleButtonLabels(["YOU1", "YOU2"], ["FOE1", "FOE2"]);
  }

  function hpSummary(names, hpValues, maxValues, fallbackPrefix) {
    var parts = [];

    for (var index = 0; index < 2; index += 1) {
      if (maxValues[index] > 0) {
        parts.push(names[index] + " " + hpValues[index] + "/" + maxValues[index]);
      } else {
        parts.push(fallbackPrefix + String(index + 1) + " --");
      }
    }

    return parts.join(" | ");
  }

  function renderBattlePreview() {
    var config = createBattleConfig({});
    var partyNames = [config.partySlots[0].name, config.partySlots[1].name];
    var foeNames = [config.foeSlots[0].name, config.foeSlots[1].name];
    var partyHp = [config.partySlots[0].currentHp, config.partySlots[1].currentHp];
    var partyMaxHp = [config.partySlots[0].maxHp, config.partySlots[1].maxHp];
    var foeHp = [config.foeSlots[0].maxHp, config.foeSlots[1].maxHp];

    setBattleButtonLabels(partyNames, foeNames);
    document.getElementById("battlePlayerHp").textContent = hpSummary(
      partyNames,
      partyHp,
      partyMaxHp,
      "YOU"
    );
    document.getElementById("battleBeastHp").textContent = hpSummary(
      foeNames,
      foeHp,
      foeHp,
      "FOE"
    );
  }

  function persistPartyHpToProject() {
    var heroes = project && Array.isArray(project.heroes) ? project.heroes : [];
    var hero;
    var hp;

    if (!battle || !battle.partyHp) {
      return;
    }

    for (var index = 0; index < Math.min(2, heroes.length, battle.partyHp.length); index += 1) {
      hero = heroes[index];
      hp = Math.max(0, Math.round(Number(battle.partyHp[index] || 0)));
      if (!hero) {
        continue;
      }
      if (!hero.stats || typeof hero.stats !== "object" || Array.isArray(hero.stats)) {
        hero.stats = {};
      }
      hero.stats.currentHP = hp;
      hero.stats.currentHp = hp;
      writeRuntimeHeroHp(index, hp);
    }
  }

  function makeEmptyCells() {
    var result = [];

    for (var i = 0; i < model.DISPLAY_CELLS; i += 1) {
      result.push({ text: "", className: "", dp: false });
    }

    return result;
  }

  function updateStats() {
    document.getElementById("battlePlayerHp").textContent = hpSummary(
      battle.partyNames,
      battle.partyHp,
      battle.partyMaxHp,
      "YOU"
    );
    document.getElementById("battleBeastHp").textContent = hpSummary(
      battle.foeNames,
      battle.foeHp,
      battle.foeMaxHp,
      "FOE"
    );
  }

  function setPhase(text) {
    var battleLabel = document.getElementById("battlePhaseLabel");
    var browserLabel = document.getElementById("browserBattlePhaseLabel");

    if (battleLabel) {
      battleLabel.textContent = text;
    }
    if (browserLabel) {
      browserLabel.textContent = battleActive ? text : "world";
    }
  }

  function setButtons(mode) {
    var isDismiss = mode === "dismiss";
    var isMenu = mode === "menu";
    var isMainMenu = isMenu && currentTextMenu && currentTextMenu.name === "main";
    var isTarget = mode === "target";
    var canChoose = isMenu || isTarget || isDismiss;

    document.getElementById("hitButton").disabled = !(isMainMenu || isDismiss);
    document.getElementById("healButton").disabled = !(isMainMenu || isDismiss);
    document.getElementById("targetFoe1Button").disabled = !(isTarget || isDismiss);
    document.getElementById("targetFoe2Button").disabled = !(isTarget || isDismiss);
    document.getElementById("targetYou1Button").disabled = !(isTarget || isDismiss);
    document.getElementById("targetYou2Button").disabled = !(isTarget || isDismiss);
    document.getElementById("targetUpButton").disabled = !canChoose;
    document.getElementById("targetDownButton").disabled = !canChoose;
    document.getElementById("cancelBattleButton").disabled = !canChoose;
    document.getElementById("confirmBattleButton").disabled = !canChoose;
    document.getElementById("browserBattleUpButton").disabled = !canChoose;
    document.getElementById("browserBattleDownButton").disabled = !canChoose;
    document.getElementById("browserBattleBackButton").disabled = !canChoose;
    document.getElementById("browserBattleConfirmButton").disabled = !canChoose;
  }

  function charToSegmentByte(value) {
    var key = String(value || " ").charAt(0).toUpperCase();

    if (model && typeof model.textGlyphByte === "function") {
      return model.textGlyphByte(project, key);
    }
    if (Object.prototype.hasOwnProperty.call(SEGMENT_GLYPHS, key)) {
      return SEGMENT_GLYPHS[key];
    }

    return 0;
  }

  function cellToSegmentByte(cell) {
    var value = cell && Number.isInteger(cell.byte) ? cell.byte : charToSegmentByte(cell && cell.text);

    if (cell && cell.dp) {
      value |= SEGMENT_BITS.dp;
    }

    return value & 0xff;
  }

  function segmentCellSvg(value) {
    var segments = SEGMENT_ORDER.map(function (segment) {
      var className = value & SEGMENT_BITS[segment] ? "battleSegmentOn" : "battleSegmentOff";

      return '<polygon data-segment="' + segment + '" class="' + className + '" points="' +
        SEGMENT_POINTS[segment] + '"></polygon>';
    }).join("");

    return '<svg viewBox="0 -1 14 20" aria-hidden="true" focusable="false">' +
      segments +
      '</svg>';
  }

  function battleDisplayGrid() {
    var grid = document.getElementById(displayElementId) || document.getElementById("battleGrid");
    var emulatorGrid = document.getElementById("emulatorGrid");

    if (emulatorGrid) {
      emulatorGrid.classList.toggle("battleGridActive", grid === emulatorGrid);
    }

    return grid;
  }

  function draw(blank) {
    var grid = battleDisplayGrid();

    grid.innerHTML = "";
    grid.classList.toggle("isBlank", Boolean(blank));

    for (var i = 0; i < model.DISPLAY_CELLS; i += 1) {
      var div = document.createElement("div");
      var cell = blank ? { text: "", className: "", dp: false } : cells[i];
      var segmentByte = cellToSegmentByte(cell);

      div.className = "battleCell";
      if (cell.className) {
        div.className += " " + cell.className;
      }
      div.classList.toggle("dpOn", Boolean(segmentByte & SEGMENT_BITS.dp));
      div.setAttribute("aria-label", "Digit " + i + " value 0x" + segmentByte.toString(16).toUpperCase().padStart(2, "0"));
      div.innerHTML = segmentCellSvg(segmentByte);
      grid.appendChild(div);
    }
  }

  function putText(text, startIndex) {
    for (var i = 0; i < text.length && startIndex + i < model.DISPLAY_CELLS; i += 1) {
      cells[startIndex + i].text = text.charAt(i);
    }
  }

  function putTextRight(text, row) {
    var safeText = String(text || "").toUpperCase().slice(0, model.DISPLAY_COLS);
    var startX = Math.max(0, model.DISPLAY_COLS - safeText.length);
    var startIndex = row * model.DISPLAY_COLS + startX;

    putText(safeText, startIndex);
    return { startIndex, length: safeText.length };
  }

  function overlaySegmentByte(index, byte) {
    if (index < 0 || index >= model.DISPLAY_CELLS || !byte) {
      return;
    }

    cells[index].byte = (cellToSegmentByte(cells[index]) | byte) & 0xff;
  }

  function battleEffectStepPath(heroRow, targetRow, reverse) {
    var sameRow = [
      { index: targetRow * 8 + 5, byte: DEFAULT_BATTLE_EFFECT_FRAME[5] },
      { index: targetRow * 8 + 4, byte: DEFAULT_BATTLE_EFFECT_FRAME[4] },
      { index: targetRow * 8 + 3, byte: DEFAULT_BATTLE_EFFECT_FRAME[3] },
      { index: targetRow * 8 + 2, byte: DEFAULT_BATTLE_EFFECT_FRAME[2] }
    ];
    var shiftedDown = [
      { index: 5, byte: SEGMENT_BITS.g },
      { index: 4, byte: SEGMENT_BITS.d },
      { index: 11, byte: SEGMENT_BITS.a },
      { index: 10, byte: SEGMENT_BITS.g }
    ];
    var shiftedUp = [
      { index: 13, byte: SEGMENT_BITS.g },
      { index: 12, byte: SEGMENT_BITS.a },
      { index: 3, byte: SEGMENT_BITS.d },
      { index: 2, byte: SEGMENT_BITS.g }
    ];
    var path;

    if (heroRow === targetRow) {
      path = sameRow;
    } else if (heroRow === 0 && targetRow === 1) {
      path = shiftedDown;
    } else {
      path = shiftedUp;
    }

    return reverse ? path.slice().reverse() : path;
  }

  function clearBlinkTimer() {
    if (blinkTimer) {
      window.clearInterval(blinkTimer);
      blinkTimer = null;
    }
  }

  function clearChargeTimer() {
    if (chargeTimer) {
      window.clearInterval(chargeTimer);
      chargeTimer = null;
    }
  }

  function underlineCells(startIndex, length) {
    if (!blinkOn) {
      return;
    }

    for (var i = 0; i < length; i += 1) {
      cells[startIndex + i].dp = true;
    }
  }

  function targetIsFoe(target) {
    return target === "foe1" || target === "foe2";
  }

  function targetIsYou(target) {
    return target === "you1" || target === "you2";
  }

  function targetIndex(target) {
    return target === "foe2" || target === "you2" ? 1 : 0;
  }

  function targetName(target) {
    if (target === "foe1") return "FOE1";
    if (target === "foe2") return "FOE2";
    if (target === "you1") return "YOU1";
    return "YOU2";
  }

  function targetIsAlive(target) {
    var index = targetIndex(target);

    if (!battle) {
      return true;
    }

    if (targetIsFoe(target)) {
      return battle.foeHp[index] > 0;
    }

    return battle.partyHp[index] > 0;
  }

  function firstAlive(values) {
    for (var i = 0; i < values.length; i += 1) {
      if (values[i] > 0) {
        return i;
      }
    }

    return 0;
  }

  function firstAliveTarget(prefix, values) {
    return prefix + (firstAlive(values) + 1);
  }

  function aliveTargetsForAction(action) {
    var targets = action === "hit" ? ["foe1", "foe2"] : ["you1", "you2"];
    var result = [];

    for (var i = 0; i < targets.length; i += 1) {
      if (targetIsAlive(targets[i]) || actionAllowsDeadPartyTarget(action, targets[i])) {
        result.push(targets[i]);
      }
    }

    return result;
  }

  function actionAllowsDeadPartyTarget(action, target) {
    var actionName = String(action || "").toLowerCase();
    return targetIsYou(target) && (actionName === "fenixdown" || actionName === "life");
  }

  function targetIsSelectableForAction(action, target) {
    return targetIsAlive(target) || actionAllowsDeadPartyTarget(action, target);
  }

  function actorIndex(target, actingTarget) {
    if (target === "foe1") return 0;
    if (target === "foe2") return 8;
    if (target === "you1") return actingTarget === "you1" ? 6 : 7;
    if (target === "you2") return actingTarget === "you2" ? 14 : 15;
    return 15;
  }

  function actorTarget(index) {
    if (index === ACTOR_YOU1) return "you1";
    if (index === ACTOR_YOU2) return "you2";
    if (index === ACTOR_FOE1) return "foe1";
    return "foe2";
  }

  function actorName(index) {
    if (!battle) {
      if (index === ACTOR_YOU1) return "YOU1";
      if (index === ACTOR_YOU2) return "YOU2";
      if (index === ACTOR_FOE1) return "FOE1";
      return "FOE2";
    }

    if (index === ACTOR_YOU1) return battle.partyNames[0];
    if (index === ACTOR_YOU2) return battle.partyNames[1];
    if (index === ACTOR_FOE1) return battle.foeNames[0];
    return battle.foeNames[1];
  }

  function actorSwiftness(index) {
    return battle.actorSwiftness[index] || 1;
  }

  function actorIsAlive(index) {
    if (index === ACTOR_YOU1 || index === ACTOR_YOU2) {
      return battle.partyHp[index] > 0;
    }

    return battle.foeHp[index - ACTOR_FOE1] > 0;
  }

  function actorIsHero(index) {
    return index === ACTOR_YOU1 || index === ACTOR_YOU2;
  }

  function timerDotCount(index) {
    if (!actorIsHero(index) || !actorIsAlive(index)) {
      return 0;
    }

    return Math.min(TIMER_DOT_COUNT, Math.floor((battle.actorTimers[index] * TIMER_DOT_COUNT) / TIMER_FULL));
  }

  function selectTarget(target) {
    if (!pendingAction) {
      return;
    }

    var targets = aliveTargetsForAction(pendingAction);

    if (targets.indexOf(target) === -1) {
      setStatus(nameForTarget(target) + " is not selectable now.");
      return;
    }

    selectedTarget = target;
    drawTargetSelect();
  }

  function ensureSelectedTarget() {
    var targets = aliveTargetsForAction(pendingAction);

    if (!targets.length) {
      return false;
    }

    if (targets.indexOf(selectedTarget) === -1) {
      selectedTarget = targets[0];
    }

    return true;
  }

  function drawActorCell(index, text, className, blink, visualByte) {
    cells[index].text = text;
    if (Number.isInteger(visualByte) && visualByte >= 0 && visualByte <= 255) {
      cells[index].byte = visualByte;
    }
    cells[index].className = blink ? className + " blinkCell" : className;
  }

  function actorVisualState(target) {
    var index = actorIndexForTarget(target);
    return battle && battle.actorVisualStates ? battle.actorVisualStates[index] || "idle" : "idle";
  }

  function actorIndexForTarget(target) {
    if (target === "you1") return ACTOR_YOU1;
    if (target === "you2") return ACTOR_YOU2;
    if (target === "foe1") return ACTOR_FOE1;
    return ACTOR_FOE2;
  }

  function setActorVisualState(target, stateName) {
    if (!battle || !battle.actorVisualStates) {
      return;
    }

    battle.actorVisualStates[actorIndexForTarget(target)] = stateName || "idle";
  }

  function resetActorVisualStates() {
    if (!battle || !battle.actorVisualStates) {
      return;
    }

    for (var index = 0; index < ACTOR_COUNT; index += 1) {
      battle.actorVisualStates[index] = "idle";
    }
  }

  function actorVisualByte(target, fallbackText) {
    var index = targetIndex(target);
    var isHero = targetIsYou(target);
    var stats = targetIsFoe(target) ?
      battle && battle.foeBattleStats && battle.foeBattleStats[index] :
      battle && battle.partyBattleStats && battle.partyBattleStats[index];

    return visualStateByteFromStats(stats, actorVisualState(target), fallbackText, isHero);
  }

  function drawActors(blinkTarget, blinkVisible, actingTarget) {
    var foe1Blink = blinkTarget === "foe1";
    var foe2Blink = blinkTarget === "foe2";
    var you1Blink = blinkTarget === "you1";
    var you2Blink = blinkTarget === "you2";

    if (targetIsAlive("foe1") || (foe1Blink && blinkVisible)) {
      drawActorCell(actorIndex("foe1", actingTarget), "0", "enemyCell", foe1Blink, actorVisualByte("foe1", "0"));
    }

    if (targetIsAlive("you1") || (you1Blink && blinkVisible)) {
      drawActorCell(actorIndex("you1", actingTarget), "1", "heroCell", you1Blink, actorVisualByte("you1", "1"));
    }

    if (targetIsAlive("foe2") || (foe2Blink && blinkVisible)) {
      drawActorCell(actorIndex("foe2", actingTarget), "0", "enemyCell", foe2Blink, actorVisualByte("foe2", "0"));
    }

    if (targetIsAlive("you2") || (you2Blink && blinkVisible)) {
      drawActorCell(actorIndex("you2", actingTarget), "1", "heroCell", you2Blink, actorVisualByte("you2", "1"));
    }
  }

  function currentMenuDefinition() {
    var count;

    if (currentTextMenu && currentTextMenu.name === "items") {
      count = potionCount();
      return {
        phase: "items",
        items: count > 0 ?
          [{ label: "POT" + String(count), kind: "target", action: "potion" }] :
          [{ label: "NO POT", kind: "none" }]
      };
    }

    return textMenus[currentTextMenu.name];
  }

  function keepMenuSelectionVisible() {
    var itemCount = currentMenuDefinition().items.length;
    var maxStart = Math.max(0, itemCount - 3);

    if (currentTextMenu.selectedIndex < currentTextMenu.visibleStart) {
      currentTextMenu.visibleStart = currentTextMenu.selectedIndex;
    }

    if (currentTextMenu.selectedIndex >= currentTextMenu.visibleStart + 3) {
      currentTextMenu.visibleStart = currentTextMenu.selectedIndex - 2;
    }

    currentTextMenu.visibleStart = Math.max(0, Math.min(maxStart, currentTextMenu.visibleStart));
  }

  function showMenu() {
    showTextMenu("main");
  }

  function showTextMenu(name) {
    clearBlinkTimer();
    pendingAction = "";
    battle.awaitingActorConfirm = false;
    battle.state = "HERO_MENU";
    currentTextMenu = {
      name: name,
      selectedIndex: 0,
      visibleStart: 0
    };
    busy = false;
    setPhase(currentMenuDefinition().phase);
    setButtons("menu");
    updateStats();
    blinkOn = true;
    drawTextMenu();

    blinkTimer = window.setInterval(function () {
      blinkOn = !blinkOn;
      drawTextMenu();
    }, 350);
  }

  function drawActorTurnPrompt() {
    var textInfo;
    var actorIndex = battle.currentActorIndex < 2 ? battle.currentActorIndex : 0;
    var promptText = actorPromptPage === 0 ?
      actorName(battle.currentActorIndex) :
      String(battle.partyHp[actorIndex]) + "-" + String(battle.partyMaxHp[actorIndex]);

    cells = makeEmptyCells();
    drawActors(null, false, actorTarget(battle.currentActorIndex));
    textInfo = putTextRight(promptText, 2);
    underlineCells(textInfo.startIndex, textInfo.length);
    draw(false);
  }

  function showActorTurnPrompt() {
    clearBlinkTimer();
    pendingAction = "";
    currentTextMenu = null;
    busy = false;
    battle.awaitingActorConfirm = true;
    battle.state = "HERO_PROMPT";
    setPhase(actorName(battle.currentActorIndex));
    setButtons("menu");
    blinkOn = true;
    actorPromptPage = 0;
    actorPromptStartedAt = Date.now();
    actorPromptLastBlinkAt = actorPromptStartedAt;
    drawActorTurnPrompt();

    blinkTimer = window.setInterval(function () {
      var now = Date.now();
      actorPromptPage = Math.floor((now - actorPromptStartedAt) / 800) % 2;
      if (now - actorPromptLastBlinkAt >= 350) {
        actorPromptLastBlinkAt = now;
        blinkOn = !blinkOn;
      }
      drawActorTurnPrompt();
    }, 100);
  }

  function drawTextMenu() {
    var menu = currentMenuDefinition();
    cells = makeEmptyCells();
    keepMenuSelectionVisible();

    for (var row = 0; row < 3; row += 1) {
      var itemIndex = currentTextMenu.visibleStart + row;
      var item = menu.items[itemIndex];

      if (item) {
        var textStart = row * 8 + Math.max(0, 8 - item.label.length);
        putText(item.label, textStart);

        if (itemIndex === currentTextMenu.selectedIndex) {
          underlineCells(textStart, item.label.length);
        }
      }
    }

    draw(false);
  }

  function showTargetSelect(action) {
    if (busy) {
      return;
    }

    clearBlinkTimer();
    currentTextMenu = null;
    pendingAction = action;
    battle.state = "HERO_TARGET";
    selectedTarget = action === "heal" || action === "potion" ? actorTarget(battle.currentActorIndex) : firstAliveTarget("foe", battle.foeHp);
    blinkOn = true;
    setPhase("target");
    setButtons("target");
    drawTargetSelect();

    blinkTimer = window.setInterval(function () {
      blinkOn = !blinkOn;
      drawTargetSelect();
    }, 350);
  }

  function moveMenuSelection(direction) {
    if (busy || pendingAction || !currentTextMenu) {
      return;
    }

    var itemCount = currentMenuDefinition().items.length;
    currentTextMenu.selectedIndex = Math.max(0, Math.min(itemCount - 1, currentTextMenu.selectedIndex + direction));
    drawTextMenu();
  }

  async function confirmMenuSelection() {
    if (busy || pendingAction) {
      return;
    }

    if (battle.awaitingActorConfirm) {
      battle.awaitingActorConfirm = false;
      showMenu();
      return;
    }

    if (!currentTextMenu) {
      return;
    }

    var item = currentMenuDefinition().items[currentTextMenu.selectedIndex];

    if (item.kind === "target") {
      showTargetSelect(item.action);
      return;
    }

    if (item.kind === "submenu") {
      showTextMenu(item.menu);
      return;
    }

    if (item.kind === "none") {
      setStatus("No potions. Press Esc / No to go back.");
      return;
    }

    busy = true;
    clearBlinkTimer();
    battle.state = "ACTION_ANIMATION";
    var actingTarget = actorTarget(battle.currentActorIndex);
    var visualState = currentTextMenu.name === "magic" ? BATTLE_ANIMATION_STATE.magicCommand : "idle";
    showActorActionMessage(item.label, actingTarget, visualState);
    setStatus("Selected " + item.label + ". This is only a test menu item now.");
    await wait(700);
    setActorVisualState(actingTarget, "idle");
    await completeCurrentActorAction();
  }

  function moveTarget(direction) {
    if (busy || !pendingAction) {
      return;
    }

    var targets = aliveTargetsForAction(pendingAction);
    var index = targets.indexOf(selectedTarget);

    if (!targets.length) {
      return;
    }

    if (index === -1) {
      index = 0;
    }

    index = Math.max(0, Math.min(targets.length - 1, index + direction));
    selectedTarget = targets[index];
    drawTargetSelect();
  }

  function cancelBattleSelection() {
    if (busy && !currentTextMenu && !pendingAction && !battle.awaitingActorConfirm) {
      return;
    }

    if (pendingAction) {
      pendingAction = "";
      showMenu();
      setStatus("Cancelled target selection.");
      return;
    }

    if (currentTextMenu && currentTextMenu.name !== "main") {
      showMenu();
      setStatus("Back to battle menu.");
      return;
    }

    if (currentTextMenu && currentTextMenu.name === "main") {
      setStatus("Choose HIT, HEAL, MAGIC, or ITEM.");
    }
  }

  function drawTargetSelect() {
    cells = makeEmptyCells();
    ensureSelectedTarget();
    drawActors();
    if (targetIsFoe(selectedTarget)) {
      putText(nameForTarget(selectedTarget), 16);
      underlineCells(16, 4);
    } else {
      putText(nameForTarget(selectedTarget), 20);
      underlineCells(20, 4);
    }

    if (selectedTarget === "foe1") underlineCells(0, 2);
    if (selectedTarget === "you1") underlineCells(6, 2);
    if (selectedTarget === "foe2") underlineCells(8, 2);
    if (selectedTarget === "you2") underlineCells(14, 2);

    draw(false);
  }

  function textPages(message) {
    var words = String(message || "").toUpperCase().trim().split(/\s+/);
    var pages = [];
    var current = "";
    var word;
    var chunk;
    var index;

    for (index = 0; index < words.length; index += 1) {
      word = words[index];
      while (word.length > model.DISPLAY_CELLS) {
        chunk = word.slice(0, model.DISPLAY_CELLS);
        word = word.slice(model.DISPLAY_CELLS);
        if (current) {
          pages.push(current);
          current = "";
        }
        pages.push(chunk);
      }
      if (!word) {
        continue;
      }
      if (!current) {
        current = word;
      } else if (current.length + 1 + word.length <= model.DISPLAY_CELLS) {
        current += " " + word;
      } else {
        pages.push(current);
        current = word;
      }
    }

    if (current) {
      pages.push(current);
    }
    return pages.length ? pages : [""];
  }

  function showMessagePage(message) {
    clearBlinkTimer();
    cells = makeEmptyCells();
    putText(message.toUpperCase().slice(0, model.DISPLAY_CELLS), 0);
    setPhase(message);
    setButtons("busy");
    updateStats();
    draw(false);
  }

  function showMessage(message) {
    showMessagePage(message);
  }

  function showActorActionMessage(message, actorTargetName, visualStateName) {
    clearBlinkTimer();
    cells = makeEmptyCells();
    setActorVisualState(actorTargetName, visualStateName);
    drawActors(null, false, actorTargetName);
    putText(message.toUpperCase().slice(0, model.DISPLAY_CELLS), 0);
    setPhase(message);
    setButtons("busy");
    updateStats();
    draw(false);
  }

  function waitForBattleEndInput(message) {
    var pages = textPages(message);
    var pageIndex = 0;

    showMessagePage(pages[pageIndex]);
    setButtons("dismiss");
    return new Promise(function (resolve) {
      endMessageDismissHandler = function () {
        if (pageIndex < pages.length - 1) {
          pageIndex += 1;
          showMessagePage(pages[pageIndex]);
          setButtons("dismiss");
        } else {
          endMessageDismissHandler = null;
          resolve();
        }
      };
    });
  }

  function dismissBattleEndMessage() {
    if (!endMessageDismissHandler) {
      return false;
    }

    endMessageDismissHandler();
    return true;
  }

  async function restartAfterMessage(outcome) {
    var xpMessage = "";

    clearChargeTimer();
    persistPartyHpToProject();
    if (outcome && outcome.key === "victory" && outcome.finalBossVictory !== true &&
        window.SevenSegEmulator &&
        typeof window.SevenSegEmulator.awardVictoryXp === "function") {
      xpMessage = window.SevenSegEmulator.awardVictoryXp();
      if (xpMessage) {
        outcome.text = (outcome.text || "Victory") + " " + xpMessage;
        outcome.xpAwarded = true;
        outcome.xpMessage = xpMessage;
      }
    }
    battle.state = "ENDING";
    busy = true;
    setButtons("dismiss");
    setStatus(String(outcome.text || "Battle ended") + ". Press a battle button.");
    await waitForBattleEndInput(outcome.text);
    draw(true);

    if (endHandler) {
      var handler = endHandler;
      endHandler = null;
      battleActive = false;
      handler(outcome);
      return;
    }

    startBattle();
    if (xpMessage) {
      setStatus(outcome.text || xpMessage);
    }
  }

  function showBattleLine(heroRow, enemyRow, effectStep, blinkIndex, damageText, damageStart, actingTarget) {
    cells = makeEmptyCells();
    drawActors(null, false, actingTarget);

    if (battle.foeHp[enemyRow] > 0) {
      cells[actorIndex("foe" + (enemyRow + 1), actingTarget)].className += " activeCell";
    }

    if (battle.partyHp[heroRow] > 0) {
      cells[actorIndex("you" + (heroRow + 1), actingTarget)].className += " activeCell";
    }

    if (effectStep) {
      overlaySegmentByte(effectStep.index, effectStep.byte);
    }

    if (blinkIndex !== null) {
      cells[blinkIndex].className += " blinkCell";
    }

    if (damageText) {
      putText(damageText, damageStart);
    }

    draw(false);
  }

  function percentRoll() {
    return 1 + Math.floor(Math.max(0, Math.min(0.999999, battle.randomSource())) * 100);
  }

  function rollDie(sides) {
    return 1 + Math.floor(Math.max(0, Math.min(0.999999, battle.randomSource())) * sides);
  }

  function randomRange(min, max) {
    return min + Math.floor(Math.max(0, Math.min(0.999999, battle.randomSource())) * (max - min + 1));
  }

  function actorStat(actor, key, fallback) {
    var value = actor && actor[key] !== undefined ? Number(actor[key]) : fallback;
    return isFinite(value) ? value : fallback;
  }

  function physicalPower(actor) {
    return actorStat(actor, "attackPower", 1) + actorStat(actor, "weaponPower", 0);
  }

  function magicPower(actor) {
    return actorStat(actor, "magicPower", 0) + actorStat(actor, "spellPower", 0);
  }

  function resistancePercent(defender, mode) {
    return mode === "magic" ? actorStat(defender, "resistanceMagic", 100) : actorStat(defender, "resistancePhysical", 100);
  }

  function applyResistance(damage, defender, mode) {
    return Math.max(0, Math.round(damage * resistancePercent(defender, mode) / 100));
  }

  function finishDamage(hit, critical, damage, hitChance, defender, mode) {
    var finalDamage = hit ? applyResistance(Math.max(1, Math.round(damage)), defender, mode) : 0;

    return {
      hit: Boolean(hit),
      critical: Boolean(critical),
      damage: finalDamage,
      hitChance: hitChance
    };
  }

  function calculateHitChance(attacker, defender, mode) {
    return clampStat(
      actorStat(attacker, "accuracy", 75) - actorStat(defender, "evasion", 0) + (mode === "magic" ? 0 : Math.floor(actorStat(attacker, "level", 1) / 3)),
      75,
      5,
      95
    );
  }

  function selectedBattleCalcMethod() {
    var rules = project && project.battleRules && typeof project.battleRules === "object" ? project.battleRules : {};
    var method = rules.calculationMethod || (rules.data && rules.data.calculationMethod) || "simple11";
    var exists = BATTLE_CALC_METHODS.some(function (entry) {
      return entry.id === method;
    });

    return exists ? method : "simple11";
  }

  function calculateSimple11(attacker, defender, mode) {
    var power = mode === "magic" ? magicPower(attacker) : physicalPower(attacker);
    var defense = mode === "magic" ? actorStat(defender, "magicDefense", 0) : actorStat(defender, "defense", 0);
    var hitChance = calculateHitChance(attacker, defender, mode);

    if (percentRoll() > hitChance) {
      return finishDamage(false, false, 0, hitChance, defender, mode);
    }

    return finishDamage(true, false, Math.max(1, power + randomRange(0, Math.max(0, power)) - defense), hitChance, defender, mode);
  }

  function calculateDnd5e(attacker, defender, mode) {
    var attackBonus = Math.floor((mode === "magic" ? magicPower(attacker) : physicalPower(attacker)) / 4) + Math.floor(actorStat(attacker, "level", 1) / 4);
    var armorClass = 10 + Math.floor((mode === "magic" ? actorStat(defender, "magicDefense", 0) : actorStat(defender, "defense", 0)) / 4);
    var roll = rollDie(20);
    var critical = roll === 20 || percentRoll() <= actorStat(attacker, "criticalChance", 0);
    var hit = roll === 20 || (roll !== 1 && roll + attackBonus >= armorClass);
    var base = (mode === "magic" ? magicPower(attacker) : physicalPower(attacker)) + rollDie(8);

    return finishDamage(hit, critical, critical ? base * 2 : base, clampStat(55 + attackBonus * 5 - armorClass * 2, 75, 5, 95), defender, mode);
  }

  function calculatePathfinder2e(attacker, defender, mode) {
    var attackBonus = actorStat(attacker, "level", 1) + Math.floor((mode === "magic" ? magicPower(attacker) : physicalPower(attacker)) / 4);
    var defenseNumber = 10 + actorStat(defender, "level", 1) + Math.floor((mode === "magic" ? actorStat(defender, "magicDefense", 0) : actorStat(defender, "defense", 0)) / 4);
    var roll = rollDie(20);
    var total = roll + attackBonus;
    var hit = roll === 20 || (roll !== 1 && total >= defenseNumber);
    var critical = hit && (roll === 20 || total >= defenseNumber + 10);
    var base = (mode === "magic" ? magicPower(attacker) : physicalPower(attacker)) + rollDie(6);

    return finishDamage(hit, critical, critical ? base * 2 : base, clampStat(50 + attackBonus * 4 - defenseNumber * 2, 75, 5, 95), defender, mode);
  }

  function calculateGurps(attacker, defender, mode) {
    var skill = 8 + Math.floor((mode === "magic" ? magicPower(attacker) : physicalPower(attacker)) / 10);
    var defense = 8 + Math.floor(actorStat(defender, "evasion", 0) / 20);
    var attackRoll = rollDie(6) + rollDie(6) + rollDie(6);
    var defendRoll = rollDie(6) + rollDie(6) + rollDie(6);
    var hit = attackRoll <= skill && defendRoll > defense;
    var armor = Math.floor((mode === "magic" ? actorStat(defender, "magicDefense", 0) : actorStat(defender, "defense", 0)) / 3);
    var damage = rollDie(6) + Math.floor((mode === "magic" ? magicPower(attacker) : physicalPower(attacker)) / 5) - armor;

    return finishDamage(hit, false, damage, clampStat(skill * 6 - defense * 3, 65, 5, 95), defender, mode);
  }

  function calculateFate(attacker, defender, mode) {
    var attackSkill = Math.floor((mode === "magic" ? magicPower(attacker) : physicalPower(attacker)) / 25);
    var defendSkill = Math.floor((mode === "magic" ? actorStat(defender, "magicDefense", 0) : actorStat(defender, "defense", 0)) / 25) + Math.floor(actorStat(defender, "evasion", 0) / 25);
    var shifts = attackSkill + randomRange(-4, 4) - defendSkill - randomRange(-4, 4);
    var weapon = Math.floor((mode === "magic" ? actorStat(attacker, "spellPower", 0) : actorStat(attacker, "weaponPower", 0)) / 25);

    return finishDamage(shifts > 0, false, shifts + weapon, clampStat(60 + attackSkill * 8 - defendSkill * 8, 65, 5, 95), defender, mode);
  }

  function calculateCoc(attacker, defender, mode) {
    var skill = actorStat(attacker, "accuracy", 75);
    var dodge = actorStat(defender, "evasion", 0);
    var attackRoll = percentRoll();
    var defendRoll = percentRoll();
    var attackLevel = attackRoll <= Math.floor(skill / 5) ? 3 : attackRoll <= Math.floor(skill / 2) ? 2 : attackRoll <= skill ? 1 : 0;
    var defendLevel = defendRoll <= Math.floor(dodge / 5) ? 3 : defendRoll <= Math.floor(dodge / 2) ? 2 : defendRoll <= dodge ? 1 : 0;
    var hit = attackLevel > 0 && attackLevel >= defendLevel;
    var damage = rollDie(8) + Math.floor((mode === "magic" ? magicPower(attacker) : physicalPower(attacker)) / 5) - Math.floor((mode === "magic" ? actorStat(defender, "magicDefense", 0) : actorStat(defender, "defense", 0)) / 5);

    return finishDamage(hit, attackLevel === 3, attackLevel === 3 ? damage * 2 : damage, clampStat(skill - dodge, 60, 5, 95), defender, mode);
  }

  function calculateDicePool(attacker, defender, mode, sides) {
    var pool = 1 + Math.floor((mode === "magic" ? magicPower(attacker) : physicalPower(attacker)) / 20);
    var defendPool = 1 + Math.floor((actorStat(defender, "evasion", 0) + (mode === "magic" ? actorStat(defender, "magicDefense", 0) : actorStat(defender, "defense", 0))) / 30);
    var hits = 0;
    var blocks = 0;
    var i;

    for (i = 0; i < pool; i += 1) {
      if (rollDie(sides) >= Math.ceil(sides * 0.66)) hits += 1;
    }
    for (i = 0; i < defendPool; i += 1) {
      if (rollDie(sides) >= Math.ceil(sides * 0.66)) blocks += 1;
    }

    return { net: hits - blocks, pool: pool, defendPool: defendPool };
  }

  function calculateShadowrun(attacker, defender, mode) {
    var result = calculateDicePool(attacker, defender, mode, 6);
    var base = 2 + Math.floor((mode === "magic" ? magicPower(attacker) : physicalPower(attacker)) / 12);

    return finishDamage(result.net > 0, false, base + result.net, clampStat(45 + result.pool * 8 - result.defendPool * 6, 60, 5, 95), defender, mode);
  }

  function calculateWorldOfDarkness(attacker, defender, mode) {
    var result = calculateDicePool(attacker, defender, mode, 10);
    var base = 1 + Math.floor((mode === "magic" ? magicPower(attacker) : physicalPower(attacker)) / 25);

    return finishDamage(result.net > 0, false, base + result.net, clampStat(50 + result.pool * 7 - result.defendPool * 6, 60, 5, 95), defender, mode);
  }

  function calculateFf1(attacker, defender, mode) {
    var hitChance = calculateHitChance(attacker, defender, mode);

    if (percentRoll() > hitChance) {
      return finishDamage(false, false, 0, hitChance, defender, mode);
    }

    var power = mode === "magic" ? magicPower(attacker) : physicalPower(attacker);
    var defense = mode === "magic" ? actorStat(defender, "magicDefense", 0) : actorStat(defender, "defense", 0);
    var hits = 1 + Math.floor(actorStat(attacker, "level", 1) / 16);
    var damage = Math.max(1, randomRange(power, Math.max(power, power * 2)) - defense) * hits;
    var critical = percentRoll() <= actorStat(attacker, "criticalChance", 0);

    return finishDamage(true, critical, critical ? damage + power : damage, hitChance, defender, mode);
  }

  function calculateDragonQuest(attacker, defender, mode) {
    var hitChance = calculateHitChance(attacker, defender, mode);

    if (percentRoll() > hitChance) {
      return finishDamage(false, false, 0, hitChance, defender, mode);
    }

    var power = mode === "magic" ? magicPower(attacker) : physicalPower(attacker);
    var defense = mode === "magic" ? actorStat(defender, "magicDefense", 0) : actorStat(defender, "defense", 0);
    var adjusted = Math.max(1, Math.floor(power / 2) - Math.floor(defense / 4));
    var critical = percentRoll() <= actorStat(attacker, "criticalChance", 0);

    return finishDamage(true, critical, critical ? Math.max(1, power) : randomRange(Math.max(1, Math.floor(adjusted * 0.75)), Math.max(1, Math.ceil(adjusted * 1.25))), hitChance, defender, mode);
  }

  function calculatePokemon(attacker, defender, mode) {
    var accuracy = calculateHitChance(attacker, defender, mode);

    if (percentRoll() > accuracy) {
      return finishDamage(false, false, 0, accuracy, defender, mode);
    }

    var level = actorStat(attacker, "level", 1);
    var power = Math.max(1, mode === "magic" ? magicPower(attacker) : physicalPower(attacker));
    var attackStat = Math.max(1, mode === "magic" ? actorStat(attacker, "magicPower", 1) : actorStat(attacker, "attackPower", 1));
    var defenseStat = Math.max(1, mode === "magic" ? actorStat(defender, "magicDefense", 1) : actorStat(defender, "defense", 1));
    var critical = percentRoll() <= actorStat(attacker, "criticalChance", 0);
    var base = (((2 * level / 5 + 2) * power * attackStat / defenseStat) / 50) + 2;
    var randomPercent = randomRange(85, 100);

    return finishDamage(true, critical, base * randomPercent / 100 * (critical ? 1.5 : 1), accuracy, defender, mode);
  }

  function calculateBattleAttack(attacker, defender, mode) {
    var method = selectedBattleCalcMethod();

    if (method === "dnd5e") return calculateDnd5e(attacker, defender, mode);
    if (method === "pathfinder2e") return calculatePathfinder2e(attacker, defender, mode);
    if (method === "gurps") return calculateGurps(attacker, defender, mode);
    if (method === "fate") return calculateFate(attacker, defender, mode);
    if (method === "coc") return calculateCoc(attacker, defender, mode);
    if (method === "shadowrun5e") return calculateShadowrun(attacker, defender, mode);
    if (method === "worldofdarkness") return calculateWorldOfDarkness(attacker, defender, mode);
    if (method === "ff1") return calculateFf1(attacker, defender, mode);
    if (method === "dragonquest") return calculateDragonQuest(attacker, defender, mode);
    if (method === "pokemon") return calculatePokemon(attacker, defender, mode);
    return calculateSimple11(attacker, defender, mode);
  }

  function calculatePhysicalAttack(attacker, defender) {
    return calculateBattleAttack(attacker, defender, "physical");
  }

  async function blinkDefeated(target) {
    battle.state = "DEFEATED_BLINK";
    setPhase("defeated");
    setActorVisualState(target, BATTLE_ANIMATION_STATE.defeated);

    for (var i = 0; i < DEFEATED_BLINK_STEPS; i += 1) {
      cells = makeEmptyCells();
      drawActors(target, i % 2 === 0);
      draw(false);
      await wait(DEFEATED_BLINK_MS);
    }

    setActorVisualState(target, "idle");
    cells = makeEmptyCells();
    drawActors();
    draw(false);
  }

  function battleOutcome() {
    var foesDown = battle.foeHp[0] <= 0 && battle.foeHp[1] <= 0;
    var partyDown = battle.partyHp[0] <= 0 && battle.partyHp[1] <= 0;

    if (foesDown) {
      if (battle.isFinalBossEncounter) {
        setMinimalRpgFlag(finalBossVictoryFlag(), true);
        return {
          key: "victory",
          finalBossVictory: true,
          xpAwarded: true,
          text: readProjectText(finalBossVictoryTextId(), "You have saved the world, Thank you.")
        };
      }

      return {
        key: "victory",
        text: readProjectText(VICTORY_TEXT_ID, "Victory")
      };
    }

    if (partyDown) {
      return {
        key: "defeat",
        text: readProjectText(GAME_OVER_TEXT_ID, "Game over")
      };
    }

    return null;
  }

  function actorIsQueued(actorIndex) {
    return battle.readyQueue.indexOf(actorIndex) !== -1;
  }

  function removeDeadReadyActors() {
    battle.readyQueue = battle.readyQueue.filter(function (actorIndex) {
      return actorIsAlive(actorIndex);
    });
  }

  function drawChargingTimers() {
    cells = makeEmptyCells();
    drawActors();

    for (var heroIndex = ACTOR_YOU1; heroIndex <= ACTOR_YOU2; heroIndex += 1) {
      var dotCount = timerDotCount(heroIndex);
      var dotStart = heroIndex === ACTOR_YOU1 ? 4 : 12;

      for (var dot = 0; dot < dotCount; dot += 1) {
        cells[dotStart + dot].dp = true;
      }
    }

    setPhase("charging");
    setButtons("busy");
    updateStats();
    draw(false);
  }

  function beginCharging() {
    clearBlinkTimer();
    clearChargeTimer();
    pendingAction = "";
    currentTextMenu = null;
    busy = true;
    battle.awaitingActorConfirm = false;
    battle.currentActorIndex = -1;
    battle.state = "CHARGING";
    battle.lastTimerTick = Date.now();
    resetActorVisualStates();
    drawChargingTimers();

    chargeTimer = window.setInterval(updateActorTimers, TIMER_TICK_MS);
  }

  function updateActorTimers() {
    if (!battleActive || !battle || battle.state !== "CHARGING") {
      return;
    }

    var now = Date.now();
    var elapsed = Math.max(0, now - battle.lastTimerTick);
    var newlyReady = [];
    battle.lastTimerTick = now;

    for (var actorIndex = 0; actorIndex < ACTOR_COUNT; actorIndex += 1) {
      if (!actorIsAlive(actorIndex) || actorIsQueued(actorIndex)) {
        continue;
      }

      var uncappedTimer = battle.actorTimers[actorIndex] + elapsed * actorSwiftness(actorIndex);
      battle.actorTimers[actorIndex] = Math.min(TIMER_FULL, uncappedTimer);

      if (battle.actorTimers[actorIndex] >= TIMER_FULL) {
        newlyReady.push({
          actorIndex: actorIndex,
          score: uncappedTimer
        });
      }
    }

    if (newlyReady.length) {
      newlyReady.sort(function (left, right) {
        if (left.score !== right.score) {
          return right.score - left.score;
        }

        return left.actorIndex - right.actorIndex;
      });

      for (var readyIndex = 0; readyIndex < newlyReady.length; readyIndex += 1) {
        battle.readyQueue.push(newlyReady[readyIndex].actorIndex);
      }

      clearChargeTimer();
      startNextReadyActor();
      return;
    }

    drawChargingTimers();
  }

  async function completeCurrentActorAction() {
    var outcome = battleOutcome();

    if (outcome) {
      await restartAfterMessage(outcome);
      return;
    }

    battle.actorTimers[battle.currentActorIndex] = 0;
    battle.currentActorIndex = -1;
    removeDeadReadyActors();

    if (battle.readyQueue.length) {
      startNextReadyActor();
    } else {
      beginCharging();
    }
  }

  async function runFoeTurn() {
    battle.state = "FOE_DECIDE";
    busy = true;
    setButtons("busy");
    await enemyAttack(battle.currentActorIndex);
    await completeCurrentActorAction();
  }

  function startNextReadyActor() {
    clearChargeTimer();
    removeDeadReadyActors();

    var outcome = battleOutcome();
    if (outcome) {
      restartAfterMessage(outcome);
      return;
    }

    if (!battle.readyQueue.length) {
      beginCharging();
      return;
    }

    battle.currentActorIndex = battle.readyQueue.shift();

    if (actorIsHero(battle.currentActorIndex)) {
      battle.state = "HERO_PROMPT";
      showActorTurnPrompt();
      return;
    }

    runFoeTurn().catch(function (error) {
      clearChargeTimer();
      battleActive = false;
      setStatus("Battle stopped: " + error.message);
    });
  }

  async function playerAttack() {
    var foeIndex = targetIndex(selectedTarget);
    var heroIndex = battle.currentActorIndex;
    var actingTarget = actorTarget(heroIndex);
    var rowStart = foeIndex * 8;
    var path = battleEffectStepPath(heroIndex, foeIndex, false);
    var targetCell = actorIndex("foe" + (foeIndex + 1), null);
    var targetNameValue = "foe" + (foeIndex + 1);

    battle.state = "ACTION_ANIMATION";
    setPhase("attack");
    setActorVisualState(actingTarget, BATTLE_ANIMATION_STATE.hitCommand);
    showBattleLine(heroIndex, foeIndex, null, null, "", 0, null);
    await wait(180);

    for (var step = 0; step < path.length; step += 1) {
      showBattleLine(heroIndex, foeIndex, path[step], null, "", 0, step < 2 ? actingTarget : null);
      await wait(110);
    }

    var attackResult = calculatePhysicalAttack(battle.partyBattleStats[heroIndex], battle.foeBattleStats[foeIndex]);
    var damageAmount = attackResult.damage;
    var damageText = attackResult.hit ? "-" + String(damageAmount) : "MISS";

    setActorVisualState(targetNameValue, attackResult.hit ? BATTLE_ANIMATION_STATE.targetHit : "idle");
    showBattleLine(heroIndex, foeIndex, null, targetCell, damageText, rowStart + 2, null);
    await wait(170);
    showBattleLine(heroIndex, foeIndex, null, null, damageText, rowStart + 2, null);
    await wait(170);
    setActorVisualState(actingTarget, "idle");
    setActorVisualState(targetNameValue, "idle");
    var oldFoeHp = battle.foeHp[foeIndex];
    battle.foeHp[foeIndex] = Math.max(0, battle.foeHp[foeIndex] - damageAmount);
    battle.foeBattleStats[foeIndex].currentHp = battle.foeHp[foeIndex];
    updateStats();

    if (oldFoeHp > 0 && battle.foeHp[foeIndex] <= 0) {
      await blinkDefeated("foe" + (foeIndex + 1));
    } else {
      showBattleLine(heroIndex, foeIndex, null, null, "", 0, actingTarget);
      await wait(180);
    }
  }

  function randomLivingPartyIndex() {
    var living = [];

    for (var partyIndex = 0; partyIndex < battle.partyHp.length; partyIndex += 1) {
      if (battle.partyHp[partyIndex] > 0) {
        living.push(partyIndex);
      }
    }

    if (!living.length) {
      return -1;
    }

    var randomValue = Math.max(0, Math.min(0.999999, battle.randomSource()));
    return living[Math.floor(randomValue * living.length)];
  }

  async function enemyAttack(foeActorIndex) {
    var foeIndex = foeActorIndex - ACTOR_FOE1;
    var heroIndex = randomLivingPartyIndex();
    var actingTarget;
    var targetNameValue;

    if (foeIndex < 0 || foeIndex >= battle.foeHp.length || battle.foeHp[foeIndex] <= 0 || heroIndex < 0) {
      return;
    }

    actingTarget = "foe" + (foeIndex + 1);
    targetNameValue = "you" + (heroIndex + 1);
    var rowStart = heroIndex * 8;

    battle.state = "ACTION_ANIMATION";
    setPhase("enemy");
    setActorVisualState(actingTarget, BATTLE_ANIMATION_STATE.hitCommand);
    showBattleLine(heroIndex, foeIndex, null, null, "", 0);
    await wait(180);

    var path = battleEffectStepPath(heroIndex, foeIndex, true);
    for (var projectile = 0; projectile < path.length; projectile += 1) {
      showBattleLine(heroIndex, foeIndex, path[projectile], null, "", 0);
      await wait(110);
    }

    var attackResult = calculatePhysicalAttack(battle.foeBattleStats[foeIndex], battle.partyBattleStats[heroIndex]);
    var damageAmount = attackResult.damage;
    var damageText = attackResult.hit ? "-" + String(damageAmount) : "MISS";

    setActorVisualState(targetNameValue, attackResult.hit ? BATTLE_ANIMATION_STATE.targetHit : "idle");
    showBattleLine(heroIndex, foeIndex, null, actorIndex("you" + (heroIndex + 1), null), damageText, rowStart + 4);
    await wait(170);
    showBattleLine(heroIndex, foeIndex, null, null, damageText, rowStart + 4);
    await wait(170);
    setActorVisualState(actingTarget, "idle");
    setActorVisualState(targetNameValue, "idle");
    var oldPartyHp = battle.partyHp[heroIndex];
    battle.partyHp[heroIndex] = Math.max(0, battle.partyHp[heroIndex] - damageAmount);
    battle.partyBattleStats[heroIndex].currentHp = battle.partyHp[heroIndex];
    updateStats();

    if (oldPartyHp > 0 && battle.partyHp[heroIndex] <= 0) {
      await blinkDefeated("you" + (heroIndex + 1));
    } else {
      showBattleLine(heroIndex, foeIndex, null, null, "", 0);
      await wait(180);
    }
  }

  async function healPlayer() {
    var heroIndex = targetIndex(selectedTarget);
    var rowStart = heroIndex * 8;
    var actingTarget = actorTarget(battle.currentActorIndex);
    var targetCell = actorIndex("you" + (heroIndex + 1), actingTarget);

    battle.state = "ACTION_ANIMATION";
    setPhase("heal");
    setActorVisualState(actingTarget, "heal");
    cells = makeEmptyCells();
    drawActors(null, false, actingTarget);
    var healAmount = Math.max(1, battle.partyHeal[battle.currentActorIndex] || 50);
    var appliedHeal = Math.max(0, Math.min(healAmount, battle.partyMaxHp[heroIndex] - battle.partyHp[heroIndex]));
    var healText = String(appliedHeal);

    putText(healText, rowStart + 4);
    cells[targetCell].className += " blinkCell";
    draw(false);
    await wait(170);
    cells = makeEmptyCells();
    drawActors(null, false, actingTarget);
    putText(healText, rowStart + 4);
    draw(false);
    battle.partyHp[heroIndex] = Math.min(battle.partyMaxHp[heroIndex], battle.partyHp[heroIndex] + appliedHeal);
    battle.partyBattleStats[heroIndex].currentHp = battle.partyHp[heroIndex];
    updateStats();
    await wait(280);
    setActorVisualState(actingTarget, "idle");
  }

  async function usePotion() {
    var heroIndex = targetIndex(selectedTarget);
    var rowStart = heroIndex * 8;
    var actingTarget = actorTarget(battle.currentActorIndex);
    var targetCell = actorIndex("you" + (heroIndex + 1), actingTarget);
    var healAmount = potionHealAmount();
    var appliedHeal = Math.max(0, Math.min(healAmount, battle.partyMaxHp[heroIndex] - battle.partyHp[heroIndex]));
    var healText = String(appliedHeal);

    setPotionCount(potionCount() - 1);
    battle.state = "ACTION_ANIMATION";
    setPhase("item");
    setActorVisualState(actingTarget, "heal");
    cells = makeEmptyCells();
    drawActors(null, false, actingTarget);
    putText(healText, rowStart + 4);
    cells[targetCell].className += " blinkCell";
    draw(false);
    await wait(170);
    cells = makeEmptyCells();
    drawActors(null, false, actingTarget);
    putText(healText, rowStart + 4);
    draw(false);
    battle.partyHp[heroIndex] = Math.min(battle.partyMaxHp[heroIndex], battle.partyHp[heroIndex] + appliedHeal);
    battle.partyBattleStats[heroIndex].currentHp = battle.partyHp[heroIndex];
    updateStats();
    setStatus("Potion used. Potions = " + String(potionCount()) + ".");
    await wait(280);
    setActorVisualState(actingTarget, "idle");
  }

  async function finishPendingAction() {
    if (busy || !pendingAction) {
      return;
    }

    if (pendingAction === "hit" && !targetIsFoe(selectedTarget)) {
      setStatus("HIT targets FOE1 or FOE2 in this standalone test.");
      return;
    }

    if ((pendingAction === "heal" || pendingAction === "potion") && !targetIsYou(selectedTarget)) {
      setStatus((pendingAction === "potion" ? "POTION" : "HEAL") + " targets YOU1 or YOU2 in this standalone test.");
      return;
    }

    if (pendingAction === "potion" && potionCount() <= 0) {
      setStatus("No potions.");
      showTextMenu("items");
      return;
    }

    if (!targetIsSelectableForAction(pendingAction, selectedTarget)) {
      setStatus(nameForTarget(selectedTarget) + " has 0 HP.");
      return;
    }

    busy = true;
    clearBlinkTimer();
    setButtons("busy");

    if (pendingAction === "hit") {
      await playerAttack();
    } else if (pendingAction === "potion") {
      await usePotion();
    } else {
      await healPlayer();
    }

    pendingAction = "";
    await completeCurrentActorAction();
  }

  function startBattle(options) {
    clearBlinkTimer();
    clearChargeTimer();
    endMessageDismissHandler = null;
    endHandler = options && options.onEnd ? options.onEnd : null;
    displayElementId = options && options.displayElementId ? options.displayElementId : "battleGrid";
    var config = createBattleConfig(options || {});
    var startStatus;

    battleActive = true;
    battle = {
      partyNames: [config.partySlots[0].name, config.partySlots[1].name],
      foeNames: [config.foeSlots[0].name, config.foeSlots[1].name],
      partyBattleStats: [config.partySlots[0], config.partySlots[1]],
      foeBattleStats: [config.foeSlots[0], config.foeSlots[1]],
      partyHp: [config.partySlots[0].currentHp, config.partySlots[1].currentHp],
      partyMaxHp: [config.partySlots[0].maxHp, config.partySlots[1].maxHp],
      foeHp: [config.foeSlots[0].currentHp, config.foeSlots[1].currentHp],
      foeMaxHp: [config.foeSlots[0].maxHp, config.foeSlots[1].maxHp],
      partyAttack: [config.partySlots[0].attack, config.partySlots[1].attack],
      foeAttack: [config.foeSlots[0].attack, config.foeSlots[1].attack],
      partyHeal: [config.partySlots[0].healing, config.partySlots[1].healing],
      actorSwiftness: [
        config.partySlots[0].swiftness,
        config.partySlots[1].swiftness,
        config.foeSlots[0].swiftness,
        config.foeSlots[1].swiftness
      ],
      actorTimers: [0, 0, 0, 0],
      readyQueue: [],
      currentActorIndex: -1,
      encounterGroupId: config.encounterGroupId,
      isFinalBossEncounter: config.isFinalBossEncounter,
      encounterName: config.encounterName,
      awaitingActorConfirm: false,
      lastTimerTick: 0,
      randomSource: config.randomSource,
      actorVisualStates: ["idle", "idle", "idle", "idle"],
      state: "CHARGING"
    };
    project.battle.playerHp = battle.partyMaxHp[0];
    project.battle.beastHp = battle.foeMaxHp[0];
    project.battle.playerAttack = battle.partyAttack[0] || project.battle.playerAttack;
    project.battle.playerHeal = battle.partyHeal[0] || project.battle.playerHeal;
    pendingAction = "";
    currentTextMenu = null;
    busy = true;
    updateBattleButtons();
    setButtons("busy");
    beginCharging();
    if (window.SevenSegMusicRuntime &&
        window.SevenSegMusicRuntime.isEnabled &&
        window.SevenSegMusicRuntime.isEnabled()) {
      window.SevenSegMusicRuntime.playMode(project, "battle");
    }
    startStatus = config.isFinalBossEncounter ?
      "Boss battle: " + (readableName(battle.foeNames[0]) || "Boss") + "." :
      (endHandler ? "Combined battle started." : "Standalone battle started.");
    setStatus(startStatus);
  }

  function connectButtons() {
    function handleUp() {
      if (dismissBattleEndMessage()) return;
      if (pendingAction) {
        moveTarget(-1);
      } else {
        moveMenuSelection(-1);
      }
    }

    function handleDown() {
      if (dismissBattleEndMessage()) return;
      if (pendingAction) {
        moveTarget(1);
      } else {
        moveMenuSelection(1);
      }
    }

    function handleConfirm() {
      if (dismissBattleEndMessage()) return;
      if (pendingAction) {
        finishPendingAction();
      } else {
        confirmMenuSelection();
      }
    }

    function handleCancel() {
      if (dismissBattleEndMessage()) return;
      cancelBattleSelection();
    }

    document.getElementById("startBattleButton").addEventListener("click", function () {
      if (dismissBattleEndMessage()) return;
      startBattle();
    });
    document.getElementById("hitButton").addEventListener("click", function () {
      if (dismissBattleEndMessage()) return;
      showTargetSelect("hit");
    });
    document.getElementById("healButton").addEventListener("click", function () {
      if (dismissBattleEndMessage()) return;
      showTargetSelect("heal");
    });
    document.getElementById("targetFoe1Button").addEventListener("click", function () {
      if (dismissBattleEndMessage()) return;
      selectTarget("foe1");
    });
    document.getElementById("targetFoe2Button").addEventListener("click", function () {
      if (dismissBattleEndMessage()) return;
      selectTarget("foe2");
    });
    document.getElementById("targetYou1Button").addEventListener("click", function () {
      if (dismissBattleEndMessage()) return;
      selectTarget("you1");
    });
    document.getElementById("targetYou2Button").addEventListener("click", function () {
      if (dismissBattleEndMessage()) return;
      selectTarget("you2");
    });
    document.getElementById("targetUpButton").addEventListener("click", handleUp);
    document.getElementById("targetDownButton").addEventListener("click", handleDown);
    document.getElementById("confirmBattleButton").addEventListener("click", handleConfirm);
    document.getElementById("cancelBattleButton").addEventListener("click", handleCancel);
    document.getElementById("browserBattleUpButton").addEventListener("click", handleUp);
    document.getElementById("browserBattleDownButton").addEventListener("click", handleDown);
    document.getElementById("browserBattleConfirmButton").addEventListener("click", handleConfirm);
    document.getElementById("browserBattleBackButton").addEventListener("click", handleCancel);
    document.addEventListener("keydown", function (event) {
      var tagName = event.target.tagName;

      if (tagName === "INPUT" || tagName === "TEXTAREA") {
        return;
      }

      if (endMessageDismissHandler) {
        event.preventDefault();
        dismissBattleEndMessage();
        return;
      }

      if (!battleActive) {
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (pendingAction) {
          moveTarget(-1);
        } else {
          moveMenuSelection(-1);
        }
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        if (pendingAction) {
          moveTarget(1);
        } else {
          moveMenuSelection(1);
        }
      } else if (event.key === "Enter" && !busy) {
        event.preventDefault();
        if (pendingAction) {
          finishPendingAction();
        } else {
          confirmMenuSelection();
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        cancelBattleSelection();
      }
    });
  }

  function initBattle(options) {
    model = options.model;
    project = options.project;
    statusHandler = options.setStatus;
    changeHandler = options.onProjectChanged;
    cells = makeEmptyCells();
    connectButtons();
    setButtons("busy");
    renderBattlePreview();
    draw(true);
  }

  window.SevenSegBattle = {
    calculationMethods: BATTLE_CALC_METHODS.slice(),
    init: initBattle,
    start: startBattle,
    refresh: function () {
      if (!battleActive) {
        renderBattlePreview();
      } else {
        draw(false);
      }
    },
    isActive: function () {
      return battleActive;
    }
  };
}());

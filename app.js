(function () {
  "use strict";

  var model = window.SevenSegModel;
  var currentProject = model.createDefaultProjectV2();
  model.attachV1CompatibilityToV2(currentProject);
  var projectDirty = true;
  var activeFilename = null;
  var lastObservedProjectFingerprint = "";
  var projectDialogState = null;
  var recoveryDirty = false;
  var recoveryDebounceTimer = null;
  var recoveryMaximumTimer = null;
  var recoveryWarningShown = false;
  var recoveryOffer = null;
  var sharedDisplayEditor = null;
  var globalTextGlyphEditor = null;
  var preflightDebounceTimer = null;
  var currentPreflightReport = null;
  var INTRO_TEXT_ID = "text_intro";
  var VICTORY_TEXT_ID = "text_victory";
  var GAME_OVER_TEXT_ID = "text_game_over";
  var GLOBAL_TEXT_GLYPH_STORAGE_KEY = "SevenSegQuestMaker:globalTextGlyphs:v1";
  var partyStatInputs = [
    { id: "partyLevelInput", key: "level", min: 1, max: 99, fallback: 1 },
    { id: "partyHpStatInput", key: "maxHp", min: 1, max: 999, fallback: 30 },
    { id: "partyMpStatInput", key: "maxMp", min: 0, max: 999, fallback: 10 },
    { id: "partyStrInput", key: "str", min: 0, max: 99, fallback: 6 },
    { id: "partyDexInput", key: "dex", min: 0, max: 99, fallback: 0 },
    { id: "partyIntInput", key: "int", min: 0, max: 99, fallback: 5 },
    { id: "partyWisInput", key: "wis", min: 0, max: 99, fallback: 4 },
    { id: "partyConInput", key: "con", min: 0, max: 99, fallback: 0 },
    { id: "partyArmorInput", key: "armor", min: 0, max: 99, fallback: 5 },
    { id: "partyMagicArmorInput", key: "magicArmor", min: 0, max: 99, fallback: 4 },
    { id: "partySpeedInput", key: "speed", min: 1, max: 99, fallback: 10 },
    { id: "partyCritInput", key: "crit", min: 0, max: 75, fallback: 5 },
    { id: "partyDodgeInput", key: "dodge", min: 0, max: 60, fallback: 3 },
    { id: "partyHitRateInput", key: "hitRate", min: 5, max: 95, fallback: 75 },
    { id: "partyHealInput", key: "healing", min: 1, max: 999, fallback: 8 }
  ];
  var enemyStatInputs = [
    { id: "enemyLevelInput", key: "level", min: 1, max: 99, fallback: 1 },
    { id: "enemyHpStatInput", key: "maxHp", min: 1, max: 999, fallback: 10 },
    { id: "enemyMpStatInput", key: "maxMp", min: 0, max: 999, fallback: 0 },
    { id: "enemyStrInput", key: "str", min: 0, max: 99, fallback: 4 },
    { id: "enemyDexInput", key: "dex", min: 0, max: 99, fallback: 0 },
    { id: "enemyIntInput", key: "int", min: 0, max: 99, fallback: 0 },
    { id: "enemyWisInput", key: "wis", min: 0, max: 99, fallback: 0 },
    { id: "enemyConInput", key: "con", min: 0, max: 99, fallback: 0 },
    { id: "enemyArmorInput", key: "armor", min: 0, max: 99, fallback: 2 },
    { id: "enemyMagicArmorInput", key: "magicArmor", min: 0, max: 99, fallback: 0 },
    { id: "enemySpeedInput", key: "speed", min: 1, max: 99, fallback: 5 },
    { id: "enemyCritInput", key: "crit", min: 0, max: 75, fallback: 3 },
    { id: "enemyDodgeInput", key: "dodge", min: 0, max: 60, fallback: 4 },
    { id: "enemyHitRateInput", key: "hitRate", min: 5, max: 95, fallback: 70 },
    { id: "enemyAttackPowerInput", key: "weaponPower", min: 0, max: 99, fallback: 0 }
  ];

  var hardwareNotes = [
    "Working sketch uses SPI.h with Arduino Nano hardware SPI pins: DIN 11, CLK 13, CS 10.",
    "Three MAX7219 chips are daisy chained; the test animation writes one 8-digit module and blanks the other two.",
    "MAX7219 setup: display test off, normal operation, no decode mode, scan all 8 digits, intensity 0x08.",
    "Animation frame data is stored in PROGMEM as 8 bytes per frame; digit order may need a mirror option later.",
    "POT_PIN A4 controls animation speed in the working battle-menu mockup sketch."
  ];

  function setStatus(message) {
    document.getElementById("statusMessage").textContent = message;
  }

  function refreshAdvancedEditors() {
    if (window.SevenSegGlyphEditor && window.SevenSegGlyphEditor.refresh) {
      window.SevenSegGlyphEditor.refresh();
    }
    if (window.SevenSegFrameEditor && window.SevenSegFrameEditor.refresh) {
      window.SevenSegFrameEditor.refresh();
    }
    if (window.SevenSegAnimationEditor && window.SevenSegAnimationEditor.refresh) {
      window.SevenSegAnimationEditor.refresh();
    }
    if (window.SevenSegVisualImport018 && window.SevenSegVisualImport018.refresh) {
      window.SevenSegVisualImport018.refresh();
    }
    if (window.SevenSegBattle && window.SevenSegBattle.refresh) {
      window.SevenSegBattle.refresh();
    }
  }

  function setAdvancedToolsVisible(isVisible) {
    var button = document.getElementById("advancedToolsButton");

    document.body.classList.toggle("advancedToolsHidden", !isVisible);
    if (button) {
      button.setAttribute("aria-expanded", isVisible ? "true" : "false");
      button.textContent = isVisible ? "Hide advanced tools" : "Show advanced tools";
    }
    if (isVisible) {
      refreshAdvancedEditors();
    }
  }

  function handleAdvancedToolsToggle() {
    setAdvancedToolsVisible(document.body.classList.contains("advancedToolsHidden"));
  }

  function clampInputNumber(inputId, min, max, fallback) {
    var node = document.getElementById(inputId);
    var value = node ? Number(node.value) : fallback;

    if (!Number.isFinite(value)) {
      value = fallback;
    }

    return Math.max(min, Math.min(max, Math.round(value)));
  }

  function setInputValue(inputId, value) {
    var node = document.getElementById(inputId);

    if (node) {
      node.value = String(value);
    }
  }

  function numberFromObject(object, key, fallback) {
    var keys = Array.isArray(key) ? key : [key];
    var value = fallback;

    if (object) {
      keys.some(function (candidate) {
        if (object[candidate] !== undefined) {
          value = Number(object[candidate]);
          return true;
        }

        return false;
      });
    }

    return Number.isFinite(value) ? Math.round(value) : fallback;
  }

  function updateBattleJsonImportStatus(message) {
    var node = document.getElementById("battleJsonImportStatus");

    if (node) {
      node.textContent = message;
    }
  }

  function battleCalculationMethods() {
    if (window.SevenSegBattle && Array.isArray(window.SevenSegBattle.calculationMethods)) {
      return window.SevenSegBattle.calculationMethods;
    }

    return [
      { id: "simple11", name: "11. Ultra simple attack vs defense" }
    ];
  }

  function ensureBattleRules() {
    if (!currentProject.battleRules || typeof currentProject.battleRules !== "object") {
      currentProject.battleRules = {};
    }
    if (!currentProject.battleRules.data || typeof currentProject.battleRules.data !== "object") {
      currentProject.battleRules.data = {};
    }
    if (!currentProject.battleRules.calculationMethod) {
      currentProject.battleRules.calculationMethod = currentProject.battleRules.data.calculationMethod || "simple11";
    }

    currentProject.battleRules.data.calculationMethod = currentProject.battleRules.calculationMethod;
    return currentProject.battleRules;
  }

  function populateBattleCalculationMethodSelect() {
    var select = document.getElementById("battleCalculationMethodSelect");

    if (!select) return;

    select.innerHTML = "";
    battleCalculationMethods().forEach(function (method) {
      var option = document.createElement("option");
      option.value = method.id;
      option.textContent = method.name;
      select.appendChild(option);
    });
  }

  function refreshBattleCalculationMethodInput() {
    var select = document.getElementById("battleCalculationMethodSelect");
    var rules = ensureBattleRules();

    if (!select) return;

    select.value = rules.calculationMethod || "simple11";
    if (select.value !== (rules.calculationMethod || "simple11")) {
      select.value = "simple11";
      rules.calculationMethod = "simple11";
      rules.data.calculationMethod = "simple11";
    }
  }

  function updateBattleCalculationMethodFromInput() {
    var select = document.getElementById("battleCalculationMethodSelect");
    var rules = ensureBattleRules();

    if (!select) return;

    rules.calculationMethod = select.value || "simple11";
    rules.data.calculationMethod = rules.calculationMethod;
  }

  function cloneJson(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function ensureFirstHero() {
    if (!Array.isArray(currentProject.heroes)) {
      currentProject.heroes = [];
    }

    if (!currentProject.heroes[0]) {
      currentProject.heroes[0] = {
        id: "hero_you1",
        name: "You1",
        stats: {},
        equipmentIds: [],
        spellIds: [],
        abilityIds: [],
        animationIds: {},
        dataVersion: 1,
        data: {}
      };
    }

    if (!currentProject.heroes[0].stats || typeof currentProject.heroes[0].stats !== "object") {
      currentProject.heroes[0].stats = {};
    }
    if (!currentProject.heroes[0].data || typeof currentProject.heroes[0].data !== "object") {
      currentProject.heroes[0].data = {};
    }

    return currentProject.heroes[0];
  }

  function ensureFirstEnemy() {
    if (!Array.isArray(currentProject.enemies)) {
      currentProject.enemies = [];
    }

    if (!currentProject.enemies[0]) {
      currentProject.enemies[0] = {
        id: "enemy_one",
        name: "Foe",
        stats: {},
        swiftness: { mode: "randomPerBattle", min: 1, max: 10 },
        dropTable: [],
        animationIds: {},
        dataVersion: 1,
        data: {}
      };
    }

    if (!currentProject.enemies[0].stats || typeof currentProject.enemies[0].stats !== "object") {
      currentProject.enemies[0].stats = {};
    }
    if (!currentProject.enemies[0].data || typeof currentProject.enemies[0].data !== "object") {
      currentProject.enemies[0].data = {};
    }

    return currentProject.enemies[0];
  }

  function applyStatInputsToRecord(record, inputMap) {
    inputMap.forEach(function (entry) {
      record.stats[entry.key] = clampInputNumber(entry.id, entry.min, entry.max, entry.fallback);
    });
  }

  function statInputValue(stats, entry) {
    var aliases = {
      maxHp: ["maxHp", "maxHP", "hp"],
      maxMp: ["maxMp", "maxMP", "mp"],
      str: ["str", "attackPower", "attack"],
      int: ["int", "magicPower", "magic"],
      armor: ["armor", "defense"],
      magicArmor: ["magicArmor", "magicDefense"],
      crit: ["crit", "criticalChance"],
      dodge: ["dodge", "evasion"],
      hitRate: ["hitRate", "accuracy"],
      healing: ["healing", "healPower", "heal"],
      weaponPower: ["weaponPower"]
    };
    var keys = aliases[entry.key] || [entry.key];

    return numberFromObject(stats, keys, entry.fallback);
  }

  function updateManualBattleStatsFromInputs(options) {
    var hero = ensureFirstHero();
    var enemy = ensureFirstEnemy();
    var minimal = ensureMinimalRpgData(currentProject);
    var shouldResetHeroHp = !options || options.resetHeroHp !== false;
    var previousHeroStats = hero.stats && typeof hero.stats === "object" && !Array.isArray(hero.stats) ?
      cloneJson(hero.stats) :
      {};
    var previousMaxHp;
    var previousLevel;

    ensureBattleRules();
    hero.name = String(document.getElementById("partyNameInput").value || "YOU1").slice(0, 8);
    enemy.name = String(document.getElementById("enemyNameInput").value || "FOE1").slice(0, 8);
    applyStatInputsToRecord(hero, partyStatInputs);
    applyStatInputsToRecord(enemy, enemyStatInputs);

    hero.stats.maxHpBase = hero.stats.maxHp;
    hero.stats.maxMpBase = hero.stats.maxMp;
    hero.stats.strBase = hero.stats.str;
    hero.stats.dexBase = hero.stats.dex;
    hero.stats.intBase = hero.stats.int;
    hero.stats.wisBase = hero.stats.wis;
    hero.stats.conBase = hero.stats.con;
    hero.stats.armorBase = hero.stats.armor;
    hero.stats.magicArmorBase = hero.stats.magicArmor;
    hero.stats.speedBase = hero.stats.speed;
    hero.stats.critBase = hero.stats.crit;
    hero.stats.dodgeBase = hero.stats.dodge;
    hero.stats.hitRateBase = hero.stats.hitRate;
    hero.stats.attack = hero.stats.str;
    hero.stats.defense = hero.stats.armor;
    hero.stats.magic = hero.stats.int;
    hero.stats.magicDefense = hero.stats.wis;
    hero.stats.swiftness = hero.stats.speed;

    if (!shouldResetHeroHp) {
      previousMaxHp = Math.max(
        Number(previousHeroStats.maxHP) || 0,
        Number(previousHeroStats.maxHp) || 0,
        Number(previousHeroStats.maxHpBase) || 0
      );
      previousLevel = Number(previousHeroStats.level) || 0;

      if (previousMaxHp > Number(hero.stats.maxHp || 0)) {
        hero.stats.maxHp = previousMaxHp;
        hero.stats.maxHpBase = previousMaxHp;
      }
      if (previousLevel > Number(hero.stats.level || 0)) {
        hero.stats.level = previousLevel;
      }
    }

    if (shouldResetHeroHp) {
      hero.stats.currentHP = hero.stats.maxHp;
      minimal.heroCurrentHP = hero.stats.currentHP;
    } else if (minimal.heroCurrentHP !== undefined) {
      hero.stats.currentHP = Math.max(0, Math.min(hero.stats.maxHp, Math.round(Number(minimal.heroCurrentHP || 0))));
    } else {
      hero.stats.currentHP = Math.max(0, Math.min(hero.stats.maxHp, Math.round(Number(hero.stats.currentHP || hero.stats.currentHp || hero.stats.maxHp))));
      minimal.heroCurrentHP = hero.stats.currentHP;
    }
    hero.stats.currentHp = hero.stats.currentHP;
    hero.stats.maxHP = hero.stats.maxHp;
    hero.stats.currentMP = hero.stats.maxMp;
    hero.stats.maxMP = hero.stats.maxMp;
    hero.stats.attackPower = hero.stats.str;
    hero.stats.magicPower = hero.stats.int;
    hero.stats.accuracy = hero.stats.hitRate;
    hero.stats.evasion = hero.stats.dodge;
    hero.stats.criticalChance = hero.stats.crit;
    hero.stats.resistancePhysical = hero.stats.resistancePhysical || 100;
    hero.stats.resistanceMagic = hero.stats.resistanceMagic || 100;
    hero.stats.weaponPower = hero.stats.weaponPower || 0;
    hero.stats.spellPower = hero.stats.spellPower || 0;
    hero.stats.healPower = hero.stats.healing;

    enemy.stats.attack = enemy.stats.str;
    enemy.stats.defense = enemy.stats.armor;
    enemy.stats.magic = enemy.stats.int;
    enemy.stats.magicDefense = enemy.stats.wis;
    if (!enemy.swiftness || enemy.swiftness.mode === "randomPerBattle") {
      enemy.swiftness = { mode: "fixed" };
    }
    enemy.stats.swiftness = enemy.stats.speed;
    enemy.stats.currentHP = enemy.stats.maxHp;
    enemy.stats.maxHP = enemy.stats.maxHp;
    enemy.stats.currentMP = enemy.stats.maxMp;
    enemy.stats.maxMP = enemy.stats.maxMp;
    enemy.stats.attackPower = enemy.stats.str;
    enemy.stats.magicPower = enemy.stats.int;
    enemy.stats.accuracy = enemy.stats.hitRate;
    enemy.stats.evasion = enemy.stats.dodge;
    enemy.stats.criticalChance = enemy.stats.crit;
    enemy.stats.resistancePhysical = enemy.stats.resistancePhysical || 100;
    enemy.stats.resistanceMagic = enemy.stats.resistanceMagic || 100;
    enemy.stats.weaponPower = enemy.stats.weaponPower || 0;
    enemy.stats.spellPower = enemy.stats.spellPower || 0;

    if (currentProject.battle && typeof currentProject.battle === "object") {
      currentProject.battle.playerHp = Math.max(1, Math.min(99, hero.stats.maxHp));
      currentProject.battle.beastHp = Math.max(1, Math.min(99, enemy.stats.maxHp));
      currentProject.battle.playerAttack = Math.max(1, Math.min(99, hero.stats.str));
      currentProject.battle.playerHeal = Math.max(1, Math.min(99, hero.stats.healing));
    }
  }

  function refreshManualBattleStatsInputs() {
    var hero = ensureFirstHero();
    var enemy = ensureFirstEnemy();

    document.getElementById("partyNameInput").value = hero.name || "YOU1";
    document.getElementById("enemyNameInput").value = enemy.name || "FOE1";
    partyStatInputs.forEach(function (entry) {
      setInputValue(entry.id, statInputValue(hero.stats, entry));
    });
    enemyStatInputs.forEach(function (entry) {
      setInputValue(entry.id, statInputValue(enemy.stats, entry));
    });
  }

  function applyLoadedHeroJson(payload) {
    var hero = payload && payload.hero;
    var identity = hero && hero.identity;
    var stats = hero && hero.stats;
    var projectHero;

    if (!hero || !identity || !stats) {
      throw new Error("Hero JSON must contain hero.identity and hero.stats.");
    }

    setInputValue("partyNameInput", String(identity.name || "YOU1").slice(0, 8));
    setInputValue("partyLevelInput", numberFromObject(stats, "level", 1));
    setInputValue("partyHpStatInput", numberFromObject(stats, ["maxHP", "hp"], 30));
    setInputValue("partyMpStatInput", numberFromObject(stats, ["maxMP", "mp"], 0));
    setInputValue("partyStrInput", numberFromObject(stats, ["attackPower", "attack"], 1));
    setInputValue("partyDexInput", numberFromObject(stats, "dex", 0));
    setInputValue("partyIntInput", numberFromObject(stats, ["magicPower", "magic"], 0));
    setInputValue("partyWisInput", numberFromObject(stats, "magicDefense", 0));
    setInputValue("partyConInput", numberFromObject(stats, "con", 0));
    setInputValue("partyArmorInput", numberFromObject(stats, "defense", 0));
    setInputValue("partyMagicArmorInput", numberFromObject(stats, "magicDefense", 0));
    setInputValue("partySpeedInput", numberFromObject(stats, "speed", 1));
    setInputValue("partyCritInput", numberFromObject(stats, ["criticalChance", "crit"], 5));
    setInputValue("partyDodgeInput", numberFromObject(stats, ["evasion", "dodge"], 3));
    setInputValue("partyHitRateInput", numberFromObject(stats, ["accuracy", "hitRate"], 75));
    setInputValue("partyHealInput", numberFromObject(stats, ["healPower", "heal"], 1));
    updateManualBattleStatsFromInputs();
    projectHero = ensureFirstHero();
    projectHero.data.importedVisuals = isPlainObject(payload.animations) ? cloneJson(payload.animations) : {};
    projectHero.data.sourceHeroJsonId = String(identity.id || "");
  }

  function applyLoadedFoeJson(payload) {
    var monster = payload && payload.monster;
    var identity = monster && monster.identity;
    var stats = monster && monster.stats;
    var projectEnemy;

    if (!monster || !identity || !stats) {
      throw new Error("Foe JSON must contain monster.identity and monster.stats.");
    }

    setInputValue("enemyNameInput", String(identity.name || "FOE1").slice(0, 8));
    setInputValue("enemyLevelInput", numberFromObject(stats, "level", 1));
    setInputValue("enemyHpStatInput", numberFromObject(stats, ["maxHP", "hp"], 10));
    setInputValue("enemyMpStatInput", numberFromObject(stats, ["maxMP", "mp"], 0));
    setInputValue("enemyStrInput", numberFromObject(stats, ["attackPower", "attack"], 1));
    setInputValue("enemyDexInput", numberFromObject(stats, "dex", 0));
    setInputValue("enemyIntInput", numberFromObject(stats, ["magicPower", "magic"], 0));
    setInputValue("enemyWisInput", numberFromObject(stats, "magicDefense", 0));
    setInputValue("enemyConInput", numberFromObject(stats, "con", 0));
    setInputValue("enemyArmorInput", numberFromObject(stats, "defense", 0));
    setInputValue("enemyMagicArmorInput", numberFromObject(stats, "magicDefense", 0));
    setInputValue("enemySpeedInput", numberFromObject(stats, "speed", 1));
    setInputValue("enemyCritInput", numberFromObject(stats, ["criticalChance", "crit"], 3));
    setInputValue("enemyDodgeInput", numberFromObject(stats, ["evasion", "dodge"], 4));
    setInputValue("enemyHitRateInput", numberFromObject(stats, ["accuracy", "hitRate"], 70));
    setInputValue("enemyAttackPowerInput", numberFromObject(stats, "weaponPower", 0));
    updateManualBattleStatsFromInputs();
    projectEnemy = ensureFirstEnemy();
    projectEnemy.data.importedVisuals = isPlainObject(payload.animations) ? cloneJson(payload.animations) : {};
    projectEnemy.data.sourceMonsterJsonId = String(identity.id || "");
  }

  function readBattleStatsJsonFile(file, kind) {
    var reader;

    if (!file) {
      return;
    }

    reader = new FileReader();
    reader.onload = function () {
      try {
        var payload = JSON.parse(String(reader.result || ""));

        if (kind === "hero") {
          applyLoadedHeroJson(payload);
          updateBattleJsonImportStatus("Loaded Hero JSON: " + (payload.hero.identity.name || payload.hero.identity.id || file.name));
        } else {
          applyLoadedFoeJson(payload);
          updateBattleJsonImportStatus("Loaded Foe JSON: " + (payload.monster.identity.name || payload.monster.identity.id || file.name));
        }

        markProjectDirty();
        if (window.SevenSegBattle && window.SevenSegBattle.refresh) {
          window.SevenSegBattle.refresh();
        }
      } catch (error) {
        updateBattleJsonImportStatus("Could not load " + kind + " JSON: " + error.message);
        setStatus("Battle JSON import failed.");
      }
    };
    reader.onerror = function () {
      updateBattleJsonImportStatus("Could not read " + file.name + ".");
      setStatus("Battle JSON import failed.");
    };
    reader.readAsText(file);
  }

  function currentProjectTitle() {
    return String(currentProject.title || "Untitled Quest");
  }

  function projectFingerprint() {
    try {
      if (model.detectProjectVersion(currentProject) === 2) {
        return JSON.stringify(model.prepareV2ProjectForValidation(currentProject));
      }
      return JSON.stringify(currentProject);
    } catch (error) {
      return "";
    }
  }

  function formatByteCount(bytes) {
    if (bytes < 1024) return bytes + " bytes";
    return (bytes / 1024).toFixed(1) + " KB";
  }

  function utf8ByteCount(text) {
    if (window.TextEncoder) {
      return new TextEncoder().encode(text).length;
    }
    return unescape(encodeURIComponent(text)).length;
  }

  function findById(list, id) {
    if (!Array.isArray(list)) return null;
    for (var index = 0; index < list.length; index += 1) {
      if (list[index] && list[index].id === id) {
        return list[index];
      }
    }
    return null;
  }

  function setTextContent(id, text) {
    var node = document.getElementById(id);

    if (node) {
      node.textContent = text;
    }
  }

  function minimalRpgData(project) {
    return project && project.gameFlow && project.gameFlow.data &&
      project.gameFlow.data.minimalRpg &&
      typeof project.gameFlow.data.minimalRpg === "object" ?
      project.gameFlow.data.minimalRpg :
      {};
  }

  function ensureMinimalRpgData(project) {
    if (!project.gameFlow) {
      project.gameFlow = {};
    }
    if (!project.gameFlow.data || typeof project.gameFlow.data !== "object" || Array.isArray(project.gameFlow.data)) {
      project.gameFlow.data = {};
    }
    if (!project.gameFlow.data.minimalRpg ||
        typeof project.gameFlow.data.minimalRpg !== "object" ||
        Array.isArray(project.gameFlow.data.minimalRpg)) {
      project.gameFlow.data.minimalRpg = {};
    }

    return project.gameFlow.data.minimalRpg;
  }

  function enemyNameForSection(project, section) {
    var group;
    var member;
    var enemy;
    var enemyId = section && section.data ? section.data.enemyKind : "";

    if (section && section.data && section.data.encounterGroupId) {
      group = findById(project.encounterGroups, section.data.encounterGroupId);
      member = group && Array.isArray(group.members) ? group.members[0] : null;
      if (member && member.enemyId) {
        enemyId = member.enemyId;
      }
    }

    enemy = findById(project.enemies, enemyId);
    return enemy ? (enemy.name || enemy.id) : (enemyId || "none");
  }

  function refreshMinimalRpgSummary(project) {
    var minimal = minimalRpgData(project);
    var worlds = Array.isArray(project && project.worlds) ? project.worlds : [];
    var sections = Array.isArray(project && project.sections) ? project.sections : [];
    var chests = Array.isArray(minimal.chests) ? minimal.chests : [];
    var goldChests = chests.filter(function (chest) {
      return chest && chest.lootKind === "gold10";
    });
    var potionChests = chests.filter(function (chest) {
      return chest && chest.lootKind === "potion";
    });
    var keyChest = chests.some(function (chest) {
      return chest && chest.lootKind === "ancientKey";
    });
    var swordChest = chests.some(function (chest) {
      return chest && chest.lootKind === "sword";
    });
    var potion = findById(project && project.items, "item_potion");
    var sword = findById(project && project.equipment, "equipment_sword");
    var hero = findById(project && project.heroes, "hero_you1") ||
      (project && Array.isArray(project.heroes) ? project.heroes[0] : null);
    var flags = minimal.flags || {};
    var openedChests = minimal.openedChests || {};
    var openedCount = Object.keys(openedChests).filter(function (key) {
      return openedChests[key] === true;
    }).length;
    var saveData = project && project.saveData ? project.saveData : {};
    var saveFields = Array.isArray(saveData.stateFields) ? saveData.stateFields : [];
    var saveScope = saveData.data && saveData.data.scope ? saveData.data.scope : "";
    var sectionEnemyParts = sections.slice(0, 2).map(function (section) {
      return String(section.name || section.id) + ": " + enemyNameForSection(project, section);
    });
    var heroStats = hero && hero.stats ? hero.stats : {};
    var heroCurrentHp = minimal.heroCurrentHP !== undefined ? minimal.heroCurrentHP :
      (heroStats.currentHP !== undefined ? heroStats.currentHP :
      (heroStats.currentHp !== undefined ? heroStats.currentHp :
        (heroStats.maxHP !== undefined ? heroStats.maxHP : heroStats.maxHp)));
    var heroMaxHp = heroStats.maxHP !== undefined ? heroStats.maxHP : heroStats.maxHp;
    var swordBonus = sword && sword.data ?
      Number(sword.data.attackPowerBonus || sword.data.attack || 0) :
      0;
    var baseAttack = Number(heroStats.attackPower || heroStats.attack || heroStats.str || 0);
    var swordEquipped = minimal.swordEquipped === true ||
      (hero && Array.isArray(hero.equipmentIds) && hero.equipmentIds.indexOf("equipment_sword") !== -1);
    var effectiveAttack = baseAttack + (swordEquipped ? Math.max(0, Math.round(swordBonus || 0)) : 0);
    var healAmount = potion && potion.data ? Number(potion.data.healAmount || 0) : 0;

    setTextContent("minimalWorldSummary", worlds.length + " world, " + sections.length + " sections");
    setTextContent("minimalEnemySummary", sectionEnemyParts.length ? sectionEnemyParts.join("; ") : "none");
    setTextContent("minimalChestSummary",
      chests.length + " total, " + goldChests.length + " gold, " + potionChests.length +
      " potion, " + openedCount + " opened, Gold " + String(Number(minimal.currentGold || 0)));
    setTextContent("minimalKeyChestSummary", keyChest ? "Yes" : "No");
    setTextContent("minimalSwordChestSummary", swordChest ? "Yes" : "No");
    setTextContent("minimalPotionSummary",
      (healAmount ? "+" + healAmount + "HP" : "Missing") + ", owned " + String(Number(minimal.potionCount || 0)));
    setTextContent("minimalSwordBonusSummary",
      (swordBonus ? "+" + swordBonus + " attack" : "Missing") +
      (swordEquipped ? ", equipped" : ", not equipped"));
    setTextContent("minimalHeroProgressSummary",
      "Level " + String(heroStats.level || 1) +
      ", XP " + String(heroStats.xp || 0) + "/" + String(heroStats.xpNext || "?") +
      ", HP " + String(heroCurrentHp !== undefined ? heroCurrentHp : "?") +
      "/" + String(heroMaxHp !== undefined ? heroMaxHp : "?") +
      ", ATK " + String(effectiveAttack || "?"));
    setTextContent("minimalKeyFlagSummary", flags.hasAncientKey === true ? "true" : "false");
    setTextContent("minimalBossFlagSummary", flags.bossDefeated === true ? "true" : "false");
    setTextContent("minimalSaveScopeSummary",
      (saveScope || "custom") + ", " + saveFields.length + " fields");
  }

  function validateCurrentProjectForHub() {
    var version = model.detectProjectVersion(currentProject);
    var migration;
    var validation;
    var prepared;

    if (version === 1) {
      migration = model.migrateProjectV1ToV2(currentProject);
      if (migration.errors.length) {
        return {
          project: null,
          errors: migration.errors,
          warnings: migration.warnings
        };
      }
      prepared = model.prepareV2ProjectForValidation(migration.project);
    } else if (version === 2) {
      prepared = model.prepareV2ProjectForValidation(currentProject);
    } else {
      return {
        project: null,
        errors: ["Project format is not recognized."],
        warnings: []
      };
    }

    validation = model.validateProjectV2(prepared);
    return {
      project: validation.project,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  function refreshHubSummary() {
    var titleInput = document.getElementById("projectTitleInput");
    var dirtyLabel = document.getElementById("dirtyStateLabel");
    var schemaLabel = document.getElementById("schemaVersionLabel");
    var validation;
    var project;
    var jsonText;
    var completion;
    var roomCount;
    var frameCount;
    var heroCount;
    var enemyCount;

    if (!titleInput) return;

    if (document.activeElement !== titleInput) {
      titleInput.value = currentProjectTitle();
    }
    schemaLabel.textContent = "Schema v" + String(
      model.detectProjectVersion(currentProject) === 2 ? 2 : 1
    );
    dirtyLabel.textContent = projectDirty ? "Unsaved changes" : "Saved";
    dirtyLabel.classList.toggle("isSaved", !projectDirty);

    validation = validateCurrentProjectForHub();
    project = validation.project;
    roomCount = project && Array.isArray(project.rooms) ? project.rooms.length : 0;
    frameCount = project && Array.isArray(project.frames) ? project.frames.length : 0;
    heroCount = project && Array.isArray(project.heroes) ? project.heroes.length : 0;
    enemyCount = project && Array.isArray(project.enemies) ? project.enemies.length : 0;

    if (validation.errors.length) {
      completion = "Has errors";
    } else if (roomCount >= 2 && heroCount >= 1 && enemyCount >= 1 &&
        project.encounterGroups.length >= 1) {
      completion = "Starter ready";
    } else {
      completion = "Incomplete";
    }

    document.getElementById("completionState").textContent = completion;
    document.getElementById("errorCount").textContent = String(validation.errors.length);
    document.getElementById("warningCount").textContent = String(validation.warnings.length);
    document.getElementById("contentSummary").textContent =
      roomCount + " rooms, " + frameCount + " frames, " +
      heroCount + " heroes, " + enemyCount + " foes";
    document.getElementById("worldDataSummary").textContent =
      "about " + String(roomCount * 9 + 9) + " bytes";

    jsonText = project ? JSON.stringify(project) : "";
    document.getElementById("jsonSizeSummary").textContent =
      jsonText ? formatByteCount(utf8ByteCount(jsonText)) : "-";
    document.getElementById("errorCount").title = validation.errors.join("\n");
    document.getElementById("warningCount").title = validation.warnings.join("\n");
    refreshMinimalRpgSummary(project || currentProject);
    schedulePreflight();
  }

  function formatResourceBytes(bytes, capacity, approximate) {
    return (approximate ? "about " : "") +
      String(bytes) + " / " + String(capacity) + " bytes";
  }

  function preflightAdvice(code) {
    var advice = {
      FLASH_LIMIT_EXCEEDED: "Reduce room data, duplicate frames, or animation length.",
      SRAM_LIMIT_EXCEEDED: "Reduce simultaneous actors or fixed runtime buffers.",
      EEPROM_LIMIT_EXCEEDED: "Store fewer values in each of the three save slots.",
      WORLD_DIMENSIONS_EXCEEDED: "Keep the world inside 26 x 32 rooms.",
      MISSING_REFERENCE: "Open the named editor and replace the missing reference.",
      PALETTE_CAPACITY_EXCEEDED: "Use no more than eight glyphs in the global palette.",
      MISSING_PROGMEM_CLASSIFICATION: "The owning exporter must place this immutable table in PROGMEM."
    };
    return advice[code] || "";
  }

  function saveModelSummary() {
    var saveData = currentProject && currentProject.saveData ? currentProject.saveData : {};
    var fields = Array.isArray(saveData.stateFields) ? saveData.stateFields : [];
    var slotCount = Number.isFinite(Number(saveData.slotCount)) ? Number(saveData.slotCount) : 0;
    var payloadBytes = fields.reduce(function (sum, field) {
      var byteCount = Number(field && field.byteCount);
      return sum + (Number.isFinite(byteCount) && byteCount > 0 ? byteCount : 0);
    }, 0);
    var globalHeaderBytes = Number(saveData.data && saveData.data.globalHeaderBytes);
    var slotHeaderBytes = Number(saveData.data && saveData.data.slotHeaderBytes);
    var totalBytes = Number(saveData.data && saveData.data.totalEepromBytes);
    var computedTotal = (Number.isFinite(globalHeaderBytes) ? globalHeaderBytes : 4) +
      slotCount * ((Number.isFinite(slotHeaderBytes) ? slotHeaderBytes : 4) + payloadBytes);
    var fieldNames = fields.map(function (field) {
      return field && field.label ? field.label : field && field.id ? field.id : "field";
    });
    var summary = String(slotCount || 0) + " slots, " +
      String(payloadBytes) + " bytes/slot, " +
      String(Number.isFinite(totalBytes) ? totalBytes : computedTotal) + " EEPROM bytes";
    var rules = saveData.saveRules || {};
    var detail = "Fields: " + (fieldNames.length ? fieldNames.join(", ") : "none") +
      ". Rules: worldmap " + String(rules.worldmap || "unknown") +
      ", town " + String(rules.town || "unknown") +
      ", dungeon " + String(rules.dungeon || "unknown") + ".";

    return {
      summary: summary,
      detail: detail
    };
  }

  function renderPreflightMessage(container, entry, blocker) {
    var row = document.createElement("div");
    var title = document.createElement("strong");
    var message = document.createElement("p");
    var path = document.createElement("code");
    var advice = preflightAdvice(entry.code);

    row.className = "preflightMessage " + (blocker ? "isBlocker" : "isWarning");
    title.textContent = blocker ? "Blocker" : "Warning";
    message.textContent = entry.message;
    path.textContent = entry.path || entry.scope || entry.code;
    row.appendChild(title);
    row.appendChild(message);
    row.appendChild(path);
    if (advice) {
      var adviceNode = document.createElement("div");
      adviceNode.className = "preflightAdvice";
      adviceNode.textContent = advice;
      row.appendChild(adviceNode);
    }
    container.appendChild(row);
  }

  function renderProjectPreflight(report) {
    var resource = report.resourceReport;
    var flash = resource.totals.flash;
    var sram = resource.totals.sram;
    var eeprom = resource.totals.eeprom;
    var categories = document.getElementById("preflightCategories");
    var messages = document.getElementById("preflightMessages");
    var combinedButton = document.getElementById("exportCombinedButton");
    var state = document.getElementById("preflightState");
    var saveModel = saveModelSummary();

    document.getElementById("preflightFlash").textContent =
      formatResourceBytes(flash.knownBytes, flash.capacityBytes, flash.estimatedBytes > 0);
    document.getElementById("preflightSram").textContent =
      formatResourceBytes(sram.knownBytes, resource.capacities.sramKnownLimitBytes, true);
    document.getElementById("preflightEeprom").textContent = eeprom.unknown ?
      "at least " + eeprom.knownMinimumBytes + " / " + resource.capacities.eepromBytes + " bytes" :
      formatResourceBytes(eeprom.exactBytes, resource.capacities.eepromBytes, false);
    document.getElementById("preflightWiring").textContent =
      resource.pins.length + " pins, " + resource.timers.length + " timers";
    document.getElementById("preflightSaveModel").textContent = saveModel.summary;
    document.getElementById("preflightSaveModel").title = saveModel.detail;
    document.getElementById("flashEstimateSummary").textContent =
      "about " + flash.knownBytes + " bytes";
    document.getElementById("sramEstimateSummary").textContent =
      "about " + sram.knownBytes + " bytes";

    categories.textContent = "";
    resource.categories.forEach(function (entry) {
      var row = document.createElement("div");
      var label = document.createElement("strong");
      var value = document.createElement("code");
      var detail = document.createElement("span");

      row.className = "preflightCategory";
      label.textContent = entry.label;
      value.textContent = entry.unknown ?
        "Unknown" :
        (entry.estimatedBytes ?
          "about " + entry.estimatedBytes + " bytes" :
          entry.exactBytes + " bytes");
      detail.textContent = entry.details;
      row.appendChild(label);
      row.appendChild(value);
      row.appendChild(detail);
      categories.appendChild(row);
    });

    messages.textContent = "";
    report.blockers.forEach(function (entry) {
      renderPreflightMessage(messages, entry, true);
    });
    report.warnings.forEach(function (entry) {
      renderPreflightMessage(messages, entry, false);
    });
    if (!report.blockers.length && !report.warnings.length) {
      messages.textContent = "No warnings or blockers.";
    }

    combinedButton.disabled = report.blockers.length > 0;
    combinedButton.title = report.blockers.length ?
      "Combined export is blocked. Review Hardware Preflight." :
      "";
    state.textContent = report.blockers.length ?
      report.blockers.length + " blocked" :
      report.warnings.length + " warnings";
  }

  function runProjectPreflight() {
    preflightDebounceTimer = null;
    if (!window.SevenSegPreflight) return;
    currentPreflightReport = window.SevenSegPreflight.run(currentProject, {
      finalExport: false
    });
    renderProjectPreflight(currentPreflightReport);
  }

  function schedulePreflight() {
    if (!document.getElementById("preflightState")) return;
    if (preflightDebounceTimer !== null) {
      window.clearTimeout(preflightDebounceTimer);
    }
    preflightDebounceTimer = window.setTimeout(runProjectPreflight, 180);
  }

  function setProjectDirty(isDirty) {
    projectDirty = Boolean(isDirty);
    lastObservedProjectFingerprint = projectFingerprint();
    refreshHubSummary();
  }

  function markProjectDirty() {
    setProjectDirty(true);
    markProjectForRecovery();
  }

  function markProjectDirtyIfChanged() {
    var fingerprint = projectFingerprint();

    if (fingerprint && fingerprint !== lastObservedProjectFingerprint) {
      lastObservedProjectFingerprint = fingerprint;
      markProjectDirty();
    }
  }

  function finishProjectDialog(result) {
    var state = projectDialogState;
    var dialog = document.getElementById("projectDialog");

    if (!state) return;
    projectDialogState = null;
    if (dialog.open) dialog.close();
    if (state.trigger && state.trigger.focus) state.trigger.focus();
    state.resolve(result);
  }

  function showProjectDialog(options) {
    var dialog = document.getElementById("projectDialog");
    var input = document.getElementById("projectDialogInput");
    var inputLabel = document.getElementById("projectDialogInputLabel");
    var trigger = document.activeElement;

    document.getElementById("projectDialogTitle").textContent = options.title;
    document.getElementById("projectDialogMessage").textContent = options.message;
    document.getElementById("projectDialogConfirmButton").textContent =
      options.confirmLabel || "Confirm";
    input.hidden = !options.inputLabel;
    inputLabel.hidden = !options.inputLabel;
    inputLabel.textContent = options.inputLabel || "Value";
    input.value = options.inputValue || "";

    return new Promise(function (resolve) {
      projectDialogState = {
        resolve: resolve,
        trigger: trigger,
        hasInput: Boolean(options.inputLabel)
      };
      dialog.showModal();
      window.setTimeout(function () {
        if (options.inputLabel) {
          input.focus();
          input.select();
        } else {
          document.getElementById("projectDialogConfirmButton").focus();
        }
      }, 0);
    });
  }

  function connectProjectDialog() {
    var dialog = document.getElementById("projectDialog");
    var form = document.getElementById("projectDialogForm");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      finishProjectDialog(projectDialogState && projectDialogState.hasInput ?
        document.getElementById("projectDialogInput").value : true);
    });
    document.getElementById("projectDialogCancelButton").addEventListener("click", function () {
      finishProjectDialog(false);
    });
    dialog.addEventListener("cancel", function (event) {
      event.preventDefault();
      finishProjectDialog(false);
    });
  }

  window.SevenSegUiDialog = {
    confirm: function (options) {
      return showProjectDialog(options);
    }
  };

  function recoveryStorage() {
    return window.SevenSegProjectStorage;
  }

  function setRecoveryLabel(message) {
    var label = document.getElementById("recoveryStateLabel");

    if (label) {
      label.textContent = message;
    }
  }

  function formatRecoveryClock(isoText) {
    var date = new Date(isoText || "");

    if (!Number.isFinite(date.getTime())) {
      return "";
    }

    return String(date.getHours()).padStart(2, "0") + ":" +
      String(date.getMinutes()).padStart(2, "0");
  }

  function clearRecoveryTimers() {
    if (recoveryDebounceTimer !== null) {
      window.clearTimeout(recoveryDebounceTimer);
      recoveryDebounceTimer = null;
    }
    if (recoveryMaximumTimer !== null) {
      window.clearTimeout(recoveryMaximumTimer);
      recoveryMaximumTimer = null;
    }
  }

  function reportRecoveryFailure(result) {
    if (recoveryWarningShown) {
      return;
    }

    recoveryWarningShown = true;
    setRecoveryLabel("Recovery unavailable");
    setStatus(
      (result && result.unavailable ?
        "Browser recovery is unavailable. " :
        "Browser recovery could not be updated. ") +
      "Editing and JSON save still work."
    );
  }

  function preparedRecoveryProject() {
    var version;
    var migration;
    var prepared;
    var validation;

    updateProjectFromEditableControls();
    version = model.detectProjectVersion(currentProject);

    if (version === 1) {
      migration = model.migrateProjectV1ToV2(currentProject);
      if (migration.errors.length) {
        return { project: null, errors: migration.errors };
      }
      prepared = model.prepareV2ProjectForValidation(migration.project);
    } else if (version === 2) {
      prepared = model.prepareV2ProjectForValidation(currentProject);
    } else {
      return { project: null, errors: ["Active project is not a recognized v1 or v2 project."] };
    }

    validation = model.validateProjectV2(prepared);
    return {
      project: validation.errors.length ? null : validation.project,
      errors: validation.errors
    };
  }

  function saveRecoveryNow() {
    var storage = recoveryStorage();
    var prepared;

    clearRecoveryTimers();
    if (!recoveryDirty || !storage) {
      return Promise.resolve({ ok: false, skipped: true });
    }

    prepared = preparedRecoveryProject();
    if (!prepared.project) {
      reportRecoveryFailure({ unavailable: false });
      return Promise.resolve({
        ok: false,
        malformed: true,
        error: prepared.errors.join(" ")
      });
    }

    return storage.saveRecovery(prepared.project).then(function (result) {
      if (result.ok) {
        var savedClock = formatRecoveryClock(result.record && result.record.savedAt);
        recoveryDirty = false;
        setRecoveryLabel(savedClock ? "Recovery saved " + savedClock : "Recovery saved");
      } else {
        reportRecoveryFailure(result);
      }
      return result;
    });
  }

  function markProjectForRecovery() {
    if (!recoveryStorage()) {
      return;
    }

    recoveryDirty = true;
    setRecoveryLabel("Recovery pending");
    if (recoveryDebounceTimer !== null) {
      window.clearTimeout(recoveryDebounceTimer);
    }
    recoveryDebounceTimer = window.setTimeout(saveRecoveryNow, 2000);

    if (recoveryMaximumTimer === null) {
      recoveryMaximumTimer = window.setTimeout(saveRecoveryNow, 30000);
    }
  }

  function hideRecoveryOffer() {
    if (recoveryOffer) {
      recoveryOffer.hidden = true;
      if (recoveryOffer.dataset.projectTitle) {
        setRecoveryLabel("Recovery available");
      }
    }
  }

  function showRecoveryOffer(info, malformed) {
    var title = info && info.projectTitle ? info.projectTitle : "Unknown project";
    var time = info && info.savedAt ? new Date(info.savedAt).toLocaleString() : "unknown time";
    var message = recoveryOffer.querySelector("[data-recovery-message]");
    var recoverButton = recoveryOffer.querySelector("[data-recovery-recover]");

    message.textContent = malformed ?
      "A browser recovery record exists but cannot be read safely." :
      'Recovery found for "' + title + '" from ' + time + ".";
    recoverButton.hidden = Boolean(malformed);
    recoveryOffer.hidden = false;
    recoveryOffer.dataset.projectTitle = title;
    setRecoveryLabel(malformed ? "Recovery needs attention" : "Recovery available");
  }

  function recoverProject() {
    recoveryStorage().loadRecovery().then(function (result) {
      var validation;

      if (!result.ok || !result.found) {
        setStatus("Recovery could not be loaded. The current project was not changed.");
        if (!result.ok) showRecoveryOffer(null, true);
        return;
      }

      validation = model.validateProjectV2(result.record.projectData);
      if (validation.errors.length) {
        setStatus("Recovery is invalid. The current project was not changed.");
        showRecoveryOffer(result.record, true);
        return;
      }

      replaceCurrentProject(validation.project);
      refreshProjectControls();
      recoveryDirty = true;
      hideRecoveryOffer();
      setProjectDirty(true);
      setStatus("Recovered " + result.record.projectTitle + ". Save JSON to make this the canonical project file.");
    });
  }

  async function discardRecovery() {
    var title = recoveryOffer.dataset.projectTitle || "this project";
    var confirmed = await showProjectDialog({
      title: "Discard browser recovery?",
      message: 'Discard recovery for "' + title + '"? The open project will not be changed.',
      confirmLabel: "Discard recovery"
    });

    if (!confirmed) {
      return;
    }

    recoveryStorage().clearRecovery().then(function (result) {
      if (result.ok) {
        recoveryDirty = false;
        clearRecoveryTimers();
        hideRecoveryOffer();
        recoveryOffer.dataset.projectTitle = "";
        setRecoveryLabel("No recovery");
        setStatus("Browser recovery was discarded.");
      } else {
        reportRecoveryFailure(result);
      }
    });
  }

  function buildRecoveryOffer() {
    recoveryOffer = document.createElement("section");
    recoveryOffer.className = "statusPanel";
    recoveryOffer.hidden = true;
    recoveryOffer.setAttribute("aria-live", "polite");
    recoveryOffer.innerHTML =
      '<strong>Browser recovery</strong> ' +
      '<span data-recovery-message></span> ' +
      '<button type="button" data-recovery-recover>Recover</button> ' +
      '<button type="button" data-recovery-dismiss>Not now</button> ' +
      '<button type="button" data-recovery-discard>Discard recovery</button>';
    document.querySelector(".appShell").insertBefore(
      recoveryOffer,
      document.querySelector(".appShell").firstChild
    );

    recoveryOffer.querySelector("[data-recovery-recover]").addEventListener("click", recoverProject);
    recoveryOffer.querySelector("[data-recovery-dismiss]").addEventListener("click", hideRecoveryOffer);
    recoveryOffer.querySelector("[data-recovery-discard]").addEventListener("click", discardRecovery);
  }

  function checkForRecovery() {
    var storage = recoveryStorage();

    if (!storage) {
      reportRecoveryFailure({ unavailable: true });
      return;
    }

    storage.recoveryInfo().then(function (result) {
      if (!result.ok) {
        if (result.malformed) {
          showRecoveryOffer(null, true);
        } else {
          reportRecoveryFailure(result);
        }
        return;
      }

      if (result.found) {
        recoveryOffer.dataset.projectTitle = result.info.projectTitle;
        showRecoveryOffer(result.info, false);
      } else {
        setRecoveryLabel("No recovery");
      }
    });
  }

  function clearStoredRecovery() {
    var storage = recoveryStorage();

    recoveryDirty = false;
    clearRecoveryTimers();
    hideRecoveryOffer();
    setRecoveryLabel("No recovery");
    if (!storage) {
      return Promise.resolve({ ok: false, unavailable: true });
    }

    return storage.clearRecovery().then(function (result) {
      if (!result.ok) reportRecoveryFailure(result);
      return result;
    });
  }

  function connectRecoveryMutationSignals() {
    document.addEventListener("input", function (event) {
      if (event.target.matches("#playerHpInput, #beastHpInput, .manualStatsPanel input")) {
        if (event.target.closest(".manualStatsPanel")) {
          updateManualBattleStatsFromInputs();
        }
        markProjectDirty();
        if (window.SevenSegBattle && window.SevenSegBattle.refresh) {
          window.SevenSegBattle.refresh();
        }
      }
    });

    document.addEventListener("click", function (event) {
      if (!event.isTrusted) {
        return;
      }

      if (event.target.closest(".frameCell, #generateMapButton, #createRoomButton")) {
        window.setTimeout(markProjectDirtyIfChanged, 0);
      }
    });

    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden" && recoveryDirty) {
        saveRecoveryNow();
      }
    });
  }

  function buildDisplayPreview() {
    var preview = document.getElementById("displayPreview");

    if (!window.SevenSegDisplayEditor) {
      setStatus("Shared display editor could not be loaded.");
      return;
    }

    sharedDisplayEditor = window.SevenSegDisplayEditor.create(preview, {
      label: "Shared 8 by 3 segment editor",
      frame: new Array(model.DISPLAY_CELLS).fill(0)
    });
  }

  function loadStoredGlobalTextGlyphs() {
    var raw;
    var glyphs;

    try {
      raw = window.localStorage ? window.localStorage.getItem(GLOBAL_TEXT_GLYPH_STORAGE_KEY) : "";
      glyphs = raw ? JSON.parse(raw) : null;
    } catch (error) {
      glyphs = null;
    }

    if (!glyphs || typeof glyphs !== "object" || Array.isArray(glyphs)) {
      return;
    }
    if (!currentProject.settings || typeof currentProject.settings !== "object") {
      currentProject.settings = {};
    }
    currentProject.settings.textGlyphs = glyphs;
    model.normalizeTextGlyphs(currentProject);
  }

  function saveStoredGlobalTextGlyphs() {
    var glyphs = model.normalizeTextGlyphs(currentProject);

    if (!window.localStorage) {
      return false;
    }

    try {
      window.localStorage.setItem(GLOBAL_TEXT_GLYPH_STORAGE_KEY, JSON.stringify(glyphs));
      return true;
    } catch (error) {
      return false;
    }
  }

  function selectedGlobalTextGlyphChar() {
    var select = document.getElementById("globalTextGlyphSelect");

    return select && select.value ? select.value : "A";
  }

  function refreshGlobalTextGlyphEditor() {
    var select = document.getElementById("globalTextGlyphSelect");
    var modeSelect = document.getElementById("glyphLibraryModeSelect");
    var status = document.getElementById("globalTextGlyphStatus");
    var character = selectedGlobalTextGlyphChar();
    var isGlobalMode = modeSelect && modeSelect.value === "globalTextGlyph";

    if (!select || !globalTextGlyphEditor) {
      return;
    }

    model.normalizeTextGlyphs(currentProject);
    globalTextGlyphEditor.setValue(model.textGlyphByte(currentProject, character));
    document.getElementById("globalTextGlyphEditor").hidden = !isGlobalMode;
    document.getElementById("glyphEditor").hidden = isGlobalMode;
    document.getElementById("saveGlobalTextGlyphButton").disabled = !isGlobalMode;
    select.disabled = !isGlobalMode;
    if (status) {
      status.textContent = isGlobalMode ?
        "Editing " + (character === " " ? "SPACE" : character) + ". Save changes to affect all game text." :
        "Choose Edit Global Text Glyph to change text letters.";
    }
  }

  function buildGlobalTextGlyphEditor() {
    var select = document.getElementById("globalTextGlyphSelect");
    var modeSelect = document.getElementById("glyphLibraryModeSelect");
    var saveButton = document.getElementById("saveGlobalTextGlyphButton");
    var characters = model.TEXT_GLYPH_CHARACTERS.split("");

    characters.forEach(function (character) {
      var option = document.createElement("option");

      option.value = character;
      option.textContent = character === " " ? "SPACE" : character;
      select.appendChild(option);
    });
    select.value = "A";

    globalTextGlyphEditor = window.SevenSegDisplayEditor.createByteEditor(
      document.getElementById("globalTextGlyphEditor"),
      {
        label: "Global text glyph",
        value: model.textGlyphByte(currentProject, select.value)
      }
    );

    modeSelect.addEventListener("change", refreshGlobalTextGlyphEditor);
    select.addEventListener("change", refreshGlobalTextGlyphEditor);
    saveButton.addEventListener("click", function () {
      var character = selectedGlobalTextGlyphChar();
      var value = globalTextGlyphEditor.getValue();
      var label = character === " " ? "SPACE" : character;

      if (!window.confirm("This will change all game texts, do you really want to do that?")) {
        setStatus("Global text glyph change cancelled.");
        return;
      }

      model.setTextGlyphByte(currentProject, character, value);
      saveStoredGlobalTextGlyphs();
      markProjectDirty();
      saveRecoveryNow();
      if (window.SevenSegBattle && window.SevenSegBattle.refresh) {
        window.SevenSegBattle.refresh();
      }
      schedulePreflight();
      setStatus("Saved global text glyph " + label + ". It will reload in this browser; Save Project JSON keeps it in the project file.");
      refreshGlobalTextGlyphEditor();
    });

    refreshGlobalTextGlyphEditor();
  }

  function buildHardwareNotes() {
    var list = document.getElementById("hardwareNotes");
    list.innerHTML = "";

    for (var i = 0; i < hardwareNotes.length; i += 1) {
      var item = document.createElement("li");
      item.textContent = hardwareNotes[i];
      list.appendChild(item);
    }
  }

  function connectPlaceholderButton(id, message) {
    var button = document.getElementById(id);
    if (!button) return;
    button.addEventListener("click", function () {
      setStatus(message);
    });
  }

  function connectTextTestInput() {
    var input = document.getElementById("textTestInput");

    input.addEventListener("input", function () {
      var trimmed = model.trimTo24(input.value);

      if (input.value !== trimmed) {
        input.value = trimmed;
        setStatus("Longer text was cut to 24 characters.");
      }

      currentProject.displayTestText = input.value;
      markProjectDirty();
    });
  }

  function projectTexts() {
    if (!Array.isArray(currentProject.texts)) {
      currentProject.texts = [];
    }
    return currentProject.texts;
  }

  function findProjectText(id) {
    var texts = projectTexts();

    for (var i = 0; i < texts.length; i += 1) {
      if (texts[i] && texts[i].id === id) {
        return texts[i];
      }
    }

    return null;
  }

  function textEntryValue(entry) {
    if (!entry) {
      return "";
    }
    return String(entry.text || entry.content || (entry.data && (entry.data.text || entry.data.content)) || "");
  }

  function lifecycleTextSpec(key) {
    if (key === "victory") {
      return {
        id: VICTORY_TEXT_ID,
        fallback: "Victory",
        name: "Browser victory"
      };
    }
    if (key === "defeat") {
      return {
        id: GAME_OVER_TEXT_ID,
        fallback: "Game over",
        name: "Browser game over"
      };
    }
    return {
      id: INTRO_TEXT_ID,
      fallback: currentProjectTitle(),
      name: "Browser intro"
    };
  }

  function lifecycleTextId(key) {
    if (key === "intro" && currentProject.gameFlow && currentProject.gameFlow.introTextId) {
      return currentProject.gameFlow.introTextId;
    }
    return lifecycleTextSpec(key).id;
  }

  function browserLifecycleText(key) {
    var spec = lifecycleTextSpec(key);
    var entry = findProjectText(lifecycleTextId(key));
    return model.trimTo24(textEntryValue(entry) || spec.fallback).toUpperCase();
  }

  function ensureLifecycleTextEntry(key) {
    var spec = lifecycleTextSpec(key);
    var entry = findProjectText(spec.id);

    if (!entry) {
      entry = {
        id: spec.id,
        name: spec.name,
        text: browserLifecycleText(key),
        dataVersion: 1,
        data: {}
      };
      projectTexts().push(entry);
    }

    if (key === "intro" && (!currentProject.gameFlow || typeof currentProject.gameFlow !== "object")) {
      currentProject.gameFlow = {};
    }
    if (key === "intro") {
      currentProject.gameFlow.introTextId = spec.id;
    }
    return entry;
  }

  function refreshLifecycleTextInputs() {
    var introInput = document.getElementById("introTextInput");
    var victoryInput = document.getElementById("victoryTextInput");
    var gameOverInput = document.getElementById("gameOverTextInput");

    if (introInput) introInput.value = browserLifecycleText("intro");
    if (victoryInput) victoryInput.value = browserLifecycleText("victory");
    if (gameOverInput) gameOverInput.value = browserLifecycleText("defeat");
  }

  function connectLifecycleTextInputs() {
    [
      { id: "introTextInput", key: "intro", label: "intro" },
      { id: "victoryTextInput", key: "victory", label: "victory" },
      { id: "gameOverTextInput", key: "defeat", label: "game over" }
    ].forEach(function (binding) {
      var input = document.getElementById(binding.id);
      if (!input) return;

      input.addEventListener("input", function () {
        var trimmed = model.trimTo24(input.value);
        var entry;

        if (input.value !== trimmed) {
          input.value = trimmed;
          setStatus("Longer " + binding.label + " text was cut to 24 characters.");
        }

        entry = ensureLifecycleTextEntry(binding.key);
        entry.text = input.value.toUpperCase();
        entry.name = lifecycleTextSpec(binding.key).name;
        entry.dataVersion = 1;
        if (!entry.data || typeof entry.data !== "object" || Array.isArray(entry.data)) {
          entry.data = {};
        }
        markProjectDirty();
      });
    });
  }

  function refreshHardwareSettingsInputs() {
    var settings = model.normalizeHardwareSettings(currentProject);
    var minimal = minimalRpgData(currentProject);
    var flags = minimal.flags || {};

    currentProject.hardware = settings;
    document.getElementById("transitionAnimationMsInput").value = String(settings.transitionAnimationMs);
    document.getElementById("showCoordinatesSelect").value = settings.showCoordinates ? "yes" : "no";
    document.getElementById("coordinateTimeMsInput").value = String(settings.coordinateTimeMs);
    document.getElementById("triggerBattlesSelect").value = settings.triggerBattles ? "yes" : "no";
    document.getElementById("hasAncientKeySelect").value = flags.hasAncientKey === true ? "yes" : "no";
  }

  function updateHardwareSettingsFromInputs() {
    currentProject.hardware = model.normalizeHardwareSettings({
      hardware: {
        transitionAnimationMs: document.getElementById("transitionAnimationMsInput").value,
        showCoordinates: document.getElementById("showCoordinatesSelect").value !== "no",
        coordinateTimeMs: document.getElementById("coordinateTimeMsInput").value,
        triggerBattles: document.getElementById("triggerBattlesSelect").value !== "no"
      }
    });

    refreshHardwareSettingsInputs();
  }

  function connectHardwareSettingsInputs() {
    var transitionInput = document.getElementById("transitionAnimationMsInput");
    var showCoordinatesSelect = document.getElementById("showCoordinatesSelect");
    var coordinateTimeInput = document.getElementById("coordinateTimeMsInput");
    var triggerBattlesSelect = document.getElementById("triggerBattlesSelect");
    var hasAncientKeySelect = document.getElementById("hasAncientKeySelect");

    refreshHardwareSettingsInputs();

    transitionInput.addEventListener("change", function () {
      updateHardwareSettingsFromInputs();
      markProjectDirty();
    });
    showCoordinatesSelect.addEventListener("change", function () {
      updateHardwareSettingsFromInputs();
      markProjectDirty();
    });
    coordinateTimeInput.addEventListener("change", function () {
      updateHardwareSettingsFromInputs();
      markProjectDirty();
    });
    triggerBattlesSelect.addEventListener("change", function () {
      updateHardwareSettingsFromInputs();
      markProjectDirty();
    });
    hasAncientKeySelect.addEventListener("change", function () {
      var minimal = ensureMinimalRpgData(currentProject);

      if (!minimal.flags) {
        minimal.flags = {};
      }
      minimal.flags.hasAncientKey = hasAncientKeySelect.value === "yes";
      if (window.SevenSegEmulator && window.SevenSegEmulator.refresh) {
        window.SevenSegEmulator.refresh();
      }
      markProjectDirty();
      setStatus("Has ancient key = " + (minimal.flags.hasAncientKey ? "Yes" : "No") + ".");
    });
  }

  function ensureMusicAssignments() {
    if (!currentProject.settings || typeof currentProject.settings !== "object") {
      currentProject.settings = {};
    }
    if (!currentProject.settings.musicAssignments ||
        typeof currentProject.settings.musicAssignments !== "object" ||
        Array.isArray(currentProject.settings.musicAssignments)) {
      currentProject.settings.musicAssignments = {
        worldmapMusicId: null,
        battleMusicId: null
      };
    }
    if (currentProject.settings.musicAssignments.worldmapMusicId === undefined) {
      currentProject.settings.musicAssignments.worldmapMusicId = null;
    }
    if (currentProject.settings.musicAssignments.battleMusicId === undefined) {
      currentProject.settings.musicAssignments.battleMusicId = null;
    }
    if (!Array.isArray(currentProject.music)) {
      currentProject.music = [];
    }
    return currentProject.settings.musicAssignments;
  }

  function safeMusicId(value) {
    return String(value || "song")
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/^[^a-z]+/, "") || "song";
  }

  function uniqueMusicId(baseName) {
    var base = "music_" + safeMusicId(baseName);
    var id = base;
    var suffix = 2;

    while (currentProject.music.some(function (entry) { return entry && entry.id === id; })) {
      id = base + "_" + String(suffix);
      suffix += 1;
    }

    return id;
  }

  function limitedNumberArray(values, maxLength) {
    var result = [];

    if (!Array.isArray(values)) {
      return result;
    }

    values.slice(0, maxLength).forEach(function (value) {
      var number = Math.round(Number(value) || 0);
      result.push(Math.max(0, Math.min(255, number)));
    });

    return result;
  }

  function normalizeMusicGate(value) {
    var gate = Number(value);

    if (!Number.isFinite(gate) || gate <= 0) {
      return 0.82;
    }
    if (gate > 1) {
      gate = gate / 100;
    }

    return Math.max(0.2, Math.min(1, gate));
  }

  function normalizeChiptuneSong(payload) {
    var source = payload && typeof payload === "object" ? payload : {};
    var settings = source.settings && typeof source.settings === "object" ? source.settings : {};
    var events = Array.isArray(source.events) ? source.events : [];
    var melody = Array.isArray(source.melodyNotes) ? source.melodyNotes : events.map(function (event) { return event && event.note; });
    var durations = Array.isArray(source.durations) ? source.durations : events.map(function (event) { return event && event.dur; });
    var harmony = Array.isArray(source.harmonyNotes) ? source.harmonyNotes : events.map(function (event) { return event && event.harmony; });
    var bass = Array.isArray(source.bassNotes) ? source.bassNotes : events.map(function (event) { return event && event.bass; });
    var maxEvents = 192;
    var eventCount = Math.min(maxEvents, melody.length, durations.length);
    var name = String(source.name || settings.seed || "Imported melody").trim() || "Imported melody";

    if (eventCount <= 0) {
      throw new Error("Song JSON needs melodyNotes and durations, or an events array.");
    }

    melody = limitedNumberArray(melody, eventCount);
    durations = limitedNumberArray(durations, eventCount);
    harmony = limitedNumberArray(harmony, eventCount);
    bass = limitedNumberArray(bass, eventCount);

    while (harmony.length < eventCount) harmony.push(0);
    while (bass.length < eventCount) bass.push(0);

    return {
      id: uniqueMusicId(name),
      name: name.slice(0, 40),
      type: "chiptune-song-v1",
      settings: {
        bpm: Math.max(40, Math.min(240, Math.round(Number(settings.bpm) || 120))),
        gate: normalizeMusicGate(settings.gate),
        songType: String(settings.songType || source.songType || ""),
        mood: String(settings.mood || "")
      },
      channels: {
        melodyNotes: melody,
        durations: durations,
        harmonyNotes: harmony,
        bassNotes: bass
      },
      dataVersion: 1,
      data: {
        source: "8-bit JRPG Chiptune Song Machine",
        importedAt: new Date().toISOString(),
        originalSettings: JSON.parse(JSON.stringify(settings))
      }
    };
  }

  function musicLabel(song) {
    if (!song) {
      return "None";
    }
    var count = song.channels && Array.isArray(song.channels.melodyNotes) ?
      song.channels.melodyNotes.length :
      0;

    return song.name + " (" + String(count) + " notes)";
  }

  function refreshMusicAssignmentControls() {
    var worldSelect = document.getElementById("worldMusicSelect");
    var battleSelect = document.getElementById("battleMusicSelect");
    var summary = document.getElementById("musicAssignSummary");
    var state = document.getElementById("musicAssignState");
    var assignments = ensureMusicAssignments();
    var songs = currentProject.music;

    function fill(select, selectedId) {
      select.innerHTML = "";
      var none = document.createElement("option");
      none.value = "";
      none.textContent = "None";
      select.appendChild(none);
      songs.forEach(function (song) {
        var option = document.createElement("option");
        option.value = song.id;
        option.textContent = musicLabel(song);
        select.appendChild(option);
      });
      select.value = songs.some(function (song) { return song.id === selectedId; }) ? selectedId : "";
    }

    if (!worldSelect || !battleSelect) {
      return;
    }

    fill(worldSelect, assignments.worldmapMusicId);
    fill(battleSelect, assignments.battleMusicId);
    if (summary) {
      summary.textContent = songs.length ?
        String(songs.length) + " melody/melodies stored. Worldmap: " +
          (worldSelect.selectedOptions[0] ? worldSelect.selectedOptions[0].textContent : "None") +
          ". Battle: " +
          (battleSelect.selectedOptions[0] ? battleSelect.selectedOptions[0].textContent : "None") + "." :
        "No melodies imported yet.";
    }
    if (state) {
      state.textContent = String(songs.length) + " song" + (songs.length === 1 ? "" : "s");
    }
  }

  function applyMusicAssignmentsFromInputs() {
    var assignments = ensureMusicAssignments();
    var worldId = document.getElementById("worldMusicSelect").value || null;
    var battleId = document.getElementById("battleMusicSelect").value || null;

    assignments.worldmapMusicId = worldId;
    assignments.battleMusicId = battleId;
    if (Array.isArray(currentProject.rooms)) {
      currentProject.rooms.forEach(function (room) {
        room.musicId = worldId;
      });
    }
    markProjectDirty();
    saveRecoveryNow();
    schedulePreflight();
    refreshMusicAssignmentControls();
    setStatus("Minimal RPG music assignments updated.");
  }

  function importMusicPayload(payload) {
    var song = normalizeChiptuneSong(payload);
    var assignments = ensureMusicAssignments();

    currentProject.music.push(song);
    if (!assignments.worldmapMusicId) {
      assignments.worldmapMusicId = song.id;
      if (Array.isArray(currentProject.rooms)) {
        currentProject.rooms.forEach(function (room) {
          room.musicId = song.id;
        });
      }
    } else if (!assignments.battleMusicId) {
      assignments.battleMusicId = song.id;
    }
    refreshMusicAssignmentControls();
    markProjectDirty();
    saveRecoveryNow();
    schedulePreflight();
    setStatus("Imported melody " + song.name + ".");
  }

  function importMusicFromText() {
    var input = document.getElementById("musicJsonInput");
    var text = input.value.trim();
    var payload;

    if (!text) {
      setStatus("Paste a generated chiptune song JSON first.");
      return;
    }

    try {
      payload = JSON.parse(text);
      importMusicPayload(payload);
      input.value = "";
    } catch (error) {
      setStatus("Music import failed: " + error.message);
    }
  }

  function readMusicJsonFile(file) {
    var reader;

    if (!file) {
      return;
    }
    reader = new FileReader();
    reader.addEventListener("load", function () {
      try {
        importMusicPayload(JSON.parse(String(reader.result || "")));
      } catch (error) {
        setStatus("Music file import failed: " + error.message);
      }
    });
    reader.addEventListener("error", function () {
      setStatus("Music file could not be read.");
    });
    reader.readAsText(file);
  }

  function connectMusicAssignmentInputs() {
    document.getElementById("importMusicJsonButton").addEventListener("click", importMusicFromText);
    document.getElementById("openMusicJsonButton").addEventListener("click", function () {
      document.getElementById("openMusicJsonInput").click();
    });
    document.getElementById("openMusicJsonInput").addEventListener("change", function () {
      readMusicJsonFile(document.getElementById("openMusicJsonInput").files[0]);
      document.getElementById("openMusicJsonInput").value = "";
    });
    document.getElementById("worldMusicSelect").addEventListener("change", applyMusicAssignmentsFromInputs);
    document.getElementById("battleMusicSelect").addEventListener("change", applyMusicAssignmentsFromInputs);
    document.getElementById("enableMusicButton").addEventListener("click", function () {
      if (window.SevenSegMusicRuntime) {
        window.SevenSegMusicRuntime.enable(currentProject, "worldmap");
        setStatus("Music preview enabled.");
      }
    });
    document.getElementById("playWorldMusicButton").addEventListener("click", function () {
      if (window.SevenSegMusicRuntime) {
        window.SevenSegMusicRuntime.enable(currentProject, "worldmap");
        setStatus("Playing worldmap music preview.");
      }
    });
    document.getElementById("playBattleMusicButton").addEventListener("click", function () {
      if (window.SevenSegMusicRuntime) {
        window.SevenSegMusicRuntime.enable(currentProject, "battle");
        setStatus("Playing battle music preview.");
      }
    });
    document.getElementById("stopMusicButton").addEventListener("click", function () {
      if (window.SevenSegMusicRuntime) {
        window.SevenSegMusicRuntime.disable();
        setStatus("Music preview stopped.");
      }
    });
  }

  function replaceCurrentProject(nextProject) {
    Object.getOwnPropertyNames(currentProject).forEach(function (key) {
      delete currentProject[key];
    });

    Object.keys(nextProject).forEach(function (key) {
      currentProject[key] = JSON.parse(JSON.stringify(nextProject[key]));
    });

    if (model.detectProjectVersion(currentProject) === 2) {
      model.attachV1CompatibilityToV2(currentProject);
      model.normalizeTextGlyphs(currentProject);
      ensureMusicAssignments();
      saveStoredGlobalTextGlyphs();
    } else {
      currentProject.hardware = model.normalizeHardwareSettings(currentProject);
    }
  }

  function updateProjectFromEditableControls() {
    currentProject.displayTestText = model.trimTo24(document.getElementById("textTestInput").value);
    currentProject.battle.playerHp = Number(document.getElementById("playerHpInput").value);
    currentProject.battle.beastHp = Number(document.getElementById("beastHpInput").value);
    updateBattleCalculationMethodFromInput();
    updateManualBattleStatsFromInputs({ resetHeroHp: false });
    updateHardwareSettingsFromInputs();
  }

  function projectMapSize() {
    var width = 1;
    var height = 1;

    for (var i = 0; i < currentProject.rooms.length; i += 1) {
      width = Math.max(width, currentProject.rooms[i].x + 1);
      height = Math.max(height, currentProject.rooms[i].y + 1);
    }

    return {
      width: Math.min(model.ROOM_X_COUNT, width),
      height: Math.min(model.ROOM_Y_MAX - model.ROOM_Y_MIN + 1, height)
    };
  }

  function refreshProjectControls() {
    var mapSize = projectMapSize();
    var firstRoom = model.findRoom(currentProject, currentProject.start.roomX, currentProject.start.roomY) || currentProject.rooms[0];

    document.getElementById("textTestInput").value = currentProject.displayTestText;
    document.getElementById("playerHpInput").value = String(currentProject.battle.playerHp);
    document.getElementById("beastHpInput").value = String(currentProject.battle.beastHp);
    model.normalizeTextGlyphs(currentProject);
    refreshGlobalTextGlyphEditor();
    refreshBattleCalculationMethodInput();
    refreshManualBattleStatsInputs();
    refreshMusicAssignmentControls();
    document.getElementById("mapWidthInput").value = String(mapSize.width);
    document.getElementById("mapHeightInput").value = String(mapSize.height);
    document.getElementById("mapRandomWallsInput").checked = false;
    document.getElementById("roomXSelect").value = String(firstRoom.x);
    document.getElementById("roomYInput").value = String(firstRoom.y);
    refreshLifecycleTextInputs();
    refreshHardwareSettingsInputs();

    if (window.SevenSegWorldEditor &&
        typeof window.SevenSegWorldEditor.refresh === "function") {
      window.SevenSegWorldEditor.refresh();
    } else {
      document.getElementById("createRoomButton").click();
    }

    if (window.SevenSegEmulator && window.SevenSegEmulator.reset) {
      window.SevenSegEmulator.reset();
    }
    if (window.SevenSegGlyphEditor && window.SevenSegGlyphEditor.refresh) {
      window.SevenSegGlyphEditor.refresh();
    }
    if (window.SevenSegFrameEditor && window.SevenSegFrameEditor.refresh) {
      window.SevenSegFrameEditor.refresh();
    }
    if (window.SevenSegAnimationEditor && window.SevenSegAnimationEditor.refresh) {
      window.SevenSegAnimationEditor.refresh();
    }
    if (window.SevenSegVisualImport018 && window.SevenSegVisualImport018.refresh) {
      window.SevenSegVisualImport018.refresh();
    }
    if (window.SevenSegBattle && window.SevenSegBattle.refresh) {
      window.SevenSegBattle.refresh();
    }

    refreshHubSummary();
  }

  function safeFilenameStem(value) {
    return String(value || "SevenSeg_Quest_Project")
      .replace(/[^a-z0-9_-]+/gi, "_")
      .replace(/^_+|_+$/g, "");
  }

  function safeProjectFilename(stem) {
    var title = safeFilenameStem(stem || currentProject.title);
    var versionSuffix = model.detectProjectVersion(currentProject) === 2 ? "_v2" : "";

    return (title || "SevenSeg_Quest_Project") + versionSuffix + ".json";
  }

  function downloadProjectJson(filenameOverride) {
    var validation;
    var projectToSave;
    var messages;
    var downloadFilename;
    var blob;
    var url;
    var link;

    updateProjectFromEditableControls();
    if (model.detectProjectVersion(currentProject) === 2) {
      projectToSave = model.prepareV2ProjectForValidation(currentProject);
      projectToSave.project.modifiedAt = new Date().toISOString();
      validation = model.validateProjectV2(projectToSave);

      if (validation.errors.length) {
        setStatus("Could not save schema v2: " + validation.errors.join(" "));
        return;
      }

      projectToSave = validation.project;
      messages = validation.repairs.concat(validation.warnings);
    } else {
      validation = model.migrateProjectV1ToV2(currentProject);
      if (validation.errors.length) {
        setStatus("Could not migrate project for schema v2 save: " + validation.errors.join(" "));
        return false;
      }
      projectToSave = model.prepareV2ProjectForValidation(validation.project);
      messages = validation.repairs.concat(validation.warnings);
    }

    downloadFilename = filenameOverride || activeFilename || safeProjectFilename();
    replaceCurrentProject(projectToSave);
    refreshProjectControls();

    blob = new Blob([JSON.stringify(projectToSave, null, 2) + "\n"], {
      type: "application/json"
    });
    url = URL.createObjectURL(blob);
    link = document.createElement("a");
    link.href = url;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    activeFilename = downloadFilename;
    setProjectDirty(false);

    if (messages.length) {
      setStatus(
        "Downloaded " + downloadFilename +
        " to the browser's Downloads folder with notes: " +
        messages.join(" ")
      );
    } else {
      setStatus(
        "Downloaded " + downloadFilename +
        " to the browser's Downloads folder."
      );
    }
    clearStoredRecovery();
    return true;
  }

  function applyLoadedProject(rawProject, filename) {
    var version = model.detectProjectVersion(rawProject);
    var validation;
    var notes;

    if (version === 1) {
      validation = model.migrateProjectV1ToV2(rawProject);

      if (validation.errors.length) {
        setStatus("Could not migrate " + filename + ": " + validation.errors.join(" "));
        return false;
      }

      replaceCurrentProject(validation.project);
      refreshProjectControls();
      activeFilename = null;
      setProjectDirty(true);
      notes = validation.repairs.concat(validation.warnings);
      setStatus(
        "Migrated " + filename + " from v1 to v2 in memory: " +
        validation.migrationReport.mappedRooms + " rooms, " +
        validation.migrationReport.preservedUnknownFields.length +
        " unknown fields preserved. Save JSON to create a separate _v2 file." +
        (notes.length ? " Notes: " + notes.join(" ") : "")
      );
      clearStoredRecovery().then(markProjectForRecovery);
      return true;
    }

    if (version === 2) {
      validation = model.validateProjectV2(rawProject);

      if (validation.errors.length) {
        setStatus("Could not load schema v2: " + validation.errors.join(" "));
        return false;
      }

      replaceCurrentProject(validation.project);
      refreshProjectControls();
      activeFilename = filename;
      setProjectDirty(false);
      notes = validation.repairs.concat(validation.warnings);
      setStatus(
        "Loaded " + filename + " as schema v2 without migration." +
        (notes.length ? " Notes: " + notes.join(" ") : "")
      );
      clearStoredRecovery();
      return true;
    }

    setStatus(version === -1 ?
      "Could not load project: its format or schema version is not supported." :
      "Could not load project: this is not a recognized SevenSeg project file.");
    return false;
  }

  function loadProjectFile(file) {
    var reader;

    if (!file) {
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setStatus("This project file is larger than 2 MB and was not loaded.");
      return;
    }

    reader = new FileReader();
    reader.addEventListener("load", function () {
      try {
        applyLoadedProject(JSON.parse(String(reader.result || "")), file.name);
      } catch (error) {
        setStatus("Could not load JSON: " + error.message);
      }
    });
    reader.addEventListener("error", function () {
      setStatus("Could not read the selected JSON file.");
    });
    reader.readAsText(file);
  }

  function createStarterProject() {
    var starter = model.createDefaultProjectV2();
    var now = new Date().toISOString();

    starter.project.id = "project_" + Date.now().toString(36);
    starter.project.createdAt = now;
    starter.project.modifiedAt = now;
    model.attachV1CompatibilityToV2(starter);
    return starter;
  }

  async function handleNewProject() {
    var confirmed = true;

    if (window.SevenSegBattle && window.SevenSegBattle.isActive &&
        window.SevenSegBattle.isActive()) {
      setStatus("Finish the current battle before starting another project.");
      return;
    }

    if (projectDirty) {
      confirmed = await showProjectDialog({
        title: "Start a new project?",
        message: "Unsaved changes in the current project will be replaced. The new project contains the approved minimal RPG starter.",
        confirmLabel: "Create starter"
      });
    }

    if (!confirmed) {
      setStatus("New Project canceled.");
      return;
    }

    await clearStoredRecovery();
    replaceCurrentProject(createStarterProject());
    activeFilename = null;
    refreshProjectControls();
    setProjectDirty(true);
    markProjectForRecovery();
    setStatus("Created a new schema v2 minimal RPG starter.");
  }

  async function handleMinimalRpgPreset() {
    var confirmed = true;

    if (window.SevenSegBattle && window.SevenSegBattle.isActive &&
        window.SevenSegBattle.isActive()) {
      setStatus("Finish the current battle before loading the Minimal RPG preset.");
      return;
    }

    if (projectDirty) {
      confirmed = await showProjectDialog({
        title: "Use Minimal RPG preset?",
        message: "Unsaved changes in the current project will be replaced by the approved beta starter game.",
        confirmLabel: "Use preset"
      });
    }

    if (!confirmed) {
      setStatus("Minimal RPG preset canceled.");
      return;
    }

    await clearStoredRecovery();
    replaceCurrentProject(createStarterProject());
    activeFilename = null;
    refreshProjectControls();
    setProjectDirty(true);
    markProjectForRecovery();
    setStatus("Loaded the approved Minimal RPG preset. It is ready to play, save, or export.");
  }

  async function requestOpenProject() {
    var confirmed = true;

    if (window.SevenSegBattle && window.SevenSegBattle.isActive &&
        window.SevenSegBattle.isActive()) {
      setStatus("Finish the current battle before loading another project.");
      return;
    }

    if (projectDirty) {
      confirmed = await showProjectDialog({
        title: "Open another project?",
        message: "Unsaved changes in the current project will be replaced if the selected file loads successfully.",
        confirmLabel: "Choose JSON"
      });
    }

    if (confirmed) {
      document.getElementById("loadJsonInput").click();
    } else {
      setStatus("Open Project canceled.");
    }
  }

  async function handleSaveAs() {
    var suggested = safeFilenameStem(currentProjectTitle());
    var chosen = await showProjectDialog({
      title: "Save project as",
      message: "Choose a filename. The project remains schema v2 JSON.",
      inputLabel: "Filename",
      inputValue: suggested,
      confirmLabel: "Save JSON"
    });
    var stem;

    if (chosen === false) {
      setStatus("Save As canceled.");
      return;
    }

    stem = safeFilenameStem(String(chosen).replace(/\.json$/i, "").replace(/_v2$/i, ""));
    if (!stem) {
      setStatus("Please enter a filename.");
      return;
    }

    downloadProjectJson(stem + "_v2.json");
  }

  function connectProjectTitle() {
    var input = document.getElementById("projectTitleInput");

    input.addEventListener("input", function () {
      var title = input.value.slice(0, 100);

      currentProject.title = title || "Untitled Quest";
      markProjectDirty();
    });
    input.addEventListener("change", function () {
      if (!input.value.trim()) {
        input.value = "Untitled Quest";
        currentProject.title = input.value;
      }
      refreshHubSummary();
    });
  }

  function isTextEditingTarget(target) {
    return Boolean(target && (
      target.matches("input, textarea, select") ||
      target.isContentEditable
    ));
  }

  function connectKeyboardShortcuts() {
    document.addEventListener("keydown", function (event) {
      var key = String(event.key || "").toLowerCase();

      if (document.getElementById("projectDialog").open) {
        return;
      }

      if ((event.ctrlKey || event.metaKey) && key === "s") {
        event.preventDefault();
        downloadProjectJson();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && (key === "z" || key === "u") &&
          !isTextEditingTarget(event.target)) {
        event.preventDefault();
        if (window.SevenSegVisualImport018 &&
            window.SevenSegVisualImport018.isActive() &&
            window.SevenSegVisualImport018.undo()) {
          return;
        }
        if (window.SevenSegAnimationEditor &&
            window.SevenSegAnimationEditor.isActive() &&
            window.SevenSegAnimationEditor.undo()) {
          return;
        }
        if (window.SevenSegFrameEditor &&
            window.SevenSegFrameEditor.isActive() &&
            window.SevenSegFrameEditor.undo()) {
          return;
        }
        if (window.SevenSegGlyphEditor &&
            window.SevenSegGlyphEditor.isActive() &&
            window.SevenSegGlyphEditor.undo()) {
          return;
        }
        if (window.SevenSegWorldEditor && typeof window.SevenSegWorldEditor.undo === "function") {
          window.SevenSegWorldEditor.undo();
        } else {
          setStatus("Undo is not available in the active editor yet.");
        }
      }
    });

    window.addEventListener("beforeunload", function (event) {
      if (!projectDirty) return;
      event.preventDefault();
      event.returnValue = "";
    });
  }

  function connectSpecialistLinks() {
    document.querySelectorAll("[data-specialist-link]").forEach(function (link) {
      link.addEventListener("click", function () {
        if (projectDirty) saveRecoveryNow();
      });
    });
  }

  function loadHardwareExample() {
    if (!window.SevenSegExamples) {
      setStatus("The example project file could not be loaded.");
      return;
    }

    if (window.SevenSegBattle && window.SevenSegBattle.isActive && window.SevenSegBattle.isActive()) {
      setStatus("Finish the current battle before loading the hardware example.");
      return;
    }

    var migration = model.migrateProjectV1ToV2(
      window.SevenSegExamples.createHardwareTestProject()
    );

    if (migration.errors.length) {
      setStatus("Could not migrate the hardware example: " + migration.errors.join(" "));
      return;
    }

    replaceCurrentProject(migration.project);

    refreshProjectControls();
    activeFilename = null;
    setProjectDirty(true);

    setStatus("Loaded and migrated the 2 x 2 hardware example to schema v2. Save JSON creates a separate _v2 file.");
    clearStoredRecovery().then(markProjectForRecovery);
  }

  function buildExamplePanel() {
    var grid = document.querySelector(".milestoneGrid");
    var hardwarePanel = document.querySelector(".hardwarePanel");
    var panel = document.createElement("section");

    panel.className = "panel";
    panel.setAttribute("aria-labelledby", "exampleTitle");
    panel.innerHTML =
      '<div class="panelHeader">' +
        '<h2 id="exampleTitle">Hardware Test Example</h2>' +
        '<span class="chipLabel">2 x 2</span>' +
      '</div>' +
      '<button id="loadHardwareExampleButton" type="button" disabled>Load hardware example</button>' +
      '<ol class="notesList">' +
        '<li>Load the example and export the Text Test.</li>' +
        '<li>Export the Glyph/Data Test and check all 24 digits.</li>' +
        '<li>Export the Worldmap Test; move between all four rooms and test each # wall.</li>' +
        '<li>Export the Battle Test and test every current menu and both party turns.</li>' +
        '<li>Export the Combined Game and test movement, random battles, victory, and game over.</li>' +
      '</ol>';

    grid.insertBefore(panel, hardwarePanel || null);

    document.getElementById("loadHardwareExampleButton").addEventListener("click", loadHardwareExample);
  }

  function loadExamplesFile() {
    var button = document.getElementById("loadHardwareExampleButton");

    function enableButton() {
      button.disabled = false;
    }

    if (window.SevenSegExamples) {
      enableButton();
      return;
    }

    var script = document.createElement("script");
    script.src = "examples.js";
    script.addEventListener("load", enableButton);
    script.addEventListener("error", function () {
      setStatus("Could not load examples.js.");
    });
    document.head.appendChild(script);
  }

  async function saveArduinoExport(sketchBaseName, code, details) {
    setStatus("Choose the beta project folder or its Arduino_Tests folder.");

    try {
      var result = await SevenSegArduino.exportIno(sketchBaseName, code);

      if (result.canceled) {
        setStatus("Arduino export canceled.");
        return;
      }

      if (result.savedToFolder) {
        setStatus("Exported " + result.relativePath + ". " + details);
      } else {
        setStatus(
          "Downloaded " + result.filename + ". Put it inside a folder named " +
          result.sketchName + " under Arduino_Tests. " + details
        );
      }
    } catch (error) {
      setStatus("Arduino export failed: " + error.message);
    }
  }

  async function handleTextTestExportPlaceholder() {
    var input = document.getElementById("textTestInput");
    var result = model.validateText1to24(input.value);

    if (!result.ok) {
      setStatus(result.error);
      return;
    }

    currentProject.displayTestText = result.value;
    await saveArduinoExport(
      "SevenSeg_Text_Test",
      SevenSegArduino.generateTextTestIno(result.value, currentProject),
      "Unsupported characters are blank in this first text test."
    );
  }

  async function handleGlyphDataExport() {
    await saveArduinoExport(
      "SevenSeg_Glyph_Data_Test",
      SevenSegArduino.generateGlyphDataTestIno(currentProject),
      "Use Serial Monitor commands n, l, g, b, c, h."
    );
  }

  async function handleWorldDataModesExport() {
    await saveArduinoExport(
      "SevenSeg_World_Data_Modes_Test",
      SevenSegArduino.generateWorldDataModesTestIno(),
      "D5 next, D4 previous, A0 brightness. Serial Monitor shows the active storage mode."
    );
  }

  async function handleGateChestExport() {
    await saveArduinoExport(
      "SevenSeg_Gate_Chest_Test",
      SevenSegArduino.generateGateChestTestIno(currentProject),
      "A4 facing, D5 forward, D4 backward. Open C chests, find the key, then pass the 1 gate."
    );
  }

  async function handleRewardLevelExport() {
    await saveArduinoExport(
      "SevenSeg_Reward_Level_Test",
      SevenSegArduino.generateRewardLevelTestIno(currentProject),
      "D5 advances rewards, D4 resets. Watch level, XP, HP, attack, and potion count."
    );
  }

  async function handleBossEndingExport() {
    await saveArduinoExport(
      "SevenSeg_Boss_Ending_Test",
      SevenSegArduino.generateBossEndingTestIno(currentProject),
      "D5 hits the boss, D4 resets. Confirm boss flag and ending text."
    );
  }

  async function handleMusicHardwareExport() {
    try {
      await saveArduinoExport(
        "SevenSeg_Music_Hardware_Test",
        SevenSegArduino.generateMusicHardwareTestIno(currentProject),
        "Audio pins: D3 melody, D9 bass. D5 next song, D4 previous song."
      );
    } catch (error) {
      setStatus("Music hardware export failed: " + error.message);
    }
  }

  async function handleWorldmapExport() {
    updateHardwareSettingsFromInputs();
    await saveArduinoExport(
      "SevenSeg_Worldmap_Test",
      SevenSegArduino.generateWorldmapTestIno(currentProject),
      "Dense 3-bit PROGMEM worldmap. Controls: A4/D5/D4 or a, d, w, s, r, h."
    );
  }

  async function handleBattleExport() {
    currentProject.battle.playerHp = Number(document.getElementById("playerHpInput").value) || currentProject.battle.playerHp;
    currentProject.battle.beastHp = Number(document.getElementById("beastHpInput").value) || currentProject.battle.beastHp;
    updateBattleCalculationMethodFromInput();
    updateManualBattleStatsFromInputs({ resetHeroHp: false });
    await saveArduinoExport(
      "SevenSeg_Battle_Test",
      SevenSegArduino.generateBattleTestIno(currentProject),
      "A4 chooses, D5 confirms, D4 rejects/back."
    );
  }

  async function handleCombinedExport() {
    updateHardwareSettingsFromInputs();
    currentProject.battle.playerHp = Number(document.getElementById("playerHpInput").value) || currentProject.battle.playerHp;
    currentProject.battle.beastHp = Number(document.getElementById("beastHpInput").value) || currentProject.battle.beastHp;
    updateBattleCalculationMethodFromInput();
    updateManualBattleStatsFromInputs({ resetHeroHp: false });
    try {
      await saveArduinoExport(
        "SevenSeg_Combined_Game_Test",
        SevenSegArduino.generateCombinedGameIno(currentProject),
        "World: A4 facing, D5 forward, D4 backward. Battle: A4 choose, D5 confirm, D4 back."
      );
    } catch (error) {
      if (error && error.preflightReport) {
        currentPreflightReport = error.preflightReport;
        renderProjectPreflight(currentPreflightReport);
        setStatus("Combined export blocked. Review Hardware Preflight.");
        return;
      }
      setStatus("Combined export failed: " + error.message);
    }
  }

  function connectButtons() {
    document.getElementById("newProjectButton").addEventListener("click", handleNewProject);
    document.getElementById("minimalRpgPresetButton").addEventListener("click", handleMinimalRpgPreset);
    document.getElementById("advancedToolsButton").addEventListener("click", handleAdvancedToolsToggle);
    setAdvancedToolsVisible(false);
    document.getElementById("exportTextTestButton").addEventListener("click", handleTextTestExportPlaceholder);
    document.getElementById("exportGlyphTestButton").addEventListener("click", handleGlyphDataExport);
    document.getElementById("exportWorldDataModesButton").addEventListener("click", handleWorldDataModesExport);
    document.getElementById("exportGateChestTestButton").addEventListener("click", handleGateChestExport);
    document.getElementById("exportRewardLevelTestButton").addEventListener("click", handleRewardLevelExport);
    document.getElementById("exportBossEndingTestButton").addEventListener("click", handleBossEndingExport);
    document.getElementById("exportMusicHardwareTestButton").addEventListener("click", handleMusicHardwareExport);
    document.getElementById("exportWorldmapTestButton").addEventListener("click", handleWorldmapExport);
    document.getElementById("exportBattleTestButton").addEventListener("click", handleBattleExport);
    document.getElementById("exportCombinedButton").addEventListener("click", handleCombinedExport);
    document.getElementById("battleCalculationMethodSelect").addEventListener("change", function () {
      updateBattleCalculationMethodFromInput();
      if (window.SevenSegBattle && window.SevenSegBattle.refresh) {
        window.SevenSegBattle.refresh();
      }
      markProjectDirty();
      setStatus("Battle calculation set to " + document.getElementById("battleCalculationMethodSelect").selectedOptions[0].textContent + ".");
    });
    document.getElementById("openHeroJsonButton").addEventListener("click", function () {
      document.getElementById("openHeroJsonInput").click();
    });
    document.getElementById("openFoeJsonButton").addEventListener("click", function () {
      document.getElementById("openFoeJsonInput").click();
    });
    document.getElementById("openHeroJsonInput").addEventListener("change", function () {
      readBattleStatsJsonFile(document.getElementById("openHeroJsonInput").files[0], "hero");
      document.getElementById("openHeroJsonInput").value = "";
    });
    document.getElementById("openFoeJsonInput").addEventListener("change", function () {
      readBattleStatsJsonFile(document.getElementById("openFoeJsonInput").files[0], "foe");
      document.getElementById("openFoeJsonInput").value = "";
    });
    document.getElementById("saveJsonButton").addEventListener("click", function () {
      downloadProjectJson();
    });
    document.getElementById("saveAsJsonButton").addEventListener("click", handleSaveAs);

    var loadButton = document.getElementById("loadJsonButton");
    var loadInput = document.getElementById("loadJsonInput");
    loadButton.addEventListener("click", requestOpenProject);
    loadInput.addEventListener("change", function () {
      var file = loadInput.files && loadInput.files[0];

      if (window.SevenSegBattle && window.SevenSegBattle.isActive && window.SevenSegBattle.isActive()) {
        setStatus("Finish the current battle before loading another project.");
        loadInput.value = "";
        return;
      }

      loadProjectFile(file);
      loadInput.value = "";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    loadStoredGlobalTextGlyphs();
    buildDisplayPreview();
    buildGlobalTextGlyphEditor();
    buildHardwareNotes();
    populateBattleCalculationMethodSelect();
    connectProjectDialog();
    connectProjectTitle();
    connectTextTestInput();
    connectLifecycleTextInputs();
    connectHardwareSettingsInputs();
    connectMusicAssignmentInputs();
    connectButtons();
    connectKeyboardShortcuts();
    connectSpecialistLinks();
    SevenSegWorldEditor.init({
      model: model,
      project: currentProject,
      displayEditor: window.SevenSegDisplayEditor,
      compression: window.SevenSegWorldCompression,
      setStatus: setStatus,
      markDirty: markProjectDirty
    });
    SevenSegGlyphEditor.init({
      project: currentProject,
      visualAssets: window.SevenSegVisualAssets,
      displayEditor: window.SevenSegDisplayEditor,
      setStatus: setStatus,
      markDirty: markProjectDirty
    });
    SevenSegFrameEditor.init({
      project: currentProject,
      visualAssets: window.SevenSegVisualAssets,
      displayEditor: window.SevenSegDisplayEditor,
      setStatus: setStatus,
      markDirty: markProjectDirty
    });
    SevenSegAnimationEditor.init({
      project: currentProject,
      visualAssets: window.SevenSegVisualAssets,
      displayEditor: window.SevenSegDisplayEditor,
      setStatus: setStatus,
      markDirty: markProjectDirty
    });
    SevenSegVisualImport018.init({
      project: currentProject,
      model: model,
      visualAssets: window.SevenSegVisualAssets,
      setStatus: setStatus,
      markDirty: markProjectDirty,
      refreshEditors: function () {
        if (window.SevenSegWorldEditor && window.SevenSegWorldEditor.refresh) {
          window.SevenSegWorldEditor.refresh();
        }
        SevenSegGlyphEditor.refresh();
        SevenSegFrameEditor.refresh();
        SevenSegAnimationEditor.refresh();
        refreshHubSummary();
      }
    });
    SevenSegEmulator.init({
      model: model,
      project: currentProject,
      setStatus: setStatus,
      onProjectChanged: function () {
        refreshHardwareSettingsInputs();
        refreshManualBattleStatsInputs();
        markProjectDirty();
      }
    });
    SevenSegBattle.init({
      model: model,
      project: currentProject,
      setStatus: setStatus,
      onProjectChanged: function () {
        refreshManualBattleStatsInputs();
        markProjectDirty();
      }
    });
    buildExamplePanel();
    loadExamplesFile();
    buildRecoveryOffer();
    connectRecoveryMutationSignals();
    refreshProjectControls();
    if (window.SevenSegEmulator && window.SevenSegEmulator.showIntro) {
      window.SevenSegEmulator.showIntro();
    }
    runProjectPreflight();
    setProjectDirty(true);
    checkForRecovery();
  });
}());

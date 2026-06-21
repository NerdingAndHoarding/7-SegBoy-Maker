(function () {
  "use strict";

  var model = null;
  var project = null;
  var statusHandler = null;
  var changeHandler = null;
  var runtime = null;
  var battleReturnRuntime = null;
  var isTransitioning = false;
  var isInBattle = false;
  var isShowingLifecycleMessage = false;
  var isItemMenuOpen = false;
  var dismissMessageHandler = null;
  var lifecycleTimer = null;
  var lastMoveAt = 0;
  var MOVE_REPEAT_MS = 180;
  var TRANSITION_MS = 500;
  var BATTLE_CHANCE = 0.10;
  var LIFECYCLE_MESSAGE_MS = 900;
  var INTRO_TEXT_ID = "text_intro";
  var SAVE_SLOT_COUNT = 3;
  var SAVE_SLOT_STORAGE_PREFIX = "SevenSegBrowserSlotsV1:";
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

  function setStatus(message) {
    if (statusHandler) {
      statusHandler(message);
    }
  }

  function roomLabel(x, y) {
    return model.roomXLabel(x) + "," + y;
  }

  function coordinateLabel(x, y) {
    return model.roomXLabel(x).toUpperCase() + "." + String(y).padStart(2, "0");
  }

  function hardwareSettings() {
    return model.normalizeHardwareSettings(project);
  }

  function activeWorld() {
    var worlds = project && Array.isArray(project.worlds) ? project.worlds : [];
    var wantedId = project && project.gameFlow ? project.gameFlow.startingWorldId : null;

    for (var i = 0; i < worlds.length; i += 1) {
      if (worlds[i] && worlds[i].id === wantedId) {
        return worlds[i];
      }
    }

    return worlds[0] || null;
  }

  function effectiveRoomAt(x, y) {
    var world = activeWorld();

    if (world && typeof model.resolveEffectiveRoom === "function") {
      return model.resolveEffectiveRoom(project, world.id, x, y);
    }

    return model.findRoom(project, x, y);
  }

  function currentRoom() {
    return effectiveRoomAt(runtime.roomX, runtime.roomY);
  }

  function findSection(sectionId) {
    var sections = project && Array.isArray(project.sections) ? project.sections : [];

    for (var i = 0; i < sections.length; i += 1) {
      if (sections[i] && sections[i].id === sectionId) {
        return sections[i];
      }
    }

    return null;
  }

  function findWorld(worldId) {
    var worlds = project && Array.isArray(project.worlds) ? project.worlds : [];

    for (var i = 0; i < worlds.length; i += 1) {
      if (worlds[i] && worlds[i].id === worldId) {
        return worlds[i];
      }
    }

    return null;
  }

  function currentWorld() {
    var room = currentRoom();
    var section = room ? findSection(room.sectionId) : null;
    return section ? findWorld(section.worldId) : activeWorld();
  }

  function currentSection() {
    var room = currentRoom();
    var world = activeWorld();

    if (room && room.sectionId) {
      return findSection(room.sectionId);
    }
    if (world && typeof model.resolveSectionForCoordinate === "function") {
      return model.resolveSectionForCoordinate(project, world.id, runtime.roomX, runtime.roomY);
    }
    return null;
  }

  function currentAreaType() {
    var world = currentWorld();
    return world && world.areaType ? world.areaType : "worldmap";
  }

  function currentRoomIsSavePoint() {
    var room = currentRoom();
    return Boolean(
      (room && room.data && room.data.savePoint === true) ||
      (room && room.metadata && room.metadata.data && room.metadata.data.savePoint === true)
    );
  }

  function minimalRpgState() {
    return project && project.gameFlow && project.gameFlow.data && project.gameFlow.data.minimalRpg
      ? project.gameFlow.data.minimalRpg
      : null;
  }

  function minimalRpgFlags() {
    var state = minimalRpgState();
    return state && state.flags ? state.flags : {};
  }

  function setMinimalRpgFlag(flagId, value) {
    var state = minimalRpgState();

    if (!state) {
      setStatus("No minimal RPG state is available in this project.");
      return false;
    }
    if (!state.flags) {
      state.flags = {};
    }

    state.flags[flagId] = value === true;
    setStatus("Minimal RPG flag " + flagId + " = " + String(state.flags[flagId]) + ".");
    refreshSaveSlotsUi();
    return true;
  }

  function ensureMinimalRpgState() {
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

  function notifyProjectChanged() {
    if (changeHandler) {
      changeHandler();
    }
  }

  function clonePlain(value) {
    if (value === undefined || value === null) {
      return null;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      return null;
    }
  }

  function potionCount() {
    var state = minimalRpgState();
    var value = state ? Number(state.potionCount) : 0;
    return Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  }

  function potionHealAmount() {
    var item = findById(project && project.items, "item_potion");
    var data = item && item.data ? item.data : {};
    var value = Number(data.healAmount);
    return Number.isFinite(value) ? Math.max(1, Math.round(value)) : 10;
  }

  function heroMaxHp() {
    var hero = starterHero();
    var stats = hero && hero.stats ? hero.stats : {};
    var value = Number(stats.maxHP !== undefined ? stats.maxHP : stats.maxHp);
    return Number.isFinite(value) ? Math.max(1, Math.round(value)) : 1;
  }

  function heroCurrentHp() {
    var state = minimalRpgState();
    var hero = starterHero();
    var stats = hero && hero.stats ? hero.stats : {};
    var value;

    if (state && state.heroCurrentHP !== undefined) {
      value = Number(state.heroCurrentHP);
    } else if (stats.currentHP !== undefined) {
      value = Number(stats.currentHP);
    } else if (stats.currentHp !== undefined) {
      value = Number(stats.currentHp);
    } else {
      value = heroMaxHp();
    }

    return Number.isFinite(value) ? Math.max(0, Math.min(heroMaxHp(), Math.round(value))) : heroMaxHp();
  }

  function setHeroCurrentHp(value) {
    var state = ensureMinimalRpgState();
    var hero = starterHero();
    var hp = Math.max(0, Math.min(heroMaxHp(), Math.round(Number(value) || 0)));

    state.heroCurrentHP = hp;
    if (hero) {
      if (!hero.stats || typeof hero.stats !== "object" || Array.isArray(hero.stats)) {
        hero.stats = {};
      }
      hero.stats.currentHP = hp;
      hero.stats.currentHp = hp;
    }
  }

  function findById(list, id) {
    if (!Array.isArray(list)) {
      return null;
    }
    for (var i = 0; i < list.length; i += 1) {
      if (list[i] && list[i].id === id) {
        return list[i];
      }
    }
    return null;
  }

  function projectId() {
    return String(
      (project && project.project && project.project.id) ||
      (project && project.title) ||
      "sevenseg_project"
    );
  }

  function heroSaveSnapshot() {
    var hero = starterHero();

    if (!hero) {
      return null;
    }

    return {
      id: hero.id || "hero_you1",
      stats: clonePlain(hero.stats || {}),
      equipmentIds: clonePlain(Array.isArray(hero.equipmentIds) ? hero.equipmentIds : []),
      data: clonePlain(hero.data || {})
    };
  }

  function browserRpgSaveSnapshot() {
    return {
      minimalRpg: clonePlain(minimalRpgState() || {}),
      hero: heroSaveSnapshot()
    };
  }

  function normalizeLoadedMinimalRpg(savedState) {
    var state = savedState && typeof savedState === "object" && !Array.isArray(savedState) ?
      clonePlain(savedState) :
      {};

    if (!state || typeof state !== "object" || Array.isArray(state)) {
      state = {};
    }
    if (!state.flags || typeof state.flags !== "object" || Array.isArray(state.flags)) {
      state.flags = {};
    }
    if (!state.openedChests || typeof state.openedChests !== "object" || Array.isArray(state.openedChests)) {
      state.openedChests = {};
    }

    return state;
  }

  function restoreHeroSaveSnapshot(snapshot) {
    var hero;

    if (!snapshot || typeof snapshot !== "object") {
      return;
    }

    hero = findById(project && project.heroes, snapshot.id) || starterHero();
    if (!hero) {
      return;
    }

    if (snapshot.stats && typeof snapshot.stats === "object" && !Array.isArray(snapshot.stats)) {
      hero.stats = clonePlain(snapshot.stats) || {};
    }
    if (Array.isArray(snapshot.equipmentIds)) {
      hero.equipmentIds = clonePlain(snapshot.equipmentIds) || [];
    }
    if (snapshot.data && typeof snapshot.data === "object" && !Array.isArray(snapshot.data)) {
      hero.data = clonePlain(snapshot.data) || {};
    }
  }

  function restoreBrowserRpgSaveSnapshot(snapshot) {
    var state;

    if (!snapshot || typeof snapshot !== "object") {
      return false;
    }

    if (snapshot.minimalRpg) {
      state = normalizeLoadedMinimalRpg(snapshot.minimalRpg);
      if (!project.gameFlow) {
        project.gameFlow = {};
      }
      if (!project.gameFlow.data || typeof project.gameFlow.data !== "object" || Array.isArray(project.gameFlow.data)) {
        project.gameFlow.data = {};
      }
      project.gameFlow.data.minimalRpg = state;
    }

    restoreHeroSaveSnapshot(snapshot.hero);
    return true;
  }

  function saveSlotStorage() {
    try {
      return window.localStorage || null;
    } catch (error) {
      return null;
    }
  }

  function saveSlotStorageKey() {
    return SAVE_SLOT_STORAGE_PREFIX + projectId();
  }

  function readSaveSlots() {
    var storage = saveSlotStorage();
    var raw = "";
    var parsed = [];
    var slots = new Array(SAVE_SLOT_COUNT).fill(null);

    if (!storage) {
      return slots;
    }

    try {
      raw = storage.getItem(saveSlotStorageKey()) || "";
      parsed = raw ? JSON.parse(raw) : [];
    } catch (error) {
      parsed = [];
    }

    if (!Array.isArray(parsed)) {
      return slots;
    }

    for (var i = 0; i < SAVE_SLOT_COUNT; i += 1) {
      slots[i] = parsed[i] || null;
    }

    return slots;
  }

  function writeSaveSlots(slots) {
    var storage = saveSlotStorage();

    if (!storage) {
      return false;
    }

    try {
      storage.setItem(saveSlotStorageKey(), JSON.stringify(slots));
      return true;
    } catch (error) {
      return false;
    }
  }

  function slotSummary(slot) {
    if (!slot) {
      return "Empty";
    }

    var time = formatSlotTime(slot.savedAt);
    var rpg = slot.rpgState && slot.rpgState.minimalRpg ? slot.rpgState.minimalRpg : {};
    var hero = slot.rpgState && slot.rpgState.hero && slot.rpgState.hero.stats ? slot.rpgState.hero.stats : {};
    var level = hero.level || rpg.heroLevel || 1;
    var hp = rpg.heroCurrentHP !== undefined ? rpg.heroCurrentHP : (hero.currentHP !== undefined ? hero.currentHP : hero.currentHp);
    var gold = rpg.currentGold !== undefined ? rpg.currentGold : rpg.gold;
    var potions = rpg.potionCount;

    return String(slot.coordinate || "?") +
      " x" + String(slot.playerX) +
      " y" + String(slot.playerY) +
      " " + String(slot.areaType || "worldmap") +
      " L" + String(level) +
      " HP" + String(hp !== undefined ? hp : "?") +
      " G" + String(gold !== undefined ? gold : 0) +
      " P" + String(potions !== undefined ? potions : 0) +
      (time ? " " + time : "");
  }

  function formatSlotTime(savedAt) {
    if (!savedAt) {
      return "";
    }

    var date = new Date(savedAt);
    if (!Number.isFinite(date.getTime())) {
      return "";
    }

    return String(date.getFullYear()) + "-" +
      String(date.getMonth() + 1).padStart(2, "0") + "-" +
      String(date.getDate()).padStart(2, "0") + " " +
      String(date.getHours()).padStart(2, "0") + ":" +
      String(date.getMinutes()).padStart(2, "0");
  }

  function confirmDialog(options) {
    if (window.SevenSegUiDialog && typeof window.SevenSegUiDialog.confirm === "function") {
      return window.SevenSegUiDialog.confirm(options);
    }
    return Promise.resolve(window.confirm(options.message || "Confirm?"));
  }

  function slotIsLoadable(slot) {
    var room;

    if (!slot) {
      return false;
    }
    if (!Number.isInteger(slot.roomX) || !Number.isInteger(slot.roomY) ||
        !Number.isInteger(slot.playerX) || !Number.isInteger(slot.playerY)) {
      return false;
    }

    room = effectiveRoomAt(slot.roomX, slot.roomY);
    if (!room) {
      return false;
    }

    return !isWallChar(cellChar(room, slot.playerX, slot.playerY));
  }

  function refreshSaveSlotsUi() {
    var slots = readSaveSlots();
    var storage = saveSlotStorage();
    var stateLabel = document.getElementById("saveSlotsStateLabel");
    var hint = document.getElementById("saveSlotsHint");
    var reason = saveAllowedReason();
    var saveEnabled = storage && !reason;

    if (stateLabel) {
      stateLabel.textContent = storage ? (reason ? "Save blocked" : "Save allowed") : "Unavailable";
    }
    if (hint) {
      if (!storage) {
        hint.textContent = "Browser save slots are unavailable in this browser.";
      } else if (reason) {
        hint.textContent = reason;
      } else {
        hint.textContent = "Save allowed.";
      }
    }

    for (var i = 0; i < SAVE_SLOT_COUNT; i += 1) {
      var label = document.getElementById("saveSlot" + (i + 1) + "Label");
      var saveButton = document.getElementById("saveSlot" + (i + 1) + "Button");
      var loadButton = document.getElementById("loadSlot" + (i + 1) + "Button");
      var clearButton = document.getElementById("clearSlot" + (i + 1) + "Button");
      var loadable = slotIsLoadable(slots[i]);

      if (label) {
        label.textContent = loadable || !slots[i] ? slotSummary(slots[i]) : "Invalid for current world";
      }
      if (saveButton) {
        saveButton.disabled = !saveEnabled;
      }
      if (loadButton) {
        loadButton.disabled = !loadable;
      }
      if (clearButton) {
        clearButton.disabled = !slots[i];
      }
    }
  }

  function clearLifecycleTimer() {
    if (lifecycleTimer !== null) {
      window.clearTimeout(lifecycleTimer);
      lifecycleTimer = null;
    }
    dismissMessageHandler = null;
  }

  function introMessage() {
    var textId = project.gameFlow && project.gameFlow.introTextId ? project.gameFlow.introTextId : INTRO_TEXT_ID;
    var text = "";

    if (textId && Array.isArray(project.texts)) {
      for (var i = 0; i < project.texts.length; i += 1) {
        if (project.texts[i] && project.texts[i].id === textId) {
          text = project.texts[i].text ||
            project.texts[i].content ||
            (project.texts[i].data && (project.texts[i].data.text || project.texts[i].data.content)) ||
            "";
          break;
        }
      }
    }

    text = String(text || project.title || "START").toUpperCase().trim();
    return text || "START";
  }

  function currentEncounterGroupId() {
    var room = currentRoom();
    var section = currentSection();
    var sectionGroupId = section && section.data ? section.data.encounterGroupId : null;
    var metadataGroups = room && room.metadata && Array.isArray(room.metadata.encounterGroupIds) ?
      room.metadata.encounterGroupIds :
      [];
    var groupIds = [];

    if (sectionGroupId) {
      groupIds.push(sectionGroupId);
    }
    if (room && Array.isArray(room.encounterGroupIds) && room.encounterGroupIds.length) {
      groupIds = groupIds.concat(room.encounterGroupIds);
    }
    if (metadataGroups.length) {
      groupIds = groupIds.concat(metadataGroups);
    }

    return firstAvailableEncounterGroupId(groupIds);
  }

  function encounterGroupById(groupId) {
    return findById(project && project.encounterGroups, groupId);
  }

  function encounterConditionIsMet(condition) {
    var flags = minimalRpgFlags();
    var type = condition && condition.type ? String(condition.type) : "";
    var flagId = condition && condition.flagId ? String(condition.flagId) : "";

    if (type === "flagFalse") {
      return flagId ? flags[flagId] !== true : true;
    }
    if (type === "flagTrue") {
      return flagId ? flags[flagId] === true : true;
    }

    return true;
  }

  function encounterGroupIsAvailable(groupId) {
    var group = encounterGroupById(groupId);
    var conditions = group && Array.isArray(group.conditions) ? group.conditions : [];

    if (!group) {
      return false;
    }

    for (var i = 0; i < conditions.length; i += 1) {
      if (!encounterConditionIsMet(conditions[i])) {
        return false;
      }
    }

    return true;
  }

  function firstAvailableEncounterGroupId(groupIds) {
    for (var i = 0; i < groupIds.length; i += 1) {
      if (groupIds[i] && encounterGroupIsAvailable(groupIds[i])) {
        return groupIds[i];
      }
    }

    return null;
  }

  function xpRewardForEncounter(groupId) {
    var group = encounterGroupById(groupId);
    var members = group && Array.isArray(group.members) ? group.members : [];
    var total = 0;
    var enemy;
    var stats;
    var reward;
    var i;

    for (i = 0; i < members.length; i += 1) {
      enemy = findById(project && project.enemies, members[i] && members[i].enemyId);
      stats = enemy && enemy.stats ? enemy.stats : {};
      reward = Number(stats.xpReward || (enemy && enemy.data && enemy.data.xpReward) || 0);
      if (Number.isFinite(reward) && reward > 0) {
        total += Math.round(reward);
      }
    }

    return total;
  }

  function starterHero() {
    return findById(project && project.heroes, "hero_you1") ||
      (project && Array.isArray(project.heroes) ? project.heroes[0] : null);
  }

  function levelUpHero(hero) {
    var stats = hero.stats;
    var nextHp = Math.max(1, Math.round(Number(stats.maxHP || stats.maxHp || 30) + 5));
    var nextAttack = Math.max(1, Math.round(Number(stats.attackPower || stats.attack || 6) + 2));

    stats.level = Math.max(1, Math.round(Number(stats.level || 1) + 1));
    stats.xpNext = Math.max(1, Math.round(Number(stats.xpNext || 20) + 10));
    stats.maxHP = nextHp;
    stats.maxHp = stats.maxHP;
    stats.maxHpBase = stats.maxHP;
    stats.currentHP = stats.maxHP;
    stats.currentHp = stats.maxHP;
    stats.attackPower = nextAttack;
    stats.attack = nextAttack;
    stats.str = Math.max(Number(stats.str || 0), stats.attackPower);
  }

  function applyVictoryXp(encounterGroupId) {
    var hero = starterHero();
    var stats;
    var state;
    var xpGain = xpRewardForEncounter(encounterGroupId);
    var levelUps = 0;
    var message;

    if (!hero || xpGain <= 0) {
      return "";
    }

    if (!hero.stats || typeof hero.stats !== "object" || Array.isArray(hero.stats)) {
      hero.stats = {};
    }
    stats = hero.stats;
    stats.level = Math.max(1, Math.round(Number(stats.level || 1)));
    stats.xp = Math.max(0, Math.round(Number(stats.xp || 0) + xpGain));
    stats.xpNext = Math.max(1, Math.round(Number(stats.xpNext || 20)));

    while (stats.xp >= stats.xpNext) {
      stats.xp -= stats.xpNext;
      levelUpHero(hero);
      levelUps += 1;
    }

    if (levelUps > 0) {
      state = ensureMinimalRpgState();
      state.heroCurrentHP = Math.max(0, Math.round(Number(stats.currentHP || stats.currentHp || stats.maxHP || 1)));
    }

    message = "XP +" + xpGain + ". Level " + stats.level + " XP " + stats.xp + "/" + stats.xpNext + ".";
    if (levelUps > 0) {
      message = "Level up! " + message;
    }

    notifyProjectChanged();
    return message;
  }

  function roomFrameText(room) {
    var data;

    if (!room) {
      return "";
    }
    if (typeof room.frame === "string") {
      return model.normalizeFrame24(room.frame);
    }

    data = room.data || (room.metadata && room.metadata.data) || null;
    if (data && typeof data.pocV1Frame === "string") {
      return model.normalizeFrame24(data.pocV1Frame);
    }

    return model.normalizeFrame24("");
  }

  function chestAt(room, x, y) {
    var state = minimalRpgState();
    var chests = state && Array.isArray(state.chests) ? state.chests : [];
    var roomId = room && room.id ? room.id : "";
    var chest;
    var i;

    if (!roomId) {
      return null;
    }

    for (i = 0; i < chests.length; i += 1) {
      chest = chests[i];
      if (chest && chest.roomId === roomId &&
          Number(chest.x) === Number(x) &&
          Number(chest.y) === Number(y)) {
        return chest;
      }
    }

    return null;
  }

  function chestIsOpened(chest) {
    var state = minimalRpgState();
    var opened = state && state.openedChests ? state.openedChests : {};
    return Boolean(chest && opened[chest.id] === true);
  }

  function unopenedChestAt(room, x, y) {
    var chest = chestAt(room, x, y);
    return chest && !chestIsOpened(chest) ? chest : null;
  }

  function swordAttackBonus(equipmentId) {
    var equipment = findById(project && project.equipment, equipmentId || "equipment_sword");
    var data = equipment && equipment.data ? equipment.data : {};
    var bonus = Number(data.attackPowerBonus || data.attack || 0);

    return Number.isFinite(bonus) ? Math.max(0, Math.round(bonus)) : 0;
  }

  function giveSword(equipmentId) {
    var hero = findById(project && project.heroes, "hero_you1") ||
      (project && Array.isArray(project.heroes) ? project.heroes[0] : null);
    var bonus = swordAttackBonus(equipmentId);

    if (!hero) {
      return bonus;
    }
    if (!Array.isArray(hero.equipmentIds)) {
      hero.equipmentIds = [];
    }
    if (equipmentId && hero.equipmentIds.indexOf(equipmentId) === -1) {
      hero.equipmentIds.push(equipmentId);
    }
    if (!hero.stats || typeof hero.stats !== "object" || Array.isArray(hero.stats)) {
      hero.stats = {};
    }
    hero.stats.weaponPower = Math.max(Number(hero.stats.weaponPower || 0), bonus);
    if (!hero.data || typeof hero.data !== "object" || Array.isArray(hero.data)) {
      hero.data = {};
    }
    hero.data.weaponId = equipmentId || "equipment_sword";
    hero.data.swordEquipped = true;

    return bonus;
  }

  function openChest(chest) {
    var state = ensureMinimalRpgState();
    var opened = state.openedChests || {};
    var flags;
    var amount;
    var bonus;
    var message = "Chest opened.";

    if (!chest || opened[chest.id] === true) {
      return false;
    }

    state.openedChests = opened;
    opened[chest.id] = true;

    if (chest.lootKind === "gold10") {
      amount = Number(chest.amount || 10);
      if (!Number.isFinite(amount)) {
        amount = 10;
      }
      state.currentGold = Math.max(0, Math.round(Number(state.currentGold || 0) + amount));
      message = "+" + amount + " Gold. Gold = " + state.currentGold + ".";
    } else if (chest.lootKind === "ancientKey") {
      flags = state.flags || {};
      state.flags = flags;
      flags.hasAncientKey = true;
      flags.gateOpened = true;
      message = "You now hold the anchent key";
    } else if (chest.lootKind === "sword") {
      state.swordObtained = true;
      state.swordEquipped = true;
      bonus = giveSword(chest.equipmentId || "equipment_sword");
      message = "Sword equipped. Attack +" + bonus + ".";
    } else if (chest.lootKind === "potion") {
      amount = Number(chest.count || 1);
      if (!Number.isFinite(amount)) {
        amount = 1;
      }
      state.potionCount = Math.max(0, Math.round(Number(state.potionCount || 0) + amount));
      message = "Potion +" + amount + ". Potions = " + state.potionCount + ".";
    }

    state.lastChestMessage = message;
    setStatus(message);
    notifyProjectChanged();
    showMessageUntilInput(message, function () {
      setStatus(message);
    });
    return true;
  }

  function openCurrentChest() {
    var room = currentRoom();
    var chest = unopenedChestAt(room, runtime.playerX, runtime.playerY);

    return openChest(chest);
  }

  function cellChar(room, x, y) {
    var frameText = roomFrameText(room);
    var c;
    var boundaryChar;
    var chest;

    if (!room) return " ";

    c = frameText.charAt(model.cellIndex(x, y)) || " ";
    if (!isEmptyCellChar(c)) {
      return c;
    }

    boundaryChar = minimalBoundaryChar(room, x, y);
    if (boundaryChar) {
      return boundaryChar;
    }

    chest = unopenedChestAt(room, x, y);
    return chest ? "C" : c;
  }

  function isEmptyCellChar(c) {
    return c === " " || c === ".";
  }

  function isWallChar(c) {
    return c === "#" || c === "8";
  }

  function isGateChar(c) {
    return c === "1";
  }

  function directionNeighbor(room, direction) {
    var x = Number(room && room.x);
    var y = Number(room && room.y);

    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return null;
    }
    if (direction === "east") return { x: x + 1, y: y };
    if (direction === "west") return { x: x - 1, y: y };
    if (direction === "south") return { x: x, y: y + 1 };
    if (direction === "north") return { x: x, y: y - 1 };
    return null;
  }

  function gateForRoomDirection(room, direction) {
    var boundary = roomBoundary(room, direction);
    var neighborPosition;
    var neighborRoom;

    if (boundary && boundary.kind === "lockedGate") {
      return boundary;
    }

    neighborPosition = directionNeighbor(room, direction);
    neighborRoom = neighborPosition ? effectiveRoomAt(neighborPosition.x, neighborPosition.y) : null;
    return minimalGateBetween(room, neighborRoom);
  }

  function isGateCellPosition(room, x, y, direction) {
    var middleRow = Math.floor(model.DISPLAY_ROWS / 2);
    var middleCol = Math.floor(model.DISPLAY_COLS / 2);

    if (direction === "east") {
      return x === model.DISPLAY_COLS - 1 && y === middleRow;
    }
    if (direction === "west") {
      return x === 0 && y === middleRow;
    }
    if (direction === "south") {
      return y === model.DISPLAY_ROWS - 1 && x === middleCol;
    }
    if (direction === "north") {
      return y === 0 && x === middleCol;
    }
    return false;
  }

  function minimalWallBetween(sectionId, neighborSectionId) {
    var state = minimalRpgState();
    var walls = state && Array.isArray(state.walls) ? state.walls : [];
    var wall;
    var i;

    if (!sectionId || !neighborSectionId || sectionId === neighborSectionId) {
      return false;
    }

    for (i = 0; i < walls.length; i += 1) {
      wall = walls[i];
      if (!wall) {
        continue;
      }
      if ((wall.fromSectionId === sectionId && wall.toSectionId === neighborSectionId) ||
          (wall.fromSectionId === neighborSectionId && wall.toSectionId === sectionId)) {
        return true;
      }
    }

    return false;
  }

  function minimalRoomWallBetween(fromRoom, toRoom) {
    var state = minimalRpgState();
    var walls = state && Array.isArray(state.walls) ? state.walls : [];
    var fromId = fromRoom && fromRoom.id ? fromRoom.id : "";
    var toId = toRoom && toRoom.id ? toRoom.id : "";
    var wall;
    var i;

    if (!fromId || !toId) {
      return false;
    }

    if ((fromId === "room_e02" && toId === "room_e03") ||
        (fromId === "room_e03" && toId === "room_e02")) {
      return true;
    }

    for (i = 0; i < walls.length; i += 1) {
      wall = walls[i];
      if (!wall || !wall.fromRoomId || !wall.toRoomId) {
        continue;
      }
      if ((wall.fromRoomId === fromId && wall.toRoomId === toId) ||
          (wall.fromRoomId === toId && wall.toRoomId === fromId)) {
        return true;
      }
    }

    return false;
  }

  function hasSectionWallAt(room, direction) {
    var neighborPosition = directionNeighbor(room, direction);
    var world = activeWorld();
    var neighborSection;

    if (!room || !neighborPosition || !world || typeof model.resolveSectionForCoordinate !== "function") {
      return false;
    }

    neighborSection = model.resolveSectionForCoordinate(project, world.id, neighborPosition.x, neighborPosition.y);
    return minimalWallBetween(room.sectionId, neighborSection && neighborSection.id);
  }

  function hasRoomWallAt(room, direction) {
    var neighborPosition = directionNeighbor(room, direction);
    var neighborRoom;

    if (!room || !neighborPosition) {
      return false;
    }

    neighborRoom = effectiveRoomAt(neighborPosition.x, neighborPosition.y);
    return minimalRoomWallBetween(room, neighborRoom);
  }

  function minimalBoundaryChar(room, x, y) {
    var directions = ["east", "west", "south", "north"];
    var direction;
    var i;

    for (i = 0; i < directions.length; i += 1) {
      direction = directions[i];
      if (isGateCellPosition(room, x, y, direction) && gateForRoomDirection(room, direction)) {
        return "1";
      }
    }

    if ((x === model.DISPLAY_COLS - 1 && (hasSectionWallAt(room, "east") || hasRoomWallAt(room, "east"))) ||
        (x === 0 && (hasSectionWallAt(room, "west") || hasRoomWallAt(room, "west"))) ||
        (y === model.DISPLAY_ROWS - 1 && (hasSectionWallAt(room, "south") || hasRoomWallAt(room, "south"))) ||
        (y === 0 && (hasSectionWallAt(room, "north") || hasRoomWallAt(room, "north")))) {
      return "8";
    }

    return "";
  }

  function drawCellText(c) {
    if (isEmptyCellChar(c)) return "";
    return c;
  }

  function renderSegmentByteCell(cell, byte) {
    cell.classList.add("textGlyphCell");
    cell.innerHTML = segmentCellSvg(byte & 0xff);
  }

  function segmentLettersByte(letters) {
    var byte = 0;

    String(letters || "").split("").forEach(function (letter) {
      var segment = letter.toLowerCase();
      if (SEGMENT_BITS[segment]) {
        byte |= SEGMENT_BITS[segment];
      }
    });

    return byte;
  }

  function renderEmulator(blank) {
    var grid = document.getElementById("emulatorGrid");
    var label = document.getElementById("emulatorRoomLabel");
    var phaseLabel = document.getElementById("browserBattlePhaseLabel");
    var room = currentRoom();

    grid.innerHTML = "";
    grid.classList.remove("battleGridActive");
    grid.classList.toggle("isBlank", Boolean(blank));
    label.textContent = roomLabel(runtime.roomX, runtime.roomY);
    if (phaseLabel) {
      phaseLabel.textContent = "world";
    }

    for (var index = 0; index < model.DISPLAY_CELLS; index += 1) {
      var xy = model.xyFromIndex(index);
      var c = blank ? " " : cellChar(room, xy.x, xy.y);
      var cell = document.createElement("div");

      cell.className = "emulatorCell";
      cell.classList.toggle("wallCell", isWallChar(c));
      cell.classList.toggle("gateCell", isGateChar(c));

      if (!blank && xy.x === runtime.playerX && xy.y === runtime.playerY) {
        cell.classList.add("playerCell");
        renderTextGlyphCell(cell, "1");
      } else {
        renderTextGlyphCell(cell, drawCellText(c) || " ");
      }

      grid.appendChild(cell);
    }
    updateItemButtons();
  }

  function renderCoordinateNotice(roomX, roomY) {
    var grid = document.getElementById("emulatorGrid");
    var label = document.getElementById("emulatorRoomLabel");
    var phaseLabel = document.getElementById("browserBattlePhaseLabel");
    var letter = model.roomXLabel(roomX).toUpperCase();
    var tens = String(Math.floor(roomY / 10));
    var ones = String(roomY % 10);

    grid.innerHTML = "";
    grid.classList.remove("battleGridActive");
    grid.classList.remove("isBlank");
    label.textContent = roomLabel(roomX, roomY);
    if (phaseLabel) {
      phaseLabel.textContent = "room";
    }

    for (var index = 0; index < model.DISPLAY_CELLS; index += 1) {
      var cell = document.createElement("div");
      var row = Math.floor(index / model.DISPLAY_COLS);
      var x = index % model.DISPLAY_COLS;

      cell.className = "emulatorCell";

      if (row === 0 && x === 5) {
        renderTextGlyphCell(cell, letter, true);
      } else if (row === 0 && x === 6) {
        renderTextGlyphCell(cell, tens);
      } else if (row === 0 && x === 7) {
        renderTextGlyphCell(cell, ones);
      }

      grid.appendChild(cell);
    }
  }

  function segmentCellSvg(value) {
    var segments = SEGMENT_ORDER.map(function (segment) {
      var className = value & SEGMENT_BITS[segment] ? "emulatorSegmentOn" : "emulatorSegmentOff";

      return '<polygon data-segment="' + segment + '" class="' + className + '" points="' +
        SEGMENT_POINTS[segment] + '"></polygon>';
    }).join("");

    return '<svg viewBox="0 -1 14 20" aria-hidden="true" focusable="false">' +
      segments +
      '</svg>';
  }

  function renderTextGlyphCell(cell, character, forceDp) {
    var byte = model && typeof model.textGlyphByte === "function" ?
      model.textGlyphByte(project, character) :
      0;

    if (forceDp) {
      byte |= SEGMENT_BITS.dp;
    }
    cell.classList.add("textGlyphCell");
    cell.innerHTML = segmentCellSvg(byte);
  }

  function renderLifecycleMessage(message) {
    var grid = document.getElementById("emulatorGrid");
    var label = document.getElementById("emulatorRoomLabel");
    var phaseLabel = document.getElementById("browserBattlePhaseLabel");
    var text = String(message || "").toUpperCase().slice(0, model.DISPLAY_CELLS);

    grid.innerHTML = "";
    grid.classList.remove("battleGridActive");
    grid.classList.remove("isBlank");
    label.textContent = "text";
    if (phaseLabel) {
      phaseLabel.textContent = "text";
    }

    for (var index = 0; index < model.DISPLAY_CELLS; index += 1) {
      var cell = document.createElement("div");

      cell.className = "emulatorCell";
      renderTextGlyphCell(cell, text.charAt(index) || " ");
      grid.appendChild(cell);
    }
  }

  function itemMenuText() {
    return potionCount() > 0 ?
      "POT" + String(potionCount()) + " HP " + heroCurrentHp() + "/" + heroMaxHp() :
      "NO POT HP " + heroCurrentHp() + "/" + heroMaxHp();
  }

  function updateItemButtons() {
    var itemButton = document.getElementById("openItemMenuButton");
    var useButton = document.getElementById("usePotionButton");

    if (itemButton) {
      itemButton.textContent = isItemMenuOpen ? "Close" : "Item";
    }
    if (useButton) {
      useButton.disabled = !isItemMenuOpen || potionCount() <= 0;
    }
  }

  function renderItemMenu() {
    renderLifecycleMessage(itemMenuText());
    document.getElementById("emulatorRoomLabel").textContent = "item";
    updateItemButtons();
  }

  function closeItemMenu(message) {
    isItemMenuOpen = false;
    renderEmulator(false);
    updateItemButtons();
    if (message) {
      setStatus(message);
    }
  }

  function toggleItemMenu() {
    if (dismissMessageHandler) {
      dismissMessageHandler();
      return;
    }
    if (isTransitioning || isInBattle || isShowingLifecycleMessage ||
        (window.SevenSegBattle && window.SevenSegBattle.isActive && window.SevenSegBattle.isActive())) {
      setStatus("Item menu is available outside battle.");
      return;
    }
    if (isItemMenuOpen) {
      closeItemMenu("Item menu closed.");
      return;
    }
    isItemMenuOpen = true;
    renderItemMenu();
    setStatus("Item menu open. Use spends one potion.");
  }

  function usePotionOutsideBattle() {
    var count = potionCount();
    var amount = potionHealAmount();
    var currentHp = heroCurrentHp();
    var maxHp = heroMaxHp();
    var state;
    var nextHp;

    if (!isItemMenuOpen) {
      toggleItemMenu();
      return;
    }
    if (count <= 0) {
      renderItemMenu();
      setStatus("No potions.");
      return;
    }
    if (currentHp >= maxHp) {
      renderItemMenu();
      setStatus("HP is already full.");
      return;
    }

    state = ensureMinimalRpgState();
    nextHp = Math.min(maxHp, currentHp + amount);
    state.potionCount = Math.max(0, count - 1);
    setHeroCurrentHp(nextHp);
    notifyProjectChanged();
    renderItemMenu();
    setStatus("Potion used. HP " + nextHp + "/" + maxHp + ". Potions = " + state.potionCount + ".");
  }

  function textPages(message) {
    var words = String(message || "").toUpperCase().trim().split(/\s+/);
    var pages = [];
    var current = "";
    var word;
    var chunk;
    var i;

    for (i = 0; i < words.length; i += 1) {
      word = words[i];
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

  function showLifecycleMessage(message, onDone) {
    clearLifecycleTimer();
    isShowingLifecycleMessage = true;
    renderLifecycleMessage(message);
    refreshSaveSlotsUi();
    lifecycleTimer = window.setTimeout(function () {
      lifecycleTimer = null;
      isShowingLifecycleMessage = false;
      renderEmulator(false);
      refreshSaveSlotsUi();
      if (onDone) {
        onDone();
      }
    }, LIFECYCLE_MESSAGE_MS);
  }

  function showMessageUntilInput(message, onDone) {
    var pages = textPages(message);
    var pageIndex = 0;

    clearLifecycleTimer();
    isShowingLifecycleMessage = true;
    renderLifecycleMessage(pages[pageIndex]);
    refreshSaveSlotsUi();
    dismissMessageHandler = function () {
      if (pageIndex < pages.length - 1) {
        pageIndex += 1;
        renderLifecycleMessage(pages[pageIndex]);
        refreshSaveSlotsUi();
      } else {
        dismissMessageHandler = null;
        isShowingLifecycleMessage = false;
        renderEmulator(false);
        refreshSaveSlotsUi();
        if (onDone) {
          onDone();
        }
      }
    };
  }

  function renderTransitionFrame(dx, dy, step) {
    var grid = document.getElementById("emulatorGrid");
    var phaseLabel = document.getElementById("browserBattlePhaseLabel");
    var row = 0;
    var col = 0;
    var mark = "-";

    grid.innerHTML = "";
    grid.classList.remove("battleGridActive");
    grid.classList.remove("isBlank");
    if (phaseLabel) {
      phaseLabel.textContent = "move";
    }

    if (dy > 0) {
      row = [2, 1, 0][Math.floor(step / 3)];
      mark = ["d", "g", "a"][step % 3];
    } else if (dy < 0) {
      row = [0, 1, 2][Math.floor(step / 3)];
      mark = ["a", "g", "d"][step % 3];
    } else if (dx > 0) {
      col = 7 - Math.floor(step / 2);
      mark = step % 2 === 0 ? "bc" : "ef";
    } else {
      col = Math.floor(step / 2);
      mark = step % 2 === 0 ? "ef" : "bc";
    }

    for (var index = 0; index < model.DISPLAY_CELLS; index += 1) {
      var cell = document.createElement("div");
      var cellRow = Math.floor(index / model.DISPLAY_COLS);
      var x = index % model.DISPLAY_COLS;

      cell.className = "emulatorCell";

      if (dy !== 0 && cellRow === row) {
        renderSegmentByteCell(cell, segmentLettersByte(mark));
      } else if (dy === 0 && x === col) {
        renderSegmentByteCell(cell, segmentLettersByte(mark));
      } else {
        renderSegmentByteCell(cell, 0);
      }

      grid.appendChild(cell);
    }
  }

  function renderRoomTransition(dx, dy, done) {
    var steps = dy === 0 ? 16 : 9;
    var settings = hardwareSettings();
    var stepDelay = settings.transitionAnimationMs <= 0 ? 0 : Math.max(1, Math.floor(settings.transitionAnimationMs / steps));
    var step = 0;

    if (settings.transitionAnimationMs <= 0) {
      done();
      return;
    }

    function next() {
      renderTransitionFrame(dx, dy, step);
      step += 1;

      if (step < steps) {
        window.setTimeout(next, stepDelay);
      } else {
        done();
      }
    }

    next();
  }

  function resetEmulator(showIntro) {
    clearLifecycleTimer();
    isItemMenuOpen = false;
    runtime = {
      roomX: project.start.roomX,
      roomY: project.start.roomY,
      playerX: project.start.playerX,
      playerY: project.start.playerY
    };

    isTransitioning = false;
    isInBattle = false;
    isShowingLifecycleMessage = false;

    if (showIntro) {
      updateItemButtons();
      showLifecycleMessage(introMessage(), function () {
        setStatus("Browser movement test is ready at the start position.");
        refreshSaveSlotsUi();
        playMusicMode("worldmap");
      });
      return;
    }

    renderEmulator(false);
    playMusicMode("worldmap");
    setStatus("Browser movement test reset to the start position.");
    refreshSaveSlotsUi();
  }

  function targetForMove(dx, dy) {
    var target = {
      roomX: runtime.roomX,
      roomY: runtime.roomY,
      playerX: runtime.playerX + dx,
      playerY: runtime.playerY + dy,
      changesRoom: false
    };

    if (target.playerX < 0) {
      target.roomX -= 1;
      target.playerX = model.DISPLAY_COLS - 1;
      target.changesRoom = true;
    } else if (target.playerX >= model.DISPLAY_COLS) {
      target.roomX += 1;
      target.playerX = 0;
      target.changesRoom = true;
    }

    if (target.playerY < 0) {
      target.roomY -= 1;
      target.playerY = model.DISPLAY_ROWS - 1;
      target.changesRoom = true;
    } else if (target.playerY >= model.DISPLAY_ROWS) {
      target.roomY += 1;
      target.playerY = 0;
      target.changesRoom = true;
    }

    return target;
  }

  function movementDirection(target) {
    if (!target || !target.changesRoom) {
      return "";
    }
    if (target.roomX > runtime.roomX) {
      return "east";
    }
    if (target.roomX < runtime.roomX) {
      return "west";
    }
    if (target.roomY > runtime.roomY) {
      return "south";
    }
    if (target.roomY < runtime.roomY) {
      return "north";
    }
    return "";
  }

  function roomBoundary(room, direction) {
    var data;

    if (!room || !direction) {
      return null;
    }

    data = room.data || (room.metadata && room.metadata.data) || null;
    if (data && data.boundary && data.boundary[direction]) {
      return data.boundary[direction];
    }
    if (room.metadata && room.metadata.data && room.metadata.data.boundary && room.metadata.data.boundary[direction]) {
      return room.metadata.data.boundary[direction];
    }

    return null;
  }

  function minimalGateBetween(fromRoom, toRoom) {
    var state = minimalRpgState();
    var gates = state && Array.isArray(state.gates) ? state.gates : [];
    var fromId = fromRoom && fromRoom.id ? fromRoom.id : "";
    var toId = toRoom && toRoom.id ? toRoom.id : "";
    var i;
    var gate;

    if (!fromId || !toId) {
      return null;
    }

    for (i = 0; i < gates.length; i += 1) {
      gate = gates[i];
      if (!gate) {
        continue;
      }
      if ((gate.fromRoomId === fromId && gate.toRoomId === toId) ||
          (gate.fromRoomId === toId && gate.toRoomId === fromId)) {
        return gate;
      }
    }

    return null;
  }

  function markerGateForCell(room, x, y) {
    var boundary;

    if (!room || !isGateChar(cellChar(room, x, y))) {
      return null;
    }

    if (x === model.DISPLAY_COLS - 1) {
      boundary = gateForRoomDirection(room, "east");
      if (boundary) {
        return boundary;
      }
    }
    if (x === 0) {
      boundary = gateForRoomDirection(room, "west");
      if (boundary) {
        return boundary;
      }
    }
    if (y === model.DISPLAY_ROWS - 1) {
      boundary = gateForRoomDirection(room, "south");
      if (boundary) {
        return boundary;
      }
    }
    if (y === 0) {
      boundary = gateForRoomDirection(room, "north");
      if (boundary) {
        return boundary;
      }
    }

    return null;
  }

  function gateForMove(target) {
    var fromRoom;
    var toRoom;
    var boundary;

    if (!target || !target.changesRoom) {
      return null;
    }

    fromRoom = currentRoom();
    toRoom = effectiveRoomAt(target.roomX, target.roomY);
    boundary = roomBoundary(fromRoom, movementDirection(target));

    if (boundary && boundary.kind === "lockedGate") {
      return boundary;
    }

    return minimalGateBetween(fromRoom, toRoom);
  }

  function blockedReasonForTarget(target) {
    var room = effectiveRoomAt(target.roomX, target.roomY);
    var cell = cellChar(room, target.playerX, target.playerY);
    var fromRoom;
    var gate;
    var flagId;

    if (!room) {
      return "No room there.";
    }

    if (target && target.changesRoom) {
      fromRoom = currentRoom();
      if (minimalRoomWallBetween(fromRoom, room)) {
        return "Movement blocked.";
      }
    }

    gate = gateForMove(target) || markerGateForCell(room, target.playerX, target.playerY);
    if (gate) {
      flagId = gate.requiredFlag || "hasAncientKey";
      if (minimalRpgFlags()[flagId] !== true) {
        return "Gate locked. Find the key.";
      }
    }

    if (isWallChar(cell)) {
      return "Movement blocked.";
    }

    return "";
  }

  function canEnter(target) {
    return blockedReasonForTarget(target) === "";
  }

  function playMusicMode(mode) {
    if (window.SevenSegMusicRuntime &&
        window.SevenSegMusicRuntime.isEnabled &&
        window.SevenSegMusicRuntime.isEnabled()) {
      window.SevenSegMusicRuntime.playMode(project, mode);
    }
  }

  function startRandomBattle(encounterGroupId) {
    encounterGroupId = encounterGroupId || currentEncounterGroupId();

    if (!encounterGroupId) {
      setStatus("No battle encounter is available here.");
      return;
    }

    isInBattle = true;
    battleReturnRuntime = {
      roomX: runtime.roomX,
      roomY: runtime.roomY,
      playerX: runtime.playerX,
      playerY: runtime.playerY,
      encounterGroupId: encounterGroupId
    };
    renderEmulator(true);
    refreshSaveSlotsUi();
    playMusicMode("battle");
    setStatus("Battle triggered by random chance.");

    window.SevenSegBattle.start({
      encounterGroupId: encounterGroupId,
      displayElementId: "emulatorGrid",
      onEnd: function (outcome) {
        var key = outcome && outcome.key ? outcome.key : "";
        var text = outcome && outcome.text ? outcome.text : "";
        var xpMessage = outcome && outcome.xpMessage ? outcome.xpMessage : "";
        var resultText;
        isInBattle = false;
        if (key === "victory" && battleReturnRuntime) {
          if (!outcome || outcome.xpAwarded !== true) {
            xpMessage = applyVictoryXp(battleReturnRuntime.encounterGroupId);
          }
          resultText = text || "Victory";
          if (xpMessage && resultText.indexOf(xpMessage) === -1) {
            resultText += " " + xpMessage;
          }
          runtime = battleReturnRuntime;
          battleReturnRuntime = null;
          renderEmulator(false);
          refreshSaveSlotsUi();
          playMusicMode("worldmap");
          setStatus(resultText + ". Returned to the same worldmap position.");
        } else {
          battleReturnRuntime = null;
          resetEmulator(true);
          playMusicMode("worldmap");
          setStatus((text || "Game over") + ". Combined browser test restarted from the beginning.");
        }
      }
    });
  }

  function maybeTriggerBattle() {
    var settings = hardwareSettings();
    var encounterGroupId;

    if (isInBattle) {
      return;
    }
    if (!settings.triggerBattles) {
      return;
    }

    encounterGroupId = currentEncounterGroupId();
    if (!encounterGroupId) {
      return;
    }

    if (Math.random() < BATTLE_CHANCE) {
      startRandomBattle(encounterGroupId);
    }
  }

  function finishMove(target) {
    var openedChest;

    runtime.roomX = target.roomX;
    runtime.roomY = target.roomY;
    runtime.playerX = target.playerX;
    runtime.playerY = target.playerY;
    renderEmulator(false);
    refreshSaveSlotsUi();

    openedChest = openCurrentChest();
    if (openedChest) {
      return;
    }

    setStatus("Player at " + roomLabel(runtime.roomX, runtime.roomY) + " x" + runtime.playerX + " y" + runtime.playerY + ".");
    maybeTriggerBattle();
  }

  function applyMove(target) {
    var settings = hardwareSettings();

    if (target.changesRoom) {
      runtime.roomX = target.roomX;
      runtime.roomY = target.roomY;
      runtime.playerX = target.playerX;
      runtime.playerY = target.playerY;

      if (!settings.showCoordinates) {
        finishMove(target);
        isTransitioning = false;
        return;
      }

      renderCoordinateNotice(runtime.roomX, runtime.roomY);
      refreshSaveSlotsUi();
      setStatus("Entered room " + coordinateLabel(runtime.roomX, runtime.roomY) + ".");

      window.setTimeout(function () {
        finishMove(target);
        isTransitioning = false;
      }, settings.coordinateTimeMs);
      return;
    }

    finishMove(target);
  }

  function move(dx, dy) {
    var now = Date.now();
    var target;

    if (dismissMessageHandler) {
      dismissMessageHandler();
      return;
    }

    if (isItemMenuOpen) {
      setStatus("Close item menu before moving.");
      renderItemMenu();
      return;
    }

    if (isTransitioning || isInBattle || isShowingLifecycleMessage ||
        (window.SevenSegBattle && window.SevenSegBattle.isActive && window.SevenSegBattle.isActive())) {
      return;
    }

    if (now - lastMoveAt < MOVE_REPEAT_MS) {
      return;
    }

    lastMoveAt = now;
    target = targetForMove(dx, dy);

    if (!canEnter(target)) {
      setStatus(blockedReasonForTarget(target) || "Movement blocked.");
      return;
    }

    if (target.changesRoom) {
      isTransitioning = true;
      setStatus("Changing room...");
      renderRoomTransition(dx, dy, function () {
        applyMove(target);
      });
      return;
    }

    applyMove(target);
  }

  function saveAllowedReason() {
    if (isItemMenuOpen) {
      return "Close item menu before saving.";
    }
    if (isInBattle || (window.SevenSegBattle && window.SevenSegBattle.isActive && window.SevenSegBattle.isActive())) {
      return "Battle is active.";
    }
    if (isTransitioning) {
      return "Room transition is active.";
    }
    if (isShowingLifecycleMessage) {
      return "Wait until the current text message finishes.";
    }
    if (currentAreaType() === "dungeon" && !currentRoomIsSavePoint()) {
      return "Dungeon saves require save points.";
    }
    return "";
  }

  async function saveSlot(index) {
    var reason = saveAllowedReason();
    var slots;
    var world;
    var slot;
    var confirmed;

    if (reason) {
      refreshSaveSlotsUi();
      setStatus(reason);
      return;
    }

    slots = readSaveSlots();
    if (slots[index]) {
      confirmed = await confirmDialog({
        title: "Overwrite browser save?",
        message: 'Overwrite Slot ' + String(index + 1) + '?',
        confirmLabel: "Overwrite"
      });
      if (!confirmed) {
        refreshSaveSlotsUi();
        setStatus("Save cancelled.");
        return;
      }
    }
    world = currentWorld();
    slot = {
      version: 2,
      roomX: runtime.roomX,
      roomY: runtime.roomY,
      playerX: runtime.playerX,
      playerY: runtime.playerY,
      worldId: world && world.id ? world.id : null,
      areaType: currentAreaType(),
      coordinate: coordinateLabel(runtime.roomX, runtime.roomY),
      rpgState: browserRpgSaveSnapshot(),
      savedAt: new Date().toISOString()
    };
    slots[index] = slot;

    if (!writeSaveSlots(slots)) {
      setStatus("Browser save slots are unavailable.");
      refreshSaveSlotsUi();
      return;
    }

    refreshSaveSlotsUi();
    setStatus("Saved slot " + String(index + 1) + " at " + slot.coordinate + ".");
  }

  function loadSlot(index) {
    var reason = saveAllowedReason();
    var slots = readSaveSlots();
    var slot = slots[index];

    if (reason && reason !== "Dungeon saves require save points.") {
      refreshSaveSlotsUi();
      setStatus(reason);
      return;
    }
    if (!slot) {
      setStatus("Slot " + String(index + 1) + " is empty.");
      return;
    }
    if (!slotIsLoadable(slot)) {
      setStatus("Slot " + String(index + 1) + " does not match the current world data.");
      refreshSaveSlotsUi();
      return;
    }

    battleReturnRuntime = null;
    runtime.roomX = slot.roomX;
    runtime.roomY = slot.roomY;
    runtime.playerX = slot.playerX;
    runtime.playerY = slot.playerY;
    if (restoreBrowserRpgSaveSnapshot(slot.rpgState)) {
      notifyProjectChanged();
    }
    renderEmulator(false);
    refreshSaveSlotsUi();
    setStatus("Loaded slot " + String(index + 1) + " at " + (slot.coordinate || coordinateLabel(slot.roomX, slot.roomY)) + ".");
  }

  async function clearSlot(index) {
    var slots = readSaveSlots();
    var confirmed;

    if (!slots[index]) {
      setStatus("Slot " + String(index + 1) + " is already empty.");
      refreshSaveSlotsUi();
      return;
    }

    confirmed = await confirmDialog({
      title: "Clear browser save?",
      message: 'Clear Slot ' + String(index + 1) + '?',
      confirmLabel: "Clear"
    });
    if (!confirmed) {
      setStatus("Clear cancelled.");
      return;
    }

    slots[index] = null;
    if (!writeSaveSlots(slots)) {
      setStatus("Browser save slots are unavailable.");
      refreshSaveSlotsUi();
      return;
    }

    refreshSaveSlotsUi();
    setStatus("Cleared slot " + String(index + 1) + ".");
  }

  function connectButtons() {
    document.getElementById("openItemMenuButton").addEventListener("click", function () {
      toggleItemMenu();
    });
    document.getElementById("usePotionButton").addEventListener("click", function () {
      usePotionOutsideBattle();
    });
    document.getElementById("moveUpButton").addEventListener("click", function () {
      move(0, -1);
    });
    document.getElementById("moveDownButton").addEventListener("click", function () {
      move(0, 1);
    });
    document.getElementById("moveLeftButton").addEventListener("click", function () {
      move(-1, 0);
    });
    document.getElementById("moveRightButton").addEventListener("click", function () {
      move(1, 0);
    });
    document.getElementById("resetEmulatorButton").addEventListener("click", function () {
      clearLifecycleTimer();
      resetEmulator(true);
    });
    for (var i = 0; i < SAVE_SLOT_COUNT; i += 1) {
      (function (slotIndex) {
        document.getElementById("saveSlot" + (slotIndex + 1) + "Button").addEventListener("click", function () {
          saveSlot(slotIndex);
        });
        document.getElementById("loadSlot" + (slotIndex + 1) + "Button").addEventListener("click", function () {
          loadSlot(slotIndex);
        });
        document.getElementById("clearSlot" + (slotIndex + 1) + "Button").addEventListener("click", function () {
          clearSlot(slotIndex);
        });
      }(i));
    }
  }

  function isTypingTarget(target) {
    var name = target && target.tagName ? target.tagName.toLowerCase() : "";
    return name === "input" || name === "textarea" || name === "select";
  }

  function connectKeyboard() {
    document.addEventListener("keydown", function (event) {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (dismissMessageHandler) {
        event.preventDefault();
        dismissMessageHandler();
        return;
      }

      if ((event.key === "i" || event.key === "I") && !isItemMenuOpen) {
        event.preventDefault();
        toggleItemMenu();
      } else if ((event.key === "i" || event.key === "I" || event.key === "Escape") && isItemMenuOpen) {
        event.preventDefault();
        closeItemMenu("Item menu closed.");
      } else if (event.key === "Enter" && isItemMenuOpen) {
        event.preventDefault();
        usePotionOutsideBattle();
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        move(0, -1);
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        move(0, 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1, 0);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        move(1, 0);
      }
    });
  }

  function initEmulator(options) {
    model = options.model;
    project = options.project;
    statusHandler = options.setStatus;
    changeHandler = typeof options.onProjectChanged === "function" ? options.onProjectChanged : null;

    resetEmulator(true);
    connectButtons();
    updateItemButtons();
    connectKeyboard();
    refreshSaveSlotsUi();
  }

  window.SevenSegEmulator = {
    init: initEmulator,
    reset: resetEmulator,
    refresh: function () {
      renderEmulator(false);
      refreshSaveSlotsUi();
    },
    refreshSavePanel: refreshSaveSlotsUi,
    currentEncounterGroupId: currentEncounterGroupId,
    currentSectionId: function () {
      var section = currentSection();
      return section ? section.id : "";
    },
    awardVictoryXp: function (encounterGroupId) {
      return applyVictoryXp(encounterGroupId || currentEncounterGroupId());
    },
    setMinimalRpgFlag: setMinimalRpgFlag,
    currentMinimalRpgFlags: function () {
      var flags = minimalRpgFlags();
      var copy = {};
      var key;

      for (key in flags) {
        if (Object.prototype.hasOwnProperty.call(flags, key)) {
          copy[key] = flags[key];
        }
      }

      return copy;
    },
    showIntro: function () {
      resetEmulator(true);
    }
  };
}());

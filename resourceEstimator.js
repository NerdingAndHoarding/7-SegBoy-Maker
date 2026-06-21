(function (root) {
  "use strict";

  var CAPACITIES = {
    flashPhysicalBytes: 32768,
    flashProjectBytes: 30720,
    sramBytes: 2048,
    sramKnownLimitBytes: 1536,
    sramStackReserveBytes: 512,
    eepromBytes: 1024
  };

  var THRESHOLDS = {
    flashWarningBytes: 24577,
    flashReleaseReviewBytes: 27649,
    sramWarningBytes: 1281,
    eepromWarningBytes: 769
  };

  var ENGINE_FLASH_ESTIMATE = 10032;
  var WORLD_ROOM_BYTES = 9;
  var WORLD_PALETTE_BYTES = 9;
  var ACTOR_RUNTIME_BYTES = 16;

  var PINS = [
    { pin: "D10", owner: "MAX7219 CS/LOAD", status: "fixed" },
    { pin: "D11", owner: "Hardware SPI MOSI", status: "fixed" },
    { pin: "D13", owner: "Hardware SPI SCK", status: "fixed" },
    { pin: "A4", owner: "Direction/menu pot", status: "fixed" },
    { pin: "A0", owner: "BrightnessPot, ADC 0..1023 to intensity 0..15", status: "fixed" },
    { pin: "D5", owner: "Confirm/forward button", status: "fixed" },
    { pin: "D4", owner: "Reject/backward button", status: "fixed" },
    { pin: "D3", owner: "Melody output", status: "reserved" },
    { pin: "D9", owner: "Bass output", status: "reserved" }
  ];

  var TIMERS = [
    {
      timer: "Timer0",
      owner: "Arduino core millis(), micros(), and delay()",
      status: "fixed"
    },
    {
      timer: "Timer1",
      owner: "Reserved for future audio",
      status: "inactive-without-audio-content"
    },
    {
      timer: "Timer2",
      owner: "Reserved for future audio",
      status: "inactive-without-audio-content"
    }
  ];

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ?
      value :
      {};
  }

  function integer(value, fallback) {
    var number = Number(value);
    return Number.isInteger(number) ? number : fallback;
  }

  function message(code, scope, text) {
    return {
      code: code,
      scope: scope,
      message: text
    };
  }

  function category(id, label, memory, values) {
    var settings = values || {};

    return {
      id: id,
      label: label,
      memory: memory,
      exactBytes: Number.isFinite(settings.exactBytes) ? settings.exactBytes : 0,
      estimatedBytes: Number.isFinite(settings.estimatedBytes) ? settings.estimatedBytes : 0,
      unknown: Boolean(settings.unknown),
      authoredCount: Number.isFinite(settings.authoredCount) ? settings.authoredCount : 0,
      measurement: settings.measurement || "exact-generated-data",
      details: settings.details || ""
    };
  }

  function flashStatus(bytes) {
    if (bytes > CAPACITIES.flashProjectBytes) return "block";
    if (bytes >= THRESHOLDS.flashReleaseReviewBytes) return "release-review";
    if (bytes >= THRESHOLDS.flashWarningBytes) return "warning";
    return "pass";
  }

  function sramStatus(bytes) {
    if (bytes > CAPACITIES.sramKnownLimitBytes) return "block";
    if (bytes >= THRESHOLDS.sramWarningBytes) return "warning";
    return "pass";
  }

  function eepromStatus(bytes) {
    if (bytes > CAPACITIES.eepromBytes) return "block";
    if (bytes >= THRESHOLDS.eepromWarningBytes) return "warning";
    return "pass";
  }

  function denseWorldCost(project) {
    var rooms = array(project && project.rooms);
    var worlds = array(project && project.worlds);
    var sections = array(project && project.sections);
    var authoredWorld = worlds[0] || null;
    var maxX = -1;
    var maxY = -1;
    var coordinateCount = 0;

    rooms.forEach(function (room) {
      var x = integer(room && room.x, -1);
      var y = integer(room && room.y, -1);

      if (x < 0 || y < 0) return;
      coordinateCount += 1;
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    var width = authoredWorld && Number.isInteger(Number(authoredWorld.width)) ?
      Number(authoredWorld.width) :
      (maxX >= 0 ? maxX + 1 : 0);
    var height = authoredWorld && Number.isInteger(Number(authoredWorld.height)) ?
      Number(authoredWorld.height) :
      (maxY >= 0 ? maxY + 1 : 0);
    var denseRoomCount = width * height;
    var activeSection = sections.filter(function (section) {
      return authoredWorld && section && section.id === authoredWorld.defaultSectionId;
    })[0] || sections[0] || null;
    var bitsPerCell = activeSection && activeSection.palette ?
      integer(activeSection.palette.bitsPerCell, 3) :
      3;
    var compression = root.SevenSegWorldCompression;
    var bytesPerRoom = compression ?
      compression.paletteRoomByteCount(bitsPerCell) :
      Math.ceil(24 * bitsPerCell / 8);
    var paletteLength = activeSection && activeSection.palette ?
      array(activeSection.palette.glyphIds).length :
      0;
    var effectivePaletteLength = paletteLength || 8;
    var roomBytes = denseRoomCount * bytesPerRoom;
    var paletteBytes = denseRoomCount ?
      (
        compression ?
          compression.paletteStorageByteCount(effectivePaletteLength) :
          effectivePaletteLength + Math.ceil(effectivePaletteLength / 8)
      ) :
      0;

    return {
      width: width,
      height: height,
      authoredRoomCount: coordinateCount,
      denseRoomCount: denseRoomCount,
      bitsPerCell: bitsPerCell,
      bytesPerRoom: bytesPerRoom,
      roomBytes: roomBytes,
      paletteBytes: paletteBytes,
      totalBytes: roomBytes + paletteBytes,
      withinOfficialDimensions: width <= 26 && height <= 32
    };
  }

  function estimateVisualAssets(project) {
    var glyphs = array(project && project.glyphs);
    var frames = array(project && project.frames);
    var animations = array(project && project.animations);
    var validFrames = 0;
    var invalidFrames = 0;
    var frameBytes = 0;
    var animationBytes = 0;
    var invalidAnimations = 0;

    frames.forEach(function (frame) {
      if (frame && Array.isArray(frame.cells) && frame.cells.length === 24) {
        validFrames += 1;
        frameBytes += 24;
      } else {
        invalidFrames += 1;
      }
    });

    animations.forEach(function (animation) {
      if (animation && Array.isArray(animation.frameIds)) {
        animationBytes += animation.frameIds.length * 2 + 3;
      } else {
        invalidAnimations += 1;
      }
    });

    return {
      glyphCount: glyphs.length,
      glyphBytes: glyphs.length,
      frameCount: frames.length,
      validFrameCount: validFrames,
      invalidFrameCount: invalidFrames,
      frameBytes: frameBytes,
      animationCount: animations.length,
      invalidAnimationCount: invalidAnimations,
      animationBytes: animationBytes,
      visualBytes: glyphs.length + frameBytes,
      totalBytes: glyphs.length + frameBytes + animationBytes
    };
  }

  function maximumEncounterMembers(project) {
    var maximum = 0;

    array(project && project.encounterGroups).forEach(function (group) {
      maximum = Math.max(maximum, array(group && group.members).length);
    });

    return maximum;
  }

  function startingPartySize(project) {
    var gameFlow = object(project && project.gameFlow);
    var startingIds = array(gameFlow.startingHeroIds);

    if (startingIds.length) return startingIds.length;
    return Math.min(array(project && project.heroes).length, 2);
  }

  function estimateRuntimeSram(project) {
    var partyActors = startingPartySize(project);
    var foeActors = maximumEncounterMembers(project);
    var actorCount = partyActors + foeActors;
    var components = [
      {
        id: "core-globals",
        label: "Engine and input globals",
        bytes: 320,
        measurement: "estimated"
      },
      {
        id: "display-buffers",
        label: "Three 24-cell display/transition buffers",
        bytes: 72,
        measurement: "fixed-estimate"
      },
      {
        id: "room-buffer",
        label: "Decoded active room",
        bytes: 24,
        measurement: "fixed-estimate"
      },
      {
        id: "menu-state",
        label: "Menu, coordinate, and input state",
        bytes: 48,
        measurement: "estimated"
      },
      {
        id: "actor-state",
        label: "Active battle actors",
        bytes: actorCount * ACTOR_RUNTIME_BYTES,
        measurement: "estimated"
      }
    ];
    var knownBytes = components.reduce(function (sum, entry) {
      return sum + entry.bytes;
    }, 0);
    var audioContentCount = array(project && project.music).length +
      array(project && project.soundEffects).length;

    return {
      components: components,
      partyActorCount: partyActors,
      foeActorCount: foeActors,
      activeActorCount: actorCount,
      bytesPerActor: ACTOR_RUNTIME_BYTES,
      knownBytes: knownBytes,
      stackReserveBytes: CAPACITIES.sramStackReserveBytes,
      physicalRemainingBytes: CAPACITIES.sramBytes - knownBytes,
      remainingAfterReserveBytes:
        CAPACITIES.sramBytes - CAPACITIES.sramStackReserveBytes - knownBytes,
      status: sramStatus(knownBytes),
      audioRuntimeUnknown: audioContentCount > 0
    };
  }

  function estimateEeprom(project) {
    var saveData = object(project && project.saveData);
    var fields = array(saveData.stateFields);
    var slotCount = Math.max(0, integer(saveData.slotCount, 3));
    var globalHeaderBytes = 4;
    var slotHeaderBytes = 4;
    var payloadBytes = 0;
    var invalidFieldCount = 0;

    fields.forEach(function (field) {
      var byteCount = integer(field && field.byteCount, -1);
      if (byteCount < 0) {
        invalidFieldCount += 1;
      } else {
        payloadBytes += byteCount;
      }
    });

    var knownMinimumBytes = globalHeaderBytes +
      slotCount * (slotHeaderBytes + payloadBytes);
    var encodingLocked = Boolean(
      saveData.data && saveData.data.encodingLocked === true
    );
    var declaredPayloadBytes = integer(saveData.data && saveData.data.payloadBytesPerSlot, -1);
    var declaredTotalBytes = integer(saveData.data && saveData.data.totalEepromBytes, -1);
    var unknown = !encodingLocked || fields.length === 0 || invalidFieldCount > 0;
    var contractMismatch = declaredPayloadBytes >= 0 && declaredPayloadBytes !== payloadBytes ||
      declaredTotalBytes >= 0 && declaredTotalBytes !== knownMinimumBytes;

    return {
      slotCount: slotCount,
      fieldCount: fields.length,
      invalidFieldCount: invalidFieldCount,
      globalHeaderBytes: globalHeaderBytes,
      slotHeaderBytes: slotHeaderBytes,
      payloadBytesPerSlot: payloadBytes,
      knownMinimumBytes: knownMinimumBytes,
      declaredPayloadBytesPerSlot: declaredPayloadBytes >= 0 ? declaredPayloadBytes : null,
      declaredTotalBytes: declaredTotalBytes >= 0 ? declaredTotalBytes : null,
      contractMismatch: contractMismatch,
      exactBytes: unknown ? null : knownMinimumBytes,
      unknown: unknown,
      status: eepromStatus(knownMinimumBytes)
    };
  }

  function provisionalLibraryCategory(id, label, entries, details) {
    var count = array(entries).length;

    return category(id, label, "flash", {
      exactBytes: 0,
      unknown: count > 0,
      authoredCount: count,
      measurement: count > 0 ? "encoding-not-defined" : "exact-empty",
      details: count > 0 ?
        details :
          "No authored records currently require storage."
    });
  }

  function hasMinimalRpgContract(project) {
    return Boolean(
      project &&
      project.gameFlow &&
      project.gameFlow.data &&
      project.gameFlow.data.minimalRpg &&
      project.saveData &&
      project.saveData.data &&
      project.saveData.data.scope === "minimal-rpg-v1"
    );
  }

  function textStorageBytes(project) {
    var texts = array(project && project.texts);
    var bytes = texts.reduce(function (sum, entry) {
      return sum + String(entry && entry.text ? entry.text : "").length + 1;
    }, 0);

    return bytes + texts.length * 2;
  }

  function minimalRpgDataBytes(project) {
    var minimal = object(project && project.gameFlow && project.gameFlow.data ?
      project.gameFlow.data.minimalRpg :
      {});
    var textBytes = textStorageBytes(project);
    var chestBytes = array(minimal.chests).length * 8;
    var gateBytes = array(minimal.gates).length * 6;
    var eventBytes = array(project && project.interactions).length * 3 +
      array(object(project && project.eventGraph).nodes).length * 4;
    var heroBytes = array(project && project.heroes).length * 8;
    var enemyBytes = array(project && project.enemies).length * 5;
    var encounterBytes = array(project && project.encounterGroups).length * 4;
    var itemEquipmentBytes = array(project && project.items).length * 3 +
      array(project && project.equipment).length * 4 +
      2;
    var battleRuleBytes = 16;
    var flagBytes = 3;

    return {
      textBytes: textBytes,
      chestBytes: chestBytes,
      gateBytes: gateBytes,
      eventBytes: eventBytes,
      heroBytes: heroBytes,
      enemyBytes: enemyBytes,
      encounterBytes: encounterBytes,
      itemEquipmentBytes: itemEquipmentBytes,
      battleRuleBytes: battleRuleBytes,
      flagBytes: flagBytes
    };
  }

  function estimateProject(inputProject, options) {
    var project = inputProject && typeof inputProject === "object" ?
      inputProject :
      {};
    var settings = options || {};
    var finalExport = settings.finalExport === true;
    var world = denseWorldCost(project);
    var visuals = estimateVisualAssets(project);
    var sram = estimateRuntimeSram(project);
    var eeprom = estimateEeprom(project);
    var minimalRpg = hasMinimalRpgContract(project);
    var minimalBytes = minimalRpg ? minimalRpgDataBytes(project) : null;
    var eventCount = array(project.interactions).length +
      array(object(project.eventGraph).nodes).length;
    var itemEquipment = array(project.items).concat(array(project.equipment));
    var spellAbility = array(project.spells).concat(array(project.abilities));
    var audio = array(project.music).concat(array(project.soundEffects));
    var categories = [
      category("engine", "Engine/display code", "flash", {
        estimatedBytes: ENGINE_FLASH_ESTIMATE,
        unknown: false,
        measurement: "estimated-compiled-cost",
        details: "Planning allowance calibrated from accepted proof-of-concept compiles."
      }),
      category("world", "World data", "flash", {
        exactBytes: world.totalBytes,
        authoredCount: world.authoredRoomCount,
        details:
          world.denseRoomCount + " dense rooms x " + world.bytesPerRoom +
          " bytes at " + world.bitsPerCell + " bits/cell plus " +
          world.paletteBytes + " palette/flags bytes."
      }),
      category("visual-assets", "Visual assets", "flash", {
        exactBytes: visuals.visualBytes,
        unknown: visuals.invalidFrameCount > 0,
        authoredCount: visuals.glyphCount + visuals.frameCount,
        measurement: visuals.invalidFrameCount ?
          "partial-exact-invalid-frames" :
          "exact-generated-data",
        details:
          visuals.glyphBytes + " glyph bytes and " +
          visuals.frameBytes + " frame bytes."
      }),
      minimalRpg ?
        category("events", "Interactions/events", "flash", {
          exactBytes: minimalBytes.eventBytes + minimalBytes.chestBytes +
            minimalBytes.gateBytes + minimalBytes.flagBytes,
          authoredCount: eventCount,
          details: "Minimal RPG chest, gate, flag, and event records are fixed generated data."
        }) :
        provisionalLibraryCategory(
          "events",
          "Interactions/events",
          new Array(eventCount),
          "Interaction/event encoding is owned by a later milestone."
        ),
      minimalRpg ?
        category("text", "Text", "flash", {
          exactBytes: minimalBytes.textBytes,
          authoredCount: array(project.texts).length,
          details: "Minimal RPG text is stored as PROGMEM C strings plus 2-byte pointers."
        }) :
        provisionalLibraryCategory(
          "text",
          "Text",
          project.texts,
          "Text alphabet and packed encoding are not implemented yet."
        ),
      minimalRpg ?
        category("heroes", "Heroes", "flash", {
          exactBytes: minimalBytes.heroBytes,
          authoredCount: array(project.heroes).length,
          details: "Minimal hero stats are fixed one-byte generated records."
        }) :
        provisionalLibraryCategory(
          "heroes",
          "Heroes",
          project.heroes,
          "Hero definition encoding is not implemented yet."
        ),
      minimalRpg ?
        category("enemies", "Enemies", "flash", {
          exactBytes: minimalBytes.enemyBytes,
          authoredCount: array(project.enemies).length,
          details: "Minimal enemy stats are fixed one-byte generated records."
        }) :
        provisionalLibraryCategory(
          "enemies",
          "Enemies",
          project.enemies,
          "Enemy definition encoding is not implemented yet."
        ),
      minimalRpg ?
        category("encounters", "Encounters", "flash", {
          exactBytes: minimalBytes.encounterBytes,
          authoredCount: array(project.encounterGroups).length,
          details: "Minimal encounter rows are fixed generated records."
        }) :
        provisionalLibraryCategory(
          "encounters",
          "Encounters",
          project.encounterGroups,
          "Encounter encoding is not implemented yet."
        ),
      minimalRpg ?
        category("items-equipment", "Items/equipment", "flash", {
          exactBytes: minimalBytes.itemEquipmentBytes,
          authoredCount: itemEquipment.length,
          details: "Potion heal and sword attack bonus are fixed generated constants."
        }) :
        provisionalLibraryCategory(
          "items-equipment",
          "Items/equipment",
          itemEquipment,
          "Item and equipment encoding is not implemented yet."
        ),
      provisionalLibraryCategory(
        "spells-abilities",
        "Spells/abilities",
        spellAbility,
        "Spell and ability encoding is not implemented yet."
      ),
      minimalRpg ?
        category("battle-rules", "Battle rules", "flash", {
          exactBytes: minimalBytes.battleRuleBytes,
          authoredCount: 1,
          details: "Minimal RPG battle constants are fixed generated data."
        }) :
        category("battle-rules", "Battle rules", "flash", {
          exactBytes: 0,
          unknown: Object.keys(object(project.battleRules)).length > 0,
          authoredCount: Object.keys(object(project.battleRules)).length ? 1 : 0,
          measurement: Object.keys(object(project.battleRules)).length ?
            "encoding-not-defined" :
            "exact-empty",
          details: "Battle rule table encoding is not implemented yet."
        }),
      category("animations", "Animations", "flash", {
        exactBytes: visuals.animationBytes,
        unknown: visuals.invalidAnimationCount > 0,
        authoredCount: visuals.animationCount,
        measurement: visuals.invalidAnimationCount ?
          "partial-exact-invalid-animations" :
          "exact-generated-data",
        details: "Two-byte frame references plus duration/loop fields."
      }),
      provisionalLibraryCategory(
        "audio",
        "Music/SFX",
        audio,
        "Audio export is not part of the fast beta path yet."
      )
    ];
    var warnings = [];
    var blockers = [];
    var flashExactBytes = categories.reduce(function (sum, entry) {
      return sum + entry.exactBytes;
    }, 0);
    var flashEstimatedBytes = categories.reduce(function (sum, entry) {
      return sum + entry.estimatedBytes;
    }, 0);
    var flashKnownBytes = flashExactBytes + flashEstimatedBytes;
    var unknownCategories = categories.filter(function (entry) {
      return entry.unknown;
    }).map(function (entry) {
      return entry.id;
    });
    var currentFlashStatus = flashStatus(flashKnownBytes);

    warnings.push(message(
      "ENGINE_COST_ESTIMATED",
      "flash.engine",
      "Engine/display code is a planning estimate until an Arduino compile measures it."
    ));

    if (!world.withinOfficialDimensions) {
      blockers.push(message(
        "WORLD_DIMENSIONS_EXCEEDED",
        "flash.world",
        "The dense world is " + world.width + " x " + world.height +
        "; the official maximum is 26 x 32."
      ));
    }
    if (visuals.invalidFrameCount) {
      warnings.push(message(
        "INVALID_FRAMES_UNCOUNTED",
        "flash.visual-assets",
        visuals.invalidFrameCount + " malformed frame(s) could not be counted as 24-byte frames."
      ));
    }
    if (visuals.invalidAnimationCount) {
      warnings.push(message(
        "INVALID_ANIMATIONS_UNCOUNTED",
        "flash.animations",
        visuals.invalidAnimationCount + " malformed animation(s) could not be counted."
      ));
    }

    if (currentFlashStatus === "block") {
      blockers.push(message(
        "FLASH_LIMIT_EXCEEDED",
        "flash",
        "Known and estimated flash cost is " + flashKnownBytes +
        " bytes, above the 30,720-byte project limit."
      ));
    } else if (currentFlashStatus === "release-review") {
      warnings.push(message(
        "FLASH_RELEASE_REVIEW",
        "flash",
        "Known and estimated flash cost is above 90%; compile evidence and explicit review are required."
      ));
    } else if (currentFlashStatus === "warning") {
      warnings.push(message(
        "FLASH_WARNING",
        "flash",
        "Known and estimated flash cost is above 80% of the project limit."
      ));
    }

    if (unknownCategories.length) {
      warnings.push(message(
        "UNKNOWN_FLASH_CATEGORIES",
        "flash",
        "Unresolved encoding cost remains for: " + unknownCategories.join(", ") + "."
      ));
      if (finalExport) {
        blockers.push(message(
          "FINAL_FLASH_COST_UNKNOWN",
          "flash",
          "Final export cannot pass while required flash categories are unknown."
        ));
      }
    }

    if (sram.status === "block") {
      blockers.push(message(
        "SRAM_LIMIT_EXCEEDED",
        "sram",
        "Known fixed/runtime SRAM is " + sram.knownBytes +
        " bytes, above the 1,536-byte project limit."
      ));
    } else if (sram.status === "warning") {
      warnings.push(message(
        "SRAM_WARNING",
        "sram",
        "Known fixed/runtime SRAM is above 1,280 bytes."
      ));
    }
    warnings.push(message(
      "STACK_DEPTH_UNMEASURED",
      "sram.stack",
      "The 512-byte stack reserve is policy headroom, not measured maximum stack use."
    ));
    if (sram.audioRuntimeUnknown) {
      warnings.push(message(
        "AUDIO_RUNTIME_UNKNOWN",
        "sram.audio",
        "Audio content exists, but its runtime-buffer cost is not implemented yet."
      ));
      if (finalExport) {
        blockers.push(message(
          "FINAL_AUDIO_SRAM_UNKNOWN",
          "sram.audio",
          "Final export cannot pass while audio runtime SRAM is unknown."
        ));
      }
    }

    if (eeprom.slotCount !== 3) {
      warnings.push(message(
        "SAVE_SLOT_COUNT",
        "eeprom",
        "The beta contract requires exactly three manual save slots."
      ));
    }
    if (eeprom.status === "block") {
      blockers.push(message(
        "EEPROM_LIMIT_EXCEEDED",
        "eeprom",
        "Known minimum EEPROM cost is " + eeprom.knownMinimumBytes +
        " bytes, above the 1,024-byte capacity."
      ));
    } else if (eeprom.status === "warning") {
      warnings.push(message(
        "EEPROM_WARNING",
        "eeprom",
        "Known minimum EEPROM cost is above 768 bytes."
      ));
    }
    if (eeprom.unknown) {
      warnings.push(message(
        "EEPROM_ENCODING_UNKNOWN",
        "eeprom",
        "Three-slot save encoding is incomplete; " +
        eeprom.knownMinimumBytes + " bytes is only the known minimum."
      ));
      if (finalExport) {
        blockers.push(message(
          "FINAL_EEPROM_COST_UNKNOWN",
          "eeprom",
          "Final export cannot pass until the three-slot EEPROM encoding is exact."
        ));
      }
    }
    if (eeprom.contractMismatch) {
      warnings.push(message(
        "EEPROM_CONTRACT_MISMATCH",
        "eeprom",
        "The declared EEPROM contract bytes do not match the state field byte counts."
      ));
    }

    if (sram.audioRuntimeUnknown) {
      warnings.push(message(
        "AUDIO_TIMERS_UNRESOLVED",
        "timers",
        "Audio content exists, but Timer1/Timer2 ownership is not implemented yet."
      ));
      if (finalExport) {
        blockers.push(message(
          "FINAL_AUDIO_TIMERS_UNRESOLVED",
          "timers",
          "Final export cannot pass with audio content until the audio driver is implemented."
        ));
      }
    }

    return {
      reportVersion: 1,
      purpose: finalExport ? "final-export" : "planning",
      capacities: cloneJson(CAPACITIES),
      thresholds: cloneJson(THRESHOLDS),
      categories: categories,
      totals: {
        flash: {
          exactBytes: flashExactBytes,
          estimatedBytes: flashEstimatedBytes,
          knownBytes: flashKnownBytes,
          capacityBytes: CAPACITIES.flashProjectBytes,
          remainingKnownBytes: CAPACITIES.flashProjectBytes - flashKnownBytes,
          status: currentFlashStatus,
          unknownCategories: unknownCategories
        },
        sram: sram,
        eeprom: eeprom
      },
      world: world,
      visuals: visuals,
      pins: cloneJson(PINS),
      timers: cloneJson(TIMERS),
      warnings: warnings,
      blockers: blockers,
      status: blockers.length ? "block" : (warnings.length ? "warning" : "pass"),
      notes: [
        "Browser arithmetic does not replace Arduino compile output.",
        "JSON/editor/recovery sizes are not Arduino memory costs.",
        "Immutable generated tables are expected to use PROGMEM."
      ]
    };
  }

  root.SevenSegResourceEstimator = {
    CAPACITIES: cloneJson(CAPACITIES),
    THRESHOLDS: cloneJson(THRESHOLDS),
    ENGINE_FLASH_ESTIMATE: ENGINE_FLASH_ESTIMATE,
    WORLD_ROOM_BYTES: WORLD_ROOM_BYTES,
    WORLD_PALETTE_BYTES: WORLD_PALETTE_BYTES,
    ACTOR_RUNTIME_BYTES: ACTOR_RUNTIME_BYTES,
    denseWorldCost: denseWorldCost,
    estimateVisualAssets: estimateVisualAssets,
    estimateRuntimeSram: estimateRuntimeSram,
    estimateEeprom: estimateEeprom,
    estimateProject: estimateProject
  };
}(typeof window !== "undefined" ? window : this));

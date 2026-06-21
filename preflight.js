(function (root) {
  "use strict";

  var LIBRARY_FIELDS = [
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
  var OFFICIAL_HARDWARE_PROFILE_ID = "sevenseg-nano-3xmax7219-v1";
  var STABLE_ID_PATTERN = /^[a-z][a-z0-9_]*$/;
  var LARGE_TABLE_BYTES = 256;

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ?
      value :
      {};
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function finding(severity, code, path, contentId, plain, technical) {
    return {
      severity: severity,
      code: code,
      path: path,
      contentId: contentId || null,
      message: plain,
      technical: technical || plain,
      source: "structure"
    };
  }

  function resourceFinding(entry, severity) {
    return {
      severity: severity,
      code: entry.code,
      path: entry.scope,
      contentId: null,
      message: entry.message,
      technical: entry.message,
      source: "resource"
    };
  }

  function runPreflight(inputProject, options) {
    var project = inputProject && typeof inputProject === "object" ?
      inputProject :
      {};
    var settings = options || {};
    var estimator = settings.resourceEstimator || root.SevenSegResourceEstimator;
    var finalExport = settings.finalExport === true;
    var errors = [];
    var warnings = [];
    var idIndex = {
      all: {},
      byType: {}
    };

    function addError(code, path, contentId, plain, technical) {
      errors.push(finding("error", code, path, contentId, plain, technical));
    }

    function addWarning(code, path, contentId, plain, technical) {
      warnings.push(finding("warning", code, path, contentId, plain, technical));
    }

    function addId(id, path, type) {
      if (typeof id !== "string" || !STABLE_ID_PATTERN.test(id)) {
        addError(
          "INVALID_ID",
          path,
          typeof id === "string" ? id : null,
          "This content needs a stable lowercase ID.",
          path + " must match " + STABLE_ID_PATTERN + "."
        );
        return;
      }
      if (!idIndex.byType[type]) idIndex.byType[type] = {};
      idIndex.byType[type][id] = path;
      if (idIndex.all[id]) {
        addError(
          "DUPLICATE_ID",
          path,
          id,
          "The ID " + id + " is used by more than one project object.",
          id + " appears at " + idIndex.all[id] + " and " + path + "."
        );
      } else {
        idIndex.all[id] = path;
      }
    }

    function requiredReference(id, path, expectedType, ownerId) {
      var typeIndex = idIndex.byType[expectedType] || {};
      if (typeof id !== "string" || !typeIndex[id]) {
        addError(
          "MISSING_REFERENCE",
          path,
          ownerId,
          "This content points to something that does not exist.",
          path + " references missing " + expectedType + " ID " + String(id) + "."
        );
      }
    }

    function optionalReference(id, path, expectedType, ownerId) {
      if (id !== null && id !== undefined && id !== "") {
        requiredReference(id, path, expectedType, ownerId);
      }
    }

    function referenceList(values, path, expectedType, ownerId) {
      if (!Array.isArray(values)) {
        addError(
          "INVALID_REFERENCE_LIST",
          path,
          ownerId,
          "This reference list is damaged or has the wrong shape.",
          path + " must be an ordered array of " + expectedType + " IDs."
        );
        return;
      }
      values.forEach(function (id, index) {
        requiredReference(id, path + "[" + index + "]", expectedType, ownerId);
      });
    }

    var identity = object(project.project);
    addId(identity.id, "project.id", "project");

    LIBRARY_FIELDS.forEach(function (field) {
      var values = project[field];
      if (!Array.isArray(values)) {
        addError(
          "INVALID_LIBRARY",
          field,
          null,
          "The " + field + " library is missing or damaged.",
          field + " must be an array."
        );
        return;
      }
      values.forEach(function (entry, index) {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          addError(
            "INVALID_LIBRARY_ENTRY",
            field + "[" + index + "]",
            null,
            "This " + field + " entry is not a usable project object.",
            field + "[" + index + "] must be an object."
          );
          return;
        }
        addId(entry.id, field + "[" + index + "].id", field);
      });
    });

    var eventGraph = object(project.eventGraph);
    if (!Array.isArray(eventGraph.nodes)) {
      addError(
        "INVALID_EVENT_GRAPH",
        "eventGraph.nodes",
        null,
        "The event graph node list is missing or damaged.",
        "eventGraph.nodes must be an array."
      );
    } else {
      eventGraph.nodes.forEach(function (node, index) {
        if (!node || typeof node !== "object" || Array.isArray(node)) {
          addError(
            "INVALID_EVENT_NODE",
            "eventGraph.nodes[" + index + "]",
            null,
            "This event node is not a usable object.",
            "eventGraph.nodes[" + index + "] must be an object."
          );
          return;
        }
        addId(node.id, "eventGraph.nodes[" + index + "].id", "eventNodes");
      });
    }

    array(project.frames).forEach(function (frame, index) {
      var path = "frames[" + index + "]";
      var frameId = frame && frame.id;
      var encoding = frame && frame.encoding;
      var cells = frame && frame.cells;

      if (!frame || frame.width !== 8 || frame.height !== 3) {
        addError(
          "INVALID_FRAME_SIZE",
          path,
          frameId,
          "Frame " + String(frameId || index) + " must be an 8 x 3 display frame.",
          path + " must have width 8 and height 3."
        );
      }
      if (encoding !== "segment-bytes-v1" && encoding !== "glyph-refs-v1") {
        addError(
          "INVALID_FRAME_ENCODING",
          path + ".encoding",
          frameId,
          "Frame " + String(frameId || index) + " uses an unsupported cell format.",
          path + ".encoding must be segment-bytes-v1 or glyph-refs-v1."
        );
      }
      if (!Array.isArray(cells) || cells.length !== 24) {
        addError(
          "INVALID_FRAME_CELLS",
          path + ".cells",
          frameId,
          "Frame " + String(frameId || index) + " must contain exactly 24 cells.",
          path + ".cells length is " + (Array.isArray(cells) ? cells.length : "not an array") + "."
        );
      } else if (encoding === "segment-bytes-v1") {
        cells.forEach(function (value, cellIndex) {
          if (!Number.isInteger(value) || value < 0 || value > 255) {
            addError(
              "INVALID_SEGMENT_BYTE",
              path + ".cells[" + cellIndex + "]",
              frameId,
              "This frame cell is not a valid segment byte.",
              path + ".cells[" + cellIndex + "] must be an integer from 0 through 255."
            );
          }
        });
      } else if (encoding === "glyph-refs-v1") {
        referenceList(cells, path + ".cells", "glyphs", frameId);
      }
    });

    array(project.animations).forEach(function (entry, index) {
      referenceList(
        entry && entry.frameIds,
        "animations[" + index + "].frameIds",
        "frames",
        entry && entry.id
      );
    });

    array(project.worlds).forEach(function (entry, index) {
      var path = "worlds[" + index + "]";
      referenceList(entry && entry.sectionIds, path + ".sectionIds", "sections", entry && entry.id);
      optionalReference(entry && entry.startRoomId, path + ".startRoomId", "rooms", entry && entry.id);
    });

    if (array(project.sections).length > 9) {
      addError(
        "SECTION_LIMIT_EXCEEDED",
        "sections",
        null,
        "This project has more than the supported nine sections.",
        "sections contains " + array(project.sections).length + " entries; maximum is 9."
      );
    }

    var compressionMode = object(project.settings).worldCompressionMode;
    if (compressionMode !== "global-8-glyph") {
      addError(
        "UNSUPPORTED_COMPRESSION_MODE",
        "settings.worldCompressionMode",
        null,
        "The selected world compression mode is not supported by the current hardware exporter.",
        "Expected global-8-glyph, received " + String(compressionMode) + "."
      );
    }

    var firstGlobalPalette = null;
    array(project.sections).forEach(function (entry, index) {
      var path = "sections[" + index + "]";
      var palette = object(entry && entry.palette);
      var glyphIds = palette.glyphIds;

      requiredReference(entry && entry.worldId, path + ".worldId", "worlds", entry && entry.id);
      referenceList(entry && entry.roomIds, path + ".roomIds", "rooms", entry && entry.id);
      if (palette.mode !== "global") {
        addError(
          "INCOMPATIBLE_PALETTE_MODE",
          path + ".palette.mode",
          entry && entry.id,
          "This section palette cannot be used with the current global eight-glyph exporter.",
          path + ".palette.mode must be global while worldCompressionMode is global-8-glyph."
        );
      }
      if (!Array.isArray(glyphIds)) {
        addError(
          "INVALID_PALETTE",
          path + ".palette.glyphIds",
          entry && entry.id,
          "This section palette is missing its glyph list.",
          path + ".palette.glyphIds must be an array."
        );
      } else {
        if (glyphIds.length > 8) {
          addError(
            "PALETTE_CAPACITY_EXCEEDED",
            path + ".palette.glyphIds",
            entry && entry.id,
            "A global hardware palette can contain at most eight glyphs.",
            path + ".palette.glyphIds contains " + glyphIds.length + " IDs."
          );
        }
        referenceList(glyphIds, path + ".palette.glyphIds", "glyphs", entry && entry.id);
        if (firstGlobalPalette === null) {
          firstGlobalPalette = JSON.stringify(glyphIds);
        } else if (JSON.stringify(glyphIds) !== firstGlobalPalette) {
          addError(
            "GLOBAL_PALETTE_MISMATCH",
            path + ".palette.glyphIds",
            entry && entry.id,
            "All sections must share the same ordered palette in global-palette mode.",
            path + ".palette.glyphIds differs from sections[0].palette.glyphIds."
          );
        }
      }
    });

    var sectionWorld = {};
    array(project.sections).forEach(function (section) {
      if (section && typeof section.id === "string") {
        sectionWorld[section.id] = section.worldId;
      }
    });
    var usedCoordinates = {};
    array(project.rooms).forEach(function (entry, index) {
      var path = "rooms[" + index + "]";
      var roomId = entry && entry.id;
      var x = Number(entry && entry.x);
      var y = Number(entry && entry.y);
      var worldId = sectionWorld[entry && entry.sectionId];

      requiredReference(entry && entry.sectionId, path + ".sectionId", "sections", roomId);
      optionalReference(entry && entry.frameId, path + ".frameId", "frames", roomId);
      referenceList(entry && entry.interactionIds, path + ".interactionIds", "interactions", roomId);
      referenceList(entry && entry.encounterGroupIds, path + ".encounterGroupIds", "encounterGroups", roomId);
      optionalReference(entry && entry.musicId, path + ".musicId", "music", roomId);

      if (!Number.isInteger(x) || x < 0 || x > 25) {
        addError(
          "INVALID_ROOM_X",
          path + ".x",
          roomId,
          "Room " + String(roomId || index) + " has an invalid horizontal coordinate.",
          path + ".x must be an integer from 0 through 25."
        );
      }
      if (!Number.isInteger(y) || y < 0 || y > 31) {
        addError(
          "INVALID_ROOM_Y",
          path + ".y",
          roomId,
          "Room " + String(roomId || index) + " has an invalid vertical coordinate.",
          path + ".y must be an integer from 0 through 31."
        );
      }
      if (worldId && Number.isInteger(x) && Number.isInteger(y)) {
        var coordinateKey = worldId + ":" + x + "," + y;
        if (usedCoordinates[coordinateKey]) {
          addError(
            "DUPLICATE_ROOM_COORDINATE",
            path,
            roomId,
            "Two rooms occupy the same coordinate in one world.",
            path + " duplicates " + usedCoordinates[coordinateKey] +
            " at world " + worldId + " coordinate " + x + "," + y + "."
          );
        } else {
          usedCoordinates[coordinateKey] = path;
        }
      }
    });

    array(project.interactions).forEach(function (entry, index) {
      var path = "interactions[" + index + "]";
      requiredReference(entry && entry.roomId, path + ".roomId", "rooms", entry && entry.id);
      requiredReference(entry && entry.eventNodeId, path + ".eventNodeId", "eventNodes", entry && entry.id);
    });

    array(project.heroes).forEach(function (entry, index) {
      var path = "heroes[" + index + "]";
      referenceList(entry && entry.equipmentIds, path + ".equipmentIds", "equipment", entry && entry.id);
      referenceList(entry && entry.spellIds, path + ".spellIds", "spells", entry && entry.id);
      referenceList(entry && entry.abilityIds, path + ".abilityIds", "abilities", entry && entry.id);
      Object.keys(object(entry && entry.animationIds)).forEach(function (key) {
        optionalReference(
          entry.animationIds[key],
          path + ".animationIds." + key,
          "animations",
          entry.id
        );
      });
    });

    array(project.enemies).forEach(function (entry, index) {
      var path = "enemies[" + index + "]";
      Object.keys(object(entry && entry.animationIds)).forEach(function (key) {
        optionalReference(
          entry.animationIds[key],
          path + ".animationIds." + key,
          "animations",
          entry.id
        );
      });
    });

    array(project.encounterGroups).forEach(function (entry, index) {
      var members = entry && entry.members;
      var path = "encounterGroups[" + index + "].members";
      if (!Array.isArray(members)) {
        addError(
          "INVALID_ENCOUNTER_MEMBERS",
          path,
          entry && entry.id,
          "This encounter does not have a usable enemy list.",
          path + " must be an array."
        );
        return;
      }
      members.forEach(function (member, memberIndex) {
        requiredReference(
          member && member.enemyId,
          path + "[" + memberIndex + "].enemyId",
          "enemies",
          entry && entry.id
        );
      });
    });

    array(project.items).forEach(function (entry, index) {
      var path = "items[" + index + "]";
      optionalReference(entry && entry.textId, path + ".textId", "texts", entry && entry.id);
      optionalReference(
        entry && entry.useEventNodeId,
        path + ".useEventNodeId",
        "eventNodes",
        entry && entry.id
      );
    });
    array(project.equipment).forEach(function (entry, index) {
      var path = "equipment[" + index + "]";
      requiredReference(entry && entry.itemId, path + ".itemId", "items", entry && entry.id);
      referenceList(entry && entry.abilityIds, path + ".abilityIds", "abilities", entry && entry.id);
    });
    array(project.spells).forEach(function (entry, index) {
      var path = "spells[" + index + "]";
      optionalReference(entry && entry.animationId, path + ".animationId", "animations", entry && entry.id);
      optionalReference(entry && entry.textId, path + ".textId", "texts", entry && entry.id);
    });
    array(project.abilities).forEach(function (entry, index) {
      var path = "abilities[" + index + "]";
      optionalReference(entry && entry.animationId, path + ".animationId", "animations", entry && entry.id);
      optionalReference(entry && entry.textId, path + ".textId", "texts", entry && entry.id);
    });

    array(eventGraph.nodes).forEach(function (entry, index) {
      referenceList(
        entry && entry.nextIds,
        "eventGraph.nodes[" + index + "].nextIds",
        "eventNodes",
        entry && entry.id
      );
    });
    referenceList(eventGraph.entryNodeIds, "eventGraph.entryNodeIds", "eventNodes", null);

    var gameFlow = object(project.gameFlow);
    optionalReference(gameFlow.introTextId, "gameFlow.introTextId", "texts", null);
    requiredReference(gameFlow.startingWorldId, "gameFlow.startingWorldId", "worlds", null);
    requiredReference(gameFlow.startingRoomId, "gameFlow.startingRoomId", "rooms", null);
    referenceList(gameFlow.startingHeroIds, "gameFlow.startingHeroIds", "heroes", null);
    referenceList(gameFlow.startingItemIds, "gameFlow.startingItemIds", "items", null);
    optionalReference(gameFlow.gameStartEventNodeId, "gameFlow.gameStartEventNodeId", "eventNodes", null);
    optionalReference(gameFlow.victoryEventNodeId, "gameFlow.victoryEventNodeId", "eventNodes", null);
    optionalReference(gameFlow.defeatEventNodeId, "gameFlow.defeatEventNodeId", "eventNodes", null);

    if (!array(gameFlow.startingHeroIds).length) {
      addError(
        "EMPTY_STARTING_PARTY",
        "gameFlow.startingHeroIds",
        null,
        "The game needs at least one living hero in its starting party.",
        "gameFlow.startingHeroIds must contain at least one hero ID."
      );
    }

    var startingCell = object(gameFlow.startingCell);
    if (!Number.isInteger(Number(startingCell.x)) ||
        Number(startingCell.x) < 0 || Number(startingCell.x) > 7) {
      addError(
        "INVALID_START_CELL_X",
        "gameFlow.startingCell.x",
        null,
        "The starting horizontal cell must be inside the 8 x 3 display.",
        "gameFlow.startingCell.x must be an integer from 0 through 7."
      );
    }
    if (!Number.isInteger(Number(startingCell.y)) ||
        Number(startingCell.y) < 0 || Number(startingCell.y) > 2) {
      addError(
        "INVALID_START_CELL_Y",
        "gameFlow.startingCell.y",
        null,
        "The starting vertical cell must be inside the 8 x 3 display.",
        "gameFlow.startingCell.y must be an integer from 0 through 2."
      );
    }

    var startRoom = array(project.rooms).find(function (room) {
      return room && room.id === gameFlow.startingRoomId;
    });
    if (startRoom && sectionWorld[startRoom.sectionId] &&
        sectionWorld[startRoom.sectionId] !== gameFlow.startingWorldId) {
      addError(
        "START_ROOM_WORLD_MISMATCH",
        "gameFlow.startingRoomId",
        gameFlow.startingRoomId,
        "The starting room is not inside the selected starting world.",
        "Room " + gameFlow.startingRoomId + " belongs to world " +
        sectionWorld[startRoom.sectionId] + ", not " + gameFlow.startingWorldId + "."
      );
    }

    if (project.hardwareProfileId !== OFFICIAL_HARDWARE_PROFILE_ID) {
      addError(
        "UNSUPPORTED_HARDWARE_PROFILE",
        "hardwareProfileId",
        null,
        "This beta supports only the official Arduino Nano wiring.",
        "hardwareProfileId must be " + OFFICIAL_HARDWARE_PROFILE_ID + "."
      );
    }

    var resourceReport = estimator && typeof estimator.estimateProject === "function" ?
      estimator.estimateProject(project, { finalExport: finalExport }) :
      null;

    if (!resourceReport) {
      addError(
        "RESOURCE_ESTIMATOR_UNAVAILABLE",
        "resourceEstimator",
        null,
        "Resource estimation is unavailable, so export safety cannot be checked.",
        "SevenSegResourceEstimator.estimateProject is required."
      );
    }

    var officialPins = resourceReport ? resourceReport.pins : [];
    var suppliedPins = Array.isArray(settings.pinAssignments) ?
      settings.pinAssignments :
      officialPins;
    var pinOwners = {};
    var ownerPins = {};
    suppliedPins.forEach(function (claim, index) {
      var pin = claim && claim.pin;
      var owner = claim && claim.owner;
      var path = "pinAssignments[" + index + "]";
      if (typeof pin !== "string" || typeof owner !== "string") {
        addError(
          "INVALID_PIN_ASSIGNMENT",
          path,
          null,
          "A hardware pin assignment is incomplete.",
          path + " must contain string pin and owner values."
        );
        return;
      }
      if (pinOwners[pin] && pinOwners[pin] !== owner) {
        addError(
          "PIN_CONFLICT",
          path + ".pin",
          null,
          "Pin " + pin + " is assigned to more than one hardware function.",
          pin + " is claimed by " + pinOwners[pin] + " and " + owner + "."
        );
      } else {
        pinOwners[pin] = owner;
      }
      if (ownerPins[owner] && ownerPins[owner] !== pin) {
        addError(
          "UNSUPPORTED_PIN_REMAP",
          path,
          null,
          owner + " has been moved away from the official wiring.",
          owner + " is assigned to both " + ownerPins[owner] + " and " + pin + "."
        );
      } else {
        ownerPins[owner] = pin;
      }
    });
    officialPins.forEach(function (claim) {
      if (!ownerPins[claim.owner]) {
        addError(
          "MISSING_OFFICIAL_PIN",
          "pinAssignments",
          null,
          claim.owner + " is missing from the generated hardware pin table.",
          claim.owner + " must use official pin " + claim.pin + "."
        );
      } else if (ownerPins[claim.owner] !== claim.pin) {
        addError(
          "UNSUPPORTED_PIN_REMAP",
          "pinAssignments",
          null,
          claim.owner + " has been moved away from the official wiring.",
          claim.owner + " must use " + claim.pin + ", not " + ownerPins[claim.owner] + "."
        );
      }
    });

    var suppliedTimers = Array.isArray(settings.timerAssignments) ?
      settings.timerAssignments :
      (resourceReport ? resourceReport.timers : []);
    var timerOwners = {};
    suppliedTimers.forEach(function (claim, index) {
      var timer = claim && claim.timer;
      var owner = claim && claim.owner;
      var path = "timerAssignments[" + index + "]";
      if (typeof timer !== "string" || typeof owner !== "string") return;
      if (timerOwners[timer] && timerOwners[timer] !== owner) {
        addError(
          "TIMER_CONFLICT",
          path + ".timer",
          null,
          "Timer " + timer + " is assigned to more than one system.",
          timer + " is claimed by " + timerOwners[timer] + " and " + owner + "."
        );
      } else {
        timerOwners[timer] = owner;
      }
      if (claim.status && String(claim.status).indexOf("unresolved") !== -1) {
        addWarning(
          "UNRESOLVED_TIMER_OWNER",
          path,
          null,
          timer + " ownership is not decided yet.",
          timer + " remains " + claim.status + " for " + owner + "."
        );
      }
    });
    if (resourceReport) {
      resourceReport.timers.forEach(function (claim) {
        if (claim.status === "fixed" && timerOwners[claim.timer] !== claim.owner) {
          addError(
            "FIXED_TIMER_REMAP",
            "timerAssignments",
            null,
            claim.timer + " cannot be reassigned because the Arduino core owns it.",
            claim.timer + " must remain owned by " + claim.owner + "."
          );
        }
      });
    }

    if (resourceReport) {
      var placements = {
        world: "PROGMEM"
      };
      Object.keys(object(settings.storageClassifications)).forEach(function (key) {
        placements[key] = settings.storageClassifications[key];
      });
      resourceReport.categories.forEach(function (entry) {
        if (entry.memory !== "flash" || entry.exactBytes < LARGE_TABLE_BYTES) return;
        if (placements[entry.id] !== "PROGMEM") {
          addError(
            "MISSING_PROGMEM_CLASSIFICATION",
            "storageClassifications." + entry.id,
            entry.id,
            entry.label + " is large and must be stored in program memory.",
            entry.id + " has " + entry.exactBytes +
            " immutable bytes but is not classified as PROGMEM."
          );
        }
      });
    }

    var nodeById = {};
    array(eventGraph.nodes).forEach(function (node) {
      if (node && typeof node.id === "string") nodeById[node.id] = node;
    });
    var reachable = {};
    var queue = array(eventGraph.entryNodeIds).slice();
    [
      gameFlow.gameStartEventNodeId,
      gameFlow.victoryEventNodeId,
      gameFlow.defeatEventNodeId
    ].forEach(function (nodeId) {
      if (nodeId && queue.indexOf(nodeId) === -1) {
        queue.push(nodeId);
      }
    });
    while (queue.length) {
      var nodeId = queue.shift();
      if (reachable[nodeId] || !nodeById[nodeId]) continue;
      reachable[nodeId] = true;
      array(nodeById[nodeId].nextIds).forEach(function (nextId) {
        if (!reachable[nextId]) queue.push(nextId);
      });
    }
    [
      ["gameFlow.gameStartEventNodeId", gameFlow.gameStartEventNodeId, "game-start"],
      ["gameFlow.victoryEventNodeId", gameFlow.victoryEventNodeId, "victory"],
      ["gameFlow.defeatEventNodeId", gameFlow.defeatEventNodeId, "defeat"]
    ].forEach(function (required) {
      if (required[1] && nodeById[required[1]] && !reachable[required[1]]) {
        addError(
          "UNREACHABLE_REQUIRED_EVENT",
          required[0],
          required[1],
          "The required " + required[2] + " event cannot be reached from an event entry point.",
          required[1] + " is not reachable from eventGraph.entryNodeIds."
        );
      }
    });

    var resourceWarnings = resourceReport ?
      resourceReport.warnings.map(function (entry) {
        return resourceFinding(entry, "warning");
      }) :
      [];
    var resourceBlockers = resourceReport ?
      resourceReport.blockers.map(function (entry) {
        return resourceFinding(entry, "error");
      }) :
      [];
    var blockers = errors.concat(resourceBlockers);
    var allWarnings = warnings.concat(resourceWarnings);

    return {
      reportVersion: 1,
      purpose: finalExport ? "final-export" : "planning",
      resourceReport: resourceReport,
      errors: errors,
      warnings: allWarnings,
      blockers: blockers,
      status: blockers.length ? "block" : (allWarnings.length ? "warning" : "pass"),
      summary: {
        structuralErrorCount: errors.length,
        structuralWarningCount: warnings.length,
        resourceBlockerCount: resourceBlockers.length,
        resourceWarningCount: resourceWarnings.length,
        blockerCount: blockers.length,
        warningCount: allWarnings.length
      }
    };
  }

  root.SevenSegPreflight = {
    OFFICIAL_HARDWARE_PROFILE_ID: OFFICIAL_HARDWARE_PROFILE_ID,
    LARGE_TABLE_BYTES: LARGE_TABLE_BYTES,
    run: runPreflight
  };
}(typeof window !== "undefined" ? window : this));

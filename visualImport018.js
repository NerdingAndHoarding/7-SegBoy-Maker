(function () {
  "use strict";

  var SPRITE_KEYS = ["1", "2", "3", "4", "Q", "W", "E", "R"];
  var visualAssets = null;
  var project = null;
  var statusHandler = function () {};
  var dirtyHandler = function () {};
  var refreshEditorsHandler = function () {};
  var controller = null;
  var root = null;
  var sourceInput = null;
  var sourceNameNode = null;
  var previewNode = null;
  var commitButton = null;
  var undoButton = null;
  var active = false;
  var sourceName = "Pasted 018 text";

  function replaceProjectContents(target, nextValue) {
    Object.getOwnPropertyNames(target).forEach(function (key) {
      delete target[key];
    });
    Object.keys(nextValue).forEach(function (key) {
      target[key] = nextValue[key];
    });
    if (window.SevenSegModel &&
        typeof window.SevenSegModel.attachV1CompatibilityToV2 === "function") {
      window.SevenSegModel.attachV1CompatibilityToV2(target);
    }
  }

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function byteHex(value) {
    return "0x" + Number(value).toString(16).toUpperCase().padStart(2, "0");
  }

  function translateLegacyByte(value) {
    return ((value >> 1) & 0x7F) | ((value & 1) << 7);
  }

  function sourceStem(value) {
    return String(value || "Imported 018")
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Imported 018";
  }

  function stableIdPart(value, fallback) {
    var result = String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 56);

    if (!result || !/^[a-z]/.test(result)) {
      result = String(fallback || "imported");
    }
    return result;
  }

  function parseByteToken(token) {
    var text = String(token || "").trim();
    var value;

    if (/^0x[0-9a-f]{1,2}$/i.test(text)) {
      value = parseInt(text.slice(2), 16);
    } else if (/^0b[01]{1,8}$/i.test(text)) {
      value = parseInt(text.slice(2), 2);
    } else if (/^[0-9]{1,3}$/.test(text)) {
      value = parseInt(text, 10);
    } else {
      return null;
    }

    return value >= 0 && value <= 255 ? value : null;
  }

  function parseCoordinateName(text) {
    var match = String(text || "").trim().match(/^([A-Za-z])\.(\d{2})$/);

    if (!match) return null;
    return {
      xLabel: match[1].toUpperCase(),
      y: parseInt(match[2], 10),
      key: match[1].toUpperCase() + "." + match[2]
    };
  }

  function parseCoordinateList(text) {
    var matches = String(text || "").match(/[A-Za-z]\.\d{2}/g) || [];

    return matches.map(parseCoordinateName).filter(Boolean);
  }

  function coordinateSort(a, b) {
    if (a.xLabel !== b.xLabel) return a.xLabel < b.xLabel ? -1 : 1;
    return a.y - b.y;
  }

  function translatedGlyph(baseName, baseId, legacyByte, sourceLabel) {
    return {
      type: "glyph",
      sourceName: sourceLabel,
      baseName: baseName,
      baseId: baseId,
      legacyByte: legacyByte,
      segmentByte: translateLegacyByte(legacyByte)
    };
  }

  function translatedFrame(baseName, baseId, legacyCells, sourceLabel) {
    return {
      type: "frame",
      sourceName: sourceLabel,
      baseName: baseName,
      baseId: baseId,
      legacyCells: legacyCells.slice(),
      cells: legacyCells.map(translateLegacyByte)
    };
  }

  function frameFromDigitRecords(records, label, idPart, result) {
    var cells = new Array(24);
    var seen = {};
    var valid = true;

    records.forEach(function (record) {
      if (record.index < 0 || record.index > 23) {
        result.errors.push(label + " uses Digit " + record.index + "; valid digits are 0-23.");
        valid = false;
        return;
      }
      if (seen[record.index]) {
        result.errors.push(label + " repeats Digit " + record.index + ".");
        valid = false;
        return;
      }
      seen[record.index] = true;
      cells[record.index] = record.value;
    });

    if (records.length !== 24 || cells.some(function (value) {
      return !Number.isInteger(value);
    })) {
      result.errors.push(label + " must define every Digit 0-23 exactly once.");
      valid = false;
    }

    if (valid) {
      result.frames.push(translatedFrame(
        label,
        "frame_018_" + stableIdPart(idPart, "frame"),
        cells,
        label
      ));
    }
  }

  function parseSource(text, inputSourceName) {
    var sourceText = String(text || "");
    var labelStem = sourceStem(inputSourceName);
    var result = {
      sourceName: String(inputSourceName || "Pasted 018 text"),
      glyphs: [],
      frames: [],
      regionCount: 0,
      unsupported: [],
      errors: [],
      collisions: []
    };
    var lines;
    var trimmed;
    var spriteMatches = [];
    var spriteSeen = {};
    var digitGroups = [];
    var looseDigits = [];
    var currentGroup = null;
    var hasFrameHeaders = false;
    var mapCoordinates = {};
    var regionDefinitions = {};
    var regionCoordinateOwners = {};
    var mapMatch;
    var mapPattern;

    if (!sourceText.trim()) {
      result.errors.push("No 018 text was provided.");
      return result;
    }

    trimmed = sourceText.trim();
    lines = sourceText.split(/\r?\n/);

    if (/^[01]{8}$/.test(trimmed)) {
      result.glyphs.push(translatedGlyph(
        labelStem,
        "glyph_018_" + stableIdPart(labelStem, "digit"),
        parseInt(trimmed, 2),
        labelStem
      ));
    }

    lines.forEach(function (line, lineIndex) {
      var regionMatch = line.match(/^\s*Region\s*:\s*(.+?)\s*$/i);
      var spriteMatch = line.match(
        /^\s*Sprite\s+([1234QWER])\s*:\s*([01]{8})(?:\s+0x([0-9A-Fa-f]{1,2}))?\s*$/i
      );
      var spritePrefix = line.match(/^\s*Sprite\s+([1234QWER])\b/i);
      var frameMatch = line.match(/^\s*Frame\s+(\d+)\s*$/i);
      var digitMatch = line.match(
        /^\s*Digit\s+(\d+)\s*:\s*([01]{8})(?:\s+0x([0-9A-Fa-f]{1,2}))?\s*$/i
      );
      var digitPrefix = line.match(/^\s*Digit\s+\S+/i);
      var binaryValue;
      var hexValue;

      if (regionMatch) result.regionCount += 1;

      if (spriteMatch) {
        binaryValue = parseInt(spriteMatch[2], 2);
        if (spriteMatch[3]) {
          hexValue = parseInt(spriteMatch[3], 16);
          if (hexValue !== binaryValue) {
            result.errors.push("Line " + (lineIndex + 1) + " has mismatched sprite binary and hex values.");
          }
        }
        spriteMatches.push({
          key: spriteMatch[1].toUpperCase(),
          value: binaryValue,
          line: lineIndex + 1
        });
      } else if (spritePrefix) {
        result.errors.push("Line " + (lineIndex + 1) + " is not a valid 018 sprite line.");
      }

      if (frameMatch) {
        hasFrameHeaders = true;
        if (currentGroup) digitGroups.push(currentGroup);
        currentGroup = {
          number: parseInt(frameMatch[1], 10),
          records: []
        };
        return;
      }

      if (digitMatch) {
        binaryValue = parseInt(digitMatch[2], 2);
        if (digitMatch[3]) {
          hexValue = parseInt(digitMatch[3], 16);
          if (hexValue !== binaryValue) {
            result.errors.push("Line " + (lineIndex + 1) + " has mismatched digit binary and hex values.");
          }
        }
        var record = {
          index: parseInt(digitMatch[1], 10),
          value: binaryValue
        };
        if (currentGroup) {
          currentGroup.records.push(record);
        } else {
          looseDigits.push(record);
        }
      } else if (digitPrefix) {
        result.errors.push("Line " + (lineIndex + 1) + " is not a valid 018 digit line.");
      }
    });

    lines.forEach(function (line, lineIndex) {
      var regionHeader = line.match(/^\s*Region:\s*(.+?)\s*$/i);
      var regionCoordinates = line.match(/^\s*coordinates(?:\s*\(\d+\))?\s*:\s*(.+?)\s*$/i);
      var coordinateList;
      var activeRegion;

      if (regionHeader) {
        activeRegion = regionHeader[1].trim();
        if (!regionDefinitions[activeRegion]) {
          regionDefinitions[activeRegion] = {
            name: activeRegion,
            coordinates: [],
            sourceLine: lineIndex + 1
          };
        }
        parseSource.lastRegionName = activeRegion;
        return;
      }

      if (regionCoordinates && parseSource.lastRegionName) {
        coordinateList = parseCoordinateList(regionCoordinates[1]).sort(coordinateSort);
        coordinateList.forEach(function (coordinate) {
          if (coordinate.xLabel < "A" || coordinate.xLabel > "Z" ||
              coordinate.y < 0 || coordinate.y > 31) {
            result.errors.push(
              "Region " + parseSource.lastRegionName + " contains out-of-range coordinate " +
              coordinate.key + "."
            );
            return;
          }
          if (regionCoordinateOwners[coordinate.key]) {
            result.errors.push(
              "Coordinate " + coordinate.key + " is listed in more than one region."
            );
            return;
          }
          regionCoordinateOwners[coordinate.key] = parseSource.lastRegionName;
          regionDefinitions[parseSource.lastRegionName].coordinates.push(coordinate.key);
        });
      }
    });
    parseSource.lastRegionName = null;

    if (currentGroup) digitGroups.push(currentGroup);

    if (spriteMatches.length) {
      spriteMatches.forEach(function (entry) {
        if (spriteSeen[entry.key]) {
          result.errors.push("Sprite " + entry.key + " is defined more than once.");
        }
        spriteSeen[entry.key] = entry;
      });

      SPRITE_KEYS.forEach(function (key) {
        var entry = spriteSeen[key];
        if (!entry) {
          result.errors.push("The eight-sprite set is missing Sprite " + key + ".");
          return;
        }
        result.glyphs.push(translatedGlyph(
          "Sprite " + key,
          "glyph_018_sprite_" + key.toLowerCase(),
          entry.value,
          "Sprite " + key
        ));
      });
    }

    if (hasFrameHeaders) {
      if (looseDigits.length) {
        result.errors.push("Digit lines before the first Frame header are ambiguous.");
      }
      digitGroups.forEach(function (group) {
        frameFromDigitRecords(
          group.records,
          "Frame " + group.number,
          labelStem + "_frame_" + group.number,
          result
        );
      });
    } else if (looseDigits.length) {
      frameFromDigitRecords(
        looseDigits,
        labelStem,
        labelStem,
        result
      );
    }

    mapPattern = /\{\s*'([A-Za-z])'\s*,\s*(\d{1,2})\s*,\s*\{([^{}]*)\}\s*\}/g;
    while ((mapMatch = mapPattern.exec(sourceText))) {
      var xLabel = mapMatch[1].toUpperCase();
      var yValue = parseInt(mapMatch[2], 10);
      var coordinate = xLabel + "." + String(yValue).padStart(2, "0");
      var tokens = mapMatch[3].split(",");
      var cells = [];
      var badToken = false;

      if (xLabel < "A" || xLabel > "Z" || yValue < 0 || yValue > 31) {
        result.errors.push("Map row " + coordinate + " is outside A.00-Z.31.");
        continue;
      }
      if (mapCoordinates[coordinate]) {
        result.errors.push("Map row " + coordinate + " is defined more than once.");
        continue;
      }
      mapCoordinates[coordinate] = true;

      tokens.forEach(function (token) {
        var value = parseByteToken(token);
        if (value === null) {
          badToken = true;
        } else {
          cells.push(value);
        }
      });

      if (badToken) {
        result.errors.push("Map row " + coordinate + " contains a value that is not a byte.");
      } else if (cells.length !== 24) {
        result.errors.push("Map row " + coordinate + " must contain exactly 24 byte values.");
      } else {
        result.rooms = result.rooms || [];
        result.rooms.push({
          coordinate: coordinate,
          xLabel: xLabel,
          y: yValue,
          sourceName: "Map row " + coordinate,
          cells: cells.map(translateLegacyByte),
          regionName: regionCoordinateOwners[coordinate] || null
        });
        result.frames.push(translatedFrame(
          "Room " + coordinate,
          "frame_018_room_" + xLabel.toLowerCase() + String(yValue).padStart(2, "0"),
          cells,
          "Map row " + coordinate
        ));
      }
    }

    result.sections = Object.keys(regionDefinitions).sort().map(function (name) {
      return {
        type: "section",
        sourceName: "Region " + name,
        baseName: name,
        baseId: "section_018_" + stableIdPart(name, "section"),
        coordinates: regionDefinitions[name].coordinates.slice().sort()
      };
    });

    if (result.sections.length) {
      var importedRoomKeys = {};

      (result.rooms || []).forEach(function (room) {
        importedRoomKeys[room.coordinate] = true;
      });
      Object.keys(regionCoordinateOwners).forEach(function (coordinate) {
        if (!importedRoomKeys[coordinate]) {
          result.errors.push("Region coordinate " + coordinate + " has no matching map row.");
        }
      });
      (result.rooms || []).forEach(function (room) {
        if (!room.regionName) {
          result.errors.push("Map row " + room.coordinate + " has no region assignment.");
        }
      });
    }

    if (result.regionCount && !result.sections.length) {
      result.unsupported.push(
        result.regionCount + " region record" + (result.regionCount === 1 ? "" : "s") +
        " recognized, but no importable coordinates were found."
      );
    }
    if (/CompressedRegion|compressedRegions\s*\[/i.test(sourceText)) {
      result.unsupported.push("Compressed-region records are recognized but are not imported.");
    }
    if (!result.glyphs.length && !result.frames.length && !result.errors.length) {
      result.unsupported.push("No supported 018 glyph or frame records were found.");
    }

    return result;
  }

  function collectProjectIds(targetProject) {
    var ids = {};

    function walk(value) {
      if (!value || typeof value !== "object") return;
      if (!Array.isArray(value) && typeof value.id === "string" && value.id) {
        ids[value.id] = true;
      }
      Object.keys(value).forEach(function (key) {
        if (key !== "legacyV1") walk(value[key]);
      });
    }

    walk(targetProject);
    return ids;
  }

  function collectNames(values) {
    var names = {};
    (Array.isArray(values) ? values : []).forEach(function (entry) {
      if (entry && typeof entry.name === "string") {
        names[entry.name.toLowerCase()] = true;
      }
    });
    return names;
  }

  function uniqueId(base, used) {
    var candidate = base;
    var suffix = 2;
    while (used[candidate]) {
      candidate = base + "_" + suffix;
      suffix += 1;
    }
    used[candidate] = true;
    return candidate;
  }

  function uniqueName(base, used) {
    var candidate = base;
    var suffix = 2;
    while (used[candidate.toLowerCase()]) {
      candidate = base + " (" + suffix + ")";
      suffix += 1;
    }
    used[candidate.toLowerCase()] = true;
    return candidate;
  }

  function planImport(parsed, targetProject) {
    var planned = cloneJson(parsed);
    var usedIds = collectProjectIds(targetProject);
    var glyphNames = collectNames(targetProject && targetProject.glyphs);
    var frameNames = collectNames(targetProject && targetProject.frames);
    var sectionNames = collectNames(targetProject && targetProject.sections);
    var previewIds = {};
    var previewGlyphNames = {};
    var previewFrameNames = {};
    var previewSectionNames = {};
    var existingSectionCount = Array.isArray(targetProject && targetProject.sections) ?
      targetProject.sections.length :
      0;

    planned.collisions = [];

    planned.glyphs.concat(planned.frames).forEach(function (entry) {
      var existingId = usedIds[entry.baseId] || previewIds[entry.baseId];
      var nameSet = entry.type === "glyph" ? glyphNames : frameNames;
      var previewNameSet = entry.type === "glyph" ? previewGlyphNames : previewFrameNames;
      var existingName = nameSet[entry.baseName.toLowerCase()] ||
        previewNameSet[entry.baseName.toLowerCase()];

      if (existingId) {
        planned.collisions.push(entry.baseId + " already exists; a unique ID will be used.");
      }
      if (existingName) {
        planned.collisions.push(entry.baseName + " already exists; a unique name will be used.");
      }

      entry.plannedId = uniqueId(entry.baseId, usedIds);
      entry.plannedName = uniqueName(entry.baseName, nameSet);
      previewIds[entry.baseId] = true;
      previewNameSet[entry.baseName.toLowerCase()] = true;
    });

    planned.sections = (planned.sections || []).map(function (entry) {
      var existingId = usedIds[entry.baseId] || previewIds[entry.baseId];
      var existingName = sectionNames[entry.baseName.toLowerCase()] ||
        previewSectionNames[entry.baseName.toLowerCase()];

      if (existingId) {
        planned.collisions.push(entry.baseId + " already exists; a unique section ID will be used.");
      }
      if (existingName) {
        planned.collisions.push(entry.baseName + " already exists; a unique section name will be used.");
      }

      entry.plannedId = uniqueId(entry.baseId, usedIds);
      entry.plannedName = uniqueName(entry.baseName, sectionNames);
      previewIds[entry.baseId] = true;
      previewSectionNames[entry.baseName.toLowerCase()] = true;
      return entry;
    });

    planned.rooms = (planned.rooms || []).map(function (entry) {
      entry.coordinateKey = entry.coordinate;
      return entry;
    });

    if (existingSectionCount + planned.sections.length > 9) {
      planned.errors.push("Import would exceed the 9-section limit.");
    }

    return planned;
  }

  function createImportController(targetProject, options) {
    var settings = options || {};
    var assets = settings.visualAssets || window.SevenSegVisualAssets;
    var model = settings.model || window.SevenSegModel || null;
    var currentPreview = null;
    var undoStack = [];

    if (!targetProject || typeof targetProject !== "object") {
      throw new Error("A project is required for 018 import.");
    }
    if (!assets || typeof assets.createGlyph !== "function" ||
        typeof assets.createFrame !== "function") {
      throw new Error("Shared visual asset helpers are required for 018 import.");
    }

    function snapshot() {
      return cloneJson(targetProject);
    }

    function restore(state) {
      replaceProjectContents(targetProject, cloneJson(state));
    }

    function importedRoomFrame(cells) {
      return cells.map(function (value) {
        return Number(value) ? "." : " ";
      }).join("").slice(0, 24).padEnd(24, " ");
    }

    function syncSectionRoomIds() {
      targetProject.sections.forEach(function (section) {
        section.roomIds = targetProject.rooms.filter(function (room) {
          return room.sectionId === section.id;
        }).map(function (room) {
          return room.id;
        });
      });
    }

    function applyPlannedWorldImport(plan) {
      var world = Array.isArray(targetProject.worlds) && targetProject.worlds.length ?
        targetProject.worlds[0] :
        null;
      var defaultSection = Array.isArray(targetProject.sections) && targetProject.sections.length ?
        targetProject.sections[0] :
        null;
      var sectionIdByName = {};
      var maxX = 0;
      var maxY = 0;

      if (!world || !defaultSection) return;

      plan.sections.forEach(function (entry) {
        var section = {
          id: entry.plannedId,
          worldId: world.id,
          name: entry.plannedName,
          kind: "biome",
          roomIds: [],
          coordinateKeys: entry.coordinates.slice(),
          palette: cloneJson(defaultSection.palette),
          dataVersion: 1,
          data: {}
        };

        targetProject.sections.push(section);
        world.sectionIds.push(section.id);
        sectionIdByName[entry.baseName] = section.id;
      });

      plan.rooms.forEach(function (entry) {
        var x = entry.xLabel.charCodeAt(0) - 65;
        var room = targetProject.rooms.filter(function (candidate) {
          return Number(candidate.x) === x && Number(candidate.y) === entry.y;
        })[0] || null;
        var sectionId = entry.regionName && sectionIdByName[entry.regionName] ?
          sectionIdByName[entry.regionName] :
          world.defaultSectionId;

        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, entry.y);

        if (!room) {
          room = {
            id: null,
            sectionId: sectionId,
            x: x,
            y: entry.y,
            roomType: "raw",
            frameId: null,
            interactionIds: [],
            encounterGroupIds: [],
            musicId: null,
            dataVersion: 1,
            data: {}
          };
          targetProject.rooms.push(room);
        }

        room.sectionId = sectionId;
        room.roomType = "raw";
        room.frameId = null;
        room.visual = {
          encoding: "segment-bytes-v1",
          cells: entry.cells.slice()
        };
        room.data = room.data || {};
        room.data.pocV1Frame = importedRoomFrame(entry.cells);
        room.frame = room.data.pocV1Frame;
      });

      world.width = Math.max(Number(world.width) || 1, maxX + 1);
      world.height = Math.max(Number(world.height) || 1, maxY + 1);
      syncSectionRoomIds();
      if (model &&
          typeof model.detectProjectVersion === "function" &&
          model.detectProjectVersion(targetProject) === 2 &&
          typeof model.prepareV2ProjectForValidation === "function" &&
          typeof model.validateProjectV2 === "function") {
        var prepared = model.prepareV2ProjectForValidation(targetProject);
        var validation = model.validateProjectV2(prepared);

        if (validation.errors.length) {
          throw new Error(validation.errors.join(" "));
        }
        replaceProjectContents(targetProject, validation.project);
      } else {
        replaceProjectContents(targetProject, targetProject);
      }
    }

    return {
      preview: function (text, inputSourceName) {
        currentPreview = planImport(parseSource(text, inputSourceName), targetProject);
        return cloneJson(currentPreview);
      },
      getPreview: function () {
        return currentPreview ? cloneJson(currentPreview) : null;
      },
      cancel: function () {
        currentPreview = null;
      },
      commit: function () {
        var plan;
        var before;
        var importedGlyphs = [];
        var importedFrames = [];
        var importedSections = [];
        var importedRooms = [];

        if (!currentPreview) {
          return { ok: false, reason: "Preview the source before committing." };
        }
        if (currentPreview.errors.length) {
          return { ok: false, reason: "Fix the preview errors before committing." };
        }
        if (!currentPreview.glyphs.length && !currentPreview.frames.length) {
          return { ok: false, reason: "The preview contains no supported assets." };
        }

        plan = planImport(currentPreview, targetProject);
        before = snapshot();
        if (!Array.isArray(targetProject.glyphs)) targetProject.glyphs = [];
        if (!Array.isArray(targetProject.frames)) targetProject.frames = [];

        plan.glyphs.forEach(function (entry) {
          var glyph = assets.createGlyph(entry.plannedId, entry.plannedName, entry.segmentByte);
          glyph.editor.notes = "Imported from 018: " + entry.sourceName;
          targetProject.glyphs.push(glyph);
          importedGlyphs.push(cloneJson(glyph));
        });

        plan.frames.forEach(function (entry) {
          var frame = assets.createFrame(
            entry.plannedId,
            entry.plannedName,
            assets.SEGMENT_BYTES_ENCODING
          );
          frame.cells = entry.cells.slice();
          frame.editor.notes = "Imported from 018: " + entry.sourceName;
          targetProject.frames.push(frame);
          importedFrames.push(cloneJson(frame));
        });

        importedSections = plan.sections.map(function (entry) {
          return {
            id: entry.plannedId,
            name: entry.plannedName,
            coordinates: entry.coordinates.slice()
          };
        });
        importedRooms = plan.rooms.map(function (entry) {
          return {
            coordinate: entry.coordinate,
            regionName: entry.regionName,
            cells: entry.cells.slice()
          };
        });

        try {
          applyPlannedWorldImport(plan);
        } catch (error) {
          restore(before);
          return {
            ok: false,
            reason: error && error.message ? error.message : String(error)
          };
        }

        undoStack.push(before);
        if (undoStack.length > 20) undoStack.shift();
        currentPreview = null;

        return {
          ok: true,
          glyphs: importedGlyphs,
          frames: importedFrames,
          sections: importedSections,
          rooms: importedRooms
        };
      },
      undo: function () {
        var previous = undoStack.pop();
        if (!previous) return false;
        restore(previous);
        currentPreview = null;
        return true;
      },
      canUndo: function () {
        return undoStack.length > 0;
      },
      refresh: function () {
        currentPreview = null;
        undoStack = [];
      }
    };
  }

  function element(tagName, className, text) {
    var node = document.createElement(tagName);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function renderMessageList(parent, title, values, className) {
    var section;
    var heading;
    var list;

    if (!values.length) return;
    section = element("section", "importMessageBlock " + className);
    heading = element("h3", "", title);
    list = element("ul");
    values.forEach(function (message) {
      list.appendChild(element("li", "", message));
    });
    section.appendChild(heading);
    section.appendChild(list);
    parent.appendChild(section);
  }

  function frameByteSummary(entry) {
    return entry.legacyCells.map(function (value, index) {
      return index + ":" + byteHex(value) + "->" + byteHex(entry.cells[index]);
    }).join("  ");
  }

  function renderPreview() {
    var preview = controller ? controller.getPreview() : null;

    previewNode.textContent = "";
    commitButton.disabled = true;
    undoButton.disabled = !(controller && controller.canUndo());

    if (!preview) {
      previewNode.appendChild(element(
        "p",
        "importEmpty",
        "Choose or paste an 018 TXT export, then preview it."
      ));
      return;
    }

    var summary = element("div", "importSummary");
    [
      ["Glyphs", preview.glyphs.length],
      ["Frames", preview.frames.length],
      ["Sections", (preview.sections || []).length],
      ["Rooms", (preview.rooms || []).length],
      ["Regions skipped", preview.regionCount],
      ["Errors", preview.errors.length]
    ].forEach(function (item) {
      var box = element("div");
      box.appendChild(element("span", "", item[0]));
      box.appendChild(element("strong", "", String(item[1])));
      summary.appendChild(box);
    });
    previewNode.appendChild(summary);

    preview.glyphs.forEach(function (entry) {
      var row = element("div", "importAssetRow");
      row.appendChild(element("strong", "", entry.plannedName));
      row.appendChild(element("code", "", entry.plannedId));
      row.appendChild(element(
        "span",
        "",
        byteHex(entry.legacyByte) + " -> " + byteHex(entry.segmentByte)
      ));
      previewNode.appendChild(row);
    });

    preview.frames.forEach(function (entry) {
      var row = element("div", "importAssetRow importFrameRow");
      row.appendChild(element("strong", "", entry.plannedName));
      row.appendChild(element("code", "", entry.plannedId));
      row.appendChild(element("span", "", "24 translated cells"));
      row.appendChild(element("code", "importByteList", frameByteSummary(entry)));
      previewNode.appendChild(row);
    });

    (preview.sections || []).forEach(function (entry) {
      var row = element("div", "importAssetRow");
      row.appendChild(element("strong", "", "Section " + entry.plannedName));
      row.appendChild(element("code", "", entry.plannedId));
      row.appendChild(element("span", "", entry.coordinates.length + " coordinates"));
      previewNode.appendChild(row);
    });

    (preview.rooms || []).forEach(function (entry) {
      var row = element("div", "importAssetRow");
      row.appendChild(element("strong", "", "Room " + entry.coordinate));
      row.appendChild(element("span", "", entry.regionName || "default section"));
      row.appendChild(element("span", "", "24 raw segment bytes"));
      previewNode.appendChild(row);
    });

    renderMessageList(previewNode, "Collisions", preview.collisions, "importCollision");
    renderMessageList(previewNode, "Not imported", preview.unsupported, "importUnsupported");
    renderMessageList(previewNode, "Errors", preview.errors, "importErrors");

    commitButton.disabled = preview.errors.length > 0 ||
      (!preview.glyphs.length && !preview.frames.length);
  }

  function buildUi() {
    var fileInput = element("input");
    var fileButton = element("button", "", "Choose 018 TXT");
    var previewButton = element("button", "", "Preview");
    var cancelButton = element("button", "secondaryButton", "Cancel");
    var controls = element("div", "importControls");
    var sourceRow = element("div", "importSourceRow");

    root.textContent = "";
    fileInput.type = "file";
    fileInput.accept = "text/plain,.txt,.ino,.h,.cpp";
    fileInput.hidden = true;

    sourceNameNode = element("strong", "importSourceName", sourceName);
    sourceInput = element("textarea", "importSourceInput");
    sourceInput.rows = 9;
    sourceInput.spellcheck = false;
    sourceInput.setAttribute("aria-label", "018 source text");

    commitButton = element("button", "", "Commit import");
    undoButton = element("button", "secondaryButton", "Undo import");
    previewNode = element("div", "importPreview");

    sourceRow.appendChild(fileButton);
    sourceRow.appendChild(sourceNameNode);
    controls.appendChild(previewButton);
    controls.appendChild(cancelButton);
    controls.appendChild(commitButton);
    controls.appendChild(undoButton);
    root.appendChild(fileInput);
    root.appendChild(sourceRow);
    root.appendChild(sourceInput);
    root.appendChild(controls);
    root.appendChild(previewNode);

    root.addEventListener("focusin", function () {
      active = true;
    });
    document.addEventListener("pointerdown", function (event) {
      active = root.contains(event.target);
    });

    fileButton.addEventListener("click", function () {
      fileInput.click();
    });
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      sourceName = file.name;
      sourceNameNode.textContent = sourceName;
      file.text().then(function (text) {
        sourceInput.value = text;
        controller.cancel();
        renderPreview();
        statusHandler("Loaded " + sourceName + " for preview. The project is unchanged.");
      }).catch(function () {
        statusHandler("The selected source file could not be read.");
      });
      fileInput.value = "";
    });

    previewButton.addEventListener("click", function () {
      var preview = controller.preview(sourceInput.value, sourceName);
      renderPreview();
      statusHandler(
        "Preview found " + preview.glyphs.length + " glyphs, " +
        preview.frames.length + " frames, and " + preview.errors.length + " errors."
      );
    });

    cancelButton.addEventListener("click", function () {
      controller.cancel();
      renderPreview();
      statusHandler("018 import preview cancelled. The project is unchanged.");
    });

    commitButton.addEventListener("click", function () {
      var result = controller.commit();
      if (!result.ok) {
        statusHandler(result.reason);
        renderPreview();
        return;
      }
      dirtyHandler();
      refreshEditorsHandler();
      renderPreview();
      statusHandler(
        "Imported " + result.glyphs.length + " glyphs, " +
        result.frames.length + " frames, " +
        result.sections.length + " sections, and " +
        result.rooms.length + " rooms. Ctrl+Z can undo this import."
      );
    });

    undoButton.addEventListener("click", function () {
      undo();
    });

    renderPreview();
  }

  function init(options) {
    var settings = options || {};

    project = settings.project;
    visualAssets = settings.visualAssets || window.SevenSegVisualAssets;
    statusHandler = typeof settings.setStatus === "function" ?
      settings.setStatus :
      function () {};
    dirtyHandler = typeof settings.markDirty === "function" ?
      settings.markDirty :
      function () {};
    refreshEditorsHandler = typeof settings.refreshEditors === "function" ?
      settings.refreshEditors :
      function () {};
    root = document.getElementById("visualImport018");
    if (!root) return;

    controller = createImportController(project, {
      visualAssets: visualAssets
    });
    buildUi();
  }

  function refresh() {
    if (!controller || !root) return;
    controller.refresh();
    sourceName = "Pasted 018 text";
    sourceInput.value = "";
    sourceNameNode.textContent = sourceName;
    active = false;
    renderPreview();
  }

  function undo() {
    if (!controller || !controller.undo()) {
      statusHandler("There is no committed 018 import to undo.");
      renderPreview();
      return false;
    }
    dirtyHandler();
    refreshEditorsHandler();
    renderPreview();
    statusHandler("The last 018 import was undone.");
    return true;
  }

  function isActive() {
    return active;
  }

  window.SevenSegVisualImport018 = {
    translateLegacyByte: translateLegacyByte,
    parseSource: parseSource,
    planImport: planImport,
    createImportController: createImportController,
    init: init,
    refresh: refresh,
    undo: undo,
    isActive: isActive
  };
}());

(function () {
  "use strict";

  var selectedTool = null;
  var project = null;
  var model = null;
  var displayEditor = null;
  var compression = null;
  var roomDisplay = null;
  var statusHandler = null;
  var markDirtyHandler = null;
  var activeRoomX = 0;
  var activeRoomY = 0;
  var activeWorldId = null;
  var activeSectionId = null;
  var undoStack = [];
  var MAX_UNDO = 20;
  var selectedPaletteIndex = 0;

  function setStatus(message) {
    if (statusHandler) {
      statusHandler(message);
    }
  }

  function markDirty() {
    if (markDirtyHandler) markDirtyHandler();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function activeWorld() {
    var worlds = Array.isArray(project.worlds) ? project.worlds : [];
    var world = worlds.filter(function (entry) {
      return entry.id === activeWorldId;
    })[0] || worlds[0] || null;

    if (world) activeWorldId = world.id;
    return world;
  }

  function sectionsForActiveWorld() {
    var world = activeWorld();
    if (!world) return [];

    return project.sections.filter(function (section) {
      return section.worldId === world.id &&
        world.sectionIds.indexOf(section.id) !== -1;
    }).sort(function (a, b) {
      return world.sectionIds.indexOf(a.id) - world.sectionIds.indexOf(b.id);
    });
  }

  function activeSection() {
    var sections = sectionsForActiveWorld();
    var section = sections.filter(function (entry) {
      return entry.id === activeSectionId;
    })[0] || sections[0] || null;

    if (section) activeSectionId = section.id;
    return section;
  }

  function snapshotWorldData(label) {
    return {
      label: label,
      worlds: clone(project.worlds),
      sections: clone(project.sections),
      rooms: clone(project.rooms),
      frames: clone(project.frames),
      gameFlow: clone(project.gameFlow)
    };
  }

  function pushUndo(snapshot) {
    undoStack.push(snapshot);
    if (undoStack.length > MAX_UNDO) undoStack.shift();
  }

  function restoreWorldData(snapshot) {
    project.worlds = clone(snapshot.worlds);
    project.sections = clone(snapshot.sections);
    project.rooms = clone(snapshot.rooms);
    project.frames = clone(snapshot.frames);
    project.gameFlow = clone(snapshot.gameFlow);
    model.attachV1CompatibilityToV2(project);
  }

  function stableSectionId() {
    var used = {};
    var number = 2;

    project.sections.forEach(function (section) {
      used[section.id] = true;
    });
    while (used["section_" + number]) number += 1;
    return "section_" + number;
  }

  function syncSectionRoomIds() {
    project.sections.forEach(function (section) {
      section.roomIds = project.rooms.filter(function (room) {
        return room.sectionId === section.id;
      }).map(function (room) {
        return room.id;
      });
    });
  }

  function glyphById(id) {
    return project.glyphs.filter(function (glyph) {
      return glyph.id === id;
    })[0] || null;
  }

  function paletteOwnerSections() {
    var world = activeWorld();
    return world && world.paletteMode === "global" ?
      sectionsForActiveWorld() :
      [activeSection()].filter(Boolean);
  }

  function activePalette() {
    var section = activeSection();
    return section && section.palette ? section.palette : null;
  }

  function paletteForRoom(room) {
    var section;

    if (!room) return null;
    section = project.sections.filter(function (entry) {
      return entry.id === room.sectionId;
    })[0] || null;
    return section && section.palette ? section.palette : null;
  }

  function paletteCapacity() {
    var palette = activePalette();
    return palette ? Math.pow(2, Number(palette.bitsPerCell) || 3) : 8;
  }

  function roomVisualCells(room) {
    if (!room || room.implicit || !room.visual ||
        !Array.isArray(room.visual.cells) ||
        room.visual.cells.length !== model.DISPLAY_CELLS) {
      return new Array(model.DISPLAY_CELLS).fill(0);
    }
    return room.visual.cells.slice();
  }

  function glyphBlocks(glyph) {
    return Boolean(glyph && Array.isArray(glyph.tags) &&
      glyph.tags.indexOf("blocking") !== -1);
  }

  function resolvedRoomBytes(room) {
    var cells = roomVisualCells(room);
    var palette = paletteForRoom(room) || activePalette();

    if (room && room.roomType === "raw") return cells;
    if (!room || room.roomType === "empty" || !palette) {
      return new Array(model.DISPLAY_CELLS).fill(0);
    }

    return cells.map(function (paletteIndex) {
      var glyphId = palette.glyphIds[paletteIndex];
      var glyph = glyphById(glyphId);
      return glyph ? glyph.segmentByte : 0;
    });
  }

  function syncCompatibilityFrame(room) {
    var palette = paletteForRoom(room) || activePalette();

    if (!room || room.implicit) return;
    if (room.roomType === "empty") {
      room.frame = model.normalizeFrame24("");
      return;
    }
    if (room.roomType === "raw") {
      room.frame = roomVisualCells(room).map(function (value) {
        return value ? "." : " ";
      }).join("");
      return;
    }

    room.frame = roomVisualCells(room).map(function (paletteIndex) {
      var glyph = palette ? glyphById(palette.glyphIds[paletteIndex]) : null;
      if (glyphBlocks(glyph)) return "#";
      return glyph && glyph.segmentByte ? "." : " ";
    }).join("");
  }

  function startCellIndexForActiveRoom() {
    var start = project.start;

    if (!start || start.roomX !== activeRoomX || start.roomY !== activeRoomY) {
      return -1;
    }
    return model.cellIndex(start.playerX, start.playerY);
  }

  function paletteCellBlocks(room, cellIndex) {
    var palette = paletteForRoom(room) || activePalette();
    var cells = roomVisualCells(room);
    var glyph = palette ? glyphById(palette.glyphIds[cells[cellIndex]]) : null;
    return glyphBlocks(glyph);
  }

  function syncCompatibilityFramesForSections(sectionIds) {
    project.rooms.forEach(function (room) {
      if (sectionIds.indexOf(room.sectionId) !== -1 &&
          room.visual &&
          room.visual.encoding === "palette-indexes-v1") {
        syncCompatibilityFrame(room);
      }
    });
  }

  function paletteRoomPayloadBytes(room) {
    var palette = paletteForRoom(room);

    if (!room || room.roomType === "empty") return 0;
    if (room.roomType === "raw") return compression.rawRoomByteCount();
    if ((room.roomType === "normal" || room.roomType === "special") && palette) {
      return compression.paletteRoomByteCount(palette.bitsPerCell);
    }
    return 0;
  }

  function validateWorldEditorData() {
    var error = "";

    sectionsForActiveWorld().some(function (section) {
      var palette = section.palette;
      var capacity = palette ? Math.pow(2, Number(palette.bitsPerCell)) : 0;

      if (!palette || [1, 2, 3, 4].indexOf(Number(palette.bitsPerCell)) === -1) {
        error = (section.name || section.id) + " has an invalid palette bit width.";
        return true;
      }
      if (palette.glyphIds.length > capacity) {
        error = (section.name || section.id) + " needs more than " +
          capacity + " palette slots.";
        return true;
      }
      if (palette.glyphIds.some(function (glyphId) {
        return !glyphById(glyphId);
      })) {
        error = (section.name || section.id) +
          " refers to a glyph that is not in the project.";
        return true;
      }

      return project.rooms.some(function (room) {
        if (room.sectionId !== section.id ||
            (room.roomType !== "normal" && room.roomType !== "special") ||
            !room.visual || room.visual.encoding !== "palette-indexes-v1") {
          return false;
        }
        if (!Array.isArray(room.visual.cells) ||
            room.visual.cells.length !== model.DISPLAY_CELLS) {
          error = activeRoomLabel() + " must contain exactly 24 palette cells.";
          return true;
        }
        if (room.visual.cells.some(function (value) {
          return !Number.isInteger(value) || value < 0 ||
            value >= capacity || value >= palette.glyphIds.length;
        })) {
          error = "A room in " + (section.name || section.id) +
            " uses a palette slot that does not exist.";
          return true;
        }
        return false;
      });
    });

    if (!error && project.start) {
      var startRoom = model.findRoom(
        project,
        project.start.roomX,
        project.start.roomY
      );
      var startIndex = model.cellIndex(
        project.start.playerX,
        project.start.playerY
      );

      if (startRoom && paletteCellBlocks(startRoom, startIndex)) {
        error = "Start position must be on a non-blocking cell.";
      }
    }

    if (error) {
      setStatus(error);
      return false;
    }
    return true;
  }

  function replaceProjectContents(nextProject) {
    Object.getOwnPropertyNames(project).forEach(function (key) {
      delete project[key];
    });

    Object.keys(nextProject).forEach(function (key) {
      project[key] = nextProject[key];
    });
    model.attachV1CompatibilityToV2(project);
    activeWorld();
    activeSection();
  }

  function normalizeSchemaV2RoomChanges(width, height) {
    var world;
    var prepared;
    var validation;

    if (model.detectProjectVersion(project) !== 2) {
      return true;
    }

    world = activeWorld();
    if (world) {
      world.width = Math.max(1, Math.min(model.WORLD_WIDTH_MAX, Number(width) || 1));
      world.height = Math.max(1, Math.min(model.WORLD_HEIGHT_MAX, Number(height) || 1));
    }

    prepared = model.prepareV2ProjectForValidation(project);
    validation = model.validateProjectV2(prepared);
    if (validation.errors.length) {
      setStatus("Could not update map data: " + validation.errors.join(" "));
      return false;
    }

    replaceProjectContents(validation.project);
    return true;
  }

  function activeRoom() {
    var room = model.findRoom(project, activeRoomX, activeRoomY);

    if (!room) {
      var world = activeWorld();
      var section = world ? model.resolveSectionForCoordinate(
        project,
        world.id,
        activeRoomX,
        activeRoomY
      ) : null;
      return {
        id: null,
        sectionId: section && !section.overlap ? section.id : null,
        x: activeRoomX,
        y: activeRoomY,
        roomType: "empty",
        visual: {
          encoding: "empty-v1",
          cells: []
        },
        frame: model.normalizeFrame24(""),
        implicit: true
      };
    }

    return room;
  }

  function ensureActiveRoom() {
    var room = model.findRoom(project, activeRoomX, activeRoomY);
    var world = activeWorld();
    var section;

    if (room) return room;

    section = world ? model.resolveSectionForCoordinate(
      project,
      world.id,
      activeRoomX,
      activeRoomY
    ) : null;
    room = {
      id: null,
      sectionId: section && !section.overlap ? section.id : null,
      x: activeRoomX,
      y: activeRoomY,
      roomType: "empty",
      frameId: null,
      visual: {
        encoding: "empty-v1",
        cells: []
      },
      interactionIds: [],
      encounterGroupIds: [],
      musicId: null,
      dataVersion: 1,
      data: {
        pocV1Frame: model.normalizeFrame24("")
      },
      frame: model.normalizeFrame24("")
    };
    project.rooms.push(room);
    return room;
  }

  function activeRoomLabel() {
    return model.worldCoordinateKey(activeRoomX, activeRoomY) ||
      (model.roomXLabel(activeRoomX).toUpperCase() + "." +
        String(activeRoomY).padStart(2, "0"));
  }

  function uniqueFrameChars() {
    var used = {};
    var glyphs = [];

    for (var i = 0; i < project.rooms.length; i += 1) {
      var frame = model.normalizeFrame24(project.rooms[i].frame || "");

      for (var index = 0; index < model.DISPLAY_CELLS; index += 1) {
        var c = frame.charAt(index);

        if (!used[c]) {
          used[c] = true;
          glyphs.push(c === " " ? "space" : c);
        }
      }
    }

    return glyphs;
  }

  function renderCompressionEstimate() {
    var estimate = document.getElementById("worldmapCompressionEstimate");
    var world = activeWorld();

    if (!estimate || !world) {
      return;
    }

    var width = Number(world.width);
    var height = Number(world.height);

    var roomCount = width * height;
    var roomBytes = roomCount * 9;
    var paletteBytes = 9;
    var totalBytes = roomBytes + paletteBytes;
    var glyphs = uniqueFrameChars();
    var glyphText = glyphs.length ? glyphs.join(", ") : "space";
    var warning = glyphs.length > 8 ? " Too many glyphs for one global 8-glyph set." : "";

    estimate.textContent = "Dense 3-bit PROGMEM estimate: " +
      width + " x " + height + " = " + roomCount + " rooms x 9 bytes = " + roomBytes +
      " bytes, plus about " + paletteBytes +
      " bytes global palette/flags. Total about " + totalBytes +
      " bytes. Glyphs used: " + glyphText + " (" + glyphs.length + "/8)." +
      warning;
  }

  function renderGrid() {
    var room = activeRoom();
    var container = document.getElementById("worldRoomDisplayEditor");
    var startIndex = startCellIndexForActiveRoom();

    if (!roomDisplay) return;
    roomDisplay.setFrame(resolvedRoomBytes(room));
    roomDisplay.setReadOnly(room.roomType !== "raw");
    container.querySelectorAll(".segmentEditorCell").forEach(function (cell, index) {
      cell.classList.toggle("hasPlayerStart", index === startIndex);
    });
  }

  function renderSectionControls() {
    var world = activeWorld();
    var sections = sectionsForActiveWorld();
    var select = document.getElementById("worldSectionSelect");
    var resolved = world ?
      model.resolveSectionForCoordinate(
        project,
        world.id,
        activeRoomX,
        activeRoomY
      ) :
      null;

    select.innerHTML = "";
    sections.forEach(function (section, index) {
      var option = document.createElement("option");
      option.value = section.id;
      option.textContent = (index + 1) + ". " + (section.name || section.id);
      select.appendChild(option);
    });
    select.value = activeSectionId || "";

    document.getElementById("worldAreaTypeSelect").value =
      world ? world.areaType : "worldmap";
    document.getElementById("deleteSectionButton").disabled =
      sections.length <= 1;
    document.getElementById("randomizeSectionsButton").disabled =
      sections.length <= 1;
    document.getElementById("assignSelectedSectionButton").disabled =
      sections.length <= 1;
    document.getElementById("createSectionButton").disabled =
      sections.length >= model.WORLD_SECTION_MAX;
    document.getElementById("undoWorldButton").disabled =
      undoStack.length === 0;
    document.getElementById("worldSelectionSummary").textContent =
      activeRoomLabel() + " - " +
      (resolved && !resolved.overlap ? (resolved.name || resolved.id) : "No section") +
      (roomExists(activeRoomX, activeRoomY) ? " - explicit room" : " - implicit empty");
  }

  function renderRoomProperties() {
    var room = activeRoom();
    var world = activeWorld();
    var palette = activePalette();
    var glyphSelect = document.getElementById("worldGlyphSelect");
    var slots = document.getElementById("worldPaletteSlots");
    var behavior = document.getElementById("worldGlyphBehavior");
    var section = activeSection();
    var capacity = paletteCapacity();
    var roomBytes;
    var roomRecordBytes;
    var paletteBytes = 0;
    var sectionRoomBytes = 0;
    var sectionCoordinateBytes = 0;
    var selectedGlyph;

    selectedPaletteIndex = Math.max(
      0,
      Math.min(selectedPaletteIndex, capacity - 1)
    );
    selectedGlyph = palette ?
      glyphById(palette.glyphIds[selectedPaletteIndex]) :
      null;

    document.getElementById("worldRoomTypeSelect").value =
      room.implicit ? "empty" : (room.roomType || "empty");
    document.getElementById("worldPaletteModeSelect").value =
      world ? world.paletteMode : "global";
    document.getElementById("worldPaletteBitsSelect").value =
      palette ? String(palette.bitsPerCell) : "3";
    document.getElementById("worldRoomSavePointInput").checked =
      Boolean(room && room.data && room.data.savePoint === true);

    glyphSelect.innerHTML = "";
    project.glyphs.forEach(function (glyph) {
      var option = document.createElement("option");
      option.value = glyph.id;
      option.textContent = glyph.name + " (0x" +
        glyph.segmentByte.toString(16).toUpperCase().padStart(2, "0") + ")";
      glyphSelect.appendChild(option);
    });

    slots.innerHTML = "";
    for (var index = 0; index < capacity; index += 1) {
      var button = document.createElement("button");
      var glyph = palette ? glyphById(palette.glyphIds[index]) : null;

      button.type = "button";
      button.className = "worldPaletteSlot";
      button.dataset.paletteIndex = String(index);
      button.classList.toggle("isSelected", index === selectedPaletteIndex);
      button.classList.toggle("isBlocking", glyphBlocks(glyph));
      var slotNumber = document.createElement("code");
      var slotName = document.createElement("span");
      var slotByte = document.createElement("span");

      slotNumber.textContent = String(index);
      slotName.textContent = glyph ? glyph.name : "Empty";
      slotByte.textContent = glyph ?
        "0x" + glyph.segmentByte.toString(16).toUpperCase().padStart(2, "0") :
        "-";
      button.appendChild(slotNumber);
      button.appendChild(slotName);
      button.appendChild(slotByte);
      slots.appendChild(button);
    }

    behavior.textContent = selectedGlyph ?
      selectedGlyph.name + ": " +
        (glyphBlocks(selectedGlyph) ? "blocking" : "non-blocking") +
        ", visual byte 0x" +
        selectedGlyph.segmentByte.toString(16).toUpperCase().padStart(2, "0") :
      "No palette glyph selected.";

    roomBytes = room.implicit ? 0 : paletteRoomPayloadBytes(room);
    roomRecordBytes = roomBytes ?
      roomBytes + 3 :
      0;
    if (palette) paletteBytes = compression.paletteStorageByteCount(palette.glyphIds.length);
    if (section) {
      project.rooms.forEach(function (entry) {
        if (entry.sectionId === section.id) {
          var payload = paletteRoomPayloadBytes(entry);
          if (payload) sectionRoomBytes += payload + 3;
        }
      });
      sectionCoordinateBytes = compression.sparseSectionMembershipByteCount(
        section.coordinateKeys.length
      );
    }
    document.getElementById("worldRoomStorageEstimate").textContent =
      "Room payload: " + roomBytes + " bytes; sparse room record: " +
      roomRecordBytes + " bytes. Active section: " + sectionRoomBytes +
      " room bytes + " + paletteBytes + " palette bytes + " +
      sectionCoordinateBytes + " coordinate bytes = " +
      (sectionRoomBytes + paletteBytes + sectionCoordinateBytes) + " bytes.";

    document.getElementById("removeWorldPaletteGlyphButton").disabled =
      !selectedGlyph;
    document.getElementById("addWorldPaletteGlyphButton").disabled =
      !project.glyphs.length || !palette ||
      palette.glyphIds.length >= capacity;
  }

  function renderAll() {
    renderSectionControls();
    renderRoomProperties();
    renderRoomMap();
    renderGrid();
    renderCompressionEstimate();
  }

  function notifySavePanelChanged() {
    if (window.SevenSegEmulator &&
        typeof window.SevenSegEmulator.refreshSavePanel === "function") {
      window.SevenSegEmulator.refreshSavePanel();
    }
  }

  function isStartCellIndex(index) {
    var room = activeRoom();
    var start = project.start;

    return start &&
      room.x === start.roomX &&
      room.y === start.roomY &&
      index === model.cellIndex(start.playerX, start.playerY);
  }

  function commitRoomCommand(label, mutate) {
    var world = activeWorld();
    var before = snapshotWorldData(label);
    var hadRoom = Boolean(model.findRoom(project, activeRoomX, activeRoomY));
    var room = ensureActiveRoom();

    if (!world || !room || mutate(room) === false) {
      restoreWorldData(before);
      return false;
    }
    syncSectionRoomIds();
    if (!validateWorldEditorData() ||
        !normalizeSchemaV2RoomChanges(world.width, world.height)) {
      restoreWorldData(before);
      return false;
    }

    pushUndo(before);
    markDirty();
    renderRoomProperties();
    renderGrid();
    renderCompressionEstimate();
    notifySavePanelChanged();
    if (!hadRoom) {
      renderRoomMap();
    }
    return true;
  }

  function setRoomVisual(room, roomType, cells) {
    room.roomType = roomType;
    if (roomType === "empty") {
      room.visual = { encoding: "empty-v1", cells: [] };
    } else if (roomType === "raw") {
      room.visual = {
        encoding: "segment-bytes-v1",
        cells: cells.slice(0, model.DISPLAY_CELLS)
      };
    } else {
      room.visual = {
        encoding: "palette-indexes-v1",
        cells: cells.slice(0, model.DISPLAY_CELLS)
      };
    }
    syncCompatibilityFrame(room);
  }

  function firstNonBlockingPaletteIndex(palette) {
    if (!palette) return -1;
    for (var index = 0; index < palette.glyphIds.length; index += 1) {
      if (!glyphBlocks(glyphById(palette.glyphIds[index]))) return index;
    }
    return -1;
  }

  function setStartCell(index) {
    var room = activeRoom();

    if (room.roomType !== "raw" && room.roomType !== "empty" &&
        paletteCellBlocks(room, index)) {
      setStatus("Start position must be on a non-blocking cell.");
      return false;
    }

    if (commitRoomCommand("Set start position", function (explicitRoom) {
      var xy = model.xyFromIndex(index);

      project.start.roomX = explicitRoom.x;
      project.start.roomY = explicitRoom.y;
      project.start.playerX = xy.x;
      project.start.playerY = xy.y;
      return true;
    })) {
      setStatus('Start position moved. Player "1" is preview only.');
      return true;
    }
    return false;
  }

  function paintPaletteCell(index) {
    var room = activeRoom();
    var palette = activePalette();
    var glyph;

    if (!palette || room.roomType === "empty" || room.roomType === "raw") {
      setStatus("Choose Normal or Special room type before palette painting.");
      return false;
    }
    glyph = glyphById(palette.glyphIds[selectedPaletteIndex]);
    if (!glyph) {
      setStatus("Select a populated palette slot before painting.");
      return false;
    }
    if (glyphBlocks(glyph) && isStartCellIndex(index)) {
      setStatus("Start position must be on a non-blocking cell.");
      return false;
    }

    if (commitRoomCommand("Paint room cell", function (explicitRoom) {
      var cells = roomVisualCells(explicitRoom);
      if (cells[index] === selectedPaletteIndex) return false;
      cells[index] = selectedPaletteIndex;
      setRoomVisual(explicitRoom, explicitRoom.roomType, cells);
      return true;
    })) {
      setStatus("Painted palette slot " + selectedPaletteIndex + " in " +
        activeRoomLabel() + ".");
      return true;
    }
    return false;
  }

  function changeRoomType() {
    var nextType = document.getElementById("worldRoomTypeSelect").value;
    var room = activeRoom();
    var palette = activePalette();
    var nextCells;

    if (!room.implicit && room.roomType === nextType) return;
    if ((nextType === "normal" || nextType === "special") &&
        (!palette || !palette.glyphIds.length)) {
      setStatus("Add at least one project glyph to the active palette first.");
      renderRoomProperties();
      return;
    }

    if (commitRoomCommand("Change room type", function (explicitRoom) {
      if (nextType === "raw") {
        nextCells = resolvedRoomBytes(room);
      } else if (nextType === "normal" || nextType === "special") {
        nextCells = room.roomType === "normal" || room.roomType === "special" ?
          roomVisualCells(room) :
          new Array(model.DISPLAY_CELLS).fill(
            firstNonBlockingPaletteIndex(palette) >= 0 ?
              firstNonBlockingPaletteIndex(palette) :
              0
          );
      } else {
        nextCells = [];
      }
      setRoomVisual(explicitRoom, nextType, nextCells);
      return true;
    })) {
      setStatus("Room " + activeRoomLabel() + " type set to " + nextType + ".");
    }
  }

  function changeRoomSavePoint() {
    var shouldSavePoint = document.getElementById("worldRoomSavePointInput").checked;

    if (commitRoomCommand("Change room save point", function (explicitRoom) {
      if (!explicitRoom.data || typeof explicitRoom.data !== "object" ||
          Array.isArray(explicitRoom.data)) {
        explicitRoom.data = {};
      }
      if (Boolean(explicitRoom.data.savePoint) === shouldSavePoint) {
        return false;
      }
      explicitRoom.data.savePoint = shouldSavePoint;
      return true;
    })) {
      setStatus(
        "Room " + activeRoomLabel() +
        (shouldSavePoint ? " marked as a save point." : " no longer marked as a save point.")
      );
    }
  }

  function setRawRoomFrame(nextFrame) {
    var room = activeRoom();

    if (room.roomType !== "raw") return;
    if (commitRoomCommand("Edit raw room segments", function (explicitRoom) {
      setRoomVisual(explicitRoom, "raw", nextFrame);
      return true;
    })) {
      setStatus("Saved exact raw segment bytes for " + activeRoomLabel() + ".");
    }
  }

  function clearRoom() {
    var room = activeRoom();
    var palette = activePalette();
    var fillIndex;

    if (room.roomType === "empty") {
      setStatus("The active room is already empty.");
      return;
    }
    fillIndex = firstNonBlockingPaletteIndex(palette);
    if (room.roomType !== "raw" && fillIndex < 0) {
      setStatus("Clear needs at least one non-blocking glyph in the palette.");
      return;
    }

    if (commitRoomCommand("Clear room", function (explicitRoom) {
      setRoomVisual(
        explicitRoom,
        explicitRoom.roomType,
        new Array(model.DISPLAY_CELLS).fill(
          explicitRoom.roomType === "raw" ? 0 : fillIndex
        )
      );
      return true;
    })) {
      setStatus("Cleared room " + activeRoomLabel() + ".");
    }
  }

  function randomizeRoom() {
    var room = activeRoom();
    var palette = activePalette();
    var nonBlocking = firstNonBlockingPaletteIndex(palette);
    var startIndex = startCellIndexForActiveRoom();

    if (room.roomType === "empty") {
      setStatus("Choose Normal, Special, or Raw before randomizing.");
      return;
    }
    if (room.roomType !== "raw" && (!palette || !palette.glyphIds.length)) {
      setStatus("Add palette glyphs before randomizing this room.");
      return;
    }
    if (room.roomType !== "raw" && startIndex >= 0 && nonBlocking < 0) {
      setStatus("Randomize needs a non-blocking glyph for the start cell.");
      return;
    }

    if (commitRoomCommand("Randomize room", function (explicitRoom) {
      var cells = new Array(model.DISPLAY_CELLS).fill(0).map(function () {
        return explicitRoom.roomType === "raw" ?
          Math.floor(Math.random() * 256) :
          Math.floor(Math.random() * palette.glyphIds.length);
      });

      if (startIndex >= 0 && explicitRoom.roomType !== "raw") {
        cells[startIndex] = nonBlocking;
      }
      setRoomVisual(explicitRoom, explicitRoom.roomType, cells);
      return true;
    })) {
      setStatus("Randomized room " + activeRoomLabel() + ".");
    }
  }

  function commitPaletteCommand(label, mutate) {
    var world = activeWorld();
    var before = snapshotWorldData(label);
    var owners = paletteOwnerSections();
    var ownerIds = owners.map(function (section) {
      return section.id;
    });

    if (!world || !owners.length || mutate(world, owners) === false) {
      restoreWorldData(before);
      return false;
    }
    syncCompatibilityFramesForSections(ownerIds);
    if (!validateWorldEditorData() ||
        !normalizeSchemaV2RoomChanges(world.width, world.height)) {
      restoreWorldData(before);
      return false;
    }

    pushUndo(before);
    markDirty();
    renderAll();
    notifySavePanelChanged();
    return true;
  }

  function changePaletteMode() {
    var nextMode = document.getElementById("worldPaletteModeSelect").value;
    var world = activeWorld();
    var source = clone(activePalette());
    var before = snapshotWorldData("Change palette ownership");

    if (!world || world.paletteMode === nextMode) return;
    world.paletteMode = nextMode;
    if (nextMode === "global") {
      sectionsForActiveWorld().forEach(function (section) {
        section.palette = clone(source);
        section.palette.mode = "global";
      });
    } else {
      sectionsForActiveWorld().forEach(function (section) {
        section.palette.mode = "section";
      });
    }
    syncCompatibilityFramesForSections(sectionsForActiveWorld().map(function (section) {
      return section.id;
    }));

    if (!validateWorldEditorData() ||
        !normalizeSchemaV2RoomChanges(world.width, world.height)) {
      restoreWorldData(before);
      renderAll();
      return;
    }
    pushUndo(before);
    markDirty();
    renderAll();
    setStatus("Palette ownership set to " + nextMode + ".");
  }

  function changePaletteBits() {
    var nextBits = Number(
      document.getElementById("worldPaletteBitsSelect").value
    );
    var capacity = Math.pow(2, nextBits);
    var owners = paletteOwnerSections();
    var ownerIds = owners.map(function (section) {
      return section.id;
    });
    var offending = owners.some(function (section) {
      if (section.palette.glyphIds.length > capacity) return true;
      return project.rooms.some(function (room) {
        return ownerIds.indexOf(room.sectionId) !== -1 &&
          room.visual &&
          room.visual.encoding === "palette-indexes-v1" &&
          room.visual.cells.some(function (value) {
            return value >= capacity;
          });
      });
    });

    if (offending) {
      setStatus(nextBits + "-bit mode is too small for the current palette or room cells.");
      renderRoomProperties();
      return;
    }

    if (commitPaletteCommand("Change palette bit width", function (world, sections) {
      var changed = false;
      sections.forEach(function (section) {
        if (Number(section.palette.bitsPerCell) !== nextBits) changed = true;
        section.palette.bitsPerCell = nextBits;
      });
      return changed;
    })) {
      setStatus("Palette width set to " + nextBits + " bits per cell.");
    }
  }

  function addPaletteGlyph() {
    var glyphId = document.getElementById("worldGlyphSelect").value;
    var palette = activePalette();
    var capacity = paletteCapacity();

    if (!glyphById(glyphId)) {
      setStatus("Choose a project glyph to add.");
      return;
    }
    if (palette.glyphIds.indexOf(glyphId) !== -1) {
      selectedPaletteIndex = palette.glyphIds.indexOf(glyphId);
      renderRoomProperties();
      setStatus("That glyph is already in the active palette.");
      return;
    }
    if (palette.glyphIds.length >= capacity) {
      setStatus("The active palette is full for its selected bit width.");
      return;
    }

    if (commitPaletteCommand("Add palette glyph", function (world, sections) {
      sections.forEach(function (section) {
        section.palette.glyphIds.push(glyphId);
      });
      return true;
    })) {
      selectedPaletteIndex = activePalette().glyphIds.length - 1;
      renderAll();
      setStatus("Added glyph to palette slot " + selectedPaletteIndex + ".");
    }
  }

  function removePaletteGlyph() {
    var palette = activePalette();
    var owners = paletteOwnerSections();
    var ownerIds = owners.map(function (section) {
      return section.id;
    });

    if (!palette || !glyphById(palette.glyphIds[selectedPaletteIndex])) {
      setStatus("Select a populated palette slot to remove.");
      return;
    }
    if (project.rooms.some(function (room) {
      return ownerIds.indexOf(room.sectionId) !== -1 &&
        room.visual &&
        room.visual.encoding === "palette-indexes-v1" &&
        room.visual.cells.indexOf(selectedPaletteIndex) !== -1;
    })) {
      setStatus("That palette slot is still used by a room and cannot be removed.");
      return;
    }

    if (commitPaletteCommand("Remove palette glyph", function (world, sections) {
      sections.forEach(function (section) {
        section.palette.glyphIds.splice(selectedPaletteIndex, 1);
      });
      project.rooms.forEach(function (room) {
        if (ownerIds.indexOf(room.sectionId) === -1 ||
            !room.visual ||
            room.visual.encoding !== "palette-indexes-v1") {
          return;
        }
        room.visual.cells = room.visual.cells.map(function (value) {
          return value > selectedPaletteIndex ? value - 1 : value;
        });
      });
      return true;
    })) {
      selectedPaletteIndex = Math.max(
        0,
        Math.min(selectedPaletteIndex, activePalette().glyphIds.length - 1)
      );
      renderAll();
      setStatus("Removed the unused palette glyph.");
    }
  }

  function selectPaletteSlot(index) {
    selectedPaletteIndex = index;
    selectedTool = null;
    document.querySelectorAll("[data-editor-tool]").forEach(function (button) {
      button.classList.remove("activeTool");
    });
    renderRoomProperties();
    setStatus("Selected palette slot " + index + ".");
  }

  function roomExists(x, y) {
    return Boolean(model.findRoom(project, x, y));
  }

  function renderRoomMap() {
    var grid = document.getElementById("roomMapGrid");
    var world = activeWorld();
    var sections = sectionsForActiveWorld();

    grid.innerHTML = "";
    if (!world) return;
    grid.style.setProperty("--world-cols", String(world.width));

    for (var y = 0; y < world.height; y += 1) {
      for (var x = 0; x < world.width; x += 1) {
        var button = document.createElement("button");
        var hasRoom = roomExists(x, y);
        var section = model.resolveSectionForCoordinate(project, world.id, x, y);
        var sectionIndex = section ? sections.indexOf(section) : 0;

        button.type = "button";
        button.className = "roomMapCell sectionTone" + Math.max(0, sectionIndex);
        button.dataset.x = String(x);
        button.dataset.y = String(y);
        button.dataset.sectionId = section ? section.id : "";
        button.title = model.worldCoordinateKey(x, y) + " - " +
          (section ? (section.name || section.id) : "No section");
        button.textContent = model.worldCoordinateKey(x, y);

        button.classList.toggle("hasRoom", hasRoom);
        button.classList.toggle(
          "activeSectionCell",
          Boolean(section && section.id === activeSectionId)
        );
        button.classList.toggle("activeRoomCell", x === activeRoomX && y === activeRoomY);
        grid.appendChild(button);
      }
    }
  }

  function selectRoom(x, y) {
    var world = activeWorld();
    var section;

    if (!world || x < 0 || y < 0 || x >= world.width || y >= world.height) return;

    activeRoomX = x;
    activeRoomY = y;
    section = model.resolveSectionForCoordinate(project, world.id, x, y);
    if (section && !section.overlap) activeSectionId = section.id;
    document.getElementById("roomXSelect").value = String(x);
    document.getElementById("roomYInput").value = String(y);
    setStatus(
      "Selected " + activeRoomLabel() +
      (roomExists(x, y) ? "." : " as an implicit empty room.")
    );
    renderAll();
  }

  function createOrSelectRoom() {
    var x = Number(document.getElementById("roomXSelect").value);
    var yInput = document.getElementById("roomYInput");
    var y = Math.max(model.ROOM_Y_MIN, Math.min(model.ROOM_Y_MAX, Number(yInput.value) || 0));
    var world = activeWorld();
    var resolved;
    var oldWidth = world ? world.width : 1;
    var oldHeight = world ? world.height : 1;

    yInput.value = String(y);

    if (roomExists(x, y)) {
      setStatus("please select other coordinates");
      selectRoom(x, y);
      return;
    }

    var width = Math.max(1, x + 1);
    var height = Math.max(1, y + 1);
    if (world) {
      width = Math.max(width, Number(world.width) || 1);
      height = Math.max(height, Number(world.height) || 1);
      world.width = width;
      world.height = height;
    }
    resolved = world ?
      model.resolveSectionForCoordinate(project, world.id, x, y) :
      null;
    project.rooms.push({
      sectionId: resolved && !resolved.overlap ? resolved.id : null,
      x: x,
      y: y,
      frame: model.normalizeFrame24("")
    });
    if (!normalizeSchemaV2RoomChanges(width, height)) {
      project.rooms.pop();
      if (world) {
        world.width = oldWidth;
        world.height = oldHeight;
      }
      return;
    }

    activeRoomX = x;
    activeRoomY = y;
    markDirty();
    setStatus("Created room " + activeRoomLabel() + ".");
    renderAll();
  }

  function generatedFrame(randomWalls, roomX, roomY) {
    var chars = [];

    for (var index = 0; index < model.DISPLAY_CELLS; index += 1) {
      var xy = model.xyFromIndex(index);
      var isStart = roomX === 0 && roomY === 0 && xy.x === 0 && xy.y === 0;
      var canBeWall = xy.x > 0 && xy.x < model.DISPLAY_COLS - 1 && xy.y > 0 && xy.y < model.DISPLAY_ROWS - 1;

      if (!isStart && randomWalls && canBeWall && Math.random() < 0.18) {
        chars.push("#");
      } else {
        chars.push(" ");
      }
    }

    return chars.join("");
  }

  function generatedRoomFromFrame(world, x, y, frame) {
    var resolved = model.resolveSectionForCoordinate(
      project,
      world.id,
      x,
      y
    );

    return {
      sectionId: resolved && !resolved.overlap ? resolved.id : null,
      x: x,
      y: y,
      frame: frame
    };
  }

  function explicitRoomForCoordinate(x, y) {
    return project.rooms.filter(function (room) {
      return Number(room.x) === Number(x) && Number(room.y) === Number(y);
    })[0] || null;
  }

  function sectionCoordinates(section, world) {
    var keys = [];

    if (!section || !world) return keys;
    for (var y = 0; y < world.height; y += 1) {
      for (var x = 0; x < world.width; x += 1) {
        var resolved = model.resolveSectionForCoordinate(project, world.id, x, y);
        if (resolved && !resolved.overlap && resolved.id === section.id) {
          keys.push({ x: x, y: y, key: model.worldCoordinateKey(x, y) });
        }
      }
    }
    return keys;
  }

  function normalRoomWithPalette(sectionId, x, y, fillIndex) {
    return {
      id: null,
      sectionId: sectionId,
      x: x,
      y: y,
      roomType: "normal",
      frameId: null,
      visual: {
        encoding: "palette-indexes-v1",
        cells: new Array(model.DISPLAY_CELLS).fill(fillIndex)
      },
      interactionIds: [],
      encounterGroupIds: [],
      musicId: null,
      dataVersion: 1,
      data: {
        pocV1Frame: model.normalizeFrame24("")
      },
      frame: model.normalizeFrame24("")
    };
  }

  function generateMap() {
    var widthInput = document.getElementById("mapWidthInput");
    var heightInput = document.getElementById("mapHeightInput");
    var randomWalls = document.getElementById("mapRandomWallsInput").checked;
    var width = Math.max(1, Math.min(model.ROOM_X_COUNT, Number(widthInput.value) || 1));
    var maxHeight = model.ROOM_Y_MAX - model.ROOM_Y_MIN + 1;
    var height = Math.max(1, Math.min(maxHeight, Number(heightInput.value) || 1));
    var rooms = [];
    var before = snapshotWorldData("Generate map");
    var world = activeWorld();

    widthInput.value = String(width);
    heightInput.value = String(height);
    world.width = width;
    world.height = height;
    sectionsForActiveWorld().forEach(function (section) {
      section.coordinateKeys = section.coordinateKeys.filter(function (key) {
        var coordinate = model.parseWorldCoordinateKey(key);
        return coordinate &&
          coordinate.x < width &&
          coordinate.y < height;
      });
    });

    rooms.push(generatedRoomFromFrame(
      world,
      0,
      0,
      model.normalizeFrame24("")
    ));

    if (randomWalls) {
      for (var y = 0; y < height; y += 1) {
        for (var x = 0; x < width; x += 1) {
          var frame = generatedFrame(randomWalls, x, y);

          if ((x !== 0 || y !== 0) && frame.indexOf("#") !== -1) {
            rooms.push(generatedRoomFromFrame(world, x, y, frame));
          }
        }
      }
    }

    project.rooms = rooms;
    project.start.roomX = 0;
    project.start.roomY = 0;
    project.start.playerX = 0;
    project.start.playerY = 0;
    if (!normalizeSchemaV2RoomChanges(width, height)) {
      restoreWorldData(before);
      return;
    }
    pushUndo(before);
    markDirty();
    activeRoomX = 0;
    activeRoomY = 0;
    document.getElementById("roomXSelect").value = "0";
    document.getElementById("roomYInput").value = "0";
    renderAll();

    if (window.SevenSegEmulator && window.SevenSegEmulator.reset) {
      window.SevenSegEmulator.reset();
    }

    setStatus("Generated " + width + " x " + height + " room map" +
      (randomWalls ? " with sparse random # rooms." : " with implicit empty rooms.") +
      " Dense 3-bit estimate is shown above the map.");
  }

  function randomizeSectionRooms() {
    var world = activeWorld();
    var section = activeSection();
    var palette = activePalette();
    var nonBlocking = firstNonBlockingPaletteIndex(palette);
    var coordinates = sectionCoordinates(section, world);
    var roomCount = 0;

    if (!world || !section || !palette || !palette.glyphIds.length) {
      setStatus("Add palette glyphs before randomizing section rooms.");
      return;
    }
    if (nonBlocking < 0) {
      setStatus("Section randomize needs at least one non-blocking palette glyph.");
      return;
    }

    if (commitSectionCommand("Randomize section rooms", function () {
      coordinates.forEach(function (entry) {
        var room = explicitRoomForCoordinate(entry.x, entry.y);
        var startHere = project.start &&
          project.start.roomX === entry.x &&
          project.start.roomY === entry.y;
        var cells;

        if (!room) {
          room = normalRoomWithPalette(section.id, entry.x, entry.y, nonBlocking);
          project.rooms.push(room);
        } else if (room.roomType === "raw") {
          return;
        } else if (room.roomType === "empty") {
          room.roomType = "normal";
          room.visual = {
            encoding: "palette-indexes-v1",
            cells: new Array(model.DISPLAY_CELLS).fill(nonBlocking)
          };
        } else if (!room.visual || room.visual.encoding !== "palette-indexes-v1") {
          room.visual = {
            encoding: "palette-indexes-v1",
            cells: new Array(model.DISPLAY_CELLS).fill(nonBlocking)
          };
        }

        cells = new Array(model.DISPLAY_CELLS).fill(0).map(function () {
          return Math.floor(Math.random() * palette.glyphIds.length);
        });
        if (startHere) {
          cells[model.cellIndex(project.start.playerX, project.start.playerY)] = nonBlocking;
        }
        room.sectionId = section.id;
        setRoomVisual(room, room.roomType === "special" ? "special" : "normal", cells);
        roomCount += 1;
      });

      return roomCount > 0;
    })) {
      setStatus("Randomized " + roomCount + " room" + (roomCount === 1 ? "" : "s") +
        " in " + (section.name || section.id) + ".");
    }
  }

  function commitSectionCommand(label, mutate) {
    var world = activeWorld();
    var before = snapshotWorldData(label);

    if (!world || mutate(world) === false) return false;
    syncSectionRoomIds();
    if (!normalizeSchemaV2RoomChanges(world.width, world.height)) {
      restoreWorldData(before);
      return false;
    }

    pushUndo(before);
    markDirty();
    renderAll();
    notifySavePanelChanged();
    return true;
  }

  function createSection() {
    var sections = sectionsForActiveWorld();

    if (sections.length >= model.WORLD_SECTION_MAX) {
      setStatus("A world can contain at most 9 sections.");
      return;
    }

    if (commitSectionCommand("Create section", function (world) {
      var sourcePalette = activeSection() && activeSection().palette ?
        activeSection().palette :
        { mode: world.paletteMode, bitsPerCell: 3, glyphIds: [] };
      var id = stableSectionId();

      project.sections.push({
        id: id,
        worldId: world.id,
        name: "Section " + (sections.length + 1),
        kind: "biome",
        roomIds: [],
        coordinateKeys: [],
        palette: clone(sourcePalette),
        dataVersion: 1,
        data: {}
      });
      world.sectionIds.push(id);
      activeSectionId = id;
    })) {
      setStatus("Created " + (activeSection() ? activeSection().name : "section") + ".");
    }
  }

  function deleteSection() {
    var world = activeWorld();
    var section = activeSection();
    var remaining;

    if (!world || !section || world.sectionIds.length <= 1) {
      setStatus("The world must keep at least one section.");
      return;
    }

    if (commitSectionCommand("Delete section", function () {
      remaining = world.sectionIds.filter(function (id) {
        return id !== section.id;
      });
      var targetId = remaining[0];

      project.rooms.forEach(function (room) {
        if (room.sectionId === section.id) room.sectionId = targetId;
      });
      project.sections = project.sections.filter(function (entry) {
        return entry.id !== section.id;
      });
      world.sectionIds = remaining;
      if (world.defaultSectionId === section.id) {
        world.defaultSectionId = targetId;
      }
      activeSectionId = targetId;
    })) {
      setStatus("Deleted section and reassigned its explicit rooms.");
    }
  }

  function randomizeSections() {
    var sections = sectionsForActiveWorld();

    if (sections.length <= 1) {
      setStatus("Create another section before randomizing assignments.");
      return;
    }

    if (commitSectionCommand("Randomize section assignments", function (world) {
      sections.forEach(function (section) {
        section.coordinateKeys = [];
      });

      for (var y = 0; y < world.height; y += 1) {
        for (var x = 0; x < world.width; x += 1) {
          var sectionIndex = Math.floor(Math.random() * sections.length);
          if (sections[sectionIndex].id !== world.defaultSectionId) {
            sections[sectionIndex].coordinateKeys.push(
              model.worldCoordinateKey(x, y)
            );
          }
        }
      }

      project.rooms.forEach(function (room) {
        var resolved = model.resolveSectionForCoordinate(
          project,
          world.id,
          room.x,
          room.y
        );
        if (resolved && !resolved.overlap) room.sectionId = resolved.id;
      });
    })) {
      setStatus("Randomized section assignments.");
    }
  }

  function assignSelectedCoordinateToSection() {
    var world = activeWorld();
    var section = activeSection();
    var key = model.worldCoordinateKey(activeRoomX, activeRoomY);

    if (!world || !section || !key) return;

    if (commitSectionCommand("Assign selected coordinate to section", function () {
      var changed = false;

      sectionsForActiveWorld().forEach(function (entry) {
        var beforeLength = entry.coordinateKeys.length;

        entry.coordinateKeys = entry.coordinateKeys.filter(function (entryKey) {
          return entryKey !== key;
        });
        if (entry.coordinateKeys.length !== beforeLength) changed = true;
      });

      if (section.id !== world.defaultSectionId) {
        section.coordinateKeys.push(key);
        changed = true;
      }

      project.rooms.forEach(function (room) {
        if (Number(room.x) === activeRoomX && Number(room.y) === activeRoomY &&
            room.sectionId !== section.id) {
          room.sectionId = section.id;
          changed = true;
        }
      });

      return changed;
    })) {
      setStatus("Assigned " + key + " to " + (section.name || section.id) + ".");
    }
  }

  function changeAreaType() {
    var value = document.getElementById("worldAreaTypeSelect").value;

    if (commitSectionCommand("Change area type", function (world) {
      if (world.areaType === value) return false;
      world.areaType = value;
    })) {
      setStatus("Area type set to " + value + ".");
    }
  }

  function undoWorldCommand() {
    var snapshot = undoStack.pop();

    if (!snapshot) {
      setStatus("Nothing to undo in the world editor.");
      return false;
    }

    restoreWorldData(snapshot);
    activeWorldId = activeWorld() ? activeWorld().id : null;
    activeSectionId = activeSection() ? activeSection().id : null;
    markDirty();
    renderAll();
    notifySavePanelChanged();
    setStatus("Undid " + snapshot.label + ".");
    return true;
  }

  function connectRoomControls() {
    var select = document.getElementById("roomXSelect");

    for (var x = 0; x < model.ROOM_X_COUNT; x += 1) {
      var option = document.createElement("option");
      option.value = String(x);
      option.textContent = model.roomXLabel(x);
      select.appendChild(option);
    }

    select.value = String(activeRoomX);
    document.getElementById("roomYInput").value = String(activeRoomY);
    document.getElementById("createRoomButton").addEventListener("click", createOrSelectRoom);
    document.getElementById("generateMapButton").addEventListener("click", generateMap);
    document.getElementById("randomizeSectionRoomsButton").addEventListener(
      "click",
      randomizeSectionRooms
    );

    document.getElementById("roomMapGrid").addEventListener("click", function (event) {
      var cell = event.target.closest(".roomMapCell");

      if (!cell) return;

      selectRoom(Number(cell.dataset.x), Number(cell.dataset.y));
    });
  }

  function connectSectionControls() {
    document.getElementById("worldAreaTypeSelect").addEventListener(
      "change",
      changeAreaType
    );
    document.getElementById("worldSectionSelect").addEventListener(
      "change",
      function (event) {
        activeSectionId = event.target.value;
        renderAll();
      }
    );
    document.getElementById("createSectionButton").addEventListener(
      "click",
      createSection
    );
    document.getElementById("deleteSectionButton").addEventListener(
      "click",
      deleteSection
    );
    document.getElementById("assignSelectedSectionButton").addEventListener(
      "click",
      assignSelectedCoordinateToSection
    );
    document.getElementById("randomizeSectionsButton").addEventListener(
      "click",
      randomizeSections
    );
    document.getElementById("undoWorldButton").addEventListener(
      "click",
      undoWorldCommand
    );
  }

  function connectDisplay() {
    roomDisplay = displayEditor.create(
      document.getElementById("worldRoomDisplayEditor"),
      {
        label: "Active world room, 8 columns by 3 rows",
        frame: new Array(model.DISPLAY_CELLS).fill(0),
        readOnly: true,
        onChange: function (nextFrame) {
          setRawRoomFrame(nextFrame);
        },
        onSelect: function (index) {
          var room = activeRoom();

          if (selectedTool === "start") {
            setStartCell(index);
          } else if (room.roomType === "normal" ||
              room.roomType === "special") {
            paintPaletteCell(index);
          }
        }
      }
    );
  }

  function connectRoomPropertyControls() {
    document.getElementById("worldRoomTypeSelect").addEventListener(
      "change",
      changeRoomType
    );
    document.getElementById("worldPaletteModeSelect").addEventListener(
      "change",
      changePaletteMode
    );
    document.getElementById("worldPaletteBitsSelect").addEventListener(
      "change",
      changePaletteBits
    );
    document.getElementById("worldRoomSavePointInput").addEventListener(
      "change",
      changeRoomSavePoint
    );
    document.getElementById("addWorldPaletteGlyphButton").addEventListener(
      "click",
      addPaletteGlyph
    );
    document.getElementById("removeWorldPaletteGlyphButton").addEventListener(
      "click",
      removePaletteGlyph
    );
    document.getElementById("clearWorldRoomButton").addEventListener(
      "click",
      clearRoom
    );
    document.getElementById("randomizeWorldRoomButton").addEventListener(
      "click",
      randomizeRoom
    );
    document.getElementById("worldPaletteSlots").addEventListener(
      "click",
      function (event) {
        var slot = event.target.closest(".worldPaletteSlot");
        if (slot) selectPaletteSlot(Number(slot.dataset.paletteIndex));
      }
    );
  }

  function connectTools() {
    var buttons = document.querySelectorAll("[data-editor-tool]");

    buttons.forEach(function (button) {
      button.addEventListener("click", function () {
        selectedTool = button.dataset.editorTool;

        buttons.forEach(function (item) {
          item.classList.toggle("activeTool", item === button);
        });
        setStatus("Select a non-blocking display cell for the player start.");
      });
    });
  }

  function refreshWorldEditor() {
    var world = activeWorld();
    var start = project.start;

    if (!world) return;
    if (activeRoomX < 0 || activeRoomX >= world.width ||
        activeRoomY < 0 || activeRoomY >= world.height) {
      activeRoomX = start ? start.roomX : 0;
      activeRoomY = start ? start.roomY : 0;
    }
    activeSection();
    renderAll();
  }

  function initWorldEditor(options) {
    model = options.model;
    project = options.project;
    displayEditor = options.displayEditor;
    compression = options.compression;
    statusHandler = options.setStatus;
    markDirtyHandler = options.markDirty || null;
    activeWorldId = project.worlds.length ? project.worlds[0].id : null;
    activeSectionId = activeWorld() ? activeWorld().defaultSectionId : null;

    if (project.rooms.length && project.rooms[0].x < 0) {
      project.rooms[0].x = 0;
    }

    activeRoomX = project.rooms.length ? project.rooms[0].x : 0;
    activeRoomY = project.rooms.length ? project.rooms[0].y : 0;
    connectRoomControls();
    connectSectionControls();
    connectTools();
    connectDisplay();
    connectRoomPropertyControls();
    renderAll();
  }

  window.SevenSegWorldEditor = {
    init: initWorldEditor,
    refresh: refreshWorldEditor,
    undo: undoWorldCommand
  };
}());

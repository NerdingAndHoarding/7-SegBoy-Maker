(function () {
  "use strict";

  var visualAssets = null;
  var displayEditor = null;
  var project = null;
  var statusHandler = function () {};
  var dirtyHandler = function () {};
  var controller = null;
  var root = null;
  var frameDisplay = null;
  var active = false;
  var selectedCellIndex = 0;

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function stableIdPart(value) {
    var result = String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48);

    if (!result || !/^[a-z]/.test(result)) result = "frame";
    return result;
  }

  function createLibraryController(targetProject, options) {
    var settings = options || {};
    var assets = settings.visualAssets || window.SevenSegVisualAssets;
    var randomByte = typeof settings.randomByte === "function" ?
      settings.randomByte :
      function () { return Math.floor(Math.random() * 256); };
    var randomIndex = typeof settings.randomIndex === "function" ?
      settings.randomIndex :
      function (length) { return Math.floor(Math.random() * length); };
    var undoStack = [];
    var selectedId = null;

    if (!targetProject || typeof targetProject !== "object") {
      throw new Error("A project is required for the frame library.");
    }
    if (!Array.isArray(targetProject.frames)) targetProject.frames = [];
    if (!Array.isArray(targetProject.glyphs)) targetProject.glyphs = [];

    function frames() {
      return targetProject.frames;
    }

    function selected() {
      var list = frames();

      for (var index = 0; index < list.length; index += 1) {
        if (list[index].id === selectedId) return list[index];
      }

      selectedId = list.length ? list[0].id : null;
      return list.length ? list[0] : null;
    }

    function uniqueId(name) {
      var base = "frame_" + stableIdPart(name || "new");
      var candidate = base;
      var suffix = 2;

      while (frames().some(function (frame) { return frame.id === candidate; })) {
        candidate = base + "_" + suffix;
        suffix += 1;
      }
      return candidate;
    }

    function snapshot() {
      return {
        frames: cloneJson(frames()),
        selectedId: selectedId
      };
    }

    function pushUndo() {
      undoStack.push(snapshot());
      if (undoStack.length > 50) undoStack.shift();
    }

    function success(action, frame) {
      return {
        ok: true,
        action: action,
        frame: frame ? cloneJson(frame) : null
      };
    }

    function failure(reason, references) {
      return {
        ok: false,
        reason: reason,
        references: references || []
      };
    }

    function referencesFor(frameId) {
      var references = [];

      (Array.isArray(targetProject.rooms) ? targetProject.rooms : []).forEach(
        function (room, roomIndex) {
          if (room && room.frameId === frameId) {
            references.push("rooms[" + roomIndex + "].frameId");
          }
        }
      );
      (Array.isArray(targetProject.animations) ? targetProject.animations : []).forEach(
        function (animation, animationIndex) {
          var ids = animation && Array.isArray(animation.frameIds) ? animation.frameIds : [];
          ids.forEach(function (id, frameIndex) {
            if (id === frameId) {
              references.push(
                "animations[" + animationIndex + "].frameIds[" + frameIndex + "]"
              );
            }
          });
        }
      );

      return references;
    }

    function roomReferencesFor(frameId) {
      return (Array.isArray(targetProject.rooms) ? targetProject.rooms : [])
        .map(function (room, roomIndex) {
          return room && room.frameId === frameId ? "rooms[" + roomIndex + "].frameId" : null;
        })
        .filter(function (reference) {
          return reference !== null;
        });
    }

    function cellEditBlocked(frame) {
      var references = frame ? roomReferencesFor(frame.id) : [];

      if (!references.length) return null;
      return failure(
        "Room-owned frame cells remain read-only until the world editor uses the shared frame model.",
        references
      );
    }

    function commandOnSelected(action, change) {
      var frame = selected();

      if (!frame) return failure("No frame is selected.");
      pushUndo();
      change(frame);
      return success(action, frame);
    }

    function glyphForBlank() {
      var glyphs = targetProject.glyphs;

      for (var index = 0; index < glyphs.length; index += 1) {
        if (glyphs[index].segmentByte === 0) return glyphs[index];
      }
      return glyphs.length ? glyphs[0] : null;
    }

    function glyphIdsForBytes(bytes) {
      var ids = [];
      var missing = [];

      bytes.forEach(function (value, cellIndex) {
        var glyph = targetProject.glyphs.find(function (entry) {
          return entry.segmentByte === value;
        });

        if (glyph) ids.push(glyph.id);
        else {
          ids.push("");
          missing.push(cellIndex);
        }
      });

      return {
        ids: ids,
        missing: missing
      };
    }

    return {
      list: function () {
        return cloneJson(frames());
      },
      refresh: function () {
        if (!Array.isArray(targetProject.frames)) targetProject.frames = [];
        if (!Array.isArray(targetProject.glyphs)) targetProject.glyphs = [];
        undoStack = [];
        selected();
        return this.list();
      },
      getSelected: function () {
        var frame = selected();
        return frame ? cloneJson(frame) : null;
      },
      select: function (id) {
        var exists = frames().some(function (frame) { return frame.id === id; });
        if (!exists) return false;
        selectedId = id;
        return true;
      },
      create: function (name, encoding) {
        var frameName = String(name || "New frame").trim() || "New frame";
        var frameEncoding = encoding === assets.GLYPH_REFS_ENCODING ?
          assets.GLYPH_REFS_ENCODING :
          assets.SEGMENT_BYTES_ENCODING;
        var frame;
        var blankGlyph;

        if (frameEncoding === assets.GLYPH_REFS_ENCODING) {
          blankGlyph = glyphForBlank();
          if (!blankGlyph) {
            return failure("Create at least one glyph before making a glyph-reference frame.");
          }
        }

        frame = assets.createFrame(uniqueId(frameName), frameName, frameEncoding);
        if (blankGlyph) frame.cells = new Array(24).fill(blankGlyph.id);
        pushUndo();
        frames().push(frame);
        selectedId = frame.id;
        return success("create", frame);
      },
      duplicate: function () {
        var source = selected();
        var copy;

        if (!source) return failure("No frame is selected.");
        pushUndo();
        copy = cloneJson(source);
        copy.name = source.name + " copy";
        copy.id = uniqueId(copy.name);
        frames().push(copy);
        selectedId = copy.id;
        return success("duplicate", copy);
      },
      rename: function (name) {
        var nextName = String(name || "").trim();
        var frame = selected();

        if (!frame) return failure("No frame is selected.");
        if (!nextName) return failure("Frame name cannot be empty.");
        if (nextName === frame.name) return success("rename", frame);
        return commandOnSelected("rename", function (entry) {
          entry.name = nextName;
        });
      },
      setTags: function (tags) {
        var clean = [];

        (Array.isArray(tags) ? tags : []).forEach(function (tag) {
          var value = String(tag || "").trim().toLowerCase();
          if (value && clean.indexOf(value) === -1) clean.push(value);
        });
        return commandOnSelected("set-tags", function (frame) {
          frame.tags = clean;
        });
      },
      deleteSelected: function () {
        var frame = selected();
        var references;
        var index;

        if (!frame) return failure("No frame is selected.");
        references = referencesFor(frame.id);
        if (references.length) return failure("The frame is still referenced.", references);

        pushUndo();
        index = frames().indexOf(frame);
        frames().splice(index, 1);
        selectedId = frames().length ?
          frames()[Math.min(index, frames().length - 1)].id :
          null;
        return success("delete", frame);
      },
      setRawFrame: function (cells) {
        var normalized = assets.normalizeFrame({
          id: "frame_check",
          name: "Check",
          width: 8,
          height: 3,
          encoding: assets.SEGMENT_BYTES_ENCODING,
          cells: cells
        });

        if (!normalized) return failure("Raw frame must contain exactly 24 bytes.");
        if (!selected() || selected().encoding !== assets.SEGMENT_BYTES_ENCODING) {
          return failure("Selected frame is not a raw segment-byte frame.");
        }
        var blocked = cellEditBlocked(selected());
        if (blocked) return blocked;
        return commandOnSelected("set-raw-frame", function (frame) {
          frame.cells = normalized.cells;
        });
      },
      setGlyphCell: function (cellIndex, glyphId) {
        var frame = selected();
        var blocked = cellEditBlocked(frame);
        var glyphExists = targetProject.glyphs.some(function (glyph) {
          return glyph.id === glyphId;
        });

        if (!frame || frame.encoding !== assets.GLYPH_REFS_ENCODING) {
          return failure("Selected frame is not a glyph-reference frame.");
        }
        if (blocked) return blocked;
        if (!Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex >= 24) {
          return failure("Frame cell index is outside 0 through 23.");
        }
        if (!glyphExists) return failure("Selected glyph does not exist.");
        if (frame.cells[cellIndex] === glyphId) return success("set-glyph-cell", frame);

        return commandOnSelected("set-glyph-cell", function (entry) {
          entry.cells[cellIndex] = glyphId;
        });
      },
      setEncoding: function (encoding) {
        var frame = selected();
        var blocked = cellEditBlocked(frame);
        var resolved;
        var mapped;

        if (!frame) return failure("No frame is selected.");
        if (blocked) return blocked;
        if (encoding !== assets.SEGMENT_BYTES_ENCODING &&
            encoding !== assets.GLYPH_REFS_ENCODING) {
          return failure("Frame encoding is not supported.");
        }
        if (encoding === frame.encoding) return success("set-encoding", frame);

        if (encoding === assets.SEGMENT_BYTES_ENCODING) {
          resolved = assets.resolveFrame(frame, targetProject.glyphs);
          if (!resolved.ok) return failure(resolved.errors.join(" "));
          return commandOnSelected("set-encoding", function (entry) {
            entry.encoding = assets.SEGMENT_BYTES_ENCODING;
            entry.cells = resolved.cells;
          });
        }

        mapped = glyphIdsForBytes(frame.cells);
        if (mapped.missing.length) {
          return failure(
            "No project glyph matches raw cells: " + mapped.missing.join(", ") + "."
          );
        }
        return commandOnSelected("set-encoding", function (entry) {
          entry.encoding = assets.GLYPH_REFS_ENCODING;
          entry.cells = mapped.ids;
        });
      },
      clear: function () {
        var frame = selected();
        var blocked = cellEditBlocked(frame);
        var blankGlyph;

        if (!frame) return failure("No frame is selected.");
        if (blocked) return blocked;
        if (frame.encoding === assets.GLYPH_REFS_ENCODING) {
          blankGlyph = glyphForBlank();
          if (!blankGlyph) return failure("A glyph is required to clear this frame.");
        }

        return commandOnSelected("clear", function (entry) {
          entry.cells = entry.encoding === assets.GLYPH_REFS_ENCODING ?
            new Array(24).fill(blankGlyph.id) :
            new Array(24).fill(0);
        });
      },
      randomize: function () {
        var frame = selected();
        var blocked = cellEditBlocked(frame);
        var glyphs = targetProject.glyphs;

        if (!frame) return failure("No frame is selected.");
        if (blocked) return blocked;
        if (frame.encoding === assets.GLYPH_REFS_ENCODING && !glyphs.length) {
          return failure("A glyph is required to randomize this frame.");
        }

        return commandOnSelected("randomize", function (entry) {
          entry.cells = new Array(24).fill(0).map(function () {
            if (entry.encoding === assets.GLYPH_REFS_ENCODING) {
              var index = Math.max(0, Math.min(glyphs.length - 1, randomIndex(glyphs.length)));
              return glyphs[index].id;
            }
            var value = Number(randomByte());
            return Math.max(0, Math.min(255, Math.floor(value) || 0));
          });
        });
      },
      resolveSelected: function () {
        var frame = selected();
        if (!frame) return { ok: false, cells: null, errors: ["No frame is selected."] };
        return assets.resolveFrame(frame, targetProject.glyphs);
      },
      referencesFor: referencesFor,
      roomReferencesFor: roomReferencesFor,
      canUndo: function () {
        return undoStack.length > 0;
      },
      undo: function () {
        var previous;

        if (!undoStack.length) return failure("Nothing to undo.");
        previous = undoStack.pop();
        targetProject.frames = cloneJson(previous.frames);
        selectedId = previous.selectedId;
        selected();
        return success("undo", selected());
      },
      estimate: function () {
        var frame = selected();
        return {
          selectedBytes: frame ? 24 : 0,
          libraryBytes: frames().length * 24
        };
      }
    };
  }

  function setStatus(message) {
    statusHandler(message);
  }

  function showResult(result, successMessage) {
    if (!result.ok) {
      setStatus(
        result.reason +
        (result.references.length ? " Used by: " + result.references.join(", ") + "." : "")
      );
      render();
      return false;
    }
    dirtyHandler();
    render();
    if (successMessage) setStatus(successMessage);
    return true;
  }

  function renderList() {
    var list = controller.list();
    var selected = controller.getSelected();
    var select = root.querySelector("[data-frame-list]");

    select.innerHTML = "";
    list.forEach(function (frame) {
      var option = document.createElement("option");
      option.value = frame.id;
      option.textContent = frame.name + "  [" + frame.id + "]";
      option.selected = selected && selected.id === frame.id;
      select.appendChild(option);
    });
    select.disabled = list.length === 0;
  }

  function rebuildGlyphPicker(frame) {
    var select = root.querySelector("[data-frame-glyph]");
    var glyphs = Array.isArray(project.glyphs) ? project.glyphs : [];

    select.innerHTML = "";
    glyphs.forEach(function (glyph) {
      var option = document.createElement("option");
      option.value = glyph.id;
      option.textContent = glyph.name + "  [" + glyph.id + "]";
      select.appendChild(option);
    });
    select.disabled = !frame || frame.encoding !== visualAssets.GLYPH_REFS_ENCODING ||
      glyphs.length === 0;
    if (frame && frame.encoding === visualAssets.GLYPH_REFS_ENCODING &&
        frame.cells[selectedCellIndex]) {
      select.value = frame.cells[selectedCellIndex];
    }
  }

  function render() {
    var frame = controller.getSelected();
    var resolved = controller.resolveSelected();
    var estimate = controller.estimate();
    var glyphMode = Boolean(frame && frame.encoding === visualAssets.GLYPH_REFS_ENCODING);
    var roomReferences = frame ? controller.roomReferencesFor(frame.id) : [];
    var roomOwned = roomReferences.length > 0;
    var warningText = resolved.ok ? "" : resolved.errors.join(" ");

    renderList();
    root.querySelector("[data-frame-name]").disabled = !frame;
    root.querySelector("[data-frame-name]").value = frame ? frame.name : "";
    root.querySelector("[data-frame-id]").textContent = frame ? frame.id : "No frame selected";
    root.querySelector("[data-frame-encoding]").disabled = !frame || roomOwned;
    root.querySelector("[data-frame-encoding]").value =
      frame ? frame.encoding : visualAssets.SEGMENT_BYTES_ENCODING;
    root.querySelector("[data-frame-tags]").disabled = !frame;
    root.querySelector("[data-frame-tags]").value =
      frame && Array.isArray(frame.tags) ? frame.tags.join(", ") : "";
    root.querySelector("[data-frame-undo]").disabled = !controller.canUndo();
    root.querySelector("[data-frame-memory]").textContent =
      estimate.selectedBytes + " bytes selected / " +
      estimate.libraryBytes + " bytes library";
    if (roomOwned) {
      warningText = "Room-owned cell data is read-only here until the shared world-editor milestone.";
    }
    root.querySelector("[data-frame-warning]").textContent = warningText;
    root.querySelector("[data-frame-glyph-controls]").hidden = !glyphMode;
    root.querySelectorAll("[data-needs-frame]").forEach(function (button) {
      button.disabled = !frame;
    });
    root.querySelectorAll("[data-frame-cell-command]").forEach(function (button) {
      button.disabled = !frame || roomOwned;
    });

    rebuildGlyphPicker(frame);
    root.querySelector("[data-frame-glyph]").disabled =
      root.querySelector("[data-frame-glyph]").disabled || roomOwned;
    if (frameDisplay) {
      frameDisplay.setReadOnly(glyphMode || !frame || roomOwned);
      frameDisplay.setFrame(resolved.ok ? resolved.cells : new Array(24).fill(0));
      frameDisplay.selectCell(selectedCellIndex);
    }
  }

  function buildUi() {
    root.innerHTML =
      '<div class="frameEditorLayout">' +
        '<div class="frameLibraryColumn">' +
          '<label for="frameLibraryList">Frame library</label>' +
          '<select id="frameLibraryList" data-frame-list size="8"></select>' +
          '<div class="frameCommandRow">' +
            '<button type="button" data-frame-command="create">New</button>' +
            '<button type="button" data-frame-command="duplicate" data-needs-frame>Duplicate</button>' +
            '<button type="button" data-frame-command="delete" data-needs-frame>Delete</button>' +
            '<button type="button" data-frame-undo>Undo</button>' +
          '</div>' +
        '</div>' +
        '<div class="frameEditColumn">' +
          '<div class="frameIdentityGrid">' +
            '<label for="frameNameInput">Name</label>' +
            '<input id="frameNameInput" data-frame-name type="text" maxlength="100">' +
            '<span>ID</span><code data-frame-id></code>' +
            '<label for="frameEncodingSelect">Encoding</label>' +
            '<select id="frameEncodingSelect" data-frame-encoding>' +
              '<option value="segment-bytes-v1">Raw segment bytes</option>' +
              '<option value="glyph-refs-v1">Glyph references</option>' +
            '</select>' +
            '<label for="frameTagsInput">Tags</label>' +
            '<input id="frameTagsInput" data-frame-tags type="text" placeholder="room, battle">' +
          '</div>' +
          '<div data-frame-display></div>' +
          '<div class="frameGlyphControls" data-frame-glyph-controls hidden>' +
            '<label for="frameGlyphSelect">Glyph for selected cell</label>' +
            '<select id="frameGlyphSelect" data-frame-glyph></select>' +
            '<button type="button" data-frame-apply-glyph data-frame-cell-command>Apply glyph</button>' +
          '</div>' +
          '<div class="frameCommandRow">' +
            '<button type="button" data-frame-command="clear" data-needs-frame data-frame-cell-command>Clear</button>' +
            '<button type="button" data-frame-command="randomize" data-needs-frame data-frame-cell-command>Randomize</button>' +
          '</div>' +
          '<div class="frameWarning" data-frame-warning></div>' +
          '<div class="frameMemory" data-frame-memory></div>' +
        '</div>' +
      '</div>';

    frameDisplay = displayEditor.create(root.querySelector("[data-frame-display]"), {
      label: "Selected 8 by 3 frame",
      frame: new Array(24).fill(0),
      onSelect: function (index) {
        selectedCellIndex = index;
        rebuildGlyphPicker(controller.getSelected());
      },
      onChange: function (cells) {
        showResult(controller.setRawFrame(cells), "Updated frame segments.");
      }
    });
  }

  function connectUi() {
    root.addEventListener("focusin", function () {
      active = true;
    });
    document.addEventListener("pointerdown", function (event) {
      active = root.contains(event.target);
    });
    root.querySelector("[data-frame-list]").addEventListener("change", function (event) {
      controller.select(event.target.value);
      selectedCellIndex = 0;
      render();
    });
    root.querySelector("[data-frame-name]").addEventListener("change", function (event) {
      showResult(controller.rename(event.target.value), "Renamed frame.");
    });
    root.querySelector("[data-frame-encoding]").addEventListener("change", function (event) {
      showResult(controller.setEncoding(event.target.value), "Changed frame encoding.");
    });
    root.querySelector("[data-frame-tags]").addEventListener("change", function (event) {
      showResult(
        controller.setTags(event.target.value.split(",")),
        "Updated frame tags."
      );
    });
    root.querySelector("[data-frame-undo]").addEventListener("click", function () {
      undo();
    });
    root.querySelector("[data-frame-apply-glyph]").addEventListener("click", function () {
      showResult(
        controller.setGlyphCell(
          selectedCellIndex,
          root.querySelector("[data-frame-glyph]").value
        ),
        "Applied glyph to cell " + selectedCellIndex + "."
      );
    });
    root.addEventListener("click", function (event) {
      var button = event.target.closest("[data-frame-command]");
      var command;
      var result;

      if (!button) return;
      command = button.dataset.frameCommand;
      if (command === "create") result = controller.create("New frame");
      else if (command === "duplicate") result = controller.duplicate();
      else if (command === "delete") result = controller.deleteSelected();
      else if (command === "clear") result = controller.clear();
      else if (command === "randomize") result = controller.randomize();
      else return;

      showResult(result, command.charAt(0).toUpperCase() + command.slice(1) + " frame.");
    });
  }

  function init(options) {
    visualAssets = options.visualAssets;
    displayEditor = options.displayEditor;
    project = options.project;
    statusHandler = options.setStatus || statusHandler;
    dirtyHandler = options.markDirty || dirtyHandler;
    root = document.getElementById("frameEditor");

    if (!root || !visualAssets || !displayEditor) return;
    controller = createLibraryController(project, {
      visualAssets: visualAssets
    });
    buildUi();
    connectUi();
    render();
  }

  function refresh() {
    if (!controller) return;
    controller.refresh();
    selectedCellIndex = 0;
    render();
  }

  function undo() {
    var result;

    if (!controller) return false;
    result = controller.undo();
    if (!result.ok) {
      setStatus(result.reason);
      return false;
    }
    dirtyHandler();
    render();
    setStatus("Undid the last frame command.");
    return true;
  }

  window.SevenSegFrameEditor = {
    createLibraryController: createLibraryController,
    init: init,
    refresh: refresh,
    undo: undo,
    canUndo: function () {
      return Boolean(controller && controller.canUndo());
    },
    isActive: function () {
      return active;
    }
  };
}());

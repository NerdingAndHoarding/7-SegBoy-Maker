(function () {
  "use strict";

  var visualAssets = null;
  var displayEditor = null;
  var project = null;
  var statusHandler = function () {};
  var dirtyHandler = function () {};
  var controller = null;
  var root = null;
  var byteEditor = null;
  var active = false;

  function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function stableIdPart(value) {
    var result = String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48);

    if (!result || !/^[a-z]/.test(result)) result = "glyph";
    return result;
  }

  function createLibraryController(targetProject, options) {
    var settings = options || {};
    var assets = settings.visualAssets || window.SevenSegVisualAssets;
    var randomByte = typeof settings.randomByte === "function" ?
      settings.randomByte :
      function () { return Math.floor(Math.random() * 256); };
    var undoStack = [];
    var selectedId = null;
    var clipboard = null;

    if (!targetProject || typeof targetProject !== "object") {
      throw new Error("A project is required for the glyph library.");
    }
    if (!Array.isArray(targetProject.glyphs)) targetProject.glyphs = [];

    function glyphs() {
      return targetProject.glyphs;
    }

    function selected() {
      var list = glyphs();

      for (var index = 0; index < list.length; index += 1) {
        if (list[index].id === selectedId) return list[index];
      }

      selectedId = list.length ? list[0].id : null;
      return list.length ? list[0] : null;
    }

    function uniqueId(name, ignoredId) {
      var base = "glyph_" + stableIdPart(name || "new");
      var candidate = base;
      var suffix = 2;

      function used(id) {
        return glyphs().some(function (glyph) {
          return glyph.id === id && glyph.id !== ignoredId;
        });
      }

      while (used(candidate)) {
        candidate = base + "_" + suffix;
        suffix += 1;
      }

      return candidate;
    }

    function snapshot() {
      return {
        glyphs: cloneJson(glyphs()),
        selectedId: selectedId
      };
    }

    function pushUndo() {
      undoStack.push(snapshot());
      if (undoStack.length > 50) undoStack.shift();
    }

    function success(action, glyph) {
      return {
        ok: true,
        action: action,
        glyph: glyph ? cloneJson(glyph) : null
      };
    }

    function failure(reason, references) {
      return {
        ok: false,
        reason: reason,
        references: references || []
      };
    }

    function referencesFor(glyphId) {
      var references = [];

      (Array.isArray(targetProject.frames) ? targetProject.frames : []).forEach(
        function (frame, frameIndex) {
          if (!frame || frame.encoding !== "glyph-refs-v1" || !Array.isArray(frame.cells)) return;
          frame.cells.forEach(function (cellGlyphId, cellIndex) {
            if (cellGlyphId === glyphId) {
              references.push("frames[" + frameIndex + "].cells[" + cellIndex + "]");
            }
          });
        }
      );

      (Array.isArray(targetProject.sections) ? targetProject.sections : []).forEach(
        function (section, sectionIndex) {
          var ids = section && section.palette && Array.isArray(section.palette.glyphIds) ?
            section.palette.glyphIds :
            [];

          ids.forEach(function (paletteGlyphId, paletteIndex) {
            if (paletteGlyphId === glyphId) {
              references.push(
                "sections[" + sectionIndex + "].palette.glyphIds[" + paletteIndex + "]"
              );
            }
          });
        }
      );

      return references;
    }

    function removeSelected(action) {
      var glyph = selected();
      var references;
      var index;

      if (!glyph) return failure("No glyph is selected.");
      references = referencesFor(glyph.id);
      if (references.length) {
        return failure("The glyph is still referenced.", references);
      }

      pushUndo();
      index = glyphs().indexOf(glyph);
      glyphs().splice(index, 1);
      selectedId = glyphs().length ?
        glyphs()[Math.min(index, glyphs().length - 1)].id :
        null;
      return success(action, glyph);
    }

    function commandOnSelected(action, change) {
      var glyph = selected();

      if (!glyph) return failure("No glyph is selected.");
      pushUndo();
      change(glyph);
      return success(action, glyph);
    }

    return {
      list: function () {
        return cloneJson(glyphs());
      },
      refresh: function () {
        if (!Array.isArray(targetProject.glyphs)) targetProject.glyphs = [];
        undoStack = [];
        clipboard = null;
        selected();
        return this.list();
      },
      getSelected: function () {
        var glyph = selected();
        return glyph ? cloneJson(glyph) : null;
      },
      select: function (id) {
        var exists = glyphs().some(function (glyph) { return glyph.id === id; });
        if (!exists) return false;
        selectedId = id;
        return true;
      },
      create: function (name) {
        var glyphName = String(name || "New glyph").trim() || "New glyph";
        var glyph = assets.createGlyph(uniqueId(glyphName), glyphName, 0);

        pushUndo();
        glyphs().push(glyph);
        selectedId = glyph.id;
        return success("create", glyph);
      },
      duplicate: function () {
        var source = selected();
        var copy;

        if (!source) return failure("No glyph is selected.");
        pushUndo();
        copy = cloneJson(source);
        copy.name = source.name + " copy";
        copy.id = uniqueId(copy.name);
        glyphs().push(copy);
        selectedId = copy.id;
        return success("duplicate", copy);
      },
      rename: function (name) {
        var nextName = String(name || "").trim();
        var glyph = selected();

        if (!glyph) return failure("No glyph is selected.");
        if (!nextName) return failure("Glyph name cannot be empty.");
        if (glyph.name === nextName) return success("rename", glyph);
        return commandOnSelected("rename", function (entry) {
          entry.name = nextName;
        });
      },
      deleteSelected: function () {
        return removeSelected("delete");
      },
      copy: function () {
        var glyph = selected();
        if (!glyph) return failure("No glyph is selected.");
        clipboard = cloneJson(glyph);
        return success("copy", glyph);
      },
      cut: function () {
        var glyph = selected();
        var references;

        if (!glyph) return failure("No glyph is selected.");
        references = referencesFor(glyph.id);
        if (references.length) return failure("The glyph is still referenced.", references);
        clipboard = cloneJson(glyph);
        return removeSelected("cut");
      },
      paste: function () {
        var pasted;

        if (!clipboard) return failure("The glyph clipboard is empty.");
        pushUndo();
        pasted = cloneJson(clipboard);
        pasted.name = clipboard.name + " copy";
        pasted.id = uniqueId(pasted.name);
        glyphs().push(pasted);
        selectedId = pasted.id;
        return success("paste", pasted);
      },
      clear: function () {
        return commandOnSelected("clear", function (glyph) {
          glyph.segmentByte = 0;
        });
      },
      randomize: function () {
        return commandOnSelected("randomize", function (glyph) {
          var value = Number(randomByte());
          glyph.segmentByte = Math.max(0, Math.min(255, Math.floor(value) || 0));
        });
      },
      setByte: function (value) {
        if (!assets.isSegmentByte(value)) return failure("Segment value must be a byte.");
        if (selected() && selected().segmentByte === value) return success("set-byte", selected());
        return commandOnSelected("set-byte", function (glyph) {
          glyph.segmentByte = value;
        });
      },
      toggleTag: function (tag) {
        if (assets.GLYPH_BEHAVIOR_LABELS.indexOf(tag) === -1) {
          return failure("Glyph behavior label is not supported.");
        }

        return commandOnSelected("toggle-tag", function (glyph) {
          var index = glyph.tags.indexOf(tag);
          if (index === -1) glyph.tags.push(tag);
          else glyph.tags.splice(index, 1);
        });
      },
      referencesFor: referencesFor,
      canUndo: function () {
        return undoStack.length > 0;
      },
      undo: function () {
        var previous;

        if (!undoStack.length) return failure("Nothing to undo.");
        previous = undoStack.pop();
        targetProject.glyphs = cloneJson(previous.glyphs);
        selectedId = previous.selectedId;
        selected();
        return success("undo", selected());
      },
      estimate: function () {
        var estimate = assets.estimateRawAssetBytes({
          glyphs: glyphs(),
          frames: [],
          animations: []
        });

        return {
          selectedBytes: selected() ? 1 : 0,
          libraryBytes: estimate.glyphBytes
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
      return false;
    }

    dirtyHandler();
    render();
    if (successMessage) setStatus(successMessage);
    return true;
  }

  function renderList() {
    var select = root.querySelector("[data-glyph-list]");
    var selected = controller.getSelected();
    var list = controller.list();

    select.innerHTML = "";
    list.forEach(function (glyph) {
      var option = document.createElement("option");

      option.value = glyph.id;
      option.textContent = glyph.name + "  [" + glyph.id + "]";
      option.selected = selected && selected.id === glyph.id;
      select.appendChild(option);
    });
    select.disabled = list.length === 0;
  }

  function render() {
    var glyph = controller.getSelected();
    var estimate = controller.estimate();
    var nameInput = root.querySelector("[data-glyph-name]");
    var idOutput = root.querySelector("[data-glyph-id]");

    renderList();
    nameInput.disabled = !glyph;
    nameInput.value = glyph ? glyph.name : "";
    idOutput.textContent = glyph ? glyph.id : "No glyph selected";
    root.querySelector("[data-glyph-memory]").textContent =
      estimate.selectedBytes + " byte selected / " +
      estimate.libraryBytes + " bytes library";
    root.querySelector("[data-glyph-undo]").disabled = !controller.canUndo();

    root.querySelectorAll("[data-needs-glyph]").forEach(function (button) {
      button.disabled = !glyph;
    });
    root.querySelectorAll("[data-glyph-tag]").forEach(function (checkbox) {
      checkbox.checked = Boolean(glyph && glyph.tags.indexOf(checkbox.dataset.glyphTag) !== -1);
      checkbox.disabled = !glyph;
    });

    if (byteEditor) byteEditor.setValue(glyph ? glyph.segmentByte : 0);
  }

  function buildUi() {
    root.innerHTML =
      '<div class="glyphEditorLayout">' +
        '<div class="glyphLibraryColumn">' +
          '<label for="glyphLibraryList">Glyph library</label>' +
          '<select id="glyphLibraryList" data-glyph-list size="8"></select>' +
          '<div class="glyphCommandRow">' +
            '<button type="button" data-glyph-command="create">New</button>' +
            '<button type="button" data-glyph-command="duplicate" data-needs-glyph>Duplicate</button>' +
            '<button type="button" data-glyph-command="delete" data-needs-glyph>Delete</button>' +
            '<button type="button" data-glyph-undo>Undo</button>' +
          '</div>' +
        '</div>' +
        '<div class="glyphEditColumn">' +
          '<div class="glyphIdentityGrid">' +
            '<label for="glyphNameInput">Name</label>' +
            '<input id="glyphNameInput" data-glyph-name type="text" maxlength="100">' +
            '<span>ID</span><code data-glyph-id></code>' +
          '</div>' +
          '<div data-glyph-byte-editor></div>' +
          '<div class="glyphTagRow" aria-label="Glyph behavior labels">' +
            visualAssets.GLYPH_BEHAVIOR_LABELS.map(function (tag) {
              return '<label><input type="checkbox" data-glyph-tag="' + tag + '"> ' +
                tag + '</label>';
            }).join("") +
          '</div>' +
          '<div class="glyphCommandRow">' +
            '<button type="button" data-glyph-command="copy" data-needs-glyph>Copy</button>' +
            '<button type="button" data-glyph-command="cut" data-needs-glyph>Cut</button>' +
            '<button type="button" data-glyph-command="paste">Paste</button>' +
            '<button type="button" data-glyph-command="clear" data-needs-glyph>Clear</button>' +
            '<button type="button" data-glyph-command="randomize" data-needs-glyph>Randomize</button>' +
          '</div>' +
          '<div class="glyphMemory" data-glyph-memory></div>' +
        '</div>' +
      '</div>';

    byteEditor = displayEditor.createByteEditor(
      root.querySelector("[data-glyph-byte-editor]"),
      {
        label: "Selected glyph segments",
        value: 0,
        onChange: function (value) {
          showResult(controller.setByte(value), "Updated glyph segments.");
        }
      }
    );
  }

  function connectUi() {
    root.addEventListener("focusin", function () {
      active = true;
    });
    document.addEventListener("pointerdown", function (event) {
      active = root.contains(event.target);
    });

    root.querySelector("[data-glyph-list]").addEventListener("change", function (event) {
      controller.select(event.target.value);
      render();
    });
    root.querySelector("[data-glyph-name]").addEventListener("change", function (event) {
      showResult(controller.rename(event.target.value), "Renamed glyph.");
    });
    root.querySelectorAll("[data-glyph-tag]").forEach(function (checkbox) {
      checkbox.addEventListener("change", function () {
        showResult(controller.toggleTag(checkbox.dataset.glyphTag), "Updated glyph labels.");
      });
    });
    root.querySelector("[data-glyph-undo]").addEventListener("click", function () {
      undo();
    });
    root.addEventListener("click", function (event) {
      var button = event.target.closest("[data-glyph-command]");
      var command;
      var result;

      if (!button) return;
      command = button.dataset.glyphCommand;
      if (command === "create") result = controller.create("New glyph");
      else if (command === "duplicate") result = controller.duplicate();
      else if (command === "delete") result = controller.deleteSelected();
      else if (command === "copy") result = controller.copy();
      else if (command === "cut") result = controller.cut();
      else if (command === "paste") result = controller.paste();
      else if (command === "clear") result = controller.clear();
      else if (command === "randomize") result = controller.randomize();
      else return;

      if (command === "copy") {
        if (result.ok) setStatus("Copied glyph.");
        else showResult(result);
        return;
      }

      showResult(result, command.charAt(0).toUpperCase() + command.slice(1) + " glyph.");
    });
  }

  function init(options) {
    visualAssets = options.visualAssets;
    displayEditor = options.displayEditor;
    project = options.project;
    statusHandler = options.setStatus || statusHandler;
    dirtyHandler = options.markDirty || dirtyHandler;
    root = document.getElementById("glyphEditor");

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
    setStatus("Undid the last glyph command.");
    return true;
  }

  window.SevenSegGlyphEditor = {
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

(function () {
  "use strict";

  var DISPLAY_COLS = 8;
  var DISPLAY_ROWS = 3;
  var DISPLAY_CELLS = 24;
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

  function isSegmentByte(value) {
    if (window.SevenSegVisualAssets &&
        typeof window.SevenSegVisualAssets.isSegmentByte === "function") {
      return window.SevenSegVisualAssets.isSegmentByte(value);
    }

    return Number.isInteger(value) && value >= 0 && value <= 255;
  }

  function normalizeFrameBytes(values) {
    if (!Array.isArray(values) || values.length !== DISPLAY_CELLS) {
      return null;
    }

    for (var index = 0; index < DISPLAY_CELLS; index += 1) {
      if (!isSegmentByte(values[index])) return null;
    }

    return values.slice();
  }

  function segmentBit(segment) {
    return SEGMENT_BITS[String(segment || "").toLowerCase()] || 0;
  }

  function toggleSegmentByte(value, segment) {
    var bit = segmentBit(segment);

    if (!isSegmentByte(value) || !bit) return null;
    return value ^ bit;
  }

  function createFrameState(initialFrame) {
    var cells = normalizeFrameBytes(initialFrame) || new Array(DISPLAY_CELLS).fill(0);
    var selectedIndex = 0;

    function validIndex(index) {
      return Number.isInteger(index) && index >= 0 && index < DISPLAY_CELLS;
    }

    return {
      getFrame: function () {
        return cells.slice();
      },
      setFrame: function (nextFrame) {
        var normalized = normalizeFrameBytes(nextFrame);

        if (!normalized) return false;
        cells = normalized;
        return true;
      },
      getSelectedIndex: function () {
        return selectedIndex;
      },
      selectCell: function (index) {
        if (!validIndex(index)) return false;
        selectedIndex = index;
        return true;
      },
      getCellByte: function (index) {
        return validIndex(index) ? cells[index] : null;
      },
      setCellByte: function (index, value) {
        if (!validIndex(index) || !isSegmentByte(value)) return false;
        cells[index] = value;
        return true;
      },
      toggleSegment: function (segment, index) {
        var target = index === undefined ? selectedIndex : index;
        var nextValue;

        if (!validIndex(target)) return false;
        nextValue = toggleSegmentByte(cells[target], segment);
        if (nextValue === null) return false;
        cells[target] = nextValue;
        selectedIndex = target;
        return true;
      }
    };
  }

  function cellSvg(index) {
    var segments = SEGMENT_ORDER.map(function (segment) {
      return '<polygon data-segment="' + segment + '" class="segmentEditorOff" points="' +
        SEGMENT_POINTS[segment] + '"></polygon>';
    }).join("");

    return '<svg viewBox="0 -1 14 20" aria-hidden="true" focusable="false">' +
      '<g data-cell-svg="' + index + '">' + segments + '</g></svg>';
  }

  function create(container, options) {
    var settings = options || {};
    var state = createFrameState(settings.frame);
    var visibleCellCount = settings.visibleCellCount === 1 ? 1 : DISPLAY_CELLS;
    var onChange = typeof settings.onChange === "function" ? settings.onChange : function () {};
    var onSelect = typeof settings.onSelect === "function" ? settings.onSelect : function () {};
    var readOnly = Boolean(settings.readOnly);
    var root;
    var grid;
    var readout;
    var segmentButtons;

    if (!container || typeof container.appendChild !== "function") {
      throw new Error("A display editor container is required.");
    }

    container.innerHTML = "";
    root = document.createElement("div");
    root.className = "segmentEditor";
    root.innerHTML =
      '<div class="segmentEditorScroll">' +
        '<div class="segmentEditorGrid" role="grid" aria-label="' +
          String(settings.label || "8 by 3 seven-segment editor") + '"></div>' +
      '</div>' +
      '<div class="segmentEditorControls">' +
        '<div class="segmentEditorReadout" aria-live="polite"></div>' +
        '<div class="segmentToggleGroup" role="group" aria-label="Segments for selected cell"></div>' +
      '</div>';
    container.appendChild(root);
    grid = root.querySelector(".segmentEditorGrid");
    readout = root.querySelector(".segmentEditorReadout");
    segmentButtons = root.querySelector(".segmentToggleGroup");

    if (visibleCellCount === 1) grid.classList.add("isSingleCell");

    for (var index = 0; index < visibleCellCount; index += 1) {
      var cell = document.createElement("button");
      var x = index % DISPLAY_COLS;
      var y = Math.floor(index / DISPLAY_COLS);

      cell.type = "button";
      cell.className = "segmentEditorCell";
      cell.dataset.cellIndex = String(index);
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", "Cell " + index + ", column " + x + ", row " + y);
      cell.innerHTML = cellSvg(index);
      grid.appendChild(cell);
    }

    SEGMENT_ORDER.forEach(function (segment) {
      var button = document.createElement("button");

      button.type = "button";
      button.className = "segmentToggle";
      button.dataset.segmentToggle = segment;
      button.textContent = segment === "dp" ? "DP" : segment.toUpperCase();
      button.setAttribute("aria-pressed", "false");
      segmentButtons.appendChild(button);
    });

    function selectedByte() {
      return state.getCellByte(state.getSelectedIndex());
    }

    function render() {
      var frame = state.getFrame();
      var selected = state.getSelectedIndex();
      var cells = grid.querySelectorAll(".segmentEditorCell");

      cells.forEach(function (cell, cellIndex) {
        var value = frame[cellIndex];

        cell.classList.toggle("isSelected", cellIndex === selected);
        cell.setAttribute("aria-selected", cellIndex === selected ? "true" : "false");
        SEGMENT_ORDER.forEach(function (segment) {
          var shape = cell.querySelector('[data-segment="' + segment + '"]');
          shape.setAttribute(
            "class",
            (value & SEGMENT_BITS[segment]) ? "segmentEditorOn" : "segmentEditorOff"
          );
        });
      });

      var selectedX = selected % DISPLAY_COLS;
      var selectedY = Math.floor(selected / DISPLAY_COLS);
      var value = selectedByte();

      readout.textContent =
        "Cell " + selected + "  x" + selectedX + " y" + selectedY +
        "  0x" + value.toString(16).toUpperCase().padStart(2, "0");

      segmentButtons.querySelectorAll("[data-segment-toggle]").forEach(function (button) {
        var segment = button.dataset.segmentToggle;
        var active = Boolean(value & SEGMENT_BITS[segment]);

        button.classList.toggle("isActive", active);
        button.setAttribute("aria-pressed", active ? "true" : "false");
        button.disabled = readOnly;
      });
      root.classList.toggle("isReadOnly", readOnly);
    }

    function notify(reason, segment) {
      onChange(state.getFrame(), {
        reason: reason,
        segment: segment || null,
        index: state.getSelectedIndex(),
        value: selectedByte()
      });
    }

    function selectCell(index, focus) {
      if (!state.selectCell(index)) return false;
      render();
      onSelect(index);
      if (focus) {
        grid.querySelector('[data-cell-index="' + index + '"]').focus();
      }
      return true;
    }

    grid.addEventListener("click", function (event) {
      var cell = event.target.closest(".segmentEditorCell");
      var segment = event.target.closest("[data-segment]");
      var index;

      if (!cell) return;
      index = Number(cell.dataset.cellIndex);
      state.selectCell(index);

      if (segment && !readOnly && state.toggleSegment(segment.dataset.segment, index)) {
        render();
        notify("toggle-segment", segment.dataset.segment);
        return;
      }

      render();
      onSelect(index);
    });

    grid.addEventListener("keydown", function (event) {
      var selected = state.getSelectedIndex();
      var next = selected;

      if (event.key === "ArrowLeft") next = Math.max(0, selected - 1);
      else if (event.key === "ArrowRight") next = Math.min(visibleCellCount - 1, selected + 1);
      else if (event.key === "ArrowUp") next = Math.max(0, selected - DISPLAY_COLS);
      else if (event.key === "ArrowDown") next = Math.min(visibleCellCount - 1, selected + DISPLAY_COLS);
      else return;

      event.preventDefault();
      selectCell(next, true);
    });

    segmentButtons.addEventListener("click", function (event) {
      var button = event.target.closest("[data-segment-toggle]");
      var segment;

      if (!button) return;
      segment = button.dataset.segmentToggle;
      if (!readOnly && state.toggleSegment(segment)) {
        render();
        notify("toggle-segment", segment);
      }
    });

    render();

    return {
      getFrame: state.getFrame,
      setFrame: function (frame) {
        if (!state.setFrame(frame)) return false;
        render();
        return true;
      },
      getSelectedIndex: state.getSelectedIndex,
      selectCell: function (index) {
        return selectCell(index, false);
      },
      getCellByte: state.getCellByte,
      setCellByte: function (index, value) {
        if (!state.setCellByte(index, value)) return false;
        render();
        notify("set-cell");
        return true;
      },
      toggleSegment: function (segment, index) {
        if (readOnly) return false;
        if (!state.toggleSegment(segment, index)) return false;
        render();
        notify("toggle-segment", segment);
        return true;
      },
      setReadOnly: function (value) {
        readOnly = Boolean(value);
        render();
      },
      destroy: function () {
        container.innerHTML = "";
      }
    };
  }

  function createByteEditor(container, options) {
    var settings = options || {};
    var frame = new Array(DISPLAY_CELLS).fill(0);
    var editor;

    frame[0] = isSegmentByte(settings.value) ? settings.value : 0;
    editor = create(container, {
      label: settings.label || "Seven-segment byte editor",
      frame: frame,
      visibleCellCount: 1,
      onChange: function (nextFrame, detail) {
        if (typeof settings.onChange === "function") {
          settings.onChange(nextFrame[0], detail);
        }
      }
    });

    return {
      getValue: function () {
        return editor.getCellByte(0);
      },
      setValue: function (value) {
        if (!isSegmentByte(value)) return false;
        var nextFrame = editor.getFrame();
        nextFrame[0] = value;
        return editor.setFrame(nextFrame);
      },
      toggleSegment: function (segment) {
        return editor.toggleSegment(segment, 0);
      },
      destroy: editor.destroy
    };
  }

  window.SevenSegDisplayEditor = {
    DISPLAY_COLS: DISPLAY_COLS,
    DISPLAY_ROWS: DISPLAY_ROWS,
    DISPLAY_CELLS: DISPLAY_CELLS,
    SEGMENT_ORDER: SEGMENT_ORDER.slice(),
    SEGMENT_BITS: Object.assign({}, SEGMENT_BITS),
    normalizeFrameBytes: normalizeFrameBytes,
    segmentBit: segmentBit,
    toggleSegmentByte: toggleSegmentByte,
    createFrameState: createFrameState,
    create: create,
    createByteEditor: createByteEditor
  };
}());

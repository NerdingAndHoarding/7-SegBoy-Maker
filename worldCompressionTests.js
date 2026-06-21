(function () {
  "use strict";

  function assert(condition, message) {
    if (!condition) throw new Error(message);
  }

  function equal(actual, expected, message) {
    assert(
      JSON.stringify(actual) === JSON.stringify(expected),
      message + " Expected " + JSON.stringify(expected) +
      ", received " + JSON.stringify(actual) + "."
    );
  }

  function expectThrow(callback, message) {
    var didThrow = false;

    try {
      callback();
    } catch (error) {
      didThrow = true;
    }

    assert(didThrow, message);
  }

  function values(bitsPerCell, pattern) {
    var maximum = (1 << bitsPerCell) - 1;
    var output = [];

    for (var index = 0; index < 24; index += 1) {
      output.push(pattern(index, maximum));
    }

    return output;
  }

  function roundTripAllModes(compression, pattern) {
    [1, 2, 3, 4].forEach(function (bitsPerCell) {
      var cells = values(bitsPerCell, pattern);
      equal(
        compression.unpackPaletteRoom(
          compression.packPaletteRoom(cells, bitsPerCell),
          bitsPerCell
        ),
        cells,
        bitsPerCell + "-bit room did not round-trip."
      );
    });
  }

  function deterministicCells(bitsPerCell) {
    var state = 0x13579BDF;
    var mask = (1 << bitsPerCell) - 1;
    var output = [];

    for (var index = 0; index < 24; index += 1) {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      output.push(state & mask);
    }

    return output;
  }

  function legacyPack3Bit(cells) {
    var output = new Array(9).fill(0);

    cells.forEach(function (glyphIndex, cellIndex) {
      var bitOffset = cellIndex * 3;
      var byteIndex = Math.floor(bitOffset / 8);
      var shift = bitOffset % 8;

      output[byteIndex] |= (glyphIndex << shift) & 0xFF;
      if (shift > 5) output[byteIndex + 1] |= glyphIndex >> (8 - shift);
    });

    return output;
  }

  var tests = [
    {
      name: "Exact byte-count formulas",
      run: function (compression) {
        equal(
          [1, 2, 3, 4].map(compression.paletteRoomByteCount),
          [3, 6, 9, 12],
          "Palette room byte counts differ."
        );
        assert(compression.denseWorldByteCount(26, 32, 1) === 2496,
          "26 x 32 1-bit total is wrong.");
        assert(compression.denseWorldByteCount(26, 32, 2) === 4992,
          "26 x 32 2-bit total is wrong.");
        assert(compression.denseWorldByteCount(26, 32, 3) === 7488,
          "26 x 32 3-bit total is wrong.");
        assert(compression.denseWorldByteCount(26, 32, 4) === 9984,
          "26 x 32 4-bit total is wrong.");
        assert(compression.denseRawWorldByteCount(26, 32) === 19968,
          "26 x 32 raw total is wrong.");
      }
    },
    {
      name: "All-zero rooms",
      run: function (compression) {
        roundTripAllModes(compression, function () { return 0; });
      }
    },
    {
      name: "Maximum-index rooms",
      run: function (compression) {
        roundTripAllModes(compression, function (index, maximum) {
          return maximum;
        });
      }
    },
    {
      name: "Alternating boundary patterns",
      run: function (compression) {
        roundTripAllModes(compression, function (index, maximum) {
          return index % 2 ? maximum : 0;
        });
      }
    },
    {
      name: "Deterministic random patterns",
      run: function (compression) {
        [1, 2, 3, 4].forEach(function (bitsPerCell) {
          var cells = deterministicCells(bitsPerCell);
          equal(
            compression.unpackPaletteRoom(
              compression.packPaletteRoom(cells, bitsPerCell),
              bitsPerCell
            ),
            cells,
            bitsPerCell + "-bit deterministic pattern differs."
          );
        });
      }
    },
    {
      name: "Existing 3-bit byte compatibility",
      run: function (compression) {
        var cells = values(3, function (index) { return (index * 5) % 8; });
        equal(
          compression.packPaletteRoom(cells, 3),
          legacyPack3Bit(cells),
          "The hardware-tested 3-bit layout changed."
        );
      }
    },
    {
      name: "Palette overflow rejection",
      run: function (compression) {
        expectThrow(function () {
          compression.packPaletteRoom(new Array(24).fill(2), 1);
        }, "A 1-bit room accepted palette index 2.");
      }
    },
    {
      name: "Raw segment-byte room",
      run: function (compression) {
        var cells = values(4, function (index) { return index * 11; });
        equal(
          compression.unpackRawRoom(compression.packRawRoom(cells)),
          cells,
          "Raw room did not round-trip."
        );
      }
    },
    {
      name: "Dense room lookup",
      run: function (compression) {
        var first = new Array(24).fill(0);
        var second = deterministicCells(3);
        var packed = compression.packDensePaletteRooms([first, second], 3);
        equal(
          compression.unpackDensePaletteRoom(packed, 1, 3),
          second,
          "Dense room lookup returned the wrong room."
        );
      }
    },
    {
      name: "Sparse mixed-mode lookup",
      run: function (compression) {
        var raw = values(4, function (index) { return index * 9; });
        var special = deterministicCells(2);
        var packed = compression.packSparseRooms([
          { roomIndex: 11, roomType: "special", bitsPerCell: 2, cells: special },
          { roomIndex: 3, roomType: "raw", cells: raw }
        ]);
        var unpacked = compression.unpackSparseRooms(packed);

        assert(unpacked[0].roomIndex === 3 && unpacked[1].roomIndex === 11,
          "Sparse rooms are not sorted by room index.");
        equal(
          compression.findSparseRoom(unpacked, 11).cells,
          special,
          "Sparse special-room lookup failed."
        );
      }
    },
    {
      name: "Dense base with sparse override",
      run: function (compression) {
        var denseRoom = new Array(24).fill(0);
        var overrideRoom = new Array(24).fill(3);
        var packed = compression.packDensePaletteRooms([denseRoom], 2);
        var resolved = compression.resolvePaletteRoom(
          packed,
          2,
          0,
          [{
            roomIndex: 0,
            roomType: "normal",
            bitsPerCell: 2,
            cells: overrideRoom
          }]
        );

        assert(resolved.source === "override", "Dense override was ignored.");
        equal(resolved.cells, overrideRoom, "Dense override cells differ.");
      }
    },
    {
      name: "Dense section membership",
      run: function (compression) {
        var sections = [0, 1, 8, 3, 4, 2, 7];
        var packed = compression.packDenseSectionMembership(sections);

        sections.forEach(function (sectionIndex, roomIndex) {
          assert(
            compression.unpackDenseSectionMembership(packed, roomIndex) ===
              sectionIndex,
            "Dense section lookup differs at room " + roomIndex + "."
          );
        });
      }
    },
    {
      name: "Sparse section membership",
      run: function (compression) {
        var packed = compression.packSparseSectionMembership([
          { roomIndex: 12, sectionIndex: 2 },
          { roomIndex: 4, sectionIndex: 1 }
        ]);

        assert(compression.resolveSparseSection(packed, 4, 0) === 1,
          "Sparse section override was not found.");
        assert(compression.resolveSparseSection(packed, 5, 0) === 0,
          "Default section fallback was not used.");
      }
    },
    {
      name: "Inputs remain unchanged",
      run: function (compression) {
        var cells = deterministicCells(4);
        var entries = [{
          roomIndex: 2,
          roomType: "normal",
          bitsPerCell: 4,
          cells: cells
        }];
        var beforeCells = JSON.stringify(cells);
        var beforeEntries = JSON.stringify(entries);

        compression.packPaletteRoom(cells, 4);
        compression.packSparseRooms(entries);
        assert(JSON.stringify(cells) === beforeCells, "Room cells were mutated.");
        assert(JSON.stringify(entries) === beforeEntries, "Sparse entries were mutated.");
      }
    },
    {
      name: "Malformed data rejection",
      run: function (compression) {
        expectThrow(function () {
          compression.unpackPaletteRoom([0], 3);
        }, "A truncated palette room was accepted.");
        expectThrow(function () {
          compression.unpackSparseRooms([0, 0, 2]);
        }, "A truncated sparse room was accepted.");
        expectThrow(function () {
          compression.packSparseRooms([
            { roomIndex: 1, roomType: "normal", bitsPerCell: 1, cells: new Array(24).fill(0) },
            { roomIndex: 1, roomType: "normal", bitsPerCell: 1, cells: new Array(24).fill(0) }
          ]);
        }, "Duplicate sparse room indexes were accepted.");
      }
    }
  ];

  function run() {
    var compression = window.SevenSegWorldCompression;
    var results = [];

    tests.forEach(function (test) {
      try {
        test.run(compression);
        results.push({ name: test.name, passed: true, message: "Passed" });
      } catch (error) {
        results.push({
          name: test.name,
          passed: false,
          message: error && error.message ? error.message : String(error)
        });
      }
    });

    return results;
  }

  function render(results) {
    var list = document.getElementById("testResults");
    var summary = document.getElementById("summary");
    var passed = results.filter(function (result) {
      return result.passed;
    }).length;

    list.innerHTML = "";
    results.forEach(function (result) {
      var item = document.createElement("li");
      var state = document.createElement("div");
      var detail = document.createElement("div");
      var name = document.createElement("div");
      var message = document.createElement("div");

      item.className = "testResult " + (result.passed ? "pass" : "fail");
      state.className = "testState";
      state.textContent = result.passed ? "PASS" : "FAIL";
      name.className = "testName";
      name.textContent = result.name;
      message.className = "testMessage";
      message.textContent = result.message;
      detail.appendChild(name);
      detail.appendChild(message);
      item.appendChild(state);
      item.appendChild(detail);
      list.appendChild(item);
    });

    summary.className = passed === results.length ? "pass" : "fail";
    summary.textContent = passed + " of " + results.length + " tests passed.";
  }

  function runAndRender() {
    render(run());
  }

  window.SevenSegWorldCompressionTests = {
    run: run
  };

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("runTestsButton").addEventListener("click", runAndRender);
    runAndRender();
  });
}());

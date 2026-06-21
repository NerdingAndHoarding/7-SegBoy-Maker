(function (root) {
  "use strict";

  var ROOM_CELLS = 24;
  var PALETTE_BITS = [1, 2, 3, 4];
  var SPARSE_HEADER_NORMAL = 0x00;
  var SPARSE_HEADER_SPECIAL = 0x08;
  var SPARSE_HEADER_RAW = 0x04;

  function fail(message) {
    throw new Error(message);
  }

  function integer(value, label) {
    var number = Number(value);

    if (!Number.isInteger(number)) {
      fail(label + " must be an integer.");
    }

    return number;
  }

  function bits(value) {
    var result = integer(value, "bitsPerCell");

    if (PALETTE_BITS.indexOf(result) === -1) {
      fail("bitsPerCell must be 1, 2, 3, or 4.");
    }

    return result;
  }

  function byte(value, label) {
    var result = integer(value, label);

    if (result < 0 || result > 255) {
      fail(label + " must be from 0 to 255.");
    }

    return result;
  }

  function roomIndex(value) {
    var result = integer(value, "roomIndex");

    if (result < 0 || result > 65535) {
      fail("roomIndex must be from 0 to 65535.");
    }

    return result;
  }

  function roomArray(value, label) {
    if (!Array.isArray(value) && !(value instanceof Uint8Array)) {
      fail(label + " must be an array.");
    }

    if (value.length !== ROOM_CELLS) {
      fail(label + " must contain exactly 24 cells.");
    }

    return Array.prototype.slice.call(value);
  }

  function paletteCapacity(bitsPerCell) {
    return 1 << bits(bitsPerCell);
  }

  function paletteRoomByteCount(bitsPerCell) {
    return Math.ceil(ROOM_CELLS * bits(bitsPerCell) / 8);
  }

  function rawRoomByteCount() {
    return ROOM_CELLS;
  }

  function paletteStorageByteCount(paletteLength) {
    var count = integer(paletteLength, "paletteLength");

    if (count < 0 || count > 16) {
      fail("paletteLength must be from 0 to 16.");
    }

    return count + Math.ceil(count / 8);
  }

  function denseWorldByteCount(width, height, bitsPerCell) {
    var safeWidth = integer(width, "width");
    var safeHeight = integer(height, "height");

    if (safeWidth < 1 || safeWidth > 26) fail("width must be from 1 to 26.");
    if (safeHeight < 1 || safeHeight > 32) fail("height must be from 1 to 32.");

    return safeWidth * safeHeight * paletteRoomByteCount(bitsPerCell);
  }

  function denseRawWorldByteCount(width, height) {
    var safeWidth = integer(width, "width");
    var safeHeight = integer(height, "height");

    if (safeWidth < 1 || safeWidth > 26) fail("width must be from 1 to 26.");
    if (safeHeight < 1 || safeHeight > 32) fail("height must be from 1 to 32.");

    return safeWidth * safeHeight * ROOM_CELLS;
  }

  function packPaletteRoom(cells, bitsPerCell) {
    var safeBits = bits(bitsPerCell);
    var values = roomArray(cells, "cells");
    var capacity = 1 << safeBits;
    var output = new Array(paletteRoomByteCount(safeBits)).fill(0);

    values.forEach(function (value, cellIndex) {
      var glyphIndex = integer(value, "cells[" + cellIndex + "]");

      if (glyphIndex < 0 || glyphIndex >= capacity) {
        fail(
          "cells[" + cellIndex + "] exceeds the " + safeBits +
          "-bit palette capacity."
        );
      }

      var bitOffset = cellIndex * safeBits;
      var byteIndex = Math.floor(bitOffset / 8);
      var shift = bitOffset % 8;

      output[byteIndex] |= (glyphIndex << shift) & 0xFF;
      if (shift + safeBits > 8) {
        output[byteIndex + 1] |= glyphIndex >> (8 - shift);
      }
    });

    return output;
  }

  function unpackPaletteRoom(packedBytes, bitsPerCell) {
    var safeBits = bits(bitsPerCell);
    var expectedBytes = paletteRoomByteCount(safeBits);

    if (!Array.isArray(packedBytes) && !(packedBytes instanceof Uint8Array)) {
      fail("packedBytes must be an array.");
    }
    if (packedBytes.length !== expectedBytes) {
      fail("packedBytes must contain exactly " + expectedBytes + " bytes.");
    }

    var packed = Array.prototype.map.call(packedBytes, function (value, index) {
      return byte(value, "packedBytes[" + index + "]");
    });
    var mask = (1 << safeBits) - 1;
    var output = [];

    for (var cellIndex = 0; cellIndex < ROOM_CELLS; cellIndex += 1) {
      var bitOffset = cellIndex * safeBits;
      var byteIndex = Math.floor(bitOffset / 8);
      var shift = bitOffset % 8;
      var value = packed[byteIndex] >> shift;

      if (shift + safeBits > 8) {
        value |= packed[byteIndex + 1] << (8 - shift);
      }

      output.push(value & mask);
    }

    return output;
  }

  function packRawRoom(cells) {
    return roomArray(cells, "cells").map(function (value, index) {
      return byte(value, "cells[" + index + "]");
    });
  }

  function unpackRawRoom(packedBytes) {
    return packRawRoom(packedBytes);
  }

  function packDensePaletteRooms(rooms, bitsPerCell) {
    if (!Array.isArray(rooms)) fail("rooms must be an array.");

    return rooms.reduce(function (output, cells) {
      return output.concat(packPaletteRoom(cells, bitsPerCell));
    }, []);
  }

  function unpackDensePaletteRoom(packedBytes, targetRoomIndex, bitsPerCell) {
    var safeIndex = roomIndex(targetRoomIndex);
    var bytesPerRoom = paletteRoomByteCount(bitsPerCell);
    var start = safeIndex * bytesPerRoom;

    if (!Array.isArray(packedBytes) && !(packedBytes instanceof Uint8Array)) {
      fail("packedBytes must be an array.");
    }
    if (start + bytesPerRoom > packedBytes.length) {
      fail("roomIndex is outside the dense room data.");
    }

    return unpackPaletteRoom(
      Array.prototype.slice.call(packedBytes, start, start + bytesPerRoom),
      bitsPerCell
    );
  }

  function modeCode(bitsPerCell) {
    return bits(bitsPerCell) - 1;
  }

  function bitsFromModeCode(code) {
    if (code < 0 || code > 3) fail("Sparse palette mode is invalid.");
    return code + 1;
  }

  function normalizedSparseEntry(entry) {
    var source = entry && typeof entry === "object" ? entry : {};
    var type = source.roomType || "normal";
    var index = roomIndex(source.roomIndex);

    if (type === "raw") {
      return {
        roomIndex: index,
        roomType: "raw",
        bitsPerCell: null,
        cells: packRawRoom(source.cells)
      };
    }
    if (type !== "normal" && type !== "special") {
      fail("Sparse roomType must be normal, special, or raw.");
    }

    var safeBits = bits(source.bitsPerCell);
    return {
      roomIndex: index,
      roomType: type,
      bitsPerCell: safeBits,
      cells: roomArray(source.cells, "cells")
    };
  }

  function normalizeSparseEntries(entries) {
    if (!Array.isArray(entries)) fail("entries must be an array.");

    var normalized = entries.map(normalizedSparseEntry).sort(function (a, b) {
      return a.roomIndex - b.roomIndex;
    });

    for (var index = 1; index < normalized.length; index += 1) {
      if (normalized[index - 1].roomIndex === normalized[index].roomIndex) {
        fail("Sparse room indexes must be unique.");
      }
    }

    return normalized;
  }

  function sparseRoomEntryByteCount(entry) {
    var normalized = normalizedSparseEntry(entry);
    return 3 + (
      normalized.roomType === "raw" ?
        rawRoomByteCount() :
        paletteRoomByteCount(normalized.bitsPerCell)
    );
  }

  function sparseRoomByteCount(entries) {
    return normalizeSparseEntries(entries).reduce(function (total, entry) {
      return total + sparseRoomEntryByteCount(entry);
    }, 0);
  }

  function packSparseRooms(entries) {
    var output = [];

    normalizeSparseEntries(entries).forEach(function (entry) {
      var header;
      var payload;

      if (entry.roomType === "raw") {
        header = SPARSE_HEADER_RAW;
        payload = packRawRoom(entry.cells);
      } else {
        header = modeCode(entry.bitsPerCell);
        if (entry.roomType === "special") header |= SPARSE_HEADER_SPECIAL;
        payload = packPaletteRoom(entry.cells, entry.bitsPerCell);
      }

      output.push(entry.roomIndex & 0xFF);
      output.push((entry.roomIndex >> 8) & 0xFF);
      output.push(header);
      output = output.concat(payload);
    });

    return output;
  }

  function unpackSparseRooms(packedBytes) {
    if (!Array.isArray(packedBytes) && !(packedBytes instanceof Uint8Array)) {
      fail("packedBytes must be an array.");
    }

    var packed = Array.prototype.map.call(packedBytes, function (value, index) {
      return byte(value, "packedBytes[" + index + "]");
    });
    var entries = [];
    var offset = 0;

    while (offset < packed.length) {
      if (offset + 3 > packed.length) fail("Sparse room header is truncated.");

      var index = packed[offset] | (packed[offset + 1] << 8);
      var header = packed[offset + 2];
      var isRaw = (header & SPARSE_HEADER_RAW) !== 0;
      var isSpecial = (header & SPARSE_HEADER_SPECIAL) !== 0;
      var safeBits = isRaw ? null : bitsFromModeCode(header & 0x03);
      var payloadBytes = isRaw ?
        rawRoomByteCount() :
        paletteRoomByteCount(safeBits);
      var payloadStart = offset + 3;
      var payloadEnd = payloadStart + payloadBytes;

      if (payloadEnd > packed.length) fail("Sparse room payload is truncated.");

      entries.push({
        roomIndex: index,
        roomType: isRaw ? "raw" : (isSpecial ? "special" : "normal"),
        bitsPerCell: safeBits,
        cells: isRaw ?
          unpackRawRoom(packed.slice(payloadStart, payloadEnd)) :
          unpackPaletteRoom(packed.slice(payloadStart, payloadEnd), safeBits)
      });
      offset = payloadEnd;
    }

    return normalizeSparseEntries(entries);
  }

  function findSparseRoom(entries, targetRoomIndex) {
    var normalized = normalizeSparseEntries(entries);
    var target = roomIndex(targetRoomIndex);
    var low = 0;
    var high = normalized.length - 1;

    while (low <= high) {
      var middle = Math.floor((low + high) / 2);
      var entry = normalized[middle];

      if (entry.roomIndex === target) return entry;
      if (entry.roomIndex < target) low = middle + 1;
      else high = middle - 1;
    }

    return null;
  }

  function resolvePaletteRoom(denseBytes, bitsPerCell, targetRoomIndex, overrides) {
    var override = findSparseRoom(overrides || [], targetRoomIndex);

    if (override) {
      return {
        source: "override",
        roomType: override.roomType,
        bitsPerCell: override.bitsPerCell,
        cells: override.cells.slice()
      };
    }

    return {
      source: "dense",
      roomType: "normal",
      bitsPerCell: bits(bitsPerCell),
      cells: unpackDensePaletteRoom(denseBytes, targetRoomIndex, bitsPerCell)
    };
  }

  function denseSectionMembershipByteCount(roomCount) {
    var count = integer(roomCount, "roomCount");
    if (count < 0) fail("roomCount cannot be negative.");
    return Math.ceil(count / 2);
  }

  function sparseSectionMembershipByteCount(nonDefaultCoordinateCount) {
    var count = integer(nonDefaultCoordinateCount, "nonDefaultCoordinateCount");
    if (count < 0) fail("nonDefaultCoordinateCount cannot be negative.");
    return count * 3;
  }

  function packDenseSectionMembership(sectionIndexes) {
    if (!Array.isArray(sectionIndexes)) fail("sectionIndexes must be an array.");

    var output = new Array(
      denseSectionMembershipByteCount(sectionIndexes.length)
    ).fill(0);

    sectionIndexes.forEach(function (value, index) {
      var sectionIndex = integer(value, "sectionIndexes[" + index + "]");

      if (sectionIndex < 0 || sectionIndex > 8) {
        fail("sectionIndexes[" + index + "] must be from 0 to 8.");
      }

      if (index % 2 === 0) output[Math.floor(index / 2)] |= sectionIndex;
      else output[Math.floor(index / 2)] |= sectionIndex << 4;
    });

    return output;
  }

  function unpackDenseSectionMembership(packedBytes, targetRoomIndex) {
    var target = roomIndex(targetRoomIndex);
    var byteIndex = Math.floor(target / 2);

    if (!Array.isArray(packedBytes) && !(packedBytes instanceof Uint8Array)) {
      fail("packedBytes must be an array.");
    }
    if (byteIndex >= packedBytes.length) {
      fail("roomIndex is outside the section membership data.");
    }

    var packed = byte(packedBytes[byteIndex], "packedBytes[" + byteIndex + "]");
    return target % 2 === 0 ? packed & 0x0F : (packed >> 4) & 0x0F;
  }

  function packSparseSectionMembership(entries) {
    if (!Array.isArray(entries)) fail("entries must be an array.");

    var normalized = entries.map(function (entry) {
      var source = entry && typeof entry === "object" ? entry : {};
      var sectionIndex = integer(source.sectionIndex, "sectionIndex");

      if (sectionIndex < 0 || sectionIndex > 8) {
        fail("sectionIndex must be from 0 to 8.");
      }

      return {
        roomIndex: roomIndex(source.roomIndex),
        sectionIndex: sectionIndex
      };
    }).sort(function (a, b) {
      return a.roomIndex - b.roomIndex;
    });
    var output = [];

    normalized.forEach(function (entry, index) {
      if (index && normalized[index - 1].roomIndex === entry.roomIndex) {
        fail("Sparse section room indexes must be unique.");
      }

      output.push(entry.roomIndex & 0xFF);
      output.push((entry.roomIndex >> 8) & 0xFF);
      output.push(entry.sectionIndex);
    });

    return output;
  }

  function resolveSparseSection(packedBytes, targetRoomIndex, defaultSectionIndex) {
    var fallback = integer(defaultSectionIndex, "defaultSectionIndex");
    var target = roomIndex(targetRoomIndex);

    if (fallback < 0 || fallback > 8) {
      fail("defaultSectionIndex must be from 0 to 8.");
    }
    if (!Array.isArray(packedBytes) && !(packedBytes instanceof Uint8Array)) {
      fail("packedBytes must be an array.");
    }
    if (packedBytes.length % 3 !== 0) {
      fail("Sparse section membership data must use 3-byte entries.");
    }

    for (var offset = 0; offset < packedBytes.length; offset += 3) {
      var index = byte(packedBytes[offset], "packedBytes[" + offset + "]") |
        (byte(packedBytes[offset + 1], "packedBytes[" + (offset + 1) + "]") << 8);
      var sectionIndex = byte(
        packedBytes[offset + 2],
        "packedBytes[" + (offset + 2) + "]"
      );

      if (index === target) return sectionIndex;
      if (index > target) break;
    }

    return fallback;
  }

  root.SevenSegWorldCompression = {
    ROOM_CELLS: ROOM_CELLS,
    PALETTE_BITS: PALETTE_BITS.slice(),
    paletteCapacity: paletteCapacity,
    paletteRoomByteCount: paletteRoomByteCount,
    rawRoomByteCount: rawRoomByteCount,
    paletteStorageByteCount: paletteStorageByteCount,
    denseWorldByteCount: denseWorldByteCount,
    denseRawWorldByteCount: denseRawWorldByteCount,
    packPaletteRoom: packPaletteRoom,
    unpackPaletteRoom: unpackPaletteRoom,
    packRawRoom: packRawRoom,
    unpackRawRoom: unpackRawRoom,
    packDensePaletteRooms: packDensePaletteRooms,
    unpackDensePaletteRoom: unpackDensePaletteRoom,
    sparseRoomEntryByteCount: sparseRoomEntryByteCount,
    sparseRoomByteCount: sparseRoomByteCount,
    packSparseRooms: packSparseRooms,
    unpackSparseRooms: unpackSparseRooms,
    findSparseRoom: findSparseRoom,
    resolvePaletteRoom: resolvePaletteRoom,
    denseSectionMembershipByteCount: denseSectionMembershipByteCount,
    sparseSectionMembershipByteCount: sparseSectionMembershipByteCount,
    packDenseSectionMembership: packDenseSectionMembership,
    unpackDenseSectionMembership: unpackDenseSectionMembership,
    packSparseSectionMembership: packSparseSectionMembership,
    resolveSparseSection: resolveSparseSection
  };
}(typeof window !== "undefined" ? window : this));

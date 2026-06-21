(function () {
  "use strict";

  var DISPLAY_WIDTH = 8;
  var DISPLAY_HEIGHT = 3;
  var DISPLAY_CELLS = 24;
  var SEGMENT_BYTES_ENCODING = "segment-bytes-v1";
  var GLYPH_REFS_ENCODING = "glyph-refs-v1";
  var GLYPH_BEHAVIOR_LABELS = [
    "decorative",
    "blocking",
    "animated",
    "interactive"
  ];

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function cloneJson(value) {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
  }

  function isSegmentByte(value) {
    return Number.isInteger(value) && value >= 0 && value <= 255;
  }

  function createGlyph(id, name, segmentByte) {
    return {
      id: String(id || "glyph_new"),
      name: String(name || "New glyph"),
      segmentByte: isSegmentByte(segmentByte) ? segmentByte : 0,
      tags: [],
      editor: {
        notes: ""
      }
    };
  }

  function createFrame(id, name, encoding) {
    var frameEncoding = encoding === GLYPH_REFS_ENCODING ?
      GLYPH_REFS_ENCODING :
      SEGMENT_BYTES_ENCODING;

    return {
      id: String(id || "frame_new"),
      name: String(name || "New frame"),
      width: DISPLAY_WIDTH,
      height: DISPLAY_HEIGHT,
      encoding: frameEncoding,
      cells: frameEncoding === GLYPH_REFS_ENCODING ?
        new Array(DISPLAY_CELLS).fill("") :
        new Array(DISPLAY_CELLS).fill(0),
      tags: [],
      editor: {
        notes: ""
      },
      dataVersion: 1,
      data: {}
    };
  }

  function createAnimation(id, name) {
    return {
      id: String(id || "anim_new"),
      name: String(name || "New animation"),
      frameIds: [],
      frameDurationMs: 140,
      loop: true,
      editor: {
        notes: ""
      },
      dataVersion: 1,
      data: {}
    };
  }

  function validateGlyph(glyph, path) {
    var errors = [];
    var label = path || "glyph";

    if (!isPlainObject(glyph)) {
      return [label + " must be an object."];
    }
    if (typeof glyph.name !== "string" || !glyph.name.trim()) {
      errors.push(label + ".name must be a non-empty string.");
    }
    if (!isSegmentByte(glyph.segmentByte)) {
      errors.push(label + ".segmentByte must be a byte from 0 through 255.");
    }
    if (!Array.isArray(glyph.tags)) {
      errors.push(label + ".tags must be an array.");
    } else {
      glyph.tags.forEach(function (tag, index) {
        if (GLYPH_BEHAVIOR_LABELS.indexOf(tag) === -1) {
          errors.push(
            label + ".tags[" + index + "] must be decorative, blocking, animated, or interactive."
          );
        }
      });
    }
    if (glyph.editor !== undefined && !isPlainObject(glyph.editor)) {
      errors.push(label + ".editor must be an object when present.");
    }

    return errors;
  }

  function validateFrame(frame, path) {
    var errors = [];
    var label = path || "frame";

    if (!isPlainObject(frame)) {
      return [label + " must be an object."];
    }
    if (typeof frame.name !== "string" || !frame.name.trim()) {
      errors.push(label + ".name must be a non-empty string.");
    }
    if (frame.width !== DISPLAY_WIDTH || frame.height !== DISPLAY_HEIGHT) {
      errors.push(label + " must have width 8 and height 3.");
    }
    if (frame.encoding !== SEGMENT_BYTES_ENCODING &&
        frame.encoding !== GLYPH_REFS_ENCODING) {
      errors.push(label + ".encoding is not supported.");
      return errors;
    }
    if (!Array.isArray(frame.cells) || frame.cells.length !== DISPLAY_CELLS) {
      errors.push(label + ".cells must contain exactly 24 values.");
      return errors;
    }

    frame.cells.forEach(function (value, index) {
      if (frame.encoding === SEGMENT_BYTES_ENCODING && !isSegmentByte(value)) {
        errors.push(label + ".cells[" + index + "] must be a byte.");
      }
      if (frame.encoding === GLYPH_REFS_ENCODING &&
          (typeof value !== "string" || !value)) {
        errors.push(label + ".cells[" + index + "] must be a glyph ID.");
      }
    });

    if (frame.editor !== undefined && !isPlainObject(frame.editor)) {
      errors.push(label + ".editor must be an object when present.");
    }

    return errors;
  }

  function validateAnimation(animation, path) {
    var errors = [];
    var label = path || "animation";

    if (!isPlainObject(animation)) {
      return [label + " must be an object."];
    }
    if (typeof animation.name !== "string" || !animation.name.trim()) {
      errors.push(label + ".name must be a non-empty string.");
    }
    if (!Array.isArray(animation.frameIds) || animation.frameIds.length === 0) {
      errors.push(label + ".frameIds must contain at least one frame ID.");
    } else {
      animation.frameIds.forEach(function (frameId, index) {
        if (typeof frameId !== "string" || !frameId) {
          errors.push(label + ".frameIds[" + index + "] must be a frame ID.");
        }
      });
    }
    if (!Number.isInteger(animation.frameDurationMs) ||
        animation.frameDurationMs < 1 ||
        animation.frameDurationMs > 60000) {
      errors.push(label + ".frameDurationMs must be an integer from 1 through 60000.");
    }
    if (typeof animation.loop !== "boolean") {
      errors.push(label + ".loop must be true or false.");
    }
    if (animation.editor !== undefined && !isPlainObject(animation.editor)) {
      errors.push(label + ".editor must be an object when present.");
    }

    return errors;
  }

  function normalizeFrame(frame) {
    if (validateFrame(frame).length) {
      return null;
    }

    return cloneJson(frame);
  }

  function indexById(values) {
    var result = {};

    (Array.isArray(values) ? values : []).forEach(function (entry) {
      if (isPlainObject(entry) && typeof entry.id === "string" && !result[entry.id]) {
        result[entry.id] = entry;
      }
    });

    return result;
  }

  function findMissingVisualReferences(project) {
    var errors = [];
    var glyphs = indexById(project && project.glyphs);
    var frames = indexById(project && project.frames);

    (project && Array.isArray(project.frames) ? project.frames : []).forEach(function (frame, frameIndex) {
      if (!isPlainObject(frame) || frame.encoding !== GLYPH_REFS_ENCODING ||
          !Array.isArray(frame.cells)) {
        return;
      }

      frame.cells.forEach(function (glyphId, cellIndex) {
        if (typeof glyphId === "string" && glyphId && !glyphs[glyphId]) {
          errors.push(
            "frames[" + frameIndex + "].cells[" + cellIndex +
            "] references missing ID " + glyphId + "."
          );
        }
      });
    });

    (project && Array.isArray(project.animations) ? project.animations : []).forEach(
      function (animation, animationIndex) {
        if (!isPlainObject(animation) || !Array.isArray(animation.frameIds)) return;

        animation.frameIds.forEach(function (frameId, frameIndex) {
          if (typeof frameId === "string" && frameId && !frames[frameId]) {
            errors.push(
              "animations[" + animationIndex + "].frameIds[" + frameIndex +
              "] references missing ID " + frameId + "."
            );
          }
        });
      }
    );

    return errors;
  }

  function validateProjectVisualAssets(project, checkReferences) {
    var errors = [];

    (project && Array.isArray(project.glyphs) ? project.glyphs : []).forEach(
      function (glyph, index) {
        errors = errors.concat(validateGlyph(glyph, "glyphs[" + index + "]"));
      }
    );
    (project && Array.isArray(project.frames) ? project.frames : []).forEach(
      function (frame, index) {
        errors = errors.concat(validateFrame(frame, "frames[" + index + "]"));
      }
    );
    (project && Array.isArray(project.animations) ? project.animations : []).forEach(
      function (animation, index) {
        errors = errors.concat(validateAnimation(animation, "animations[" + index + "]"));
      }
    );

    if (checkReferences !== false) {
      errors = errors.concat(findMissingVisualReferences(project));
    }

    return errors;
  }

  function resolveFrame(frame, glyphs) {
    var errors = validateFrame(frame);
    var glyphIndex;
    var cells;

    if (errors.length) {
      return {
        ok: false,
        cells: null,
        errors: errors
      };
    }

    if (frame.encoding === SEGMENT_BYTES_ENCODING) {
      return {
        ok: true,
        cells: frame.cells.slice(),
        errors: []
      };
    }

    glyphIndex = indexById(glyphs);
    cells = frame.cells.map(function (glyphId, index) {
      if (!glyphIndex[glyphId]) {
        errors.push("frame.cells[" + index + "] references missing ID " + glyphId + ".");
        return 0;
      }
      if (!isSegmentByte(glyphIndex[glyphId].segmentByte)) {
        errors.push("Glyph " + glyphId + " has an invalid segment byte.");
        return 0;
      }
      return glyphIndex[glyphId].segmentByte;
    });

    return {
      ok: errors.length === 0,
      cells: errors.length ? null : cells,
      errors: errors
    };
  }

  function estimateRawAssetBytes(project) {
    var glyphBytes = Array.isArray(project && project.glyphs) ? project.glyphs.length : 0;
    var frameBytes = 0;
    var animationBytes = 0;

    (project && Array.isArray(project.frames) ? project.frames : []).forEach(function (frame) {
      if (isPlainObject(frame) && Array.isArray(frame.cells) &&
          frame.cells.length === DISPLAY_CELLS) {
        frameBytes += DISPLAY_CELLS;
      }
    });

    (project && Array.isArray(project.animations) ? project.animations : []).forEach(
      function (animation) {
        if (!isPlainObject(animation)) return;
        animationBytes += (Array.isArray(animation.frameIds) ? animation.frameIds.length * 2 : 0);
        animationBytes += 3;
      }
    );

    return {
      glyphBytes: glyphBytes,
      frameBytes: frameBytes,
      animationBytes: animationBytes,
      totalBytes: glyphBytes + frameBytes + animationBytes,
      note: "Raw logical estimate before PROGMEM packing, deduplication, or world compression."
    };
  }

  function cloneVisualAssets(project) {
    return {
      glyphs: cloneJson(project && Array.isArray(project.glyphs) ? project.glyphs : []),
      frames: cloneJson(project && Array.isArray(project.frames) ? project.frames : []),
      animations: cloneJson(project && Array.isArray(project.animations) ? project.animations : [])
    };
  }

  window.SevenSegVisualAssets = {
    DISPLAY_WIDTH: DISPLAY_WIDTH,
    DISPLAY_HEIGHT: DISPLAY_HEIGHT,
    DISPLAY_CELLS: DISPLAY_CELLS,
    SEGMENT_BYTES_ENCODING: SEGMENT_BYTES_ENCODING,
    GLYPH_REFS_ENCODING: GLYPH_REFS_ENCODING,
    GLYPH_BEHAVIOR_LABELS: GLYPH_BEHAVIOR_LABELS.slice(),
    isSegmentByte: isSegmentByte,
    createGlyph: createGlyph,
    createFrame: createFrame,
    createAnimation: createAnimation,
    validateGlyph: validateGlyph,
    validateFrame: validateFrame,
    validateAnimation: validateAnimation,
    normalizeFrame: normalizeFrame,
    findMissingVisualReferences: findMissingVisualReferences,
    validateProjectVisualAssets: validateProjectVisualAssets,
    resolveFrame: resolveFrame,
    estimateRawAssetBytes: estimateRawAssetBytes,
    cloneVisualAssets: cloneVisualAssets
  };
}());

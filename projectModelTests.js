(function () {
  "use strict";

  var EXPECTED_ROOT_FIELDS = [
    "format",
    "schemaVersion",
    "project",
    "hardwareProfileId",
    "settings",
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
    "battleRules",
    "texts",
    "eventGraph",
    "music",
    "soundEffects",
    "gameFlow",
    "saveData",
    "editor",
    "extensions"
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function includesMessage(messages, text) {
    return messages.some(function (message) {
      return message.indexOf(text) !== -1;
    });
  }

  function minimalV2(model) {
    return {
      format: "sevenseg-quest-project",
      schemaVersion: 2,
      project: {
        id: "project_minimal",
        title: "Minimal",
        createdAt: "2026-06-14T00:00:00.000Z",
        modifiedAt: "2026-06-14T00:00:00.000Z",
        license: "AGPL-3.0"
      },
      hardwareProfileId: model.OFFICIAL_HARDWARE_PROFILE_ID
    };
  }

  function migrationSource() {
    return {
      title: "Migration Test",
      displayTestText: "QUEST",
      rooms: [
        {
          x: 0,
          y: 0,
          frame: "A                       "
        },
        {
          x: 1,
          y: 0,
          frame: "#                       "
        }
      ],
      start: {
        roomX: 1,
        roomY: 0,
        playerX: 3,
        playerY: 2
      },
      battle: {
        playerHp: 77,
        beastHp: 44,
        playerAttack: 12,
        playerHeal: 33
      },
      hardware: {
        transitionAnimationMs: 750,
        showCoordinates: false,
        coordinateTimeMs: 1200
      },
      futureEditorData: {
        authorNote: "preserve me"
      }
    };
  }

  var tests = [
    {
      name: "Minimal v2 construction",
      run: function (model) {
        var validation = model.validateProjectV2(minimalV2(model));

        assert(validation.errors.length === 0, validation.errors.join(" "));
        assert(validation.project.format === model.PROJECT_FORMAT_V2, "Format was not retained.");
        assert(validation.project.schemaVersion === 2, "Schema version was not retained.");
        assert(Array.isArray(validation.project.rooms), "Missing arrays were not constructed.");
        assert(validation.project.gameFlow.dataVersion === 1, "Versioned data was not constructed.");
      }
    },
    {
      name: "Full-shape v2 project",
      run: function (model) {
        var project = model.createDefaultProjectV2();
        var validation = model.validateProjectV2(project);
        var missing = EXPECTED_ROOT_FIELDS.filter(function (field) {
          return !Object.prototype.hasOwnProperty.call(project, field);
        });

        assert(missing.length === 0, "Missing documented root fields: " + missing.join(", "));
        assert(validation.errors.length === 0, validation.errors.join(" "));
        assert(project.rooms.length >= 2, "Full-shape project needs its reference rooms.");
        assert(project.heroes.length >= 1 && project.enemies.length >= 1,
          "Full-shape project needs hero and enemy definitions.");
      }
    },
    {
      name: "Minimal RPG starter defaults",
      run: function (model) {
        var project = model.createDefaultProjectV2();
        var validation = model.validateProjectV2(project);
        var sectionIds = project.worlds[0].sectionIds;
        var sectionOne = project.sections.filter(function (section) {
          return section.id === "section_one";
        })[0];
        var sectionTwo = project.sections.filter(function (section) {
          return section.id === "section_two";
        })[0];
        var minimal = project.gameFlow.data.minimalRpg;
        var chests = minimal.chests;
        var gate = minimal.gates[0];
        var goldChests = chests.filter(function (chest) {
          return chest.lootKind === "gold10";
        });
        var saveFieldIds = project.saveData.stateFields.map(function (field) {
          return field.id;
        });
        var savePayloadBytes = project.saveData.stateFields.reduce(function (sum, field) {
          return sum + Number(field.byteCount || 0);
        }, 0);

        assert(validation.errors.length === 0, validation.errors.join(" "));
        assert(sectionIds.length === 2 &&
          sectionIds.indexOf("section_one") !== -1 &&
          sectionIds.indexOf("section_two") !== -1,
          "Starter project needs exactly two authored sections.");
        assert(project.enemies.some(function (enemy) { return enemy.id === "enemy_gob"; }),
          "Starter project needs the section-one enemy.");
        assert(project.enemies.some(function (enemy) {
          return enemy.id === "enemy_final_boss" && enemy.data.finalBoss === true;
        }), "Starter project needs the final boss enemy.");
        assert(project.items.some(function (item) {
          return item.id === "item_potion" && item.data.healAmount === 10;
        }), "Starter project needs a +10HP potion.");
        assert(project.worlds[0].width === 5 && project.worlds[0].height === 5,
          "Starter world should be the larger 5 x 5 beta layout.");
        assert(sectionOne && sectionOne.roomIds.length === 23,
          "Section 1 should be 5 x 5 minus the two bottom-right boss rooms.");
        assert(sectionTwo && sectionTwo.roomIds.length === 2,
          "Section 2 should remain the two-room boss section.");
        assert(gate && gate.fromRoomId === "room_d04" && gate.toRoomId === "room_e04",
          "Starter gate should sit at the bottom-right section boundary.");
        assert(project.equipment.some(function (equipment) {
          return equipment.id === "equipment_sword" &&
            equipment.itemId === "item_sword" &&
            equipment.data.attackPowerBonus > 0;
        }), "Starter project needs a sword attack bonus.");
        assert(project.texts.some(function (text) {
          return text.id === "text_key_obtained" &&
            text.text === "You now hold the anchent key";
        }), "Starter project needs the key text.");
        assert(project.texts.some(function (text) {
          return text.id === "text_ending" &&
            text.text === "You have saved the world, Thank you.";
        }), "Starter project needs the ending text.");
        assert(chests.length === 8, "Starter project needs eight section-one chests.");
        assert(goldChests.length === 4, "Half of the starter chests should contain 10 Gold.");
        assert(minimal.flags.hasAncientKey === false &&
          minimal.flags.bossDefeated === false,
          "Starter story flags should begin false.");
        assert(saveFieldIds.indexOf("hero_current_hp") !== -1 &&
          saveFieldIds.indexOf("hero_max_hp") !== -1 &&
          saveFieldIds.indexOf("hero_level") !== -1 &&
          saveFieldIds.indexOf("potion_count") !== -1 &&
          saveFieldIds.indexOf("equipment_flags") !== -1 &&
          saveFieldIds.indexOf("chest_flags") !== -1,
          "Starter save fields need minimal RPG progress state.");
        assert(savePayloadBytes === 17 &&
          project.saveData.data.totalEepromBytes === 67,
          "Minimal RPG EEPROM save contract should be 17 bytes per slot, 67 bytes total.");
      }
    },
    {
      name: "JSON stringify and parse round-trip",
      run: function (model) {
        var source = model.createDefaultProjectV2();
        var parsed = JSON.parse(JSON.stringify(source));
        var validation = model.validateProjectV2(parsed);

        assert(validation.errors.length === 0, validation.errors.join(" "));
        assert(JSON.stringify(parsed) === JSON.stringify(source),
          "JSON round-trip changed authored project data.");
      }
    },
    {
      name: "V1 to v2 migration",
      run: function (model) {
        var source = migrationSource();
        var migration = model.migrateProjectV1ToV2(source);

        assert(migration.errors.length === 0, migration.errors.join(" "));
        assert(model.detectProjectVersion(migration.project) === 2, "Migrated project is not v2.");
        assert(migration.project.title === source.title, "Title was not preserved.");
        assert(migration.project.displayTestText === source.displayTestText, "Text was not preserved.");
        assert(migration.project.rooms.length === 2, "Rooms were not preserved.");
        assert(migration.project.start.roomX === 1 && migration.project.start.playerX === 3,
          "Start position was not preserved.");
        assert(migration.project.battle.playerHp === 77 &&
          migration.project.battle.beastHp === 44, "Battle values were not preserved.");
        assert(migration.project.hardware.transitionAnimationMs === 750 &&
          migration.project.hardware.showCoordinates === false, "Hardware settings were not preserved.");
        assert(migration.migrationReport.mappings.length > 0, "Migration report has no mappings.");
      }
    },
    {
      name: "Duplicate ID rejection",
      run: function (model) {
        var project = model.createDefaultProjectV2();
        project.frames[0].id = project.heroes[0].id;
        var validation = model.validateProjectV2(project);

        assert(includesMessage(validation.errors, "Duplicate ID"),
          "Duplicate ID was not reported.");
      }
    },
    {
      name: "Missing reference rejection",
      run: function (model) {
        var project = model.createDefaultProjectV2();
        project.gameFlow.startingRoomId = "room_missing";
        var validation = model.validateProjectV2(project);

        assert(includesMessage(validation.errors, "references missing ID room_missing"),
          "Missing room reference was not reported.");
      }
    },
    {
      name: "Invalid schemaVersion rejection",
      run: function (model) {
        var project = model.createDefaultProjectV2();
        project.schemaVersion = 99;
        var validation = model.validateProjectV2(project);

        assert(model.detectProjectVersion(project) === -1,
          "Unsupported explicit schema version was not detected.");
        assert(validation.errors.length > 0, "Invalid schemaVersion was accepted.");
      }
    },
    {
      name: "Unknown-field preservation",
      run: function (model) {
        var project = model.createDefaultProjectV2();
        project.futureFeature = {
          enabled: true,
          value: 42
        };
        var validation = model.validateProjectV2(project);

        assert(validation.errors.length === 0, validation.errors.join(" "));
        assert(validation.project.extensions.unrecognizedTopLevel.futureFeature.value === 42,
          "Unknown v2 field was not preserved.");

        var migration = model.migrateProjectV1ToV2(migrationSource());
        assert(migration.project.migration.preservedLegacyData.futureEditorData.authorNote ===
          "preserve me", "Unknown v1 field was not preserved.");
      }
    },
    {
      name: "Input non-mutation",
      run: function (model) {
        var v2 = model.createDefaultProjectV2();
        var v2Before = JSON.stringify(v2);
        var v1 = migrationSource();
        var v1Before = JSON.stringify(v1);

        model.validateProjectV2(v2);
        model.migrateProjectV1ToV2(v1);

        assert(JSON.stringify(v2) === v2Before, "V2 validation mutated its input.");
        assert(JSON.stringify(v1) === v1Before, "V1 migration mutated its input.");
      }
    },
    {
      name: "Generated map preparation stays canonical and sparse",
      run: function (model) {
        var project = model.createDefaultProjectV2();
        var framesBefore = project.frames.length;
        var prepared;
        var validation;

        project.worlds[0].width = 4;
        project.worlds[0].height = 3;
        project.rooms = [];
        for (var y = 0; y < 3; y += 1) {
          for (var x = 0; x < 4; x += 1) {
            project.rooms.push({
              x: x,
              y: y,
              frame: (x + y) % 2 ? "#".repeat(24) : ".".repeat(24)
            });
          }
        }
        project.gameFlow.data.pocV1Start = { roomX: 0, roomY: 0 };

        prepared = model.prepareV2ProjectForValidation(project);
        validation = model.validateProjectV2(prepared);

        assert(validation.errors.length === 0, validation.errors.join(" "));
        assert(prepared.rooms.length === 12, "Generated room count changed.");
        assert(prepared.frames.length === framesBefore,
          "Generated rooms created duplicate frame-library assets.");
        assert(prepared.sections.reduce(function (sum, section) {
          return sum + section.roomIds.length;
        }, 0) === 12, "Section room IDs were not synchronized.");
        assert(prepared.gameFlow.startingRoomId === prepared.rooms[0].id,
          "Starting room reference was not synchronized.");
        prepared.rooms.forEach(function (room, index) {
          var expectedSection = model.resolveSectionForCoordinate(
            prepared,
            "world_main",
            room.x,
            room.y
          );

          assert(/^room_[a-z]\d{2}(?:_\d+)?$/.test(room.id),
            "Room " + index + " lacks a stable ID.");
          assert(expectedSection && room.sectionId === expectedSection.id,
            "Room " + index + " lacks its coordinate-owned section ID.");
          assert(room.frameId === null,
            "Room " + index + " unexpectedly owns a frame-library reference.");
          assert(room.data.pocV1Frame.length === 24,
            "Room " + index + " lost its exact compatibility frame.");
          assert(Array.isArray(room.interactionIds) &&
              Array.isArray(room.encounterGroupIds),
            "Room " + index + " lacks reference arrays.");
        });
      }
    },
    {
      name: "Valid shared visual assets",
      run: function (model) {
        var visual = window.SevenSegVisualAssets;
        var project = model.createDefaultProjectV2();
        var blank = visual.createGlyph("glyph_blank", "Blank", 0);
        var dot = visual.createGlyph("glyph_dot", "Decimal point", 0x80);
        var frame = visual.createFrame("frame_glyph_test", "Glyph test", visual.GLYPH_REFS_ENCODING);
        var animation = visual.createAnimation("anim_glyph_test", "Glyph test");
        var resolved;
        var validation;

        dot.tags.push("decorative");
        frame.cells = new Array(24).fill("glyph_blank");
        frame.cells[0] = "glyph_dot";
        animation.frameIds = ["frame_glyph_test"];
        project.glyphs = [blank, dot];
        project.frames.push(frame);
        project.animations.push(animation);

        validation = model.validateProjectV2(project);
        resolved = visual.resolveFrame(frame, project.glyphs);

        assert(validation.errors.length === 0, validation.errors.join(" "));
        assert(resolved.ok, resolved.errors.join(" "));
        assert(resolved.cells.length === 24 && resolved.cells[0] === 0x80,
          "Glyph-reference frame did not resolve to the official segment byte.");
      }
    },
    {
      name: "Visual asset validation rejects invalid bytes and frame sizes",
      run: function (model) {
        var visual = window.SevenSegVisualAssets;
        var project = model.createDefaultProjectV2();
        var glyph = visual.createGlyph("glyph_bad", "Bad glyph", 0);
        var validation;

        glyph.segmentByte = 256;
        project.glyphs.push(glyph);
        project.frames[0].cells.pop();
        validation = model.validateProjectV2(project);

        assert(includesMessage(validation.errors, "segmentByte must be a byte"),
          "Invalid glyph byte was accepted.");
        assert(includesMessage(validation.errors, "exactly 24 values"),
          "Partial frame was accepted.");
      }
    },
    {
      name: "Exact frame normalization",
      run: function () {
        var visual = window.SevenSegVisualAssets;
        var frame = visual.createFrame("frame_exact", "Exact frame");
        var normalized = visual.normalizeFrame(frame);
        var partial = visual.createFrame("frame_partial", "Partial frame");

        partial.cells.pop();

        assert(normalized !== null, "Exact frame was rejected.");
        assert(normalized !== frame && normalized.cells !== frame.cells,
          "Normalized frame shares mutable data with its input.");
        assert(visual.normalizeFrame(partial) === null,
          "Partial frame was silently padded or accepted.");
      }
    },
    {
      name: "Missing visual references",
      run: function (model) {
        var visual = window.SevenSegVisualAssets;
        var project = model.createDefaultProjectV2();
        var frame = visual.createFrame("frame_missing_glyph", "Missing glyph", visual.GLYPH_REFS_ENCODING);
        var animation = visual.createAnimation("anim_missing_frame", "Missing frame");
        var missing;

        frame.cells = new Array(24).fill("glyph_missing");
        animation.frameIds = ["frame_missing"];
        project.frames.push(frame);
        project.animations.push(animation);
        missing = visual.findMissingVisualReferences(project);

        assert(includesMessage(missing, "glyph_missing"),
          "Missing glyph reference was not reported.");
        assert(includesMessage(missing, "frame_missing"),
          "Missing animation frame reference was not reported.");
      }
    },
    {
      name: "Raw visual asset byte estimate",
      run: function () {
        var visual = window.SevenSegVisualAssets;
        var project = {
          glyphs: [
            visual.createGlyph("glyph_one", "One", 1),
            visual.createGlyph("glyph_two", "Two", 2)
          ],
          frames: [
            visual.createFrame("frame_one", "One"),
            visual.createFrame("frame_two", "Two")
          ],
          animations: [
            visual.createAnimation("anim_one", "One")
          ]
        };
        var estimate;

        project.animations[0].frameIds = ["frame_one", "frame_two"];
        estimate = visual.estimateRawAssetBytes(project);

        assert(estimate.glyphBytes === 2, "Glyph byte estimate is wrong.");
        assert(estimate.frameBytes === 48, "Frame byte estimate is wrong.");
        assert(estimate.animationBytes === 7, "Animation byte estimate is wrong.");
        assert(estimate.totalBytes === 57, "Total visual byte estimate is wrong.");
      }
    },
    {
      name: "Visual asset clone independence",
      run: function () {
        var visual = window.SevenSegVisualAssets;
        var project = {
          glyphs: [visual.createGlyph("glyph_clone", "Clone", 1)],
          frames: [visual.createFrame("frame_clone", "Clone")],
          animations: [visual.createAnimation("anim_clone", "Clone")]
        };
        var cloned = visual.cloneVisualAssets(project);

        cloned.glyphs[0].editor.notes = "changed";
        cloned.frames[0].cells[0] = 99;
        cloned.animations[0].frameIds.push("frame_clone");

        assert(project.glyphs[0].editor.notes === "", "Glyph editor metadata was shared.");
        assert(project.frames[0].cells[0] === 0, "Frame cells were shared.");
        assert(project.animations[0].frameIds.length === 0, "Animation frame IDs were shared.");
      }
    }
  ];

  function run() {
    var model = window.SevenSegModel;
    var results = [];

    tests.forEach(function (test) {
      try {
        test.run(model);
        results.push({
          name: test.name,
          passed: true,
          message: "Passed"
        });
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

  window.SevenSegProjectModelTests = {
    run: run
  };

  document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("runTestsButton").addEventListener("click", runAndRender);
    runAndRender();
  });
}());

(function () {
  "use strict";

  var visualAssets = null;
  var displayEditor = null;
  var project = null;
  var statusHandler = function () {};
  var dirtyHandler = function () {};
  var controller = null;
  var root = null;
  var preview = null;
  var playbackTimer = null;
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

    if (!result || !/^[a-z]/.test(result)) result = "animation";
    return result;
  }

  function createLibraryController(targetProject, options) {
    var settings = options || {};
    var assets = settings.visualAssets || window.SevenSegVisualAssets;
    var randomIndex = typeof settings.randomIndex === "function" ?
      settings.randomIndex :
      function (length) { return Math.floor(Math.random() * length); };
    var undoStack = [];
    var selectedId = null;
    var playback = {
      index: 0,
      playing: false
    };

    if (!targetProject || typeof targetProject !== "object") {
      throw new Error("A project is required for the animation library.");
    }
    if (!Array.isArray(targetProject.animations)) targetProject.animations = [];
    if (!Array.isArray(targetProject.frames)) targetProject.frames = [];
    if (!Array.isArray(targetProject.glyphs)) targetProject.glyphs = [];

    function animations() {
      return targetProject.animations;
    }

    function selected() {
      var list = animations();

      for (var index = 0; index < list.length; index += 1) {
        if (list[index].id === selectedId) return list[index];
      }

      selectedId = list.length ? list[0].id : null;
      return list.length ? list[0] : null;
    }

    function resetPlayback() {
      playback.index = 0;
      playback.playing = false;
    }

    function uniqueId(name) {
      var base = "anim_" + stableIdPart(name || "new");
      var candidate = base;
      var suffix = 2;

      while (animations().some(function (animation) {
        return animation.id === candidate;
      })) {
        candidate = base + "_" + suffix;
        suffix += 1;
      }
      return candidate;
    }

    function snapshot() {
      return {
        animations: cloneJson(animations()),
        selectedId: selectedId
      };
    }

    function pushUndo() {
      undoStack.push(snapshot());
      if (undoStack.length > 50) undoStack.shift();
    }

    function success(action, animation) {
      return {
        ok: true,
        action: action,
        animation: animation ? cloneJson(animation) : null
      };
    }

    function failure(reason, references) {
      return {
        ok: false,
        reason: reason,
        references: references || []
      };
    }

    function frameById(frameId) {
      for (var index = 0; index < targetProject.frames.length; index += 1) {
        if (targetProject.frames[index].id === frameId) return targetProject.frames[index];
      }
      return null;
    }

    function referencesFor(animationId) {
      var references = [];

      (Array.isArray(targetProject.heroes) ? targetProject.heroes : []).forEach(
        function (hero, heroIndex) {
          if (!hero || !hero.animationIds || typeof hero.animationIds !== "object") return;
          Object.keys(hero.animationIds).forEach(function (key) {
            if (hero.animationIds[key] === animationId) {
              references.push("heroes[" + heroIndex + "].animationIds." + key);
            }
          });
        }
      );
      (Array.isArray(targetProject.enemies) ? targetProject.enemies : []).forEach(
        function (enemy, enemyIndex) {
          if (!enemy || !enemy.animationIds || typeof enemy.animationIds !== "object") return;
          Object.keys(enemy.animationIds).forEach(function (key) {
            if (enemy.animationIds[key] === animationId) {
              references.push("enemies[" + enemyIndex + "].animationIds." + key);
            }
          });
        }
      );
      (Array.isArray(targetProject.spells) ? targetProject.spells : []).forEach(
        function (spell, spellIndex) {
          if (spell && spell.animationId === animationId) {
            references.push("spells[" + spellIndex + "].animationId");
          }
        }
      );
      (Array.isArray(targetProject.abilities) ? targetProject.abilities : []).forEach(
        function (ability, abilityIndex) {
          if (ability && ability.animationId === animationId) {
            references.push("abilities[" + abilityIndex + "].animationId");
          }
        }
      );

      return references;
    }

    function commandOnSelected(action, change) {
      var animation = selected();

      if (!animation) return failure("No animation is selected.");
      pushUndo();
      change(animation);
      resetPlayback();
      return success(action, animation);
    }

    function resolvedFrameAt(index) {
      var animation = selected();
      var frame;

      if (!animation || !animation.frameIds.length) {
        return {
          ok: false,
          cells: null,
          errors: ["No animation frame is available."]
        };
      }
      frame = frameById(animation.frameIds[index]);
      if (!frame) {
        return {
          ok: false,
          cells: null,
          errors: ["Missing frame " + animation.frameIds[index] + "."]
        };
      }
      return assets.resolveFrame(frame, targetProject.glyphs);
    }

    return {
      list: function () {
        return cloneJson(animations());
      },
      refresh: function () {
        if (!Array.isArray(targetProject.animations)) targetProject.animations = [];
        if (!Array.isArray(targetProject.frames)) targetProject.frames = [];
        if (!Array.isArray(targetProject.glyphs)) targetProject.glyphs = [];
        undoStack = [];
        selected();
        resetPlayback();
        return this.list();
      },
      getSelected: function () {
        var animation = selected();
        return animation ? cloneJson(animation) : null;
      },
      select: function (id) {
        var exists = animations().some(function (animation) {
          return animation.id === id;
        });
        if (!exists) return false;
        selectedId = id;
        resetPlayback();
        return true;
      },
      create: function (name, firstFrameId) {
        var animationName = String(name || "New animation").trim() || "New animation";
        var frame = frameById(firstFrameId) || targetProject.frames[0];
        var animation;

        if (!frame) return failure("Create a frame before creating an animation.");
        animation = assets.createAnimation(uniqueId(animationName), animationName);
        animation.frameIds = [frame.id];
        pushUndo();
        animations().push(animation);
        selectedId = animation.id;
        resetPlayback();
        return success("create", animation);
      },
      duplicate: function () {
        var source = selected();
        var copy;

        if (!source) return failure("No animation is selected.");
        pushUndo();
        copy = cloneJson(source);
        copy.name = source.name + " copy";
        copy.id = uniqueId(copy.name);
        animations().push(copy);
        selectedId = copy.id;
        resetPlayback();
        return success("duplicate", copy);
      },
      rename: function (name) {
        var nextName = String(name || "").trim();
        var animation = selected();

        if (!animation) return failure("No animation is selected.");
        if (!nextName) return failure("Animation name cannot be empty.");
        if (animation.name === nextName) return success("rename", animation);
        return commandOnSelected("rename", function (entry) {
          entry.name = nextName;
        });
      },
      deleteSelected: function () {
        var animation = selected();
        var references;
        var index;

        if (!animation) return failure("No animation is selected.");
        references = referencesFor(animation.id);
        if (references.length) {
          return failure("The animation is still referenced.", references);
        }

        pushUndo();
        index = animations().indexOf(animation);
        animations().splice(index, 1);
        selectedId = animations().length ?
          animations()[Math.min(index, animations().length - 1)].id :
          null;
        resetPlayback();
        return success("delete", animation);
      },
      addFrame: function (frameId) {
        if (!frameById(frameId)) return failure("Selected frame does not exist.");
        return commandOnSelected("add-frame", function (animation) {
          animation.frameIds.push(frameId);
          playback.index = animation.frameIds.length - 1;
        });
      },
      removeFrame: function (index) {
        var animation = selected();

        if (!animation) return failure("No animation is selected.");
        if (!Number.isInteger(index) || index < 0 || index >= animation.frameIds.length) {
          return failure("Animation frame index is invalid.");
        }
        if (animation.frameIds.length === 1) {
          return failure("An animation must contain at least one frame.");
        }

        return commandOnSelected("remove-frame", function (entry) {
          entry.frameIds.splice(index, 1);
        });
      },
      moveFrame: function (index, direction) {
        var animation = selected();
        var target = index + direction;

        if (!animation) return failure("No animation is selected.");
        if (!Number.isInteger(index) || index < 0 || index >= animation.frameIds.length ||
            (direction !== -1 && direction !== 1) ||
            target < 0 || target >= animation.frameIds.length) {
          return failure("Animation frame cannot move in that direction.");
        }

        return commandOnSelected("reorder-frame", function (entry) {
          var moved = entry.frameIds.splice(index, 1)[0];
          entry.frameIds.splice(target, 0, moved);
          playback.index = target;
        });
      },
      randomizeOrder: function () {
        var animation = selected();

        if (!animation) return failure("No animation is selected.");
        if (animation.frameIds.length < 2) {
          return failure("At least two frames are needed to randomize order.");
        }

        return commandOnSelected("randomize-order", function (entry) {
          for (var index = entry.frameIds.length - 1; index > 0; index -= 1) {
            var target = Math.max(0, Math.min(index, randomIndex(index + 1)));
            var value = entry.frameIds[index];
            entry.frameIds[index] = entry.frameIds[target];
            entry.frameIds[target] = value;
          }
        });
      },
      setDuration: function (durationMs) {
        var value = Number(durationMs);

        if (!Number.isInteger(value) || value < 1 || value > 60000) {
          return failure("Frame duration must be an integer from 1 through 60000 ms.");
        }
        if (selected() && selected().frameDurationMs === value) {
          return success("set-duration", selected());
        }
        return commandOnSelected("set-duration", function (animation) {
          animation.frameDurationMs = value;
        });
      },
      setLoop: function (loop) {
        var value = Boolean(loop);

        if (selected() && selected().loop === value) return success("set-loop", selected());
        return commandOnSelected("set-loop", function (animation) {
          animation.loop = value;
        });
      },
      referencesFor: referencesFor,
      warnings: function () {
        var animation = selected();
        var warnings = [];

        if (!animation) return ["No animation is selected."];
        animation.frameIds.forEach(function (frameId, index) {
          var frame = frameById(frameId);
          var resolved;

          if (!frame) {
            warnings.push("Frame " + index + " references missing ID " + frameId + ".");
            return;
          }
          resolved = assets.resolveFrame(frame, targetProject.glyphs);
          if (!resolved.ok) {
            warnings.push("Frame " + index + ": " + resolved.errors.join(" "));
          }
        });
        return warnings;
      },
      playbackState: function () {
        return {
          index: playback.index,
          playing: playback.playing
        };
      },
      currentResolvedFrame: function () {
        return resolvedFrameAt(playback.index);
      },
      play: function () {
        if (!selected()) return failure("No animation is selected.");
        if (this.warnings().length) return failure(this.warnings().join(" "));
        playback.playing = true;
        return success("play", selected());
      },
      pause: function () {
        playback.playing = false;
        return success("pause", selected());
      },
      stop: function () {
        resetPlayback();
        return success("stop", selected());
      },
      step: function (direction) {
        var animation = selected();
        var next;

        if (!animation) return failure("No animation is selected.");
        playback.playing = false;
        next = playback.index + (direction === -1 ? -1 : 1);
        if (next >= animation.frameIds.length) next = animation.loop ? 0 : animation.frameIds.length - 1;
        if (next < 0) next = animation.loop ? animation.frameIds.length - 1 : 0;
        playback.index = next;
        return success("step", animation);
      },
      tick: function () {
        var animation = selected();

        if (!animation || !playback.playing) return false;
        if (playback.index + 1 >= animation.frameIds.length && !animation.loop) {
          playback.playing = false;
          return false;
        }
        playback.index = (playback.index + 1) % animation.frameIds.length;
        return true;
      },
      canUndo: function () {
        return undoStack.length > 0;
      },
      undo: function () {
        var previous;

        if (!undoStack.length) return failure("Nothing to undo.");
        previous = undoStack.pop();
        targetProject.animations = cloneJson(previous.animations);
        selectedId = previous.selectedId;
        selected();
        resetPlayback();
        return success("undo", selected());
      },
      estimate: function () {
        var animation = selected();
        var selectedBytes = animation ? animation.frameIds.length * 2 + 3 : 0;
        var libraryBytes = animations().reduce(function (total, entry) {
          return total + entry.frameIds.length * 2 + 3;
        }, 0);

        return {
          selectedBytes: selectedBytes,
          libraryBytes: libraryBytes
        };
      }
    };
  }

  function setStatus(message) {
    statusHandler(message);
  }

  function stopTimer() {
    if (playbackTimer !== null) {
      window.clearTimeout(playbackTimer);
      playbackTimer = null;
    }
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
    stopTimer();
    render();
    if (successMessage) setStatus(successMessage);
    return true;
  }

  function frameName(frameId) {
    var frame = project.frames.find(function (entry) {
      return entry.id === frameId;
    });
    return frame ? frame.name : "Missing: " + frameId;
  }

  function renderPreview() {
    var resolved = controller.currentResolvedFrame();

    preview.setFrame(resolved.ok ? resolved.cells : new Array(24).fill(0));
  }

  function scheduleNextFrame() {
    var animation = controller.getSelected();

    stopTimer();
    if (!animation || !controller.playbackState().playing) return;
    playbackTimer = window.setTimeout(function () {
      playbackTimer = null;
      controller.tick();
      render();
      scheduleNextFrame();
    }, animation.frameDurationMs);
  }

  function renderLists() {
    var animationList = root.querySelector("[data-animation-list]");
    var sequence = root.querySelector("[data-animation-sequence]");
    var selected = controller.getSelected();

    animationList.innerHTML = "";
    controller.list().forEach(function (animation) {
      var option = document.createElement("option");
      option.value = animation.id;
      option.textContent = animation.name + "  [" + animation.id + "]";
      option.selected = selected && selected.id === animation.id;
      animationList.appendChild(option);
    });
    animationList.disabled = !selected;

    sequence.innerHTML = "";
    if (selected) {
      selected.frameIds.forEach(function (frameId, index) {
        var option = document.createElement("option");
        option.value = String(index);
        option.textContent = (index + 1) + ". " + frameName(frameId);
        option.selected = index === controller.playbackState().index;
        sequence.appendChild(option);
      });
    }
    sequence.disabled = !selected;
  }

  function renderFramePicker() {
    var picker = root.querySelector("[data-animation-frame-picker]");
    picker.innerHTML = "";
    project.frames.forEach(function (frame) {
      var option = document.createElement("option");
      option.value = frame.id;
      option.textContent = frame.name + "  [" + frame.id + "]";
      picker.appendChild(option);
    });
    picker.disabled = project.frames.length === 0;
  }

  function render() {
    var animation = controller.getSelected();
    var playback = controller.playbackState();
    var warnings = controller.warnings();
    var estimate = controller.estimate();

    renderLists();
    renderFramePicker();
    root.querySelector("[data-animation-name]").disabled = !animation;
    root.querySelector("[data-animation-name]").value = animation ? animation.name : "";
    root.querySelector("[data-animation-id]").textContent =
      animation ? animation.id : "No animation selected";
    root.querySelector("[data-animation-duration]").disabled = !animation;
    root.querySelector("[data-animation-duration]").value =
      animation ? String(animation.frameDurationMs) : "140";
    root.querySelector("[data-animation-loop]").disabled = !animation;
    root.querySelector("[data-animation-loop]").checked = Boolean(animation && animation.loop);
    root.querySelector("[data-animation-undo]").disabled = !controller.canUndo();
    root.querySelector("[data-animation-warning]").textContent = warnings.join(" ");
    root.querySelector("[data-animation-memory]").textContent =
      estimate.selectedBytes + " bytes selected / " +
      estimate.libraryBytes + " bytes library";
    root.querySelector("[data-animation-position]").textContent =
      animation ?
        "Frame " + (playback.index + 1) + " of " + animation.frameIds.length +
        (playback.playing ? " playing" : " stopped") :
        "No animation";
    root.querySelectorAll("[data-needs-animation]").forEach(function (button) {
      button.disabled = !animation;
    });
    renderPreview();
  }

  function selectedSequenceIndex() {
    var value = Number(root.querySelector("[data-animation-sequence]").value);
    return Number.isInteger(value) ? value : controller.playbackState().index;
  }

  function buildUi() {
    root.innerHTML =
      '<div class="animationEditorLayout">' +
        '<div class="animationLibraryColumn">' +
          '<label for="animationLibraryList">Animation library</label>' +
          '<select id="animationLibraryList" data-animation-list size="8"></select>' +
          '<div class="animationCommandRow">' +
            '<button type="button" data-animation-command="create">New</button>' +
            '<button type="button" data-animation-command="duplicate" data-needs-animation>Duplicate</button>' +
            '<button type="button" data-animation-command="delete" data-needs-animation>Delete</button>' +
            '<button type="button" data-animation-undo>Undo</button>' +
          '</div>' +
        '</div>' +
        '<div class="animationEditColumn">' +
          '<div class="animationIdentityGrid">' +
            '<label for="animationNameInput">Name</label>' +
            '<input id="animationNameInput" data-animation-name type="text" maxlength="100">' +
            '<span>ID</span><code data-animation-id></code>' +
            '<label for="animationDurationInput">Duration ms</label>' +
            '<input id="animationDurationInput" data-animation-duration type="number" min="1" max="60000">' +
            '<label for="animationLoopInput">Loop</label>' +
            '<input id="animationLoopInput" data-animation-loop type="checkbox">' +
          '</div>' +
          '<div class="animationSequenceTools">' +
            '<select data-animation-frame-picker aria-label="Frame to add"></select>' +
            '<button type="button" data-animation-command="add" data-needs-animation>Add frame</button>' +
          '</div>' +
          '<select class="animationSequence" data-animation-sequence size="6" aria-label="Animation frame order"></select>' +
          '<div class="animationCommandRow">' +
            '<button type="button" data-animation-command="up" data-needs-animation>Up</button>' +
            '<button type="button" data-animation-command="down" data-needs-animation>Down</button>' +
            '<button type="button" data-animation-command="remove" data-needs-animation>Remove</button>' +
            '<button type="button" data-animation-command="randomize" data-needs-animation>Randomize order</button>' +
          '</div>' +
          '<div class="animationPreview">' +
            '<div data-animation-preview></div>' +
            '<div class="animationPlaybackRow">' +
              '<button type="button" data-playback-command="play" data-needs-animation>Play</button>' +
              '<button type="button" data-playback-command="pause" data-needs-animation>Pause</button>' +
              '<button type="button" data-playback-command="stop" data-needs-animation>Stop</button>' +
              '<button type="button" data-playback-command="previous" data-needs-animation>Previous</button>' +
              '<button type="button" data-playback-command="next" data-needs-animation>Next</button>' +
              '<span data-animation-position></span>' +
            '</div>' +
          '</div>' +
          '<div class="animationWarning" data-animation-warning></div>' +
          '<div class="animationMemory" data-animation-memory></div>' +
        '</div>' +
      '</div>';

    preview = displayEditor.create(root.querySelector("[data-animation-preview]"), {
      label: "Animation frame preview",
      frame: new Array(24).fill(0),
      readOnly: true
    });
  }

  function connectUi() {
    root.addEventListener("focusin", function () {
      active = true;
    });
    document.addEventListener("pointerdown", function (event) {
      active = root.contains(event.target);
    });
    root.querySelector("[data-animation-list]").addEventListener("change", function (event) {
      stopTimer();
      controller.select(event.target.value);
      render();
    });
    root.querySelector("[data-animation-sequence]").addEventListener("change", function (event) {
      stopTimer();
      controller.stop();
      var target = Number(event.target.value);
      while (controller.playbackState().index < target) controller.step(1);
      render();
    });
    root.querySelector("[data-animation-name]").addEventListener("change", function (event) {
      showResult(controller.rename(event.target.value), "Renamed animation.");
    });
    root.querySelector("[data-animation-duration]").addEventListener("change", function (event) {
      showResult(controller.setDuration(Number(event.target.value)), "Updated frame duration.");
    });
    root.querySelector("[data-animation-loop]").addEventListener("change", function (event) {
      showResult(controller.setLoop(event.target.checked), "Updated animation loop.");
    });
    root.querySelector("[data-animation-undo]").addEventListener("click", function () {
      undo();
    });
    root.addEventListener("click", function (event) {
      var editButton = event.target.closest("[data-animation-command]");
      var playButton = event.target.closest("[data-playback-command]");
      var command;
      var result;
      var index;

      if (editButton) {
        command = editButton.dataset.animationCommand;
        index = selectedSequenceIndex();
        if (command === "create") {
          result = controller.create(
            "New animation",
            root.querySelector("[data-animation-frame-picker]").value
          );
        } else if (command === "duplicate") result = controller.duplicate();
        else if (command === "delete") result = controller.deleteSelected();
        else if (command === "add") {
          result = controller.addFrame(root.querySelector("[data-animation-frame-picker]").value);
        } else if (command === "remove") result = controller.removeFrame(index);
        else if (command === "up") result = controller.moveFrame(index, -1);
        else if (command === "down") result = controller.moveFrame(index, 1);
        else if (command === "randomize") result = controller.randomizeOrder();
        else return;
        showResult(result, "Updated animation.");
        return;
      }

      if (!playButton) return;
      command = playButton.dataset.playbackCommand;
      stopTimer();
      if (command === "play") {
        result = controller.play();
        if (result.ok) {
          render();
          scheduleNextFrame();
        } else {
          setStatus(result.reason);
          render();
        }
      } else if (command === "pause") {
        controller.pause();
        render();
      } else if (command === "stop") {
        controller.stop();
        render();
      } else if (command === "previous") {
        controller.step(-1);
        render();
      } else if (command === "next") {
        controller.step(1);
        render();
      }
    });
  }

  function init(options) {
    visualAssets = options.visualAssets;
    displayEditor = options.displayEditor;
    project = options.project;
    statusHandler = options.setStatus || statusHandler;
    dirtyHandler = options.markDirty || dirtyHandler;
    root = document.getElementById("animationEditor");

    if (!root || !visualAssets || !displayEditor) return;
    controller = createLibraryController(project, {
      visualAssets: visualAssets
    });
    buildUi();
    connectUi();
    render();
  }

  function refresh() {
    stopTimer();
    if (!controller) return;
    controller.refresh();
    render();
  }

  function undo() {
    var result;

    stopTimer();
    if (!controller) return false;
    result = controller.undo();
    if (!result.ok) {
      setStatus(result.reason);
      return false;
    }
    dirtyHandler();
    render();
    setStatus("Undid the last animation command.");
    return true;
  }

  window.SevenSegAnimationEditor = {
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

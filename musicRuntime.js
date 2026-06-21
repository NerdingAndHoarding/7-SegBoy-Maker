(function (root) {
  "use strict";

  var audioContext = null;
  var active = [];
  var timerId = null;
  var enabled = false;
  var activeMode = "";
  var activeSongId = "";
  var eventIndex = 0;
  var nextAt = 0;
  var playToken = 0;

  function array(value) {
    return Array.isArray(value) ? value : [];
  }

  function object(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function assignments(project) {
    var settings = object(project && project.settings);
    var data = object(settings.musicAssignments);

    return data;
  }

  function songForMode(project, mode) {
    var assign = assignments(project);
    var id = mode === "battle" ? assign.battleMusicId : assign.worldmapMusicId;

    return array(project && project.music).find(function (song) {
      return song && song.id === id;
    }) || null;
  }

  function midiToFrequency(note) {
    return 440 * Math.pow(2, (Number(note) - 69) / 12);
  }

  function ensureContext() {
    var AudioCtor = root.AudioContext || root.webkitAudioContext;

    if (!AudioCtor) {
      return null;
    }
    if (!audioContext) {
      audioContext = new AudioCtor();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    return audioContext;
  }

  function stopVoices() {
    active.forEach(function (entry) {
      try {
        if (entry.gain) {
          entry.gain.gain.cancelScheduledValues(audioContext ? audioContext.currentTime : 0);
          entry.gain.gain.setValueAtTime(0.0001, audioContext ? audioContext.currentTime : 0);
        }
        entry.osc.stop();
      } catch (error) {
        // Already stopped.
      }
    });
    active = [];
  }

  function stop() {
    playToken += 1;
    if (timerId !== null) {
      root.clearTimeout(timerId);
      timerId = null;
    }
    stopVoices();
    activeMode = "";
    activeSongId = "";
  }

  function scheduleVoice(ctx, type, note, startAt, seconds, gainValue, gate, token) {
    var frequency = Number(note) > 0 ? midiToFrequency(note) : 0;
    var osc;
    var gain;
    var attack;
    var release;
    var toneSeconds;
    var cleanupMs;

    if (!frequency || !Number.isFinite(frequency)) {
      return;
    }

    osc = ctx.createOscillator();
    gain = ctx.createGain();
    attack = Math.min(0.012, seconds * 0.2);
    release = Math.min(0.025, seconds * 0.2);
    toneSeconds = Math.max(0.02, seconds * gate);
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, startAt);
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(gainValue, startAt + attack);
    gain.gain.setValueAtTime(gainValue, startAt + Math.max(attack, toneSeconds - release));
    gain.gain.linearRampToValueAtTime(0.0001, startAt + toneSeconds);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + toneSeconds + 0.01);
    active.push({
      osc: osc,
      gain: gain,
      token: token
    });
    cleanupMs = Math.max(
      80,
      Math.floor((Math.max(0, startAt - ctx.currentTime) + toneSeconds + 0.15) * 1000)
    );
    root.setTimeout(function () {
      active = active.filter(function (entry) {
        return entry.osc !== osc;
      });
    }, cleanupMs);
  }

  function channelArrays(song) {
    var channels = object(song && song.channels);

    return {
      melody: array(channels.melodyNotes),
      durations: array(channels.durations),
      harmony: array(channels.harmonyNotes),
      bass: array(channels.bassNotes)
    };
  }

  function songBpm(song) {
    var settings = object(song && song.settings);
    var bpm = Number(settings.bpm);

    return Number.isFinite(bpm) && bpm > 0 ? bpm : 120;
  }

  function songGate(song) {
    var settings = object(song && song.settings);
    var gate = Number(settings.gate);

    if (!Number.isFinite(gate) || gate <= 0) {
      return 0.82;
    }
    if (gate > 1) {
      gate = gate / 100;
    }

    return Math.min(1, Math.max(0.2, gate));
  }

  function scheduleNext(project, song, token) {
    var ctx = ensureContext();
    var channels = channelArrays(song);
    var bpm = songBpm(song);
    var gate = songGate(song);
    var beatSeconds = 60 / bpm;
    var ticksPerBeat = 24;
    var noteCount = channels.melody.length;
    var note;
    var harmony;
    var bass;
    var durTicks;
    var durSeconds;

    if (!ctx || !enabled || token !== playToken || !noteCount) {
      return;
    }

    if (eventIndex >= noteCount) {
      eventIndex = 0;
    }

    note = Number(channels.melody[eventIndex]) || 0;
    harmony = Number(channels.harmony[eventIndex]) || 0;
    bass = Number(channels.bass[eventIndex]) || 0;
    durTicks = Math.max(1, Number(channels.durations[eventIndex]) || 12);
    durSeconds = durTicks / ticksPerBeat * beatSeconds;
    nextAt = Math.max(ctx.currentTime + 0.02, nextAt);

    scheduleVoice(ctx, "square", note, nextAt, durSeconds, 0.13, gate, token);
    scheduleVoice(ctx, "square", harmony, nextAt, durSeconds, 0.08, Math.max(0.2, gate * 0.95), token);
    scheduleVoice(ctx, "triangle", bass, nextAt, durSeconds, 0.16, Math.min(0.98, gate + 0.08), token);

    eventIndex += 1;
    nextAt += durSeconds;
    timerId = root.setTimeout(function () {
      scheduleNext(project, song, token);
    }, Math.max(20, Math.floor(durSeconds * 700)));
  }

  function playMode(project, mode) {
    var song = songForMode(project, mode);

    if (!enabled || !song) {
      return false;
    }
    if (activeMode === mode && activeSongId === song.id) {
      return true;
    }

    stop();
    if (!ensureContext()) {
      return false;
    }

    activeMode = mode;
    activeSongId = song.id;
    eventIndex = 0;
    nextAt = audioContext.currentTime + 0.04;
    scheduleNext(project, song, playToken);
    return true;
  }

  function enable(project, mode) {
    enabled = true;
    ensureContext();
    if (mode) {
      playMode(project, mode);
    }
    return enabled;
  }

  function disable() {
    enabled = false;
    stop();
  }

  root.SevenSegMusicRuntime = {
    enable: enable,
    disable: disable,
    stop: stop,
    playMode: playMode,
    isEnabled: function () {
      return enabled;
    },
    currentMode: function () {
      return activeMode;
    }
  };
}(window));

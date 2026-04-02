// Core helpers: utilities for assets, audio, math, and collision hitboxes.
function createAsset(urlOrList) {
  const sources = Array.isArray(urlOrList) ? [...urlOrList] : [urlOrList];
  const image = new Image();
  image.crossOrigin = "anonymous";
  image.referrerPolicy = "no-referrer";

  let sourceIndex = 0;
  const loadNextSource = () => {
    if (sourceIndex >= sources.length) {
      image.dataset.failed = "1";
      return;
    }

    image.dataset.failed = "0";
    image.src = sources[sourceIndex];
    sourceIndex += 1;
  };

  image.addEventListener("error", loadNextSource);
  image.addEventListener("load", () => {
    image.dataset.failed = "0";
  });

  loadNextSource();
  return image;
}

function createStarfield() {
  const stars = [];
  for (let i = 0; i < 120; i++) {
    stars.push({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      size: 0.5 + Math.random() * 1.6,
      depth: 0.3 + Math.random() * 1.8,
      twinkle: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

function createStarLayers() {
  const buildLayer = (count, sizeMin, sizeMax, speed, colorA, colorB) => {
    const stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        twinkle: Math.random() * Math.PI * 2,
      });
    }
    return { stars, speed, colorA, colorB };
  };

  return {
    far: buildLayer(80, 0.4, 1.1, 4.4, "#8fb7df", "#b4cff5"),
    mid: buildLayer(58, 0.7, 1.6, 9.6, "#9fd3ff", "#d7ecff"),
    near: buildLayer(34, 1.0, 2.2, 17.5, "#cce9ff", "#ffffff"),
  };
}

function getSkinById(skinId) {
  return SKINS.find((skin) => skin.id === skinId) || SKINS[0];
}

function getSkinPalette(skinId) {
  return getSkinById(skinId).palette;
}

function getSkinStatSheet(skinId) {
  const skin = getSkinById(skinId);
  return {
    maxEnergy: 100,
    speedMult: 1,
    bulletSpeedMult: 1,
    fireDelayMult: 1,
    damageMult: 1,
    dashCooldownMult: 1,
    dashSpeedMult: 1,
    energyRegenMult: 1,
    ...(skin.stats || {}),
  };
}

function getBiomeTheme(activeWave) {
  const idx = Math.floor(Math.max(0, activeWave - 1) / 3) % BIOME_THEMES.length;
  return {
    index: idx,
    theme: BIOME_THEMES[idx],
  };
}

function triggerCameraShake(frames, power) {
  cameraShakeFrames = Math.max(cameraShakeFrames, frames);
  cameraShakePower = Math.max(cameraShakePower, power);
}

function drawSprite(image, x, y, w, h, fallbackColor) {
  if (image && image.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, x, y, w, h);
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.fillRect(x, y, w, h);
  }
}

function createAudioEngine() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  const masterGain = audioCtx.createGain();
  const musicGain = audioCtx.createGain();
  const sfxGain = audioCtx.createGain();
  const uiGain = audioCtx.createGain();

  musicGain.connect(masterGain);
  sfxGain.connect(masterGain);
  uiGain.connect(masterGain);
  masterGain.connect(audioCtx.destination);

  masterGain.gain.value = 0.8;
  musicGain.gain.value = 0.50;
  sfxGain.gain.value = 0.85;
  uiGain.gain.value = 0.7;

  let profile = "lite";
  let adaptiveTick = 0;
  let musicBaseGain = 0.50;
  let ambientOsc = null;
  let ambientGain = null;
  let tensionOsc = null;
  let tensionGain = null;
  let criticalOsc = null;
  let criticalGain = null;
  let lastEventType = null;

  function ensureMusicLayers() {
    if (ambientOsc && tensionOsc && criticalOsc) return;

    if (!ambientOsc) {
      ambientOsc = audioCtx.createOscillator();
      ambientGain = audioCtx.createGain();
      ambientOsc.type = "triangle";
      ambientOsc.frequency.setValueAtTime(84, audioCtx.currentTime);
      ambientGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      ambientOsc.connect(ambientGain);
      ambientGain.connect(musicGain);
      ambientOsc.start();
    }

    if (!tensionOsc) {
      tensionOsc = audioCtx.createOscillator();
      tensionGain = audioCtx.createGain();
      tensionOsc.type = "sawtooth";
      tensionOsc.frequency.setValueAtTime(128, audioCtx.currentTime);
      tensionGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      tensionOsc.connect(tensionGain);
      tensionGain.connect(musicGain);
      tensionOsc.start();
    }

    if (!criticalOsc) {
      criticalOsc = audioCtx.createOscillator();
      criticalGain = audioCtx.createGain();
      criticalOsc.type = "square";
      criticalOsc.frequency.setValueAtTime(42, audioCtx.currentTime);
      criticalGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      criticalOsc.connect(criticalGain);
      criticalGain.connect(musicGain);
      criticalOsc.start();
    }
  }

  function ensureAmbientLayer() {
    ensureMusicLayers();
  }

  function beep({ frequency, duration, type = "sine", volume = 0.03, slide = 0, bus = "sfx" }) {
    const now = audioCtx.currentTime;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    const outputBus = bus === "ui" ? uiGain : bus === "music" ? musicGain : sfxGain;

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    if (slide !== 0) {
      oscillator.frequency.linearRampToValueAtTime(frequency + slide, now + duration);
    }

    gainNode.gain.setValueAtTime(volume, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(outputBus);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function setBusLevels({ master, sfx, ui, music }) {
    const now = audioCtx.currentTime;
    if (typeof master === "number") masterGain.gain.setTargetAtTime(clamp(master, 0, 1), now, 0.04);
    if (typeof sfx === "number") sfxGain.gain.setTargetAtTime(clamp(sfx, 0, 1), now, 0.04);
    if (typeof ui === "number") uiGain.gain.setTargetAtTime(clamp(ui, 0, 1), now, 0.04);
    if (typeof music === "number") {
      musicBaseGain = clamp(music, 0, 1);
      musicGain.gain.setTargetAtTime(musicBaseGain, now, 0.08);
    }
  }

  function setProfile(nextProfile) {
    profile = nextProfile === "immersive" ? "immersive" : "lite";
    if (profile === "immersive") ensureAmbientLayer();
    if (ambientGain && tensionGain && criticalGain) {
      const now = audioCtx.currentTime;
      if (profile === "immersive") {
        ambientGain.gain.setTargetAtTime(0.03, now, 0.22);
      } else {
        ambientGain.gain.setTargetAtTime(0.0001, now, 0.16);
        tensionGain.gain.setTargetAtTime(0.0001, now, 0.16);
        criticalGain.gain.setTargetAtTime(0.0001, now, 0.16);
      }
    }
  }

  function sidechainImpact(amount = 0.55, releaseSec = 0.24) {
    const now = audioCtx.currentTime;
    const current = musicGain.gain.value;
    const floor = 0.03;
    const ducked = Math.max(floor, current * (1 - clamp(amount, 0.15, 0.9)));
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(current, now);
    musicGain.gain.linearRampToValueAtTime(ducked, now + 0.015);
    musicGain.gain.linearRampToValueAtTime(Math.max(0.08, current), now + Math.max(0.12, releaseSec));
  }

  function playEventCue(eventType) {
    if (!eventType) return;
    if (eventType === "fog") {
      beep({ frequency: 260, duration: 0.09, type: "sine", volume: 0.018, slide: -30, bus: "music" });
    } else if (eventType === "interference") {
      beep({ frequency: 420, duration: 0.05, type: "square", volume: 0.02, slide: 210, bus: "music" });
    } else if (eventType === "debris-rain") {
      beep({ frequency: 180, duration: 0.08, type: "sawtooth", volume: 0.02, slide: -50, bus: "music" });
    } else if (eventType === "bonus-wave") {
      beep({ frequency: 700, duration: 0.08, type: "triangle", volume: 0.024, slide: 90, bus: "music" });
      setTimeout(() => beep({ frequency: 860, duration: 0.08, type: "triangle", volume: 0.02, slide: 110, bus: "music" }), 70);
    } else if (eventType === "magnetic-field") {
      beep({ frequency: 320, duration: 0.1, type: "triangle", volume: 0.022, slide: 70, bus: "music" });
    }
  }

  // Phase 2: adaptive audio by pressure, boss, health and event transitions.
  function updateAdaptiveState({ intensity = 0, bossActive = false, lowHealth = false, eventType = null } = {}) {
    adaptiveTick += 1;
    if (profile !== "immersive") return;
    ensureAmbientLayer();

    const now = audioCtx.currentTime;
    const pressure = clamp(intensity, 0, 1);
    const ambientBase = bossActive ? 68 : 82;
    const ambientShift = pressure * 15 + (lowHealth ? 8 : 0);
    const tensionTarget = 0.006 + pressure * 0.042 + (bossActive ? 0.022 : 0);
    const criticalTarget = lowHealth ? 0.016 + pressure * 0.03 : pressure > 0.9 ? 0.01 : 0.0001;

    ambientOsc.frequency.setTargetAtTime(ambientBase + ambientShift, now, 0.22);
    tensionOsc.frequency.setTargetAtTime((bossActive ? 120 : 132) + pressure * 26, now, 0.2);
    criticalOsc.frequency.setTargetAtTime(lowHealth ? 54 : 42, now, 0.18);

    ambientGain.gain.setTargetAtTime(0.02 + pressure * 0.03, now, 0.24);
    tensionGain.gain.setTargetAtTime(tensionTarget, now, 0.2);
    criticalGain.gain.setTargetAtTime(criticalTarget, now, 0.16);

    if (eventType !== lastEventType) {
      playEventCue(eventType);
      lastEventType = eventType;
    }

    if (adaptiveTick % 120 === 0 && eventType === "bonus-wave") {
      beep({ frequency: 740, duration: 0.07, type: "triangle", volume: 0.014, slide: 45, bus: "music" });
    }
  }

  // ── Chiptune Music Sequencer ─────────────────────────────────────────────────
  // Improvements:
  //  A. Two A/B alternating patterns per mode (verse/chorus anti-repetition)
  //  B. Boss stinger: 4-note ascending fanfare before 16-bit theme starts
  //  C. Music volume bus (setBusLevels({ music }) + dedicated slider)
  //  D. Vibrato LFO on melody/harmony notes (±3–4 Hz sine modulation)
  //  E. Fade-out on Game Over via fadeOutMusic()
  //  F. Tempo scales with wave number (120→~144 BPM normal, 175→~196 BPM boss)
  //  G. Short chip reverb: 25 ms ConvolverNode impulse, 12 % wet signal
  //  H. Ascending arpeggio fill on the last step of every loop cycle
  // ─────────────────────────────────────────────────────────────────────────────

  // G — Chip reverb: parallel wet path musicGain → convolver → reverbWet → master.
  const chipConvolver = audioCtx.createConvolver();
  const chipReverbWet = audioCtx.createGain();
  chipReverbWet.gain.value = 0.12;
  (function buildChipImpulse() {
    const sr  = audioCtx.sampleRate;
    const len = Math.floor(sr * 0.025);
    const buf = audioCtx.createBuffer(1, len, sr);
    const d   = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    chipConvolver.buffer = buf;
  })();
  musicGain.connect(chipConvolver);
  chipConvolver.connect(chipReverbWet);
  chipReverbWet.connect(masterGain);

  const SCHED_AHEAD_SEC = 0.20;
  const SCHED_TICK_MS   = 55;

  // ── 8-bit theme ── A natural minor, 8th notes @ 120 BPM (0.25 s / step) ─────
  const N8_STEP = 60 / 120 / 2;
  // Pattern A — upper register, energetic (original theme)
  const N8A_MEL = [880,    0,     659.25, 783.99, 880,    0,     783.99, 659.25,
                   587.33, 0,     659.25, 0,      440,   523.25, 659.25, 587.33];
  const N8A_HAR = [659.25, 0,    493.88, 587.33, 659.25,  0,    587.33, 493.88,
                   440,    0,    493.88, 0,       220,   261.63, 493.88, 440];
  const N8A_BAS = [110, 0, 110, 0,  82.41, 0, 82.41, 0,  73.42, 0, 73.42, 0,  110, 0, 82.41, 0];
  const N8A_DRM = [1, 0, 2, 0,  1, 0, 2, 3,  1, 0, 2, 0,  1, 3, 2, 0];
  // Pattern B — mid register, brooding bridge (alternates every loop)
  const N8B_MEL = [440,    0,    329.63, 349.23, 392,    0,    349.23, 329.63,
                   293.66, 0,    329.63, 0,      261.63, 293.66, 329.63, 261.63];
  const N8B_HAR = [329.63, 0,   246.94, 261.63, 293.66, 0,    261.63, 246.94,
                   220,    0,   246.94, 0,      196,    220,   246.94, 196];
  const N8B_BAS = [110, 0, 0, 110,  82.41, 0, 0, 82.41,  73.42, 0, 0, 73.42,  130.81, 0, 0, 82.41];
  const N8B_DRM = [1, 0, 2, 2,  1, 0, 2, 3,  1, 0, 2, 2,  1, 0, 3, 2];

  // ── 16-bit boss ── A Phrygian dominant, 16th notes @ 175 BPM (≈0.086 s/step) ─
  const N16_STEP = 60 / 175 / 4;
  // Pattern A — aggressive, angular
  const N16A_MEL = [
    880,    1046.5,  1318.5,  1046.5,  1174.66, 1318.5,  1046.5,  880,
    783.99, 880,     932.33,  880,     783.99,  698.46,  659.25,  587.33,
    659.25, 783.99,  880,     1046.5,  1174.66, 1318.5,  1174.66, 1046.5,
    932.33, 880,     783.99,  698.46,  659.25,  587.33,  659.25,  0,
  ];
  const N16A_HAR = [
    440,    523.25, 659.25, 523.25,  587.33, 659.25, 523.25, 440,
    392,    440,    466.16, 440,     392,    349.23, 329.63, 293.66,
    329.63, 392,    440,    523.25,  587.33, 659.25, 587.33, 523.25,
    466.16, 440,    392,    349.23,  329.63, 293.66, 329.63, 0,
  ];
  const N16A_BAS = [
    110, 0, 110, 0,  116.54, 0, 110, 0,  98, 0, 110, 0,  87.31, 0, 82.41, 0,
    110, 0, 110, 0,  116.54, 0, 110, 0,  98, 0, 87.31, 0, 82.41, 0, 110, 0,
  ];
  const N16A_DRM = [
    1, 0, 2, 3,  1, 2, 3, 2,  1, 0, 2, 3,  1, 2, 3, 2,
    1, 3, 2, 0,  1, 2, 3, 2,  1, 0, 2, 3,  1, 3, 2, 3,
  ];
  // Pattern B — chromatic cluster "Phase 2" urgency
  const N16B_MEL = [
    880,    932.33,  1046.5,  1108.73, 1046.5,  932.33,  880,    932.33,
    1046.5, 1174.66, 1318.5,  1174.66, 1046.5,  880,     783.99, 880,
    932.33, 1046.5,  1108.73, 1046.5,  932.33,  880,     783.99, 698.46,
    659.25, 698.46,  783.99,  880,     932.33,  880,     783.99, 0,
  ];
  const N16B_HAR = [
    440,    466.16, 523.25, 554.37,  523.25, 466.16, 440,    466.16,
    523.25, 587.33, 659.25, 587.33,  523.25, 440,    392,    440,
    466.16, 523.25, 554.37, 523.25,  466.16, 440,    392,    349.23,
    329.63, 349.23, 392,    440,     466.16, 440,    392,    0,
  ];
  const N16B_BAS = [
    110, 0, 116.54, 0,  110, 0, 87.31, 0,  110, 0, 116.54, 0,  98, 0, 87.31, 0,
    110, 0, 116.54, 0,  82.41, 0, 87.31, 0, 73.42, 0, 82.41, 0, 87.31, 0, 110, 0,
  ];
  const N16B_DRM = [
    1, 2, 3, 2,  1, 2, 3, 2,  1, 2, 3, 2,  1, 2, 3, 2,
    1, 3, 2, 3,  1, 2, 3, 1,  1, 2, 3, 2,  1, 3, 2, 3,
  ];

  // ── Sequencer state ──────────────────────────────────────────────────────────
  let seqActive    = false;
  let seqBossMode  = false;
  let seqBossTransitioning = false;  // M3: transitioning from 8-bit to 16-bit
  let seqTimerId   = null;
  let nextNoteAt   = 0;
  let seqStep      = 0;
  let seqCycle     = 0;   // A: increments each full loop; odd cycles → pattern B
  let seqWave      = 1;   // F: current wave number for BPM scaling
  let seqTempoMult = 1.0; // F: computed from seqWave
  let seqTargetTempoMult = 1.0;  // M3: target tempo during transition
  let biomeIndex   = 0;   // A1: current biome index
  let droneOsc     = null;  // A1: ambient biome drone oscillator
  let droneGain    = null;  // A1: drone gain node
  let comboStingerCooldown = 0;  // S2: prevents spam
  let lastHitPitchVar = 0;  // S7: last pitch variation for hit

  // D — Vibrato: lfo sine oscillator → lfoGain → osc.frequency (AudioParam mod).
  function addVibrato(osc, t, noteDur, depthHz) {
    if (depthHz <= 0) return;
    const lfo     = audioCtx.createOscillator();
    const lfoGain = audioCtx.createGain();
    lfo.type             = "sine";
    lfo.frequency.value  = 5.5;
    lfoGain.gain.value   = depthHz;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    lfo.start(t + 0.04);
    lfo.stop(t + noteDur + 0.01);
  }

  // Staccato chip note — NES pulse channel feel. vibrato = LFO depth in Hz.
  function schedChipNote(freq, t, stepDur, vol, oscType, vibrato) {
    if (!freq || freq < 10) return;
    const osc     = audioCtx.createOscillator();
    const g       = audioCtx.createGain();
    const noteDur = stepDur * 0.52;
    osc.type = oscType;
    osc.frequency.setValueAtTime(freq, t);
    if (vibrato > 0) addVibrato(osc, t, noteDur, vibrato);
    // D1: add panning for melody (slightly off-beat notes)
    if (oscType === "square" && vol >= 0.018 && Math.random() < 0.3) {
      addPanning(osc, t, noteDur);
    }
    g.gain.setValueAtTime(vol, t);
    g.gain.setValueAtTime(vol * 0.65, t + noteDur * 0.55);
    g.gain.linearRampToValueAtTime(0.0001, t + noteDur);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(t);
    osc.stop(t + noteDur + 0.008);
  }


  // Chip kick: pitch-drop square pulse.
  function schedChipKick(t, is16) {
    const osc = audioCtx.createOscillator();
    const g   = audioCtx.createGain();
    osc.type  = "square";
    osc.frequency.setValueAtTime(is16 ? 150 : 110, t);
    osc.frequency.exponentialRampToValueAtTime(22, t + 0.065);
    g.gain.setValueAtTime(is16 ? 0.048 : 0.038, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  // Chip hihat: two detuned high-freq squares.
  function schedChipHihat(t, is16) {
    [3500, 4300].forEach((freq) => {
      const osc = audioCtx.createOscillator();
      const g   = audioCtx.createGain();
      osc.type  = "square";
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(is16 ? 0.013 : 0.009, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (is16 ? 0.028 : 0.038));
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t);
      osc.stop(t + 0.042);
    });
  }

  // Chip snare: stacked square bursts at percussion frequencies.
  function schedChipSnare(t, is16) {
    [175, 220, 290].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const g   = audioCtx.createGain();
      osc.type  = "square";
      osc.frequency.setValueAtTime(freq, t + idx * 0.004);
      g.gain.setValueAtTime(is16 ? 0.024 : 0.018, t + idx * 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(t + idx * 0.004);
      osc.stop(t + 0.082);
    });
  }

  // H — Arpeggio fill: 4 ascending notes within the last step of a loop cycle.
  function schedArpeggioFill(baseFreq, stepAt, stepDur, is16) {
    const mults  = [1, 1.189, 1.498, 2];
    const vol    = is16 ? 0.016 : 0.014;
    const nDur   = stepDur * 0.10;
    mults.forEach((m, idx) => {
      schedChipNote(baseFreq * m, stepAt + stepDur * (0.60 + idx * 0.12),
                    nDur, vol, "square", 0);
    });
  }

  function runSequencer() {
    if (!seqActive || audioCtx.state !== "running") return;
    const now      = audioCtx.currentTime;
    const is16     = seqBossMode;
    const baseStep = is16 ? N16_STEP : N8_STEP;
    const step     = baseStep / seqTempoMult;  // F: wave-scaled tempo
    const len      = is16 ? N16A_MEL.length : N8A_MEL.length;

    while (nextNoteAt < now + SCHED_AHEAD_SEC) {
      const i    = seqStep % len;
      const useB = (seqCycle % 2 === 1);      // A: alternate A/B patterns
      const mel  = is16 ? (useB ? N16B_MEL : N16A_MEL) : (useB ? N8B_MEL : N8A_MEL);
      const har  = is16 ? (useB ? N16B_HAR : N16A_HAR) : (useB ? N8B_HAR : N8A_HAR);
      const bas  = is16 ? (useB ? N16B_BAS : N16A_BAS) : (useB ? N8B_BAS : N8A_BAS);
      const drm  = is16 ? (useB ? N16B_DRM : N16A_DRM) : (useB ? N8B_DRM : N8A_DRM);

      // D: vibrato — melody ±3–4 Hz, harmony ±1.5–2.5 Hz, bass 0
      schedChipNote(mel[i], nextNoteAt, step, is16 ? 0.021 : 0.018, "square", is16 ? 4.0 : 3.0);
      schedChipNote(har[i], nextNoteAt, step, is16 ? 0.014 : 0.011, "square", is16 ? 2.5 : 1.5);
      schedChipNote(bas[i], nextNoteAt, step * 1.7, is16 ? 0.030 : 0.022,
                    is16 ? "sawtooth" : "square", 0);

      if (drm[i] === 1) schedChipKick(nextNoteAt, is16);
      if (drm[i] === 2) schedChipHihat(nextNoteAt, is16);
      if (drm[i] === 3) schedChipSnare(nextNoteAt, is16);

      // H: arpeggio fill on the last step of the loop
      if (i === len - 1) {
        const arpBase = is16 ? (useB ? 659.25 : 880) : (useB ? 261.63 : 440);
        schedArpeggioFill(arpBase, nextNoteAt, step, is16);
        seqCycle += 1;
      }

      seqStep    += 1;
      nextNoteAt += step;
    }
  }

  // D1 — Panning: detune osc left/right with LFO (0.3 Hz sine).
  function addPanning(osc, t, noteDur) {
    const panLfo = audioCtx.createOscillator();
    const panGain = audioCtx.createGain();
    const panAmp = audioCtx.createGain();
    panLfo.type = "sine";
    panLfo.frequency.value = 0.3;
    panGain.gain.value = 2;
    panAmp.gain.setValueAtTime(0, t);
    panAmp.gain.linearRampToValueAtTime(1, t + 0.4);
    panLfo.connect(panGain);
    panGain.connect(panAmp);
    panAmp.connect(osc.detune);
    panLfo.start(t);
    panLfo.stop(t + noteDur + 0.1);
  }

  // A1 — Biome drone: continuous low-frequency sine sustain (varies by biome).
  function startBiomeDrone() {
    if (droneOsc) return;
    const drones  = [82.41, 110, 73.42, 61.74];  // different freq per biome
    const droneFreq = drones[biomeIndex % drones.length];
    droneOsc = audioCtx.createOscillator();
    droneGain = audioCtx.createGain();
    droneOsc.type = "sine";
    droneOsc.frequency.value = droneFreq;
    droneGain.gain.setValueAtTime(0.025, audioCtx.currentTime);
    droneOsc.connect(droneGain);
    droneGain.connect(musicGain);
    droneOsc.start();
  }

  function stopBiomeDrone() {
    if (!droneOsc) return;
    const now = audioCtx.currentTime;
    droneGain.gain.setTargetAtTime(0.0001, now, 0.6);
    setTimeout(() => {
      droneOsc.stop();
      droneOsc = null;
      droneGain = null;
    }, 650);
  }

  // S2 — Combo stinger: 4-note rapid ascent at 5, 10, 15... combos.
  function playComboStinger() {
    if (audioCtx.state !== "running") return;
    const notes = [392, 523.25, 659.25, 880];
    const interval = 0.06;
    const now = audioCtx.currentTime;
    notes.forEach((freq, idx) => {
      schedChipNote(freq, now + idx * interval, 0.04, 0.022, "square", 0);
    });
  }

  // S1 — Power-up SFX: distinct synth per type.
  function playPowerUpSFX(type) {
    if (audioCtx.state !== "running") return;
    const profileByType = {
      sniper: { f: 980, d: 0.11, t: "triangle", s: -210, v: 0.032 },
      wide: { f: 460, d: 0.1, t: "square", s: 120, v: 0.03 },
      volley: { f: 560, d: 0.09, t: "square", s: 90, v: 0.028 },
      rapid: { f: 720, d: 0.08, t: "triangle", s: 160, v: 0.028 },
      overcharge: { f: 420, d: 0.13, t: "sawtooth", s: 240, v: 0.03 },
      back: { f: 320, d: 0.1, t: "triangle", s: -80, v: 0.027 },
      cone: { f: 640, d: 0.09, t: "triangle", s: 70, v: 0.027 },
      double: { f: 600, d: 0.09, t: "square", s: 60, v: 0.026 },
      repair: { f: 250, d: 0.2, t: "sine", s: 360, v: 0.025 },
      ricochet: { f: 700, d: 0.1, t: "square", s: 180, v: 0.029 },
    };

    const p = profileByType[type] || profileByType.double;
    beep({ frequency: p.f, duration: p.d, type: p.t, volume: p.v, slide: p.s, bus: "sfx" });
  }

  function playDashActivate() {
    if (audioCtx.state !== "running") return;
    beep({ frequency: 340, duration: 0.06, type: "square", volume: 0.035, slide: 320, bus: "sfx" });
    setTimeout(() => beep({ frequency: 760, duration: 0.07, type: "triangle", volume: 0.03, slide: -120, bus: "sfx" }), 45);
  }

  function playShotByType(shotType) {
    if (audioCtx.state !== "running") return;
    const map = {
      sniper: { f: 680, d: 0.08, t: "square", s: -320, v: 0.038 },
      volley: { f: 840, d: 0.055, t: "triangle", s: -140, v: 0.028 },
      wide: { f: 760, d: 0.05, t: "triangle", s: -180, v: 0.026 },
      overcharge: { f: 720, d: 0.07, t: "sawtooth", s: -130, v: 0.032 },
      rapid: { f: 950, d: 0.04, t: "triangle", s: -120, v: 0.022 },
      default: { f: 920, d: 0.06, t: "triangle", s: -220, v: 0.03 },
    };
    const p = map[shotType] || map.default;
    beep({ frequency: p.f, duration: p.d, type: p.t, slide: p.s, volume: p.v });
  }

  function playShotMiss() {
    if (audioCtx.state !== "running") return;
    beep({ frequency: 240, duration: 0.04, type: "sine", slide: -60, volume: 0.01, bus: "ui" });
  }

  function playCriticalHit() {
    if (audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    [880, 1174.66, 1567.98].forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.024);
      gain.gain.setValueAtTime(0.03, now + idx * 0.024);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.024 + 0.11);
      osc.connect(gain);
      gain.connect(sfxGain);
      osc.start(now + idx * 0.024);
      osc.stop(now + idx * 0.024 + 0.12);
    });
  }

  // S5 — Special charging tone: ascending pitch as meter fills.
  function playSpecialChargingTone(chargePercent) {
    if (audioCtx.state !== "running" || chargePercent <= 0) return;
    const baseFreq = 220;
    const freqAtPercent = baseFreq + (chargePercent / 100) * 330;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freqAtPercent, audioCtx.currentTime);
    g.gain.setValueAtTime(0.015, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.12);
    osc.connect(g); g.connect(sfxGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.13);
  }

  // D5 — Combo shimmer: high-freq tone when combo >= 2.0.
  function playComboShimmer(comboMult) {
    if (audioCtx.state !== "running" || comboMult < 2.0) return;
    const intensity = Math.min((comboMult - 1) * 0.5, 1);
    const freq = 8000 + intensity * 2000;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    g.gain.setValueAtTime(intensity * 0.008, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.15);
    osc.connect(g); g.connect(musicGain);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.16);
  }

  // S3 — Boss hit SFX: 3-pulse energy burst.
  function playBossHitSFX() {
    if (audioCtx.state !== "running") return;
    const now = audioCtx.currentTime;
    [0, 0.08, 0.16].forEach((delay) => {
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = "square";
      o.frequency.setValueAtTime(180 + Math.random() * 40, now + delay);
      o.frequency.exponentialRampToValueAtTime(40, now + delay + 0.06);
      g.gain.setValueAtTime(0.045, now + delay);
      g.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.08);
      o.connect(g); g.connect(sfxGain);
      o.start(now + delay);
      o.stop(now + delay + 0.10);
    });
  }

  // S7 — Hit feedback variado: ±50 cents pitch variation.
  function playHitVariedPitch(baseFreq, isBoss) {
    if (audioCtx.state !== "running") return;
    const variation = (Math.random() - 0.5) * 100;  // ±50 cents
    const freq = baseFreq * Math.pow(2, variation / 1200);
    beep({
      frequency: freq,
      duration: isBoss ? 0.16 : 0.13,
      type: isBoss ? "square" : "sawtooth",
      volume: isBoss ? 0.06 : 0.05,
      slide: isBoss ? 70 : 180,
      bus: "sfx"
    });
  }

  // M3 — Boss transition: gradually increase tempo from normal to boss over duration.
  function setBossMusicTransition(active) {
    if (active) {
      seqBossTransitioning = true;
      seqTargetTempoMult = 1.22;  // target 22% faster
      const transStart = audioCtx.currentTime;
      const transDur = 1.5;  // 1.5 seconds
      const updateInterval = setInterval(() => {
        const elapsed = audioCtx.currentTime - transStart;
        if (elapsed >= transDur) {
          seqTempoMult = seqTargetTempoMult;
          seqBossTransitioning = false;
          clearInterval(updateInterval);
        } else {
          const t = elapsed / transDur;
          seqTempoMult = 1.0 + (seqTargetTempoMult - 1.0) * (t * t);  // ease-in-out
        }
      }, 30);
    }
  }

  // D2 & A3 — Enhanced fade out with boss ducking and pitch drop.
  function fadeOutMusicEnhanced(durationSec, isBoss) {
    const dur = durationSec || 1.2;
    if (!seqActive) return;
    const now = audioCtx.currentTime;
    
    // A3: pitch down effect on the sequencer fade
    if (isBoss && droneOsc) {
      droneOsc.frequency.setTargetAtTime(droneOsc.frequency.value * 0.5, now, dur * 0.4);
    }
    
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(0.0001, now + dur);
    
    setTimeout(() => {
      seqActive = false;
      if (seqTimerId !== null) { clearInterval(seqTimerId); seqTimerId = null; }
      stopBiomeDrone();
      musicGain.gain.setValueAtTime(musicBaseGain, audioCtx.currentTime);
    }, Math.ceil(dur * 1000) + 60);
  }

  function startMusic() {
    if (seqActive) return;
    seqActive    = true;
    seqBossMode  = false;
    seqStep      = 0;
    seqCycle     = 0;
    nextNoteAt   = audioCtx.currentTime + 0.10;
    startBiomeDrone();  // A1: start the biome drone
    runSequencer();
    seqTimerId   = setInterval(runSequencer, SCHED_TICK_MS);
  }

  // E — Fade out music gain linearly then stop the sequencer.
  function fadeOutMusic(durationSec) {
    const dur = durationSec || 1.2;
    if (!seqActive) return;
    const now = audioCtx.currentTime;
    musicGain.gain.cancelScheduledValues(now);
    musicGain.gain.setValueAtTime(musicGain.gain.value, now);
    musicGain.gain.linearRampToValueAtTime(0.0001, now + dur);
    setTimeout(() => {
      seqActive = false;
      if (seqTimerId !== null) { clearInterval(seqTimerId); seqTimerId = null; }
      musicGain.gain.setValueAtTime(musicBaseGain, audioCtx.currentTime);
    }, Math.ceil(dur * 1000) + 60);
  }

  function stopMusic() {
    seqActive = false;
    if (seqTimerId !== null) { clearInterval(seqTimerId); seqTimerId = null; }
    stopBiomeDrone();  // A1: stop biome drone on music stop
  }

  // F — Called with the current wave number; updates the sequencer tempo multiplier.
  function setWave(n) {
    seqWave      = clamp(n, 1, 20);
    seqTempoMult = 1 + Math.min((seqWave - 1) * 0.016, 0.22);
  }

  // B — Boss stinger: 4-note ascending fanfare before switching to 16-bit.
  function playBossStinger(callback) {
    if (audioCtx.state !== "running") {
      if (callback) callback();
      return;
    }
    const notes = [880, 1046.5, 1174.66, 1318.5];
    const noteDur = 0.12;
    const noteSpacing = 0.10;
    const now = audioCtx.currentTime;

    notes.forEach((freq, idx) => {
      const startTime = now + idx * noteSpacing;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.06, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + noteDur);
      osc.connect(gain);
      gain.connect(musicGain);
      osc.start(startTime);
      osc.stop(startTime + noteDur);
    });

    if (callback) {
      const totalDur = notes.length * noteSpacing + noteDur;
      setTimeout(callback, Math.ceil(totalDur * 1000) + 30);
    }
  }

  function setBossMusicMode(active) {
    if (seqBossMode === !!active) return;
    if (active) {
      // M3: Start tempo transition before stinger
      setBossMusicTransition(true);
      // B: play stinger, then switch to 16-bit mode
      playBossStinger(() => {
        seqBossMode = true;
        seqStep     = 0;
        seqCycle    = 0;
        nextNoteAt  = audioCtx.currentTime + 0.04;
        musicGain.gain.setTargetAtTime(Math.min(musicBaseGain * 1.30, 1), audioCtx.currentTime, 0.25);
      });
    } else {
      seqBossMode = false;
      seqBossTransitioning = false;  // M3: reset transition state
      seqStep     = 0;
      seqCycle    = 0;
      nextNoteAt  = audioCtx.currentTime + 0.04;
      musicGain.gain.setTargetAtTime(musicBaseGain, audioCtx.currentTime, 0.50);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────────
  return {
    unlock: () => {
      if (audioCtx.state === "suspended") audioCtx.resume();
    },
    setBusLevels,
    setProfile,
    updateAdaptiveState,
    sidechainImpact,
    shoot: (shotType = "default") => playShotByType(shotType),
    hit: () => beep({ frequency: 190, duration: 0.13, type: "sawtooth", slide: 180, volume: 0.05 }),
    bossHit: () => beep({ frequency: 160, duration: 0.16, type: "square", slide: 70, volume: 0.06 }),
    playerHit: () => {
      sidechainImpact(0.58, 0.26);
      beep({ frequency: 300, duration: 0.14, type: "square", slide: -120, volume: 0.05 });
    },
    uiConfirm: () => beep({ frequency: 640, duration: 0.08, type: "triangle", volume: 0.04, slide: 120, bus: "ui" }),
    uiError: () => beep({ frequency: 220, duration: 0.1, type: "square", volume: 0.04, slide: -80, bus: "ui" }),
    uiReroll: () => {
      beep({ frequency: 500, duration: 0.06, type: "triangle", volume: 0.028, slide: 110, bus: "ui" });
      setTimeout(() => beep({ frequency: 620, duration: 0.06, type: "triangle", volume: 0.024, slide: 90, bus: "ui" }), 60);
    },
    dashReady: () => beep({ frequency: 420, duration: 0.05, type: "sine", volume: 0.025, slide: 75, bus: "ui" }),
    dashActivate: playDashActivate,
    shotMiss: playShotMiss,
    criticalHit: playCriticalHit,
    specialReady: () => {
      beep({ frequency: 710, duration: 0.07, type: "triangle", volume: 0.04, slide: 80, bus: "ui" });
      setTimeout(() => beep({ frequency: 880, duration: 0.08, type: "triangle", volume: 0.03, slide: 110, bus: "ui" }), 55);
    },
    specialCast: () => {
      sidechainImpact(0.7, 0.32);
      beep({ frequency: 520, duration: 0.1, type: "triangle", volume: 0.03, slide: 220, bus: "sfx" });
      setTimeout(() => beep({ frequency: 760, duration: 0.14, type: "sine", volume: 0.022, slide: -40, bus: "music" }), 40);
    },
    waveClear: () => {
      beep({ frequency: 520, duration: 0.12, type: "triangle", volume: 0.045, bus: "sfx" });
      setTimeout(() => beep({ frequency: 680, duration: 0.12, type: "triangle", volume: 0.045, bus: "sfx" }), 90);
    },
    gameOver: () => {
      beep({ frequency: 280, duration: 0.2, type: "square", slide: -120, volume: 0.05, bus: "sfx" });
      setTimeout(() => beep({ frequency: 180, duration: 0.28, type: "square", slide: -80, volume: 0.045, bus: "sfx" }), 120);
    },
    startMusic,
    stopMusic,
    fadeOutMusic,
    fadeOutMusicEnhanced,
    setWave,
    setBossMode: setBossMusicMode,
    playBossHitSFX,
    setBossMusicTransition,
    playComboStinger,
    playPowerUpSFX,
    playSpecialChargingTone,
    playComboShimmer,
    startBiomeDrone,
    stopBiomeDrone,
    playHitVariedPitch,
    pauseAudio: () => { if (audioCtx.state === "running") audioCtx.suspend(); },
    resumeAudio: () => { if (audioCtx.state === "suspended") audioCtx.resume(); },
  };
}

function lerp(start, end, t) {
  return start + (end - start) * t;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distanceBetween(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function intersectsRect(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function insetHitbox(entity, insetX, insetY) {
  return {
    x: entity.x + insetX,
    y: entity.y + insetY,
    w: Math.max(2, entity.w - insetX * 2),
    h: Math.max(2, entity.h - insetY * 2),
  };
}

function getPlayerHitbox(entity) {
  return insetHitbox(entity, entity.w * 0.24, entity.h * 0.2);
}

function getEnemyHitbox(entity) {
  return insetHitbox(entity, entity.w * 0.2, entity.h * 0.18);
}

function getBossHitbox(entity) {
  return insetHitbox(entity, entity.w * 0.22, entity.h * 0.2);
}

function getPlayerBulletHitbox(entity) {
  return insetHitbox(entity, entity.w * 0.34, entity.h * 0.08);
}

function getEnemyProjectileHitbox(entity) {
  if (entity.style === "orb" || entity.style === "boss-orb") {
    return insetHitbox(entity, entity.w * 0.22, entity.h * 0.22);
  }
  return insetHitbox(entity, entity.w * 0.22, entity.h * 0.08);
}

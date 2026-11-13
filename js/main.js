// App entrypoint: input bindings, frame loop, and boot lifecycle.
function gameLoop(timestamp) {
  // Pedir el siguiente frame primero: si una excepcion escapa de la simulacion,
  // el bucle sigue vivo en lugar de congelar el juego hasta recargar.
  animationId = requestAnimationFrame(gameLoop);
  if (!lastFrameTime) lastFrameTime = timestamp;

  const dtRaw = timestamp - lastFrameTime;
  const dt = Math.min(100, Math.max(0, dtRaw));
  const step = 1000 / 60;

  frameAccumulator += dt;
  let steps = 0;
  while (frameAccumulator >= step && steps < maxFrameCatchUpSteps) {
    updateGameStateFrame();
    frameAccumulator -= step;
    steps += 1;
  }

  if (steps === maxFrameCatchUpSteps && frameAccumulator > step * 2) {
    frameAccumulator = step;
  }

  draw();
  lastFrameTime = timestamp;
}

// Atajos de ajuste (hitboxes, cadencia/rastreo del jefe) solo con ?debug en la URL.
const DEBUG_SHORTCUTS_ENABLED = new URLSearchParams(window.location.search).has("debug");

function handleDebugShortcut(event) {
  if (!event.repeat && event.code === "KeyB") {
    GAME_TUNING.debugHitboxes = !GAME_TUNING.debugHitboxes;
    return true;
  }
  if (event.code === "Minus") {
    GAME_TUNING.bossFireRate = clamp(GAME_TUNING.bossFireRate - 0.1, 0.5, 2.2);
    return true;
  }
  if (event.code === "Equal") {
    GAME_TUNING.bossFireRate = clamp(GAME_TUNING.bossFireRate + 0.1, 0.5, 2.2);
    return true;
  }
  if (event.code === "BracketLeft") {
    GAME_TUNING.bossOrbTracking = clamp(GAME_TUNING.bossOrbTracking - 0.1, 0.3, 2.4);
    return true;
  }
  if (event.code === "BracketRight") {
    GAME_TUNING.bossOrbTracking = clamp(GAME_TUNING.bossOrbTracking + 0.1, 0.3, 2.4);
    return true;
  }
  return false;
}

loadProfile();
renderShop();
refreshResumeButton();
applyPerformancePreset(currentPerformancePreset);
initDisplayModePreference();
initUiPresentationPreferences();
initAudioPreferences();
initGameplayOptionPreferences();
updateHud();

document.addEventListener("keydown", (event) => {
  audioEngine.unlock();

  if (!event.repeat && event.code === "Escape") {
    if (document.fullscreenElement) return;
    if (phase === "playing") {
      pauseGame();
    } else if (phase === "paused") {
      continueGame();
    }
    event.preventDefault();
    return;
  }

  if (!event.repeat && (event.code === "KeyQ" || event.code === "KeyE")) {
    event.preventDefault();
    event.stopPropagation();
    tryActivateSpecial();
    return;
  }

  if (DEBUG_SHORTCUTS_ENABLED && handleDebugShortcut(event)) return;

  if (event.code === "ArrowLeft"  || event.code === "KeyA") keys.left  = true;
  if (event.code === "ArrowRight" || event.code === "KeyD") keys.right = true;
  if (event.code === "ArrowUp"    || event.code === "KeyW") { keys.up   = true; event.preventDefault(); }
  if (event.code === "ArrowDown"  || event.code === "KeyS") { keys.down = true; event.preventDefault(); }
  if (event.code === "ShiftLeft"  || event.code === "ShiftRight") keys.dash = true;
  if (event.code === "Space") {
    keys.space = true;
    event.preventDefault();
  }
});

document.addEventListener("keyup", (event) => {
  if (event.code === "ArrowLeft"  || event.code === "KeyA") keys.left  = false;
  if (event.code === "ArrowRight" || event.code === "KeyD") keys.right = false;
  if (event.code === "ArrowUp"    || event.code === "KeyW") keys.up    = false;
  if (event.code === "ArrowDown"  || event.code === "KeyS") keys.down  = false;
  if (event.code === "ShiftLeft"  || event.code === "ShiftRight") keys.dash = false;
  if (event.code === "Space") keys.space = false;
});

startBtn.addEventListener("click", () => {
  audioEngine.unlock();
  runStartNewGame();
});

if (resumeBtn) {
  resumeBtn.addEventListener("click", () => {
    audioEngine.unlock();
    if (!resumeRunFromCheckpoint()) {
      refreshResumeButton();
      audioEngine.uiError();
    }
  });
}

continueBtn.addEventListener("click", () => {
  audioEngine.unlock();
  continueGame();
});

restartBtn.addEventListener("click", () => {
  audioEngine.unlock();
  runStartNewGame();
});

if (resumeBtn) {
  resumeBtn.addEventListener("click", () => {
    audioEngine.unlock();
    if (!resumeRunFromCheckpoint()) {
      refreshResumeButton();
      audioEngine.uiError();
    }
  });
}

menuBtn.addEventListener("click", () => {
  gameOverOverlay.classList.remove("show");
  gameOverOverlay.setAttribute("aria-hidden", "true");
  openMenu("main");
});

pauseBtn.addEventListener("click", () => {
  pauseGame();
});

difficultySelect.addEventListener("change", () => {
  difficulty = getDifficultyConfig();
  if (player) player.speed = difficulty.playerSpeed * player.skinStats.speedMult;
  if (phase === "menu") saveProfile();
});

performancePreset.addEventListener("change", () => {
  applyPerformancePreset(performancePreset.value);
});

if (displayModeSelect) {
  displayModeSelect.addEventListener("change", () => {
    setDisplayMode(displayModeSelect.value);
  });
}

if (uiModeSelect) {
  uiModeSelect.addEventListener("change", () => {
    const mode = uiModeSelect.value === "lite" ? "lite" : "standard";
    applyUiMode(mode);
    persistUiPreference("gg_ui_mode", mode);
  });
}

if (hudDensitySelect) {
  hudDensitySelect.addEventListener("change", () => {
    const mode = hudDensitySelect.value === "compact" ? "compact" : "normal";
    applyHudDensityMode(mode);
    persistUiPreference("gg_hud_density", mode);
  });
}

if (audioProfileSelect) {
  audioProfileSelect.addEventListener("change", () => {
    const profile = audioProfileSelect.value === "immersive" ? "immersive" : "lite";
    audioEngine.setProfile(profile);
    persistUiPreference("gg_audio_profile", profile);
  });
}

if (shakeToggle) {
  shakeToggle.addEventListener("change", () => {
    enableScreenShake = !!shakeToggle.checked;
    persistUiPreference("gg_shake_enabled", enableScreenShake ? "1" : "0");
  });
}

if (particlesToggle) {
  particlesToggle.addEventListener("change", () => {
    enableParticles = !!particlesToggle.checked;
    persistUiPreference("gg_particles_enabled", enableParticles ? "1" : "0");
  });
}

if (colorblindToggle) {
  colorblindToggle.addEventListener("change", () => {
    enableColorblindMode = !!colorblindToggle.checked;
    document.body.classList.toggle("colorblind-mode", enableColorblindMode);
    persistUiPreference("gg_colorblind_enabled", enableColorblindMode ? "1" : "0");
  });
}

if (audioMasterSlider) {
  audioMasterSlider.addEventListener("input", () => {
    const v = clamp(Number(audioMasterSlider.value) / 100, 0, 1);
    audioEngine.setBusLevels({ master: v });
    persistUiPreference("gg_audio_master", String(v));
  });
}

if (audioSfxSlider) {
  audioSfxSlider.addEventListener("input", () => {
    const v = clamp(Number(audioSfxSlider.value) / 100, 0, 1);
    audioEngine.setBusLevels({ sfx: v });
    persistUiPreference("gg_audio_sfx", String(v));
  });
}

if (audioUiSlider) {
  audioUiSlider.addEventListener("input", () => {
    const v = clamp(Number(audioUiSlider.value) / 100, 0, 1);
    audioEngine.setBusLevels({ ui: v });
    persistUiPreference("gg_audio_ui", String(v));
  });
}

if (audioMusicSlider) {
  audioMusicSlider.addEventListener("input", () => {
    const v = clamp(Number(audioMusicSlider.value) / 100, 0, 1);
    audioEngine.setBusLevels({ music: v });
    persistUiPreference("gg_audio_music", String(v));
  });
}

document.addEventListener("fullscreenchange", handleFullscreenChange);

// Al perder el foco el navegador no envia keyup: soltar todo y pausar.
window.addEventListener("blur", () => {
  releaseAllKeys();
  pauseGame();
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    releaseAllKeys();
    pauseGame();
  }
});

animationId = requestAnimationFrame(gameLoop);

// Tab navigation for the main menu
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', String(b === btn));
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === 'tab-' + target);
    });
  });
});

window.addEventListener("beforeunload", () => {
  cancelAnimationFrame(animationId);
  saveProfile();
});

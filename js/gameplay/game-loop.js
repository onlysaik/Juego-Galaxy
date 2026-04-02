// Main gameplay frame: movement, spawns, timers, and orchestration.
function updateGameStateFrame() {
  if (!running || !player) return;

  difficulty = getDifficultyConfig();
  const eco = getEconomyModifiers();
  player.speed = difficulty.playerSpeed * player.skinStats.speedMult * eco.speedMult * (1 + runSpeedBonus);

  const moveAxisX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const moveAxisY = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  const isMoving = moveAxisX !== 0 || moveAxisY !== 0;

  if (keys.dash && dashCooldown <= 0 && dashFrames <= 0) {
    tryStartDash();
  }

  const targetLean = moveAxisX * 0.55;
  player.lean = lerp(player.lean, targetLean, 0.16);
  const targetBoost = isMoving ? 1 : 0.35;
  player.boost = lerp(player.boost, targetBoost, 0.08);
  player.recoil = Math.max(0, player.recoil - 0.1);
  emitEngineParticles();
  updateEngineParticles();

  const ACCEL = 0.65;
  const FRICTION = 0.82;
  const maxSpeed = player.speed;

  if (dashFrames > 0) {
    player.vx = player.dashVX;
    player.vy = player.dashVY;
    dashFrames -= 1;
    if (dashFrames === 0) {
      dashBursts.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, phase: "end", life: 18 });
    }
  } else {
    player.vx += moveAxisX * ACCEL;
    player.vy += moveAxisY * ACCEL;
    if (moveAxisX === 0) player.vx *= FRICTION;
    if (moveAxisY === 0) player.vy *= FRICTION;
    player.vx = clamp(player.vx, -maxSpeed, maxSpeed);
    player.vy = clamp(player.vy, -maxSpeed, maxSpeed);
  }

  player.x = clamp(player.x + player.vx, 0, WIDTH - player.w);
  player.y = clamp(player.y + player.vy, 0, HEIGHT - player.h);

  // Eventos de mapa desactivados por diseno para una lectura de combate mas limpia.
  currentEvent = null;

  if (keys.space && shootCooldown <= 0) {
    firePlayerShot();
    shootCooldown = getShootCooldownFrames();
  }
  if (shootCooldown > 0) shootCooldown -= 1;
  if (damageCooldown > 0) damageCooldown -= 1;
  if (dashCooldown > 0) dashCooldown -= 1;
  if (dashInvulnFrames > 0) dashInvulnFrames -= 1;
  if (specialActiveFrames > 0) specialActiveFrames -= 1;
  if (specialFlashFrames > 0) specialFlashFrames -= 1;
  if (shotMissCooldown > 0) shotMissCooldown -= 1;
  if (momentumTimerFrames > 0) momentumTimerFrames -= 1;
  if (momentumTimerFrames <= 0) momentumStacks = Math.max(0, momentumStacks - 1);
  if (objectiveFlashFrames > 0) objectiveFlashFrames -= 1;
  processSpecialPulseQueue();

  if (comboStacks > 0) {
    comboDecayFrames -= 1;
    if (comboDecayFrames <= 0) {
      comboStacks = Math.max(0, comboStacks - 1);
      comboDecayFrames = comboStacks > 0 ? Math.floor(COMBO_TUNING.decayFrames * 0.55) : 0;
      const oldCombo = comboMultiplier;
      comboMultiplier = 1 + comboStacks * COMBO_TUNING.multiplierPerStack;
      // D5: Play shimmer on combo changes (including decay)
      if (comboMultiplier !== oldCombo && comboMultiplier > 1) {
        audioEngine.playComboShimmer(comboMultiplier);
      }
    }
  } else {
    comboMultiplier = 1;
  }

  const regenEventMult = 1;
  player.energy = Math.min(maxEnergy, player.energy + 0.015 * player.skinStats.energyRegenMult * eco.regenMult * regenEventMult);

  const profileSpawnMult = currentWaveProfile ? currentWaveProfile.spawnRateMult : 1;
  const eventSpawnPressure = 1;
  const spawnChance = (0.018 + wave * 0.00145) * difficulty.spawnFactor * profileSpawnMult * eventSpawnPressure;
  if (enemiesToSpawn > 0 && Math.random() < spawnChance) {
    spawnEnemyUnit();
  }

  for (const bullet of bullets) {
    if (bullet.prevX1 == null) {
      bullet.prevX1 = bullet.x;
      bullet.prevY1 = bullet.y;
      bullet.prevX2 = bullet.x;
      bullet.prevY2 = bullet.y;
    } else {
      bullet.prevX2 = bullet.prevX1;
      bullet.prevY2 = bullet.prevY1;
      bullet.prevX1 = bullet.x;
      bullet.prevY1 = bullet.y;
    }

    bullet.y += bullet.backShot ? bullet.speed : -bullet.speed;
    bullet.x += bullet.vx || 0;

    if (!bullet.backShot && bullet.ricochetBounces > 0 && (bullet.x < 0 || bullet.x + bullet.w > WIDTH)) {
      bullet.vx = -(bullet.vx || 0);
      bullet.x = clamp(bullet.x, 0, WIDTH - bullet.w);
      bullet.ricochetBounces -= 1;
      if (bullet.ricochetBounces <= 0) bullet.glow = "#cbd5e1";
    }
  }

  let writeIndex = 0;
  for (let i = 0; i < bullets.length; i++) {
    const bullet = bullets[i];
    const inBounds = bullet.backShot
      ? (bullet.y < HEIGHT + 20 && bullet.x > -30 && bullet.x < WIDTH + 30)
      : (bullet.y + bullet.h > 0 && bullet.x > -30 && bullet.x < WIDTH + 30);
    if (inBounds) {
      bullets[writeIndex] = bullet;
      writeIndex += 1;
    } else if (!bullet.backShot && shotMissCooldown <= 0) {
      audioEngine.shotMiss();
      shotMissCooldown = 9;
    }
  }
  bullets.length = writeIndex;

  if (activePowerUp) {
    activePowerUp.timer -= 1;
    if (activePowerUp.timer <= 0) activePowerUp = null;
  }

  if (currentObjective && !currentObjective.completed && !currentObjective.failed && currentObjective.type === "survive") {
    currentObjective.timer -= 1;
    if (currentObjective.timer <= 0) {
      currentObjective.timer = 0;
      completeObjective();
    }
  }

  updateEnemyFormationState();
  updateEnemyProjectileState();
  updateBossState();

  resolveEnemyShotCollisions();
  resolveBossShotCollisions();
  resolveContactDamage();

  if (!boss && !bossSpawned && enemiesToSpawn <= 0 && enemies.length === 0) {
    spawnBossUnit();
  }

  if (waveTimer > 0) waveTimer -= 1;

  updateVisualFxState();

  hudFrameCounter += 1;
  if (hudFrameCounter >= GAME_TUNING.hudUpdateIntervalFrames) {
    hudFrameCounter = 0;
    updateHud();
  }

  if (waveTimer % 6 === 0) {
    const projectileIntensity = clamp((bullets.length + enemyProjectiles.length * 1.2) / Math.max(1, GAME_TUNING.globalFxLiteThreshold), 0, 1.5);
    const lowHealth = player.energy <= maxEnergy * 0.34;
    audioEngine.updateAdaptiveState({
      intensity: projectileIntensity,
      bossActive: !!boss,
      lowHealth,
      eventType: currentEvent ? currentEvent.type : null,
    });
  }
}

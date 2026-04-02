// Session flow: game start, player damage, and run end state.
function addFloatingText(text, x, y, kind = "score") {
  floatingTexts.push({ text, x, y, kind, life: 72, vy: -0.62 });
}

function runStartNewGame() {
  difficulty = getDifficultyConfig();
  const selectedSkinData = getSkinById(selectedSkin);
  const skinStats = getSkinStatSheet(selectedSkinData.id);
  const eco = getEconomyModifiers();
  maxEnergy = skinStats.maxEnergy + eco.maxEnergyBonus;
  player = {
    x: WIDTH / 2 - 24,
    y: HEIGHT - 74,
    w: 48,
    h: 48,
    speed: difficulty.playerSpeed * skinStats.speedMult * eco.speedMult,
    vx: 0,
    vy: 0,
    energy: maxEnergy,
    skinId: selectedSkinData.id,
    skinStats,
    lean: 0,
    boost: 0,
    recoil: 0,
    dashVX: 0,
    dashVY: 0,
  };

  bullets = [];
  enemies = [];
  enemyProjectiles = [];
  powerUps = [];
  boss = null;
  score = 0;
  coinsRun = 0;
  rareCoresRun = 0;
  lives = 3;
  shootCooldown = 0;
  damageCooldown = 0;
  running = true;
  phase = "playing";
  setupWave(1);
  engineParticles = [];
  impactFx = [];
  muzzleFx = [];
  dashBursts = [];
  floatingTexts = [];
  comets = [];
  dustClouds = [];
  playerShieldPulse = 0;
  activePowerUp = null;
  currentWaveProfile = getWaveProfile(1);
  currentObjective = null;
  comboStacks = 0;
  comboDecayFrames = 0;
  comboMultiplier = 1;
  dashCooldown = 0;
  dashFrames = 0;
  dashInvulnFrames = 0;
  specialCharge = 0;
  specialActiveFrames = 0;
  specialFlashFrames = 0;
  specialPulseQueue = [];
  specialPulseDropBudget = 0;
  pendingIntermissionWave = null;
  intermissionRerollsLeft = 0;
  intermissionRerollUses = 0;
  intermissionOffersState = [];
  intermissionPurchasedOfferIds = [];
  intermissionPurchaseInFlightId = null;
  intermissionLastPurchasedOfferId = null;
  legendaryPityCount = 0;
  intermissionLockedOfferId = null;
  intermissionLockedOfferSnapshot = null;
  intermissionTransmuteUsed = false;
  economySpentCoinsRun = 0;
  economySpentRareRun = 0;
  economyActionsRun = 0;
  economyLockedCountRun = 0;
  economyTransmutesRun = 0;
  permanentPerks = [];
  temporaryPerks = [];
  currentEvent = null;
  eventCooldownFrames = 60 * 10;
  runSpeedBonus = 0;
  momentumTimerFrames = 0;
  momentumStacks = 0;
  objectiveFlashFrames = 0;
  pickupBanner = null;
  shotMissCooldown = 0;
  displayScore = 0;
  displayCoins = 0;
  lastScoreTarget = 0;
  lastCoinsTarget = 0;
  scorePopFrames = 0;
  coinsPopFrames = 0;
  cameraShakeFrames = 0;
  cameraShakePower = 0;
  biomeThemeIndex = getBiomeTheme(1).index;
  gameOverFxProgress = 0;
  gameOverParticles = [];
  hudFrameCounter = 0;
  lastFrameTime = 0;
  frameAccumulator = 0;

  gameOverOverlay.classList.remove("show");
  gameOverOverlay.setAttribute("aria-hidden", "true");
  setMenuVisibility(false);
  closeIntermissionShop();
  audioEngine.startMusic();
  updateHud();
}

function applyPlayerDamage(amount) {
  if (damageCooldown > 0 || dashInvulnFrames > 0 || specialActiveFrames > 0 || !running) return;

  player.energy -= amount;
  damageCooldown = 40;
  playerShieldPulse = 1;
  triggerCameraShake(10, 4.2);
  audioEngine.playerHit();

  if (currentObjective && currentObjective.failOnDamage && !currentObjective.completed && !currentObjective.failed) {
    currentObjective.failed = true;
  }

  if (player.energy <= 0) {
    lives -= 1;
    if (lives <= 0) {
      endRun();
      return;
    }
    player.energy = maxEnergy;
  }
  updateHud();
}

function gainSpecialCharge(amount) {
  if (!running || amount <= 0) return;
  specialCharge = clamp(specialCharge + amount, 0, 100);
  // S5: Play special charging tone based on charge level (0-100%)
  audioEngine.playSpecialChargingTone(specialCharge);
}

function tryActivateSpecial() {
  if (!running || !player || specialCharge < 100 || phase !== "playing") return;
  if (specialPulseQueue.length > 0 || specialActiveFrames > 0) return;

  specialCharge = 0;
  specialActiveFrames = 80;
  specialFlashFrames = 24;
  dashInvulnFrames = Math.max(dashInvulnFrames, 48);
  playerShieldPulse = Math.max(playerShieldPulse, 1);
  audioEngine.specialCast();

  // Pulse nova: clears hostile bullets and schedules enemy impact in batches.
  enemyProjectiles.length = 0;
  specialPulseQueue = enemies.slice();
  enemies = [];
  specialPulseDropBudget = 8;

  if (boss) {
    boss.hp -= Math.max(20, boss.maxHp * 0.12);
  }

  triggerCameraShake(16, 5.6);
  updateHud();
}

function processSpecialPulseQueue() {
  if (!running || specialPulseQueue.length === 0) return;

  const blastDamage = 7 + wave * 0.7;
  const batchSize = 14;
  let processed = 0;
  let anyDefeated = false;

  while (processed < batchSize && specialPulseQueue.length > 0) {
    const enemy = specialPulseQueue.pop();
    enemy.hp -= blastDamage;
    if (enemy.hp <= 0) {
      const wasAggressive = true;
      anyDefeated = true;
      score += 10 * difficulty.scoreMult;
      coinsRun += (enemy.coinReward || 1) * difficulty.coinMult;
      spawnEnemyMicroExplosion(enemy);
      if (specialPulseDropBudget > 0) {
        trySpawnPowerUpDrop(enemy);
        trySpawnRecoveryDrop(enemy);
        specialPulseDropBudget -= 1;
      }
      registerAggressiveKill(enemy, wasAggressive);
    } else {
      enemies.push(enemy);
    }
    processed += 1;
  }

  if (specialPulseQueue.length === 0 || anyDefeated) {
    updateHud();
  }
}

function healPlayer(amount) {
  if (!player || amount <= 0) return;
  player.energy = Math.min(maxEnergy, player.energy + amount);
  playerShieldPulse = Math.max(playerShieldPulse, 0.55);
  updateHud();
}

function tryStartDash() {
  if (!player || dashCooldown > 0 || dashFrames > 0) return;

  const moveX = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  const moveY = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
  const magnitude = Math.hypot(moveX, moveY);
  if (magnitude <= 0) return;

  const normX = moveX / magnitude;
  const normY = moveY / magnitude;
  dashFrames = DASH_TUNING.durationFrames;
  dashCooldown = Math.max(24, Math.round(DASH_TUNING.cooldownFrames * player.skinStats.dashCooldownMult));
  dashInvulnFrames = DASH_TUNING.invulnFrames;
  player.dashVX = normX * DASH_TUNING.speed * player.skinStats.dashSpeedMult;
  player.dashVY = normY * DASH_TUNING.speed * player.skinStats.dashSpeedMult;
  player.recoil = 0.1;
  player.boost = 1.1;
  dashBursts.push({ x: player.x + player.w / 2, y: player.y + player.h / 2, phase: "start", life: 16 });
  audioEngine.dashActivate();
}

function registerAggressiveKill(enemy, wasAggressive) {
  if (!enemy) return;

  if (wasAggressive) {
    const oldCombo = comboMultiplier;
    comboStacks = Math.min(COMBO_TUNING.maxStacks, comboStacks + 1);
    comboDecayFrames = COMBO_TUNING.decayFrames;
    comboMultiplier = 1 + comboStacks * COMBO_TUNING.multiplierPerStack;
    // S2: Play combo stinger every 5 stacks
    if (comboStacks > 0 && comboStacks % 5 === 0) {
      audioEngine.playComboStinger();
    }
    // D5: Play shimmer when combo changes
    if (comboMultiplier > oldCombo) {
      audioEngine.playComboShimmer(comboMultiplier);
    }
    const bonusCoins = Math.max(1, Math.ceil((enemy.coinReward || 1) * (0.45 + comboStacks * 0.08)));
    const bonusScore = Math.max(1, Math.floor(6 * comboMultiplier));

    if (momentumTimerFrames > 0) {
      momentumStacks = Math.min(6, momentumStacks + 1);
    } else {
      momentumStacks = 1;
    }
    momentumTimerFrames = 60 * 3;

    const momentumMult = 1 + momentumStacks * 0.05;
    const machineGunBonus = activePowerUp && activePowerUp.machineGunBonusFrames > 0 ? 1.2 : 1;

    coinsRun += bonusCoins * difficulty.coinMult;
    score += bonusScore * difficulty.scoreMult * momentumMult * machineGunBonus;

    if (comboStacks >= 6) {
      audioEngine.criticalHit();
      addFloatingText("CRIT", enemy.x + enemy.w / 2, enemy.y + 10, "critical");
    }
  }

  if (!currentObjective || currentObjective.completed || currentObjective.failed) return;

  if (currentObjective.type === "kills") {
    currentObjective.remaining = Math.max(0, currentObjective.remaining - 1);
  } else if (currentObjective.type === "aggressive-kills" && wasAggressive) {
    currentObjective.remaining = Math.max(0, currentObjective.remaining - 1);
  } else if (currentObjective.type === "no-hit-elite" && enemy.isElite) {
    currentObjective.remaining = Math.max(0, currentObjective.remaining - 1);
  }

  if (currentObjective.remaining === 0) {
    completeObjective();
  }
}

function completeObjective() {
  if (!currentObjective || currentObjective.completed || currentObjective.failed) return;

  currentObjective.completed = true;
  coinsRun += currentObjective.rewardCoins * difficulty.coinMult;
  rareCoresRun += 0.25;
  healPlayer(currentObjective.rewardEnergy);
  triggerCameraShake(8, 2.6);
  objectiveFlashFrames = 140;
  addFloatingText(`+${Math.floor(currentObjective.rewardCoins)} monedas`, WIDTH / 2, HEIGHT * 0.26, "reward");
}

function endRun() {
  running = false;
  phase = "gameover";
  gameOverFxProgress = 0;
  gameOverParticles = [];
  bullets = [];
  enemies = [];
  enemyProjectiles = [];
  powerUps = [];
  impactFx = [];
  muzzleFx = [];
  dashBursts = [];
  floatingTexts = [];
  engineParticles = [];
  comets = [];
  dustClouds = [];
  boss = null;
  activePowerUp = null;
  currentEvent = null;
  specialPulseQueue = [];
  specialPulseDropBudget = 0;
  cameraShakeFrames = 0;
  cameraShakePower = 0;
  coinsBankValue += Math.floor(coinsRun);
  finalScore.textContent = `Score final: ${Math.floor(score)}`;
  finalCoins.textContent = `Monedas ganadas: ${Math.floor(coinsRun)}`;
  audioEngine.fadeOutMusicEnhanced(1.5, true);
  audioEngine.gameOver();
  gameOverOverlay.classList.add("show");
  gameOverOverlay.setAttribute("aria-hidden", "false");
  renderShop();
  updateHud();
}

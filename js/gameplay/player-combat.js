// Player combat: weapon modes, projectile creation, and fire cadence.
function firePlayerShot() {
  const modes = getEffectiveUpgradeModes();
  const palette = getSkinPalette(player.skinId);
  const skinStats = player.skinStats || getSkinStatSheet(player.skinId);
  const eco = getEconomyModifiers();

  const isDouble    = modes.has("double");
  const isCone      = modes.has("cone");
  const isWide      = modes.has("wide");
  const isSniper    = modes.has("sniper");
  const isVolley    = modes.has("volley");
  const isOvercharge = modes.has("overcharge");
  const isBack      = modes.has("back");
  const isRicochet  = modes.has("ricochet");

  // Sniper has built-in stat boost; overcharge cannot stack with it (blocked by compatibility)
  let bulletScale    = isOvercharge ? 1.35 : 1;
  let bulletSpeedMult = isOvercharge ? 1.22 : 1;
  let bulletDamageMult = isOvercharge ? 1.35 : 1;

  if (isSniper) {
    bulletScale      = 2.4;
    bulletSpeedMult  = 2.2;
    bulletDamageMult = 4.0;
  }

  const bulletOptions = {
    sizeScale: bulletScale,
    speedMult: bulletSpeedMult * skinStats.bulletSpeedMult,
    damageMult: bulletDamageMult * skinStats.damageMult * eco.damageMult,
  };

  // --- Primary spread pattern (mutually exclusive) ---
  if (isSniper) {
    // Single oversized bolt — deadly but slow rate of fire
    createPlayerShotEntity(0, 0, palette, bulletOptions);
  } else if (isWide) {
    // Wide gets one extra lane so it can compete with cone variants.
    createPlayerShotEntity(-30, -3.2, palette, bulletOptions, isRicochet);
    createPlayerShotEntity(-18, -1.9, palette, bulletOptions, isRicochet);
    createPlayerShotEntity( -6, -0.7, palette, bulletOptions, isRicochet);
    createPlayerShotEntity(  6,  0.7, palette, bulletOptions, isRicochet);
    createPlayerShotEntity( 18,  1.9, palette, bulletOptions, isRicochet);
    createPlayerShotEntity( 30,  3.2, palette, bulletOptions, isRicochet);
  } else if (isDouble && isCone) {
    // double+cone combo: 5-shot tight fan
    createPlayerShotEntity(-14, -0.8, palette, bulletOptions, isRicochet);
    createPlayerShotEntity( -7, -0.4, palette, bulletOptions, isRicochet);
    createPlayerShotEntity(  0,  0,   palette, bulletOptions, isRicochet);
    createPlayerShotEntity(  7,  0.4, palette, bulletOptions, isRicochet);
    createPlayerShotEntity( 14,  0.8, palette, bulletOptions, isRicochet);
  } else if (isDouble) {
    createPlayerShotEntity(-7, 0, palette, bulletOptions, isRicochet);
    createPlayerShotEntity( 7, 0, palette, bulletOptions, isRicochet);
  } else if (isCone) {
    createPlayerShotEntity(-8, -1.05, palette, bulletOptions, isRicochet);
    createPlayerShotEntity( 0,  0,    palette, bulletOptions, isRicochet);
    createPlayerShotEntity( 8,  1.05, palette, bulletOptions, isRicochet);
  } else {
    createPlayerShotEntity(0, 0, palette, bulletOptions, isRicochet);
  }

  // --- Additive modifiers ---
  // Volley adds lateral flanking shots (incompatible with wide/sniper via resolveUpgradeCompatibility)
  if (isVolley) {
    createPlayerShotEntity(-18, -1.25, palette, bulletOptions, isRicochet);
    createPlayerShotEntity( 18,  1.25, palette, bulletOptions, isRicochet);
  }

  // Back fires a rear cannon toward the bottom of the screen
  if (isBack) {
    createBackShotEntity(palette, bulletOptions);
    muzzleFx.push({
      x: player.x + player.w / 2,
      y: player.y + player.h - 4,
      type: "back",
      life: 8,
      colorA: palette.engineB,
      colorB: palette.engineA,
    });
  }

  // Pick muzzle flash type for the front of the ship (priority order)
  let flashType;
  if (isSniper)        flashType = "sniper";
  else if (isWide)     flashType = "wide";
  else if (isOvercharge) flashType = "overcharge";
  else if (isVolley)   flashType = "volley";
  else if (isCone)     flashType = "cone";
  else if (isDouble)   flashType = "double";
  else                 flashType = "single";

  spawnMuzzleFlashEffect(flashType, palette);

  player.recoil = 1;
  audioEngine.shoot(flashType);
}

function createPlayerShotEntity(offsetX, velocityX, palette, options = {}, useRicochet = false) {
  if (bullets.length >= GAME_TUNING.maxPlayerBullets) return;

  const scale      = options.sizeScale || 1;
  const speedMult  = options.speedMult || 1;
  const damageMult = options.damageMult || 1;
  const bulletSize = (GAME_TUNING.forceCircularBullets ? 11 : 12) * scale;
  const bulletW    = bulletSize;
  const bulletH    = GAME_TUNING.forceCircularBullets ? bulletSize : 24 * scale;
  bullets.push({
    x: player.x + player.w / 2 - bulletW / 2 + offsetX,
    y: player.y + 4,
    w: bulletW,
    h: bulletH,
    speed: difficulty.bulletSpeed * speedMult,
    vx: velocityX,
    damage: damageMult,
    backShot: false,
    prevX1: null,
    prevY1: null,
    prevX2: null,
    prevY2: null,
    core: palette.accent,
    glow: palette.engineA,
    tail: palette.engineB,
    ricochetBounces: useRicochet ? 2 : 0,
  });
}

// Rear-facing bullet fired downward (toward the bottom of the screen).
function createBackShotEntity(palette, options = {}) {
  if (bullets.length >= GAME_TUNING.maxPlayerBullets) return;

  const scale      = (options.sizeScale || 1) * 0.8;
  const speedMult  = (options.speedMult  || 1) * 0.7;
  const damageMult = (options.damageMult || 1) * 0.65;
  const bulletSize = (GAME_TUNING.forceCircularBullets ? 11 : 12) * scale;
  bullets.push({
    x: player.x + player.w / 2 - bulletSize / 2,
    y: player.y + player.h - 6,
    w: bulletSize,
    h: GAME_TUNING.forceCircularBullets ? bulletSize : 20 * scale,
    speed: difficulty.bulletSpeed * speedMult,
    vx: 0,
    damage: damageMult,
    backShot: true,
    prevX1: null,
    prevY1: null,
    prevX2: null,
    prevY2: null,
    core: palette.accent,
    glow: palette.engineB,
    tail: palette.engineA,
  });
}

function getBaseUpgradeMode() {
  if (!player) return "double";
  return getSkinById(player.skinId).defaultUpgrade || "double";
}

// Returns the effective set of active modes merging the skin's base with the current power-up.
// Power-up spread modes take priority: if both have a spread, the power-up wins.
function getEffectiveUpgradeModes() {
  const base = getBaseUpgradeMode();
  if (!activePowerUp) return new Set([base]);

  const SPREAD_MODES = new Set(["double", "cone", "wide", "sniper"]);
  const powerHasSpread = [...activePowerUp.modes].some(m => SPREAD_MODES.has(m));

  // If power-up already defines the spread, don't override with the base spread
  if (SPREAD_MODES.has(base) && powerHasSpread) {
    return new Set(activePowerUp.modes);
  }

  return resolveUpgradeCompatibility(new Set(activePowerUp.modes), base);
}

function getShootCooldownFrames() {
  const modes = getEffectiveUpgradeModes();
  const skinStats = player ? player.skinStats || getSkinStatSheet(player.skinId) : getSkinStatSheet(selectedSkin);
  const eco = getEconomyModifiers();
  const baseDelay = Math.max(2, Math.round(difficulty.shootDelay * skinStats.fireDelayMult * eco.fireDelayMult));
  if (modes.has("sniper")) return Math.max(26, Math.floor(baseDelay * 2.6));
  if (modes.has("rapid"))  return Math.max(2, Math.floor(baseDelay * 0.35));
  return baseDelay;
}

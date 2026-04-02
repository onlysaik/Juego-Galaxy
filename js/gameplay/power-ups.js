// Power-up system: stacking logic, compatibility resolution, drops, and update tick.

// Spread modes are mutually exclusive. Some modifier modes conflict with specific spreads.
// Returns a new Set with newType integrated, removing incompatible modes.
function resolveUpgradeCompatibility(existingModes, newType) {
  const SPREAD_MODES = new Set(["double", "cone", "wide", "sniper"]);
  const result = new Set(existingModes);

  // Spread modes replace each other
  if (SPREAD_MODES.has(newType)) {
    for (const s of SPREAD_MODES) result.delete(s);
  }

  // Sniper is a single-shot mode — volley and overcharge are meaningless on it
  if (newType === "sniper") {
    result.delete("volley");
    result.delete("overcharge");
  }

  // Wide scatter covers the lateral slots volley adds — redundant together
  if (newType === "wide") {
    result.delete("volley");
  }

  // Overcharge blocked when sniper is already active (sniper already has boosted stats)
  if (newType === "overcharge" && result.has("sniper")) {
    return result;
  }

  // Volley blocked by wide and sniper
  if (newType === "volley" && (result.has("wide") || result.has("sniper"))) {
    return result;
  }

  // Ricochet is utility and can stack with all current modes.

  result.add(newType);
  return result;
}

function applyOrExtendPowerUp(type) {
  if (!activePowerUp) {
    activePowerUp = { modes: new Set([type]), timer: POWER_UP_DURATION_FRAMES };
    // S1: Play power-up SFX
    audioEngine.playPowerUpSFX(type);
    return;
  }

  if (activePowerUp.modes.has(type)) {
    activePowerUp.timer = Math.min(
      activePowerUp.timer + POWER_UP_STACK_BONUS_FRAMES,
      POWER_UP_DURATION_FRAMES * 2
    );
    // S1: Play power-up SFX
    audioEngine.playPowerUpSFX(type);
    return;
  }

  activePowerUp.modes = resolveUpgradeCompatibility(activePowerUp.modes, type);
  activePowerUp.timer += POWER_UP_STACK_BONUS_FRAMES;
  // S1: Play power-up SFX
  audioEngine.playPowerUpSFX(type);

  // Rapid + Volley unlocks a short "Machine Gun" momentum window.
  if (activePowerUp.modes.has("rapid") && activePowerUp.modes.has("volley")) {
    activePowerUp.machineGunBonusFrames = 60 * 15;
  }
}

function trySpawnPowerUpDrop(enemy) {
  const waveTarget = getWaveBalanceTarget(wave);
  if (Math.random() > waveTarget.powerDropRate) return;
  const roll = Math.random();
  const type =
    roll < 0.18 ? "double" :
    roll < 0.34 ? "cone" :
    roll < 0.48 ? "rapid" :
    roll < 0.58 ? "volley" :
    roll < 0.66 ? "overcharge" :
    roll < 0.76 ? "wide" :
    roll < 0.86 ? "back" :
    roll < 0.94 ? "ricochet" :
    "sniper";

  powerUps.push({
    x: enemy.x + enemy.w / 2 - 11,
    y: enemy.y + enemy.h / 2 - 11,
    w: 22,
    h: 22,
    type,
    vy: 1.2,
    life: 60 * 12,
    phase: Math.random() * Math.PI * 2,
  });
}

function trySpawnRecoveryDrop(enemy) {
  const dropChance = enemy && enemy.isElite ? 0.38 : enemy && enemy.role && enemy.role.id === "guardian" ? 0.13 : 0.055;
  if (Math.random() > dropChance) return;

  powerUps.push({
    x: enemy.x + enemy.w / 2 - 11,
    y: enemy.y + enemy.h / 2 - 11,
    w: 22,
    h: 22,
    type: "repair",
    vy: 1.05,
    life: 60 * 10,
    phase: Math.random() * Math.PI * 2,
    amount: enemy && enemy.isElite ? 26 : 18,
  });
}

function updatePowerUpState(playerHitbox) {
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    p.y += p.vy;
    p.x += Math.sin((p.life - 500) * 0.02 + p.phase) * 0.45;

    if (currentEvent && currentEvent.type === "magnetic-field" && player) {
      const tx = player.x + player.w / 2 - (p.x + p.w / 2);
      const ty = player.y + player.h / 2 - (p.y + p.h / 2);
      p.x += clamp(tx * 0.018, -2.2, 2.2);
      p.y += clamp(ty * 0.018, -2.2, 2.2);
    }

    p.life -= 1;

    if (p.life <= 0 || p.y > HEIGHT + 30) {
      powerUps.splice(i, 1);
      continue;
    }

    if (intersects(playerHitbox, p)) {
      if (p.type === "repair") {
        healPlayer(p.amount || 16);
        pickupBanner = { text: `+${Math.floor(p.amount || 16)} energia`, type: "repair", frames: 120 };
      } else {
        applyOrExtendPowerUp(p.type);
        pickupBanner = { text: `Power-up: ${POWER_UP_DEFS[p.type] ? POWER_UP_DEFS[p.type].name : p.type}`, type: p.type, frames: 150 };
      }
      powerUps.splice(i, 1);
    }
  }

  if (activePowerUp && activePowerUp.machineGunBonusFrames > 0) {
    activePowerUp.machineGunBonusFrames -= 1;
  }

  if (pickupBanner && pickupBanner.frames > 0) {
    pickupBanner.frames -= 1;
    if (pickupBanner.frames <= 0) pickupBanner = null;
  }
}

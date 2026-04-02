// Collision resolution: shots vs enemies/boss and direct contact damage.
function resolveEnemyShotCollisions() {
  const aliveEnemies = [];
  for (const enemy of enemies) {
    let enemyDestroyed = false;
    const enemyHx = enemy.x + enemy.w * 0.2;
    const enemyHy = enemy.y + enemy.h * 0.18;
    const enemyHw = Math.max(2, enemy.w * 0.6);
    const enemyHh = Math.max(2, enemy.h * 0.64);

    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      const bulletHx = bullet.x + bullet.w * 0.34;
      const bulletHy = bullet.y + bullet.h * 0.08;
      const bulletHw = Math.max(2, bullet.w * 0.32);
      const bulletHh = Math.max(2, bullet.h * 0.84);

      if (intersectsRect(enemyHx, enemyHy, enemyHw, enemyHh, bulletHx, bulletHy, bulletHw, bulletHh)) {
        const bulletDamage = bullets[i].damage || 1;
        bullets.splice(i, 1);
        enemy.hp -= bulletDamage;
        if (enemy.hp <= 0) {
          const bonusCoinsMult = currentEvent && currentEvent.type === "bonus-wave" ? 1.45 : 1;
          const playerCenterX = player ? player.x + player.w / 2 : enemy.x + enemy.w / 2;
          const playerCenterY = player ? player.y + player.h / 2 : enemy.y + enemy.h / 2;
          const enemyCenterX = enemy.x + enemy.w / 2;
          const enemyCenterY = enemy.y + enemy.h / 2;
          const wasAggressive = distanceBetween(playerCenterX, playerCenterY, enemyCenterX, enemyCenterY) <= COMBO_TUNING.nearKillDistance || enemy.y >= COMBO_TUNING.topZoneY;
          score += 10 * difficulty.scoreMult;
          coinsRun += (enemy.coinReward || 1) * difficulty.coinMult * bonusCoinsMult;
          addFloatingText(`+${Math.floor(10 * difficulty.scoreMult)} score`, enemy.x + enemy.w / 2, enemy.y, "score");
          addFloatingText(`+${Math.floor((enemy.coinReward || 1) * difficulty.coinMult * bonusCoinsMult)} coin`, enemy.x + enemy.w / 2, enemy.y + 14, "reward");
          if (enemy.isElite) rareCoresRun += 0.4;
          // S7: Play hit with pitch variance
          audioEngine.playHitVariedPitch(190, false);
          spawnEnemyMicroExplosion(enemy);
          if ((enemy.maxHp || 1) >= 3) {
            triggerCameraShake(7, 2.8);
          }
          trySpawnPowerUpDrop(enemy);
          trySpawnRecoveryDrop(enemy);
          registerAggressiveKill(enemy, wasAggressive);
          gainSpecialCharge(enemy.isElite ? 16 : wasAggressive ? 9 : 6);
          enemyDestroyed = true;
          break;
        }
      }
    }

    if (!enemyDestroyed) aliveEnemies.push(enemy);
  }
  enemies = aliveEnemies;
}

function resolveBossShotCollisions() {
  if (!boss) return;

  const bossHx = boss.x + boss.w * 0.22;
  const bossHy = boss.y + boss.h * 0.2;
  const bossHw = Math.max(2, boss.w * 0.56);
  const bossHh = Math.max(2, boss.h * 0.6);
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bullet = bullets[i];
    const bulletHx = bullet.x + bullet.w * 0.34;
    const bulletHy = bullet.y + bullet.h * 0.08;
    const bulletHw = Math.max(2, bullet.w * 0.32);
    const bulletHh = Math.max(2, bullet.h * 0.84);

    if (intersectsRect(bossHx, bossHy, bossHw, bossHh, bulletHx, bulletHy, bulletHw, bulletHh)) {
      const bulletDamage = bullets[i].damage || 1;
      bullets.splice(i, 1);
      const dpsWindowMult = boss.vulnerableFrames > 0 ? 1.45 : 0.72;
      boss.hp -= bulletDamage * dpsWindowMult;
      score += 2 * difficulty.scoreMult;
      if (boss.vulnerableFrames > 0) {
        addFloatingText("DPS WINDOW", bullet.x, bullet.y, "critical");
      }
      gainSpecialCharge(0.5);
      // S7: Play boss hit with pitch variance
      audioEngine.playHitVariedPitch(160, true);
      // S3: Play boss hit SFX
      audioEngine.playBossHitSFX();
    }
  }

  if (boss.hp <= 0) {
    const bossReward = 18 + wave * 6;
    score += bossReward * 8 * difficulty.scoreMult;
    coinsRun += bossReward * difficulty.coinMult;
    addFloatingText(`BOSS DOWN +${Math.floor(bossReward * difficulty.coinMult)} coin`, WIDTH / 2, HEIGHT * 0.32, "reward");
    rareCoresRun += 1.2;
    gainSpecialCharge(20);
    triggerCameraShake(18, 6.5);
    if (currentObjective && !currentObjective.completed && !currentObjective.failed && currentObjective.type === "kills") {
      currentObjective.remaining = 0;
      completeObjective();
    }
    boss = null;
    audioEngine.setBossMode(false);
    audioEngine.waveClear();
    openIntermissionShop(wave + 1);
  }
}

function resolveContactDamage() {
  const playerHitbox = getPlayerHitbox(player);
  const playerHx = playerHitbox.x;
  const playerHy = playerHitbox.y;
  const playerHw = playerHitbox.w;
  const playerHh = playerHitbox.h;
  updatePowerUpState(playerHitbox);

  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const enemyHx = enemy.x + enemy.w * 0.2;
    const enemyHy = enemy.y + enemy.h * 0.18;
    const enemyHw = Math.max(2, enemy.w * 0.6);
    const enemyHh = Math.max(2, enemy.h * 0.64);

    if (intersectsRect(playerHx, playerHy, playerHw, playerHh, enemyHx, enemyHy, enemyHw, enemyHh)) {
      enemies.splice(i, 1);
      applyPlayerDamage(difficulty.enemyDamage);
    }
  }

  if (boss) {
    const bossHx = boss.x + boss.w * 0.22;
    const bossHy = boss.y + boss.h * 0.2;
    const bossHw = Math.max(2, boss.w * 0.56);
    const bossHh = Math.max(2, boss.h * 0.6);
    if (intersectsRect(playerHx, playerHy, playerHw, playerHh, bossHx, bossHy, bossHw, bossHh)) {
      applyPlayerDamage(difficulty.enemyDamage + 8);
    }
  }
}

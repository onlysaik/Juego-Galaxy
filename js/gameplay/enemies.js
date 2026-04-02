// Enemy units: spawn, patterns, movement, and enemy projectile state.
function spawnEnemyUnit() {
  const size = 40;
  const speedBase = 1.5 + Math.random() * 2.2 + wave * 0.24;
  const race = ENEMY_RACES[Math.floor(Math.random() * ENEMY_RACES.length)];
  const profile = currentWaveProfile || getWaveProfile(wave);
  const roleId = profile.roles[Math.floor(Math.random() * profile.roles.length)];
  const role = ENEMY_ROLE_DEFS[roleId] || ENEMY_ROLE_DEFS.fan;
  const variant = Math.floor(Math.random() * 3);
  const waveTarget = getWaveBalanceTarget(wave);
  const isElite = Math.random() < profile.eliteChance;

  const indivSpeedMult = 0.82 + Math.random() * 0.40;
  const fireMult = 0.72 + Math.random() * 0.58;
  const hp = Math.max(1, Math.round(waveTarget.enemyHp * role.hpMult * profile.enemyHpMult * (isElite ? 2.2 : 1)));

  const originX = Math.floor(Math.random() * (WIDTH - size));
  const formationSlot = (enemiesToSpawn % 4);
  const formationId = `${wave}-${Math.floor(enemiesToSpawn / 4)}`;
  enemies.push({
    x: originX,
    y: -80,
    w: size,
    h: size,
    speedY: speedBase * difficulty.enemySpeedFactor * race.speedMult * role.speedMult * profile.enemySpeedMult * indivSpeedMult,
    movPat: role.movement,
    originX,
    movePhase: Math.random() * 200,
    fireMult: fireMult * profile.fireRateMult * role.fireCadenceMult,
    hp,
    maxHp: hp,
    coinReward: waveTarget.coinPerKill * role.rewardMult * (isElite ? 1.8 : 1),
    variant,
    animOffset: Math.random() * Math.PI * 2,
    race,
    role,
    isElite,
    formationId,
    formationSlot,
    phaseShifted: false,
    attackCooldown: 30 + Math.random() * 50,
  });
  enemiesToSpawn -= 1;
}

function fireEnemyWeaponPattern(enemy) {
  if (enemyProjectiles.length >= GAME_TUNING.maxEnemyProjectiles) return;

  const centerX = enemy.x + enemy.w / 2;
  const fromY = enemy.y + enemy.h * 0.65;
  const pattern = enemy.role.pattern || enemy.race.pattern;
  const w = wave;
  const speedScale = 1 + w * 0.05;
  const dmgBonus = Math.floor(w * 1.1);

  if (pattern === "aimed-burst") {
    const playerCenterX = player ? player.x + player.w / 2 : centerX;
    const dx = clamp((playerCenterX - centerX) / 90, -1.4, 1.4);
    for (const spread of [-0.26, 0.26]) {
      enemyProjectiles.push({
        x: centerX - 4,
        y: fromY,
        w: 8,
        h: 14,
        vx: (dx + spread) * 1.15,
        vy: 3.85 * speedScale,
        damage: 9 + dmgBonus,
        color: "#fb7185",
        glow: "#fecdd3",
        style: "bolt",
        life: 165,
      });
    }
    return;
  }

  if (pattern === "plasma-fan") {
    const dirs = w >= 8 ? [-1.4, -0.7, 0, 0.7, 1.4] : [-0.95, 0, 0.95];
    for (const dir of dirs) {
      enemyProjectiles.push({
        x: centerX - 4,
        y: fromY,
        w: 8,
        h: 14,
        vx: dir * 1,
        vy: 3 * speedScale,
        damage: 8 + dmgBonus,
        color: "#ef4444",
        glow: "#fca5a5",
        style: "plasma",
        life: 170,
      });
    }
    return;
  }

  if (pattern === "dual-bolt") {
    const offsets = w >= 9
      ? [-enemy.w * 0.28, -enemy.w * 0.08, enemy.w * 0.08, enemy.w * 0.28 - 6]
      : [-enemy.w * 0.18, enemy.w * 0.18 - 6];
    for (const ox of offsets) {
      enemyProjectiles.push({
        x: centerX + ox,
        y: fromY,
        w: 6,
        h: 16,
        vx: 0,
        vy: 4.2 * speedScale,
        damage: 10 + dmgBonus,
        color: "#a78bfa",
        glow: "#ddd6fe",
        style: "bolt",
        life: 150,
      });
    }
    return;
  }

  const orbCount = w >= 9 ? 2 : 1;
  for (let i = 0; i < orbCount; i++) {
    enemyProjectiles.push({
      x: centerX - 7 + i * 14,
      y: fromY,
      w: 14,
      h: 14,
      vx: Math.sin(enemy.animOffset + i * 1.2) * (0.8 + w * 0.04),
      vy: 2.75 * speedScale,
      damage: 12 + dmgBonus,
      color: "#f59e0b",
      glow: "#fde68a",
      style: "orb",
      life: 200,
    });
  }
}

function updateEnemyFormationState() {
  let writeIndex = 0;
  for (const enemy of enemies) {
    enemy.movePhase += 1;

    if (!enemy.phaseShifted && enemy.maxHp > 0 && enemy.hp <= enemy.maxHp * 0.5) {
      enemy.phaseShifted = true;
      enemy.movPat = enemy.movPat === "guard" ? "hunt" : enemy.movPat === "hunt" ? "zigzag" : "erratic";
      enemy.fireMult = Math.max(0.7, enemy.fireMult * 0.88);
      enemy.speedY *= 1.14;
      enemy.attackCooldown = Math.min(enemy.attackCooldown, 18);
      if (enableParticles) {
        addFloatingText("SHIFT", enemy.x + enemy.w / 2, enemy.y + 10, "critical");
      }
    }

    const formationWave = Math.sin((enemy.movePhase + enemy.formationSlot * 19) * 0.02) * 24;
    const formationRank = (enemy.formationSlot - 1.5) * 16;

    switch (enemy.movPat) {
      case "hunt": {
        const playerCenterX = player ? player.x + player.w / 2 : enemy.originX;
        const enemyCenterX = enemy.x + enemy.w / 2;
        const drift = clamp((playerCenterX - enemyCenterX) * 0.032, -2.6, 2.6);
        enemy.x = clamp(enemy.x + drift + formationWave * 0.06, 0, WIDTH - enemy.w);
        enemy.y += enemy.speedY * 0.92;
        break;
      }
      case "zone": {
        const holdY = 88 + (enemy.variant % 3) * 44;
        enemy.x = clamp(enemy.originX + Math.sin(enemy.movePhase * 0.026) * 128 + formationRank, 0, WIDTH - enemy.w);
        if (enemy.y < holdY) enemy.y += enemy.speedY * 0.72;
        else enemy.y += Math.sin(enemy.movePhase * 0.045) * 0.35;
        break;
      }
      case "guard": {
        const guardY = 92 + (enemy.variant % 4) * 26;
        enemy.x = clamp(enemy.originX + Math.sin(enemy.movePhase * 0.018) * 56 + formationRank * 0.6, 0, WIDTH - enemy.w);
        if (enemy.y < guardY) enemy.y += enemy.speedY * 0.58;
        else enemy.y += Math.sin(enemy.movePhase * 0.03) * 0.18;
        break;
      }
      case "zigzag":
        enemy.x = clamp(enemy.originX + Math.sin(enemy.movePhase * 0.048) * 70 + formationRank * 0.45, 0, WIDTH - enemy.w);
        enemy.y += enemy.speedY;
        break;
      case "sweep":
        enemy.x = clamp(enemy.originX + Math.sin(enemy.movePhase * 0.019) * 100 + formationWave * 0.45, 0, WIDTH - enemy.w);
        enemy.y += enemy.speedY * (0.6 + 0.4 * Math.abs(Math.cos(enemy.movePhase * 0.014)));
        break;
      case "erratic":
        enemy.x = clamp(enemy.x + (Math.random() - 0.5) * 4.5, 0, WIDTH - enemy.w);
        enemy.y += enemy.speedY * (Math.sin(enemy.movePhase * 0.07) > 0.65 ? 1.7 : 1.0);
        break;
      default:
        enemy.y += enemy.speedY;
    }

    enemy.animOffset += 0.08;
    enemy.attackCooldown -= 1;
    if (enemy.attackCooldown <= 0) {
      fireEnemyWeaponPattern(enemy);
      const baseCadence = enemy.race.fireCadence || 80;
      enemy.attackCooldown = Math.max(24, (baseCadence - wave * 1.15 + Math.random() * 16) * enemy.fireMult);
    }
    if (enemy.y > HEIGHT + enemy.h) {
      enemy.y = HEIGHT + enemy.h + 40;
    }

    if (enemy.y < HEIGHT + enemy.h + 30) {
      enemies[writeIndex] = enemy;
      writeIndex += 1;
    }
  }
  enemies.length = writeIndex;
}

function updateEnemyProjectileState() {
  const hasPlayer = !!player;
  const playerHx = hasPlayer ? player.x + player.w * 0.24 : 0;
  const playerHy = hasPlayer ? player.y + player.h * 0.2 : 0;
  const playerHw = hasPlayer ? Math.max(2, player.w * 0.52) : 0;
  const playerHh = hasPlayer ? Math.max(2, player.h * 0.6) : 0;

  for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
    const p = enemyProjectiles[i];
    if (!p) continue;
    p.prevX2 = p.prevX1;
    p.prevY2 = p.prevY1;
    p.prevX1 = p.x;
    p.prevY1 = p.y;

    p.x += p.vx;
    p.y += p.vy;
    p.life -= 1;

    if (p.style === "orb") {
      p.vx += Math.sin((200 - p.life) * 0.08) * 0.012;
    } else if (p.style === "boss-orb") {
      const dx = player ? player.x + player.w / 2 - (p.x + p.w / 2) : 0;
      const trackingStep = 0.0005 * GAME_TUNING.bossOrbTracking;
      const maxTurn = 0.06 * GAME_TUNING.bossOrbTracking;
      p.vx += Math.max(-maxTurn, Math.min(maxTurn, dx * trackingStep));
    }

    if (p.y > HEIGHT + 30 || p.x < -30 || p.x > WIDTH + 30 || p.life <= 0) {
      enemyProjectiles.splice(i, 1);
      continue;
    }

    if (hasPlayer) {
      const projInsetY = p.style === "orb" || p.style === "boss-orb" ? p.h * 0.22 : p.h * 0.08;
      const projHx = p.x + p.w * 0.22;
      const projHy = p.y + projInsetY;
      const projHw = Math.max(2, p.w * 0.56);
      const projHh = Math.max(2, p.h - projInsetY * 2);

      if (intersectsRect(playerHx, playerHy, playerHw, playerHh, projHx, projHy, projHw, projHh)) {
        applyPlayerDamage(p.damage);
        if (!running || !player) {
          break;
        }
        enemyProjectiles.splice(i, 1);
      }
    }
  }
}

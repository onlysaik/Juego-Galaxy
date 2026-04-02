// Boss combat: spawn, attack patterns, and movement tick.
function spawnBossUnit() {
  const hpBase = 30 + wave * 12;
  boss = {
    x: WIDTH / 2 - 72,
    y: -120,
    w: 144,
    h: 96,
    speedX: 1.8 + wave * 0.15,
    speedY: 0.5,
    dir: 1,
    hp: hpBase,
    maxHp: hpBase,
    wave,
    animOffset: Math.random() * Math.PI * 2,
    attackCooldown: 60,
    theme: {
      hull: "#111827",
      panel: "#030712",
      trim: "#334155",
      glow: "#22d3ee",
      engine: "#38bdf8",
    },
    phase: 1,
    vulnerableFrames: 0,
  };
  bossSpawned = true;
  audioEngine.setBossMode(true);
}

function fireBossWeaponPattern(bossShip) {
  if (enemyProjectiles.length >= GAME_TUNING.maxEnemyProjectiles) return;

  triggerCameraShake(8, 3.2);
  const w = bossShip.wave;
  const hpRatio = bossShip.maxHp > 0 ? bossShip.hp / bossShip.maxHp : 1;
  const phase = hpRatio > 0.66 ? 1 : hpRatio > 0.33 ? 2 : 3;
  bossShip.phase = phase;
  const centerX = bossShip.x + bossShip.w / 2;
  const fromY = bossShip.y + bossShip.h * 0.68;
  const spread = 26 + Math.sin(bossShip.animOffset) * 8;
  const trackingStrength = 0.75 + GAME_TUNING.bossOrbTracking * 0.3;

  const lanceVy = 4.5 + w * 0.18;
  const lanceDmg = 12 + Math.floor(w * 2.0);
  const lanceSet = w >= 6
    ? [-spread * 1.3, -spread * 0.7, 0, spread * 0.7, spread * 1.3]
    : w >= 3
      ? [-spread * 1.2, -spread * 0.55, 0, spread * 0.55, spread * 1.2]
      : [-spread, 0, spread];

  for (const xOffset of lanceSet) {
    enemyProjectiles.push({
      x: centerX + xOffset - 5,
      y: fromY,
      w: 10,
      h: 24,
      vx: xOffset * (0.01 + w * 0.002),
      vy: lanceVy,
      damage: lanceDmg,
      color: "#22d3ee",
      glow: "#67e8f9",
      style: "boss-lance",
      life: 170,
    });
  }

  const orbCount = phase >= 3 ? 3 : w >= 5 ? 2 : 1;
  const orbVy = 3.2 + w * 0.15;
  const orbDmg = 14 + Math.floor(w * 2.4);
  for (let i = 0; i < orbCount; i++) {
    const angleShift = (i - (orbCount - 1) / 2) * 0.8;
    enemyProjectiles.push({
      x: centerX - 9 + i * 20,
      y: fromY + 8 + i * 4,
      w: 18,
      h: 18,
      vx: Math.sin(bossShip.animOffset * 1.4 + angleShift) * trackingStrength,
      vy: orbVy,
      damage: orbDmg,
      color: "#38bdf8",
      glow: "#bae6fd",
      style: "boss-orb",
      life: 220,
    });
  }

  if (w >= 6 || phase >= 3) {
    const burstCount = 4 + Math.min(5, Math.floor((w - 6) / 2)) + (phase >= 3 ? 1 : 0);
    const burstSpeed = 2.9 + w * 0.1;
    const burstDmg = 8 + Math.floor(w * 1.4);
    for (let i = 0; i < burstCount; i++) {
      const angle = (i / burstCount) * Math.PI + bossShip.animOffset;
      enemyProjectiles.push({
        x: centerX - 6,
        y: fromY,
        w: 12,
        h: 12,
        vx: Math.cos(angle) * burstSpeed * 0.7,
        vy: Math.abs(Math.sin(angle)) * burstSpeed * 0.7 + burstSpeed * 0.45,
        damage: burstDmg,
        color: "#f43f5e",
        glow: "#fb7185",
        style: "orb",
        life: 200,
      });
    }
  }

  if (phase >= 3) {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + bossShip.animOffset;
      enemyProjectiles.push({
        x: centerX - 6,
        y: fromY,
        w: 12,
        h: 12,
        vx: Math.cos(angle) * 2.2,
        vy: Math.sin(angle) * 2.2 + 2.1,
        damage: 9 + Math.floor(w * 1.2),
        color: "#f97316",
        glow: "#fdba74",
        style: "orb",
        life: 180,
      });
    }
  }

  bossShip.vulnerableFrames = 40;
}

function updateBossState() {
  if (!boss) return;

  if (boss.y < 40) boss.y += boss.speedY;
  boss.x += boss.speedX * boss.dir;
  boss.animOffset += 0.045;
  boss.attackCooldown -= 1;
  if (boss.vulnerableFrames > 0) boss.vulnerableFrames -= 1;
  if (boss.x < 0 || boss.x + boss.w > WIDTH) {
    boss.dir *= -1;
  }

  if (boss.y >= 40 && boss.attackCooldown <= 0) {
    fireBossWeaponPattern(boss);
    const baseCooldown = Math.max(26, 90 - wave * 1.9 + Math.random() * 16);
    boss.attackCooldown = Math.max(8, baseCooldown / GAME_TUNING.bossFireRate);
  }
}

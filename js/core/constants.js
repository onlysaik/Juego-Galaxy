// Core constants: dimensions, data catalogs, tuning values, and progression tables.
const WIDTH = 960;
const HEIGHT = 720;

const SKINS = [
  {
    id: "falcon-blue",
    name: "Falcon Azul",
    price: 0,
    defaultUpgrade: "double",
    profile: "interceptor",
    palette: {
      hull: "#94a3b8",
      panel: "#1e293b",
      wing: "#334155",
      accent: "#38bdf8",
      glow: "#7dd3fc",
      engineA: "#67e8f9",
      engineB: "#2563eb",
    },
    stats: {
      maxEnergy: 100,
      speedMult: 1,
      bulletSpeedMult: 1,
      fireDelayMult: 1,
      damageMult: 1,
      dashCooldownMult: 1,
      dashSpeedMult: 1,
      energyRegenMult: 1,
    },
  },
  {
    id: "falcon-red",
    name: "Falcon Rojo",
    price: 300,
    defaultUpgrade: "cone",
    profile: "raider",
    palette: {
      hull: "#cbd5e1",
      panel: "#450a0a",
      wing: "#7f1d1d",
      accent: "#f97316",
      glow: "#fecaca",
      engineA: "#fca5a5",
      engineB: "#dc2626",
    },
    stats: {
      maxEnergy: 92,
      speedMult: 1.08,
      bulletSpeedMult: 1.04,
      fireDelayMult: 0.96,
      damageMult: 1,
      dashCooldownMult: 0.92,
      dashSpeedMult: 1.08,
      energyRegenMult: 0.98,
    },
  },
  {
    id: "falcon-orange",
    name: "Falcon Solar",
    price: 650,
    defaultUpgrade: "rapid",
    profile: "bomber",
    palette: {
      hull: "#e2e8f0",
      panel: "#431407",
      wing: "#9a3412",
      accent: "#f59e0b",
      glow: "#fdba74",
      engineA: "#fde68a",
      engineB: "#f97316",
    },
    stats: {
      maxEnergy: 114,
      speedMult: 0.93,
      bulletSpeedMult: 0.97,
      fireDelayMult: 1.06,
      damageMult: 1.14,
      dashCooldownMult: 1.08,
      dashSpeedMult: 0.96,
      energyRegenMult: 1,
    },
  },
  {
    id: "falcon-violet",
    name: "Falcon Nebula",
    price: 900,
    defaultUpgrade: "volley",
    profile: "raider",
    palette: {
      hull: "#ddd6fe",
      panel: "#2e1065",
      wing: "#4c1d95",
      accent: "#a78bfa",
      glow: "#c4b5fd",
      engineA: "#e9d5ff",
      engineB: "#7c3aed",
    },
    stats: {
      maxEnergy: 96,
      speedMult: 1.02,
      bulletSpeedMult: 1.06,
      fireDelayMult: 0.92,
      damageMult: 0.98,
      dashCooldownMult: 1,
      dashSpeedMult: 1.02,
      energyRegenMult: 1.04,
    },
  },
  {
    id: "falcon-emerald",
    name: "Falcon Esmeralda",
    price: 1125,
    defaultUpgrade: "overcharge",
    profile: "interceptor",
    palette: {
      hull: "#d1fae5",
      panel: "#052e16",
      wing: "#14532d",
      accent: "#22c55e",
      glow: "#86efac",
      engineA: "#bbf7d0",
      engineB: "#16a34a",
    },
    stats: {
      maxEnergy: 126,
      speedMult: 0.9,
      bulletSpeedMult: 0.95,
      fireDelayMult: 1.04,
      damageMult: 1.06,
      dashCooldownMult: 1.06,
      dashSpeedMult: 0.95,
      energyRegenMult: 1.18,
    },
  },
  {
    id: "falcon-onyx",
    name: "Falcon Onyx",
    price: 1500,
    defaultUpgrade: "rapid",
    profile: "bomber",
    palette: {
      hull: "#cbd5e1",
      panel: "#020617",
      wing: "#111827",
      accent: "#0ea5e9",
      glow: "#67e8f9",
      engineA: "#e0f2fe",
      engineB: "#0284c7",
    },
    stats: {
      maxEnergy: 88,
      speedMult: 1.12,
      bulletSpeedMult: 1.1,
      fireDelayMult: 0.88,
      damageMult: 0.94,
      dashCooldownMult: 0.86,
      dashSpeedMult: 1.12,
      energyRegenMult: 0.94,
    },
  },
];

const DIFFICULTIES = {
  easy: {
    playerSpeed: 5.5,
    bulletSpeed: 8.5,
    shootDelay: 7,
    spawnFactor: 0.85,
    enemySpeedFactor: 0.85,
    enemyDamage: 22,
    scoreMult: 1,
    coinMult: 1,
  },
  normal: {
    playerSpeed: 5,
    bulletSpeed: 7.8,
    shootDelay: 9,
    spawnFactor: 1,
    enemySpeedFactor: 1,
    enemyDamage: 28,
    scoreMult: 1,
    coinMult: 1,
  },
  hard: {
    playerSpeed: 4.5,
    bulletSpeed: 7.2,
    shootDelay: 11,
    spawnFactor: 1.1,
    enemySpeedFactor: 1.12,
    enemyDamage: 31,
    scoreMult: 1.45,
    coinMult: 1.3,
  },
  brutal: {
    playerSpeed: 4.25,
    bulletSpeed: 6.9,
    shootDelay: 12,
    spawnFactor: 1.28,
    enemySpeedFactor: 1.22,
    enemyDamage: 37,
    scoreMult: 1.85,
    coinMult: 1.55,
  },
};

const ENEMY_RACES = [
  {
    id: "klingon",
    pattern: "plasma-fan",
    // Agresores medianos: zigzag rÃ¡pido, disparo frecuente
    movPat: "zigzag",
    speedMult: 0.88,
    fireCadence: 58,
    hull: "#0f172a",
    panel: "#1e293b",
    trim: "#7f1d1d",
    glow: "#ef4444",
    engine: "#f97316",
  },
  {
    id: "romulan",
    pattern: "dual-bolt",
    // Acechadores lentos: barrido amplio y lento, disparo cadencioso
    movPat: "sweep",
    speedMult: 0.65,
    fireCadence: 82,
    hull: "#111827",
    panel: "#1f2937",
    trim: "#312e81",
    glow: "#a78bfa",
    engine: "#fb7185",
  },
  {
    id: "pirate",
    pattern: "ion-orb",
    // Piratas caÃ³ticos: muy rÃ¡pidos, trayectoria errÃ¡tica, disparo lento
    movPat: "erratic",
    speedMult: 1.45,
    fireCadence: 100,
    hull: "#1c1917",
    panel: "#292524",
    trim: "#3f3f46",
    glow: "#f43f5e",
    engine: "#f59e0b",
  },
];

const GAME_TUNING = {
  bossFireRate: 1,
  bossOrbTracking: 1,
  debugHitboxes: false,
  maxPlayerBullets: 180,
  maxEnemyProjectiles: 190,
  bulletLiteThreshold: 90,
  enemyProjectileLiteThreshold: 120,
  bloomBulletThreshold: 70,
  globalFxLiteThreshold: 230,
  hudUpdateIntervalFrames: 2,
  forceCircularBullets: true,
};

const DASH_TUNING = {
  cooldownFrames: 82,
  durationFrames: 8,
  speed: 12.5,
  invulnFrames: 10,
};

const COMBO_TUNING = {
  maxStacks: 8,
  decayFrames: 150,
  nearKillDistance: 145,
  topZoneY: HEIGHT * 0.56,
  multiplierPerStack: 0.12,
};

const WAVE_PROFILES = {
  calm: {
    id: "calm",
    name: "Calma",
    spawnCountMult: 0.72,
    spawnRateMult: 0.78,
    enemyHpMult: 0.9,
    enemySpeedMult: 0.86,
    fireRateMult: 0.84,
    eliteChance: 0.03,
    roles: ["fan", "zoner", "fan", "hunter"],
  },
  pressure: {
    id: "pressure",
    name: "Presion",
    spawnCountMult: 1.25,
    spawnRateMult: 1.18,
    enemyHpMult: 0.92,
    enemySpeedMult: 1.04,
    fireRateMult: 0.94,
    eliteChance: 0.08,
    roles: ["hunter", "fan", "hunter", "zoner"],
  },
  rapid: {
    id: "rapid",
    name: "Rapida",
    spawnCountMult: 0.96,
    spawnRateMult: 1.04,
    enemyHpMult: 0.84,
    enemySpeedMult: 1.22,
    fireRateMult: 0.9,
    eliteChance: 0.05,
    roles: ["hunter", "hunter", "zoner", "fan"],
  },
  tank: {
    id: "tank",
    name: "Tanque",
    spawnCountMult: 0.78,
    spawnRateMult: 0.9,
    enemyHpMult: 1.45,
    enemySpeedMult: 0.82,
    fireRateMult: 1.08,
    eliteChance: 0.18,
    roles: ["guardian", "guardian", "fan", "zoner"],
  },
  miniboss: {
    id: "miniboss",
    name: "Miniboss",
    spawnCountMult: 0.52,
    spawnRateMult: 0.86,
    enemyHpMult: 2.1,
    enemySpeedMult: 0.88,
    fireRateMult: 1.02,
    eliteChance: 0.46,
    roles: ["guardian", "guardian", "hunter", "zoner"],
  },
};

const ENEMY_ROLE_DEFS = {
  hunter: {
    id: "hunter",
    name: "Cazador",
    speedMult: 1.18,
    hpMult: 0.92,
    fireCadenceMult: 0.92,
    pattern: "aimed-burst",
    movement: "hunt",
    rewardMult: 1.05,
  },
  zoner: {
    id: "zoner",
    name: "Zonificador",
    speedMult: 0.94,
    hpMult: 1.08,
    fireCadenceMult: 1.02,
    pattern: "plasma-fan",
    movement: "zone",
    rewardMult: 1.12,
  },
  fan: {
    id: "fan",
    name: "Artillero",
    speedMult: 0.9,
    hpMult: 1,
    fireCadenceMult: 0.98,
    pattern: "plasma-fan",
    movement: "sweep",
    rewardMult: 1.08,
  },
  guardian: {
    id: "guardian",
    name: "Guardian",
    speedMult: 0.72,
    hpMult: 1.7,
    fireCadenceMult: 1.16,
    pattern: "ion-orb",
    movement: "guard",
    rewardMult: 1.35,
  },
};

const PERFORMANCE_PRESETS = {
  performance: {
    maxPlayerBullets: 120,
    maxEnemyProjectiles: 150,
    bulletLiteThreshold: 58,
    enemyProjectileLiteThreshold: 84,
    bloomBulletThreshold: 42,
    globalFxLiteThreshold: 165,
    hudUpdateIntervalFrames: 3,
    forceCircularBullets: true,
  },
  balanced: {
    maxPlayerBullets: 180,
    maxEnemyProjectiles: 190,
    bulletLiteThreshold: 90,
    enemyProjectileLiteThreshold: 120,
    bloomBulletThreshold: 70,
    globalFxLiteThreshold: 230,
    hudUpdateIntervalFrames: 2,
    forceCircularBullets: true,
  },
  quality: {
    maxPlayerBullets: 260,
    maxEnemyProjectiles: 320,
    bulletLiteThreshold: 140,
    enemyProjectileLiteThreshold: 180,
    bloomBulletThreshold: 120,
    globalFxLiteThreshold: 320,
    hudUpdateIntervalFrames: 1,
    forceCircularBullets: true,
  },
};

const POWER_UP_DURATION_FRAMES = 60 * 30;
const POWER_UP_STACK_BONUS_FRAMES = 60 * 10;
const POWER_UP_DEFS = {
  double:     { name: "Doble" },
  cone:       { name: "Cono" },
  rapid:      { name: "R\u00e1pido" },
  volley:     { name: "R\u00e1faga" },
  overcharge: { name: "Sobrecarga" },
  wide:       { name: "Dispersi\u00f3n" },
  back:       { name: "Retrocohete" },
  sniper:     { name: "Francotirador" },
  ricochet:   { name: "Ricochet" },
};

const BIOME_THEMES = [
  {
    name: "Nebula Glacial",
    bgTop: "#040712",
    bgMid: "#081022",
    bgBottom: "#02050e",
    nebulaA: "84,196,255",
    nebulaB: "251,146,60",
    nebulaC: "192,132,252",
    accent: "#7dd3fc",
    danger: "#ef4444",
  },
  {
    name: "Tormenta Solar",
    bgTop: "#13070a",
    bgMid: "#221108",
    bgBottom: "#100503",
    nebulaA: "251,146,60",
    nebulaB: "248,113,113",
    nebulaC: "253,224,71",
    accent: "#fdba74",
    danger: "#fb7185",
  },
  {
    name: "Abismo Esmeralda",
    bgTop: "#04110f",
    bgMid: "#07201d",
    bgBottom: "#020a08",
    nebulaA: "74,222,128",
    nebulaB: "45,212,191",
    nebulaC: "96,165,250",
    accent: "#6ee7b7",
    danger: "#f43f5e",
  },
  {
    name: "Anomalia Ionica",
    bgTop: "#060718",
    bgMid: "#100b2f",
    bgBottom: "#03050f",
    nebulaA: "147,197,253",
    nebulaB: "196,181,253",
    nebulaC: "244,114,182",
    accent: "#c4b5fd",
    danger: "#fb7185",
  },
];

const SKIN_LIVERIES = {
  "falcon-blue": {
    insignia: "wing",
    tailNumber: "A-11",
    pattern: "chevron",
    color: "#7dd3fc",
  },
  "falcon-red": {
    insignia: "claw",
    tailNumber: "R-27",
    pattern: "slash",
    color: "#fb7185",
  },
  "falcon-orange": {
    insignia: "sun",
    tailNumber: "S-08",
    pattern: "band",
    color: "#fdba74",
  },
  "falcon-violet": {
    insignia: "nova",
    tailNumber: "N-42",
    pattern: "split",
    color: "#c4b5fd",
  },
  "falcon-emerald": {
    insignia: "leaf",
    tailNumber: "E-19",
    pattern: "spine",
    color: "#86efac",
  },
  "falcon-onyx": {
    insignia: "orbital",
    tailNumber: "X-73",
    pattern: "grid",
    color: "#67e8f9",
  },
};

// Targets are interpolated by wave to keep progression smooth and predictable.
const WAVE_BALANCE_TARGETS = [
  { wave: 1,  avgBuyPrice: 300,  powerDropRate: 0.22, ttkEnemySec: 0.55, enemyHp: 1, coinPerKill: 1.0 },
  { wave: 3,  avgBuyPrice: 650,  powerDropRate: 0.19, ttkEnemySec: 0.72, enemyHp: 2, coinPerKill: 1.15 },
  { wave: 5,  avgBuyPrice: 900,  powerDropRate: 0.165, ttkEnemySec: 0.90, enemyHp: 3, coinPerKill: 1.35 },
  { wave: 7,  avgBuyPrice: 1125, powerDropRate: 0.145, ttkEnemySec: 1.08, enemyHp: 4, coinPerKill: 1.55 },
  { wave: 10, avgBuyPrice: 1500, powerDropRate: 0.12, ttkEnemySec: 1.28, enemyHp: 5, coinPerKill: 1.8 },
];

function getWaveBalanceTarget(targetWave) {
  const w = clamp(targetWave, 1, 99);
  const first = WAVE_BALANCE_TARGETS[0];
  const last = WAVE_BALANCE_TARGETS[WAVE_BALANCE_TARGETS.length - 1];

  if (w <= first.wave) return first;
  if (w >= last.wave) {
    const overflow = w - last.wave;
    return {
      wave: w,
      avgBuyPrice: last.avgBuyPrice + overflow * 130,
      powerDropRate: Math.max(0.08, last.powerDropRate - overflow * 0.004),
      ttkEnemySec: last.ttkEnemySec + overflow * 0.08,
      enemyHp: Math.min(8, last.enemyHp + Math.floor(overflow / 2)),
      coinPerKill: last.coinPerKill + overflow * 0.09,
    };
  }

  for (let i = 0; i < WAVE_BALANCE_TARGETS.length - 1; i++) {
    const a = WAVE_BALANCE_TARGETS[i];
    const b = WAVE_BALANCE_TARGETS[i + 1];
    if (w >= a.wave && w <= b.wave) {
      const t = (w - a.wave) / (b.wave - a.wave);
      return {
        wave: w,
        avgBuyPrice: lerp(a.avgBuyPrice, b.avgBuyPrice, t),
        powerDropRate: lerp(a.powerDropRate, b.powerDropRate, t),
        ttkEnemySec: lerp(a.ttkEnemySec, b.ttkEnemySec, t),
        enemyHp: Math.round(lerp(a.enemyHp, b.enemyHp, t)),
        coinPerKill: lerp(a.coinPerKill, b.coinPerKill, t),
      };
    }
  }

  return last;
}

function getWaveProfile(targetWave) {
  if (targetWave > 0 && targetWave % 5 === 0) return WAVE_PROFILES.miniboss;
  if (targetWave > 1 && targetWave % 6 === 0) return WAVE_PROFILES.calm;

  const cycle = (targetWave - 1) % 3;
  if (cycle === 0) return WAVE_PROFILES.pressure;
  if (cycle === 1) return WAVE_PROFILES.rapid;
  return WAVE_PROFILES.tank;
}

function buildWaveObjective(targetWave, profile) {
  const baseCoins = 6 + targetWave * 2;
  const baseHeal = 10 + Math.min(18, targetWave * 2);
  const selector = (targetWave - 1) % 4;

  if (selector === 0) {
    return {
      type: "survive",
      label: "Sobrevive 20s",
      timer: 60 * 20,
      goal: 60 * 20,
      rewardCoins: baseCoins,
      rewardEnergy: baseHeal,
      completed: false,
      failed: false,
    };
  }

  if (selector === 1) {
    const goal = 6 + targetWave;
    return {
      type: "kills",
      label: `Destruye ${6 + targetWave} naves`,
      remaining: goal,
      goal,
      rewardCoins: baseCoins + 4,
      rewardEnergy: baseHeal,
      completed: false,
      failed: false,
    };
  }

  if (selector === 2) {
    return {
      type: "no-hit-elite",
      label: "Elimina 1 elite sin recibir dano",
      remaining: 1,
      goal: 1,
      rewardCoins: baseCoins + 7,
      rewardEnergy: baseHeal + 4,
      failOnDamage: true,
      completed: false,
      failed: false,
    };
  }

  const goal = 3 + Math.floor(targetWave / 2);
  return {
    type: "aggressive-kills",
    label: `Consigue ${3 + Math.floor(targetWave / 2)} bajas agresivas`,
    remaining: goal,
    goal,
    rewardCoins: baseCoins + 5,
    rewardEnergy: baseHeal,
    completed: false,
    failed: false,
  };
}

function buildUpgradeName(modes) {
  const order = ["rapid", "overcharge", "sniper", "wide", "double", "cone", "volley", "ricochet", "back"];
  const parts = order.filter((m) => modes.has(m)).map((m) => POWER_UP_DEFS[m].name);
  return parts.length ? parts.join(" + ") : "Normal";
}


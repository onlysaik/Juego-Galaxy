// Persistencia: perfil del piloto (banco, naves, records) y punto de control de la partida.
// Todo se guarda en localStorage con claves versionadas y se valida al cargar,
// de modo que datos corruptos o de versiones antiguas nunca rompen el arranque.

const PROFILE_STORAGE_KEY = "gg_profile_v1";
const RUN_CHECKPOINT_STORAGE_KEY = "gg_run_checkpoint_v1";
const SAVE_FORMAT_VERSION = 1;
const DEFAULT_SKIN_ID = "falcon-blue";

function createEmptyProfileStats() {
  return {
    bestScore: 0,
    bestWave: 0,
    runsPlayed: 0,
    totalKills: 0,
    totalBossesDefeated: 0,
    totalCoinsEarned: 0,
    bestScoreByDifficulty: {},
    lastRun: null,
  };
}

let profileStats = createEmptyProfileStats();

function readStorageJson(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function writeStorageJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (_) {
    return false;
  }
}

function removeStorageKey(key) {
  try {
    localStorage.removeItem(key);
  } catch (_) {
    // Almacenamiento no disponible (modo privado, cuota, etc.): ignorar.
  }
}

function toSafeNumber(value, fallback = 0, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, min, max);
}

function isKnownSkinId(skinId) {
  return SKINS.some((skin) => skin.id === skinId);
}

function sanitizeProfileStats(raw) {
  const base = createEmptyProfileStats();
  if (!raw || typeof raw !== "object") return base;

  base.bestScore = Math.floor(toSafeNumber(raw.bestScore));
  base.bestWave = Math.floor(toSafeNumber(raw.bestWave, 0, 0, 9999));
  base.runsPlayed = Math.floor(toSafeNumber(raw.runsPlayed));
  base.totalKills = Math.floor(toSafeNumber(raw.totalKills));
  base.totalBossesDefeated = Math.floor(toSafeNumber(raw.totalBossesDefeated));
  base.totalCoinsEarned = Math.floor(toSafeNumber(raw.totalCoinsEarned));

  if (raw.bestScoreByDifficulty && typeof raw.bestScoreByDifficulty === "object") {
    for (const key of Object.keys(DIFFICULTIES)) {
      const v = Math.floor(toSafeNumber(raw.bestScoreByDifficulty[key]));
      if (v > 0) base.bestScoreByDifficulty[key] = v;
    }
  }

  if (raw.lastRun && typeof raw.lastRun === "object") {
    base.lastRun = {
      score: Math.floor(toSafeNumber(raw.lastRun.score)),
      wave: Math.floor(toSafeNumber(raw.lastRun.wave, 1, 1, 9999)),
      coins: Math.floor(toSafeNumber(raw.lastRun.coins)),
      kills: Math.floor(toSafeNumber(raw.lastRun.kills)),
      difficulty: DIFFICULTIES[raw.lastRun.difficulty] ? raw.lastRun.difficulty : "normal",
      endedAt: Math.floor(toSafeNumber(raw.lastRun.endedAt)),
    };
  }

  return base;
}

// Carga banco, naves y records. Se llama una vez al arrancar, antes del primer render.
function loadProfile() {
  const data = readStorageJson(PROFILE_STORAGE_KEY);
  if (!data || typeof data !== "object") return;

  coinsBankValue = Math.floor(toSafeNumber(data.bank));

  const owned = Array.isArray(data.ownedSkins)
    ? data.ownedSkins.filter((id, i, arr) => typeof id === "string" && isKnownSkinId(id) && arr.indexOf(id) === i)
    : [];
  if (!owned.includes(DEFAULT_SKIN_ID)) owned.unshift(DEFAULT_SKIN_ID);
  ownedSkins = owned;

  selectedSkin = owned.includes(data.selectedSkin) ? data.selectedSkin : DEFAULT_SKIN_ID;

  if (typeof data.difficulty === "string" && DIFFICULTIES[data.difficulty]) {
    difficultySelect.value = data.difficulty;
    difficulty = getDifficultyConfig();
  }

  profileStats = sanitizeProfileStats(data.stats);
}

function saveProfile() {
  return writeStorageJson(PROFILE_STORAGE_KEY, {
    version: SAVE_FORMAT_VERSION,
    savedAt: Date.now(),
    bank: Math.floor(coinsBankValue),
    ownedSkins: ownedSkins.slice(),
    selectedSkin,
    difficulty: difficultySelect.value,
    stats: profileStats,
  });
}

// Actualiza records al terminar la partida. Devuelve que records se batieron.
function recordRunResult() {
  const finalScoreValue = Math.floor(score);
  const coinsEarned = Math.floor(coinsRun);
  const difficultyKey = DIFFICULTIES[difficultySelect.value] ? difficultySelect.value : "normal";
  const previousBestScore = profileStats.bestScore;
  const previousBestWave = profileStats.bestWave;
  const previousDifficultyBest = profileStats.bestScoreByDifficulty[difficultyKey] || 0;

  profileStats.runsPlayed += 1;
  profileStats.totalKills += killsRun;
  profileStats.totalBossesDefeated += bossesDefeatedRun;
  profileStats.totalCoinsEarned += coinsEarned;
  profileStats.bestScore = Math.max(previousBestScore, finalScoreValue);
  profileStats.bestWave = Math.max(previousBestWave, wave);
  profileStats.bestScoreByDifficulty[difficultyKey] = Math.max(previousDifficultyBest, finalScoreValue);
  profileStats.lastRun = {
    score: finalScoreValue,
    wave,
    coins: coinsEarned,
    kills: killsRun,
    difficulty: difficultyKey,
    endedAt: Date.now(),
  };

  saveProfile();

  return {
    newBestScore: finalScoreValue > previousBestScore && finalScoreValue > 0,
    newBestWave: wave > previousBestWave,
    previousBestScore,
  };
}

// ── Punto de control ─────────────────────────────────────────────────────────
// Se guarda al abrir la tienda de intermision (y tras cada accion dentro de ella),
// para poder reanudar la partida tras cerrar o recargar la pagina.
// Se borra al morir o al empezar una partida nueva.

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function saveRunCheckpoint() {
  if (phase !== "intermission" || pendingIntermissionWave == null || !player) return false;

  return writeStorageJson(RUN_CHECKPOINT_STORAGE_KEY, {
    version: SAVE_FORMAT_VERSION,
    savedAt: Date.now(),
    difficulty: difficultySelect.value,
    skinId: player.skinId,
    nextWave: pendingIntermissionWave,
    score,
    coinsRun,
    rareCoresRun,
    lives,
    energyRatio: maxEnergy > 0 ? clamp(player.energy / maxEnergy, 0, 1) : 1,
    killsRun,
    bossesDefeatedRun,
    permanentPerks: cloneJson(permanentPerks),
    temporaryPerks: cloneJson(temporaryPerks),
    legendaryPityCount,
    economy: {
      spentCoins: economySpentCoinsRun,
      spentRare: economySpentRareRun,
      actions: economyActionsRun,
      lockedCount: economyLockedCountRun,
      transmutes: economyTransmutesRun,
    },
    // Se guarda la tienda exacta para que recargar no sirva como reroll gratis.
    shop: {
      offers: cloneJson(intermissionOffersState),
      purchasedIds: intermissionPurchasedOfferIds.slice(),
      lastPurchasedId: intermissionLastPurchasedOfferId,
      rerollsLeft: intermissionRerollsLeft,
      rerollUses: intermissionRerollUses,
      lockedOfferId: intermissionLockedOfferId,
      lockedOfferSnapshot: intermissionLockedOfferSnapshot ? cloneJson(intermissionLockedOfferSnapshot) : null,
      transmuteUsed: intermissionTransmuteUsed,
    },
  });
}

function sanitizePerkList(list) {
  if (!Array.isArray(list)) return [];
  return list.filter((perk) => perk && typeof perk === "object").map((perk) => {
    const clean = {};
    for (const [key, value] of Object.entries(perk)) {
      if (typeof value === "number" && Number.isFinite(value)) clean[key] = value;
      else if (typeof value === "string" || typeof value === "boolean") clean[key] = value;
    }
    return clean;
  });
}

function loadRunCheckpoint() {
  const cp = readStorageJson(RUN_CHECKPOINT_STORAGE_KEY);
  if (!cp || typeof cp !== "object" || cp.version !== SAVE_FORMAT_VERSION) return null;

  const nextWave = Math.floor(toSafeNumber(cp.nextWave, 0, 0, 9999));
  const livesLeft = Math.floor(toSafeNumber(cp.lives, 0, 0, 99));
  if (nextWave < 2 || livesLeft <= 0) return null;
  if (!DIFFICULTIES[cp.difficulty]) return null;
  if (!ownedSkins.includes(cp.skinId)) return null;

  const shop = cp.shop && typeof cp.shop === "object" ? cp.shop : {};
  const offers = Array.isArray(shop.offers) ? shop.offers.filter((o) => o && typeof o === "object" && typeof o.id === "string") : [];

  return {
    savedAt: toSafeNumber(cp.savedAt),
    difficulty: cp.difficulty,
    skinId: cp.skinId,
    nextWave,
    score: toSafeNumber(cp.score),
    coinsRun: toSafeNumber(cp.coinsRun),
    rareCoresRun: toSafeNumber(cp.rareCoresRun),
    lives: livesLeft,
    energyRatio: toSafeNumber(cp.energyRatio, 1, 0.01, 1),
    killsRun: Math.floor(toSafeNumber(cp.killsRun)),
    bossesDefeatedRun: Math.floor(toSafeNumber(cp.bossesDefeatedRun)),
    permanentPerks: sanitizePerkList(cp.permanentPerks),
    temporaryPerks: sanitizePerkList(cp.temporaryPerks),
    legendaryPityCount: Math.floor(toSafeNumber(cp.legendaryPityCount, 0, 0, 100)),
    economy: cp.economy && typeof cp.economy === "object" ? cp.economy : {},
    shop: offers.length > 0 ? {
      offers,
      purchasedIds: Array.isArray(shop.purchasedIds) ? shop.purchasedIds.filter((id) => typeof id === "string") : [],
      lastPurchasedId: typeof shop.lastPurchasedId === "string" ? shop.lastPurchasedId : null,
      rerollsLeft: Math.floor(toSafeNumber(shop.rerollsLeft, 0, 0, 9)),
      rerollUses: Math.floor(toSafeNumber(shop.rerollUses, 0, 0, 99)),
      lockedOfferId: typeof shop.lockedOfferId === "string" ? shop.lockedOfferId : null,
      lockedOfferSnapshot: shop.lockedOfferSnapshot && typeof shop.lockedOfferSnapshot === "object" ? shop.lockedOfferSnapshot : null,
      transmuteUsed: !!shop.transmuteUsed,
    } : null,
  };
}

function hasRunCheckpoint() {
  return loadRunCheckpoint() !== null;
}

function clearRunCheckpoint() {
  removeStorageKey(RUN_CHECKPOINT_STORAGE_KEY);
}

// Reconstruye la partida guardada y abre la tienda de intermision donde se dejo.
function resumeRunFromCheckpoint() {
  const cp = loadRunCheckpoint();
  if (!cp) {
    clearRunCheckpoint();
    return false;
  }

  difficultySelect.value = cp.difficulty;
  selectedSkin = cp.skinId;
  runStartNewGame({ preserveCheckpoint: true });

  score = cp.score;
  coinsRun = cp.coinsRun;
  rareCoresRun = cp.rareCoresRun;
  lives = cp.lives;
  killsRun = cp.killsRun;
  bossesDefeatedRun = cp.bossesDefeatedRun;
  permanentPerks = cp.permanentPerks;
  temporaryPerks = cp.temporaryPerks;
  legendaryPityCount = cp.legendaryPityCount;
  economySpentCoinsRun = toSafeNumber(cp.economy.spentCoins);
  economySpentRareRun = toSafeNumber(cp.economy.spentRare);
  economyActionsRun = Math.floor(toSafeNumber(cp.economy.actions));
  economyLockedCountRun = Math.floor(toSafeNumber(cp.economy.lockedCount));
  economyTransmutesRun = Math.floor(toSafeNumber(cp.economy.transmutes));

  const eco = getEconomyModifiers();
  maxEnergy = player.skinStats.maxEnergy + eco.maxEnergyBonus;
  player.energy = clamp(cp.energyRatio * maxEnergy, 1, maxEnergy);

  wave = cp.nextWave - 1;
  currentWaveProfile = getWaveProfile(wave);
  biomeThemeIndex = getBiomeTheme(wave).index;
  displayScore = Math.floor(score);
  lastScoreTarget = Math.floor(score);

  openIntermissionShop(cp.nextWave, cp.shop);
  updateHud();
  return true;
}

function formatSavedAgo(timestamp) {
  if (!timestamp) return "";
  const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (minutes < 1) return "hace un momento";
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

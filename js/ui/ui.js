// UI module: HUD, shop, menu visibility, and wave setup.
function getDifficultyConfig() {
  return DIFFICULTIES[difficultySelect.value] || DIFFICULTIES.normal;
}

function applyPerformancePreset(presetName) {
  const preset = PERFORMANCE_PRESETS[presetName] || PERFORMANCE_PRESETS.balanced;
  currentPerformancePreset = PERFORMANCE_PRESETS[presetName] ? presetName : "balanced";

  GAME_TUNING.maxPlayerBullets = preset.maxPlayerBullets;
  GAME_TUNING.maxEnemyProjectiles = preset.maxEnemyProjectiles;
  GAME_TUNING.bulletLiteThreshold = preset.bulletLiteThreshold;
  GAME_TUNING.enemyProjectileLiteThreshold = preset.enemyProjectileLiteThreshold;
  GAME_TUNING.bloomBulletThreshold = preset.bloomBulletThreshold;
  GAME_TUNING.globalFxLiteThreshold = preset.globalFxLiteThreshold;
  GAME_TUNING.hudUpdateIntervalFrames = preset.hudUpdateIntervalFrames;
  GAME_TUNING.forceCircularBullets = preset.forceCircularBullets;

  if (performancePreset) performancePreset.value = currentPerformancePreset;
}

function applyWindowedLayoutState(isWindowed) {
  document.body.classList.toggle("windowed-mode", !!isWindowed);
}

function persistDisplayMode(mode) {
  try {
    localStorage.setItem("gg_display_mode", mode);
  } catch (_err) {
    // Ignore storage failures (private mode / restricted context).
  }
}

function syncDisplayModeSelect(mode) {
  if (displayModeSelect) displayModeSelect.value = mode;
}

function setDisplayMode(mode) {
  const targetMode = mode === "fullscreen" ? "fullscreen" : "window";

  if (targetMode === "fullscreen") {
    const rootEl = document.documentElement;
    if (rootEl.requestFullscreen) {
      rootEl.requestFullscreen().then(() => {
        applyWindowedLayoutState(false);
        syncDisplayModeSelect("fullscreen");
        persistDisplayMode("fullscreen");
      }).catch(() => {
        applyWindowedLayoutState(true);
        syncDisplayModeSelect("window");
        persistDisplayMode("window");
      });
      return;
    }
  }

  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {
      // Keep fallback visual state even if browser denies exit call.
    });
  }

  applyWindowedLayoutState(true);
  syncDisplayModeSelect("window");
  persistDisplayMode("window");
}

function handleFullscreenChange() {
  const isFullscreen = !!document.fullscreenElement;
  applyWindowedLayoutState(!isFullscreen);
  syncDisplayModeSelect(isFullscreen ? "fullscreen" : "window");
  persistDisplayMode(isFullscreen ? "fullscreen" : "window");
}

function initDisplayModePreference() {
  const storedMode = (() => {
    try {
      return localStorage.getItem("gg_display_mode");
    } catch (_err) {
      return null;
    }
  })();

  const initialMode = storedMode === "fullscreen" ? "fullscreen" : "window";
  applyWindowedLayoutState(initialMode !== "fullscreen");
  syncDisplayModeSelect(initialMode);
}

function applyUiMode(mode) {
  document.body.classList.toggle("ui-lite", mode === "lite");
  if (uiModeSelect) uiModeSelect.value = mode === "lite" ? "lite" : "standard";
}

function applyHudDensityMode(mode) {
  document.body.classList.toggle("hud-compact", mode === "compact");
  if (hudDensitySelect) hudDensitySelect.value = mode === "compact" ? "compact" : "normal";
}

function persistUiPreference(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (_err) {
    // Ignore storage failures.
  }
}

function initUiPresentationPreferences() {
  const uiMode = (() => {
    try {
      return localStorage.getItem("gg_ui_mode");
    } catch (_err) {
      return null;
    }
  })();

  const hudDensity = (() => {
    try {
      return localStorage.getItem("gg_hud_density");
    } catch (_err) {
      return null;
    }
  })();

  applyUiMode(uiMode === "lite" ? "lite" : "standard");
  applyHudDensityMode(hudDensity === "compact" ? "compact" : "normal");
}

function initGameplayOptionPreferences() {
  const readBool = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      return raw === "1";
    } catch (_err) {
      return fallback;
    }
  };

  enableScreenShake = readBool("gg_shake_enabled", true);
  enableParticles = readBool("gg_particles_enabled", true);
  enableColorblindMode = readBool("gg_colorblind_enabled", false);

  if (shakeToggle) shakeToggle.checked = enableScreenShake;
  if (particlesToggle) particlesToggle.checked = enableParticles;
  if (colorblindToggle) colorblindToggle.checked = enableColorblindMode;

  document.body.classList.toggle("colorblind-mode", enableColorblindMode);
}

function buildDashCooldownBar(ratioReady) {
  const clamped = clamp(ratioReady, 0, 1);
  const full = Math.round(clamped * 8);
  return `${"■".repeat(full)}${"·".repeat(8 - full)}`;
}

function applyAudioSettings({ master, sfx, ui, music, profile }) {
  audioEngine.setBusLevels({ master, sfx, ui, music });
  audioEngine.setProfile(profile);

  if (audioMasterSlider && typeof master === "number") audioMasterSlider.value = Math.round(master * 100);
  if (audioSfxSlider && typeof sfx === "number") audioSfxSlider.value = Math.round(sfx * 100);
  if (audioUiSlider && typeof ui === "number") audioUiSlider.value = Math.round(ui * 100);
    if (audioMusicSlider && typeof music === "number") audioMusicSlider.value = Math.round(music * 100);
  if (audioProfileSelect) audioProfileSelect.value = profile === "immersive" ? "immersive" : "lite";
}

function initAudioPreferences() {
  const getStoredNum = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      const parsed = Number(raw);
      return Number.isFinite(parsed) ? clamp(parsed, 0, 1) : fallback;
    } catch (_err) {
      return fallback;
    }
  };

  const profile = (() => {
    try {
      const v = localStorage.getItem("gg_audio_profile");
      return v === "immersive" ? "immersive" : "lite";
    } catch (_err) {
      return "lite";
    }
  })();

  applyAudioSettings({
    master: getStoredNum("gg_audio_master", 0.8),
    sfx: getStoredNum("gg_audio_sfx", 0.85),
    ui: getStoredNum("gg_audio_ui", 0.7),
    music: getStoredNum("gg_audio_music", 0.50),
    profile,
  });
}

function getEconomyModifiers() {
  const mods = {
    damageMult: 1,
    fireDelayMult: 1,
    speedMult: 1,
    regenMult: 1,
    maxEnergyBonus: 0,
  };

  for (const perk of permanentPerks) {
    mods.damageMult *= perk.damageMult || 1;
    mods.fireDelayMult *= perk.fireDelayMult || 1;
    mods.speedMult *= perk.speedMult || 1;
    mods.regenMult *= perk.regenMult || 1;
    mods.maxEnergyBonus += perk.maxEnergyBonus || 0;
  }

  for (const perk of temporaryPerks) {
    mods.damageMult *= perk.damageMult || 1;
    mods.fireDelayMult *= perk.fireDelayMult || 1;
    mods.speedMult *= perk.speedMult || 1;
    mods.regenMult *= perk.regenMult || 1;
    mods.maxEnergyBonus += perk.maxEnergyBonus || 0;
  }

  return mods;
}

function getIntermissionEconomyContext(nextWave) {
  const energyRatio = player ? player.energy / Math.max(1, maxEnergy) : 1;
  const lowHealth = energyRatio < 0.48 || lives <= 1;
  const lowCoins = coinsRun < (34 + nextWave * 6);
  const strongRun = comboMultiplier >= 1.9 || coinsRun > (90 + nextWave * 14);
  const snowballTax = 1 + Math.min(0.34, permanentPerks.length * 0.045);

  return {
    lowHealth,
    lowCoins,
    strongRun,
    snowballTax,
  };
}

function getTransmuteRareCost() {
  const targetWave = pendingIntermissionWave || wave + 1;
  return 2 + Math.floor(targetWave / 5);
}

function getCurrentLockCandidate() {
  if (!intermissionOffersState.length) return null;
  const legendary = intermissionOffersState.find((offer) => offer.rarity === "legendary");
  if (legendary) return legendary;

  let best = intermissionOffersState[0];
  for (const offer of intermissionOffersState) {
    const bestScore = (best.costCoins || 0) + (best.costRare || 0) * 65;
    const offerScore = (offer.costCoins || 0) + (offer.costRare || 0) * 65;
    if (offerScore > bestScore) best = offer;
  }
  return best;
}

function lockIntermissionOffer() {
  if (phase !== "intermission" || intermissionRerollsLeft <= 0 || intermissionLockedOfferSnapshot) return;
  if (rareCoresRun < 1) {
    audioEngine.uiError();
    return;
  }

  const candidate = getCurrentLockCandidate();
  if (!candidate) return;

  rareCoresRun -= 1;
  economySpentRareRun += 1;
  economyActionsRun += 1;
  economyLockedCountRun += 1;
  intermissionLockedOfferId = candidate.id;
  intermissionLockedOfferSnapshot = { ...candidate };
  audioEngine.uiConfirm();
  renderIntermissionOffers();
  updateHud();
}

function transmuteTemporaryPerk() {
  if (phase !== "intermission" || intermissionTransmuteUsed || temporaryPerks.length === 0) {
    audioEngine.uiError();
    return;
  }

  const rareCost = getTransmuteRareCost();
  if (rareCoresRun < rareCost) {
    audioEngine.uiError();
    return;
  }

  let chosenIdx = 0;
  let chosenRemaining = Infinity;
  for (let i = 0; i < temporaryPerks.length; i++) {
    const perk = temporaryPerks[i];
    const remaining = Math.max(0, (perk.expireWave || wave) - wave + 1);
    if (remaining < chosenRemaining) {
      chosenRemaining = remaining;
      chosenIdx = i;
    }
  }

  const [perk] = temporaryPerks.splice(chosenIdx, 1);
  const permanentPerk = { ...perk };
  delete permanentPerk.expireWave;
  permanentPerk.transmuted = true;

  rareCoresRun -= rareCost;
  economySpentRareRun += rareCost;
  economyActionsRun += 1;
  economyTransmutesRun += 1;
  permanentPerks.push(permanentPerk);
  intermissionTransmuteUsed = true;
  audioEngine.uiConfirm();
  renderIntermissionOffers();
  updateHud();
}

function createIntermissionOfferPool() {
  const nextWave = pendingIntermissionWave || wave + 1;
  const eco = getIntermissionEconomyContext(nextWave);
  const coinScale = (1 + Math.min(1.1, nextWave * 0.07)) * eco.snowballTax;
  const pool = [
    {
      id: `tmp-dmg-${Math.random()}`,
      kind: "temporal",
      rarity: "standard",
      title: "Modulo de impacto",
      desc: "+14% dano por 2 oleadas.",
      costCoins: Math.round((42 + nextWave * 5) * coinScale),
      costRare: 0,
      durationWaves: 2,
      buffKey: "impacto",
      mods: { damageMult: 1.14 },
    },
    {
      id: `tmp-rapid-${Math.random()}`,
      kind: "temporal",
      rarity: "standard",
      title: "Inyector de cadencia",
      desc: "-11% tiempo entre disparos por 2 oleadas.",
      costCoins: Math.round((46 + nextWave * 5) * coinScale),
      costRare: 0,
      durationWaves: 2,
      buffKey: "cadencia",
      mods: { fireDelayMult: 0.89 },
    },
    {
      id: `tmp-regen-${Math.random()}`,
      kind: "temporal",
      rarity: "standard",
      title: "Nano-reparador",
      desc: "+28% regeneracion por 2 oleadas.",
      costCoins: Math.round((40 + nextWave * 5) * coinScale),
      costRare: 0,
      durationWaves: 2,
      buffKey: "regen",
      mods: { regenMult: 1.28 },
    },
    {
      id: `perm-dmg-${Math.random()}`,
      kind: "permanente",
      rarity: "rare",
      title: "Nucleo de guerra",
      desc: "+6% dano permanente.",
      costCoins: Math.round((26 + nextWave * 2) * coinScale),
      costRare: 1 + (nextWave >= 8 ? 1 : 0),
      mods: { damageMult: 1.06 },
    },
    {
      id: `perm-speed-${Math.random()}`,
      kind: "permanente",
      rarity: "rare",
      title: "Impulso inercial",
      desc: "+5% velocidad permanente.",
      costCoins: Math.round((26 + nextWave * 2) * coinScale),
      costRare: 1,
      mods: { speedMult: 1.05 },
    },
    {
      id: `perm-reactor-${Math.random()}`,
      kind: "permanente",
      rarity: "rare",
      title: "Reactor extendido",
      desc: "+10 energia maxima permanente.",
      costCoins: Math.round((30 + nextWave * 2) * coinScale),
      costRare: 1,
      mods: { maxEnergyBonus: 10 },
    },
    {
      id: `hybrid-exchange-${Math.random()}`,
      kind: "decision",
      rarity: "rare",
      title: "Contrato de riesgo",
      desc: "Gasta 1 nucleo, gana +80 monedas y +24% carga especial.",
      costCoins: Math.round((12 + nextWave * 1.2) * coinScale),
      costRare: 1,
      oneShot: true,
      grantCoins: 80,
      grantSpecial: 24,
      mods: {},
    },
    {
      id: `legend-overdrive-${Math.random()}`,
      kind: "legendaria",
      rarity: "legendary",
      title: "Matriz Omega",
      desc: "+8% dano, +7% velocidad y -8% cadencia permanente.",
      costCoins: Math.round((68 + nextWave * 7) * coinScale),
      costRare: 2 + (nextWave >= 8 ? 1 : 0),
      mods: { damageMult: 1.08, speedMult: 1.07, fireDelayMult: 0.92 },
    },
  ];

  if (eco.lowHealth) {
    pool.push({
      id: `rescue-plate-${Math.random()}`,
      kind: "rescate",
      rarity: "standard",
      title: "Placas de emergencia",
      desc: "Cura 22 energia y +22% regeneracion por 2 oleadas.",
      costCoins: Math.round((30 + nextWave * 4) * coinScale * 0.9),
      costRare: 0,
      durationWaves: 2,
      buffKey: "rescate",
      grantHeal: 22,
      mods: { regenMult: 1.22 },
    });
  }

  if (eco.lowCoins) {
    pool.push({
      id: `finance-relief-${Math.random()}`,
      kind: "liquidez",
      rarity: "standard",
      title: "Linea de abastecimiento",
      desc: "Paga poco y recibe +55 monedas al instante.",
      costCoins: Math.round((10 + nextWave * 1.2) * coinScale),
      costRare: 0,
      oneShot: true,
      grantCoins: 55,
      mods: {},
    });
  }

  if (eco.strongRun) {
    pool.push({
      id: `risk-overclock-${Math.random()}`,
      kind: "riesgo",
      rarity: "rare",
      title: "Protocolo sobrecarga",
      desc: "+16% dano y -14% regeneracion por 2 oleadas.",
      costCoins: Math.round((38 + nextWave * 4.5) * coinScale),
      costRare: 1,
      durationWaves: 2,
      buffKey: "overclock",
      mods: { damageMult: 1.16, regenMult: 0.86 },
    });
  }

  return pool;
}

function rollIntermissionOffers() {
  const pool = createIntermissionOfferPool();
  const normalPool = pool.filter((item) => item.rarity !== "legendary");
  const legendaryPool = pool.filter((item) => item.rarity === "legendary");

  intermissionOffersState = [];

  if (intermissionLockedOfferSnapshot) {
    intermissionOffersState.push({ ...intermissionLockedOfferSnapshot });
  }

  const shuffledNormal = normalPool.sort(() => Math.random() - 0.5);
  for (const offer of shuffledNormal) {
    if (intermissionOffersState.length >= 3) break;
    if (intermissionLockedOfferSnapshot && offer.title === intermissionLockedOfferSnapshot.title) continue;
    intermissionOffersState.push(offer);
  }

  while (intermissionOffersState.length < 3 && normalPool.length > 0) {
    intermissionOffersState.push(normalPool[Math.floor(Math.random() * normalPool.length)]);
  }

  const hasLegendary = intermissionOffersState.some((offer) => offer.rarity === "legendary");
  const legendaryChance = 0.08 + Math.min(0.36, legendaryPityCount * 0.07);
  if (!hasLegendary && legendaryPool.length > 0 && Math.random() < legendaryChance) {
    const replaceMin = intermissionLockedOfferSnapshot ? 1 : 0;
    const slot = replaceMin + Math.floor(Math.random() * Math.max(1, intermissionOffersState.length - replaceMin));
    intermissionOffersState[slot] = legendaryPool[0];
    legendaryPityCount = 0;
  } else if (hasLegendary) {
    legendaryPityCount = 0;
  } else {
    legendaryPityCount += 1;
  }

  if (intermissionLockedOfferSnapshot) {
    intermissionLockedOfferId = intermissionLockedOfferSnapshot.id;
  }

  renderIntermissionOffers();
}

function buyIntermissionOffer(offerId) {
  if (intermissionPurchaseInFlightId === offerId) return;
  if (intermissionPurchasedOfferIds.includes(offerId)) {
    audioEngine.uiError();
    return;
  }

  const offer = intermissionOffersState.find((item) => item.id === offerId);
  if (!offer) return;
  if (coinsRun < (offer.costCoins || 0) || rareCoresRun < (offer.costRare || 0)) {
    audioEngine.uiError();
    return;
  }

  intermissionPurchaseInFlightId = offerId;

  coinsRun -= offer.costCoins || 0;
  rareCoresRun -= offer.costRare || 0;
  economySpentCoinsRun += offer.costCoins || 0;
  economySpentRareRun += offer.costRare || 0;
  economyActionsRun += 1;

  if (offer.grantCoins) coinsRun += offer.grantCoins;
  if (offer.grantSpecial) gainSpecialCharge(offer.grantSpecial);
  if (offer.grantHeal) healPlayer(offer.grantHeal);

  if (Object.keys(offer.mods || {}).length > 0) {
    if (offer.kind === "temporal") {
      temporaryPerks.push({ ...offer.mods, buffKey: offer.buffKey || offer.kind || "perk", expireWave: (pendingIntermissionWave || wave + 1) + (offer.durationWaves || 1) - 1 });
    } else {
      permanentPerks.push({ ...offer.mods });
    }
  }

  if (offer.oneShot) {
    intermissionOffersState = intermissionOffersState.filter((item) => item.id !== offerId);
    while (intermissionOffersState.length < 3) {
      const extra = createIntermissionOfferPool().sort(() => Math.random() - 0.5)[0];
      intermissionOffersState.push(extra);
    }
  }

  if (offer.id === intermissionLockedOfferId) {
    intermissionLockedOfferId = null;
    intermissionLockedOfferSnapshot = null;
  }

  if (!intermissionPurchasedOfferIds.includes(offerId)) {
    intermissionPurchasedOfferIds.push(offerId);
  }
  intermissionLastPurchasedOfferId = offerId;

  if (intermissionHint) {
    intermissionHint.textContent = `Compra confirmada: ${offer.title}`;
  }
  audioEngine.uiConfirm();

  intermissionPurchaseInFlightId = null;

  renderIntermissionOffers();
  updateHud();
}

function renderIntermissionOffers() {
  const nextLegendaryChance = 0.08 + Math.min(0.36, legendaryPityCount * 0.07);
  const transmuteCost = getTransmuteRareCost();
  intermissionWaveText.textContent = `Oleada ${pendingIntermissionWave || wave + 1} en preparacion`;
  intermissionCoins.textContent = `Monedas: ${Math.floor(coinsRun)}`;
  intermissionRare.textContent = `Nucleos: ${Math.floor(rareCoresRun)}`;
  const rerollCost = 14;
  intermissionRerolls.textContent = intermissionRerollsLeft > 0
    ? `Reroll: disponible (costo ${rerollCost})`
    : "Reroll: comprado";
  intermissionRerollBtn.textContent = intermissionRerollsLeft > 0 ? `Reroll (${rerollCost})` : "Reroll comprado";
  intermissionRerollBtn.disabled = intermissionRerollsLeft <= 0 || coinsRun < rerollCost;

  if (intermissionHint) {
    const lockText = intermissionLockedOfferSnapshot ? "bloqueo activo" : "sin bloqueo";
    intermissionHint.textContent = `Legendaria prox reroll: ${Math.round(nextLegendaryChance * 100)}% · ${lockText}`;
  }

  if (intermissionEconomySummary) {
    intermissionEconomySummary.textContent = `Gasto run: ${Math.floor(economySpentCoinsRun)} monedas · ${Math.floor(economySpentRareRun)} nucleos · ${economyActionsRun} acciones · bloqueos ${economyLockedCountRun} · transmut ${economyTransmutesRun}`;
  }

  if (intermissionLockBtn) {
    const candidate = getCurrentLockCandidate();
    if (intermissionLockedOfferSnapshot) {
      intermissionLockBtn.textContent = "Bloqueo activo";
      intermissionLockBtn.disabled = true;
    } else if (intermissionRerollsLeft <= 0 || !candidate) {
      intermissionLockBtn.textContent = "Bloqueo no disponible";
      intermissionLockBtn.disabled = true;
    } else {
      intermissionLockBtn.textContent = `Bloquear oferta (1 nucleo)`;
      intermissionLockBtn.disabled = rareCoresRun < 1;
    }
  }

  if (intermissionTransmuteBtn) {
    if (intermissionTransmuteUsed) {
      intermissionTransmuteBtn.textContent = "Transmutacion usada";
      intermissionTransmuteBtn.disabled = true;
    } else {
      intermissionTransmuteBtn.textContent = `Transmutar buff (${transmuteCost} nucleos)`;
      intermissionTransmuteBtn.disabled = temporaryPerks.length === 0 || rareCoresRun < transmuteCost;
    }
  }

  intermissionOffers.innerHTML = "";

  for (const offer of intermissionOffersState) {
    const card = document.createElement("div");
    const isLocked = intermissionLockedOfferId === offer.id;
    const alreadyBought = intermissionPurchasedOfferIds.includes(offer.id);
    const isFreshPurchased = intermissionLastPurchasedOfferId === offer.id;
    card.className = `offer-card${offer.rarity === "legendary" ? " legendary" : ""}${isLocked ? " locked" : ""}${alreadyBought ? " purchased" : ""}${isFreshPurchased ? " purchased-fresh" : ""}`;

    const tag = document.createElement("div");
    tag.className = `offer-tag${offer.rarity === "legendary" ? " legendary" : ""}`;
    tag.textContent = offer.kind;

    if (isLocked) {
      const lock = document.createElement("div");
      lock.className = "offer-lock";
      lock.textContent = "bloqueada";
      card.appendChild(lock);
    }

    if (alreadyBought) {
      const seal = document.createElement("div");
      seal.className = "offer-seal";
      seal.textContent = "SELLADO";
      card.appendChild(seal);
    }

    const title = document.createElement("div");
    title.className = "offer-title";
    title.textContent = offer.title;

    const offerMeta = document.createElement("div");
    offerMeta.className = "offer-meta";

    const durationChip = document.createElement("span");
    durationChip.className = "offer-chip";
    durationChip.textContent = offer.durationWaves ? `${offer.durationWaves} oleadas` : "persistente";

    const impactScore = (offer.costCoins || 0) + (offer.costRare || 0) * 65;
    const valueTier = impactScore <= 70 ? "alto valor" : impactScore <= 120 ? "valor medio" : "alto costo";
    const valueChip = document.createElement("span");
    valueChip.className = `offer-chip ${valueTier === "alto valor" ? "good" : valueTier === "alto costo" ? "risk" : ""}`;
    valueChip.textContent = valueTier;
    offerMeta.append(durationChip, valueChip);

    const desc = document.createElement("div");
    desc.className = "offer-desc";
    desc.textContent = offer.desc;

    const cost = document.createElement("div");
    cost.className = "offer-cost";
    const coinPart = (offer.costCoins || 0) > 0 ? `${offer.costCoins} monedas` : "0 monedas";
    const rarePart = (offer.costRare || 0) > 0 ? ` + ${offer.costRare} nucleo` : "";
    cost.textContent = `Costo: ${coinPart}${rarePart}`;

    const buyBtn = document.createElement("button");
    buyBtn.className = "secondary";
    buyBtn.textContent = alreadyBought ? "Comprado" : "Comprar";
    buyBtn.disabled = alreadyBought || coinsRun < (offer.costCoins || 0) || rareCoresRun < (offer.costRare || 0);
    buyBtn.addEventListener("click", () => buyIntermissionOffer(offer.id));

    card.append(tag, title, offerMeta, desc, cost, buyBtn);
    intermissionOffers.appendChild(card);
  }
}

function openIntermissionShop(nextWave) {
  pendingIntermissionWave = nextWave;
  phase = "intermission";
  running = false;
  intermissionRerollsLeft = 1;
  intermissionRerollUses = 0;
  intermissionPurchasedOfferIds = [];
  intermissionPurchaseInFlightId = null;
  intermissionLastPurchasedOfferId = null;
  intermissionLockedOfferId = null;
  intermissionLockedOfferSnapshot = null;
  intermissionTransmuteUsed = false;
  rollIntermissionOffers();
  intermissionScreen.classList.add("show");
  intermissionScreen.setAttribute("aria-hidden", "false");
}

function closeIntermissionShop() {
  intermissionScreen.classList.remove("show");
  intermissionScreen.setAttribute("aria-hidden", "true");
}

function continueFromIntermission() {
  if (pendingIntermissionWave == null) return;
  phase = "playing";
  running = true;
  setupWave(pendingIntermissionWave);
  pendingIntermissionWave = null;
  closeIntermissionShop();
}



function renderShop() {
  const activeSkin = getSkinById(selectedSkin);
  const activeStats = getSkinStatSheet(selectedSkin);
  const speedDelta = Math.round((activeStats.speedMult - 1) * 100);
  const fireDelta = Math.round((1 - activeStats.fireDelayMult) * 100);
  const dashDelta = Math.round((1 - activeStats.dashCooldownMult) * 100);
  bankCoins.textContent = `Monedas totales: ${Math.floor(coinsBankValue)}`;
  selectedSkinText.textContent = `Nave activa: ${activeSkin.name} · casco ${activeStats.maxEnergy} · motor ${speedDelta >= 0 ? "+" : ""}${speedDelta}%`;
  defaultUpgradeText.textContent = `Base: ${POWER_UP_DEFS[activeSkin.defaultUpgrade].name} · cadencia ${fireDelta >= 0 ? "+" : ""}${fireDelta}% · dash ${dashDelta >= 0 ? "+" : ""}${dashDelta}%`;
  skinGrid.innerHTML = "";

  for (const skin of SKINS) {
    const isOwned = ownedSkins.includes(skin.id);
    const isSelected = selectedSkin === skin.id;
    const rarity = skin.price <= 300 ? "common" : skin.price <= 900 ? "rare" : skin.price <= 1200 ? "epic" : "legendary";
    const hasReveal = recentPurchasedSkinId === skin.id;

    const card = document.createElement("div");
    card.className = `skin-card tier-${rarity}${isSelected ? " selected" : ""}${hasReveal ? " reveal" : ""}`;

    const preview = document.createElement("div");
    preview.className = "skin-preview";
    const previewCanvas = document.createElement("canvas");
    previewCanvas.className = "ship-preview-canvas";
    previewCanvas.width = 140;
    previewCanvas.height = 84;
    drawShipPreview(previewCanvas, skin.palette, skin.profile, skin.id);
    preview.appendChild(previewCanvas);

    const name = document.createElement("div");
    name.className = "skin-name";
    name.textContent = skin.name;

    const stats = getSkinStatSheet(skin.id);
    const statBox = document.createElement("div");
    statBox.className = "skin-stats";
    statBox.innerHTML = [
      `<span>Casco ${stats.maxEnergy}</span>`,
      `<span>Motor ${stats.speedMult >= 1 ? "+" : ""}${Math.round((stats.speedMult - 1) * 100)}%</span>`,
      `<span>Cadencia ${stats.fireDelayMult <= 1 ? "+" : ""}${Math.round((1 - stats.fireDelayMult) * 100)}%</span>`,
      `<span>Potencia ${stats.damageMult >= 1 ? "+" : ""}${Math.round((stats.damageMult - 1) * 100)}%</span>`
    ].join("");

    const price = document.createElement("div");
    price.className = "skin-price";
    price.textContent = isOwned ? `Comprada · Dash ${stats.dashCooldownMult <= 1 ? "+" : ""}${Math.round((1 - stats.dashCooldownMult) * 100)}%` : `Precio: ${skin.price} monedas`;

    const button = document.createElement("button");
    button.className = isOwned ? "secondary" : "ghost";

    if (isOwned) {
      button.textContent = isSelected ? "Seleccionada" : "Seleccionar";
      button.disabled = isSelected;
      button.addEventListener("click", () => {
        selectedSkin = skin.id;
        renderShop();
      });
    } else {
      button.textContent = "Comprar";
      button.disabled = coinsBankValue < skin.price;
      button.addEventListener("click", () => {
        if (coinsBankValue >= skin.price) {
          coinsBankValue -= skin.price;
          ownedSkins.push(skin.id);
          selectedSkin = skin.id;
          recentPurchasedSkinId = skin.id;
          renderShop();
          updateHud();
          setTimeout(() => {
            if (recentPurchasedSkinId === skin.id) {
              recentPurchasedSkinId = null;
              renderShop();
            }
          }, 900);
        }
      });
    }

    card.append(preview, name, statBox, price, button);
    skinGrid.appendChild(card);
  }
}

function updateHud() {
  const scoreTarget = Math.floor(score);
  const coinsTarget = Math.floor(running ? coinsBankValue + coinsRun : coinsBankValue);

  if (scoreTarget > lastScoreTarget) scorePopFrames = 14;
  if (coinsTarget > lastCoinsTarget) coinsPopFrames = 14;

  const scoreStep = Math.max(1, Math.ceil(Math.abs(scoreTarget - displayScore) * 0.2));
  if (displayScore < scoreTarget) displayScore = Math.min(scoreTarget, displayScore + scoreStep);
  else if (displayScore > scoreTarget) displayScore = Math.max(scoreTarget, displayScore - scoreStep);

  const coinStep = Math.max(1, Math.ceil(Math.abs(coinsTarget - displayCoins) * 0.2));
  if (displayCoins < coinsTarget) displayCoins = Math.min(coinsTarget, displayCoins + coinStep);
  else if (displayCoins > coinsTarget) displayCoins = Math.max(coinsTarget, displayCoins - coinStep);

  scoreLabel.textContent = `Score: ${Math.floor(displayScore)}`;
  coinsLabel.textContent = `Monedas: ${Math.floor(displayCoins)}`;
  rareLabel.textContent = `Nucleos: ${Math.floor(rareCoresRun)}`;
  waveLabel.textContent = `Oleada: ${wave} · ${currentWaveProfile ? currentWaveProfile.name : "Base"}`;
  livesLabel.textContent = `Vidas: ${lives}`;
  if (player) {
    livesLabel.textContent += ` · HP ${Math.floor(player.energy)}/${Math.floor(maxEnergy)}`;
  }
  comboLabel.textContent = `Combo: x${comboMultiplier.toFixed(1)} · Momentum ${momentumStacks}`;
  const dashReadyRatio = 1 - clamp(dashCooldown / Math.max(1, DASH_TUNING.cooldownFrames), 0, 1);
  dashLabel.textContent = dashCooldown > 0
    ? `Dash: ${buildDashCooldownBar(dashReadyRatio)} ${Math.ceil(dashCooldown / 60)}s`
    : "Dash: ■■■■■■■■ LISTO (Shift)";
  specialLabel.textContent = specialCharge >= 100 ? "Especial: LISTO (Q/E)" : `Especial: ${Math.floor(specialCharge)}%`;

  if (temporaryPerks.length === 0) {
    buffLabel.textContent = "Buffs: sin activos";
  } else {
    const buffParts = temporaryPerks.map((perk) => {
      const remaining = Math.max(0, (perk.expireWave || wave) - wave + 1);
      const name = perk.buffKey || "perk";
      return `${name}(${remaining}o)`;
    });
    buffLabel.textContent = `Buffs: ${buffParts.join(" · ")}`;
  }

  scoreLabel.classList.toggle("pop", scorePopFrames > 0);
  coinsLabel.classList.toggle("pop", coinsPopFrames > 0);
  scorePopFrames = Math.max(0, scorePopFrames - 1);
  coinsPopFrames = Math.max(0, coinsPopFrames - 1);
  lastScoreTarget = scoreTarget;
  lastCoinsTarget = coinsTarget;

  const activeModes = getEffectiveUpgradeModes();
  const modeName = buildUpgradeName(activeModes);
  if (activePowerUp) {
    powerLabel.textContent = `Mejora: ${modeName} (${Math.ceil(activePowerUp.timer / 60)}s)`;
  } else {
    powerLabel.textContent = `Mejora: ${modeName} (base)`;
  }

  if (!currentObjective) {
    objectiveLabel.textContent = "Objetivo: esperando oleada";
  } else if (currentObjective.completed) {
    objectiveLabel.textContent = `Objetivo: completado (+${Math.floor(currentObjective.rewardCoins)} monedas)`;
  } else if (currentObjective.failed) {
    objectiveLabel.textContent = "Objetivo: fallido";
  } else if (currentObjective.type === "survive") {
    objectiveLabel.textContent = `Objetivo: ${Math.ceil(currentObjective.timer / 60)}s`;
  } else {
    objectiveLabel.textContent = `Objetivo: ${currentObjective.label} (${currentObjective.remaining})`;
  }

  let objectiveProgress = 0;
  if (currentObjective && !currentObjective.completed && !currentObjective.failed) {
    if (currentObjective.type === "survive" && currentObjective.goal) {
      objectiveProgress = 1 - (currentObjective.timer / currentObjective.goal);
    } else if (currentObjective.goal) {
      objectiveProgress = 1 - (currentObjective.remaining / currentObjective.goal);
    }
  }
  objectiveLabel.classList.toggle("near", objectiveProgress >= 0.9 && objectiveProgress < 1);

  eventLabel.textContent = "Evento: desactivado";

  const energyPercent = player ? Math.max(0, (player.energy / maxEnergy) * 100) : 100;
  energyFill.style.width = `${energyPercent}%`;

  const isCriticalEnergy = energyPercent <= 25 && running;
  const isCriticalLives = lives <= 1 && running;
  const isDashCooling = dashCooldown > 0 && running;
  const isDashReady = dashCooldown <= 0 && running;
  const isSpecialReady = specialCharge >= 100 && running;
  energyBar.classList.toggle("critical", isCriticalEnergy);
  livesLabel.classList.toggle("critical", isCriticalLives);
  dashLabel.classList.toggle("critical", isDashCooling);
  dashLabel.classList.toggle("ready", isDashReady);
  specialLabel.classList.toggle("critical", isSpecialReady);
  specialLabel.classList.toggle("ready", isSpecialReady);

  if (running && isDashReady && !wasDashReady) {
    audioEngine.dashReady();
  }
  if (running && isSpecialReady && !wasSpecialReady) {
    audioEngine.specialReady();
  }
  wasDashReady = isDashReady;
  wasSpecialReady = isSpecialReady;
}

function setupWave(newWave) {
  wave = newWave;
  audioEngine.setWave(newWave);
  biomeThemeIndex = getBiomeTheme(wave).index;
  currentWaveProfile = getWaveProfile(newWave);
  temporaryPerks = temporaryPerks.filter((perk) => !perk.expireWave || perk.expireWave >= newWave);
  // w1=12, w3=22, w5=32, w10=52
  enemiesToSpawn = Math.max(4, Math.round((8 + Math.floor(newWave * 3.1)) * currentWaveProfile.spawnCountMult));
  bossSpawned = false;
  waveTimer = 90;
  currentObjective = buildWaveObjective(newWave, currentWaveProfile);
  runSpeedBonus = Math.min(0.18, (newWave - 1) * 0.012);

  if (newWave <= 3 && currentObjective && !currentObjective.completed) {
    const tutorialTips = {
      1: "Tutorial: mueve con WASD/Flechas y dispara con Espacio.",
      2: "Tutorial: usa Shift para dash e invulnerabilidad corta.",
      3: "Tutorial: completa objetivo de oleada para recompensas extra.",
    };
    currentObjective.label = tutorialTips[newWave] || currentObjective.label;
  }

  updateHud();
}

intermissionRerollBtn.addEventListener("click", () => {
  if (phase !== "intermission" || intermissionRerollsLeft <= 0) return;

  const rerollCost = 14;
  if (coinsRun < rerollCost) {
    audioEngine.uiError();
    return;
  }

  coinsRun -= rerollCost;
  economySpentCoinsRun += rerollCost;
  economyActionsRun += 1;
  intermissionRerollsLeft -= 1;
  intermissionRerollUses += 1;
  intermissionLastPurchasedOfferId = null;
  rollIntermissionOffers();
  audioEngine.uiReroll();
  intermissionLockedOfferId = null;
  intermissionLockedOfferSnapshot = null;
  updateHud();
});

if (intermissionLockBtn) {
  intermissionLockBtn.addEventListener("click", () => {
    lockIntermissionOffer();
  });
}

if (intermissionTransmuteBtn) {
  intermissionTransmuteBtn.addEventListener("click", () => {
    transmuteTemporaryPerk();
  });
}

intermissionContinueBtn.addEventListener("click", () => {
  continueFromIntermission();
});

function setMenuVisibility(show) {
  startScreen.classList.toggle("show", show);
  startScreen.setAttribute("aria-hidden", show ? "false" : "true");
}

function openMenu(menuMode = "main") {
  const canContinue = menuMode === "pause";
  phase = canContinue ? "paused" : "menu";
  running = false;

  continueBtn.classList.toggle("hidden", !canContinue);
  continueBtn.disabled = !canContinue;
  menuStateText.textContent = canContinue
    ? "Partida en pausa. Puedes continuar o iniciar una nueva partida."
    : "Configura tu nave y comienza una nueva partida.";

  renderShop();
  updateHud();
  setMenuVisibility(true);
}

function continueGame() {
  if (phase !== "paused") return;
  running = true;
  phase = "playing";
  audioEngine.resumeAudio();
  setMenuVisibility(false);
  updateHud();
}

function pauseGame() {
  if (!running || phase !== "playing") return;
  audioEngine.pauseAudio();
  openMenu("pause");
}


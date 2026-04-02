// Render module: ship art, projectiles, overlays, and canvas background drawing.
function drawPowerUps(timeNow) {
  for (const p of powerUps) {
    const pulse = 0.5 + 0.5 * Math.sin(timeNow * 8 + p.phase);
    const color =
      p.type === "double" ? "#22d3ee" :
      p.type === "cone" ? "#f59e0b" :
      p.type === "rapid" ? "#22c55e" :
      p.type === "volley" ? "#a78bfa" :
      p.type === "wide" ? "#fb923c" :
      p.type === "sniper" ? "#facc15" :
      p.type === "repair" ? "#4ade80" :
      p.type === "back" ? "#f43f5e" :
      "#f43f5e";

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
    ctx.fillRect(p.x, p.y, p.w, p.h);

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.3;
    ctx.strokeRect(p.x + 0.5, p.y + 0.5, p.w - 1, p.h - 1);

    ctx.globalAlpha = 0.72 + pulse * 0.2;
    ctx.fillStyle = color;
    ctx.fillRect(p.x + 5, p.y + 5, p.w - 10, p.h - 10);

    if (enableParticles) {
      ctx.globalAlpha = 0.52;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.66 + Math.sin(timeNow * 6 + p.phase) * 2, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        const ang = timeNow * 3 + p.phase + i * (Math.PI * 2 / 3);
        const rx = p.x + p.w / 2 + Math.cos(ang) * (p.w * 0.66);
        const ry = p.y + p.h / 2 + Math.sin(ang) * (p.h * 0.66);
        ctx.globalAlpha = 0.36 + 0.2 * pulse;
        ctx.fillRect(rx - 1, ry - 1, 2, 2);
      }
    }

    if (p.type === "repair") {
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = "#dcfce7";
      ctx.fillRect(p.x + p.w / 2 - 2, p.y + 5, 4, p.h - 10);
      ctx.fillRect(p.x + 5, p.y + p.h / 2 - 2, p.w - 10, 4);
    }
    ctx.restore();
  }
}

function getCombatClarityState() {
  const projectilePressure = bullets.length + enemyProjectiles.length * 1.35;
  const denseBullets = projectilePressure > GAME_TUNING.globalFxLiteThreshold * 0.78;
  const denseEnemyFire = enemyProjectiles.length > GAME_TUNING.enemyProjectileLiteThreshold * 0.72;
  return {
    active: denseBullets || denseEnemyFire || specialActiveFrames > 0,
    pressure: projectilePressure,
  };
}

function drawShipPreview(previewCanvas, palette, profile, skinId) {
  const pctx = previewCanvas.getContext("2d");
  pctx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);

  const gradient = pctx.createRadialGradient(70, 42, 6, 70, 42, 68);
  gradient.addColorStop(0, "#223460");
  gradient.addColorStop(1, "#0a1228");
  pctx.fillStyle = gradient;
  pctx.fillRect(0, 0, previewCanvas.width, previewCanvas.height);

  drawCodeShip(
    pctx,
    70,
    45,
    62,
    62,
    palette,
    { lean: 0, boost: 0.5, recoil: 0, profile, skinId },
    0.7
  );
}

function drawDamageOverlay(renderCtx, width, height, damageRatio, timeNow, colorA, colorB, isBoss = false) {
  if (damageRatio <= 0.08) return;

  const severity = Math.min(1, Math.max(0, damageRatio));
  const scarCount = 2 + Math.floor(severity * (isBoss ? 9 : 5));

  renderCtx.save();
  renderCtx.globalAlpha = 0.16 + severity * 0.34;
  renderCtx.strokeStyle = "rgba(15, 23, 42, 0.9)";
  renderCtx.lineWidth = 1.2;

  for (let i = 0; i < scarCount; i++) {
    const t = i * 1.73 + 0.37;
    const x = Math.sin(t) * width * 0.24;
    const y = Math.cos(t * 1.37) * height * 0.2;
    const len = width * (0.04 + 0.06 * ((i % 3) / 2));
    const tilt = Math.sin(t * 2.7) * 0.55;
    renderCtx.beginPath();
    renderCtx.moveTo(x - len, y - len * tilt);
    renderCtx.lineTo(x + len, y + len * tilt);
    renderCtx.stroke();
  }

  renderCtx.restore();

  // Emissive micro-sparks become visible as hull integrity drops.
  const sparkThreshold = isBoss ? 0.2 : 0.35;
  if (severity < sparkThreshold) return;
  const pulse = 0.5 + 0.5 * Math.sin(timeNow * (isBoss ? 24 : 18));
  const sparkAlpha = (severity - sparkThreshold) / (1 - sparkThreshold);
  const sparkCount = (isBoss ? 4 : 2) + Math.floor(severity * (isBoss ? 8 : 3));

  renderCtx.save();
  renderCtx.globalAlpha = (0.2 + pulse * 0.55) * sparkAlpha;
  renderCtx.shadowColor = colorA;
  renderCtx.shadowBlur = isBoss ? 14 : 9;

  for (let i = 0; i < sparkCount; i++) {
    const t = i * 2.11 + 0.29;
    const x = Math.sin(t * 1.3 + timeNow * 0.7) * width * 0.22;
    const y = Math.cos(t * 1.7 + timeNow * 0.5) * height * 0.2;
    const w = isBoss ? 2.8 : 2;
    const h = isBoss ? 1.8 : 1.4;
    renderCtx.fillStyle = i % 2 === 0 ? colorA : colorB;
    renderCtx.fillRect(x, y, w, h);
  }

  renderCtx.restore();
}

function spawnEnemyMicroExplosion(enemy) {
  const cx = enemy.x + enemy.w / 2;
  const cy = enemy.y + enemy.h / 2;
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2 + Math.random() * 0.35;
    const speed = 1 + Math.random() * 2.6;
    impactFx.push({
      x: cx,
      y: cy,
      vx: Math.cos(ang) * speed,
      vy: Math.sin(ang) * speed,
      life: 20 + Math.random() * 18,
      size: 1.8 + Math.random() * 2.8,
      colorA: enemy.race.glow,
      colorB: enemy.race.engine,
    });
  }
}

function spawnMuzzleFlashEffect(type, palette) {
  if (!player) return;
  muzzleFx.push({
    x: player.x + player.w / 2,
    y: player.y + 6,
    type,
    life: type === "sniper" ? 18 : type === "overcharge" ? 14 : 10,
    colorA: palette.engineA,
    colorB: palette.engineB,
  });
}

function updateVisualFxState() {
  if (playerShieldPulse > 0) playerShieldPulse = Math.max(0, playerShieldPulse - 0.06);
  const clarity = getCombatClarityState();

  if (!clarity.active && Math.random() < 0.009) {
    if (!enableParticles) {
      comets.length = 0;
    } else {
    comets.push({
      x: -80,
      y: 40 + Math.random() * (HEIGHT * 0.36),
      vx: 4.4 + Math.random() * 2.6,
      vy: 0.45 + Math.random() * 0.5,
      life: 160,
      size: 1.6 + Math.random() * 1.8,
    });
    }
  }

  if (!clarity.active && Math.random() < 0.012) {
    if (!enableParticles) {
      dustClouds.length = 0;
    } else {
    dustClouds.push({
      x: Math.random() * WIDTH,
      y: -30,
      r: 18 + Math.random() * 30,
      vy: 0.24 + Math.random() * 0.36,
      life: 520 + Math.random() * 220,
      hue: Math.random() < 0.5 ? "56,189,248" : "251,146,60",
    });
    }
  }

  for (let i = comets.length - 1; i >= 0; i--) {
    const c = comets[i];
    c.x += c.vx;
    c.y += c.vy;
    c.life -= 1;
    if (c.x > WIDTH + 120 || c.y > HEIGHT + 80 || c.life <= 0) comets.splice(i, 1);
  }

  for (let i = dustClouds.length - 1; i >= 0; i--) {
    const d = dustClouds[i];
    d.y += d.vy;
    d.life -= 1;
    if (d.y - d.r > HEIGHT + 60 || d.life <= 0) dustClouds.splice(i, 1);
  }

  for (let i = impactFx.length - 1; i >= 0; i--) {
    const p = impactFx[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.02;
    p.vx *= 0.98;
    p.life -= 1;
    p.size *= 0.97;
    if (p.life <= 0 || p.size < 0.2) impactFx.splice(i, 1);
  }

  for (let i = muzzleFx.length - 1; i >= 0; i--) {
    muzzleFx[i].life -= 1;
    if (muzzleFx[i].life <= 0) muzzleFx.splice(i, 1);
  }

  for (let i = dashBursts.length - 1; i >= 0; i--) {
    dashBursts[i].life -= 1;
    if (dashBursts[i].life <= 0) dashBursts.splice(i, 1);
  }

  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const f = floatingTexts[i];
    f.life -= 1;
    f.y += f.vy;
    if (f.life <= 0) floatingTexts.splice(i, 1);
  }
}

function updateGameOverFxState() {
  if (phase !== "gameover") return;
  gameOverFxProgress = 0;
  gameOverParticles.length = 0;
}

function drawGameOverParticles() {
  return;
}

function getCameraOffset() {
  if (!enableScreenShake) {
    cameraShakeFrames = 0;
    cameraShakePower = 0;
    return { x: 0, y: 0 };
  }

  if (cameraShakeFrames <= 0 || cameraShakePower <= 0) {
    return { x: 0, y: 0 };
  }

  const fade = cameraShakeFrames / 24;
  const amount = cameraShakePower * Math.max(0.2, fade);
  const ox = (Math.random() * 2 - 1) * amount;
  const oy = (Math.random() * 2 - 1) * amount;
  cameraShakeFrames -= 1;
  cameraShakePower *= 0.88;
  if (cameraShakeFrames <= 0 || cameraShakePower < 0.2) {
    cameraShakeFrames = 0;
    cameraShakePower = 0;
  }
  return { x: ox, y: oy };
}

function drawStarLayer(layer, timeNow) {
  for (const s of layer.stars) {
    const y = (s.y + timeNow * layer.speed) % HEIGHT;
    const twinkle = 0.35 + (Math.sin(timeNow * 2 + s.twinkle) + 1) * 0.22;
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = s.size > 1.5 ? layer.colorB : layer.colorA;
    ctx.fillRect(s.x, y, s.size, s.size);
    if (layer.speed > 12 && twinkle > 0.55) {
      ctx.globalAlpha = twinkle * 0.35;
      ctx.fillRect(s.x - 2.2, y, s.size * 2.6, 0.45);
    }
  }
}

function drawMuzzleFlashes(timeNow) {
  for (const m of muzzleFx) {
    const t = m.life / (m.type === "sniper" ? 18 : m.type === "overcharge" ? 14 : m.type === "back" ? 8 : 10);
    const alpha = Math.max(0, t);
    const pulse = 0.5 + 0.5 * Math.sin(timeNow * 24);
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.globalAlpha = alpha * (0.7 + pulse * 0.4);
    ctx.shadowColor = m.colorA;
    ctx.shadowBlur = m.type === "overcharge" ? 20 : m.type === "sniper" ? 28 : 13;
    ctx.fillStyle = m.colorA;

    const baseW = m.type === "overcharge" ? 26 : m.type === "volley" ? 22 : m.type === "wide" ? 24 : m.type === "sniper" ? 18 : 16;
    const baseH = m.type === "cone" ? 20 : m.type === "sniper" ? 26 : 15;

    if (m.type === "double") {
      ctx.fillRect(-baseW * 0.8, -4, 6, baseH);
      ctx.fillRect(baseW * 0.8 - 6, -4, 6, baseH);
    } else if (m.type === "cone") {
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(-baseW * 0.55, baseH * 0.9);
      ctx.lineTo(baseW * 0.55, baseH * 0.9);
      ctx.closePath();
      ctx.fill();
    } else if (m.type === "volley") {
      for (const x of [-12, -4, 4, 12]) {
        ctx.fillRect(x - 2, -4, 4, baseH * 0.8);
      }
    } else if (m.type === "overcharge") {
      ctx.beginPath();
      ctx.ellipse(0, 4, baseW * 0.55, baseH * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (m.type === "wide") {
      for (const x of [-20, -10, 0, 10, 20]) {
        ctx.fillRect(x - 1.5, -4, 3, baseH);
      }
    } else if (m.type === "sniper") {
      ctx.beginPath();
      ctx.ellipse(0, -4, baseW * 0.28, baseH * 0.88, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (m.type === "back") {
      // rear cannon — flash points downward from the back of the ship
      ctx.fillRect(-3, 2, 6, baseH);
    } else {
      ctx.fillRect(-3, -4, 6, baseH);
    }

    ctx.restore();
  }
}

function drawDashBursts(timeNow) {
  for (const b of dashBursts) {
    const maxLife = b.phase === "start" ? 16 : 18;
    const t = clamp(b.life / maxLife, 0, 1);
    const radius = b.phase === "start" ? (1 - t) * 28 + 10 : (1 - t) * 36 + 12;
    ctx.save();
    ctx.globalAlpha = t * 0.6;
    ctx.strokeStyle = b.phase === "start" ? "#93c5fd" : "#c4b5fd";
    ctx.shadowColor = b.phase === "start" ? "#38bdf8" : "#a78bfa";
    ctx.shadowBlur = 14;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, radius + Math.sin(timeNow * 18) * 1.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawFloatingTexts() {
  for (const f of floatingTexts) {
    const alpha = clamp(f.life / 72, 0, 1);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = f.kind === "critical" ? "800 20px Orbitron" : "700 14px Orbitron";
    ctx.textAlign = "center";
    ctx.fillStyle = f.kind === "critical" ? "#fca5a5" : f.kind === "reward" ? "#fde047" : "#93c5fd";
    ctx.shadowColor = "rgba(15, 23, 42, 0.8)";
    ctx.shadowBlur = 6;
    ctx.fillText(f.text, f.x, f.y);
    ctx.restore();
  }
}

function drawPickupBanner() {
  if (!pickupBanner || pickupBanner.frames <= 0) return;
  const alpha = clamp(pickupBanner.frames / 150, 0, 1);
  ctx.save();
  ctx.globalAlpha = 0.65 * alpha;
  ctx.fillStyle = "rgba(8, 15, 31, 0.85)";
  ctx.fillRect(WIDTH / 2 - 210, 72, 420, 42);
  ctx.strokeStyle = "rgba(125, 211, 252, 0.6)";
  ctx.strokeRect(WIDTH / 2 - 210, 72, 420, 42);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#a5f3fc";
  ctx.font = "700 16px Orbitron";
  ctx.textAlign = "center";
  ctx.fillText(pickupBanner.text, WIDTH / 2, 99);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawObjectiveRewardBanner() {
  if (objectiveFlashFrames <= 0) return;
  const alpha = clamp(objectiveFlashFrames / 140, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha * 0.82;
  ctx.fillStyle = "rgba(20, 83, 45, 0.84)";
  ctx.fillRect(WIDTH / 2 - 240, HEIGHT * 0.18, 480, 56);
  ctx.strokeStyle = "rgba(74, 222, 128, 0.7)";
  ctx.strokeRect(WIDTH / 2 - 240, HEIGHT * 0.18, 480, 56);
  ctx.globalAlpha = alpha;
  ctx.font = "800 20px Orbitron";
  ctx.fillStyle = "#bbf7d0";
  ctx.textAlign = "center";
  ctx.fillText("OBJETIVO COMPLETADO", WIDTH / 2, HEIGHT * 0.18 + 34);
  ctx.textAlign = "left";
  ctx.restore();
}

function drawMicroExplosions() {
  if (bullets.length + enemyProjectiles.length > GAME_TUNING.globalFxLiteThreshold) return;

  for (const p of impactFx) {
    const alpha = Math.max(0, p.life / 36);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowColor = p.colorA;
    ctx.shadowBlur = 8;
    const g = ctx.createLinearGradient(p.x, p.y, p.x + p.size, p.y + p.size);
    g.addColorStop(0, p.colorA);
    g.addColorStop(1, p.colorB);
    ctx.fillStyle = g;
    ctx.fillRect(p.x, p.y, p.size, p.size * 0.8);
    ctx.restore();
  }
}

function drawPlayerShieldPulse() {
  if (!player || (playerShieldPulse <= 0 && dashInvulnFrames <= 0)) return;
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const dashPulse = dashInvulnFrames > 0 ? clamp(dashInvulnFrames / Math.max(1, DASH_TUNING.invulnFrames), 0, 1) : 0;
  const pulseAmount = clamp(Math.max(playerShieldPulse, dashPulse), 0, 1);
  const r = Math.max(2, player.w * (0.46 + (1 - pulseAmount) * 0.42));
  ctx.save();
  ctx.globalAlpha = pulseAmount * 0.58;
  ctx.strokeStyle = dashInvulnFrames > 0 ? "#f0abfc" : "#7dd3fc";
  ctx.lineWidth = 2.2;
  ctx.shadowColor = dashInvulnFrames > 0 ? "#e879f9" : "#38bdf8";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawFakeBloomPass() {
  const clarity = getCombatClarityState();
  if (clarity.active || bullets.length + enemyProjectiles.length > GAME_TUNING.globalFxLiteThreshold) return;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.18;

  if (bullets.length <= GAME_TUNING.bloomBulletThreshold) {
    for (const bullet of bullets) {
      const cx = bullet.x + bullet.w / 2;
      const cy = bullet.y + bullet.h / 2;
      ctx.shadowColor = bullet.glow;
      ctx.shadowBlur = 18;
      ctx.fillStyle = bullet.glow;
      ctx.beginPath();
      ctx.ellipse(cx, cy, bullet.w * 0.8, bullet.h * 0.65, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (const p of enemyProjectiles) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    ctx.shadowColor = p.glow;
    ctx.shadowBlur = p.style === "boss-lance" ? 24 : 14;
    ctx.fillStyle = p.glow;
    ctx.beginPath();
    ctx.ellipse(cx, cy, p.w * 0.85, p.h * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Section: code-only ship design (Star Wars style)
function drawCodeShip(renderCtx, centerX, centerY, width, height, palette, shipState, timeNow) {
  const lean = shipState.lean || 0;
  const boost = shipState.boost || 0;
  const recoil = shipState.recoil || 0;
  const profile = shipState.profile || "interceptor";
  const flamePulse = 0.6 + 0.4 * Math.sin(timeNow * 24 + boost * 4);

  renderCtx.save();
  renderCtx.translate(centerX, centerY + boost * -2 + recoil * 2);
  renderCtx.rotate(lean * 0.34);
  renderCtx.scale(1 + boost * 0.05, 1 - boost * 0.04);

  const hullGradient = renderCtx.createLinearGradient(0, -height * 0.4, 0, height * 0.45);
  hullGradient.addColorStop(0, palette.hull);
  hullGradient.addColorStop(1, palette.panel);

  renderCtx.fillStyle = hullGradient;
  renderCtx.beginPath();
  renderCtx.moveTo(0, -height * 0.46);
  renderCtx.lineTo(width * 0.17, -height * 0.1);
  renderCtx.lineTo(width * 0.28, height * 0.3);
  renderCtx.lineTo(0, height * 0.45);
  renderCtx.lineTo(-width * 0.28, height * 0.3);
  renderCtx.lineTo(-width * 0.17, -height * 0.1);
  renderCtx.closePath();
  renderCtx.fill();

  // Secondary armor plate to add depth and silhouette detail.
  const plateGradient = renderCtx.createLinearGradient(0, -height * 0.34, 0, height * 0.28);
  plateGradient.addColorStop(0, palette.panel);
  plateGradient.addColorStop(1, palette.hull);
  renderCtx.globalAlpha = 0.86;
  renderCtx.fillStyle = plateGradient;
  renderCtx.beginPath();
  renderCtx.moveTo(0, -height * 0.3);
  renderCtx.lineTo(width * 0.11, -height * 0.02);
  renderCtx.lineTo(width * 0.13, height * 0.22);
  renderCtx.lineTo(0, height * 0.31);
  renderCtx.lineTo(-width * 0.13, height * 0.22);
  renderCtx.lineTo(-width * 0.11, -height * 0.02);
  renderCtx.closePath();
  renderCtx.fill();
  renderCtx.globalAlpha = 1;

  drawWingProfile(renderCtx, width, height, palette, profile);

  // Cockpit glass and frame.
  const canopyGradient = renderCtx.createLinearGradient(0, -height * 0.34, 0, -height * 0.02);
  canopyGradient.addColorStop(0, "rgba(224, 242, 254, 0.92)");
  canopyGradient.addColorStop(0.65, "rgba(56, 189, 248, 0.55)");
  canopyGradient.addColorStop(1, "rgba(15, 23, 42, 0.25)");
  renderCtx.fillStyle = canopyGradient;
  renderCtx.beginPath();
  renderCtx.moveTo(0, -height * 0.33);
  renderCtx.lineTo(width * 0.08, -height * 0.12);
  renderCtx.lineTo(0, -height * 0.01);
  renderCtx.lineTo(-width * 0.08, -height * 0.12);
  renderCtx.closePath();
  renderCtx.fill();

  renderCtx.strokeStyle = "rgba(226, 232, 240, 0.5)";
  renderCtx.lineWidth = 1;
  renderCtx.beginPath();
  renderCtx.moveTo(0, -height * 0.31);
  renderCtx.lineTo(0, -height * 0.02);
  renderCtx.stroke();

  renderCtx.fillStyle = palette.accent;
  renderCtx.fillRect(-width * 0.06, -height * 0.28, width * 0.12, height * 0.42);

  // Technical panel lines.
  renderCtx.strokeStyle = "rgba(148, 163, 184, 0.35)";
  renderCtx.lineWidth = 0.9;
  renderCtx.beginPath();
  renderCtx.moveTo(-width * 0.2, height * 0.12);
  renderCtx.lineTo(-width * 0.07, height * 0.2);
  renderCtx.moveTo(width * 0.2, height * 0.12);
  renderCtx.lineTo(width * 0.07, height * 0.2);
  renderCtx.moveTo(-width * 0.14, -height * 0.17);
  renderCtx.lineTo(-width * 0.03, -height * 0.09);
  renderCtx.moveTo(width * 0.14, -height * 0.17);
  renderCtx.lineTo(width * 0.03, -height * 0.09);
  renderCtx.stroke();

  renderCtx.strokeStyle = "rgba(148, 163, 184, 0.65)";
  renderCtx.lineWidth = 1.2;
  renderCtx.beginPath();
  renderCtx.moveTo(-width * 0.12, -height * 0.12);
  renderCtx.lineTo(-width * 0.03, -height * 0.03);
  renderCtx.lineTo(-width * 0.12, height * 0.08);
  renderCtx.moveTo(width * 0.12, -height * 0.12);
  renderCtx.lineTo(width * 0.03, -height * 0.03);
  renderCtx.lineTo(width * 0.12, height * 0.08);
  renderCtx.stroke();

  renderCtx.shadowColor = palette.glow;
  renderCtx.shadowBlur = 11;
  renderCtx.fillStyle = palette.glow;
  renderCtx.beginPath();
  renderCtx.arc(0, -height * 0.1, width * 0.08, 0, Math.PI * 2);
  renderCtx.fill();
  renderCtx.shadowBlur = 0;

  const flameLength = height * (0.18 + flamePulse * 0.24 + boost * 0.14);
  const flameWidth = width * (0.12 + flamePulse * 0.04);

  const flameGradient = renderCtx.createLinearGradient(0, height * 0.26, 0, height * 0.26 + flameLength);
  flameGradient.addColorStop(0, palette.engineA);
  flameGradient.addColorStop(1, palette.engineB);

  renderCtx.shadowColor = palette.engineA;
  renderCtx.shadowBlur = 20;
  renderCtx.fillStyle = flameGradient;

  // Heat haze strip behind engines (fake thermal distortion).
  renderCtx.globalAlpha = 0.22 + flamePulse * 0.2;
  renderCtx.fillStyle = "rgba(224, 242, 254, 0.45)";
  renderCtx.beginPath();
  renderCtx.moveTo(-width * 0.22, height * 0.28);
  renderCtx.quadraticCurveTo(0, height * (0.36 + flamePulse * 0.08), width * 0.22, height * 0.28);
  renderCtx.lineTo(width * 0.16, height * 0.5);
  renderCtx.quadraticCurveTo(0, height * (0.43 + flamePulse * 0.07), -width * 0.16, height * 0.5);
  renderCtx.closePath();
  renderCtx.fill();
  renderCtx.globalAlpha = 1;

  renderCtx.beginPath();
  renderCtx.moveTo(-flameWidth * 0.5, height * 0.26);
  renderCtx.lineTo(flameWidth * 0.5, height * 0.26);
  renderCtx.lineTo(0, height * 0.26 + flameLength);
  renderCtx.closePath();
  renderCtx.fill();

  renderCtx.beginPath();
  renderCtx.moveTo(-width * 0.18, height * 0.25);
  renderCtx.lineTo(-width * 0.1, height * 0.25);
  renderCtx.lineTo(-width * 0.14, height * (0.43 + 0.16 * flamePulse));
  renderCtx.closePath();
  renderCtx.fill();

  renderCtx.beginPath();
  renderCtx.moveTo(width * 0.18, height * 0.25);
  renderCtx.lineTo(width * 0.1, height * 0.25);
  renderCtx.lineTo(width * 0.14, height * (0.43 + 0.16 * flamePulse));
  renderCtx.closePath();
  renderCtx.fill();

  // Engine nozzles for a more mechanical rear section.
  renderCtx.shadowBlur = 0;
  renderCtx.fillStyle = "rgba(2, 6, 23, 0.9)";
  renderCtx.fillRect(-width * 0.2, height * 0.22, width * 0.09, height * 0.08);
  renderCtx.fillRect(width * 0.11, height * 0.22, width * 0.09, height * 0.08);
  renderCtx.fillRect(-width * 0.04, height * 0.24, width * 0.08, height * 0.08);

  renderCtx.fillStyle = palette.engineA;
  renderCtx.globalAlpha = 0.6 + flamePulse * 0.25;
  renderCtx.fillRect(-width * 0.18, height * 0.245, width * 0.05, height * 0.03);
  renderCtx.fillRect(width * 0.13, height * 0.245, width * 0.05, height * 0.03);
  renderCtx.fillRect(-width * 0.018, height * 0.26, width * 0.036, height * 0.03);
  renderCtx.globalAlpha = 1;

  drawShipLivery(renderCtx, width, height, shipState.skinId, palette);

  const playerDamageRatio = shipState.energy != null ? 1 - Math.max(0, Math.min(1, shipState.energy / maxEnergy)) : 0;
  drawDamageOverlay(renderCtx, width, height, playerDamageRatio, timeNow, palette.engineA, palette.engineB, false);

  renderCtx.restore();
}

function drawShipLivery(renderCtx, width, height, skinId, palette) {
  const livery = SKIN_LIVERIES[skinId] || SKIN_LIVERIES["falcon-blue"];

  renderCtx.save();
  renderCtx.strokeStyle = livery.color;
  renderCtx.fillStyle = livery.color;
  renderCtx.lineWidth = 1.1;

  if (livery.pattern === "chevron") {
    renderCtx.beginPath();
    renderCtx.moveTo(0, -height * 0.16);
    renderCtx.lineTo(width * 0.08, -height * 0.01);
    renderCtx.lineTo(0, height * 0.08);
    renderCtx.lineTo(-width * 0.08, -height * 0.01);
    renderCtx.closePath();
    renderCtx.stroke();
  } else if (livery.pattern === "slash") {
    renderCtx.beginPath();
    renderCtx.moveTo(-width * 0.12, -height * 0.08);
    renderCtx.lineTo(width * 0.12, height * 0.14);
    renderCtx.moveTo(-width * 0.15, 0);
    renderCtx.lineTo(width * 0.09, height * 0.2);
    renderCtx.stroke();
  } else if (livery.pattern === "band") {
    renderCtx.globalAlpha = 0.7;
    renderCtx.fillRect(-width * 0.18, -height * 0.02, width * 0.36, height * 0.06);
    renderCtx.globalAlpha = 1;
  } else if (livery.pattern === "split") {
    renderCtx.fillRect(-width * 0.04, -height * 0.24, width * 0.02, height * 0.34);
    renderCtx.fillRect(width * 0.02, -height * 0.24, width * 0.02, height * 0.34);
  } else if (livery.pattern === "spine") {
    renderCtx.fillRect(-width * 0.015, -height * 0.28, width * 0.03, height * 0.46);
    renderCtx.strokeRect(-width * 0.08, -height * 0.03, width * 0.16, height * 0.08);
  } else {
    renderCtx.globalAlpha = 0.55;
    renderCtx.fillRect(-width * 0.15, -height * 0.06, width * 0.3, height * 0.03);
    renderCtx.fillRect(-width * 0.15, height * 0.02, width * 0.3, height * 0.03);
    renderCtx.globalAlpha = 1;
  }

  drawLiveryInsignia(renderCtx, livery.insignia, width, height, livery.color);

  renderCtx.font = "700 7px Orbitron";
  renderCtx.textAlign = "center";
  renderCtx.fillStyle = palette.glow;
  renderCtx.fillText(livery.tailNumber, 0, height * 0.2);
  renderCtx.textAlign = "left";
  renderCtx.restore();
}

function drawLiveryInsignia(renderCtx, insignia, width, height, color) {
  renderCtx.save();
  renderCtx.strokeStyle = color;
  renderCtx.fillStyle = color;
  renderCtx.lineWidth = 1;
  const y = -height * 0.19;

  if (insignia === "wing") {
    renderCtx.beginPath();
    renderCtx.moveTo(-width * 0.1, y + 3);
    renderCtx.lineTo(0, y - 4);
    renderCtx.lineTo(width * 0.1, y + 3);
    renderCtx.stroke();
  } else if (insignia === "claw") {
    for (const x of [-width * 0.06, 0, width * 0.06]) {
      renderCtx.beginPath();
      renderCtx.moveTo(x, y + 4);
      renderCtx.lineTo(x + width * 0.02, y - 3);
      renderCtx.stroke();
    }
  } else if (insignia === "sun") {
    renderCtx.beginPath();
    renderCtx.arc(0, y, width * 0.025, 0, Math.PI * 2);
    renderCtx.fill();
  } else if (insignia === "nova") {
    renderCtx.beginPath();
    renderCtx.moveTo(0, y - 4);
    renderCtx.lineTo(3, y);
    renderCtx.lineTo(0, y + 4);
    renderCtx.lineTo(-3, y);
    renderCtx.closePath();
    renderCtx.fill();
  } else if (insignia === "leaf") {
    renderCtx.beginPath();
    renderCtx.ellipse(0, y, width * 0.028, height * 0.03, Math.PI * 0.2, 0, Math.PI * 2);
    renderCtx.stroke();
  } else {
    renderCtx.beginPath();
    renderCtx.arc(0, y, width * 0.03, 0, Math.PI * 2);
    renderCtx.stroke();
    renderCtx.beginPath();
    renderCtx.arc(0, y, width * 0.015, 0, Math.PI * 2);
    renderCtx.fill();
  }

  renderCtx.restore();
}

function drawWingProfile(renderCtx, width, height, palette, profile) {
  renderCtx.fillStyle = palette.wing;

  if (profile === "raider") {
    renderCtx.beginPath();
    renderCtx.moveTo(-width * 0.55, height * 0.1);
    renderCtx.lineTo(-width * 0.22, -height * 0.05);
    renderCtx.lineTo(-width * 0.2, height * 0.36);
    renderCtx.lineTo(-width * 0.48, height * 0.42);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.55, height * 0.1);
    renderCtx.lineTo(width * 0.22, -height * 0.05);
    renderCtx.lineTo(width * 0.2, height * 0.36);
    renderCtx.lineTo(width * 0.48, height * 0.42);
    renderCtx.closePath();
    renderCtx.fill();
    return;
  }

  if (profile === "bomber") {
    renderCtx.beginPath();
    renderCtx.moveTo(-width * 0.52, height * 0.2);
    renderCtx.lineTo(-width * 0.24, height * 0.06);
    renderCtx.lineTo(-width * 0.35, height * 0.42);
    renderCtx.lineTo(-width * 0.56, height * 0.44);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.beginPath();
    renderCtx.moveTo(width * 0.52, height * 0.2);
    renderCtx.lineTo(width * 0.24, height * 0.06);
    renderCtx.lineTo(width * 0.35, height * 0.42);
    renderCtx.lineTo(width * 0.56, height * 0.44);
    renderCtx.closePath();
    renderCtx.fill();

    renderCtx.fillStyle = palette.panel;
    renderCtx.fillRect(-width * 0.42, height * 0.28, width * 0.1, height * 0.08);
    renderCtx.fillRect(width * 0.32, height * 0.28, width * 0.1, height * 0.08);
    return;
  }

  renderCtx.beginPath();
  renderCtx.moveTo(-width * 0.5, height * 0.18);
  renderCtx.lineTo(-width * 0.2, 0);
  renderCtx.lineTo(-width * 0.26, height * 0.34);
  renderCtx.lineTo(-width * 0.5, height * 0.38);
  renderCtx.closePath();
  renderCtx.fill();

  renderCtx.beginPath();
  renderCtx.moveTo(width * 0.5, height * 0.18);
  renderCtx.lineTo(width * 0.2, 0);
  renderCtx.lineTo(width * 0.26, height * 0.34);
  renderCtx.lineTo(width * 0.5, height * 0.38);
  renderCtx.closePath();
  renderCtx.fill();
}

function drawEnemyProjectiles() {
  const clarity = getCombatClarityState();
  const liteMode = enemyProjectiles.length >= GAME_TUNING.enemyProjectileLiteThreshold || clarity.active;

  for (const p of enemyProjectiles) {
    ctx.save();
    if (p.prevX1 != null) {
      ctx.globalAlpha = clarity.active ? 0.1 : 0.2;
      ctx.fillStyle = p.glow;
      ctx.fillRect(p.prevX1, p.prevY1, p.w, p.h);
      if (!liteMode && p.prevX2 != null) {
        ctx.globalAlpha = 0.14;
        ctx.fillRect(p.prevX2, p.prevY2, p.w, p.h);
      }
      ctx.globalAlpha = 1;
    }

    if (liteMode) {
      ctx.fillStyle = p.color;
      if (p.style === "orb" || p.style === "boss-orb") {
        ctx.beginPath();
        ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w * 0.45, 0, Math.PI * 2);
        ctx.fill();
        if (clarity.active) {
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = "rgba(248, 250, 252, 0.85)";
          ctx.stroke();
        }
      } else {
        ctx.fillRect(p.x, p.y, p.w, p.h);
        if (clarity.active) {
          ctx.strokeStyle = "rgba(248, 250, 252, 0.82)";
          ctx.lineWidth = 1;
          ctx.strokeRect(p.x, p.y, p.w, p.h);
        }
      }
      ctx.restore();
      continue;
    }

    ctx.shadowColor = p.glow;
    ctx.shadowBlur = 14;
    if (p.style === "orb" || p.style === "boss-orb") {
      // Orbiting tail aura gives the orb a stronger energy identity.
      const aura = ctx.createRadialGradient(
        p.x + p.w / 2,
        p.y + p.h / 2,
        p.w * 0.2,
        p.x + p.w / 2,
        p.y + p.h / 2,
        p.w * 1.15
      );
      aura.addColorStop(0, "rgba(255,255,255,0.14)");
      aura.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w * 1.05, 0, Math.PI * 2);
      ctx.fill();

      const orbGradient = ctx.createRadialGradient(
        p.x + p.w / 2,
        p.y + p.h / 2,
        p.w * 0.12,
        p.x + p.w / 2,
        p.y + p.h / 2,
        p.w * 0.65
      );
      orbGradient.addColorStop(0, "#fff7ed");
      orbGradient.addColorStop(0.35, p.color);
      orbGradient.addColorStop(1, p.glow);
      ctx.fillStyle = orbGradient;
      ctx.beginPath();
      ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(p.x + p.w * 0.42, p.y + p.h * 0.34, p.w * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else {
      // Energy tail behind directional shots.
      const tailH = p.h * (p.style === "boss-lance" ? 0.9 : 0.55);
      const tailGradient = ctx.createLinearGradient(p.x, p.y - tailH, p.x, p.y + 2);
      tailGradient.addColorStop(0, "rgba(255,255,255,0)");
      tailGradient.addColorStop(1, p.glow);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = tailGradient;
      ctx.fillRect(p.x + p.w * 0.18, p.y - tailH, p.w * 0.64, tailH + 2);
      ctx.globalAlpha = 1;

      const beamGradient = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      beamGradient.addColorStop(0, "#f8fafc");
      beamGradient.addColorStop(0.42, p.color);
      beamGradient.addColorStop(1, p.glow);
      ctx.fillStyle = beamGradient;
      ctx.fillRect(p.x, p.y, p.w, p.h);

      ctx.globalAlpha = 0.65;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(p.x + p.w * 0.32, p.y + 1, p.w * 0.36, p.h - 2);

      if (p.style === "boss-lance") {
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = "#cffafe";
        ctx.fillRect(p.x + p.w * 0.1, p.y - p.h * 0.4, p.w * 0.8, p.h * 0.4);

        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.moveTo(p.x + p.w / 2, p.y - p.h * 0.42);
        ctx.lineTo(p.x + p.w * 0.18, p.y - p.h * 0.08);
        ctx.lineTo(p.x + p.w * 0.82, p.y - p.h * 0.08);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}

function drawPlayerBullet(bullet, timeNow, liteMode = false) {
  const clarity = getCombatClarityState();
  const useLite = liteMode || clarity.active;
  const centerX = bullet.x + bullet.w / 2;
  const centerY = bullet.y + bullet.h / 2;
  const radius = bullet.w * 0.5;
  const pulse = 0.55 + 0.45 * Math.sin(timeNow * 20 + bullet.y * 0.06);

  ctx.save();
  if (bullet.prevX1 != null) {
    ctx.globalAlpha = useLite ? 0.14 : 0.22;
    ctx.fillStyle = bullet.tail;
    ctx.beginPath();
    ctx.arc(bullet.prevX1 + bullet.w / 2, bullet.prevY1 + bullet.h / 2, radius * 0.86, 0, Math.PI * 2);
    ctx.fill();
    if (!useLite && bullet.prevX2 != null) {
      ctx.globalAlpha = 0.12;
      ctx.beginPath();
      ctx.arc(bullet.prevX2 + bullet.w / 2, bullet.prevY2 + bullet.h / 2, radius * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  if (useLite) {
    ctx.fillStyle = bullet.core;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(centerX - radius * 0.2, centerY - radius * 0.2, radius * 0.34, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
    return;
  }

  ctx.shadowColor = bullet.glow;
  ctx.shadowBlur = 9;

  const aura = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius * 1.5);
  aura.addColorStop(0, "rgba(255,255,255,0.16)");
  aura.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.22, 0, Math.PI * 2);
  ctx.fill();

  const trailGradient = ctx.createLinearGradient(centerX, centerY + radius * 1.6, centerX, centerY - radius * 0.7);
  trailGradient.addColorStop(0, "rgba(255,255,255,0)");
  trailGradient.addColorStop(1, bullet.tail);
  ctx.globalAlpha = 0.3 + pulse * 0.16;
  ctx.fillStyle = trailGradient;
  ctx.fillRect(centerX - radius * 0.25, centerY, radius * 0.5, radius * 1.8);
  ctx.globalAlpha = 1;

  const orbGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius);
  orbGradient.addColorStop(0, "#e0f2fe");
  orbGradient.addColorStop(0.55, bullet.core);
  orbGradient.addColorStop(1, bullet.tail);
  ctx.fillStyle = orbGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.68 + pulse * 0.18;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(centerX - radius * 0.22, centerY - radius * 0.22, radius * 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawDebugHitboxes() {
  if (!GAME_TUNING.debugHitboxes) return;

  ctx.save();
  ctx.lineWidth = 1.5;

  if (player) {
    const hit = getPlayerHitbox(player);
    ctx.strokeStyle = "#22c55e";
    ctx.strokeRect(hit.x, hit.y, hit.w, hit.h);
  }

  ctx.strokeStyle = "#f97316";
  for (const enemy of enemies) {
    const hit = getEnemyHitbox(enemy);
    ctx.strokeRect(hit.x, hit.y, hit.w, hit.h);
  }

  if (boss) {
    const hit = getBossHitbox(boss);
    ctx.strokeStyle = "#ef4444";
    ctx.strokeRect(hit.x, hit.y, hit.w, hit.h);
  }

  ctx.strokeStyle = "#38bdf8";
  for (const bullet of bullets) {
    const hit = getPlayerBulletHitbox(bullet);
    ctx.strokeRect(hit.x, hit.y, hit.w, hit.h);
  }

  ctx.strokeStyle = "#eab308";
  for (const projectile of enemyProjectiles) {
    const hit = getEnemyProjectileHitbox(projectile);
    ctx.strokeRect(hit.x, hit.y, hit.w, hit.h);
  }

  ctx.fillStyle = "rgba(2, 6, 23, 0.72)";
  ctx.fillRect(8, HEIGHT - 56, 420, 48);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "12px Trebuchet MS";
  ctx.fillText(
    `DEBUG HITBOXES | Boss fire x${GAME_TUNING.bossFireRate.toFixed(2)} | Orb track x${GAME_TUNING.bossOrbTracking.toFixed(2)}`,
    14,
    HEIGHT - 36
  );
  ctx.fillText("Controles: B toggle | -/+ frecuencia jefe | [/ ] seguimiento orb", 14, HEIGHT - 20);

  ctx.restore();
}

function emitEngineParticles() {
  if (!player || !running) return;

  const palette = getSkinPalette(player.skinId);
  const baseX = player.x + player.w / 2;
  const baseY = player.y + player.h * 0.78;
  const amount = player.boost > 0.5 ? 3 : 2;

  for (let i = 0; i < amount; i++) {
    const spread = (Math.random() - 0.5) * player.w * 0.34;
    engineParticles.push({
      x: baseX + spread,
      y: baseY,
      vx: (Math.random() - 0.5) * 0.6,
      vy: 1.8 + Math.random() * 2 + player.boost * 0.55,
      life: 22 + Math.random() * 12,
      size: 2 + Math.random() * 2.3,
      colorA: palette.engineA,
      colorB: palette.engineB,
    });
  }
}

function updateEngineParticles() {
  for (let i = engineParticles.length - 1; i >= 0; i--) {
    const p = engineParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.02;
    p.life -= 1;
    p.size *= 0.97;

    if (p.life <= 0 || p.size < 0.3) {
      engineParticles.splice(i, 1);
    }
  }
}

function drawEngineParticles() {
  for (const p of engineParticles) {
    const alpha = Math.max(0, p.life / 34);
    ctx.globalAlpha = alpha;
    const g = ctx.createRadialGradient(p.x, p.y, 0.1, p.x, p.y, p.size * 2.4);
    g.addColorStop(0, p.colorA);
    g.addColorStop(1, p.colorB);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Section: enemy ship design (code-only, dark sci-fi style)
function drawEnemyShip(renderCtx, enemy, timeNow) {
  const cx = enemy.x + enemy.w / 2;
  const cy = enemy.y + enemy.h / 2;
  const w = enemy.w;
  const h = enemy.h;
  const pulse = 0.5 + 0.5 * Math.sin(timeNow * 7 + enemy.animOffset);
  const lean = 0.04 * Math.sin(timeNow * 4 + enemy.animOffset);
  const t = enemy.race;

  renderCtx.save();
  renderCtx.translate(cx, cy);
  renderCtx.rotate(lean);

  const hullGradient = renderCtx.createLinearGradient(0, -h * 0.42, 0, h * 0.45);
  hullGradient.addColorStop(0, t.panel);
  hullGradient.addColorStop(1, t.hull);
  renderCtx.fillStyle = hullGradient;
  // Inverted orientation: enemy nose points downward.
  if (enemy.race.id === "romulan") {
    renderCtx.beginPath();
    renderCtx.moveTo(0, h * 0.45);
    renderCtx.lineTo(w * 0.2, h * 0.1);
    renderCtx.lineTo(w * 0.4, -h * 0.05);
    renderCtx.lineTo(w * 0.18, -h * 0.3);
    renderCtx.lineTo(-w * 0.18, -h * 0.3);
    renderCtx.lineTo(-w * 0.4, -h * 0.05);
    renderCtx.lineTo(-w * 0.2, h * 0.1);
    renderCtx.closePath();
    renderCtx.fill();
  } else if (enemy.race.id === "klingon") {
    renderCtx.beginPath();
    renderCtx.moveTo(0, h * 0.46);
    renderCtx.lineTo(w * 0.14, h * 0.12);
    renderCtx.lineTo(w * 0.47, -h * 0.12);
    renderCtx.lineTo(w * 0.23, -h * 0.22);
    renderCtx.lineTo(w * 0.16, -h * 0.34);
    renderCtx.lineTo(-w * 0.16, -h * 0.34);
    renderCtx.lineTo(-w * 0.23, -h * 0.22);
    renderCtx.lineTo(-w * 0.47, -h * 0.12);
    renderCtx.lineTo(-w * 0.14, h * 0.12);
    renderCtx.closePath();
    renderCtx.fill();
  } else {
    renderCtx.beginPath();
    renderCtx.moveTo(0, h * 0.46);
    renderCtx.lineTo(w * 0.26, h * 0.16);
    renderCtx.lineTo(w * 0.28, -h * 0.04);
    renderCtx.lineTo(w * 0.14, -h * 0.36);
    renderCtx.lineTo(-w * 0.14, -h * 0.36);
    renderCtx.lineTo(-w * 0.28, -h * 0.04);
    renderCtx.lineTo(-w * 0.26, h * 0.16);
    renderCtx.closePath();
    renderCtx.fill();
  }

  // Internal armor core improves readability at speed.
  renderCtx.globalAlpha = 0.85;
  renderCtx.fillStyle = t.panel;
  renderCtx.beginPath();
  renderCtx.moveTo(0, h * 0.3);
  renderCtx.lineTo(w * 0.1, h * 0.06);
  renderCtx.lineTo(w * 0.06, -h * 0.2);
  renderCtx.lineTo(-w * 0.06, -h * 0.2);
  renderCtx.lineTo(-w * 0.1, h * 0.06);
  renderCtx.closePath();
  renderCtx.fill();
  renderCtx.globalAlpha = 1;

  renderCtx.fillStyle = t.trim;
  if (enemy.race.id === "romulan") {
    renderCtx.beginPath();
    renderCtx.moveTo(-w * 0.52, -h * 0.02);
    renderCtx.lineTo(-w * 0.2, h * 0.15);
    renderCtx.lineTo(-w * 0.24, -h * 0.24);
    renderCtx.closePath();
    renderCtx.fill();
    renderCtx.beginPath();
    renderCtx.moveTo(w * 0.52, -h * 0.02);
    renderCtx.lineTo(w * 0.2, h * 0.15);
    renderCtx.lineTo(w * 0.24, -h * 0.24);
    renderCtx.closePath();
    renderCtx.fill();
  } else if (enemy.race.id === "klingon") {
    renderCtx.fillRect(-w * 0.58, -h * 0.04, w * 0.22, h * 0.11);
    renderCtx.fillRect(w * 0.36, -h * 0.04, w * 0.22, h * 0.11);
    renderCtx.fillRect(-w * 0.08, -h * 0.32, w * 0.16, h * 0.1);
  } else if (enemy.variant === 0) {
    renderCtx.fillRect(-w * 0.45, h * 0.05, w * 0.26, h * 0.12);
    renderCtx.fillRect(w * 0.19, h * 0.05, w * 0.26, h * 0.12);
  } else if (enemy.variant === 1) {
    renderCtx.beginPath();
    renderCtx.moveTo(-w * 0.48, h * 0.16);
    renderCtx.lineTo(-w * 0.2, -h * 0.04);
    renderCtx.lineTo(-w * 0.26, h * 0.3);
    renderCtx.closePath();
    renderCtx.fill();
    renderCtx.beginPath();
    renderCtx.moveTo(w * 0.48, h * 0.16);
    renderCtx.lineTo(w * 0.2, -h * 0.04);
    renderCtx.lineTo(w * 0.26, h * 0.3);
    renderCtx.closePath();
    renderCtx.fill();
  } else {
    renderCtx.fillRect(-w * 0.39, h * 0.17, w * 0.14, h * 0.15);
    renderCtx.fillRect(w * 0.25, h * 0.17, w * 0.14, h * 0.15);
  }

  renderCtx.strokeStyle = "rgba(148, 163, 184, 0.5)";
  renderCtx.lineWidth = 1;
  renderCtx.beginPath();
  renderCtx.moveTo(-w * 0.14, h * 0.02);
  renderCtx.lineTo(0, h * 0.2);
  renderCtx.lineTo(w * 0.14, h * 0.02);
  renderCtx.moveTo(-w * 0.22, -h * 0.08);
  renderCtx.lineTo(-w * 0.09, -h * 0.02);
  renderCtx.moveTo(w * 0.22, -h * 0.08);
  renderCtx.lineTo(w * 0.09, -h * 0.02);
  renderCtx.stroke();

  // Bridge canopy for enemy ship identity.
  const enemyCanopy = renderCtx.createLinearGradient(0, -h * 0.16, 0, h * 0.02);
  enemyCanopy.addColorStop(0, "rgba(248, 250, 252, 0.72)");
  enemyCanopy.addColorStop(1, t.glow);
  renderCtx.fillStyle = enemyCanopy;
  renderCtx.beginPath();
  renderCtx.ellipse(0, -h * 0.08, w * 0.08, h * 0.06, 0, 0, Math.PI * 2);
  renderCtx.fill();

  renderCtx.shadowColor = t.glow;
  renderCtx.shadowBlur = 14;
  renderCtx.fillStyle = t.glow;
  renderCtx.fillRect(-w * 0.07, h * 0.03, w * 0.14, h * 0.07 + pulse * 2);

  renderCtx.fillStyle = t.engine;
  renderCtx.globalAlpha = 0.5 + pulse * 0.35;
  renderCtx.fillRect(-w * 0.14, -h * 0.34, w * 0.08, h * 0.11 + pulse * 2.5);
  renderCtx.fillRect(w * 0.06, -h * 0.34, w * 0.08, h * 0.11 + pulse * 2.5);
  renderCtx.globalAlpha = 0.35 + pulse * 0.25;
  renderCtx.fillRect(-w * 0.03, -h * 0.31, w * 0.06, h * 0.08 + pulse * 1.6);
  renderCtx.globalAlpha = 1;
  renderCtx.shadowBlur = 0;

  const enemyDamageRatio = enemy.maxHp > 0 ? 1 - Math.max(0, Math.min(1, enemy.hp / enemy.maxHp)) : 0;
  drawDamageOverlay(renderCtx, w, h, enemyDamageRatio, timeNow, t.glow, t.engine, false);

  renderCtx.save();
  renderCtx.globalAlpha = 0.92;
  renderCtx.shadowColor = enemy.isElite ? "#fde68a" : t.glow;
  renderCtx.shadowBlur = enemy.isElite ? 16 : 8;
  renderCtx.strokeStyle = enemy.isElite ? "#fde68a" : t.glow;
  renderCtx.fillStyle = enemy.isElite ? "#fde68a" : t.glow;
  if (enemy.role.id === "hunter") {
    renderCtx.beginPath();
    renderCtx.moveTo(0, -h * 0.48);
    renderCtx.lineTo(-5, -h * 0.32);
    renderCtx.lineTo(5, -h * 0.32);
    renderCtx.closePath();
    renderCtx.fill();
  } else if (enemy.role.id === "zoner") {
    renderCtx.strokeRect(-8, -h * 0.44, 16, 5);
  } else if (enemy.role.id === "fan") {
    renderCtx.fillRect(-10, -h * 0.42, 20, 3);
    renderCtx.fillRect(-6, -h * 0.36, 12, 3);
  } else if (enemy.role.id === "guardian") {
    renderCtx.beginPath();
    renderCtx.arc(0, -h * 0.36, 7, Math.PI, Math.PI * 2);
    renderCtx.stroke();
  }
  if (enemy.isElite) {
    renderCtx.beginPath();
    renderCtx.arc(0, 0, Math.min(w, h) * 0.52, 0, Math.PI * 2);
    renderCtx.stroke();
  }
  renderCtx.restore();

  renderCtx.restore();
}

function drawBossShip(renderCtx, bossShip, timeNow) {
  const cx = bossShip.x + bossShip.w / 2;
  const cy = bossShip.y + bossShip.h / 2;
  const w = bossShip.w;
  const h = bossShip.h;
  const t = bossShip.theme;
  const pulse = 0.5 + 0.5 * Math.sin(timeNow * 5 + bossShip.animOffset);

  renderCtx.save();
  renderCtx.translate(cx, cy);

  const hullGradient = renderCtx.createLinearGradient(0, -h * 0.45, 0, h * 0.45);
  hullGradient.addColorStop(0, t.panel);
  hullGradient.addColorStop(1, t.hull);
  renderCtx.fillStyle = hullGradient;
  // Boss faces downward to match descent direction.
  renderCtx.beginPath();
  renderCtx.moveTo(0, h * 0.46);
  renderCtx.lineTo(w * 0.3, h * 0.15);
  renderCtx.lineTo(w * 0.46, -h * 0.14);
  renderCtx.lineTo(w * 0.2, -h * 0.42);
  renderCtx.lineTo(-w * 0.2, -h * 0.42);
  renderCtx.lineTo(-w * 0.46, -h * 0.14);
  renderCtx.lineTo(-w * 0.3, h * 0.15);
  renderCtx.closePath();
  renderCtx.fill();

  // Core armor slab.
  renderCtx.fillStyle = "rgba(2, 6, 23, 0.65)";
  renderCtx.beginPath();
  renderCtx.moveTo(0, h * 0.32);
  renderCtx.lineTo(w * 0.12, h * 0.1);
  renderCtx.lineTo(w * 0.08, -h * 0.2);
  renderCtx.lineTo(-w * 0.08, -h * 0.2);
  renderCtx.lineTo(-w * 0.12, h * 0.1);
  renderCtx.closePath();
  renderCtx.fill();

  renderCtx.fillStyle = t.trim;
  renderCtx.fillRect(-w * 0.55, h * 0.04, w * 0.22, h * 0.14);
  renderCtx.fillRect(w * 0.33, h * 0.04, w * 0.22, h * 0.14);
  renderCtx.fillRect(-w * 0.1, h * 0.08, w * 0.2, h * 0.22);

  // Additional armor fins and vents.
  renderCtx.fillRect(-w * 0.34, -h * 0.1, w * 0.1, h * 0.07);
  renderCtx.fillRect(w * 0.24, -h * 0.1, w * 0.1, h * 0.07);
  renderCtx.fillRect(-w * 0.05, -h * 0.28, w * 0.1, h * 0.06);

  renderCtx.strokeStyle = "rgba(100, 116, 139, 0.6)";
  renderCtx.lineWidth = 2;
  renderCtx.beginPath();
  renderCtx.moveTo(-w * 0.18, h * 0.06);
  renderCtx.lineTo(0, h * 0.24);
  renderCtx.lineTo(w * 0.18, h * 0.06);
  renderCtx.moveTo(-w * 0.26, -h * 0.06);
  renderCtx.lineTo(-w * 0.1, -h * 0.02);
  renderCtx.moveTo(w * 0.26, -h * 0.06);
  renderCtx.lineTo(w * 0.1, -h * 0.02);
  renderCtx.stroke();

  const bossCanopy = renderCtx.createLinearGradient(0, -h * 0.2, 0, -h * 0.02);
  bossCanopy.addColorStop(0, "rgba(226, 232, 240, 0.76)");
  bossCanopy.addColorStop(1, "rgba(34, 211, 238, 0.6)");
  renderCtx.fillStyle = bossCanopy;
  renderCtx.beginPath();
  renderCtx.ellipse(0, -h * 0.1, w * 0.08, h * 0.06, 0, 0, Math.PI * 2);
  renderCtx.fill();

  renderCtx.shadowColor = t.glow;
  renderCtx.shadowBlur = 22;
  renderCtx.fillStyle = t.glow;
  renderCtx.globalAlpha = 0.6 + pulse * 0.4;
  renderCtx.fillRect(-w * 0.08, h * 0.08, w * 0.16, h * 0.07);

  renderCtx.fillStyle = t.engine;
  renderCtx.fillRect(-w * 0.2, -h * 0.36, w * 0.1, h * (0.1 + pulse * 0.06));
  renderCtx.fillRect(-w * 0.05, -h * 0.4, w * 0.1, h * (0.09 + pulse * 0.05));
  renderCtx.fillRect(w * 0.1, -h * 0.36, w * 0.1, h * (0.1 + pulse * 0.06));
  renderCtx.globalAlpha = 0.4 + pulse * 0.3;
  renderCtx.fillRect(-w * 0.31, -h * 0.24, w * 0.07, h * (0.07 + pulse * 0.04));
  renderCtx.fillRect(w * 0.24, -h * 0.24, w * 0.07, h * (0.07 + pulse * 0.04));
  renderCtx.globalAlpha = 1;
  renderCtx.shadowBlur = 0;

  const bossDamageRatio = bossShip.maxHp > 0 ? 1 - Math.max(0, Math.min(1, bossShip.hp / bossShip.maxHp)) : 0;
  drawDamageOverlay(renderCtx, w, h, bossDamageRatio, timeNow, t.glow, t.engine, true);

  renderCtx.restore();
}

function drawBossBar() {
  if (!boss) return;

  const { theme } = getBiomeTheme(wave);
  const barW = 364;
  const barH = 14;
  const x = (WIDTH - barW) / 2;
  const y = 16;
  const ratio = Math.max(0, boss.hp / boss.maxHp);
  const segments = 12;
  const segGap = 2;
  const segW = (barW - (segments - 1) * segGap) / segments;
  const phaseNow = ratio > 0.66 ? 1 : ratio > 0.33 ? 2 : 3;
  const enrage = ratio <= 0.2;
  const enragePulse = 0.45 + 0.55 * Math.sin(performance.now() * 0.02);

  ctx.save();
  if (enrage) {
    ctx.shadowColor = theme.danger;
    ctx.shadowBlur = 12 + enragePulse * 8;
  }

  ctx.fillStyle = "rgba(17, 24, 39, 0.85)";
  ctx.fillRect(x, y, barW, barH);
  ctx.strokeStyle = "rgba(255,255,255,0.25)";
  ctx.strokeRect(x, y, barW, barH);

  for (let i = 0; i < segments; i++) {
    const segFill = clamp(ratio * segments - i, 0, 1);
    const segX = x + i * (segW + segGap);
    ctx.fillStyle = "rgba(148, 163, 184, 0.22)";
    ctx.fillRect(segX, y + 1, segW, barH - 2);
    if (segFill > 0) {
      const segGrad = ctx.createLinearGradient(segX, y, segX, y + barH);
      segGrad.addColorStop(0, theme.danger);
      segGrad.addColorStop(1, "#7f1d1d");
      ctx.fillStyle = segGrad;
      ctx.fillRect(segX, y + 1, segW * segFill, barH - 2);
    }
  }

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "700 12px Orbitron";
  ctx.textAlign = "center";
  ctx.fillText(`JEFE | FASE ${phaseNow}`, WIDTH / 2, y + 26);
  if (enrage) {
    ctx.globalAlpha = 0.65 + enragePulse * 0.35;
    ctx.fillStyle = theme.danger;
    ctx.fillText("ENRAGE", WIDTH / 2, y + 42);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  ctx.restore();
}

function drawWaveBanner() {
  if (waveTimer <= 0) return;
  const { theme } = getBiomeTheme(wave);
  const alpha = Math.min(1, waveTimer / 45);
  const progress = 1 - Math.min(1, waveTimer / 90);
  ctx.globalAlpha = alpha;

  // Cinematic warp lines.
  for (let i = 0; i < 22; i++) {
    const x = (i / 21) * WIDTH;
    const len = 24 + Math.sin(i * 1.7 + progress * 6) * 9;
    ctx.strokeStyle = `rgba(${theme.nebulaA}, ${0.06 + (i % 3) * 0.02})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, HEIGHT * 0.42 - len);
    ctx.lineTo(x, HEIGHT * 0.58 + len);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(8, 15, 31, 0.78)";
  ctx.fillRect(WIDTH / 2 - 150, HEIGHT / 2 - 34, 300, 68);
  ctx.strokeStyle = `rgba(${theme.nebulaA}, 0.4)`;
  ctx.strokeRect(WIDTH / 2 - 150, HEIGHT / 2 - 34, 300, 68);
  ctx.fillStyle = theme.accent;
  ctx.font = "700 13px Orbitron";
  ctx.textAlign = "center";
  ctx.fillText("WAVE INCOMING", WIDTH / 2, HEIGHT / 2 - 10);
  ctx.font = "800 26px Orbitron";
  ctx.fillText(`OLEADA ${wave}`, WIDTH / 2, HEIGHT / 2 + 20);
  ctx.textAlign = "left";
  ctx.globalAlpha = 1;
}

function drawSpaceBackdrop(timeNow) {
  const { theme } = getBiomeTheme(wave);
  const clarity = getCombatClarityState();
  const heavyLoad = bullets.length + enemyProjectiles.length > GAME_TUNING.globalFxLiteThreshold || clarity.active;

  const base = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  base.addColorStop(0, theme.bgTop);
  base.addColorStop(0.4, theme.bgMid);
  base.addColorStop(1, theme.bgBottom);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const nebulaA = ctx.createRadialGradient(
    WIDTH * 0.18 + Math.sin(timeNow * 0.09) * 26,
    HEIGHT * 0.26,
    8,
    WIDTH * 0.18,
    HEIGHT * 0.26,
    WIDTH * 0.58
  );
  nebulaA.addColorStop(0, `rgba(${theme.nebulaA}, 0.26)`);
  nebulaA.addColorStop(0.45, `rgba(${theme.nebulaA}, 0.14)`);
  nebulaA.addColorStop(1, `rgba(${theme.nebulaA}, 0)`);
  ctx.fillStyle = nebulaA;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const nebulaB = ctx.createRadialGradient(
    WIDTH * 0.86 + Math.cos(timeNow * 0.07) * 22,
    HEIGHT * 0.76,
    14,
    WIDTH * 0.86,
    HEIGHT * 0.76,
    WIDTH * 0.5
  );
  nebulaB.addColorStop(0, `rgba(${theme.nebulaB}, 0.24)`);
  nebulaB.addColorStop(0.5, `rgba(${theme.nebulaB}, 0.12)`);
  nebulaB.addColorStop(1, `rgba(${theme.nebulaB}, 0)`);
  ctx.fillStyle = nebulaB;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const nebulaC = ctx.createRadialGradient(
    WIDTH * 0.56 + Math.sin(timeNow * 0.05) * 18,
    HEIGHT * 0.12,
    5,
    WIDTH * 0.56,
    HEIGHT * 0.12,
    WIDTH * 0.44
  );
  nebulaC.addColorStop(0, `rgba(${theme.nebulaC}, 0.18)`);
  nebulaC.addColorStop(0.55, `rgba(${theme.nebulaC}, 0.1)`);
  nebulaC.addColorStop(1, `rgba(${theme.nebulaC}, 0)`);
  ctx.fillStyle = nebulaC;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  for (const d of dustClouds) {
    if (heavyLoad) {
      const cloudAlpha = Math.min(0.12, d.life / 9000);
      ctx.fillStyle = `rgba(${d.hue}, ${cloudAlpha})`;
      ctx.fillRect(d.x - d.r * 0.5, d.y - d.r * 0.5, d.r, d.r);
      continue;
    }

    const cloudAlpha = Math.min(0.16, d.life / 8000);
    const cloud = ctx.createRadialGradient(d.x, d.y, d.r * 0.2, d.x, d.y, d.r);
    cloud.addColorStop(0, `rgba(${d.hue}, ${cloudAlpha})`);
    cloud.addColorStop(1, `rgba(${d.hue}, 0)`);
    ctx.fillStyle = cloud;
    ctx.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
  }

  // Subtle aurora bands add movement and depth without using bitmap backgrounds.
  if (!heavyLoad) {
    ctx.save();
    ctx.globalAlpha = 0.12 + 0.08 * (0.5 + 0.5 * Math.sin(timeNow * 0.8));
    for (let i = 0; i < 3; i++) {
      const y = HEIGHT * (0.2 + i * 0.25) + Math.sin(timeNow * 0.4 + i * 1.7) * 18;
      const g = ctx.createLinearGradient(0, y - 24, WIDTH, y + 24);
      g.addColorStop(0, `rgba(${theme.nebulaA}, 0)`);
      g.addColorStop(0.45, i === 1 ? `rgba(${theme.nebulaB}, 0.45)` : `rgba(${theme.nebulaA}, 0.38)`);
      g.addColorStop(1, `rgba(${theme.nebulaA}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, y - 24, WIDTH, 48);
    }
    ctx.restore();
  }

  drawStarLayer(STAR_LAYERS.far, timeNow);
  drawStarLayer(STAR_LAYERS.mid, timeNow);
  if (!clarity.active) {
    drawStarLayer(STAR_LAYERS.near, timeNow);
  }

  for (const c of comets) {
    if (clarity.active) break;
    const tail = ctx.createLinearGradient(c.x - 60, c.y - 8, c.x, c.y);
    tail.addColorStop(0, "rgba(147, 197, 253, 0)");
    tail.addColorStop(1, "rgba(191, 219, 254, 0.75)");
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = tail;
    ctx.beginPath();
    ctx.moveTo(c.x - 70, c.y - 5);
    ctx.lineTo(c.x, c.y);
    ctx.lineTo(c.x - 70, c.y + 5);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.85;
    ctx.fillStyle = "#e0f2fe";
    ctx.beginPath();
    ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
    ctx.fill();
  }

  if (clarity.active) {
    const veil = Math.min(0.32, 0.18 + (clarity.pressure / (GAME_TUNING.globalFxLiteThreshold * 2.2)));
    ctx.fillStyle = `rgba(2, 6, 23, ${veil})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
  ctx.globalAlpha = 1;
}

function drawSpecialPulseOverlay(timeNow) {
  if (!player || (specialActiveFrames <= 0 && specialFlashFrames <= 0)) return;

  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;
  const t = specialActiveFrames > 0 ? specialActiveFrames / 80 : 0;
  const flash = specialFlashFrames > 0 ? specialFlashFrames / 24 : 0;

  ctx.save();
  ctx.globalAlpha = 0.22 + flash * 0.34;
  ctx.fillStyle = "rgba(125, 211, 252, 0.18)";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.globalAlpha = 0.38 + flash * 0.25;
  ctx.strokeStyle = "#93c5fd";
  ctx.shadowColor = "#7dd3fc";
  ctx.shadowBlur = 18;
  ctx.lineWidth = 2.2;
  const waveRadius = player.w * (1.2 + (1 - t) * 7.2);
  ctx.beginPath();
  ctx.arc(cx, cy, waveRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.28 + 0.18 * (0.5 + 0.5 * Math.sin(timeNow * 18));
  ctx.strokeStyle = "#c4b5fd";
  ctx.shadowColor = "#a78bfa";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, waveRadius * 0.68, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawEventOverlay(timeNow) {
  if (!currentEvent) return;

  ctx.save();
  if (currentEvent.type === "fog") {
    const fogAlpha = 0.18 + 0.06 * Math.sin(timeNow * 1.8);
    ctx.fillStyle = `rgba(148, 163, 184, ${fogAlpha})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  } else if (currentEvent.type === "interference") {
    ctx.globalAlpha = 0.12;
    for (let i = 0; i < 12; i++) {
      const y = ((i * 71 + timeNow * 160) % HEIGHT);
      ctx.fillStyle = i % 2 === 0 ? "#bae6fd" : "#c4b5fd";
      ctx.fillRect(0, y, WIDTH, 2);
    }
  } else if (currentEvent.type === "bonus-wave") {
    ctx.globalAlpha = 0.1 + 0.08 * (0.5 + 0.5 * Math.sin(timeNow * 5));
    ctx.fillStyle = "#facc15";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  } else if (currentEvent.type === "magnetic-field") {
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 1.1;
    const centerX = WIDTH / 2;
    const centerY = HEIGHT / 2;
    for (let r = 140; r <= 320; r += 48) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r + Math.sin(timeNow * 2 + r * 0.01) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function draw() {
  const timeNow = performance.now() * 0.001;
  const shipTime = timeNow;
  updateGameOverFxState();

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  ctx.save();

  const cameraOffset = getCameraOffset();
  ctx.translate(cameraOffset.x, cameraOffset.y);

  drawSpaceBackdrop(timeNow);

  drawEngineParticles();

  if (player) {
    const palette = getSkinPalette(player.skinId);
    const profile = getSkinById(player.skinId).profile;
    if (damageCooldown > 0 && Math.floor(damageCooldown / 4) % 2 === 0) {
      drawCodeShip(
        ctx,
        player.x + player.w / 2,
        player.y + player.h / 2,
        player.w,
        player.h,
        palette,
        { ...player, profile, skinId: player.skinId },
        shipTime
      );
    } else if (damageCooldown <= 0) {
      drawCodeShip(
        ctx,
        player.x + player.w / 2,
        player.y + player.h / 2,
        player.w,
        player.h,
        palette,
        { ...player, profile, skinId: player.skinId },
        shipTime
      );
    }
  }

  drawPlayerShieldPulse();
  drawSpecialPulseOverlay(timeNow);
  drawDashBursts(timeNow);
  drawMuzzleFlashes(timeNow);

  const bulletLiteMode = bullets.length >= GAME_TUNING.bulletLiteThreshold;
  for (const bullet of bullets) {
    drawPlayerBullet(bullet, timeNow, bulletLiteMode);
  }

  drawEnemyProjectiles();
  drawPowerUps(timeNow);
  drawMicroExplosions();
  drawEventOverlay(timeNow);

  for (const enemy of enemies) {
    drawEnemyShip(ctx, enemy, shipTime);
  }

  if (boss) {
    drawBossShip(ctx, boss, shipTime);
  }

  ctx.restore();

  drawGameOverParticles();

  drawBossBar();
  drawWaveBanner();
  drawFloatingTexts();
  drawPickupBanner();
  drawObjectiveRewardBanner();
  drawDebugHitboxes();
  drawFakeBloomPass();
}


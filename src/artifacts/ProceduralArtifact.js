import * as THREE from 'three';
import { hashString } from '../room/seedUtils.js';

const MAT_COLORS = {
  bronze: 0xb8860b,
  crystal: 0xaaddff,
  obsidian: 0x1a1a22,
  amber: 0xffaa44,
  silver: 0xc0c8d0,
  jade: 0x5a9a6a,
  iron: 0x666670,
  marble: 0xe8e0d4,
  wood: 0x5c3a1e,
  gold: 0xd4a017,
  ceramic: 0xe8dcc8,
  stone: 0x8a8a7a,
};

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.45,
    metalness: opts.metalness ?? 0.35,
    ...opts,
  });
}

function toColor(hex) {
  return new THREE.Color(hex);
}

function seededFloat(seed, key, min = 0, max = 1) {
  return min + ((hashString(`${seed}:${key}`) % 1000) / 1000) * (max - min);
}

function seededInt(seed, key, min, max) {
  return min + (hashString(`${seed}:${key}`) % (max - min + 1));
}

// ─── PAINTINGS ───

function buildPainting(group, accent, recipe) {
  const seed = recipe.seed ?? 'default';
  const w = seededFloat(seed, 'pw', 0.7, 1.4);
  const h = seededFloat(seed, 'ph', 0.6, 1.1);

  const frameMat = mat(MAT_COLORS.gold, { roughness: 0.3, metalness: 0.7 });
  const frameDepth = 0.06;
  const frameWidth = 0.05;

  const backboard = new THREE.Mesh(
    new THREE.BoxGeometry(w + frameWidth * 2, h + frameWidth * 2, frameDepth),
    frameMat,
  );
  group.add(backboard);

  const canvas = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    createPaintingMaterial(seed, accent),
  );
  canvas.position.z = frameDepth / 2 + 0.001;
  group.add(canvas);

  group.userData.displayMode = 'wall';
  group.userData.idleRotation = false;
}

function createPaintingMaterial(seed, accent) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 384;
  const ctx = canvas.getContext('2d');

  const style = hashString(`${seed}:paintStyle`) % 5;
  const baseHue = hashString(`${seed}:hue`) % 360;

  ctx.fillStyle = `hsl(${baseHue}, 25%, 18%)`;
  ctx.fillRect(0, 0, 512, 384);

  if (style === 0) paintLandscape(ctx, seed, baseHue);
  else if (style === 1) paintAbstract(ctx, seed, baseHue);
  else if (style === 2) paintPortrait(ctx, seed, baseHue);
  else if (style === 3) paintStillLife(ctx, seed, baseHue);
  else paintGeometric(ctx, seed, baseHue);

  addPaintingTexture(ctx, seed);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.7, metalness: 0.02 });
}

function paintLandscape(ctx, seed, hue) {
  const skyHue = (hue + 180) % 360;
  const grad = ctx.createLinearGradient(0, 0, 0, 384);
  grad.addColorStop(0, `hsl(${skyHue}, 40%, 55%)`);
  grad.addColorStop(0.5, `hsl(${skyHue}, 30%, 70%)`);
  grad.addColorStop(0.55, `hsl(${hue}, 35%, 30%)`);
  grad.addColorStop(1, `hsl(${hue}, 40%, 15%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 384);

  const hills = seededInt(seed, 'hills', 2, 5);
  for (let i = 0; i < hills; i++) {
    const cx = seededFloat(seed, `hx${i}`, 0, 512);
    const cy = seededFloat(seed, `hy${i}`, 140, 240);
    const r = seededFloat(seed, `hr${i}`, 100, 250);
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.5, 0, Math.PI, 0);
    ctx.fillStyle = `hsla(${(hue + i * 15) % 360}, 30%, ${20 + i * 5}%, 0.7)`;
    ctx.fill();
  }

  const sunX = seededFloat(seed, 'sx', 80, 432);
  ctx.beginPath();
  ctx.arc(sunX, 60, 25, 0, Math.PI * 2);
  ctx.fillStyle = `hsla(40, 80%, 80%, 0.8)`;
  ctx.fill();
}

function paintAbstract(ctx, seed, hue) {
  const shapes = seededInt(seed, 'shapes', 8, 20);
  for (let i = 0; i < shapes; i++) {
    const x = seededFloat(seed, `ax${i}`, 0, 512);
    const y = seededFloat(seed, `ay${i}`, 0, 384);
    const r = seededFloat(seed, `ar${i}`, 15, 90);
    const h = (hue + seededInt(seed, `ah${i}`, 0, 120)) % 360;
    const type = hashString(`${seed}:at${i}`) % 3;
    ctx.fillStyle = `hsla(${h}, 55%, 50%, ${seededFloat(seed, `ao${i}`, 0.3, 0.85)})`;
    ctx.beginPath();
    if (type === 0) {
      ctx.arc(x, y, r, 0, Math.PI * 2);
    } else if (type === 1) {
      ctx.rect(x - r, y - r, r * 2, r * 1.5);
    } else {
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y + r);
      ctx.lineTo(x - r, y + r);
      ctx.closePath();
    }
    ctx.fill();
  }
}

function paintPortrait(ctx, seed, hue) {
  const bgHue = (hue + 30) % 360;
  ctx.fillStyle = `hsl(${bgHue}, 20%, 22%)`;
  ctx.fillRect(0, 0, 512, 384);

  const cx = 256;
  const cy = 140;

  ctx.beginPath();
  ctx.ellipse(cx, cy, 55, 70, 0, 0, Math.PI * 2);
  ctx.fillStyle = `hsl(${hue}, 15%, 65%)`;
  ctx.fill();

  ctx.beginPath();
  ctx.ellipse(cx, cy + 120, 80, 120, 0, 0, Math.PI);
  ctx.fillStyle = `hsl(${(hue + 180) % 360}, 30%, 35%)`;
  ctx.fill();

  const eyeSpread = seededFloat(seed, 'es', 15, 25);
  [cx - eyeSpread, cx + eyeSpread].forEach((ex) => {
    ctx.beginPath();
    ctx.ellipse(ex, cy - 5, 6, 4, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fill();
  });
}

function paintStillLife(ctx, seed, hue) {
  const tableY = 220;
  ctx.fillStyle = `hsl(${hue}, 15%, 20%)`;
  ctx.fillRect(0, 0, 512, 384);
  ctx.fillStyle = `hsl(${(hue + 20) % 360}, 20%, 28%)`;
  ctx.fillRect(0, tableY, 512, 384 - tableY);

  const items = seededInt(seed, 'items', 3, 6);
  for (let i = 0; i < items; i++) {
    const ix = seededFloat(seed, `ix${i}`, 80, 432);
    const ih = seededFloat(seed, `ih${i}`, 40, 120);
    const iw = seededFloat(seed, `iw${i}`, 25, 60);
    const itemHue = (hue + seededInt(seed, `ihue${i}`, 0, 180)) % 360;
    const type = hashString(`${seed}:itype${i}`) % 3;

    ctx.fillStyle = `hsl(${itemHue}, 40%, 45%)`;
    if (type === 0) {
      ctx.beginPath();
      ctx.ellipse(ix, tableY - ih / 2, iw, ih / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 1) {
      ctx.fillRect(ix - iw / 2, tableY - ih, iw, ih);
    } else {
      ctx.beginPath();
      ctx.moveTo(ix, tableY - ih);
      ctx.quadraticCurveTo(ix + iw, tableY - ih * 0.3, ix + iw * 0.5, tableY);
      ctx.quadraticCurveTo(ix - iw * 0.5, tableY, ix - iw, tableY - ih * 0.3);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function paintGeometric(ctx, seed, hue) {
  const rows = seededInt(seed, 'rows', 3, 6);
  const cols = seededInt(seed, 'cols', 3, 6);
  const cellW = 512 / cols;
  const cellH = 384 / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const h = (hue + seededInt(seed, `gh${r}${c}`, 0, 60)) % 360;
      const l = seededInt(seed, `gl${r}${c}`, 20, 60);
      ctx.fillStyle = `hsl(${h}, 45%, ${l}%)`;
      ctx.fillRect(c * cellW + 2, r * cellH + 2, cellW - 4, cellH - 4);
    }
  }
}

function addPaintingTexture(ctx, seed) {
  const strokes = seededInt(seed, 'strokes', 30, 80);
  for (let i = 0; i < strokes; i++) {
    const x = seededFloat(seed, `bx${i}`, 0, 512);
    const y = seededFloat(seed, `by${i}`, 0, 384);
    ctx.strokeStyle = `rgba(255,255,255,${seededFloat(seed, `bo${i}`, 0.01, 0.06)})`;
    ctx.lineWidth = seededFloat(seed, `bw${i}`, 0.5, 3);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + seededFloat(seed, `bdx${i}`, -30, 30), y + seededFloat(seed, `bdy${i}`, -5, 5));
    ctx.stroke();
  }
}

// ─── SCULPTURE (bust / abstract figure) ───

function buildSculpture(group, accent, recipe) {
  const seed = recipe.seed ?? 'default';
  const style = hashString(`${seed}:sculpt`) % 3;

  if (style === 0) buildBust(group, accent, seed);
  else if (style === 1) buildAbstractSculpture(group, accent, seed);
  else buildTorso(group, accent, seed);

  group.userData.idleRotation = true;
}

function buildBust(group, accent, seed) {
  const headMat = mat(accent, { roughness: 0.65, metalness: 0.1 });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 24, 24), headMat);
  head.scale.set(1, 1.2, 0.95);
  head.position.y = 0.35;
  group.add(head);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.12, 12), headMat);
  neck.position.y = 0.18;
  group.add(neck);

  const shoulders = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.22, 0.2, 16), headMat);
  shoulders.position.y = 0.06;
  group.add(shoulders);

  const baseMat = mat(MAT_COLORS.marble, { roughness: 0.4, metalness: 0.05 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.12, 16), baseMat);
  base.position.y = -0.1;
  group.add(base);

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 6), headMat);
  nose.position.set(0, 0.34, 0.17);
  nose.rotation.x = -0.3;
  group.add(nose);
}

function buildAbstractSculpture(group, accent, seed) {
  const count = seededInt(seed, 'sparts', 3, 7);
  const sculptMat = mat(accent, { roughness: 0.3, metalness: 0.5 });

  for (let i = 0; i < count; i++) {
    const type = hashString(`${seed}:sp${i}`) % 4;
    let geo;
    if (type === 0) geo = new THREE.SphereGeometry(seededFloat(seed, `sr${i}`, 0.08, 0.2), 16, 16);
    else if (type === 1) geo = new THREE.BoxGeometry(
      seededFloat(seed, `sw${i}`, 0.1, 0.25),
      seededFloat(seed, `sh${i}`, 0.1, 0.35),
      seededFloat(seed, `sd${i}`, 0.1, 0.2),
    );
    else if (type === 2) geo = new THREE.CylinderGeometry(
      seededFloat(seed, `st${i}`, 0.04, 0.12),
      seededFloat(seed, `sb${i}`, 0.04, 0.14),
      seededFloat(seed, `sl${i}`, 0.15, 0.4),
      8,
    );
    else geo = new THREE.TorusGeometry(seededFloat(seed, `str${i}`, 0.08, 0.18), 0.03, 8, 24);

    const mesh = new THREE.Mesh(geo, sculptMat);
    mesh.position.set(
      seededFloat(seed, `sx${i}`, -0.12, 0.12),
      seededFloat(seed, `sy${i}`, -0.1, 0.4),
      seededFloat(seed, `sz${i}`, -0.1, 0.1),
    );
    mesh.rotation.set(
      seededFloat(seed, `srx${i}`, -0.5, 0.5),
      seededFloat(seed, `sry${i}`, 0, Math.PI),
      seededFloat(seed, `srz${i}`, -0.3, 0.3),
    );
    mesh.castShadow = true;
    group.add(mesh);
  }
}

function buildTorso(group, accent, seed) {
  const sculptMat = mat(accent, { roughness: 0.5, metalness: 0.15 });

  const torso = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.18, 0.5, 16),
    sculptMat,
  );
  torso.position.y = 0.1;
  group.add(torso);

  const chest = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 16, 16),
    sculptMat,
  );
  chest.scale.set(1, 0.7, 0.8);
  chest.position.y = 0.3;
  group.add(chest);

  [-0.2, 0.2].forEach((xOff) => {
    const arm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.035, 0.35, 8),
      sculptMat,
    );
    arm.position.set(xOff, 0.15, 0);
    arm.rotation.z = xOff < 0 ? 0.4 : -0.4;
    group.add(arm);
  });

  const baseMat = mat(MAT_COLORS.stone, { roughness: 0.7 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.1, 12), baseMat);
  base.position.y = -0.2;
  group.add(base);
}

// ─── DECORATED VASE ───

function buildVase(group, accent, recipe) {
  const seed = recipe.seed ?? 'default';
  const style = hashString(`${seed}:vaseStyle`) % 3;

  const points = [];
  if (style === 0) {
    points.push(new THREE.Vector2(0, 0), new THREE.Vector2(0.2, 0), new THREE.Vector2(0.28, 0.15),
      new THREE.Vector2(0.32, 0.35), new THREE.Vector2(0.18, 0.5), new THREE.Vector2(0.14, 0.55),
      new THREE.Vector2(0.16, 0.62), new THREE.Vector2(0, 0.65));
  } else if (style === 1) {
    points.push(new THREE.Vector2(0, 0), new THREE.Vector2(0.25, 0), new THREE.Vector2(0.3, 0.2),
      new THREE.Vector2(0.25, 0.4), new THREE.Vector2(0.25, 0.55), new THREE.Vector2(0, 0.6));
  } else {
    points.push(new THREE.Vector2(0, 0), new THREE.Vector2(0.18, 0), new THREE.Vector2(0.22, 0.1),
      new THREE.Vector2(0.28, 0.3), new THREE.Vector2(0.12, 0.5), new THREE.Vector2(0.1, 0.55),
      new THREE.Vector2(0.12, 0.65), new THREE.Vector2(0.15, 0.7), new THREE.Vector2(0, 0.72));
  }

  const vaseMat = createVaseMaterial(seed, accent);
  const body = new THREE.Mesh(new THREE.LatheGeometry(points, 32), vaseMat);
  group.add(body);

  const bands = seededInt(seed, 'bands', 1, 3);
  for (let i = 0; i < bands; i++) {
    const y = seededFloat(seed, `by${i}`, 0.15, 0.5);
    const r = seededFloat(seed, `br${i}`, 0.24, 0.34);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.012, 6, 24),
      mat(MAT_COLORS.gold, { metalness: 0.7 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    group.add(ring);
  }

  group.userData.idleRotation = true;
}

function createVaseMaterial(seed, accent) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  const hue = hashString(`${seed}:vhue`) % 360;
  ctx.fillStyle = `hsl(${hue}, 30%, 35%)`;
  ctx.fillRect(0, 0, 256, 256);

  const pattern = hashString(`${seed}:vpat`) % 3;
  if (pattern === 0) {
    for (let y = 30; y < 256; y += 50) {
      ctx.strokeStyle = `hsla(${(hue + 40) % 360}, 40%, 55%, 0.6)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < 256; x += 20) {
        ctx.lineTo(x, y + Math.sin(x * 0.1 + hashString(`${seed}:vw${y}`) * 0.01) * 8);
      }
      ctx.stroke();
    }
  } else if (pattern === 1) {
    for (let i = 0; i < 12; i++) {
      const x = seededFloat(seed, `vsx${i}`, 10, 246);
      const y = seededFloat(seed, `vsy${i}`, 10, 246);
      ctx.fillStyle = `hsla(${(hue + 60) % 360}, 35%, 50%, 0.5)`;
      ctx.beginPath();
      ctx.arc(x, y, seededFloat(seed, `vsr${i}`, 8, 20), 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    for (let y = 0; y < 256; y += 40) {
      for (let x = 0; x < 256; x += 40) {
        ctx.fillStyle = `hsla(${(hue + 30) % 360}, 30%, ${seededInt(seed, `vg${x}${y}`, 30, 50)}%, 0.4)`;
        ctx.fillRect(x + 4, y + 4, 32, 32);
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map: texture, roughness: 0.55, metalness: 0.08 });
}

// ─── WEAPON (sword / dagger / staff) ───

function buildWeapon(group, accent, recipe) {
  const seed = recipe.seed ?? 'default';
  const type = hashString(`${seed}:weapType`) % 3;

  if (type === 0) buildSword(group, accent, seed);
  else if (type === 1) buildDagger(group, accent, seed);
  else buildStaff(group, accent, seed);

  group.userData.idleRotation = true;
}

function buildSword(group, accent, seed) {
  const bladeMat = mat(MAT_COLORS.silver, { roughness: 0.15, metalness: 0.9 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.015), bladeMat);
  blade.position.y = 0.2;
  group.add(blade);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 4), bladeMat);
  tip.position.y = 0.61;
  group.add(tip);

  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.04, 0.04),
    mat(accent, { metalness: 0.6 }),
  );
  guard.position.y = -0.15;
  group.add(guard);

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.03, 0.2, 8),
    mat(MAT_COLORS.wood, { roughness: 0.9, metalness: 0 }),
  );
  handle.position.y = -0.28;
  group.add(handle);

  const pommel = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 8, 8),
    mat(accent, { metalness: 0.7 }),
  );
  pommel.position.y = -0.4;
  group.add(pommel);
}

function buildDagger(group, accent, seed) {
  const bladeMat = mat(MAT_COLORS.iron, { roughness: 0.2, metalness: 0.85 });
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.35, 0.01), bladeMat);
  blade.position.y = 0.15;
  group.add(blade);

  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 4), bladeMat);
  tip.position.y = 0.37;
  group.add(tip);

  const guard = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.03, 0.03),
    mat(accent, { metalness: 0.6 }),
  );
  guard.position.y = -0.03;
  group.add(guard);

  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.025, 0.15, 8),
    mat(MAT_COLORS.wood, { roughness: 0.85, metalness: 0 }),
  );
  handle.position.y = -0.12;
  group.add(handle);

  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.025),
    mat(accent, { roughness: 0.1, metalness: 0.2 }),
  );
  gem.position.set(0, -0.03, 0.025);
  group.add(gem);
}

function buildStaff(group, accent, seed) {
  const shaftMat = mat(MAT_COLORS.wood, { roughness: 0.85, metalness: 0 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.9, 8), shaftMat);
  group.add(shaft);

  const headpiece = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.1),
    mat(accent, { roughness: 0.2, metalness: 0.4 }),
  );
  headpiece.position.y = 0.5;
  group.add(headpiece);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.06, 0.012, 6, 16),
    mat(MAT_COLORS.gold, { metalness: 0.8 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.38;
  group.add(ring);
}

// ─── SHIELD ───

function buildShield(group, accent, recipe) {
  const seed = recipe.seed ?? 'default';
  const shape = hashString(`${seed}:shieldShape`) % 2;

  let geo;
  if (shape === 0) {
    geo = new THREE.CylinderGeometry(0.35, 0.35, 0.04, 24);
    geo.rotateX(Math.PI / 2);
  } else {
    geo = new THREE.BoxGeometry(0.55, 0.7, 0.04);
  }

  const shieldMat = createVaseMaterial(seed, accent);
  const body = new THREE.Mesh(geo, shieldMat);
  group.add(body);

  const boss = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    mat(MAT_COLORS.gold, { metalness: 0.7 }),
  );
  boss.position.z = 0.02;
  group.add(boss);

  const rim = new THREE.Mesh(
    shape === 0
      ? new THREE.TorusGeometry(0.35, 0.015, 6, 32)
      : new THREE.BoxGeometry(0.58, 0.73, 0.015),
    mat(MAT_COLORS.iron, { metalness: 0.6 }),
  );
  rim.position.z = -0.01;
  if (shape === 0) rim.rotation.x = Math.PI / 2;
  group.add(rim);

  group.userData.idleRotation = true;
}

// ─── JEWELRY (necklace / amulet / ring) ───

function buildJewelry(group, accent, recipe) {
  const seed = recipe.seed ?? 'default';
  const type = hashString(`${seed}:jewType`) % 3;

  if (type === 0) {
    const chain = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.01, 6, 32),
      mat(MAT_COLORS.gold, { metalness: 0.8 }),
    );
    chain.rotation.x = Math.PI / 4;
    group.add(chain);

    const pendant = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.08),
      mat(accent, { roughness: 0.15, metalness: 0.3 }),
    );
    pendant.position.y = -0.22;
    group.add(pendant);
  } else if (type === 1) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.15, 0.025, 8, 32),
      mat(MAT_COLORS.gold, { metalness: 0.85 }),
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.06),
      mat(accent, { roughness: 0.1, metalness: 0.2 }),
    );
    stone.position.y = 0.15;
    group.add(stone);
  } else {
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.18, 0.015, 24),
      mat(accent, { metalness: 0.5 }),
    );
    disc.rotation.x = Math.PI / 2;
    group.add(disc);

    const symbols = seededInt(seed, 'jsymbols', 3, 8);
    for (let i = 0; i < symbols; i++) {
      const ang = (i / symbols) * Math.PI * 2;
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.015, 6, 6),
        mat(MAT_COLORS.gold, { metalness: 0.9 }),
      );
      dot.position.set(Math.cos(ang) * 0.12, Math.sin(ang) * 0.12, 0.01);
      group.add(dot);
    }
  }

  group.userData.idleRotation = true;
}

// ─── KEPT ORIGINALS (improved) ───

function buildCompass(group, accent, recipe) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.04, 12, 32),
    mat(accent, { metalness: 0.6 }),
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const innerRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.25, 0.02, 8, 24),
    mat(MAT_COLORS.silver, { metalness: 0.8 }),
  );
  innerRing.rotation.x = Math.PI / 2;
  group.add(innerRing);

  const needle = new THREE.Mesh(
    new THREE.ConeGeometry(0.02, 0.4, 4),
    mat(0xdddddd, { metalness: 0.8 }),
  );
  needle.position.y = 0.05;
  group.add(needle);

  const crystal = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16),
    mat(MAT_COLORS.crystal, { roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.75 }),
  );
  crystal.position.y = 0.15;
  group.add(crystal);

  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const mark = new THREE.Mesh(
      new THREE.BoxGeometry(0.025, 0.06, 0.01),
      mat(MAT_COLORS.gold, { metalness: 0.7 }),
    );
    mark.position.set(Math.cos(ang) * 0.3, 0, Math.sin(ang) * 0.3);
    mark.rotation.y = -ang;
    group.add(mark);
  }

  group.userData.idleRotation = true;
}

function buildMask(group, accent, recipe) {
  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.65),
    mat(accent, { roughness: 0.5 }),
  );
  group.add(face);

  [[-0.1, 0.08], [0.1, 0.08]].forEach(([x, y]) => {
    const socket = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 12, 12),
      mat(0x111111, { metalness: 0.2 }),
    );
    socket.position.set(x, y, 0.25);
    socket.scale.set(1.8, 0.9, 0.5);
    group.add(socket);
  });

  const nose = new THREE.Mesh(
    new THREE.ConeGeometry(0.03, 0.08, 6),
    mat(accent, { roughness: 0.5 }),
  );
  nose.position.set(0, -0.02, 0.3);
  nose.rotation.x = -0.2;
  group.add(nose);

  const trim = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.015, 6, 24, Math.PI),
    mat(MAT_COLORS.gold, { metalness: 0.7 }),
  );
  trim.rotation.y = Math.PI / 2;
  trim.rotation.z = Math.PI / 2;
  trim.position.y = 0.02;
  group.add(trim);

  group.userData.idleRotation = true;
}

function buildCrown(group, accent, recipe) {
  const spikes = seededInt(recipe.seed ?? 'x', 'crspikes', 5, 8);
  for (let i = 0; i < spikes; i++) {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.04, 0.22 + (i % 2) * 0.08, 6),
      mat(accent, { metalness: 0.7 }),
    );
    const angle = (i / spikes) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 0.22, 0.12 + (i % 2) * 0.04, Math.sin(angle) * 0.22);
    group.add(spike);

    if (i % 2 === 0) {
      const gem = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 6, 6),
        mat(MAT_COLORS.crystal, { roughness: 0.1 }),
      );
      gem.position.set(Math.cos(angle) * 0.24, 0.03, Math.sin(angle) * 0.24);
      group.add(gem);
    }
  }

  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.24, 0.04, 8, 24),
    mat(accent, { metalness: 0.65 }),
  );
  band.rotation.x = Math.PI / 2;
  group.add(band);

  const innerBand = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.02, 6, 20),
    mat(MAT_COLORS.gold, { metalness: 0.8 }),
  );
  innerBand.rotation.x = Math.PI / 2;
  innerBand.position.y = 0.04;
  group.add(innerBand);

  group.userData.idleRotation = true;
}

function buildOrb(group, accent, recipe) {
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 32, 32),
    mat(accent, { roughness: 0.15, metalness: 0.15 }),
  );
  group.add(orb);

  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.34 + i * 0.04, 0.012, 8, 32),
      mat(MAT_COLORS.silver, { metalness: 0.9 }),
    );
    ring.rotation.x = Math.PI / 3 + i * 0.5;
    ring.rotation.y = i * 0.8;
    group.add(ring);
  }

  group.userData.idleRotation = true;
}

function buildTablet(group, accent, recipe) {
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.65, 0.06),
    mat(accent, { roughness: 0.8 }),
  );
  group.add(slab);

  const lineCount = seededInt(recipe.seed ?? 'x', 'tlines', 4, 8);
  for (let i = 0; i < lineCount; i++) {
    const w = seededFloat(recipe.seed ?? 'x', `tw${i}`, 0.15, 0.38);
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(w, 0.012, 0.008),
      mat(0x333333),
    );
    line.position.set(
      seededFloat(recipe.seed ?? 'x', `tx${i}`, -0.05, 0.05),
      0.22 - i * (0.5 / lineCount),
      0.035,
    );
    group.add(line);
  }

  const border = new THREE.Mesh(
    new THREE.BoxGeometry(0.54, 0.69, 0.02),
    mat(MAT_COLORS.stone, { roughness: 0.9 }),
  );
  border.position.z = -0.02;
  group.add(border);

  group.userData.displayMode = 'wall';
  group.userData.idleRotation = false;
}

function buildRelic(group, accent, recipe) {
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28, 1),
    mat(accent, { roughness: 0.3, metalness: 0.5 }),
  );
  group.add(core);

  const cage = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.35, 0),
    new THREE.MeshStandardMaterial({
      color: MAT_COLORS.gold,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: true,
    }),
  );
  group.add(cage);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 0.08, 6),
    mat(MAT_COLORS.obsidian, { metalness: 0.4 }),
  );
  base.position.y = -0.3;
  group.add(base);

  group.userData.idleRotation = true;
}

// ─── BUILDER MAP ───

const BUILDERS = {
  painting: buildPainting,
  sculpture: buildSculpture,
  vase: buildVase,
  weapon: buildWeapon,
  shield: buildShield,
  jewelry: buildJewelry,
  compass: buildCompass,
  mask: buildMask,
  crown: buildCrown,
  orb: buildOrb,
  tablet: buildTablet,
  relic: buildRelic,
  vessel: buildVase,
  tool: buildWeapon,
};

export function buildProceduralArtifact(meshRecipe) {
  const group = new THREE.Group();
  group.name = 'artifact';

  const accent = toColor(meshRecipe.accentColor ?? '#b8860b');
  const builder = BUILDERS[meshRecipe.baseShape] ?? buildRelic;
  const enrichedRecipe = { ...meshRecipe, seed: meshRecipe.seed ?? meshRecipe.accentColor ?? 'fallback' };
  builder(group, accent, enrichedRecipe);

  if (meshRecipe.materials?.length && !group.userData.displayMode) {
    const secondary = MAT_COLORS[meshRecipe.materials[0]] ?? 0x888888;
    const gem = new THREE.Mesh(
      new THREE.SphereGeometry(0.04, 8, 8),
      mat(secondary, { roughness: 0.15 }),
    );
    gem.position.set(0.18, 0.22, 0.08);
    group.add(gem);
  }

  const isWallMounted = group.userData.displayMode === 'wall';

  if (isWallMounted) {
    group.position.set(0, 2.2, -PEDESTAL_Z + 0.15);
  } else {
    group.position.set(0, 1.55, -PEDESTAL_Z);
  }

  group.castShadow = true;
  group.userData.isArtifact = true;
  group.userData.interactPosition = new THREE.Vector3(0, 0, -PEDESTAL_Z);

  return group;
}

const PEDESTAL_Z = 2;

export function tickArtifactIdle(artifact, delta) {
  if (artifact?.userData.idleRotation) {
    artifact.rotation.y += delta * 0.35;
  }
}

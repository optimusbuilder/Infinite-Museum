import * as THREE from 'three';

const MATERIAL_COLORS = {
  bronze: 0xb8860b,
  crystal: 0xaaddff,
  obsidian: 0x1a1a22,
  amber: 0xffaa44,
  silver: 0xc0c8d0,
  jade: 0x5a9a6a,
  iron: 0x666670,
};

function makeMat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.45,
    metalness: opts.metalness ?? 0.35,
    ...opts,
  });
}

function hexToThreeColor(hex) {
  if (typeof hex === 'string' && hex.startsWith('#')) {
    return new THREE.Color(hex);
  }
  return new THREE.Color(hex);
}

function buildCompass(group, accent) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.35, 0.04, 12, 32),
    makeMat(accent, { metalness: 0.6 }),
  );
  ring.rotation.x = Math.PI / 2;
  group.add(ring);

  const needle = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.5, 0.02),
    makeMat(0xdddddd, { metalness: 0.8 }),
  );
  needle.position.y = 0.05;
  group.add(needle);

  const crystal = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 16, 16),
    makeMat(MATERIAL_COLORS.crystal, { roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 }),
  );
  crystal.position.y = 0.15;
  group.add(crystal);
}

function buildVessel(group, accent) {
  const body = new THREE.Mesh(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0, 0),
        new THREE.Vector2(0.25, 0),
        new THREE.Vector2(0.3, 0.35),
        new THREE.Vector2(0.15, 0.55),
        new THREE.Vector2(0, 0.5),
      ],
      24,
    ),
    makeMat(accent),
  );
  group.add(body);
}

function buildMask(group, accent) {
  const face = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 24, 24, 0, Math.PI * 2, 0, Math.PI * 0.65),
    makeMat(accent, { roughness: 0.6 }),
  );
  group.add(face);

  const eyeL = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.04, 0.04),
    makeMat(0x111111, { metalness: 0.2 }),
  );
  eyeL.position.set(-0.1, 0.08, 0.26);
  group.add(eyeL);

  const eyeR = eyeL.clone();
  eyeR.position.x = 0.1;
  group.add(eyeR);
}

function buildCrown(group, accent) {
  for (let i = 0; i < 5; i += 1) {
    const spike = new THREE.Mesh(
      new THREE.ConeGeometry(0.06, 0.28, 6),
      makeMat(accent, { metalness: 0.7 }),
    );
    const angle = (i / 5) * Math.PI * 2;
    spike.position.set(Math.cos(angle) * 0.22, 0.12, Math.sin(angle) * 0.22);
    group.add(spike);
  }
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.05, 8, 24),
    makeMat(accent, { metalness: 0.65 }),
  );
  band.rotation.x = Math.PI / 2;
  group.add(band);
}

function buildOrb(group, accent) {
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 24, 24),
    makeMat(accent, { roughness: 0.2, metalness: 0.15 }),
  );
  group.add(orb);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.38, 0.02, 8, 32),
    makeMat(MATERIAL_COLORS.silver, { metalness: 0.9 }),
  );
  ring.rotation.x = Math.PI / 3;
  group.add(ring);
}

function buildTablet(group, accent) {
  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.65, 0.06),
    makeMat(accent, { roughness: 0.8 }),
  );
  group.add(slab);

  for (let i = 0; i < 4; i += 1) {
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.015, 0.01),
      makeMat(0x333333),
    );
    line.position.set(0, 0.15 - i * 0.1, 0.04);
    group.add(line);
  }
}

function buildTool(group, accent) {
  const handle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.05, 0.45, 8),
    makeMat(0x4a3020, { roughness: 0.9, metalness: 0 }),
  );
  handle.position.y = -0.1;
  group.add(handle);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.18, 0.12, 0.08),
    makeMat(accent, { metalness: 0.7 }),
  );
  head.position.y = 0.2;
  group.add(head);
}

function buildRelic(group, accent) {
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.28, 0),
    makeMat(accent, { roughness: 0.3, metalness: 0.5 }),
  );
  group.add(core);

  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15, 0.2, 0.08, 6),
    makeMat(MATERIAL_COLORS.obsidian, { metalness: 0.4 }),
  );
  base.position.y = -0.25;
  group.add(base);
}

const BUILDERS = {
  compass: buildCompass,
  vessel: buildVessel,
  mask: buildMask,
  crown: buildCrown,
  orb: buildOrb,
  tablet: buildTablet,
  tool: buildTool,
  relic: buildRelic,
};

export function buildProceduralArtifact(meshRecipe) {
  const group = new THREE.Group();
  group.name = 'artifact';

  const accent = hexToThreeColor(meshRecipe.accentColor);
  const builder = BUILDERS[meshRecipe.baseShape] ?? buildRelic;
  builder(group, accent);

  if (meshRecipe.materials?.length) {
    const secondary = MATERIAL_COLORS[meshRecipe.materials[0]] ?? 0x888888;
    const gem = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      makeMat(secondary, { roughness: 0.15 }),
    );
    gem.position.set(0.2, 0.2, 0.1);
    group.add(gem);
  }

  group.position.set(0, 1.55, -2);
  group.castShadow = true;
  group.userData.isArtifact = true;
  group.userData.interactPosition = new THREE.Vector3(0, 0, -2);
  group.userData.idleRotation = true;

  return group;
}

export function tickArtifactIdle(artifact, delta) {
  if (artifact?.userData.idleRotation) {
    artifact.rotation.y += delta * 0.35;
  }
}

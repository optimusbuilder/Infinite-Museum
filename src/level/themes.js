import * as THREE from 'three';
import { WORLD } from '../core/Constants.js';

function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.85,
    metalness: options.metalness ?? 0.05,
    ...options,
  });
}

function buildShell(floorMat, wallMat, ceilingMat, { withDoorways = false } = {}) {
  const { ROOM_WIDTH, ROOM_DEPTH, ROOM_HEIGHT } = WORLD;
  const group = new THREE.Group();

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
    floorMat,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  if (!withDoorways) {
    const wallGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
    const backWall = new THREE.Mesh(wallGeo, wallMat);
    backWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
    group.add(backWall);

    const frontWall = new THREE.Mesh(wallGeo, wallMat);
    frontWall.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
    frontWall.rotation.y = Math.PI;
    group.add(frontWall);
  }

  const sideGeo = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);
  const leftWall = new THREE.Mesh(sideGeo, wallMat);
  leftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  leftWall.rotation.y = Math.PI / 2;
  group.add(leftWall);

  const rightWall = new THREE.Mesh(sideGeo, wallMat);
  rightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  rightWall.rotation.y = -Math.PI / 2;
  group.add(rightWall);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
    ceilingMat,
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = ROOM_HEIGHT;
  group.add(ceiling);

  return group;
}

export const ROOM_THEMES = {
  victorian: {
    id: 'victorian',
    label: 'Victorian Hall',
    buildShell() {
      const group = buildShell(
        makeMaterial(0x3d2b1f, { roughness: 0.7 }),
        makeMaterial(0x2a1f18),
        makeMaterial(0x1a1410),
        { withDoorways: true },
      );
      const trim = new THREE.Mesh(
        new THREE.BoxGeometry(WORLD.ROOM_WIDTH, 0.15, 0.08),
        makeMaterial(0x5c4033, { roughness: 0.6 }),
      );
      trim.position.set(0, 1.2, -WORLD.ROOM_DEPTH / 2 + 0.05);
      group.add(trim);
      return group;
    },
    ambientIntensity: 0.25,
    fogColor: 0x1a1510,
    fogDensity: 0.035,
    accentColor: 0xffd89b,
    pedestalStyle: 'marble',
    doorFrameColor: 0x5c4033,
    doorGlow: 0x221100,
    corridorFloor: 0x3d2b1f,
    corridorWall: 0x2a1f18,
    corridorCeiling: 0x1a1410,
  },

  brutalist: {
    id: 'brutalist',
    label: 'Brutalist Wing',
    buildShell() {
      const group = buildShell(
        makeMaterial(0x5a5a5a, { roughness: 0.95 }),
        makeMaterial(0x707070, { roughness: 1 }),
        makeMaterial(0x404040),
        { withDoorways: true },
      );
      const ledge = new THREE.Mesh(
        new THREE.BoxGeometry(WORLD.ROOM_WIDTH, 0.3, 0.4),
        makeMaterial(0x888888),
      );
      ledge.position.set(0, 2.5, -WORLD.ROOM_DEPTH / 2 + 0.2);
      group.add(ledge);
      return group;
    },
    ambientIntensity: 0.2,
    fogColor: 0x2a2a2e,
    fogDensity: 0.03,
    accentColor: 0xc8d4ff,
    pedestalStyle: 'concrete',
    doorFrameColor: 0x606060,
    doorGlow: 0x112244,
    corridorFloor: 0x505050,
    corridorWall: 0x606060,
    corridorCeiling: 0x383838,
  },

  glass_pavilion: {
    id: 'glass_pavilion',
    label: 'Glass Pavilion',
    buildShell() {
      const group = buildShell(
        makeMaterial(0xe8e4dc, { roughness: 0.25 }),
        makeMaterial(0xf5f3ee, { roughness: 0.3 }),
        makeMaterial(0xffffff, { roughness: 0.2 }),
        { withDoorways: true },
      );
      const panelMat = makeMaterial(0xd0e8ff, {
        roughness: 0.1,
        metalness: 0.2,
        transparent: true,
        opacity: 0.35,
      });
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD.ROOM_WIDTH * 0.6, 2.5),
        panelMat,
      );
      panel.position.set(0, 1.8, -WORLD.ROOM_DEPTH / 2 + 0.1);
      group.add(panel);
      return group;
    },
    ambientIntensity: 0.45,
    fogColor: 0xd8e4f0,
    fogDensity: 0.018,
    accentColor: 0xfff4e0,
    pedestalStyle: 'marble',
    doorFrameColor: 0xc0c8d0,
    doorGlow: 0x334455,
    corridorFloor: 0xd8dce4,
    corridorWall: 0xe8ecf0,
    corridorCeiling: 0xf8f8fc,
  },

  submerged: {
    id: 'submerged',
    label: 'Submerged Archive',
    buildShell() {
      const group = buildShell(
        makeMaterial(0x2a4a4a, { roughness: 0.4 }),
        makeMaterial(0x1e3838),
        makeMaterial(0x142828),
        { withDoorways: true },
      );
      const algae = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD.ROOM_WIDTH, 1.2),
        makeMaterial(0x3a5a40, { roughness: 0.9 }),
      );
      algae.position.set(0, 0.6, -WORLD.ROOM_DEPTH / 2 + 0.06);
      group.add(algae);
      return group;
    },
    ambientIntensity: 0.22,
    fogColor: 0x0a2830,
    fogDensity: 0.045,
    accentColor: 0x7ec8b8,
    pedestalStyle: 'stone',
    doorFrameColor: 0x2a5050,
    doorGlow: 0x003333,
    corridorFloor: 0x1e3838,
    corridorWall: 0x183030,
    corridorCeiling: 0x102020,
  },

  void: {
    id: 'void',
    label: 'Void Gallery',
    buildShell() {
      const group = new THREE.Group();
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(WORLD.ROOM_WIDTH, WORLD.ROOM_DEPTH),
        makeMaterial(0x050505, { roughness: 0.15, metalness: 0.8 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      group.add(floor);

      const starCount = 120;
      const positions = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i += 1) {
        positions[i * 3] = (Math.random() - 0.5) * WORLD.ROOM_WIDTH * 2;
        positions[i * 3 + 1] = 2 + Math.random() * (WORLD.ROOM_HEIGHT + 2);
        positions[i * 3 + 2] = (Math.random() - 0.5) * WORLD.ROOM_DEPTH * 2;
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const stars = new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xccccff, size: 0.04 }),
      );
      group.add(stars);
      return group;
    },
    ambientIntensity: 0.08,
    fogColor: 0x000008,
    fogDensity: 0.02,
    accentColor: 0xaabbff,
    pedestalStyle: 'floating',
    doorFrameColor: 0x222244,
    doorGlow: 0x111133,
    corridorFloor: 0x080810,
    corridorWall: 0x101018,
    corridorCeiling: 0x000008,
  },
};

export function getTheme(themeId) {
  return ROOM_THEMES[themeId] ?? ROOM_THEMES.victorian;
}

export function buildPedestal(style) {
  const group = new THREE.Group();
  group.name = 'pedestal';

  const configs = {
    marble: { color: 0xd8d0c4, roughness: 0.4, metalness: 0.1, float: false },
    concrete: { color: 0x909090, roughness: 0.95, metalness: 0, float: false },
    stone: { color: 0x6a7a78, roughness: 0.85, metalness: 0.05, float: false },
    floating: { color: 0x333355, roughness: 0.3, metalness: 0.5, float: true },
  };
  const cfg = configs[style] ?? configs.marble;
  const mat = makeMaterial(cfg.color, { roughness: cfg.roughness, metalness: cfg.metalness });

  if (cfg.float) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.15, 32), mat);
    disc.position.y = 1.0;
    disc.castShadow = true;
    group.add(disc);
  } else {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.25, 1.4), mat);
    base.position.y = 0.125;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const column = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), mat);
    column.position.y = 0.65;
    column.castShadow = true;
    group.add(column);

    const top = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 1.1), mat);
    top.position.y = 1.16;
    top.castShadow = true;
    group.add(top);
  }

  group.position.set(0, 0, -2);
  return group;
}

export function buildExitDoor(theme) {
  const group = new THREE.Group();
  group.name = 'exit-door';

  const frameMat = makeMaterial(theme.doorFrameColor, { roughness: 0.5 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3, 0.2), frameMat);
  frame.position.set(0, 1.5, -WORLD.ROOM_DEPTH / 2 + 0.15);
  group.add(frame);

  const opening = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 2.6),
    makeMaterial(0x0a0806, { emissive: theme.doorGlow, emissiveIntensity: 0.2 }),
  );
  opening.position.set(0, 1.4, -WORLD.ROOM_DEPTH / 2 + 0.26);
  opening.name = 'exit-glow';
  group.add(opening);

  group.userData.isExit = true;
  group.userData.interactPosition = new THREE.Vector3(
    0,
    0,
    -WORLD.ROOM_DEPTH / 2 - WORLD.CORRIDOR_LENGTH + 1.2,
  );
  return group;
}

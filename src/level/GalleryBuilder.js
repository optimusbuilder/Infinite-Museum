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

function buildVictorianRoom() {
  const { ROOM_WIDTH, ROOM_DEPTH, ROOM_HEIGHT } = WORLD;
  const group = new THREE.Group();
  group.name = 'gallery-room';

  const floorMat = makeMaterial(0x3d2b1f, { roughness: 0.7 });
  const wallMat = makeMaterial(0x2a1f18);
  const trimMat = makeMaterial(0x5c4033, { roughness: 0.6 });
  const ceilingMat = makeMaterial(0x1a1410);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
    floorMat,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const wallGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
  const backWall = new THREE.Mesh(wallGeo, wallMat);
  backWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  group.add(backWall);

  const frontWall = new THREE.Mesh(wallGeo, wallMat);
  frontWall.position.set(0, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
  frontWall.rotation.y = Math.PI;
  group.add(frontWall);

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

  const trimGeo = new THREE.BoxGeometry(ROOM_WIDTH, 0.15, 0.08);
  const trim = new THREE.Mesh(trimGeo, trimMat);
  trim.position.set(0, 1.2, -ROOM_DEPTH / 2 + 0.05);
  group.add(trim);

  return {
    group,
    ambientIntensity: 0.25,
    fogColor: 0x1a1510,
    fogDensity: 0.035,
    accentColor: 0xffd89b,
    pedestalStyle: 'marble',
  };
}

function buildPedestal(style = 'marble') {
  const group = new THREE.Group();
  group.name = 'pedestal';

  const baseColor = style === 'marble' ? 0xd8d0c4 : 0x888888;
  const mat = makeMaterial(baseColor, { roughness: 0.4, metalness: 0.1 });

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

  group.position.set(0, 0, -2);
  return group;
}

function buildExitDoor() {
  const group = new THREE.Group();
  group.name = 'exit-door';

  const frameMat = makeMaterial(0x5c4033, { roughness: 0.5 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3, 0.2), frameMat);
  frame.position.set(0, 1.5, -WORLD.ROOM_DEPTH / 2 + 0.15);
  group.add(frame);

  const opening = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 2.6),
    makeMaterial(0x0a0806, { emissive: 0x221100, emissiveIntensity: 0.15 }),
  );
  opening.position.set(0, 1.4, -WORLD.ROOM_DEPTH / 2 + 0.26);
  opening.name = 'exit-glow';
  group.add(opening);

  group.userData.isExit = true;
  group.userData.interactPosition = new THREE.Vector3(0, 0, -WORLD.ROOM_DEPTH / 2 + 1.5);
  return group;
}

function buildPlaceholderArtifact() {
  const geo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
  const mat = makeMaterial(0xb8860b, { roughness: 0.35, metalness: 0.6 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'artifact';
  mesh.position.set(0, 1.55, -2);
  mesh.castShadow = true;
  mesh.userData.isArtifact = true;
  mesh.userData.interactPosition = new THREE.Vector3(0, 0, -2);
  return mesh;
}

export class GalleryBuilder {
  build(themeId = 'victorian') {
    // Only victorian in this commit — themes expanded next.
    const theme = buildVictorianRoom();
    const pedestal = buildPedestal(theme.pedestalStyle);
    const exitDoor = buildExitDoor();
    const artifact = buildPlaceholderArtifact();

    theme.group.add(pedestal);
    theme.group.add(exitDoor);
    theme.group.add(artifact);

    const spotlight = new THREE.SpotLight(theme.accentColor, 12, 18, Math.PI / 7, 0.4, 1);
    spotlight.position.set(0, 3.8, -1);
    spotlight.target.position.set(0, 1.4, -2);
    theme.group.add(spotlight);
    theme.group.add(spotlight.target);

    return {
      group: theme.group,
      themeId,
      ambientIntensity: theme.ambientIntensity,
      fogColor: theme.fogColor,
      fogDensity: theme.fogDensity,
      artifactMesh: artifact,
      exitDoor,
      spawnPosition: { x: 0, y: 1.65, z: 5 },
      collisionBounds: {
        minX: -WORLD.ROOM_WIDTH / 2 + 0.5,
        maxX: WORLD.ROOM_WIDTH / 2 - 0.5,
        minZ: -WORLD.ROOM_DEPTH / 2 + 0.5,
        maxZ: WORLD.ROOM_DEPTH / 2 - 0.5,
      },
    };
  }
}

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

function buildWallSegment(width, height, material) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  mesh.receiveShadow = true;
  return mesh;
}

/** Front/back gallery walls with a centered doorway for the corridor. */
export function buildWallWithDoorway(roomWidth, roomHeight, corridorWidth, material, z, facingBack) {
  const group = new THREE.Group();
  const sideWidth = (roomWidth - corridorWidth) / 2;

  const left = buildWallSegment(sideWidth, roomHeight, material);
  left.position.set(-(corridorWidth / 2 + sideWidth / 2), roomHeight / 2, z);
  if (facingBack) left.rotation.y = Math.PI;
  group.add(left);

  const right = buildWallSegment(sideWidth, roomHeight, material);
  right.position.set(corridorWidth / 2 + sideWidth / 2, roomHeight / 2, z);
  if (facingBack) right.rotation.y = Math.PI;
  group.add(right);

  return group;
}

export function buildCorridor(zNear, zFar, materials) {
  const { CORRIDOR_WIDTH, ROOM_HEIGHT } = WORLD;
  const length = Math.abs(zFar - zNear);
  const centerZ = (zNear + zFar) / 2;
  const group = new THREE.Group();
  group.name = 'corridor';

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_WIDTH, length),
    materials.floor,
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = centerZ;
  floor.receiveShadow = true;
  group.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.PlaneGeometry(CORRIDOR_WIDTH, length),
    materials.ceiling,
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, ROOM_HEIGHT, centerZ);
  group.add(ceiling);

  const sideGeo = new THREE.PlaneGeometry(length, ROOM_HEIGHT);
  const left = new THREE.Mesh(sideGeo, materials.wall);
  left.position.set(-CORRIDOR_WIDTH / 2, ROOM_HEIGHT / 2, centerZ);
  left.rotation.y = Math.PI / 2;
  group.add(left);

  const right = new THREE.Mesh(sideGeo, materials.wall);
  right.position.set(CORRIDOR_WIDTH / 2, ROOM_HEIGHT / 2, centerZ);
  right.rotation.y = -Math.PI / 2;
  group.add(right);

  return group;
}

export function getLayoutMetrics() {
  const { ROOM_DEPTH, CORRIDOR_LENGTH } = WORLD;
  const galleryFront = ROOM_DEPTH / 2;
  const galleryBack = -ROOM_DEPTH / 2;
  const entranceNear = galleryFront;
  const entranceFar = galleryFront + CORRIDOR_LENGTH;
  const exitNear = galleryBack - CORRIDOR_LENGTH;
  const exitFar = galleryBack;

  return {
    galleryFront,
    galleryBack,
    entranceNear,
    entranceFar,
    exitNear,
    exitFar,
    spawnZ: entranceFar - 1.5,
    exitInteractZ: exitNear + 1.2,
  };
}

export function getCorridorMaterials(theme) {
  return {
    floor: makeMaterial(theme.corridorFloor ?? 0x3d2b1f, { roughness: 0.75 }),
    wall: makeMaterial(theme.corridorWall ?? 0x2a1f18),
    ceiling: makeMaterial(theme.corridorCeiling ?? 0x1a1410),
  };
}

export function addCorridorLighting(group, theme, zNear, zFar) {
  const centerZ = (zNear + zFar) / 2;
  const light = new THREE.PointLight(theme.accentColor, 0.35, 10);
  light.position.set(0, 3.2, centerZ);
  group.add(light);
}

import * as THREE from 'three';
import { WORLD } from '../core/Constants.js';
import { buildExitDoor, buildPedestal, getTheme } from './themes.js';

function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.85,
    metalness: options.metalness ?? 0.05,
    ...options,
  });
}

function buildPlaceholderArtifact(accentColor) {
  const geo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
  const mat = makeMaterial(accentColor, { roughness: 0.35, metalness: 0.6 });
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
    const theme = getTheme(themeId);
    const group = theme.buildShell();
    group.name = 'gallery-room';

    const pedestal = buildPedestal(theme.pedestalStyle);
    const exitDoor = buildExitDoor(theme);
    const artifact = buildPlaceholderArtifact(theme.accentColor);

    group.add(pedestal);
    group.add(exitDoor);
    group.add(artifact);

    const spotlight = new THREE.SpotLight(theme.accentColor, 12, 18, Math.PI / 7, 0.4, 1);
    spotlight.position.set(0, 3.8, -1);
    spotlight.target.position.set(0, 1.4, -2);
    spotlight.castShadow = true;
    group.add(spotlight);
    group.add(spotlight.target);

    if (themeId === 'submerged') {
      const caustic = new THREE.PointLight(0x44aa99, 0.6, 12);
      caustic.position.set(-2, 2.5, -3);
      group.add(caustic);
    }

    return {
      group,
      themeId: theme.id,
      themeLabel: theme.label,
      ambientIntensity: theme.ambientIntensity,
      fogColor: theme.fogColor,
      fogDensity: theme.fogDensity,
      accentColor: theme.accentColor,
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

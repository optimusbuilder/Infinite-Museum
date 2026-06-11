import * as THREE from 'three';
import { WORLD } from '../core/Constants.js';
import { buildProceduralArtifact } from '../artifacts/ProceduralArtifact.js';
import { buildExitDoor, buildPedestal, getTheme } from './themes.js';

export class GalleryBuilder {
  build(themeId = 'victorian', roomBundle = null) {
    const theme = getTheme(themeId);
    const group = theme.buildShell();
    group.name = 'gallery-room';

    const pedestal = buildPedestal(theme.pedestalStyle);
    const exitDoor = buildExitDoor(theme);
    const artifact = roomBundle?.meshRecipe
      ? buildProceduralArtifact(roomBundle.meshRecipe)
      : buildProceduralArtifact({
          baseShape: 'relic',
          accentColor: '#b8860b',
          materials: ['bronze'],
        });

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

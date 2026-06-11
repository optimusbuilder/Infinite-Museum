import * as THREE from 'three';
import { WORLD } from '../core/Constants.js';
import { buildProceduralArtifact } from '../artifacts/ProceduralArtifact.js';
import {
  addCorridorLighting,
  buildCorridor,
  buildWallWithDoorway,
  getCorridorMaterials,
  getLayoutMetrics,
} from './CorridorBuilder.js';
import { buildExitDoor, buildPedestal, getTheme } from './themes.js';

function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.85,
    metalness: options.metalness ?? 0.05,
    ...options,
  });
}

export class GalleryBuilder {
  build(themeId = 'victorian', roomBundle = null) {
    const theme = getTheme(themeId);
    const layout = getLayoutMetrics();
    const root = new THREE.Group();
    root.name = 'gallery-room';

    const gallery = theme.buildShell();
    root.add(gallery);

    const wallMat = makeMaterial(theme.corridorWall ?? 0x2a1f18);
    root.add(
      buildWallWithDoorway(
        WORLD.ROOM_WIDTH,
        WORLD.ROOM_HEIGHT,
        WORLD.CORRIDOR_WIDTH,
        wallMat,
        layout.galleryFront,
        false,
      ),
    );
    root.add(
      buildWallWithDoorway(
        WORLD.ROOM_WIDTH,
        WORLD.ROOM_HEIGHT,
        WORLD.CORRIDOR_WIDTH,
        wallMat,
        layout.galleryBack,
        true,
      ),
    );

    const corridorMats = getCorridorMaterials(theme);
    const entranceCorridor = buildCorridor(layout.entranceNear, layout.entranceFar, corridorMats);
    const exitCorridor = buildCorridor(layout.exitNear, layout.exitFar, corridorMats);
    root.add(entranceCorridor);
    root.add(exitCorridor);
    addCorridorLighting(root, theme, layout.entranceNear, layout.entranceFar);
    addCorridorLighting(root, theme, layout.exitNear, layout.exitFar);

    const pedestal = buildPedestal(theme.pedestalStyle);
    const exitDoor = buildExitDoor(theme);
    const artifact = roomBundle?.meshRecipe
      ? buildProceduralArtifact(roomBundle.meshRecipe)
      : buildProceduralArtifact({
          baseShape: 'relic',
          accentColor: '#b8860b',
          materials: ['bronze'],
        });

    root.add(pedestal);
    root.add(exitDoor);
    root.add(artifact);

    const spotlight = new THREE.SpotLight(theme.accentColor, 12, 18, Math.PI / 7, 0.4, 1);
    spotlight.position.set(0, 3.8, -1);
    spotlight.target.position.set(0, 1.4, -2);
    spotlight.castShadow = true;
    root.add(spotlight);
    root.add(spotlight.target);

    if (themeId === 'submerged') {
      const caustic = new THREE.PointLight(0x44aa99, 0.6, 12);
      caustic.position.set(-2, 2.5, -3);
      root.add(caustic);
    }

    return {
      group: root,
      themeId: theme.id,
      themeLabel: theme.label,
      ambientIntensity: theme.ambientIntensity,
      fogColor: theme.fogColor,
      fogDensity: theme.fogDensity,
      accentColor: theme.accentColor,
      artifactMesh: artifact,
      exitDoor,
      spawnPosition: { x: 0, y: 1.65, z: layout.spawnZ },
      layout,
    };
  }
}

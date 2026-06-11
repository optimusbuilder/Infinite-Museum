import { WORLD } from '../core/Constants.js';
import { getLayoutMetrics } from '../level/CorridorBuilder.js';

const MARGIN = 0.45;

export class NavigationBounds {
  constructor() {
    const layout = getLayoutMetrics();
    this.galleryHalfWidth = WORLD.ROOM_WIDTH / 2 - MARGIN;
    this.corridorHalfWidth = WORLD.CORRIDOR_WIDTH / 2 - MARGIN;
    this.zMin = layout.exitNear + MARGIN;
    this.zMax = layout.entranceFar - MARGIN;
    this.galleryFront = layout.galleryFront;
    this.galleryBack = layout.galleryBack;
  }

  clamp(x, z) {
    let halfWidth = this.galleryHalfWidth;
    if (z > this.galleryFront || z < this.galleryBack) {
      halfWidth = this.corridorHalfWidth;
    }

    return {
      x: Math.max(-halfWidth, Math.min(halfWidth, x)),
      z: Math.max(this.zMin, Math.min(this.zMax, z)),
    };
  }
}

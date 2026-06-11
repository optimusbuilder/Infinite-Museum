import { PLAYER_CONFIG } from './Constants.js';

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.game = {
      entered: false,
      paused: false,
      pointerLocked: false,
    };
    this.museum = {
      pathSeed: null,
      roomIndex: 0,
      currentRoom: null,
    };
    this.player = {
      position: { x: 0, y: PLAYER_CONFIG.EYE_HEIGHT, z: 6 },
      yaw: 0,
      pitch: 0,
      nearArtifact: false,
      nearExit: false,
    };
  }
}

export const gameState = new GameState();

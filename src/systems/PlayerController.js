import * as THREE from 'three';
import { PLAYER_CONFIG } from '../core/Constants.js';
import { eventBus } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

export class PlayerController {
  constructor(camera, input) {
    this.camera = camera;
    this.input = input;
    this.velocity = new THREE.Vector3();
    this.direction = new THREE.Vector3();
    this.moveVector = new THREE.Vector3();

    eventBus.on('input:mousemove', ({ movementX, movementY }) => {
      gameState.player.yaw -= movementX * PLAYER_CONFIG.MOUSE_SENSITIVITY;
      gameState.player.pitch -= movementY * PLAYER_CONFIG.MOUSE_SENSITIVITY;
      gameState.player.pitch = THREE.MathUtils.clamp(
        gameState.player.pitch,
        -Math.PI / 2 + 0.05,
        Math.PI / 2 - 0.05,
      );
    });
  }

  setPosition(x, y, z) {
    gameState.player.position.x = x;
    gameState.player.position.y = y;
    gameState.player.position.z = z;
    this.syncCamera();
  }

  syncCamera() {
    const { x, y, z } = gameState.player.position;
    this.camera.position.set(x, y, z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = gameState.player.yaw;
    this.camera.rotation.x = gameState.player.pitch;
  }

  update(delta, collisionBounds) {
    if (!gameState.game.entered || gameState.game.paused) return;

    const speed = this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight')
      ? PLAYER_CONFIG.SPRINT_SPEED
      : PLAYER_CONFIG.WALK_SPEED;

    this.direction.set(0, 0, 0);
    if (this.input.isDown('KeyW')) this.direction.z -= 1;
    if (this.input.isDown('KeyS')) this.direction.z += 1;
    if (this.input.isDown('KeyA')) this.direction.x -= 1;
    if (this.input.isDown('KeyD')) this.direction.x += 1;

    if (this.direction.lengthSq() > 0) {
      this.direction.normalize();
      this.moveVector.copy(this.direction);
      this.moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), gameState.player.yaw);
      this.moveVector.multiplyScalar(speed * delta);

      const nextX = gameState.player.position.x + this.moveVector.x;
      const nextZ = gameState.player.position.z + this.moveVector.z;

      if (collisionBounds.containsX(nextX)) {
        gameState.player.position.x = nextX;
      }
      if (collisionBounds.containsZ(nextZ)) {
        gameState.player.position.z = nextZ;
      }
    }

    this.syncCamera();
  }
}

export class CollisionBounds {
  constructor(minX, maxX, minZ, maxZ) {
    this.minX = minX;
    this.maxX = maxX;
    this.minZ = minZ;
    this.maxZ = maxZ;
  }

  containsX(x) {
    return x >= this.minX && x <= this.maxX;
  }

  containsZ(z) {
    return z >= this.minZ && z <= this.maxZ;
  }
}

import * as THREE from 'three';
import { PLAYER_CONFIG } from '../core/Constants.js';
import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

export class PlayerController {
  constructor(camera, input) {
    this.camera = camera;
    this.input = input;
    this.direction = new THREE.Vector3();
    this.moveVector = new THREE.Vector3();
    this.stepTimer = 0;
    this.wasMoving = false;

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
    gameState.player.yaw = 0;
    gameState.player.pitch = 0;
    this.syncCamera();
  }

  syncCamera() {
    const { x, y, z } = gameState.player.position;
    this.camera.position.set(x, y, z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = gameState.player.yaw;
    this.camera.rotation.x = gameState.player.pitch;
  }

  update(delta, navigationBounds) {
    if (!gameState.game.entered) return;

    const speed = this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight')
      ? PLAYER_CONFIG.SPRINT_SPEED
      : PLAYER_CONFIG.WALK_SPEED;

    this.direction.set(0, 0, 0);
    if (this.input.isDown('KeyW') || this.input.isDown('ArrowUp')) this.direction.z -= 1;
    if (this.input.isDown('KeyS') || this.input.isDown('ArrowDown')) this.direction.z += 1;
    if (this.input.isDown('KeyA') || this.input.isDown('ArrowLeft')) this.direction.x -= 1;
    if (this.input.isDown('KeyD') || this.input.isDown('ArrowRight')) this.direction.x += 1;

    const isMoving = this.direction.lengthSq() > 0;

    if (isMoving) {
      this.direction.normalize();
      this.moveVector.copy(this.direction);
      this.moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), gameState.player.yaw);
      this.moveVector.multiplyScalar(speed * delta);

      const nextX = gameState.player.position.x + this.moveVector.x;
      const nextZ = gameState.player.position.z + this.moveVector.z;
      const clamped = navigationBounds.clamp(nextX, nextZ);

      gameState.player.position.x = clamped.x;
      gameState.player.position.z = clamped.z;

      this.stepTimer += delta;
      const stepInterval = speed > PLAYER_CONFIG.WALK_SPEED ? 0.38 : 0.52;
      if (this.stepTimer >= stepInterval) {
        this.stepTimer = 0;
        eventBus.emit(Events.PLAYER_FOOTSTEP, { speed });
      }
    } else {
      this.stepTimer = 0;
    }

    if (isMoving !== this.wasMoving) {
      this.wasMoving = isMoving;
      eventBus.emit(Events.PLAYER_MOVE, { moving: isMoving });
    }

    this.syncCamera();
  }
}

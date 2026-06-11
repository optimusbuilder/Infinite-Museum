import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

export class InputSystem {
  constructor(domElement) {
    this.domElement = domElement;
    this.keys = new Set();
    this.enabled = false;

    this.onKeyDown = (e) => {
      if (!this.enabled) return;
      this.keys.add(e.code);
    };
    this.onKeyUp = (e) => this.keys.delete(e.code);
    this.onMouseMove = (e) => {
      if (!this.enabled || !gameState.game.pointerLocked) return;
      eventBus.emit('input:mousemove', { movementX: e.movementX, movementY: e.movementY });
    };
    this.onPointerLockChange = () => {
      const wasLocked = gameState.game.pointerLocked;
      gameState.game.pointerLocked = document.pointerLockElement === this.domElement;
      if (wasLocked && !gameState.game.pointerLocked) {
        eventBus.emit('input:pointerlockLost');
      }
    };
    this.onCanvasClick = () => {
      if (!this.enabled) return;
      if (!gameState.game.pointerLocked) {
        this.requestPointerLock();
      }
    };

    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.domElement.addEventListener('click', this.onCanvasClick);
  }

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
    this.keys.clear();
    this.exitPointerLock();
  }

  isDown(code) {
    return this.keys.has(code);
  }

  requestPointerLock() {
    this.domElement.requestPointerLock().catch(() => {
      // Pointer lock denied — WASD still works, just no mouse look.
    });
  }

  exitPointerLock() {
    if (document.pointerLockElement === this.domElement) {
      document.exitPointerLock();
    }
  }

  dispose() {
    document.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.domElement.removeEventListener('click', this.onCanvasClick);
  }
}

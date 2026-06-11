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
      if (e.code === 'Escape') this.exitPointerLock();
    };
    this.onKeyUp = (e) => this.keys.delete(e.code);
    this.onMouseMove = (e) => {
      if (!this.enabled || !gameState.game.pointerLocked) return;
      eventBus.emit('input:mousemove', { movementX: e.movementX, movementY: e.movementY });
    };
    this.onPointerLockChange = () => {
      gameState.game.pointerLocked = document.pointerLockElement === this.domElement;
      if (!gameState.game.pointerLocked && gameState.game.entered) {
        gameState.game.paused = true;
        eventBus.emit(Events.GAME_PAUSE, { paused: true });
      }
    };
    this.onClick = () => {
      if (!this.enabled || gameState.game.pointerLocked) return;
      this.requestPointerLock();
    };

    document.addEventListener('keydown', this.onKeyDown);
    document.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    document.addEventListener('click', this.onClick);
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
    this.domElement.requestPointerLock();
    gameState.game.paused = false;
    eventBus.emit(Events.GAME_PAUSE, { paused: false });
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
    document.removeEventListener('click', this.onClick);
  }
}

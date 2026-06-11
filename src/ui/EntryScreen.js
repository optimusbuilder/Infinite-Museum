import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

export class EntryScreen {
  constructor(root = document.getElementById('ui-root')) {
    this.root = root;
    this.el = document.createElement('div');
    this.el.id = 'entry-screen';
    this.el.innerHTML = `
      <div class="entry-content">
        <p class="entry-eyebrow">An endless collection</p>
        <h1>The Infinite Museum</h1>
        <p class="entry-tagline">Walk through endless museums of things that never existed.</p>
        <button type="button" class="entry-btn" id="enter-btn">Enter the museum</button>
        <p class="entry-hint">WASD to walk · click to look · E at the exit for the next room</p>
      </div>
    `;
    this.root.appendChild(this.el);

    this.el.querySelector('#enter-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      this.enter();
    });
  }

  enter() {
    this.el.classList.add('hidden');
    eventBus.emit(Events.GAME_ENTER);
  }
}

export class HintUI {
  constructor(root = document.getElementById('ui-root')) {
    this.root = root;
    this.el = document.createElement('div');
    this.el.id = 'hint-bar';
    this.el.className = 'hidden';
    this.root.appendChild(this.el);

    this.crosshair = document.createElement('div');
    this.crosshair.id = 'crosshair';
    this.crosshair.className = 'hidden';
    this.root.appendChild(this.crosshair);

    this.clickHint = document.createElement('div');
    this.clickHint.id = 'click-hint';
    this.clickHint.className = 'hidden';
    this.clickHint.textContent = 'Click to look around';
    this.root.appendChild(this.clickHint);

    eventBus.on(Events.GAME_ENTER, () => {
      this.el.classList.remove('hidden');
      this.el.textContent = 'Use WASD to walk · click to enable mouse look';
      this.clickHint.classList.remove('hidden');
    });

    eventBus.on('input:pointerlockLost', () => {
      this.crosshair.classList.add('hidden');
      this.clickHint.classList.remove('hidden');
    });

    document.addEventListener('pointerlockchange', () => {
      if (gameState.game.pointerLocked) {
        this.crosshair.classList.remove('hidden');
        this.clickHint.classList.add('hidden');
        this.el.textContent = 'WASD to walk · E at the exit for the next room';
      }
    });

    eventBus.on(Events.PLAYER_NEAR_EXIT, () => {
      this.el.textContent = 'Press E to enter the next gallery';
      this.el.classList.add('active');
    });
    eventBus.on(Events.PLAYER_LEAVE_EXIT, () => {
      this.el.classList.remove('active');
    });
    eventBus.on(Events.ROOM_LOADED, () => {
      this.el.classList.remove('active');
    });
  }
}

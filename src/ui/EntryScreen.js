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
        <p class="entry-hint">WASD to walk · mouse to look · E at the exit for the next room</p>
        <p class="entry-share">Share a room: <code>?room=your-seed</code></p>
      </div>
    `;
    this.root.appendChild(this.el);

    this.el.querySelector('#enter-btn').addEventListener('click', () => this.enter());

    eventBus.on(Events.GAME_ENTER, () => this.hide());
    eventBus.on(Events.GAME_PAUSE, ({ paused }) => {
      if (paused && gameState.game.entered) this.showPauseOverlay();
      else this.hidePauseOverlay();
    });
  }

  enter() {
    eventBus.emit(Events.GAME_ENTER);
  }

  hide() {
    this.el.classList.add('hidden');
  }

  showPauseOverlay() {
    if (!this.pauseEl) {
      this.pauseEl = document.createElement('div');
      this.pauseEl.id = 'pause-overlay';
      this.pauseEl.innerHTML = `
        <p>Paused</p>
        <p class="pause-hint">Click to continue</p>
      `;
      this.root.appendChild(this.pauseEl);
    }
    this.pauseEl.classList.remove('hidden');
  }

  hidePauseOverlay() {
    if (this.pauseEl) this.pauseEl.classList.add('hidden');
  }
}

export class HintUI {
  constructor(root = document.getElementById('ui-root')) {
    this.root = root;
    this.el = document.createElement('div');
    this.el.id = 'hint-bar';
    this.el.className = 'hidden';
    this.el.textContent = 'Press E to enter the next gallery';
    this.root.appendChild(this.el);

    eventBus.on(Events.GAME_ENTER, () => this.el.classList.remove('hidden'));
    eventBus.on(Events.PLAYER_NEAR_EXIT, () => {
      this.el.textContent = 'Press E at the end of the corridor to enter the next gallery';
      this.el.classList.add('active');
    });
    eventBus.on(Events.PLAYER_LEAVE_EXIT, () => {
      this.el.classList.remove('active');
    });
    eventBus.on(Events.ROOM_LOADED, (room) => {
      if (room) {
        this.el.dataset.room = `${room.roomIndex ?? ''}`;
      }
    });
  }
}

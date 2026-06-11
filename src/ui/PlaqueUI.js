import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { THEME_LABELS } from '../core/Constants.js';

export class PlaqueUI {
  constructor(root = document.getElementById('ui-root')) {
    this.root = root;
    this.el = document.createElement('div');
    this.el.id = 'plaque';
    this.el.className = 'plaque hidden';
    this.el.innerHTML = `
      <div class="plaque-theme"></div>
      <h2 class="plaque-title"></h2>
      <p class="plaque-meta"></p>
      <hr class="plaque-divider" />
      <p class="plaque-body"></p>
      <p class="plaque-curator"></p>
    `;
    this.root.appendChild(this.el);

    this.themeEl = this.el.querySelector('.plaque-theme');
    this.titleEl = this.el.querySelector('.plaque-title');
    this.metaEl = this.el.querySelector('.plaque-meta');
    this.bodyEl = this.el.querySelector('.plaque-body');
    this.curatorEl = this.el.querySelector('.plaque-curator');

    eventBus.on(Events.PLAYER_NEAR_ARTIFACT, ({ room }) => this.show(room));
    eventBus.on(Events.PLAYER_LEAVE_ARTIFACT, () => this.hide());
    eventBus.on(Events.ROOM_LOADED, () => this.hide());
  }

  show(room) {
    if (!room) room = gameState.museum.currentRoom;
    if (!room) return;

    this.themeEl.textContent = THEME_LABELS[room.themeId] ?? room.themeId;
    this.titleEl.textContent = room.artifactName;
    this.metaEl.textContent = `${room.civilization} · c. ${room.era} · ${room.wing}`;
    this.bodyEl.textContent = room.description;
    this.curatorEl.textContent = room.curatorNote ?? '';
    this.curatorEl.style.display = room.curatorNote ? 'block' : 'none';

    this.el.classList.remove('hidden');
    eventBus.emit(Events.PLAQUE_SHOW, room);
  }

  hide() {
    this.el.classList.add('hidden');
    eventBus.emit(Events.PLAQUE_HIDE);
  }
}

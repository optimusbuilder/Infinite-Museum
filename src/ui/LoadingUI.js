import { eventBus, Events } from '../core/EventBus.js';

export class LoadingUI {
  constructor(root = document.getElementById('ui-root')) {
    this.root = root;
    this.el = document.createElement('div');
    this.el.id = 'loading-overlay';
    this.el.className = 'hidden';
    this.el.innerHTML = `
      <p class="loading-title">Cataloguing exhibit</p>
      <p class="loading-sub">Consulting the archives…</p>
    `;
    this.root.appendChild(this.el);
    this.pending = 0;

    eventBus.on(Events.ROOM_GENERATING, () => this.show());
    eventBus.on(Events.ROOM_GENERATED, () => this.hide());
    eventBus.on(Events.ROOM_LOADED, () => this.hide());
  }

  show() {
    this.pending += 1;
    this.el.classList.remove('hidden');
  }

  hide() {
    this.pending = Math.max(0, this.pending - 1);
    if (this.pending === 0) {
      this.el.classList.add('hidden');
    }
  }
}

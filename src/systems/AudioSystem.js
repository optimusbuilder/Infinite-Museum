import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';

const THEME_FOOTSTEPS = {
  victorian: { freq: 180, decay: 0.12, filter: 900, gain: 0.22 },
  brutalist: { freq: 220, decay: 0.08, filter: 600, gain: 0.28 },
  glass_pavilion: { freq: 320, decay: 0.06, filter: 1400, gain: 0.18 },
  submerged: { freq: 140, decay: 0.16, filter: 500, gain: 0.2 },
  void: { freq: 260, decay: 0.1, filter: 1100, gain: 0.14 },
};

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.currentTheme = 'victorian';
    this.ambientNode = null;

    eventBus.on(Events.GAME_ENTER, () => this.start());
    eventBus.on(Events.PLAYER_FOOTSTEP, ({ speed }) => this.playFootstep(speed));
    eventBus.on(Events.ROOM_LOADED, (room) => {
      if (room?.themeId) {
        this.currentTheme = room.themeId;
        this.updateAmbient();
      }
    });
    eventBus.on(Events.GAME_PAUSE, ({ paused }) => {
      if (this.ctx?.state === 'running' && paused) this.ctx.suspend();
      else if (this.ctx?.state === 'suspended' && !paused && this.enabled) this.ctx.resume();
    });
  }

  start() {
    if (this.enabled) return;
    this.ctx = new AudioContext();
    this.enabled = true;
    this.updateAmbient();
  }

  updateAmbient() {
    if (!this.ctx) return;

    if (this.ambientNode) {
      this.ambientNode.stop();
      this.ambientNode.disconnect();
    }

    const cfg = THEME_FOOTSTEPS[this.currentTheme] ?? THEME_FOOTSTEPS.victorian;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sine';
    osc.frequency.value = 42 + cfg.filter * 0.01;
    filter.type = 'lowpass';
    filter.frequency.value = cfg.filter * 0.8;
    gain.gain.value = 0.012;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    this.ambientNode = osc;
    this.ambientGain = gain;
  }

  playFootstep(speed) {
    if (!this.ctx || !this.enabled || gameState.game.paused) return;

    const cfg = THEME_FOOTSTEPS[this.currentTheme] ?? THEME_FOOTSTEPS.victorian;
    const t = this.ctx.currentTime;
    const sprint = speed > 4;
    const freq = cfg.freq * (sprint ? 1.15 : 1);

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, t + cfg.decay);

    filter.type = 'bandpass';
    filter.frequency.value = cfg.filter;
    filter.Q.value = 0.8;

    gain.gain.setValueAtTime(cfg.gain * (sprint ? 1.1 : 1), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + cfg.decay);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + cfg.decay + 0.02);
  }
}

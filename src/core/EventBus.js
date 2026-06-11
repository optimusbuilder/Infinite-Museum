class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  once(event, callback) {
    const wrapper = (...args) => {
      this.off(event, wrapper);
      callback(...args);
    };
    this.on(event, wrapper);
  }

  off(event, callback) {
    const cbs = this.listeners.get(event);
    if (cbs) {
      cbs.delete(callback);
      if (cbs.size === 0) this.listeners.delete(event);
    }
  }

  emit(event, data) {
    const cbs = this.listeners.get(event);
    if (cbs) {
      cbs.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`EventBus error [${event}]:`, e);
        }
      });
    }
  }

  clear(event) {
    if (event) this.listeners.delete(event);
    else this.listeners.clear();
  }
}

export const eventBus = new EventBus();

export const Events = {
  GAME_ENTER: 'game:enter',
  GAME_PAUSE: 'game:pause',
  ROOM_LOADED: 'room:loaded',
  ROOM_TRANSITION: 'room:transition',
  PLAYER_NEAR_ARTIFACT: 'player:nearArtifact',
  PLAYER_LEAVE_ARTIFACT: 'player:leaveArtifact',
  PLAYER_NEAR_EXIT: 'player:nearExit',
  PLAYER_LEAVE_EXIT: 'player:leaveExit',
  PLAQUE_SHOW: 'ui:plaqueShow',
  PLAQUE_HIDE: 'ui:plaqueHide',
  PLAYER_FOOTSTEP: 'player:footstep',
  PLAYER_MOVE: 'player:move',
  ROOM_GENERATING: 'room:generating',
  ROOM_GENERATED: 'room:generated',
};

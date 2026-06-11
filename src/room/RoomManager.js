import { eventBus, Events } from '../core/EventBus.js';
import { gameState } from '../core/GameState.js';
import { generateRoomBundle } from './RoomGenerator.js';
import { RoomCache } from './RoomCache.js';
import {
  createPathSeed,
  parseUrlParams,
  roomSeed,
  updateUrl,
} from './seedUtils.js';

export class RoomManager {
  constructor() {
    this.cache = new RoomCache();
    this.prefetchPromise = null;
    this.history = [];
  }

  async init() {
    const params = parseUrlParams();

    if (params.room) {
      gameState.museum.pathSeed = params.room;
      gameState.museum.roomIndex = params.index ?? 0;
    } else if (params.path) {
      gameState.museum.pathSeed = params.path;
      gameState.museum.roomIndex = params.index ?? 0;
    } else {
      gameState.museum.pathSeed = createPathSeed();
      gameState.museum.roomIndex = 0;
    }

    const bundle = await this.loadRoomAtIndex(gameState.museum.roomIndex);
    this.prefetchNext();
    return bundle;
  }

  async loadRoomAtIndex(index) {
    const seed = roomSeed(gameState.museum.pathSeed, index);
    let bundle = await this.cache.get(seed);

    if (!bundle) {
      bundle = await generateRoomBundle(seed);
      bundle.roomIndex = index;
      await this.cache.set(bundle);
    }

    gameState.museum.roomIndex = index;
    gameState.museum.currentRoom = bundle;
    updateUrl({
      path: gameState.museum.pathSeed,
      index,
    });

    eventBus.emit(Events.ROOM_LOADED, bundle);
    return bundle;
  }

  async goForward() {
    const nextIndex = gameState.museum.roomIndex + 1;
    this.history.push(gameState.museum.roomIndex);

    const seed = roomSeed(gameState.museum.pathSeed, nextIndex);
    let bundle = await this.cache.get(seed);

    if (!bundle) {
      if (this.prefetchPromise) {
        bundle = await this.prefetchPromise;
      } else {
        bundle = await generateRoomBundle(seed);
        bundle.roomIndex = nextIndex;
        await this.cache.set(bundle);
      }
    }

    gameState.museum.roomIndex = nextIndex;
    gameState.museum.currentRoom = bundle;
    updateUrl({ path: gameState.museum.pathSeed, index: nextIndex });

    eventBus.emit(Events.ROOM_LOADED, bundle);
    this.prefetchNext();
    return bundle;
  }

  async goBack() {
    if (this.history.length === 0) return null;
    const prevIndex = this.history.pop();
    return this.loadRoomAtIndex(prevIndex);
  }

  prefetchNext() {
    const nextIndex = gameState.museum.roomIndex + 1;
    const seed = roomSeed(gameState.museum.pathSeed, nextIndex);

    this.prefetchPromise = this.cache.get(seed).then(async (cached) => {
      if (cached) return cached;
      const bundle = await generateRoomBundle(seed);
      bundle.roomIndex = nextIndex;
      await this.cache.set(bundle);
      return bundle;
    });
  }

  getShareUrl(forSeed) {
    const seed = forSeed ?? roomSeed(gameState.museum.pathSeed, gameState.museum.roomIndex);
    return `${window.location.origin}${window.location.pathname}?room=${seed}`;
  }
}

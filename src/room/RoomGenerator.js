import { eventBus, Events } from '../core/EventBus.js';
import { generateRoomBundleMock } from './ArtifactGenerator.js';

export async function generateRoomBundle(seed) {
  eventBus.emit(Events.ROOM_GENERATING, { seed });

  try {
    const res = await fetch('/api/generate-room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seed }),
    });

    if (res.ok) {
      const bundle = await res.json();
      bundle.source = bundle.source ?? 'llm';
      eventBus.emit(Events.ROOM_GENERATED, { seed, source: 'llm' });
      return bundle;
    }
  } catch (e) {
    console.warn('[RoomGenerator] API unavailable, using mock:', e.message);
  }

  const mock = generateRoomBundleMock(seed);
  mock.source = 'mock';
  eventBus.emit(Events.ROOM_GENERATED, { seed, source: 'mock' });
  return mock;
}

/** Deterministic hash from string → unsigned 32-bit integer. */
export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pickFrom(list, seed, offset = 0) {
  if (!list.length) return null;
  return list[(hashString(`${seed}:${offset}`)) % list.length];
}

export function createPathSeed() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 12);
  }
  return Math.random().toString(36).slice(2, 14);
}

export function roomSeed(pathSeed, roomIndex) {
  return `${pathSeed}:${roomIndex}`;
}

export function parseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    path: params.get('path'),
    room: params.get('room'),
    index: params.has('index') ? parseInt(params.get('index'), 10) : null,
  };
}

export function updateUrl({ path, room, index }) {
  const params = new URLSearchParams();
  if (path) params.set('path', path);
  if (room) params.set('room', room);
  if (index != null && index > 0) params.set('index', String(index));
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState({}, '', url);
}

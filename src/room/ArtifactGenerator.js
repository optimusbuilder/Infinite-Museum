import {
  ARTIFACT_SHAPES,
  FAKE_ARTIFACTS,
  FAKE_CIVILIZATIONS,
  FAKE_CURATOR_NOTES,
  FAKE_DESCRIPTIONS,
  FAKE_WINGS,
  ROOM_THEMES,
} from '../core/Constants.js';
import { hashString, pickFrom } from './seedUtils.js';

const ERAS = [
  '1042', '1187', '1264', '1401', '1533', '1678', '1734', '1819', '1891', '1907',
];

export function generateRoomBundle(seed) {
  const themeIndex = hashString(`${seed}:theme`) % ROOM_THEMES.length;
  let themeId = ROOM_THEMES[themeIndex];

  const civilization = pickFrom(FAKE_CIVILIZATIONS, seed, 1);
  if (civilization.includes('Lunar') && hashString(`${seed}:lunar`) % 10 < 7) {
    themeId = 'glass_pavilion';
  } else if (civilization.includes('Tide') && hashString(`${seed}:tide`) % 10 < 7) {
    themeId = 'submerged';
  }

  const artifactName = pickFrom(FAKE_ARTIFACTS, seed, 2);
  const era = pickFrom(ERAS, seed, 3);
  const wing = pickFrom(FAKE_WINGS, seed, 4);
  const description = pickFrom(FAKE_DESCRIPTIONS, seed, 5);
  const curatorNote = pickFrom(FAKE_CURATOR_NOTES, seed, 6);
  const baseShape = pickFrom(ARTIFACT_SHAPES, seed, 7);

  const hue = hashString(`${seed}:color`) % 360;
  const accentColor = hslToHex(hue, 45 + (hashString(`${seed}:sat`) % 30), 45 + (hashString(`${seed}:lit`) % 20));

  return {
    seed,
    themeId,
    artifactName,
    civilization,
    era,
    wing,
    description,
    curatorNote,
    meshRecipe: {
      baseShape,
      accentColor,
      materials: pickMaterials(seed),
    },
    generatedAt: new Date().toISOString(),
  };
}

function pickMaterials(seed) {
  const pool = ['bronze', 'crystal', 'obsidian', 'amber', 'silver', 'jade', 'iron'];
  const count = 1 + (hashString(`${seed}:matcount`) % 2);
  const materials = [];
  for (let i = 0; i < count; i += 1) {
    const mat = pickFrom(pool, seed, 10 + i);
    if (!materials.includes(mat)) materials.push(mat);
  }
  return materials;
}

function hslToHex(h, s, l) {
  const a = (s * Math.min(l / 100, 1 - l / 100)) / 100;
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = l / 100 - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

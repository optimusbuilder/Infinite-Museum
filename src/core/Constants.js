export const PLAYER_CONFIG = {
  WALK_SPEED: 3.2,
  SPRINT_SPEED: 5.5,
  EYE_HEIGHT: 1.65,
  MOUSE_SENSITIVITY: 0.002,
  INTERACT_DISTANCE: 2.5,
};

export const WORLD = {
  ROOM_WIDTH: 12,
  ROOM_DEPTH: 14,
  ROOM_HEIGHT: 4.5,
  CORRIDOR_LENGTH: 8,
  CORRIDOR_WIDTH: 3,
  FOG_DENSITY: 0.035,
};

export const CAMERA = {
  FOV: 70,
  NEAR: 0.05,
  FAR: 120,
};

export const COLORS = {
  FOG: 0x1a1510,
};

export const ROOM_THEMES = [
  'victorian',
  'brutalist',
  'glass_pavilion',
  'submerged',
  'void',
];

export const THEME_LABELS = {
  victorian: 'Victorian Hall',
  brutalist: 'Brutalist Wing',
  glass_pavilion: 'Glass Pavilion',
  submerged: 'Submerged Archive',
  void: 'Void Gallery',
};

export const ARTIFACT_SHAPES = [
  'painting',
  'sculpture',
  'vase',
  'weapon',
  'shield',
  'jewelry',
  'compass',
  'mask',
  'crown',
  'orb',
  'tablet',
  'relic',
];

export const FAKE_CIVILIZATIONS = [
  'Lunar Empire',
  'Amber Concordat',
  'Silk Below',
  'Obsidian Reach',
  'Verdant Synod',
  'Clockwork Hegemony',
  'Glass Republic',
  'Tidebound League',
  'Hollow Crown',
  'Starlit Prefecture',
];

export const FAKE_WINGS = [
  'Celestial Instruments',
  'Domestic Curiosities',
  'Ceremonial Objects',
  'Lost Technologies',
  'Maritime Relics',
  'Dream Archives',
];

export const FAKE_ARTIFACTS = [
  'The Time Compass',
  'The Amber Seal',
  'The Dream Loom',
  'The Tide Bell',
  'The Hollow Crown',
  'The Star Chart',
  'The Memory Vessel',
  'The Eclipse Lens',
  'The Concordat Key',
  'The Void Tablet',
];

export const FAKE_DESCRIPTIONS = [
  'Recovered from a sealed vault during the third cataloguing pass. Scholars attribute its construction to court artisans of the period.',
  'Thought to regulate ceremonial traffic between rival prefectures. Its function remains disputed among contemporary historians.',
  'Recovered intact despite conditions that should have destroyed it. The acquisition committee noted this with some discomfort.',
  'Used in rites whose documentation was later classified as "strictly decorative" by the governing synod.',
  'Attributed to the late imperial workshop. Provenance includes three contradictory ledgers and one apologetic footnote.',
];

export const FAKE_CURATOR_NOTES = [
  'Condition: suspiciously pristine.',
  'Note: previous curator refused to handle it after Tuesday.',
  'Catalogue entry amended twice. Both times without explanation.',
  'The label glue is newer than the object. We do not discuss this.',
  'Temporarily exhibited despite ongoing objections from the ceramics department.',
  null,
  null,
];

const ALLOWED_THEMES = new Set([
  'victorian', 'brutalist', 'glass_pavilion', 'submerged', 'void',
]);
const ALLOWED_SHAPES = new Set([
  'compass', 'vessel', 'mask', 'crown', 'orb', 'tablet', 'tool', 'relic',
]);
const ALLOWED_MATERIALS = new Set([
  'bronze', 'crystal', 'obsidian', 'amber', 'silver', 'jade', 'iron',
]);

const SYSTEM_PROMPT = `You invent exhibits for "The Infinite Museum" — a museum of things that never existed.

Write in a believable museum catalog voice: passive, academic, provenance-heavy. Include exactly ONE dry wink per exhibit (a deadpan aside, cataloguing oddity, or scholarly discomfort) — never outright comedy.

Rules:
- Use ONLY fictional civilizations (never real cultures or peoples)
- One concrete artifact per response
- Return valid JSON only, no markdown

JSON schema:
{
  "artifactName": "string — e.g. The Time Compass",
  "civilization": "string — fictional empire/concordat/league",
  "era": "string — year like 1734",
  "wing": "string — museum wing name",
  "description": "string — 2-3 sentences, museum label tone, includes the wink",
  "curatorNote": "string or null — optional italic footnote for the wink",
  "themeId": "one of: victorian, brutalist, glass_pavilion, submerged, void",
  "baseShape": "one of: compass, vessel, mask, crown, orb, tablet, tool, relic",
  "materials": ["1-2 from: bronze, crystal, obsidian, amber, silver, jade, iron"],
  "accentColor": "hex color like #b8860b",
  "visualPrompt": "short phrase for 3D object appearance"
}`;

export async function generateRoomFromLLM(seed, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.9,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Generate exhibit catalog entry. Seed: ${seed}. Let the seed inspire a unique civilization and object, but do not mention the seed in the output.`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty LLM response');

  const parsed = JSON.parse(content);
  return normalizeBundle(seed, parsed);
}

function normalizeBundle(seed, raw) {
  const themeId = ALLOWED_THEMES.has(raw.themeId) ? raw.themeId : 'victorian';
  const baseShape = ALLOWED_SHAPES.has(raw.baseShape) ? raw.baseShape : 'relic';
  const materials = (raw.materials ?? [])
    .filter((m) => ALLOWED_MATERIALS.has(m))
    .slice(0, 2);
  if (materials.length === 0) materials.push('bronze');

  let accentColor = raw.accentColor ?? '#b8860b';
  if (!/^#[0-9a-fA-F]{6}$/.test(accentColor)) accentColor = '#b8860b';

  return {
    seed,
    themeId,
    artifactName: String(raw.artifactName ?? 'Untitled Relic').slice(0, 120),
    civilization: String(raw.civilization ?? 'Unknown Prefecture').slice(0, 80),
    era: String(raw.era ?? 'unknown').slice(0, 20),
    wing: String(raw.wing ?? 'Miscellaneous').slice(0, 80),
    description: String(raw.description ?? '').slice(0, 600),
    curatorNote: raw.curatorNote ? String(raw.curatorNote).slice(0, 200) : null,
    visualPrompt: String(raw.visualPrompt ?? '').slice(0, 200),
    meshRecipe: {
      baseShape,
      accentColor,
      materials,
    },
    source: 'llm',
    generatedAt: new Date().toISOString(),
  };
}

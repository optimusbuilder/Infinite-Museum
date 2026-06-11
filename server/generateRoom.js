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

function userPrompt(seed) {
  return `Generate exhibit catalog entry. Seed: ${seed}. Let the seed inspire a unique civilization and object, but do not mention the seed in the output.`;
}

function parseJsonContent(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  return JSON.parse(fenced ? fenced[1].trim() : trimmed);
}

function normalizeBundle(seed, raw, source) {
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
    source,
    generatedAt: new Date().toISOString(),
  };
}

async function generateRoomFromGemini(seed, apiKey, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt(seed) }] }],
      generationConfig: {
        temperature: 0.9,
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error('Empty Gemini response');

  const parsed = parseJsonContent(content);
  return normalizeBundle(seed, parsed, 'gemini');
}

async function generateRoomFromOpenAI(seed, apiKey, model) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt(seed) },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty OpenAI response');

  const parsed = parseJsonContent(content);
  return normalizeBundle(seed, parsed, 'openai');
}

/**
 * @param {string} seed
 * @param {{ geminiKey?: string, openaiKey?: string, provider?: string, geminiModel?: string, openaiModel?: string }} options
 */
export async function generateRoomFromLLM(seed, options = {}) {
  const {
    geminiKey,
    openaiKey,
    provider = geminiKey ? 'gemini' : 'openai',
    geminiModel = 'gemini-2.0-flash',
    openaiModel = 'gpt-4o-mini',
  } = options;

  if (provider === 'gemini' && geminiKey) {
    return generateRoomFromGemini(seed, geminiKey, geminiModel);
  }
  if (provider === 'openai' && openaiKey) {
    return generateRoomFromOpenAI(seed, openaiKey, openaiModel);
  }
  if (geminiKey) {
    return generateRoomFromGemini(seed, geminiKey, geminiModel);
  }
  if (openaiKey) {
    return generateRoomFromOpenAI(seed, openaiKey, openaiModel);
  }

  throw new Error('No LLM API key configured');
}

import { generateRoomFromLLM } from '../server/generateRoom.js';

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

function resolveLlmConfig(env) {
  const geminiKey = env.GEMINI_API_KEY;
  const openaiKey = env.OPENAI_API_KEY;
  const provider = (env.LLM_PROVIDER || '').toLowerCase();

  if (!geminiKey && !openaiKey) {
    return null;
  }

  return {
    geminiKey,
    openaiKey,
    provider: provider === 'openai' ? 'openai' : provider === 'gemini' ? 'gemini' : undefined,
    geminiModel: env.GEMINI_MODEL || 'gemini-2.5-flash',
    openaiModel: env.OPENAI_MODEL || 'gpt-4o-mini',
  };
}

export function museumApiPlugin(env) {
  return {
    name: 'museum-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/generate-room' || req.method !== 'POST') {
          next();
          return;
        }

        const llmConfig = resolveLlmConfig(env);
        if (!llmConfig) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({
            error: 'Set GEMINI_API_KEY or OPENAI_API_KEY in .env to enable live generation',
          }));
          return;
        }

        try {
          const body = await readBody(req);
          const { seed } = JSON.parse(body || '{}');
          if (!seed || typeof seed !== 'string') {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'seed is required' }));
            return;
          }

          const bundle = await generateRoomFromLLM(seed, llmConfig);
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(bundle));
        } catch (e) {
          console.error('[museum-api]', e);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: e.message ?? 'Generation failed' }));
        }
      });
    },
  };
}

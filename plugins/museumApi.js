import { generateRoomFromLLM } from '../server/generateRoom.js';

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
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

        const apiKey = env.OPENAI_API_KEY;
        if (!apiKey) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'OPENAI_API_KEY not configured' }));
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

          const bundle = await generateRoomFromLLM(seed, apiKey);
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

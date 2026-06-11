import { defineConfig, loadEnv } from 'vite';
import { museumApiPlugin } from './plugins/museumApi.js';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: '.',
    publicDir: 'public',
    server: { port: 3000, open: true },
    build: { outDir: 'dist' },
    plugins: [museumApiPlugin(env)],
  };
});

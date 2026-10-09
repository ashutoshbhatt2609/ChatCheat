import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const ENV_KEYS = [
  'OPENROUTER_API_KEY', 'DEEPSEEK_API_KEY', 'GEMINI_API_KEY', 'LLM_PROVIDER', 'LLM_MODEL', 'GEMINI_MODEL',
  'GOOGLE_CLIENT_ID', 'SESSION_SECRET', 'TURSO_DATABASE_URL', 'TURSO_AUTH_TOKEN',
];

/** Serves api/*.ts during `npm run dev` the same way Vercel does in production. */
function devApi(): Plugin {
  return {
    name: 'chatcheat-dev-api',
    configureServer(server) {
      // Load .env* (including non-VITE_ vars) into process.env for the server-side handlers only.
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const k of ENV_KEYS) {
        if (env[k] && !process.env[k]) process.env[k] = env[k];
      }
      server.middlewares.use('/api', (req, res) => {
        const url = new URL(req.url ?? '/', 'http://localhost');
        const name = url.pathname.replace(/^\/+/, '');
        if (!/^[a-z]+$/.test(name)) {
          res.statusCode = 404;
          res.end();
          return;
        }
        const chunks: Buffer[] = [];
        req.on('data', (c: Buffer) => chunks.push(c));
        req.on('end', async () => {
          let body: unknown;
          try {
            const raw = Buffer.concat(chunks).toString('utf8');
            body = raw ? JSON.parse(raw) : undefined;
          } catch {
            body = undefined;
          }
          const out = {
            status(code: number) {
              res.statusCode = code;
              return out;
            },
            setHeader(n: string, v: string | string[]) {
              res.setHeader(n, v);
            },
            json(b: unknown) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(b));
            },
          };
          try {
            const mod = await server.ssrLoadModule(`/api/${name}.ts`);
            await (mod.default as (a: unknown, b: unknown) => Promise<void>)(
              {
                method: req.method,
                headers: req.headers,
                body,
                query: Object.fromEntries(url.searchParams),
                socket: req.socket,
              },
              out,
            );
          } catch (e) {
            console.error(e);
            out.status(500).json({ error: 'Server error.' });
          }
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), devApi()],
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm'],
  },
  build: {
    target: 'esnext',
  },
});

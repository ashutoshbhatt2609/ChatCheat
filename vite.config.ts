import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Serves api/analyze.ts during `npm run dev` the same way Vercel does in production. */
function devApi(): Plugin {
  return {
    name: 'chatcheat-dev-api',
    configureServer(server) {
      // Load .env* (including non-VITE_ vars) into process.env for the server-side handler only.
      const env = loadEnv(server.config.mode, process.cwd(), '');
      for (const k of ['GEMINI_API_KEY', 'GEMINI_MODEL']) {
        if (env[k] && !process.env[k]) process.env[k] = env[k];
      }
      server.middlewares.use('/api/analyze', (req, res) => {
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
          const mod = await server.ssrLoadModule('/api/analyze.ts');
          const out = {
            status(code: number) {
              res.statusCode = code;
              return out;
            },
            setHeader(n: string, v: string) {
              res.setHeader(n, v);
            },
            json(b: unknown) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(b));
            },
          };
          await (mod.default as (a: unknown, b: unknown) => Promise<void>)(
            { method: req.method, headers: req.headers, body, socket: req.socket },
            out,
          );
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

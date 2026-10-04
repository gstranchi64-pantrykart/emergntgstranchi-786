import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.PORT) {
  process.env.PORT = '3000';
}

const distServer = path.join(__dirname, 'dist', 'server.cjs');
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction && fs.existsSync(distServer)) {
  // Production (Render/Railway/etc. after `npm run build`): run the compiled bundle.
  console.log('[Entry Point] NODE_ENV=production — executing compiled dist/server.cjs');
  import(pathToFileURL(distServer).href);
} else {
  // Development / preview: always run the CURRENT TypeScript source via tsx so the
  // preview never serves a stale dist bundle (vite dev middleware + live src).
  console.log('[Entry Point] dev mode — executing server.ts via tsx');
  try {
    const { tsImport } = await import('tsx/esm/api');
    await tsImport(path.join(__dirname, 'server.ts'), import.meta.url);
  } catch (err) {
    console.error('[Entry Point] tsx failed, falling back to dist bundle:', err?.message || err);
    import(pathToFileURL(distServer).href);
  }
}

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.env.PORT) {
  process.env.PORT = '3000';
}

const distServer = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(distServer)) {
  console.log('[Index Entry] Executing compiled dist/server.cjs');
  import(pathToFileURL(distServer).href);
} else {
  console.log('[Index Entry] Executing server.ts');
  import('./server.ts');
}

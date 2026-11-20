import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// .env файлын оқу (docker compose-та айнымалылар ортадан келеді)
const envFile = join(ROOT, '.env');
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const varDir = resolve(ROOT, process.env.DATA_DIR || 'var');
mkdirSync(varDir, { recursive: true });

export const CONFIG = {
  port: Number(process.env.PORT || 8080),
  varDir,
  dataDir: join(ROOT, 'data'),
  webDir: join(ROOT, 'web', 'dist'),
  // Үтір арқылы бірнеше кілт беруге болады — тегін квота көбейеді
  geminiKeys: (process.env.GEMINI_API_KEY || '').split(',').map((s) => s.trim()).filter(Boolean),
  embedModel: process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001',
  chatModels: [...new Set([process.env.GEMINI_MODEL, 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'].filter(Boolean))] as string[],
  adminToken: process.env.ADMIN_TOKEN || '',
};

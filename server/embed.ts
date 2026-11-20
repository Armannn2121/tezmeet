// Gemini эмбеддингтері: анкета мәтінінің мағыналық векторы (kk/ru/en бір кеңістікте).
// Кэш var/embeddings.json-да сақталады — қайта іске қосқанда API-ге қайта бармаймыз.
// Кілт жоқ не API қолжетімсіз болса — сервис TF-IDF-пен жұмысын жалғастырады.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG } from './config.ts';

const MODEL = CONFIG.embedModel;
const DIM = 768;
const cacheFile = join(CONFIG.varDir, 'embeddings.json');

const cache = new Map<string, Float32Array>();
let dirty = false;

const hash = (text: string) => createHash('sha1').update(`${MODEL}|${DIM}|${text}`).digest('hex').slice(0, 20);

export function loadEmbedCache() {
  if (!existsSync(cacheFile)) return;
  try {
    const raw = JSON.parse(readFileSync(cacheFile, 'utf8')) as Record<string, number[]>;
    for (const [k, v] of Object.entries(raw)) cache.set(k, Float32Array.from(v));
  } catch (e) {
    console.warn('embeddings cache unreadable, ignoring:', (e as Error).message);
  }
}

export function saveEmbedCache() {
  if (!dirty) return;
  const out: Record<string, number[]> = {};
  for (const [k, v] of cache) out[k] = Array.from(v, (x) => Math.round(x * 1e4) / 1e4);
  writeFileSync(cacheFile, JSON.stringify(out));
  dirty = false;
}

export const embedEnabled = () => CONFIG.geminiKeys.length > 0;

export function cached(text: string): Float32Array | undefined {
  return cache.get(hash(text));
}

function normalize(v: number[]): Float32Array {
  let n = 0;
  for (const x of v) n += x * x;
  n = Math.sqrt(n) || 1;
  return Float32Array.from(v, (x) => x / n);
}

let keyIdx = 0;

// Мәтіндерді топпен векторлайды (бір сұраныста ≤ 100). Сәтсіз болса — лақтырады.
export async function embedBatch(texts: string[], timeoutMs = 20000): Promise<void> {
  const todo = [...new Set(texts)].filter((t) => !cache.has(hash(t)));
  for (let i = 0; i < todo.length; i += 100) {
    const chunk = todo.slice(i, i + 100);
    const key = CONFIG.geminiKeys[keyIdx++ % CONFIG.geminiKeys.length];
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:batchEmbedContents`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        requests: chunk.map((text) => ({
          model: `models/${MODEL}`,
          content: { parts: [{ text }] },
          taskType: 'SEMANTIC_SIMILARITY',
          outputDimensionality: DIM,
        })),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`gemini embed ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const body = (await res.json()) as { embeddings?: { values: number[] }[] };
    if (!body.embeddings || body.embeddings.length !== chunk.length) throw new Error('gemini embed: bad response');
    chunk.forEach((t, j) => cache.set(hash(t), normalize(body.embeddings![j].values)));
    dirty = true;
  }
}

export function cosine(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

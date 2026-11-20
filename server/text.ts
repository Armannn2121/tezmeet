// Мәтіндік ұқсастық: TF-IDF + косинус. Gemini кілті болмаса не жауап бермесе — семантикалық сигнал осыдан.
// Үш тілде жұмыс істейді: сөздер кіші әріпке келтіріліп, қысқа түбірге (алғашқы 6 әріп) қиылады.

import { STACK_FAMILIES } from '../shared/catalog.ts';

const STOP = new Set(
  ('и в во на с со по для из к о об от до за не что как это мы я вы он она они а но или у же ли бы то есть хочу ищу ' +
    'және мен да де бен пен мен үшін бар жоқ бұл сол біз сіз ол олар ғана деп болып еді ' +
    'the a an and or of to in on for with at by from is are am be i we you my our it this that as want looking')
    .split(/\s+/),
);

export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[\p{L}\p{N}+#.]+/gu) ?? [])
    .map((w) => w.replace(/^[.]+|[.]+$/g, ''))
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (/^[a-z0-9+#.]+$/.test(w) ? w : w.slice(0, 6)));
}

export type Vec = Map<string, number>;

export class TfIdf {
  private idf = new Map<string, number>();
  private vecs = new Map<string, Vec>();

  build(docs: { id: string; text: string }[]) {
    const df = new Map<string, number>();
    const toks = docs.map((d) => ({ id: d.id, t: tokens(d.text) }));
    for (const { t } of toks) for (const w of new Set(t)) df.set(w, (df.get(w) ?? 0) + 1);
    this.idf.clear();
    for (const [w, n] of df) this.idf.set(w, Math.log((1 + docs.length) / (1 + n)) + 1);
    this.vecs.clear();
    for (const { id, t } of toks) this.vecs.set(id, this.vectorize(t));
  }

  private vectorize(t: string[]): Vec {
    const tf = new Map<string, number>();
    for (const w of t) tf.set(w, (tf.get(w) ?? 0) + 1);
    const v: Vec = new Map();
    let norm = 0;
    for (const [w, n] of tf) {
      const x = (1 + Math.log(n)) * (this.idf.get(w) ?? 1);
      v.set(w, x);
      norm += x * x;
    }
    norm = Math.sqrt(norm) || 1;
    for (const [w, x] of v) v.set(w, x / norm);
    return v;
  }

  sim(a: string, b: string): number {
    const va = this.vecs.get(a);
    const vb = this.vecs.get(b);
    if (!va || !vb) return 0;
    const [small, big] = va.size < vb.size ? [va, vb] : [vb, va];
    let s = 0;
    for (const [w, x] of small) s += x * (big.get(w) ?? 0);
    return s;
  }
}

// ── Стек ұқсастығы ─────────────────────────────────────────────────
const norm = (s: string) => s.trim().toLowerCase();
const FAMILY_OF = new Map<string, Set<string>>();
for (const [fam, items] of Object.entries(STACK_FAMILIES)) {
  if (fam === 'people' || fam === 'tools') continue; // рекрутинг дағдылары мен Git техникалық жақындық бермейді
  for (const it of items) {
    const k = norm(it);
    if (!FAMILY_OF.has(k)) FAMILY_OF.set(k, new Set());
    FAMILY_OF.get(k)!.add(fam);
  }
}

// A-ның стегі B-мен қаншалық сәйкес: дәл сәйкестік = 1, бір отбасыдан = 0.35.
// Нәтиже: { score ∈ [0,1], shared — ортақ технологиялар }
export function stackOverlap(a: string[], b: string[]): { score: number; shared: string[] } {
  if (!a.length || !b.length) return { score: 0, shared: [] };
  const bn = new Map(b.map((x) => [norm(x), x]));
  const shared: string[] = [];
  let pts = 0;
  for (const x of a) {
    const k = norm(x);
    if (bn.has(k)) {
      shared.push(bn.get(k)!);
      pts += 1;
      continue;
    }
    const fa = FAMILY_OF.get(k);
    if (fa && b.some((y) => [...(FAMILY_OF.get(norm(y)) ?? [])].some((f) => fa.has(f)))) pts += 0.35;
  }
  // Кіші тізімге қарай нормалау: 3 технология толық сәйкес келсе — жоғары балл
  const denom = Math.max(1, Math.min(a.length, b.length, 4));
  return { score: Math.min(1, pts / denom), shared };
}

export function overlap(a: string[], b: string[]): string[] {
  const bs = new Set(b);
  return a.filter((x) => bs.has(x));
}

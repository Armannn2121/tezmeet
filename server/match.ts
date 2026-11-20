// Ұсыныс қозғалтқышы.
//
//   1. Сүзгі: мақсаттар өзара сәйкес келмесе (GOAL_FIT = 0) — көрсетілмейді.
//      Жұмыс іздеушіге басқа іздеушілер емес, жалдаушылар шығады.
//   2. Балл = 0.30·мақсат + 0.20·рөл + 0.22·стек + 0.13·мағына + 0.10·қызығушылық + 0.05·тәжірибе
//   3. Кері байланыс: «танысты» мен «сәйкес келмеді» қайта шықпайды; «сәйкес келмеді» деген
//      адамға ұқсас (рөлі мен мақсаты бірдей) кандидаттардың балы төмендейді.
//   4. Әртүрлілік (MMR): бес адам бір компаниядан не бір рөлден болмауы үшін.

import { GOAL_FIT, ROLES, roleLabel, interestLabel, type GoalId, type Lang, type RoleId } from '../shared/catalog.ts';
import type { Booth, BoothRec, Profile, Recommendation } from '../shared/types.ts';
import { cached, cosine } from './embed.ts';
import { explain, icebreaker, reasonsOf, type PairInfo } from './explain.ts';
import { TfIdf, overlap, stackOverlap } from './text.ts';

export const W = { goal: 0.3, role: 0.2, stack: 0.22, semantic: 0.13, interests: 0.1, exp: 0.05 };

// Іргелес рөлдер: жалдаушы backend іздесе, fullstack те жартылай сәйкес келеді
const RELATED: Partial<Record<RoleId, RoleId[]>> = {
  frontend: ['fullstack', 'mobile'],
  backend: ['fullstack', 'devops', 'data_engineer'],
  fullstack: ['frontend', 'backend'],
  mobile: ['frontend', 'fullstack'],
  data_scientist: ['ml_engineer', 'data_analyst'],
  ml_engineer: ['data_scientist', 'backend', 'data_engineer'],
  data_analyst: ['data_scientist', 'data_engineer', 'product_manager'],
  data_engineer: ['backend', 'data_analyst', 'devops'],
  devops: ['backend', 'security', 'data_engineer'],
  qa: ['frontend', 'backend'],
  security: ['devops', 'backend'],
  designer: ['product_manager', 'frontend'],
  product_manager: ['designer', 'project_manager', 'founder'],
  project_manager: ['product_manager'],
  cto: ['backend', 'fullstack', 'founder'],
  founder: ['cto', 'product_manager'],
  gamedev: ['frontend', 'designer'],
};

const group = (r: RoleId) => ROLES.find((x) => x.id === r)?.group ?? 'tech';

function roleFit(want: RoleId[] | undefined, r: RoleId): number {
  if (!want?.length) return 0;
  if (want.includes(r)) return 1;
  if (r === 'student') return want.some((w) => group(w) === 'tech') ? 0.45 : 0.2;
  if (want.some((w) => RELATED[w]?.includes(r))) return 0.5;
  return 0;
}

// Анкетаның мәтіндік көрінісі — эмбеддинг пен TF-IDF үшін
export function docText(p: Profile): string {
  return [
    roleLabel(p.role, 'en'),
    roleLabel(p.role, 'ru'),
    p.stack.join(', '),
    p.interests.map((i) => interestLabel(i, 'en')).join(', '),
    p.about,
  ].join('. ');
}

export class Matcher {
  tfidf = new TfIdf();
  private profiles: Profile[] = [];

  index(profiles: Profile[]) {
    this.profiles = profiles;
    this.tfidf.build(profiles.map((p) => ({ id: p.id, text: docText(p) })));
  }

  semantic(a: Profile, b: Profile): { value: number; source: 'gemini' | 'tfidf' } {
    const ea = cached(docText(a));
    const eb = ea && cached(docText(b));
    // Gemini косинусы әдетте 0.5–0.9 аралығында — [0,1]-ге созамыз
    if (ea && eb) return { value: Math.max(0, Math.min(1, (cosine(ea, eb) - 0.55) / 0.35)), source: 'gemini' };
    return { value: Math.min(1, this.tfidf.sim(a.id, b.id) * 2.2), source: 'tfidf' };
  }

  pair(a: Profile, b: Profile) {
    const g = GOAL_FIT[a.goal][b.goal];
    if (!g) return null;

    // Рөл: жұмыс іздеу ↔ жалдау жұбында шешуші — жалдаушы менің рөлімді іздей ме
    let rf: number;
    let roleHit = false;
    if (a.goal === 'job_seek' && b.goal === 'hire') {
      rf = roleFit(b.lookingFor, a.role);
      roleHit = rf === 1;
    } else if (a.goal === 'hire' && (b.goal === 'job_seek' || b.goal === 'mentor_seek')) {
      rf = roleFit(a.lookingFor, b.role);
      roleHit = rf === 1;
    } else {
      rf = 0.65 * roleFit(a.lookingFor, b.role) + 0.35 * roleFit(b.lookingFor, a.role);
      roleHit = roleFit(a.lookingFor, b.role) === 1;
    }

    const st = stackOverlap(a.stack, b.stack);
    const ints = overlap(a.interests, b.interests);
    const intScore = Math.min(1, ints.length / Math.max(1, Math.min(3, a.interests.length, b.interests.length)));
    const sem = this.semantic(a, b);
    const diff = b.experience - a.experience;

    let exp = 0.5;
    let complement = false;
    if (b.goal === 'mentor_offer') exp = diff >= 3 ? 1 : diff >= 1 ? 0.5 : 0;
    else if (b.goal === 'mentor_seek' && a.goal === 'mentor_offer') exp = -diff >= 3 ? 1 : -diff >= 1 ? 0.5 : 0;
    else if (a.goal === 'cofounder' && b.goal === 'cofounder') {
      // Кофаундер: техник + бизнес/өнім бір-бірін толықтырады
      const ga = group(a.role), gb = group(b.role);
      complement = ga !== gb && (ga === 'tech' || gb === 'tech');
      exp = complement ? 1 : 0.3;
      if (complement) rf = 1;
    } else if (b.goal === 'exchange') exp = 1 - Math.min(1, Math.abs(diff) / 8);

    // Ментор болуға мүлде тәжірибесі аз адам ұсынылмасын
    if (b.goal === 'mentor_offer' && diff < 0) return null;
    if (a.goal === 'mentor_offer' && b.goal === 'mentor_seek' && diff > 0) return null;

    // Қалған белгілер мақсат сәйкестігіне көбейтіледі: стегі ұқсас, бірақ мақсаты сәйкес емес адам
    // (мысалы, менторға жалдаушы) нағыз сәйкес адамнан жоғары шықпауы керек
    const rest = W.role * rf + W.stack * st.score + W.semantic * sem.value + W.interests * intScore + W.exp * exp;
    let score = W.goal * g + rest * (0.35 + 0.65 * g);
    if (a.goal === 'cofounder' && b.goal === 'cofounder' && !complement) score *= 0.82;
    const info: PairInfo = { sharedStack: st.shared, sharedInterests: ints, expDiff: diff, complement, roleHit, semantic: sem.value };
    return { score, g, info, semSource: sem.source };
  }

  recommend(a: Profile, lang: Lang, opts: { exclude: Set<string>; skipped: Profile[]; k?: number }) {
    const k = opts.k ?? 5;
    type C = { p: Profile; score: number; g: number; info: PairInfo };
    const cands: C[] = [];
    let semSource: 'gemini' | 'tfidf' = 'tfidf';
    for (const b of this.profiles) {
      if (b.id === a.id || opts.exclude.has(b.id)) continue;
      const r = this.pair(a, b);
      if (!r) continue;
      semSource = r.semSource;
      let score = r.score;
      // «Сәйкес келмеді» — ұқсас кандидаттарды төмендету
      for (const s of opts.skipped) {
        if (s.role === b.role && s.goal === b.goal) score *= 0.85;
        else if (s.company && s.company === b.company) score *= 0.92;
      }
      cands.push({ p: b, score, g: r.g, info: r.info });
    }
    cands.sort((x, y) => y.score - x.score);

    // MMR: жоғары балл + алдыңғылардан айырмашылық
    const pool = cands.slice(0, 40);
    const picked: C[] = [];
    while (picked.length < k && pool.length) {
      let best = 0, bestVal = -Infinity;
      pool.forEach((c, i) => {
        const red = picked.reduce((m, p) => Math.max(m,
          (p.p.role === c.p.role ? 0.5 : 0) + (p.p.goal === c.p.goal ? 0.2 : 0) + (p.p.company && p.p.company === c.p.company ? 0.3 : 0)), 0);
        const val = c.score - 0.08 * red;
        if (val > bestVal) { bestVal = val; best = i; }
      });
      picked.push(pool.splice(best, 1)[0]);
    }
    picked.sort((x, y) => y.score - x.score);

    const items: Recommendation[] = picked.map((c) => ({
      profile: c.p,
      score: Math.round(Math.min(1, c.score) * 100),
      reasons: reasonsOf(c.info, c.g),
      explanation: explain(a, c.p, c.info, lang),
      icebreaker: icebreaker(a, c.p, c.info, lang),
    }));
    return { items, semSource };
  }
}

export function recommendBooths(a: Profile, booths: Booth[], lang: Lang): BoothRec[] {
  return booths
    .map((b) => {
      const ints = overlap(a.interests, b.interests);
      const st = stackOverlap(a.stack, b.stack);
      const goalHit = b.goals.includes(a.goal as GoalId);
      const score = 0.45 * Math.min(1, ints.length / 2) + 0.35 * st.score + (goalHit ? 0.2 : 0);
      const parts = [...ints.map((i) => interestLabel(i, lang)), ...st.shared].slice(0, 3).join(', ');
      return { booth: b, score, why: `${b.tagline[lang]}${parts ? ` · ${parts}` : ''}` };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, 2)
    .map(({ booth, why }) => ({ booth, why }));
}

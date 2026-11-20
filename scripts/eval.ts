// Сапаны тексеру: 1) барлық 120 анкета үшін мақсат сәйкестігі бұзылмағанын,
// 2) уақытты (≤ 3 с шегінен әлдеқайда аз), 3) жюри стиліндегі 6 тест анкетасының топ-5-ін басып шығарады.
//   node scripts/eval.ts [--lang=kk|ru|en] [--quiet]

import { GOAL_FIT, type Lang } from '../shared/catalog.ts';
import type { Profile } from '../shared/types.ts';
import { Matcher } from '../server/match.ts';
import { readFileSync } from 'node:fs';

const lang = (process.argv.find((a) => a.startsWith('--lang='))?.split('=')[1] ?? 'ru') as Lang;
const quiet = process.argv.includes('--quiet');
const seed: Profile[] = JSON.parse(readFileSync(new URL('../data/profiles.json', import.meta.url), 'utf8'));

const base = { slots: [] as string[], lang, lookingFor: [] as Profile['lookingFor'] };
const personas: Profile[] = [
  { ...base, id: 't1', name: 'Тест Жұмыс', role: 'backend', experience: 2, stack: ['Go', 'PostgreSQL', 'Docker'], interests: ['fintech', 'cloud'], about: 'Junior Go-разработчик, ищу первую работу в финтехе, люблю высоконагруженные сервисы.', goal: 'job_seek' },
  { ...base, id: 't2', name: 'Тест HR', role: 'recruiter', experience: 5, company: 'TestCo', stack: ['Python', 'PyTorch', 'LLM'], interests: ['ai', 'career'], about: 'Нанимаем ML-инженеров и data scientists в AI-стартап, работаем с LLM.', goal: 'hire', lookingFor: ['ml_engineer', 'data_scientist'] },
  { ...base, id: 't3', name: 'Тест Студент', role: 'student', experience: 0, stack: ['Python', 'SQL'], interests: ['data', 'career'], about: 'Студент 3 курса, учу анализ данных, хочу ментора, чтобы войти в аналитику.', goal: 'mentor_seek' },
  { ...base, id: 't4', name: 'Тест Фаундер', role: 'founder', experience: 6, stack: ['Product Analytics', 'Figma'], interests: ['agritech', 'startups', 'ai'], about: 'Строю AgriTech-стартап, нужен технический кофаундер, который возьмёт на себя разработку.', goal: 'cofounder' },
  { ...base, id: 't5', name: 'Тест Ментор', role: 'devops', experience: 9, stack: ['Kubernetes', 'Terraform', 'AWS', 'Linux'], interests: ['cloud', 'teaching'], about: 'DevOps 9 лет, хочу менторить ребят, которые идут в инфраструктуру.', goal: 'mentor_offer' },
  { ...base, id: 't6', name: 'Тест Frontend', role: 'frontend', experience: 3, stack: ['React', 'TypeScript', 'Next.js'], interests: ['ecommerce', 'design'], about: 'Фронтенд-разработчик, делаю интернет-магазины на React, хочу обменяться опытом.', goal: 'exchange' },
];

const m = new Matcher();
m.index([...seed, ...personas]);

// 1) Мақсат сәйкестігі: GOAL_FIT = 0 жұптар ешқашан шықпауы керек
let violations = 0;
let reciprocal = 0;
let total = 0;
const times: number[] = [];
for (const p of seed) {
  const t0 = performance.now();
  const { items } = m.recommend(p, lang, { exclude: new Set(personas.map((x) => x.id)), skipped: [] });
  times.push(performance.now() - t0);
  for (const it of items) {
    total++;
    if (GOAL_FIT[p.goal][it.profile.goal] === 0) violations++;
    if (GOAL_FIT[p.goal][it.profile.goal] === 1) reciprocal++;
  }
}
times.sort((a, b) => a - b);
console.log(`goal violations: ${violations}/${total}`);
console.log(`primary-goal matches (fit=1): ${((reciprocal / total) * 100).toFixed(1)}%`);
console.log(`latency per user: p50 ${times[times.length >> 1].toFixed(2)} ms, max ${times[times.length - 1].toFixed(2)} ms`);

if (!quiet) {
  for (const p of personas) {
    const { items } = m.recommend(p, lang, { exclude: new Set(personas.map((x) => x.id)), skipped: [] });
    console.log(`\n■ ${p.name} — ${p.role}, ${p.goal}, [${p.stack.join(', ')}]`);
    for (const it of items) {
      const q = it.profile;
      console.log(`  ${String(it.score).padStart(3)}  ${q.name} — ${q.role}/${q.goal} [${q.stack.slice(0, 4).join(', ')}]`);
      console.log(`       ${it.explanation}`);
      console.log(`       💬 ${it.icebreaker}`);
    }
  }
}
if (violations) process.exit(1);

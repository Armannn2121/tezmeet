// Түсіндірме (1–2 сөйлем) және алғашқы фраза — үш тілде, шаблон арқылы.
// Шаблон — детерминистік әрі жылдам (<1 мс): 3 секунд шегі LLM-ге тәуелді емес.
// LLM (Gemini) кейін алғашқы фразаны жекелендіре алады — llm.ts.

import { interestLabel, roleLabel, type Lang, type RoleId } from '../shared/catalog.ts';
import type { Profile, Reason } from '../shared/types.ts';

export type PairInfo = {
  sharedStack: string[];
  sharedInterests: string[];
  expDiff: number; // B.experience - A.experience
  complement: boolean;
  roleHit: boolean;
  hiresFor: RoleId[]; // b жалдайтын рөлдер: таңдалғаны не мәтін мен стектен шығарылғаны
  semantic: number;
};

const first = (p: Profile) => p.name.split(' ')[0];

// «Backend-разработчик» → «backend-разработчик», бірақ «UI/UX дизайнер», «Data Scientist» сол күйі
function lc(s: string) {
  if (/\s[A-Z]/.test(s)) return s;
  return /^[A-ZА-ЯӘҒҚҢӨҰҮҺІЁ][a-zа-яәғқңөұүһіё]+(?=[\s-]|$)/.test(s) ? s[0].toLowerCase() + s.slice(1) : s;
}
const role = (r: RoleId, lang: Lang) => lc(roleLabel(r, lang));

function list(items: string[], lang: Lang, max = 3) {
  const xs = items.slice(0, max);
  if (xs.length <= 1) return xs.join('');
  const and = lang === 'ru' ? ' и ' : lang === 'kk' ? ' және ' : ' and ';
  return xs.slice(0, -1).join(', ') + and + xs[xs.length - 1];
}

function years(n: number, lang: Lang) {
  if (lang === 'kk') return `${n} жыл`;
  if (lang === 'en') return `${n} yr${n === 1 ? '' : 's'}`;
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? `${n} год` : [2, 3, 4].includes(m10) && ![12, 13, 14].includes(m100) ? `${n} года` : `${n} лет`;
}

// Орыс тілінде септік: «ищем backend-разработчика», «нанимает backend-разработчиков»
const RU_ACC: Record<RoleId, [string, string]> = {
  frontend: ['frontend-разработчика', 'frontend-разработчиков'], backend: ['backend-разработчика', 'backend-разработчиков'],
  fullstack: ['fullstack-разработчика', 'fullstack-разработчиков'], mobile: ['мобильного разработчика', 'мобильных разработчиков'],
  data_scientist: ['data scientist', 'data scientists'], ml_engineer: ['ML-инженера', 'ML-инженеров'], data_analyst: ['аналитика данных', 'аналитиков данных'],
  data_engineer: ['data engineer', 'data engineers'], devops: ['DevOps-инженера', 'DevOps-инженеров'], qa: ['QA-инженера', 'QA-инженеров'],
  security: ['специалиста по безопасности', 'специалистов по безопасности'], gamedev: ['GameDev-разработчика', 'GameDev-разработчиков'],
  designer: ['UI/UX дизайнера', 'UI/UX дизайнеров'], product_manager: ['продакт-менеджера', 'продакт-менеджеров'], project_manager: ['проджект-менеджера', 'проджект-менеджеров'],
  cto: ['тимлида', 'тимлидов'], founder: ['фаундера', 'фаундеров'], recruiter: ['рекрутера', 'рекрутеров'], student: ['студента', 'студентов'],
};
const EN_PLURAL: Record<RoleId, string> = {
  frontend: 'frontend developers', backend: 'backend developers', fullstack: 'fullstack developers', mobile: 'mobile developers',
  data_scientist: 'data scientists', ml_engineer: 'ML engineers', data_analyst: 'data analysts', data_engineer: 'data engineers',
  devops: 'DevOps engineers', qa: 'QA engineers', security: 'security engineers', gamedev: 'game developers', designer: 'UI/UX designers',
  product_manager: 'product managers', project_manager: 'project managers', cto: 'team leads', founder: 'founders', recruiter: 'recruiters', student: 'students',
};
const plural = (r: RoleId, lang: Lang) => (lang === 'ru' ? RU_ACC[r][1] : lang === 'en' ? EN_PLURAL[r] : role(r, lang));
const accusative = (r: RoleId, lang: Lang) => (lang === 'ru' ? RU_ACC[r][0] : role(r, lang));
const roles = (rs: RoleId[] | undefined, lang: Lang) => list((rs ?? []).map((r) => plural(r, lang)), lang, 2);

export function explain(a: Profile, b: Profile, x: PairInfo, lang: Lang): string {
  const n = first(b);
  const st = list(x.sharedStack.length ? x.sharedStack : b.stack, lang, 3);
  const shared = x.sharedStack.length > 0;
  // Қызығушылық атауларының өзінде «және/и» бар — сондықтан үтірмен және тырнақшасыз
  const ints = x.sharedInterests.slice(0, 2).map((i) => interestLabel(i, lang)).join(', ');
  const topic = x.sharedInterests[0] ? interestLabel(x.sharedInterests[0], lang) : '';
  const company = b.company ?? '';
  let s1 = '';

  if (lang === 'ru') {
    switch (b.goal) {
      case 'hire':
        s1 = `${n} нанимает ${roles(x.hiresFor, 'ru') || 'специалистов'}${company ? ` в ${company}` : ''}` +
          (a.goal === 'job_seek' && x.roleHit ? (shared ? ` — это ваша роль, и нужен ваш стек: ${st}.` : ' — это как раз ваша роль.') : shared ? ` — команде близок ваш стек: ${st}.` : '.');
        break;
      case 'job_seek':
        s1 = `${n} — ${role(b.role, 'ru')} (${b.experience ? `${years(b.experience, 'ru')} опыта` : 'без опыта'}) и ищет работу` + (shared ? ` — знает ${st}, что вам нужно.` : '.');
        break;
      case 'mentor_offer':
        // Тәжірибе айырмасы сол сөйлемнің ішінде — түсіндірме 2 сөйлемнен аспауы керек
        s1 = `${n} — ${role(b.role, 'ru')} с опытом ${years(b.experience, 'ru')}` + (x.expDiff >= 3 ? ` (на ${years(x.expDiff, 'ru')} больше вашего)` : '') +
          ` и менторит` + (shared ? ` по ${st}.` : '.');
        break;
      case 'mentor_seek':
        s1 = `${n} ищет ментора по ${st}` + (x.expDiff <= -2 ? ` — у вас на ${years(-x.expDiff, 'ru')} больше опыта.` : '.');
        break;
      case 'cofounder':
        s1 = (a.goal === 'cofounder' ? `${n} тоже ищет кофаундера` : `${n} ищет кофаундера`) +
          (x.complement ? `: ${role(b.role, 'ru')} закроет сторону, которой нет у вас.` : topic ? ` в теме «${topic}».` : '.');
        break;
      case 'exchange':
        s1 = `${n} — ${role(b.role, 'ru')}, хочет обменяться опытом` + (shared ? `; общий стек: ${st}.` : '.');
        break;
    }
    const s2 = ints ? `Общие интересы: ${ints}.` : !shared && x.semantic > 0.35 ? 'Ваши тексты «о себе» близки по смыслу.' : '';
    return [s1, s2].filter(Boolean).join(' ');
  }

  if (lang === 'kk') {
    switch (b.goal) {
      case 'hire':
        s1 = `${n}${company ? ` (${company})` : ''} жұмысқа ${roles(x.hiresFor, 'kk') || 'маман'} іздейді` +
          (a.goal === 'job_seek' && x.roleHit ? (shared ? ` — бұл сіздің рөліңіз, әрі сіздің стегіңіз керек: ${st}.` : ' — бұл дәл сіздің рөліңіз.') : shared ? ` — командасының стегі сізге жақын: ${st}.` : '.');
        break;
      case 'job_seek':
        s1 = `${n} — ${role(b.role, 'kk')}, ${b.experience ? `${years(b.experience, 'kk')} тәжірибесі бар` : 'тәжірибесі әлі жоқ'}, жұмыс іздейді` + (shared ? ` — сізге керек ${st} біледі.` : '.');
        break;
      case 'mentor_offer':
        s1 = `${n} — ${role(b.role, 'kk')}, тәжірибесі ${years(b.experience, 'kk')}` + (x.expDiff >= 3 ? ` (сізден ${years(x.expDiff, 'kk')} көп)` : '') +
          `, менторлыққа дайын` + (shared ? `: ${st}.` : '.');
        break;
      case 'mentor_seek':
        s1 = `${n} ${st} бойынша ментор іздейді` + (x.expDiff <= -2 ? ` — сіздің тәжірибеңіз ${years(-x.expDiff, 'kk')} көп.` : '.');
        break;
      case 'cofounder':
        s1 = (a.goal === 'cofounder' ? `${n} да кофаундер іздейді` : `${n} кофаундер іздейді`) +
          (x.complement ? `: ${role(b.role, 'kk')} ретінде сізде жоқ жағын жабады.` : topic ? ` («${topic}» тақырыбы).` : '.');
        break;
      case 'exchange':
        s1 = `${n} — ${role(b.role, 'kk')}, тәжірибе алмасқысы келеді` + (shared ? `; ортақ стек: ${st}.` : '.');
        break;
    }
    const s2 = ints ? `Ортақ қызығушылықтар: ${ints}.` : !shared && x.semantic > 0.35 ? '«Өзім туралы» мәтіндеріңіз мағынасы жағынан жақын.' : '';
    return [s1, s2].filter(Boolean).join(' ');
  }

  switch (b.goal) {
    case 'hire':
      s1 = `${n} is hiring ${roles(x.hiresFor, 'en') || 'specialists'}${company ? ` at ${company}` : ''}` +
        (a.goal === 'job_seek' && x.roleHit ? (shared ? ` — your role, and they need your stack: ${st}.` : ' — exactly your role.') : shared ? ` — the team uses your stack: ${st}.` : '.');
      break;
    case 'job_seek':
      s1 = `${n} is a ${role(b.role, 'en')} ${b.experience ? `with ${years(b.experience, 'en')} of experience` : 'without experience yet'} looking for a job` + (shared ? ` — knows ${st}, which you need.` : '.');
      break;
    case 'mentor_offer':
      s1 = `${n} is a ${role(b.role, 'en')} with ${years(b.experience, 'en')} of experience` + (x.expDiff >= 3 ? ` (${years(x.expDiff, 'en')} more than you)` : '') +
        ` who mentors` + (shared ? ` in ${st}.` : '.');
      break;
    case 'mentor_seek':
      s1 = `${n} is looking for a mentor in ${st}` + (x.expDiff <= -2 ? ` — you have ${years(-x.expDiff, 'en')} more experience.` : '.');
      break;
    case 'cofounder':
      s1 = (a.goal === 'cofounder' ? `${n} is also looking for a co-founder` : `${n} is looking for a co-founder`) +
        (x.complement ? `: as a ${role(b.role, 'en')} they cover the side you are missing.` : topic ? ` in ${topic}.` : '.');
      break;
    case 'exchange':
      s1 = `${n} is a ${role(b.role, 'en')} who wants to share experience` + (shared ? `; common stack: ${st}.` : '.');
      break;
  }
  const s2 = ints ? `Shared interests: ${ints}.` : !shared && x.semantic > 0.35 ? 'Your "about me" texts are close in meaning.' : '';
  return [s1, s2].filter(Boolean).join(' ');
}

export function icebreaker(a: Profile, b: Profile, x: PairInfo, lang: Lang): string {
  const n = first(b);
  const st = list(x.sharedStack.length ? x.sharedStack : b.stack, lang, 2);
  const topic = x.sharedInterests[0] ? interestLabel(x.sharedInterests[0], lang) : '';
  if (lang === 'ru') {
    switch (b.goal) {
      case 'hire': return `Здравствуйте, ${n}! Вижу, вы ищете ${roles(x.hiresFor, 'ru') || 'людей в команду'}. ${a.experience ? `У меня ${years(a.experience, 'ru')} опыта с ${list(a.stack, 'ru', 2)}` : `Я изучаю ${list(a.stack, 'ru', 2)} и ищу первую работу`} — расскажете, какие задачи у команды?`;
      case 'job_seek': return `Привет, ${n}! Мы${a.company ? ` в ${a.company}` : ''} как раз ищем ${accusative(b.role, 'ru')} со знанием ${st}. Есть 10 минут поговорить о вакансии?`;
      case 'mentor_offer': return `Привет, ${n}! Я развиваюсь в ${st}, и мне очень пригодился бы совет человека с вашим опытом. Можно задать пару вопросов о росте?`;
      case 'mentor_seek': return `Привет, ${n}! Вижу, вы изучаете ${st}. Я давно с этим работаю — могу подсказать, с чего начать. Найдём 15 минут?`;
      case 'cofounder': return `Привет, ${n}! Я тоже ищу кофаундера${topic ? ` — тема «${topic}» мне близка` : ''}. Расскажете про свою идею? А я — про свою.`;
      case 'exchange': return `Привет, ${n}! Вижу, вы тоже работаете с ${st}. Интересно сравнить: какие практики у вашей команды реально прижились?`;
    }
  }
  if (lang === 'kk') {
    switch (b.goal) {
      case 'hire': return `Сәлеметсіз бе, ${n}! Командаңызға ${roles(x.hiresFor, 'kk') || 'маман'} іздейтініңізді көрдім. ${a.experience ? `Менде ${list(a.stack, 'kk', 2)} бойынша ${years(a.experience, 'kk')} тәжірибе бар` : `Мен ${list(a.stack, 'kk', 2)} үйреніп, алғашқы жұмысымды іздеп жүрмін`} — командаңыздың міндеттері туралы айтып бересіз бе?`;
      case 'job_seek': return `Сәлем, ${n}! Біз${a.company ? ` (${a.company})` : ''} ${st} білетін ${role(b.role, 'kk')} іздеп жүрміз. Вакансия туралы 10 минут сөйлесейік пе?`;
      case 'mentor_offer': return `Сәлеметсіз бе, ${n}! Мен ${st} бағытында дамып жүрмін, сіздің тәжірибеңіздегі адамның кеңесі өте керек. Бірнеше сұрақ қоюға бола ма?`;
      case 'mentor_seek': return `Сәлем, ${n}! ${st} үйреніп жүргеніңізді көрдім. Мен бұл бағытта көптен бері жұмыс істеймін — неден бастау керегін айтып бере аламын. 15 минут табамыз ба?`;
      case 'cofounder': return `Сәлем, ${n}! Мен де кофаундер іздеп жүрмін${topic ? `, «${topic}» тақырыбы маған да жақын` : ''}. Идеяңыз туралы айтып бересіз бе? Мен де өзімдікін айтайын.`;
      case 'exchange': return `Сәлем, ${n}! Сіз де ${st} қолданады екенсіз. Командаңызда қандай тәжірибелер шынымен жұмыс істейді — салыстырып көрейік пе?`;
    }
  }
  switch (b.goal) {
    case 'hire': return `Hi ${n}! I saw you're hiring ${roles(x.hiresFor, 'en') || 'people'}. ${a.experience ? `I have ${years(a.experience, 'en')} with ${list(a.stack, 'en', 2)}` : `I'm learning ${list(a.stack, 'en', 2)} and looking for my first job`} — could you tell me what the team is working on?`;
    case 'job_seek': return `Hi ${n}! We${a.company ? ` at ${a.company}` : ''} are looking for a ${role(b.role, 'en')} who knows ${st}. Got 10 minutes to chat about the role?`;
    case 'mentor_offer': return `Hi ${n}! I'm growing in ${st} and would really value advice from someone with your experience. Mind if I ask a couple of questions?`;
    case 'mentor_seek': return `Hi ${n}! I see you're learning ${st}. I've worked with it for years — happy to share where to start. Shall we find 15 minutes?`;
    case 'cofounder': return `Hi ${n}! I'm also looking for a co-founder${topic ? ` and ${topic} is close to me too` : ''}. Want to swap ideas?`;
    case 'exchange': return `Hi ${n}! Looks like you also work with ${st}. Which practices actually stuck in your team? Would love to compare.`;
  }
}

export function reasonsOf(x: PairInfo, goalFit: number): Reason[] {
  const r: Reason[] = [{ kind: 'goal', weight: goalFit }];
  if (x.roleHit) r.push({ kind: 'role', weight: 1 });
  if (x.sharedStack.length) r.push({ kind: 'stack', weight: x.sharedStack.length, items: x.sharedStack });
  if (x.sharedInterests.length) r.push({ kind: 'interests', weight: x.sharedInterests.length, items: x.sharedInterests });
  if (x.complement) r.push({ kind: 'complement', weight: 1 });
  if (Math.abs(x.expDiff) >= 3) r.push({ kind: 'experience', weight: x.expDiff });
  if (x.semantic > 0.35) r.push({ kind: 'semantic', weight: Math.round(x.semantic * 100) / 100 });
  return r;
}

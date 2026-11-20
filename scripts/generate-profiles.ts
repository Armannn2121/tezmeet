// 120 синтетикалық анкета жасайды → data/profiles.json және data/profiles.csv
// Барлық аттар, компаниялар мен мәтіндер ойдан шығарылған; нақты профильдер қолданылмайды.
// Детерминистік: тұқым (seed) бірдей болса, файл да бірдей шығады.
//   node scripts/generate-profiles.ts

import { writeFileSync } from 'node:fs';
import { SLOTS, type GoalId, type Lang, type RoleId } from '../shared/catalog.ts';
import type { Profile } from '../shared/types.ts';

let seed = 20261121;
const rnd = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const int = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rnd() * arr.length)];
const sample = <T,>(arr: readonly T[], n: number): T[] => {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) out.push(copy.splice(Math.floor(rnd() * copy.length), 1)[0]);
  return out;
};

// ── Аттар (ойдан шығарылған тіркестер) ──────────────────────────────
const MALE = ['Арман', 'Данияр', 'Ерлан', 'Нұрсұлтан', 'Олжас', 'Темірлан', 'Әлихан', 'Бауыржан', 'Ринат', 'Санжар', 'Мади', 'Ілияс', 'Асқар', 'Дамир', 'Тимур', 'Руслан', 'Максим', 'Артём', 'Денис', 'Алексей', 'Ерасыл', 'Нұрлан', 'Айбек', 'Жандос', 'Бекзат', 'Қайрат', 'Медет', 'Ербол', 'Виктор', 'Сергей'];
const FEMALE = ['Аружан', 'Дана', 'Айгерім', 'Мадина', 'Әсел', 'Жансая', 'Камила', 'Томирис', 'Динара', 'Салтанат', 'Гүлназ', 'Аяулым', 'Інжу', 'Алина', 'Екатерина', 'Анна', 'Дарья', 'Мария', 'Ақбота', 'Жанель', 'Сабина', 'Аида', 'Назерке', 'Ұлжан', 'Виктория', 'Ольга', 'Мөлдір', 'Балжан', 'Зарина', 'Карина'];
const SURNAME_BASE = ['Ахметов', 'Сейтқали', 'Жұмабаев', 'Омаров', 'Бекенов', 'Тұрсынов', 'Сапаров', 'Исаев', 'Нұрланов', 'Қасымов', 'Мұқанов', 'Әбенов', 'Ержанов', 'Темірбеков', 'Ибраев', 'Жақсылықов', 'Серіков', 'Мусин', 'Ким', 'Иванов', 'Смагулов', 'Байжанов', 'Оспанов', 'Кәрімов', 'Рахимов', 'Шәкенов', 'Дүйсенов', 'Тоқтаров', 'Петров', 'Ли'];
const surname = (base: string, female: boolean) => {
  if (!female) return base;
  if (base.endsWith('ов') || base.endsWith('ев') || base.endsWith('ин')) return base + 'а';
  if (base === 'Сейтқали') return 'Сейтқали';
  return base;
};

const COMPANIES = ['DalaSoft', 'SteppeAI', 'NomadPay', 'AltynData', 'TumarLabs', 'KökTech', 'SamalCloud', 'AqylEdu', 'JolLogistics', 'ShanyraqHealth', 'TulparGames', 'BerkutSec', 'AspanFin', 'OrdaGovTech', 'SaryarqaAnalytics', 'QalamAI', 'IrbisMobile', 'ZhebeDev', 'AqMarket', 'BaspanaTech'];

// ── Рөл архетиптері ────────────────────────────────────────────────
type Arch = { core: string[]; extra: string[]; interests: string[] };
const ARCH: Record<RoleId, Arch> = {
  frontend: { core: ['TypeScript', 'React', 'JavaScript', 'Next.js', 'Vue'], extra: ['HTML/CSS', 'Tailwind', 'Figma', 'Node.js', 'Playwright', 'Angular'], interests: ['design', 'ecommerce', 'opensource', 'remote', 'product', 'fintech'] },
  backend: { core: ['Go', 'Python', 'Java', 'Node.js', 'C#', 'PHP'], extra: ['PostgreSQL', 'Redis', 'Kafka', 'Docker', 'Kubernetes', 'Spring', 'Django', 'FastAPI', '.NET', 'Laravel', 'NestJS', 'MongoDB'], interests: ['fintech', 'cloud', 'opensource', 'ecommerce', 'logistics', 'govtech'] },
  fullstack: { core: ['TypeScript', 'React', 'Node.js', 'Python', 'Next.js'], extra: ['PostgreSQL', 'Docker', 'NestJS', 'Django', 'Redis', 'AWS', 'Tailwind'], interests: ['startups', 'ecommerce', 'edtech', 'hackathons', 'remote', 'product'] },
  mobile: { core: ['Swift', 'Kotlin', 'Flutter', 'React Native'], extra: ['Dart', 'TypeScript', 'Figma', 'CI/CD', 'Firebase'], interests: ['mobile', 'fintech', 'design', 'ecommerce', 'healthtech', 'startups'] },
  data_scientist: { core: ['Python', 'Pandas', 'scikit-learn', 'PyTorch', 'SQL'], extra: ['TensorFlow', 'NLP', 'Computer Vision', 'Spark', 'A/B Testing', 'LLM'], interests: ['ai', 'llm', 'fintech', 'healthtech', 'agritech', 'data'] },
  ml_engineer: { core: ['Python', 'PyTorch', 'LLM', 'Docker'], extra: ['LangChain', 'TensorFlow', 'Kubernetes', 'NLP', 'Computer Vision', 'FastAPI', 'AWS'], interests: ['ai', 'llm', 'opensource', 'startups', 'cloud', 'iot'] },
  data_analyst: { core: ['SQL', 'Power BI', 'Python', 'Pandas'], extra: ['Tableau', 'ClickHouse', 'A/B Testing', 'Product Analytics', 'PostgreSQL', 'Amplitude'], interests: ['data', 'fintech', 'ecommerce', 'product', 'career', 'govtech'] },
  data_engineer: { core: ['Python', 'SQL', 'Airflow', 'Spark', 'Kafka'], extra: ['ClickHouse', 'dbt', 'PostgreSQL', 'Docker', 'AWS', 'GCP'], interests: ['data', 'cloud', 'fintech', 'opensource', 'logistics'] },
  devops: { core: ['Docker', 'Kubernetes', 'Linux', 'Terraform', 'CI/CD'], extra: ['AWS', 'GCP', 'Azure', 'Ansible', 'Prometheus', 'Go', 'Python'], interests: ['cloud', 'security', 'opensource', 'remote', 'iot'] },
  qa: { core: ['Selenium', 'Postman', 'Playwright', 'Pytest', 'Cypress'], extra: ['Python', 'JavaScript', 'JMeter', 'SQL', 'CI/CD', 'Jira'], interests: ['career', 'ecommerce', 'fintech', 'remote', 'opensource'] },
  security: { core: ['Pentest', 'Network Security', 'OWASP', 'Linux', 'SIEM'], extra: ['Python', 'Go', 'Docker', 'Kubernetes', 'C++'], interests: ['security', 'govtech', 'fintech', 'web3', 'cloud'] },
  gamedev: { core: ['Unity', 'C#', 'Unreal Engine', 'C++'], extra: ['Blender', 'Figma', 'Rust', 'Python'], interests: ['gamedev', 'design', 'startups', 'hackathons', 'web3'] },
  designer: { core: ['Figma', 'UX Research', 'Prototyping', 'Design Systems'], extra: ['HTML/CSS', 'Product Analytics', 'A/B Testing', 'Blender'], interests: ['design', 'product', 'mobile', 'edtech', 'ecommerce', 'startups'] },
  product_manager: { core: ['Jira', 'Product Analytics', 'A/B Testing', 'Agile', 'Amplitude'], extra: ['SQL', 'Figma', 'Scrum', 'UX Research', 'LLM'], interests: ['product', 'startups', 'fintech', 'edtech', 'ai', 'ecommerce'] },
  project_manager: { core: ['Jira', 'Agile', 'Scrum'], extra: ['SQL', 'Product Analytics', 'Figma', 'CI/CD'], interests: ['product', 'govtech', 'logistics', 'career', 'remote'] },
  cto: { core: ['Go', 'Python', 'Kubernetes', 'PostgreSQL', 'AWS', 'TypeScript'], extra: ['Kafka', 'Redis', 'Docker', 'Terraform', 'Java', 'React', 'LLM'], interests: ['startups', 'cloud', 'ai', 'fintech', 'teaching', 'opensource'] },
  founder: { core: ['Product Analytics', 'Agile', 'Jira'], extra: ['Figma', 'SQL', 'LLM', 'Python', 'A/B Testing'], interests: ['startups', 'fintech', 'edtech', 'agritech', 'healthtech', 'ai', 'ecommerce', 'logistics'] },
  recruiter: { core: ['Sourcing', 'Tech Interviewing', 'LinkedIn Recruiter', 'Employer Branding'], extra: ['Jira'], interests: ['career', 'remote', 'teaching', 'startups'] },
  student: { core: ['Python', 'JavaScript', 'SQL', 'Java', 'C++'], extra: ['React', 'Git', 'Pandas', 'Figma', 'HTML/CSS', 'Django', 'Flutter'], interests: ['career', 'hackathons', 'ai', 'gamedev', 'opensource', 'edtech'] },
};

// Тілі бір-бірін алмастыратын рөлдер: бір «жинақ» таңдалады
const COMMON_BE = ['PostgreSQL', 'Redis', 'Docker', 'Kafka', 'Kubernetes', 'MongoDB'];
const KITS: Partial<Record<RoleId, string[][]>> = {
  backend: [
    ['Go', 'PostgreSQL', ...COMMON_BE], ['Python', 'Django', 'FastAPI', ...COMMON_BE], ['Python', 'FastAPI', ...COMMON_BE],
    ['Java', 'Spring', ...COMMON_BE], ['Node.js', 'NestJS', 'TypeScript', ...COMMON_BE], ['C#', '.NET', ...COMMON_BE], ['PHP', 'Laravel', 'MySQL', 'Redis', 'Docker'],
  ],
  mobile: [['Swift', 'iOS', 'CI/CD', 'Figma'], ['Kotlin', 'Android', 'CI/CD', 'Figma'], ['Flutter', 'Dart', 'Firebase', 'CI/CD'], ['React Native', 'TypeScript', 'Firebase', 'CI/CD']],
  gamedev: [['Unity', 'C#', 'Blender', 'Figma'], ['Unreal Engine', 'C++', 'Blender']],
};

// Жалдаушылар нақты бағытқа адам іздейді: олардың «стегі» = вакансия стегі
const HIRING_TRACKS: { roles: RoleId[]; stack: string[]; domain: string }[] = [
  { roles: ['backend'], stack: ['Go', 'PostgreSQL', 'Kafka', 'Docker'], domain: 'fintech' },
  { roles: ['backend', 'fullstack'], stack: ['Python', 'Django', 'PostgreSQL', 'Redis'], domain: 'edtech' },
  { roles: ['frontend', 'fullstack'], stack: ['TypeScript', 'React', 'Next.js'], domain: 'ecommerce' },
  { roles: ['mobile'], stack: ['Flutter', 'Dart', 'Kotlin', 'Swift'], domain: 'fintech' },
  { roles: ['data_scientist', 'ml_engineer'], stack: ['Python', 'PyTorch', 'LLM', 'SQL'], domain: 'ai' },
  { roles: ['data_analyst', 'data_engineer'], stack: ['SQL', 'Python', 'Power BI', 'ClickHouse'], domain: 'data' },
  { roles: ['devops'], stack: ['Kubernetes', 'Terraform', 'AWS', 'Linux'], domain: 'cloud' },
  { roles: ['qa'], stack: ['Playwright', 'Postman', 'Python', 'CI/CD'], domain: 'ecommerce' },
  { roles: ['designer', 'product_manager'], stack: ['Figma', 'UX Research', 'Product Analytics'], domain: 'product' },
  { roles: ['backend', 'devops'], stack: ['Java', 'Spring', 'Kubernetes', 'PostgreSQL'], domain: 'govtech' },
  { roles: ['security'], stack: ['Pentest', 'SIEM', 'Network Security', 'Linux'], domain: 'security' },
  { roles: ['gamedev'], stack: ['Unity', 'C#', 'Blender'], domain: 'gamedev' },
];

// Квоталар: [рөл, мақсат, саны] — барлығы 120
const PLAN: [RoleId, GoalId, number][] = [
  ['recruiter', 'hire', 8], ['cto', 'hire', 7], ['founder', 'hire', 5],
  ['frontend', 'job_seek', 4], ['backend', 'job_seek', 4], ['fullstack', 'job_seek', 2], ['mobile', 'job_seek', 3],
  ['data_analyst', 'job_seek', 3], ['data_scientist', 'job_seek', 2], ['ml_engineer', 'job_seek', 2], ['qa', 'job_seek', 2],
  ['designer', 'job_seek', 2], ['devops', 'job_seek', 1], ['student', 'job_seek', 3],
  ['student', 'mentor_seek', 6], ['frontend', 'mentor_seek', 2], ['backend', 'mentor_seek', 2], ['data_analyst', 'mentor_seek', 2],
  ['designer', 'mentor_seek', 1], ['qa', 'mentor_seek', 1], ['mobile', 'mentor_seek', 1], ['product_manager', 'mentor_seek', 1],
  ['ml_engineer', 'mentor_seek', 1], ['security', 'mentor_seek', 1], ['devops', 'mentor_seek', 1], ['data_engineer', 'mentor_seek', 1],
  ['backend', 'mentor_offer', 2], ['cto', 'mentor_offer', 3], ['data_scientist', 'mentor_offer', 2], ['ml_engineer', 'mentor_offer', 1],
  ['devops', 'mentor_offer', 2], ['product_manager', 'mentor_offer', 2], ['designer', 'mentor_offer', 1], ['frontend', 'mentor_offer', 1],
  ['security', 'mentor_offer', 1], ['mobile', 'mentor_offer', 1],
  ['founder', 'cofounder', 4], ['fullstack', 'cofounder', 2], ['ml_engineer', 'cofounder', 2], ['backend', 'cofounder', 2],
  ['product_manager', 'cofounder', 2], ['designer', 'cofounder', 1], ['mobile', 'cofounder', 1], ['data_scientist', 'cofounder', 1], ['gamedev', 'cofounder', 1],
  ['frontend', 'exchange', 1], ['backend', 'exchange', 2], ['devops', 'exchange', 2], ['data_engineer', 'exchange', 2], ['qa', 'exchange', 1],
  ['security', 'exchange', 2], ['gamedev', 'exchange', 2], ['project_manager', 'exchange', 2], ['product_manager', 'exchange', 2],
  ['data_analyst', 'exchange', 1], ['mobile', 'exchange', 1], ['ml_engineer', 'exchange', 1], ['designer', 'exchange', 1],
];

const EXP: Record<GoalId, [number, number]> = {
  job_seek: [1, 4], mentor_seek: [0, 2], mentor_offer: [5, 12], hire: [3, 12], cofounder: [2, 10], exchange: [2, 8],
};

// ── «Өзім туралы» мәтіндері: kk / ru / en ─────────────────────────
const ROLE_TXT: Record<Lang, Partial<Record<RoleId, string>>> = {
  ru: { frontend: 'фронтенд-разработчик', backend: 'бэкенд-разработчик', fullstack: 'fullstack-разработчик', mobile: 'мобильный разработчик', data_scientist: 'data scientist', ml_engineer: 'ML-инженер', data_analyst: 'аналитик данных', data_engineer: 'дата-инженер', devops: 'DevOps-инженер', qa: 'QA-инженер', security: 'специалист по безопасности', gamedev: 'разработчик игр', designer: 'продуктовый дизайнер', product_manager: 'продакт-менеджер', project_manager: 'проджект-менеджер', cto: 'тимлид', founder: 'фаундер', recruiter: 'IT-рекрутер', student: 'студент' },
  kk: { frontend: 'фронтенд-әзірлеуші', backend: 'бэкенд-әзірлеуші', fullstack: 'fullstack-әзірлеуші', mobile: 'мобильді әзірлеуші', data_scientist: 'data scientist', ml_engineer: 'ML-инженер', data_analyst: 'дерек талдаушы', data_engineer: 'дата-инженер', devops: 'DevOps-инженер', qa: 'QA-инженер', security: 'қауіпсіздік маманы', gamedev: 'ойын әзірлеуші', designer: 'өнім дизайнері', product_manager: 'продакт-менеджер', project_manager: 'жоба менеджері', cto: 'тимлид', founder: 'фаундер', recruiter: 'IT-рекрутер', student: 'студент' },
  en: { frontend: 'frontend developer', backend: 'backend developer', fullstack: 'fullstack developer', mobile: 'mobile developer', data_scientist: 'data scientist', ml_engineer: 'ML engineer', data_analyst: 'data analyst', data_engineer: 'data engineer', devops: 'DevOps engineer', qa: 'QA engineer', security: 'security engineer', gamedev: 'game developer', designer: 'product designer', product_manager: 'product manager', project_manager: 'project manager', cto: 'team lead', founder: 'founder', recruiter: 'IT recruiter', student: 'student' },
};

const DOMAIN_TXT: Record<Lang, Record<string, string>> = {
  ru: { fintech: 'финтехе', edtech: 'образовании', ecommerce: 'e-commerce', ai: 'AI-продуктах', data: 'аналитике данных', cloud: 'облачной инфраструктуре', product: 'продуктовой разработке', govtech: 'госсекторе', security: 'кибербезопасности', gamedev: 'геймдеве', healthtech: 'медтехе', agritech: 'агротехе', logistics: 'логистике' },
  kk: { fintech: 'финтех', edtech: 'білім беру', ecommerce: 'e-commerce', ai: 'AI өнімдері', data: 'дерек талдау', cloud: 'бұлттық инфрақұрылым', product: 'өнім әзірлеу', govtech: 'мемлекеттік сектор', security: 'киберқауіпсіздік', gamedev: 'геймдев', healthtech: 'медтех', agritech: 'агротех', logistics: 'логистика' },
  en: { fintech: 'fintech', edtech: 'education', ecommerce: 'e-commerce', ai: 'AI products', data: 'data analytics', cloud: 'cloud infrastructure', product: 'product development', govtech: 'the public sector', security: 'cybersecurity', gamedev: 'gamedev', healthtech: 'healthtech', agritech: 'agritech', logistics: 'logistics' },
};

const INDUSTRY = ['fintech', 'edtech', 'ecommerce', 'ai', 'data', 'cloud', 'govtech', 'security', 'gamedev', 'healthtech', 'agritech', 'logistics'];

const yearsRu = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? `${n} год` : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? `${n} года` : `${n} лет`);

type Ctx = { role: RoleId; exp: number; stack: string[]; domain: string; company?: string; hireRoles?: RoleId[] };

function aboutText(lang: Lang, goal: GoalId, c: Ctx): string {
  const r = ROLE_TXT[lang][c.role]!;
  const st = c.stack.slice(0, 3).join(', ');
  const dom = DOMAIN_TXT[lang][c.domain];
  const hr = (c.hireRoles ?? []).map((x) => ROLE_TXT[lang][x]).join(lang === 'en' ? ' and ' : lang === 'ru' ? ' и ' : ' және ');
  if (lang === 'ru') {
    const exp = c.exp > 0 ? `${yearsRu(c.exp)} опыта` : 'без коммерческого опыта';
    const T: Record<GoalId, string[]> = {
      job_seek: [
        `${cap(r)}, ${exp}. Работаю с ${st}. Ищу работу в команде, которая делает продукт в ${dom}. Тестовое задание — не проблема.`,
        `${cap(r)}, ${exp}, основной стек — ${st}. Хочу перейти в продуктовую компанию в ${dom} и расти до middle+.`,
        `Последние проекты — на ${st}. ${cap(exp)}. Ищу офис или гибрид в Астане, хочу работать в ${dom}.`,
      ],
      hire: [
        `Нанимаем ${hr} в ${c.company}. Стек команды: ${st}. Работаем в ${dom}, есть гибрид и обучение.`,
        `${cap(r)} в ${c.company}. Открыты вакансии: ${hr}, важен опыт с ${st}. Быстрый процесс — 2 этапа за неделю.`,
        `Ищу сильных людей в команду ${c.company}: ${hr}. Важен опыт: ${st}. Готовы брать junior+ с хорошим потенциалом.`,
      ],
      mentor_seek: [
        `${cap(r)}, ${exp}. Учу ${st}. Ищу ментора, который поможет с планом развития и первым pet-проектом.`,
        `Начинаю путь в IT: ${st}. Нужен опытный наставник — разбирать код, готовиться к собеседованиям.`,
        `${cap(r)}, ${exp}. Хочу вырасти в ${dom}, ищу ментора с опытом в ${st}.`,
      ],
      mentor_offer: [
        `${cap(r)}, ${exp}, стек — ${st}. Могу менторить джунов: код-ревью, карьера, подготовка к собеседованиям.`,
        `${yearsRu(c.exp)} в ${dom}. Хочу помогать начинающим разобраться в ${st} и не наступать на мои грабли.`,
        `Провожу менторские сессии по ${st}. Интересно работать с теми, кто растёт в ${dom}.`,
      ],
      cofounder: [
        `${cap(r)}, ${exp}. Делаю стартап в ${dom}, есть прототип. Ищу кофаундера, который закроет то, чего не хватает команде.`,
        `Есть идея и первые пользователи в ${dom}. Стек: ${st}. Ищу партнёра в долю — техника или бизнес.`,
        `Хочу запустить свой продукт в ${dom}. Владею: ${st}. Ищу кофаундера с другой стороны — продажи или разработка.`,
      ],
      exchange: [
        `${cap(r)}, ${exp}, стек — ${st}. Хочу обменяться опытом с коллегами, кто работает в ${dom}: архитектура, процессы, инструменты.`,
        `Работаю с ${st} в ${dom}. Интересно сравнить подходы и обсудить, что у кого работает в проде.`,
        `${cap(r)}. Люблю обсуждать ${st} и практики команд. Интересны новые знакомства и совместные митапы.`,
      ],
    };
    return pick(T[goal]);
  }
  if (lang === 'kk') {
    const exp = c.exp > 0 ? `${c.exp} жыл тәжірибем бар` : 'коммерциялық тәжірибем әлі жоқ';
    const T: Record<GoalId, string[]> = {
      job_seek: [
        `Мамандығым — ${r}, ${exp}. Негізгі стегім: ${st}. ${cap(dom)} саласында өнім жасайтын командадан жұмыс іздеймін.`,
        `${cap(r)}, ${exp}. ${st} қолданамын. Астанадағы өнімдік компанияға ауысқым келеді, сала — ${dom}.`,
        `Соңғы жобаларымды ${st} арқылы жасадым. ${cap(exp)}. Тест тапсырмаға дайынмын.`,
      ],
      hire: [
        `${c.company} командасына ${hr} іздейміз. Стек: ${st}. Сала — ${dom}, гибрид формат бар.`,
        `${c.company} компаниясында ${r} болып жұмыс істеймін. Ашық вакансиялар: ${hr}. Бізге ${st} білетін адамдар керек.`,
        `${c.company} командасына күшті мамандар керек: ${hr}. ${st} маңызды. Junior+ деңгейін де қарастырамыз.`,
      ],
      mentor_seek: [
        `Мамандығым — ${r}, ${exp}. ${st} үйреніп жүрмін. Даму жоспарын құруға көмектесетін ментор іздеймін.`,
        `IT-ге енді келдім: ${st}. Кодымды қарап, сұхбатқа дайындайтын тәжірибелі тәлімгер керек.`,
        `${cap(r)}, ${exp}. ${cap(dom)} саласында өскім келеді, ${st} бойынша ментор іздеймін.`,
      ],
      mentor_offer: [
        `${cap(r)}, ${exp}, стек: ${st}. Джундарға менторлық жасауға дайынмын: код-ревью, мансап, сұхбат.`,
        `${cap(dom)} саласында ${c.exp} жыл жұмыс істедім. Жаңадан бастағандарға ${st} бойынша көмектескім келеді.`,
        `${st} бойынша менторлық сессиялар өткіземін. ${cap(dom)} саласында өсіп келе жатқандармен жұмыс істеу қызық.`,
      ],
      cofounder: [
        `${cap(r)}, ${exp}. ${cap(dom)} саласында стартап жасап жатырмын, прототип бар. Командаға жетпейтін жағын жабатын кофаундер іздеймін.`,
        `${cap(dom)} саласында идея мен алғашқы пайдаланушылар бар. Стек: ${st}. Үлеске серіктес іздеймін.`,
        `Өз өнімімді іске қосқым келеді. ${st} білемін, екінші жағын — сатылым не әзірлеуді — жабатын кофаундер керек.`,
      ],
      exchange: [
        `${cap(r)}, ${exp}, стек: ${st}. ${cap(dom)} саласындағы әріптестермен тәжірибе алмасқым келеді.`,
        `${st} арқылы ${dom} саласында жұмыс істеймін. Кімде не жұмыс істейтінін талқылау қызық.`,
        `Мамандығым — ${r}. ${st} және командалық тәжірибе туралы сөйлескенді ұнатамын. Жаңа таныстыққа ашықпын.`,
      ],
    };
    return pick(T[goal]);
  }
  const exp = c.exp > 0 ? `${c.exp} year${c.exp > 1 ? 's' : ''} of experience` : 'no commercial experience yet';
  const T: Record<GoalId, string[]> = {
    job_seek: [
      `${cap(r)} with ${exp}. I work with ${st}. Looking for a product team in ${dom}, happy to do a test task.`,
      `${cap(r)}, ${exp}, main stack is ${st}. Want to move to a product company in ${dom} and grow to middle+.`,
    ],
    hire: [
      `We are hiring ${hr} at ${c.company}. Team stack: ${st}. We build for ${dom}, hybrid format and mentoring inside.`,
      `${cap(r)} at ${c.company}. Open roles: ${hr}, must know ${st}. Fast process — two stages in a week.`,
    ],
    mentor_seek: [
      `${cap(r)}, ${exp}. Learning ${st}. Looking for a mentor to help with a growth plan and my first pet project.`,
      `Just starting in IT: ${st}. I need an experienced mentor for code reviews and interview prep.`,
    ],
    mentor_offer: [
      `${cap(r)} with ${exp}, stack: ${st}. Happy to mentor juniors: code review, career, interview prep.`,
      `${c.exp} years in ${dom}. I want to help newcomers with ${st} and save them from my mistakes.`,
    ],
    cofounder: [
      `${cap(r)}, ${exp}. Building a startup in ${dom}, prototype is ready. Looking for a co-founder to cover what the team lacks.`,
      `I have an idea and first users in ${dom}. Stack: ${st}. Looking for an equity partner — tech or business side.`,
    ],
    exchange: [
      `${cap(r)}, ${exp}, stack: ${st}. Want to swap experience with peers in ${dom}: architecture, processes, tooling.`,
      `I work with ${st} in ${dom}. Curious to compare approaches and what actually works in production.`,
    ],
  };
  return pick(T[goal]);
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Кофаундер мен басқа мақсаттар үшін «кіммен танысқым келеді»
function lookingFor(role: RoleId, goal: GoalId, hireRoles?: RoleId[]): RoleId[] {
  const tech: RoleId[] = ['backend', 'fullstack', 'ml_engineer', 'cto', 'mobile'];
  const biz: RoleId[] = ['founder', 'product_manager'];
  switch (goal) {
    case 'hire': return hireRoles ?? [];
    case 'job_seek': return ['recruiter', 'cto', 'founder'];
    case 'mentor_seek': return role === 'student' ? ['cto', 'backend', 'data_scientist'] : [role, 'cto'];
    case 'mentor_offer': return role === 'cto' ? ['student', 'backend', 'frontend'] : [role, 'student'];
    case 'cofounder': return ['founder', 'product_manager', 'designer'].includes(role) ? sample(tech, 2) : sample(biz, 1).concat(['designer']);
    case 'exchange': return [role];
  }
}

// ── Генерация ──────────────────────────────────────────────────────
const used = new Set<string>();
const profiles: Profile[] = [];
let n = 0;
let hireIdx = 0;
for (const [role, goal, count] of PLAN) {
  for (let i = 0; i < count; i++) {
    n++;
    let name = '';
    do {
      const female = rnd() < 0.45;
      name = `${pick(female ? FEMALE : MALE)} ${surname(pick(SURNAME_BASE), female)}`;
    } while (used.has(name));
    used.add(name);

    const r = rnd();
    const lang: Lang = r < 0.55 ? 'ru' : r < 0.8 ? 'kk' : 'en';
    const [lo, hi] = EXP[goal];
    const exp = role === 'student' ? int(0, 1) : role === 'cto' ? Math.max(int(lo, hi), 6) : int(lo, hi);
    const arch = ARCH[role];
    let stack: string[];
    let hireRoles: RoleId[] | undefined;
    let domain: string;
    if (goal === 'hire') {
      // Барлық бағыт кемінде бір рет жабылады: 20 жалдаушы → 12 трек
      const track = HIRING_TRACKS[hireIdx++ % HIRING_TRACKS.length];
      stack = role === 'recruiter' ? [...track.stack, ...sample(arch.core, 1)] : [...track.stack];
      hireRoles = track.roles;
      domain = track.domain;
    } else if (KITS[role]) {
      // Бір негізгі тіл + соған сай фреймворктар (мысалы, Go + PostgreSQL + Kafka)
      const kit = pick(KITS[role]!);
      stack = [...new Set([...kit.slice(0, 2), ...sample(kit.slice(2), int(1, 3))])];
      domain = pick(arch.interests);
    } else {
      stack = [...new Set([...sample(arch.core, int(2, 3)), ...sample(arch.extra, int(1, 3))])];
      domain = pick(arch.interests);
    }
    const interests = [...new Set([domain, ...sample(arch.interests, int(1, 3)), ...(rnd() < 0.3 ? [pick(['ai', 'startups', 'career', 'hackathons', 'opensource'])] : [])])]
      .filter((x) => ['ai', 'llm', 'fintech', 'edtech', 'govtech', 'ecommerce', 'healthtech', 'agritech', 'logistics', 'gamedev', 'security', 'web3', 'cloud', 'data', 'mobile', 'design', 'product', 'startups', 'opensource', 'iot', 'career', 'teaching', 'remote', 'hackathons'].includes(x));
    if (goal === 'mentor_offer' && !interests.includes('teaching')) interests.push('teaching');
    const company = ['student'].includes(role) || goal === 'job_seek' || goal === 'mentor_seek' ? undefined : pick(COMPANIES);
    // Мәтіндегі сала — нақты индустрия болуы керек («өнім әзірлеу саласында өнім жасау» болмасын)
    const textDomain = INDUSTRY.includes(domain) ? domain : pick(INDUSTRY.filter((d) => interests.includes(d)).concat(['fintech', 'ecommerce', 'edtech']));
    const ctx: Ctx = { role, exp, stack, domain: textDomain, company: company ?? 'DalaSoft', hireRoles };
    const slotCount = int(6, 14);
    profiles.push({
      id: `p${String(n).padStart(3, '0')}`,
      name,
      role,
      company,
      experience: exp,
      stack,
      interests,
      about: aboutText(lang, goal, ctx),
      goal,
      lookingFor: lookingFor(role, goal, hireRoles),
      slots: sample(SLOTS, slotCount).sort(),
      lang,
      synthetic: true,
    });
  }
}

writeFileSync(new URL('../data/profiles.json', import.meta.url), JSON.stringify(profiles, null, 2) + '\n');

const esc = (v: unknown) => {
  const s = Array.isArray(v) ? v.join('; ') : v == null ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const cols = ['id', 'name', 'role', 'company', 'experience', 'stack', 'interests', 'about', 'goal', 'lookingFor', 'slots', 'lang'] as const;
const csv = [cols.join(','), ...profiles.map((p) => cols.map((c) => esc(p[c])).join(','))].join('\n') + '\n';
writeFileSync(new URL('../data/profiles.csv', import.meta.url), '﻿' + csv);

const byGoal = profiles.reduce<Record<string, number>>((a, p) => ((a[p.goal] = (a[p.goal] ?? 0) + 1), a), {});
console.log(`profiles: ${profiles.length}`, byGoal);

// Анкетаның анықтамалықтары: рөлдер, мақсаттар, стек, қызығушылықтар, уақыт слоттары.
// Сервер де, веб-интерфейс те осы бір файлды қолданады.

export type Lang = 'kk' | 'ru' | 'en';
export type L10n = Record<Lang, string>;

export type GoalId = 'job_seek' | 'hire' | 'mentor_seek' | 'mentor_offer' | 'cofounder' | 'exchange';

export const GOALS: { id: GoalId; label: L10n; short: L10n; icon: string }[] = [
  { id: 'job_seek', icon: '💼', label: { kk: 'Жұмыс табу', ru: 'Найти работу', en: 'Find a job' }, short: { kk: 'Жұмыс іздеп жүр', ru: 'Ищет работу', en: 'Looking for a job' } },
  { id: 'hire', icon: '🤝', label: { kk: 'Маман жалдау', ru: 'Нанять', en: 'Hire' }, short: { kk: 'Маман жалдайды', ru: 'Нанимает', en: 'Hiring' } },
  { id: 'mentor_seek', icon: '🧭', label: { kk: 'Ментор табу', ru: 'Найти ментора', en: 'Find a mentor' }, short: { kk: 'Ментор іздейді', ru: 'Ищет ментора', en: 'Looking for a mentor' } },
  { id: 'mentor_offer', icon: '🎓', label: { kk: 'Ментор болу', ru: 'Стать ментором', en: 'Become a mentor' }, short: { kk: 'Менторлыққа дайын', ru: 'Готов менторить', en: 'Open to mentoring' } },
  { id: 'cofounder', icon: '🚀', label: { kk: 'Кофаундер табу', ru: 'Найти кофаундера', en: 'Find a co-founder' }, short: { kk: 'Кофаундер іздейді', ru: 'Ищет кофаундера', en: 'Looking for a co-founder' } },
  { id: 'exchange', icon: '💬', label: { kk: 'Тәжірибе алмасу', ru: 'Обмен опытом', en: 'Share experience' }, short: { kk: 'Тәжірибе алмасқысы келеді', ru: 'Хочет обменяться опытом', en: 'Wants to share experience' } },
];

// Мақсаттардың өзара сәйкестігі: GOAL_FIT[менің мақсатым][оның мақсаты] ∈ [0, 1].
// 0 — мүлде көрсетілмейді (мысалы, жұмыс іздеушіге басқа жұмыс іздеушілер).
export const GOAL_FIT: Record<GoalId, Record<GoalId, number>> = {
  job_seek: { hire: 1, mentor_offer: 0.45, exchange: 0.3, cofounder: 0.25, job_seek: 0, mentor_seek: 0 },
  hire: { job_seek: 1, mentor_seek: 0.4, exchange: 0.25, mentor_offer: 0.2, cofounder: 0.15, hire: 0 },
  mentor_seek: { mentor_offer: 1, exchange: 0.35, hire: 0.3, cofounder: 0.1, job_seek: 0, mentor_seek: 0 },
  mentor_offer: { mentor_seek: 1, job_seek: 0.4, exchange: 0.35, cofounder: 0.2, hire: 0.1, mentor_offer: 0 },
  cofounder: { cofounder: 1, mentor_offer: 0.35, exchange: 0.3, job_seek: 0.25, hire: 0.2, mentor_seek: 0 },
  exchange: { exchange: 1, mentor_offer: 0.5, cofounder: 0.4, hire: 0.35, mentor_seek: 0.35, job_seek: 0.3 },
};

export type RoleId =
  | 'frontend' | 'backend' | 'fullstack' | 'mobile' | 'data_scientist' | 'ml_engineer' | 'data_analyst'
  | 'data_engineer' | 'devops' | 'qa' | 'designer' | 'product_manager' | 'project_manager' | 'recruiter'
  | 'cto' | 'founder' | 'security' | 'gamedev' | 'student';

// group: tech — инженер, business — бизнес/өнім, people — HR. Кофаундер іздеуде бір-бірін толықтыратын рөлдер ұпай алады.
export const ROLES: { id: RoleId; group: 'tech' | 'product' | 'business' | 'people' | 'student'; label: L10n }[] = [
  { id: 'frontend', group: 'tech', label: { kk: 'Frontend-әзірлеуші', ru: 'Frontend-разработчик', en: 'Frontend developer' } },
  { id: 'backend', group: 'tech', label: { kk: 'Backend-әзірлеуші', ru: 'Backend-разработчик', en: 'Backend developer' } },
  { id: 'fullstack', group: 'tech', label: { kk: 'Fullstack-әзірлеуші', ru: 'Fullstack-разработчик', en: 'Fullstack developer' } },
  { id: 'mobile', group: 'tech', label: { kk: 'Мобильді әзірлеуші', ru: 'Мобильный разработчик', en: 'Mobile developer' } },
  { id: 'data_scientist', group: 'tech', label: { kk: 'Data Scientist', ru: 'Data Scientist', en: 'Data Scientist' } },
  { id: 'ml_engineer', group: 'tech', label: { kk: 'ML-инженер', ru: 'ML-инженер', en: 'ML engineer' } },
  { id: 'data_analyst', group: 'tech', label: { kk: 'Дерек талдаушы', ru: 'Аналитик данных', en: 'Data analyst' } },
  { id: 'data_engineer', group: 'tech', label: { kk: 'Data Engineer', ru: 'Data Engineer', en: 'Data engineer' } },
  { id: 'devops', group: 'tech', label: { kk: 'DevOps / SRE', ru: 'DevOps / SRE', en: 'DevOps / SRE' } },
  { id: 'qa', group: 'tech', label: { kk: 'QA-инженер', ru: 'QA-инженер', en: 'QA engineer' } },
  { id: 'security', group: 'tech', label: { kk: 'Киберқауіпсіздік маманы', ru: 'Специалист по кибербезопасности', en: 'Security engineer' } },
  { id: 'gamedev', group: 'tech', label: { kk: 'GameDev-әзірлеуші', ru: 'GameDev-разработчик', en: 'Game developer' } },
  { id: 'designer', group: 'product', label: { kk: 'UI/UX дизайнер', ru: 'UI/UX дизайнер', en: 'UI/UX designer' } },
  { id: 'product_manager', group: 'product', label: { kk: 'Продакт-менеджер', ru: 'Продакт-менеджер', en: 'Product manager' } },
  { id: 'project_manager', group: 'business', label: { kk: 'Жоба менеджері', ru: 'Проджект-менеджер', en: 'Project manager' } },
  { id: 'cto', group: 'tech', label: { kk: 'CTO / Тимлид', ru: 'CTO / Тимлид', en: 'CTO / Team lead' } },
  { id: 'founder', group: 'business', label: { kk: 'Фаундер / CEO', ru: 'Фаундер / CEO', en: 'Founder / CEO' } },
  { id: 'recruiter', group: 'people', label: { kk: 'IT-рекрутер / HR', ru: 'IT-рекрутер / HR', en: 'IT recruiter / HR' } },
  { id: 'student', group: 'student', label: { kk: 'Студент', ru: 'Студент', en: 'Student' } },
];

// Стек: ұқсас технологиялар бір «отбасыда» — толық сәйкес келмесе де жарты ұпай береді.
export const STACK_FAMILIES: Record<string, string[]> = {
  frontend: ['JavaScript', 'TypeScript', 'React', 'Vue', 'Angular', 'Next.js', 'HTML/CSS', 'Tailwind'],
  backend_js: ['Node.js', 'NestJS', 'Express', 'TypeScript', 'JavaScript'],
  python: ['Python', 'Django', 'FastAPI', 'Flask'],
  jvm: ['Java', 'Kotlin', 'Spring'],
  dotnet: ['C#', '.NET'],
  go: ['Go'],
  php: ['PHP', 'Laravel'],
  mobile: ['Swift', 'Kotlin', 'Flutter', 'Dart', 'React Native', 'iOS', 'Android', 'Firebase'],
  data: ['SQL', 'PostgreSQL', 'ClickHouse', 'Pandas', 'Power BI', 'Tableau', 'Airflow', 'Spark', 'Kafka', 'dbt'],
  ml: ['PyTorch', 'TensorFlow', 'scikit-learn', 'Pandas', 'LLM', 'LangChain', 'Computer Vision', 'NLP', 'Python'],
  infra: ['Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'Linux', 'CI/CD', 'Ansible', 'Prometheus'],
  db: ['PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'ClickHouse', 'SQL'],
  qa: ['Selenium', 'Playwright', 'Postman', 'Pytest', 'Cypress', 'JMeter'],
  design: ['Figma', 'UX Research', 'Prototyping', 'Design Systems'],
  product: ['Jira', 'Product Analytics', 'A/B Testing', 'Agile', 'Scrum', 'Amplitude'],
  security: ['Pentest', 'SIEM', 'OWASP', 'Network Security', 'Linux'],
  game: ['Unity', 'Unreal Engine', 'C++', 'C#', 'Blender'],
  systems: ['C++', 'Rust', 'Go'],
  web3: ['Solidity', 'Web3', 'Rust'],
  tools: ['Git', 'CI/CD', 'Linux'],
  people: ['Sourcing', 'Tech Interviewing', 'Employer Branding', 'LinkedIn Recruiter'],
};

export const STACK: string[] = [...new Set(Object.values(STACK_FAMILIES).flat())].sort((a, b) => a.localeCompare(b));

export const INTERESTS: { id: string; label: L10n }[] = [
  { id: 'ai', label: { kk: 'AI / ML', ru: 'AI / ML', en: 'AI / ML' } },
  { id: 'llm', label: { kk: 'LLM және агенттер', ru: 'LLM и агенты', en: 'LLMs & agents' } },
  { id: 'fintech', label: { kk: 'FinTech', ru: 'FinTech', en: 'FinTech' } },
  { id: 'edtech', label: { kk: 'EdTech', ru: 'EdTech', en: 'EdTech' } },
  { id: 'govtech', label: { kk: 'GovTech', ru: 'GovTech', en: 'GovTech' } },
  { id: 'ecommerce', label: { kk: 'E-commerce', ru: 'E-commerce', en: 'E-commerce' } },
  { id: 'healthtech', label: { kk: 'HealthTech', ru: 'HealthTech', en: 'HealthTech' } },
  { id: 'agritech', label: { kk: 'AgriTech', ru: 'AgriTech', en: 'AgriTech' } },
  { id: 'logistics', label: { kk: 'Логистика', ru: 'Логистика', en: 'Logistics' } },
  { id: 'gamedev', label: { kk: 'Ойындар', ru: 'Игры', en: 'Games' } },
  { id: 'security', label: { kk: 'Киберқауіпсіздік', ru: 'Кибербезопасность', en: 'Cybersecurity' } },
  { id: 'web3', label: { kk: 'Web3 / блокчейн', ru: 'Web3 / блокчейн', en: 'Web3 / blockchain' } },
  { id: 'cloud', label: { kk: 'Бұлт және DevOps', ru: 'Облака и DevOps', en: 'Cloud & DevOps' } },
  { id: 'data', label: { kk: 'Data Engineering', ru: 'Data Engineering', en: 'Data engineering' } },
  { id: 'mobile', label: { kk: 'Мобильді қосымшалар', ru: 'Мобильные приложения', en: 'Mobile apps' } },
  { id: 'design', label: { kk: 'Дизайн және UX', ru: 'Дизайн и UX', en: 'Design & UX' } },
  { id: 'product', label: { kk: 'Өнім менеджменті', ru: 'Продакт-менеджмент', en: 'Product management' } },
  { id: 'startups', label: { kk: 'Стартаптар', ru: 'Стартапы', en: 'Startups' } },
  { id: 'opensource', label: { kk: 'Open Source', ru: 'Open Source', en: 'Open source' } },
  { id: 'iot', label: { kk: 'IoT және hardware', ru: 'IoT и железо', en: 'IoT & hardware' } },
  { id: 'career', label: { kk: 'Мансап өсуі', ru: 'Карьерный рост', en: 'Career growth' } },
  { id: 'teaching', label: { kk: 'Оқыту және менторлық', ru: 'Обучение и менторство', en: 'Teaching & mentoring' } },
  { id: 'remote', label: { kk: 'Қашықтан жұмыс', ru: 'Удалённая работа', en: 'Remote work' } },
  { id: 'hackathons', label: { kk: 'Хакатондар', ru: 'Хакатоны', en: 'Hackathons' } },
];

export const EVENT = {
  name: 'Qazaq IT Community Meetup',
  date: '2026-11-21',
  venue: { kk: 'Астана Хаб, Астана', ru: 'Astana Hub, Астана', en: 'Astana Hub, Astana' } as L10n,
  tables: 24,
};

// 1:1 кездесу слоттары — 20 минуттық, 11:00–17:00
export const SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let m = 11 * 60; m < 17 * 60; m += 20) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
})();

export const goalLabel = (id: GoalId, lang: Lang) => GOALS.find((g) => g.id === id)?.label[lang] ?? id;
export const goalShort = (id: GoalId, lang: Lang) => GOALS.find((g) => g.id === id)?.short[lang] ?? id;
export const roleLabel = (id: RoleId, lang: Lang) => ROLES.find((r) => r.id === id)?.label[lang] ?? id;
export const interestLabel = (id: string, lang: Lang) => INTERESTS.find((i) => i.id === id)?.label[lang] ?? id;

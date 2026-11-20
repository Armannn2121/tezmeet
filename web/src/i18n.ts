import type { Lang } from '../../shared/catalog.ts';

const dict = {
  appTagline: { kk: 'IT-іс-шарада кіммен танысу керегін AI айтады', ru: 'AI подскажет, с кем познакомиться на IT-мероприятии', en: 'AI tells you who to meet at an IT event' },
  start: { kk: 'Анкетаны толтыру', ru: 'Заполнить анкету', en: 'Fill in the profile' },
  sample: { kk: 'Мысал анкетамен көру', ru: 'Посмотреть на примере', en: 'Try with a sample profile' },
  feat1: { kk: '3 секундта 5 адам', ru: '5 человек за 3 секунды', en: '5 people in 3 seconds' },
  feat1d: { kk: 'Мақсатыңыз, стегіңіз бен қызығушылығыңыз бойынша', ru: 'По вашей цели, стеку и интересам', en: 'Based on your goal, stack and interests' },
  feat2: { kk: 'Неге дәл осы адам', ru: 'Почему именно этот человек', en: 'Why this exact person' },
  feat2d: { kk: 'Әр ұсынысқа түсіндірме және алғашқы фраза', ru: 'Объяснение и первая фраза к каждой рекомендации', en: 'An explanation and an opener for every match' },
  feat3: { kk: '1:1 кездесу', ru: 'Встречи 1:1', en: '1:1 meetings' },
  feat3d: { kk: 'Ортақ бос уақыт пен үстел автоматты таңдалады', ru: 'Общее свободное время и стол подбираются сами', en: 'Common free slot and table picked for you' },
  privacy: { kk: 'Анкета тек осы іс-шараның қатысушыларына көрінеді. Барлық демо-анкеталар ойдан шығарылған.', ru: 'Анкету видят только участники этого мероприятия. Все демо-анкеты вымышлены.', en: 'Only attendees of this event see your profile. All sample profiles are fictional.' },

  // Анкета
  profile: { kk: 'Анкета', ru: 'Анкета', en: 'Profile' },
  cancel: { kk: 'Бас тарту', ru: 'Отмена', en: 'Cancel' },
  done: { kk: 'Дайын', ru: 'Готово', en: 'Done' },
  save: { kk: 'Сақтау', ru: 'Сохранить', en: 'Save' },
  findPeople: { kk: 'Адамдарды табу', ru: 'Найти людей', en: 'Find people' },
  goalSection: { kk: 'Мақсатыңыз', ru: 'Ваша цель', en: 'Your goal' },
  goalFooter: { kk: 'Мақсаттар өзара сәйкестендіріледі: жұмыс іздеушіге — жалдаушылар, ментор іздеушіге — менторлар.', ru: 'Цели подбираются взаимно: ищущим работу — тех, кто нанимает, ищущим ментора — менторов.', en: 'Goals are matched reciprocally: job seekers see hirers, mentees see mentors.' },
  aboutYou: { kk: 'Сіз туралы', ru: 'О вас', en: 'About you' },
  name: { kk: 'Аты-жөні', ru: 'Имя', en: 'Name' },
  namePh: { kk: 'Мысалы, Аружан Сейітова', ru: 'Например, Аружан Сеитова', en: 'e.g. Aruzhan Seitova' },
  company: { kk: 'Компания', ru: 'Компания', en: 'Company' },
  optional: { kk: 'міндетті емес', ru: 'необязательно', en: 'optional' },
  role: { kk: 'Рөл', ru: 'Роль', en: 'Role' },
  choose: { kk: 'Таңдау', ru: 'Выбрать', en: 'Choose' },
  experience: { kk: 'Тәжірибе', ru: 'Опыт', en: 'Experience' },
  stack: { kk: 'Стек', ru: 'Стек', en: 'Stack' },
  stackFooter: { kk: 'Негізгі 3–6 технологияны таңдаңыз. Тізімде жоқ болса — өзіңіз жазыңыз.', ru: 'Выберите 3–6 основных технологий. Нет в списке — впишите свою.', en: 'Pick 3–6 core technologies. Missing one? Type it in.' },
  addStack: { kk: 'Технология қосу', ru: 'Добавить технологию', en: 'Add technology' },
  searchStack: { kk: 'Іздеу немесе өз нұсқаңыз', ru: 'Поиск или своя технология', en: 'Search or add your own' },
  addCustom: { kk: 'Қосу', ru: 'Добавить', en: 'Add' },
  suggested: { kk: 'Рөліңізге ұсынылады', ru: 'Подходит для вашей роли', en: 'Suggested for your role' },
  interests: { kk: 'Қызығушылықтар', ru: 'Интересы', en: 'Interests' },
  about: { kk: '«Өзім туралы»', ru: '«О себе»', en: '“About me”' },
  aboutPh: { kk: 'Немен айналысасыз, не іздейсіз, немен бөлісе аласыз? 2–3 сөйлем.', ru: 'Чем занимаетесь, что ищете, чем можете поделиться? 2–3 предложения.', en: 'What do you do, what are you looking for, what can you share? 2–3 sentences.' },
  aboutFooter: { kk: 'Мәтін мағынасы бойынша салыстырылады — нақты жазсаңыз, ұсыныс дәлірек болады.', ru: 'Текст сравнивается по смыслу — чем конкретнее, тем точнее подбор.', en: 'Text is compared by meaning — the more specific, the better the match.' },
  hiringFor: { kk: 'Кімді жалдайсыз', ru: 'Кого нанимаете', en: 'Who are you hiring' },
  hiringForFooter: { kk: 'Міндетті: үміткерлер осы рөлдер бойынша таңдалады.', ru: 'Обязательно: кандидаты подбираются под эти роли.', en: 'Required: candidates are matched to these roles.' },
  vacancyStack: { kk: 'Вакансия стегі', ru: 'Стек вакансии', en: 'Stack you are hiring for' },
  vacancyStackFooter: { kk: 'Үміткерге қажет технологиялар — олар бойынша сәйкестік есептеледі.', ru: 'Технологии, которые нужны кандидату, — по ним считается совпадение.', en: 'Technologies the candidate needs — the match is computed on them.' },
  lookingFor: { kk: 'Кіммен танысқыңыз келеді', ru: 'С кем хотите познакомиться', en: 'Who do you want to meet' },
  lookingForFooter: { kk: 'Міндетті емес: таңдалған рөлдер жоғары тұрады.', ru: 'Необязательно: выбранные роли получат приоритет.', en: 'Optional: selected roles get priority.' },
  slots: { kk: '1:1 кездесуге бос уақыт', ru: 'Свободное время для встреч 1:1', en: 'Free time for 1:1 meetings' },
  slotsFooter: { kk: 'Әр кездесу — 20 минут. Ештеңе таңдамасаңыз, күні бойы бос деп есептейміз.', ru: 'Каждая встреча — 20 минут. Если ничего не выбрать, считаем, что вы свободны весь день.', en: 'Each meeting is 20 minutes. Pick none and we assume you are free all day.' },
  allDay: { kk: 'Күні бойы', ru: 'Весь день', en: 'All day' },
  contacts: { kk: 'Байланыс', ru: 'Контакт', en: 'Contact' },
  telegram: { kk: 'Telegram', ru: 'Telegram', en: 'Telegram' },
  telegramFooter: { kk: 'Тек «Таныстық» деп белгілеген адамдарға көрінеді.', ru: 'Видят только те, с кем вы отметили «Познакомились».', en: 'Visible only to people you marked as “Met”.' },
  missing: { kk: 'Толтырыңыз', ru: 'Заполните', en: 'Fill in' },
  years: { kk: 'жыл', ru: 'лет', en: 'yrs' },
  noExp: { kk: 'Тәжірибесіз', ru: 'Без опыта', en: 'No experience' },

  // Ұсыныстар
  forYou: { kk: 'Сізге', ru: 'Для вас', en: 'For you' },
  pickedIn: { kk: '{n} адам · {ms} мс ішінде таңдалды', ru: '{n} человек · подобрано за {ms} мс', en: '{n} people · matched in {ms} ms' },
  whyMatch: { kk: 'Неге', ru: 'Почему', en: 'Why' },
  opener: { kk: 'Алғашқы фраза', ru: 'Первая фраза', en: 'Opening line' },
  aiOpener: { kk: 'AI жекеледі', ru: 'AI персонализировал', en: 'AI-personalised' },
  copy: { kk: 'Көшіру', ru: 'Копировать', en: 'Copy' },
  copyManual: { kk: 'Мәтін белгіленді — қолмен көшіріңіз', ru: 'Текст выделен — скопируйте вручную', en: 'Text selected — copy it manually' },
  copied: { kk: 'Көшірілді', ru: 'Скопировано', en: 'Copied' },
  met: { kk: 'Таныстық', ru: 'Познакомились', en: 'Met' },
  skip: { kk: 'Сәйкес емес', ru: 'Не подошло', en: 'Not a fit' },
  meet: { kk: 'Кездесу', ru: 'Встреча', en: 'Meet' },
  recalculated: { kk: 'Тізім қайта есептелді', ru: 'Список пересчитан', en: 'List recalculated' },
  undo: { kk: 'Қайтару', ru: 'Отменить', en: 'Undo' },
  noMore: { kk: 'Әзірге басқа сәйкес адам жоқ', ru: 'Пока больше нет подходящих людей', en: 'No more matches for now' },
  noMoreD: { kk: 'Жаңа қатысушылар тіркелген сайын тізім жаңарады.', ru: 'Список обновится, когда придут новые участники.', en: 'The list updates as new people join.' },
  booths: { kk: 'Серіктес стенділері', ru: 'Стенды партнёров', en: 'Partner booths' },
  boothsFooter: { kk: 'Қызығушылықтарыңыз бен мақсатыңызға сай таңдалды.', ru: 'Подобраны по вашим интересам и цели.', en: 'Picked for your interests and goal.' },
  matchGreat: { kk: 'Өте сәйкес', ru: 'Отличное совпадение', en: 'Great match' },
  matchGood: { kk: 'Жақсы сәйкес', ru: 'Хорошее совпадение', en: 'Good match' },
  matchOk: { kk: 'Мүмкін сәйкес', ru: 'Возможное совпадение', en: 'Possible match' },
  semGemini: { kk: 'Мағына: Gemini эмбеддинг', ru: 'Смысл: эмбеддинги Gemini', en: 'Meaning: Gemini embeddings' },
  semTfidf: { kk: 'Мағына: TF-IDF', ru: 'Смысл: TF-IDF', en: 'Meaning: TF-IDF' },
  refresh: { kk: 'Жаңарту', ru: 'Обновить', en: 'Refresh' },
  details: { kk: 'Толығырақ', ru: 'Подробнее', en: 'Details' },
  scoreParts: { kk: 'Сәйкестік неден құралды', ru: 'Из чего сложилось совпадение', en: 'What the match is made of' },
  partGoal: { kk: 'Мақсаттар', ru: 'Цели', en: 'Goals' },
  partRole: { kk: 'Рөл', ru: 'Роль', en: 'Role' },
  partStack: { kk: 'Ортақ стек', ru: 'Общий стек', en: 'Shared stack' },
  partInterests: { kk: 'Ортақ қызығушылық', ru: 'Общие интересы', en: 'Shared interests' },
  partSemantic: { kk: '«Өзім туралы» мағынасы', ru: 'Смысл «о себе»', en: '“About me” meaning' },
  partComplement: { kk: 'Бір-бірін толықтырады', ru: 'Дополняете друг друга', en: 'Complement each other' },
  partExperience: { kk: 'Тәжірибе айырмасы', ru: 'Разница в опыте', en: 'Experience gap' },
  freeAt: { kk: 'Бос уақыты', ru: 'Свободен(а)', en: 'Free at' },

  // Кездесулер
  meetings: { kk: 'Кездесулер', ru: 'Встречи', en: 'Meetings' },
  myMeetings: { kk: 'Кестем', ru: 'Расписание', en: 'Schedule' },
  myContacts: { kk: 'Таныстар', ru: 'Знакомства', en: 'Contacts' },
  noMeetings: { kk: 'Кездесу әлі жоқ', ru: 'Встреч пока нет', en: 'No meetings yet' },
  noMeetingsD: { kk: '«Сізге» бетінде адамды таңдап, «Кездесу» басыңыз — ортақ бос уақыт пен үстел өзі таңдалады.', ru: 'Нажмите «Встреча» у рекомендации — общее время и стол подберутся сами.', en: 'Tap “Meet” on a match — a common slot and a table are picked for you.' },
  noContacts: { kk: 'Таныстар әлі жоқ', ru: 'Знакомств пока нет', en: 'No contacts yet' },
  noContactsD: { kk: 'Танысқан соң «Таныстық» басыңыз — адам осында сақталады.', ru: 'После знакомства нажмите «Познакомились» — человек сохранится здесь.', en: 'After meeting someone, tap “Met” to keep them here.' },
  table: { kk: '{n}-үстел', ru: 'Стол {n}', en: 'Table {n}' },
  scheduleTitle: { kk: '1:1 кездесу', ru: 'Встреча 1:1', en: '1:1 meeting' },
  pickSlot: { kk: 'Ортақ бос уақыт', ru: 'Общее свободное время', en: 'Common free time' },
  pickSlotFooter: { kk: '20 минут · үстел автоматты бөлінеді', ru: '20 минут · стол назначится автоматически', en: '20 minutes · table assigned automatically' },
  book: { kk: 'Кездесу белгілеу', ru: 'Назначить встречу', en: 'Book meeting' },
  booked: { kk: '{slot}, {table}', ru: '{slot}, {table}', en: '{slot}, {table}' },
  noSlots: { kk: 'Ортақ бос уақыт жоқ — адаммен залда тікелей сөйлесіңіз.', ru: 'Общего свободного времени нет — подойдите к человеку в зале.', en: 'No common free time — catch them in the hall.' },
  cancelMeeting: { kk: 'Кездесуді болдырмау', ru: 'Отменить встречу', en: 'Cancel meeting' },
  writeTg: { kk: 'Telegram-да жазу', ru: 'Написать в Telegram', en: 'Message on Telegram' },
  findAtTable: { kk: 'Іс-шарада кездесіңіз', ru: 'Найдите на мероприятии', en: 'Find them at the event' },

  // Зал
  hall: { kk: 'Зал', ru: 'Зал', en: 'Hall' },
  hallSub: { kk: 'Ұйымдастырушы дашборды', ru: 'Дашборд организатора', en: 'Organizer dashboard' },
  participants: { kk: 'Қатысушы', ru: 'Участников', en: 'Attendees' },
  registered: { kk: 'анкета толтырған: {n}', ru: 'заполнили анкету: {n}', en: 'filled in the form: {n}' },
  meetingsBooked: { kk: 'Кездесу', ru: 'Встреч', en: 'Meetings' },
  metRate: { kk: 'Таныстық үлесі', ru: 'Доля «познакомились»', en: '“Met” rate' },
  supplyDemand: { kk: 'Сұраныс пен ұсыныс', ru: 'Спрос и предложение', en: 'Supply and demand' },
  supplyFooter: { kk: 'Теңгерім бұзылса — ұйымдастырушы тиісті адамдарды шақыра алады.', ru: 'Если баланс перекошен, организатор может позвать нужных людей.', en: 'If the balance is off, organizers can invite the missing side.' },
  interestMap: { kk: 'Зал қызығушылықтарының картасы', ru: 'Карта интересов зала', en: 'Hall interest map' },
  interestMapFooter: { kk: 'Әр жолақ — қызығушылық, түсі — адамдардың мақсаты.', ru: 'Каждая полоса — интерес, цвет — цель людей.', en: 'Each bar is an interest, color is people’s goal.' },
  topStack: { kk: 'Танымал стек', ru: 'Популярный стек', en: 'Popular stack' },
  goalsMix: { kk: 'Мақсаттар', ru: 'Цели участников', en: 'Attendee goals' },
  slotLoad: { kk: 'Кездесулер уақыт бойынша', ru: 'Встречи по времени', en: 'Meetings by time' },

  // Профиль
  me: { kk: 'Профиль', ru: 'Профиль', en: 'Profile' },
  edit: { kk: 'Өңдеу', ru: 'Изменить', en: 'Edit' },
  language: { kk: 'Тіл', ru: 'Язык', en: 'Language' },
  event: { kk: 'Іс-шара', ru: 'Мероприятие', en: 'Event' },
  aiStatus: { kk: 'AI күйі', ru: 'Статус AI', en: 'AI status' },
  embeddings: { kk: 'Эмбеддингтер', ru: 'Эмбеддинги', en: 'Embeddings' },
  llm: { kk: 'Алғашқы фраза (LLM)', ru: 'Первая фраза (LLM)', en: 'Opening line (LLM)' },
  on: { kk: 'Қосулы', ru: 'Включено', en: 'On' },
  off: { kk: 'Шаблон', ru: 'Шаблон', en: 'Template' },
  warming: { kk: 'Дайындалуда', ru: 'Готовится', en: 'Warming up' },
  signOut: { kk: 'Шығу', ru: 'Выйти', en: 'Sign out' },
  logout: { kk: 'Анкетаны осы құрылғыдан шығару', ru: 'Выйти из анкеты на этом устройстве', en: 'Sign out of this profile on this device' },
  logoutTitle: { kk: 'Анкетадан шығу керек пе?', ru: 'Выйти из анкеты?', en: 'Sign out of this profile?' },
  logoutConfirm: { kk: 'Анкета серверде қалады, бірақ бұл құрылғыда жаңа анкета толтырасыз.', ru: 'Анкета останется на сервере, но на этом устройстве вы начнёте заново.', en: 'Your profile stays on the server, but you will start over on this device.' },
  howItWorks: { kk: 'Қалай жұмыс істейді', ru: 'Как это работает', en: 'How it works' },
  how1: { kk: 'Мақсаттар сүзгісі: сәйкес келмейтін мақсаттар көрсетілмейді', ru: 'Фильтр целей: несовместимые цели не показываются', en: 'Goal filter: incompatible goals are never shown' },
  how2: { kk: 'Балл: мақсат, рөл, стек, мәтін мағынасы, қызығушылық, тәжірибе', ru: 'Скоринг: цель, роль, стек, смысл текста, интересы, опыт', en: 'Scoring: goal, role, stack, text meaning, interests, experience' },
  how3: { kk: 'Кері байланыс: «Сәйкес емес» ұқсас адамдарды төмендетеді', ru: 'Обратная связь: «Не подошло» понижает похожих людей', en: 'Feedback: “Not a fit” demotes similar people' },

  error: { kk: 'Қате', ru: 'Ошибка', en: 'Error' },
  networkError: { kk: 'Сервермен байланыс жоқ. Қайталап көріңіз.', ru: 'Нет связи с сервером. Попробуйте ещё раз.', en: 'Cannot reach the server. Please try again.' },
  retry: { kk: 'Қайталау', ru: 'Повторить', en: 'Retry' },
  loading: { kk: 'Жүктелуде…', ru: 'Загрузка…', en: 'Loading…' },
} satisfies Record<string, Record<Lang, string>>;

export type Key = keyof typeof dict;

// Браузерлердің бәрінде kk-KZ локалі жоқ (Chrome «M11 21» шығарады) — ай атауларын өзіміз береміз
const MONTHS: Record<Lang, string[]> = {
  kk: ['қаңтар', 'ақпан', 'наурыз', 'сәуір', 'мамыр', 'маусым', 'шілде', 'тамыз', 'қыркүйек', 'қазан', 'қараша', 'желтоқсан'],
  ru: ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};
export function fmtDate(iso: string, lang: Lang) {
  const [, m, d] = iso.split('-').map(Number);
  return lang === 'en' ? `${MONTHS.en[m - 1]} ${d}` : `${d} ${MONTHS[lang][m - 1]}`;
}

export function fmtYears(n: number, lang: Lang) {
  if (n === 0) return dict.noExp[lang];
  if (lang === 'kk') return `${n} жыл`;
  if (lang === 'en') return `${n} yr${n === 1 ? '' : 's'}`;
  const m10 = n % 10, m100 = n % 100;
  return `${n} ${m10 === 1 && m100 !== 11 ? 'год' : [2, 3, 4].includes(m10) && ![12, 13, 14].includes(m100) ? 'года' : 'лет'}`;
}

export function makeT(lang: Lang) {
  return (key: Key, vars?: Record<string, string | number>) => {
    let s: string = dict[key][lang];
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
    return s;
  };
}

export type T = ReturnType<typeof makeT>;

export const ERRORS: Record<string, Record<Lang, string>> = {
  name_required: { kk: 'Атыңызды жазыңыз', ru: 'Укажите имя', en: 'Enter your name' },
  role_required: { kk: 'Рөлді таңдаңыз', ru: 'Выберите роль', en: 'Choose a role' },
  goal_required: { kk: 'Мақсатты таңдаңыз', ru: 'Выберите цель', en: 'Choose a goal' },
  stack_required: { kk: 'Кемінде бір технология қосыңыз', ru: 'Добавьте хотя бы одну технологию', en: 'Add at least one technology' },
  interests_required: { kk: 'Кемінде бір қызығушылық таңдаңыз', ru: 'Выберите хотя бы один интерес', en: 'Pick at least one interest' },
  about_required: { kk: '«Өзім туралы» кемінде 10 таңба', ru: '«О себе» — минимум 10 символов', en: '“About me” needs at least 10 characters' },
  profile_not_found: { kk: 'Анкета табылмады', ru: 'Анкета не найдена', en: 'Profile not found' },
  already_scheduled: { kk: 'Бұл адаммен кездесу бар', ru: 'Встреча с этим человеком уже есть', en: 'You already have a meeting with this person' },
  no_common_slot: { kk: 'Ортақ бос уақыт жоқ', ru: 'Нет общего свободного времени', en: 'No common free time' },
  no_tables: { kk: 'Бұл уақытта бос үстел жоқ', ru: 'В это время нет свободных столов', en: 'No free tables at this time' },
  rate_limited: { kk: 'Тым жиі. Бір минуттан соң қайталаңыз', ru: 'Слишком часто. Повторите через минуту', en: 'Too many requests. Try again in a minute' },
};

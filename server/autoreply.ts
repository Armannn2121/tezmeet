// Демо-анкеталардың автоматты жауаптары: әр синтетикалық анкета өз мінезінде,
// қысқа әрі жанды жазады (жалдаушы — команда туралы, ментор — көмек ұсынады т.б.).
// Gemini кілті болса — модель жазады, болмаса — kk/ru/en ережелері.
// Шынайы сұраса («сен ботсың ба?») — автоматты жауап беретінін адал айтады.

import { goalLabel, interestLabel, roleLabel, type Lang, type RoleId } from '../shared/catalog.ts';
import type { Message, Profile } from '../shared/types.ts';
import { CONFIG } from './config.ts';
import { rolePlural } from './explain.ts';

export type ReplyContext = {
  bot: Profile;
  user: Profile;
  history: Message[]; // соңғысы — пайдаланушының хабарламасы
  meeting: { slot: string; table: number } | null;
  freeSlots: string[]; // екеуі де бос слоттар
  hiresFor: RoleId[];
};

// ── Тілді анықтау ─────────────────────────────────────────────────
// Аттарды алып тастаймыз: «Здравствуйте, Қайрат!» — орысша, «Қ» тек атта
export function detectLang(raw: string, fallback: Lang, names: string[] = []): Lang {
  let text = raw;
  for (const n of names) for (const part of n.split(/\s+/).filter((x) => x.length > 2)) text = text.split(part).join(' ');
  if (/[әғқңөұүһі]/i.test(text)) return 'kk';
  if (/[а-яё]/i.test(text)) return 'ru';
  if (/[a-z]/i.test(text)) return 'en';
  return fallback;
}

const pick = <T,>(xs: T[], seed: number) => xs[Math.abs(seed) % xs.length];
const list = (xs: string[], lang: Lang) => {
  if (xs.length <= 1) return xs.join('');
  const and = lang === 'ru' ? ' и ' : lang === 'kk' ? ' және ' : ' and ';
  return xs.slice(0, -1).join(', ') + and + xs[xs.length - 1];
};

// ── Ниеттер ───────────────────────────────────────────────────────
const E = '(?![a-zа-яёәғқңөұүһі])'; // сөз соңы (кириллица үшін де)
const RX = {
  botQ: new RegExp(`(ты|вы)\\s+(бот|робот|ии|ai)${E}|это\\s+бот|чат-?бот|нейросет|искусственн|живой\\s+человек|настоящ(ий|ая)\\s+человек|реальн(ый|ая)\\s+человек|are\\s+you\\s+(a\\s+)?(bot|ai|real|human|robot)|\\bai\\s*\\?|сен\\s+бот|бот\\s*(сың|сыз|па|ба)${E}|жасанды\\s+интеллект|нақты\\s+адам|^бот\\s*\\?`, 'i'),
  meet: /встрет|встреч|созвон|кофе|увидим|во\s+сколько|когда\s+(удобно|свободн|можно)|\bmeet|coffee|catch\s+up|what\s+time|кездес|уақыт|қашан|сағат/i,
  thanks: /спасиб|благодар|рахмет|рақмет|thank/i,
  bye: new RegExp(`пока${E}|до\\s+встречи|до\\s+завтра|сау\\s+бол|көріскенше|кездескенше|\\bbye\\b|see\\s+you`, 'i'),
  agree: new RegExp(`^(да|ага|ок|окей|давай(те)?|договорились|согласен|согласна|хорошо|отлично|иә|жарайды|келістік|болады|ok|okay|sure|yes|deal|great)${E}`, 'i'),
  hello: /^(привет|здравствуй(те)?|добрый\s+(день|вечер)|салем|сәлем(етсіз\s+бе)?|hi|hello|hey)[\s!.,)]*$/i,
};

type Intent = 'botQ' | 'meet' | 'thanks' | 'bye' | 'agree' | 'hello' | 'other';
export function intentOf(text: string): Intent {
  const s = text.trim();
  if (RX.botQ.test(s)) return 'botQ';
  if (RX.hello.test(s)) return 'hello';
  // «Спасибо, до встречи!» — қоштасу, кездесуге шақыру емес
  if (RX.bye.test(s) && s.length < 60) return 'bye';
  if (RX.meet.test(s)) return 'meet';
  if (RX.thanks.test(s) && s.length < 60) return 'thanks';
  if (RX.agree.test(s) && s.length < 40) return 'agree';
  return 'other';
}

// ── Ереже бойынша жауап ──────────────────────────────────────────
function facts(c: ReplyContext, lang: Lang) {
  const b = c.bot;
  const lc = (s: string) => (/^[A-ZА-ЯӘҒҚҢӨҰҮҺІЁ][a-zа-яәғқңөұүһіё]+(?=[\s-]|$)/.test(s) && !/\s[A-Z]/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);
  const domain = b.interests.map((i) => interestLabel(i, lang)).find((x) => !/карьер|career|мансап|remote|удал|қашықтан/i.test(x)) ?? interestLabel(b.interests[0] ?? 'startups', lang);
  return {
    stack: list(b.stack.slice(0, 3), lang),
    company: b.company ?? '',
    roles: list(c.hiresFor.slice(0, 2).map((r) => rolePlural(r, lang)), lang) || lc(roleLabel(b.role, lang)),
    myRole: lc(roleLabel(b.role, lang)),
    domain,
    exp: b.experience,
    slots: c.freeSlots.slice(0, 2),
  };
}

const yearsRu = (n: number) => (n % 10 === 1 && n % 100 !== 11 ? `${n} год` : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? `${n} года` : `${n} лет`);

export function ruleReply(c: ReplyContext, lang: Lang): string {
  const last = c.history[c.history.length - 1]?.text ?? '';
  const intent = intentOf(last);
  const turn = c.history.filter((m) => m.from === c.bot.id).length; // боттың нешінші жауабы
  const seed = turn + c.bot.id.length;
  const f = facts(c, lang);
  const two = f.slots.length >= 2 ? f.slots : f.slots.length === 1 ? [f.slots[0]] : [];

  if (lang === 'ru') {
    const slotsTxt = two.length === 2 ? `в ${two[0]} или в ${two[1]}` : two.length === 1 ? `в ${two[0]}` : '';
    switch (intent) {
      case 'botQ': return 'Честно: это демо-анкета из базы мероприятия, я отвечаю автоматически. А вот подбор, встречи и чат между участниками работают по-настоящему 🙂';
      case 'thanks': return pick(['Пожалуйста! Если что — пишите.', 'Не за что 🙂 Было приятно пообщаться!', 'Всегда пожалуйста!'], seed);
      case 'bye': return c.meeting ? `До встречи в ${c.meeting.slot}, стол ${c.meeting.table}!` : pick(['До встречи на митапе!', 'Хорошего вечера, увидимся!'], seed);
      case 'meet':
      case 'agree':
        if (c.meeting) return `Да, у нас уже стоит встреча в ${c.meeting.slot}, стол ${c.meeting.table}. До встречи!`;
        if (!slotsTxt) return 'Давайте! Правда, у меня сегодня всё расписано — подходите после докладов, найдёмся в зале.';
        return intent === 'agree' && turn > 0
          ? `Отлично! Выбирайте время — ${slotsTxt} — и нажмите «Встреча» в чате, приложение сразу назначит стол.`
          : `Давайте! У меня свободно ${slotsTxt}. Удобнее забронировать через кнопку «Встреча» — стол назначится сам.`;
      case 'hello': break;
      default: break;
    }
    const g = c.bot.goal;
    if (intent === 'hello' || turn === 0) {
      const open: Record<string, string[]> = {
        hire: [`Привет! Да, ищем ${f.roles}${f.company ? ` в ${f.company}` : ''}, стек — ${f.stack}. Расскажете немного о себе?`, `Здравствуйте! Приятно познакомиться. Мы как раз набираем ${f.roles} — какой у вас опыт?`],
        job_seek: [`Привет! Я ${f.myRole}, ${yearsRu(f.exp)} опыта, в основном ${f.stack}. Сейчас ищу команду — расскажете, чем вы занимаетесь?`, `Здравствуйте! Приятно познакомиться. Ищу работу, мой стек — ${f.stack}. Какие у вас задачи?`],
        mentor_offer: [`Привет! Да, менторю по ${f.stack}, с удовольствием помогу. Что сейчас изучаете и какая цель?`, `Здравствуйте! С радостью помогу — расскажите, на каком вы этапе и что хотите прокачать?`],
        mentor_seek: [`Привет! Спасибо, что написали. Я сейчас учу ${f.stack} и очень нужен совет человека с опытом. Можно пару вопросов?`, `Здравствуйте! Как раз ищу ментора по ${f.stack}. С чего бы вы посоветовали начать?`],
        cofounder: [`Привет! Да, делаю проект в теме «${f.domain}» и ищу кофаундера. А вы в какой роли себя видите?`, `Здравствуйте! Приятно познакомиться. Есть идея и прототип в «${f.domain}» — интересно обсудить?`],
        exchange: [`Привет! Да, давайте обменяемся опытом. Мы в команде на ${f.stack} — а у вас какой стек?`, `Здравствуйте! Всегда интересно сравнить подходы. Как у вас устроены код-ревью и релизы?`],
      };
      return pick(open[g], seed);
    }
    const follow: Record<string, string[]> = {
      hire: [`Звучит интересно! У нас продуктовая команда${f.company ? ` в ${f.company}` : ''}, основной стек ${f.stack}, гибридный формат. Давайте подробнее обсудим на митапе?`, `Понятно, спасибо! Для нас главное — ${f.stack}, плюс понимание продукта. Если удобно, встретимся сегодня на 20 минут${slotsTxt ? ` — ${slotsTxt}` : ''}.`],
      job_seek: [`Спасибо! Мне как раз интересна эта тема. Последние проекты были на ${f.stack}, могу показать код. Какой у вас процесс найма?`, `Звучит здорово. А какой стек и формат работы у команды?`],
      mentor_offer: [`Хороший вопрос. Советую начать с маленького реального проекта на ${f.stack} и регулярного код-ревью — так быстрее всего растёшь. Можем разобрать подробнее при встрече.`, `Понимаю. Главное — не распыляться: одна технология, один pet-проект, раз в неделю ревью. Давайте встретимся, составим план.`],
      mentor_seek: [`Спасибо большое, это очень помогает! А как вы сами пришли в профессию?`, `Понятно, спасибо! Можно будет показать вам мой pet-проект на митапе?`],
      cofounder: [`Классно! Мне как раз не хватает человека с другой стороны — я больше по ${f.stack}. Давайте обсудим идею вживую?`, `Интересно. Есть первые пользователи и понимание рынка в «${f.domain}». Что для вас важно в кофаундере?`],
      exchange: [`О, у нас похоже! Мы недавно перестроили релизы и стало сильно спокойнее. Давайте обменяемся опытом подробнее при встрече?`, `Интересно, спасибо! А какие инструменты у вас реально прижились?`],
    };
    return pick(follow[g], seed);
  }

  if (lang === 'kk') {
    const slotsTxt = two.length === 2 ? `${two[0]} не ${two[1]}` : two.length === 1 ? two[0] : '';
    switch (intent) {
      case 'botQ': return 'Шынымды айтсам: бұл — іс-шара базасындағы демо-анкета, автоматты түрде жауап беремін. Ал іріктеу, кездесу және қатысушылар арасындағы чат шынымен жұмыс істейді 🙂';
      case 'thanks': return pick(['Оқасы жоқ! Сұрағыңыз болса, жазыңыз.', 'Рақмет сізге де 🙂'], seed);
      case 'bye': return c.meeting ? `${c.meeting.slot}-де ${c.meeting.table}-үстелде кездескенше!` : pick(['Митапта кездескенше!', 'Сау болыңыз, кездескенше!'], seed);
      case 'meet':
      case 'agree':
        if (c.meeting) return `Иә, бізде ${c.meeting.slot}-де кездесу бар, ${c.meeting.table}-үстел. Кездескенше!`;
        if (!slotsTxt) return 'Келісемін! Бүгін кестем толы, баяндамалардан кейін залда табысайық.';
        return `Келісемін! Менде ${slotsTxt} бос. Чаттағы «Кездесу» батырмасы арқылы белгілеңіз — үстел өзі бөлінеді.`;
      default: break;
    }
    const g = c.bot.goal;
    if (intent === 'hello' || turn === 0) {
      const open: Record<string, string[]> = {
        hire: [`Сәлем! Иә, ${f.company ? `${f.company} командасына ` : ''}${f.roles} іздеп жүрміз, стек — ${f.stack}. Өзіңіз туралы айтып бересіз бе?`, `Сәлеметсіз бе! Танысқаныма қуаныштымын. Бізге ${f.roles} керек — тәжірибеңіз қандай?`],
        job_seek: [`Сәлем! Мен ${f.myRole}, ${f.exp} жыл тәжірибем бар, негізінен ${f.stack}. Қазір команда іздеп жүрмін — сіздер немен айналысасыздар?`, `Сәлеметсіз бе! Танысқаныма қуаныштымын. Жұмыс іздеп жүрмін, стегім — ${f.stack}. Сіздерде қандай міндеттер бар?`],
        mentor_offer: [`Сәлем! Иә, ${f.stack} бойынша менторлық жасаймын, қуана көмектесемін. Қазір не үйреніп жүрсіз?`, `Сәлеметсіз бе! Көмектесуге дайынмын — қай деңгейдесіз, нені жақсартқыңыз келеді?`],
        mentor_seek: [`Сәлем! Жазғаныңызға рақмет. ${f.stack} үйреніп жүрмін, тәжірибелі адамның кеңесі өте керек. Бірнеше сұрақ қоюға бола ма?`, `Сәлеметсіз бе! ${f.stack} бойынша ментор іздеп жүрмін. Неден бастауға кеңес бересіз?`],
        cofounder: [`Сәлем! Иә, «${f.domain}» тақырыбында жоба жасап жатырмын, кофаундер іздеймін. Өзіңізді қай рөлде көресіз?`, `Сәлеметсіз бе! Идея мен прототип бар, «${f.domain}» саласында. Талқылап көрейік пе?`],
        exchange: [`Сәлем! Иә, тәжірибе алмасайық. Біздің командада ${f.stack} — сіздерде қандай стек?`, `Сәлеметсіз бе! Тәсілдерді салыстыру әрқашан қызық. Сіздерде код-ревью мен релиз қалай ұйымдастырылған?`],
      };
      return pick(open[g], seed);
    }
    const follow: Record<string, string[]> = {
      hire: [`Қызық екен! Біздің өнімдік команда, негізгі стек ${f.stack}, гибрид формат. Митапта толығырақ сөйлесейік пе?`, `Түсінікті, рақмет! Бізге ${f.stack} және өнімді түсіну маңызды. Ыңғайлы болса, бүгін ${slotsTxt || 'үзілісте'} 20 минут кездесейік.`],
      job_seek: [`Рақмет! Бұл тақырып маған өте қызық. Соңғы жобаларым ${f.stack} арқылы жасалған, кодымды көрсете аламын. Жұмысқа алу процесіңіз қандай?`, `Керемет екен. Командаңыздың стегі мен жұмыс форматы қандай?`],
      mentor_offer: [`Жақсы сұрақ. ${f.stack} бойынша шағын нақты жобадан және тұрақты код-ревьюден бастауға кеңес беремін. Кездескенде толығырақ талдайық.`, `Түсінемін. Ең бастысы — шашыраңқы болмау: бір технология, бір pet-жоба, аптасына бір ревью. Кездесіп, жоспар құрайық.`],
      mentor_seek: [`Үлкен рақмет, бұл өте көмектеседі! Өзіңіз бұл салаға қалай келдіңіз?`, `Түсіндім, рақмет! Митапта pet-жобамды көрсетуге бола ма?`],
      cofounder: [`Керемет! Маған дәл басқа жағын жабатын адам керек — мен көбіне ${f.stack} бойынша. Идеяны жүзбе-жүз талқылайық па?`, `Қызық. «${f.domain}» саласында алғашқы пайдаланушылар бар. Кофаундерде сіз үшін не маңызды?`],
      exchange: [`О, бізде де солай! Жақында релиздерді қайта құрдық, әлдеқайда тыныш болды. Кездескенде толығырақ бөлісейік пе?`, `Қызық екен, рақмет! Сіздерде қай құралдар шынымен жұмыс істеп кетті?`],
    };
    return pick(follow[g], seed);
  }

  const slotsTxt = two.length === 2 ? `${two[0]} or ${two[1]}` : two.length === 1 ? two[0] : '';
  switch (intent) {
    case 'botQ': return "Honestly — this is a demo profile from the event's database, and I reply automatically. The matching, meetings and chat between attendees are all real though 🙂";
    case 'thanks': return pick(['You’re welcome! Ping me anytime.', 'Anytime 🙂'], seed);
    case 'bye': return c.meeting ? `See you at ${c.meeting.slot}, table ${c.meeting.table}!` : pick(['See you at the meetup!', 'Have a good one, see you there!'], seed);
    case 'meet':
    case 'agree':
      if (c.meeting) return `Yes, we already have a meeting at ${c.meeting.slot}, table ${c.meeting.table}. See you!`;
      if (!slotsTxt) return 'Sure! My schedule is packed today though — let’s catch up in the hall after the talks.';
      return `Sure! I’m free at ${slotsTxt}. Just tap “Meet” in the chat — the app assigns a table automatically.`;
    default: break;
  }
  const g = c.bot.goal;
  if (intent === 'hello' || turn === 0) {
    const open: Record<string, string[]> = {
      hire: [`Hi! Yes, we’re hiring ${f.roles}${f.company ? ` at ${f.company}` : ''}, stack is ${f.stack}. Could you tell me a bit about yourself?`, `Hello! Nice to meet you. We’re looking for ${f.roles} — what’s your experience?`],
      job_seek: [`Hi! I’m a ${f.myRole} with ${f.exp} years of experience, mostly ${f.stack}. Looking for a team right now — what are you working on?`, `Hello! Nice to meet you. I’m job hunting, my stack is ${f.stack}. What does your team do?`],
      mentor_offer: [`Hi! Yes, I mentor in ${f.stack} and happy to help. What are you learning right now?`, `Hello! Happy to help — where are you at and what do you want to improve?`],
      mentor_seek: [`Hi! Thanks for reaching out. I’m learning ${f.stack} and could really use advice from someone experienced. Mind if I ask a couple of questions?`, `Hello! I’m looking for a mentor in ${f.stack}. Where would you suggest I start?`],
      cofounder: [`Hi! Yes, I’m building something in ${f.domain} and looking for a co-founder. What role do you see yourself in?`, `Hello! I have an idea and a prototype in ${f.domain} — want to talk it through?`],
      exchange: [`Hi! Sure, let’s swap notes. Our team works with ${f.stack} — what’s your stack?`, `Hello! Always fun to compare approaches. How do you run code review and releases?`],
    };
    return pick(open[g], seed);
  }
  const follow: Record<string, string[]> = {
    hire: [`Sounds interesting! We’re a product team, main stack ${f.stack}, hybrid setup. Want to chat more at the meetup?`, `Got it, thanks! What matters most for us is ${f.stack}, plus product sense. If it works, let’s meet for 20 minutes${slotsTxt ? ` at ${slotsTxt}` : ''} today.`],
    job_seek: [`Thanks! That area is really interesting to me. My recent projects were in ${f.stack}, happy to show code. What does your hiring process look like?`, `Sounds great. What stack and work format does the team have?`],
    mentor_offer: [`Good question. I’d start with a small real project in ${f.stack} plus regular code review — that’s the fastest way to grow. We can go deeper when we meet.`, `I get it. The key is focus: one technology, one pet project, a weekly review. Let’s meet and make a plan.`],
    mentor_seek: [`Thanks a lot, that really helps! How did you get into the field yourself?`, `Got it, thanks! Could I show you my pet project at the meetup?`],
    cofounder: [`Awesome! I need someone from the other side — I’m mostly on ${f.stack}. Shall we discuss the idea in person?`, `Interesting. I already have first users in ${f.domain}. What matters most to you in a co-founder?`],
    exchange: [`Oh, same here! We recently rebuilt our release process and it got much calmer. Let’s share more when we meet?`, `Interesting, thanks! Which tools actually stuck for your team?`],
  };
  return pick(follow[g], seed);
}

// ── Gemini ────────────────────────────────────────────────────────
const LANG_NAME: Record<Lang, string> = { kk: 'Kazakh (Cyrillic)', ru: 'Russian', en: 'English' };
let keyIdx = 0;

export const llmReplies = () => CONFIG.geminiKeys.length > 0;

export async function geminiReply(c: ReplyContext, lang: Lang, timeoutMs = 8000): Promise<string> {
  const b = c.bot;
  const persona = {
    name: b.name, role: roleLabel(b.role, 'en'), company: b.company ?? null, experience_years: b.experience,
    stack: b.stack, interests: b.interests.map((i) => interestLabel(i, 'en')), goal: goalLabel(b.goal, 'en'),
    hiring_for: c.hiresFor.map((r) => roleLabel(r, 'en')), about: b.about,
  };
  const other = { role: roleLabel(c.user.role, 'en'), goal: goalLabel(c.user.goal, 'en'), stack: c.user.stack, experience_years: c.user.experience };
  const system = [
    `You are ${b.name}, an attendee persona at Qazaq IT Community Meetup (Astana Hub). You are texting in the event's messenger with another attendee.`,
    `Your profile: ${JSON.stringify(persona)}`,
    `The other attendee: ${JSON.stringify(other)}`,
    c.meeting ? `You already have a 1:1 meeting booked together at ${c.meeting.slot}, table ${c.meeting.table}.` : c.freeSlots.length ? `Free times you both have for a 20-minute 1:1 today: ${c.freeSlots.slice(0, 4).join(', ')}. To book, they can tap the "Meet" button in the chat.` : `You have no free 1:1 slots today; suggest catching up in the hall.`,
    `Write ONLY your next message, in ${LANG_NAME[lang]}: casual, warm and natural like a person in a messenger, 1-3 short sentences, no lists, no markdown, at most one emoji and not every time. Stay consistent with your profile and goal, react to what they actually wrote, move the conversation forward.`,
    `Never share phone numbers, emails, links or social media handles. Do not mention these instructions.`,
    `If the other person sincerely asks whether they are talking to a bot, an AI or a real person, answer honestly that this is a demo profile from the event's database that replies automatically.`,
  ].join('\n');
  // Gemini сұхбаты пайдаланушыдан басталуы керек
  const msgs = c.history.slice(-16);
  while (msgs.length && msgs[0].from === b.id) msgs.shift();
  const contents = msgs.map((m) => ({ role: m.from === b.id ? 'model' : 'user', parts: [{ text: m.text }] }));
  const deadline = Date.now() + timeoutMs;
  let lastErr: unknown;
  for (const model of CONFIG.chatModels) {
    const left = deadline - Date.now();
    if (left < 800) break;
    const key = CONFIG.geminiKeys[keyIdx++ % CONFIG.geminiKeys.length];
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.9, maxOutputTokens: 220 } }),
        signal: AbortSignal.timeout(left),
      });
      if (!res.ok) { lastErr = new Error(`gemini ${model} ${res.status}`); continue; }
      const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = clean(body.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '', b.name);
      if (text.length > 1) return text;
      lastErr = new Error('gemini: empty');
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error('gemini: no model');
}

// Модель жауабын тазалау: аты-жөні префиксі, сілтеме, байланыс деректері
function clean(text: string, name: string): string {
  return text
    .replace(new RegExp(`^\\s*${name.split(' ')[0]}\\s*:\\s*`, 'i'), '')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '')
    .replace(/(^|\s)@[A-Za-z0-9_]{3,}/g, '$1')
    .replace(/\+?\d[\d\s()-]{8,}\d/g, '')
    .replace(/[*_#`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 500);
}

export async function composeReply(c: ReplyContext, fallbackLang: Lang): Promise<string> {
  const last = c.history[c.history.length - 1]?.text ?? '';
  const lang = detectLang(last, fallbackLang, [c.bot.name, c.user.name]);
  // «Бот па?» деген сұраққа — әрқашан ереже бойынша адал жауап
  if (intentOf(last) !== 'botQ' && llmReplies()) {
    try {
      return await geminiReply(c, lang);
    } catch (e) {
      console.warn('autoreply fallback:', (e as Error).message);
    }
  }
  return ruleReply(c, lang);
}

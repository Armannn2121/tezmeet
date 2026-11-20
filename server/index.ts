// TezMeet HTTP сервері: REST API + веб-интерфейстің статикалық файлдары.
// Сыртқы тәуелділік жоқ — тек Node.js (≥ 22.18, TypeScript-ті тікелей орындайды).
//   node server/index.ts

import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { EVENT, GOALS, INTERESTS, ROLES, SLOTS, STACK, type GoalId, type Lang, type RoleId } from '../shared/catalog.ts';
import type { ChatSummary, ChatThread, Meeting, MeetingView, Message, Profile, RecResponse, Verdict } from '../shared/types.ts';
import { CONFIG } from './config.ts';
import { embedBatch, embedEnabled, loadEmbedCache, saveEmbedCache } from './embed.ts';
import { aiIcebreakers, llmEnabled } from './llm.ts';
import { Matcher, docText, recommendBooths } from './match.ts';
import * as store from './store.ts';

const matcher = new Matcher();
matcher.index(store.allProfiles());

// ── Эмбеддингтер: кэштен жүктеу, жетіспегенін фондық есептеу ─────────
loadEmbedCache();
let embedStatus: 'off' | 'warming' | 'ready' | 'error' = embedEnabled() ? 'warming' : 'off';
if (embedEnabled()) {
  embedBatch(store.allProfiles().map(docText), 60000)
    .then(() => {
      saveEmbedCache();
      embedStatus = 'ready';
      console.log('embeddings ready (gemini)');
    })
    .catch((e) => {
      embedStatus = 'error';
      console.warn('embeddings unavailable, using TF-IDF:', e.message);
    });
}

// ── Көмекшілер ─────────────────────────────────────────────────────
const LANGS: Lang[] = ['kk', 'ru', 'en'];
const asLang = (v: unknown): Lang => (LANGS.includes(v as Lang) ? (v as Lang) : 'ru');

class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

function send(res: ServerResponse, status: number, body: unknown) {
  const data = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(data);
}

async function readJson(req: IncomingMessage): Promise<any> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const c of req) {
    size += c.length;
    if (size > 32_000) throw new HttpError(413, 'too_large');
    chunks.push(c);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch {
    throw new HttpError(400, 'bad_json');
  }
}

// Rate limit: әр қатысушыға (токен бойынша) не IP-ге, әр маршрутқа бөлек.
// Бүкіл зал бір Wi-Fi (бір IP) арқылы шығуы мүмкін, сондықтан анкета жасау шегі кең.
const hits = new Map<string, { n: number; t: number }>();
function limit(req: IncomingMessage, bucket: string, max: number) {
  const who = bearer(req) || (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '?';
  const key = `${bucket}:${who}`;
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.t > 60_000) hits.set(key, { n: 1, t: now });
  else if (++h.n > max) throw new HttpError(429, 'rate_limited');
  if (hits.size > 50_000) hits.clear();
}

const bearer = (req: IncomingMessage) => {
  const h = req.headers.authorization ?? '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
};

// Қатысушы тек өз токенімен әрекет етеді: id бөтен адамдарға көрінеді, токен — жоқ
function auth(req: IncomingMessage): Profile {
  const token = bearer(req);
  const p = token ? store.userByToken(token) : undefined;
  if (!p) throw new HttpError(401, 'unauthorized');
  return p;
}

// Бөтен адамға көрсетілетін профиль: Telegram тек ол адам сізді «Познакомились» деп белгілесе
function view(p: Profile, viewerId: string | null): Profile {
  if (!p.telegram || p.id === viewerId || (viewerId && store.markedMet(p.id, viewerId))) return p;
  const { telegram: _hidden, ...rest } = p;
  return rest;
}

const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max) : '');
const ROLE_IDS = new Set(ROLES.map((r) => r.id));
const GOAL_IDS = new Set(GOALS.map((g) => g.id));
const INTEREST_IDS = new Set(INTERESTS.map((i) => i.id));

function validateProfile(body: any, id: string, prev?: Profile): Profile {
  const name = clean(body.name, 60);
  const about = clean(body.about, 600);
  if (name.length < 2) throw new HttpError(422, 'name_required');
  if (!ROLE_IDS.has(body.role)) throw new HttpError(422, 'role_required');
  if (!GOAL_IDS.has(body.goal)) throw new HttpError(422, 'goal_required');
  const stack: string[] = Array.isArray(body.stack) ? [...new Set<string>(body.stack.map((s: unknown) => clean(s, 30)).filter(Boolean))].slice(0, 12) : [];
  if (!stack.length) throw new HttpError(422, 'stack_required');
  const interests: string[] = Array.isArray(body.interests) ? [...new Set<string>(body.interests.filter((i: string) => INTEREST_IDS.has(i)))].slice(0, 8) : [];
  if (!interests.length) throw new HttpError(422, 'interests_required');
  if (about.length < 10) throw new HttpError(422, 'about_required');
  const experience = Math.max(0, Math.min(40, Math.round(Number(body.experience) || 0)));
  const lookingFor: RoleId[] = Array.isArray(body.lookingFor) ? body.lookingFor.filter((r: RoleId) => ROLE_IDS.has(r)).slice(0, 6) : [];
  const slots: string[] = Array.isArray(body.slots) ? body.slots.filter((s: string) => SLOTS.includes(s)) : [];
  const telegram = clean(body.telegram, 33).replace(/^@?/, '');
  return {
    id,
    name,
    role: body.role,
    company: clean(body.company, 60) || undefined,
    experience,
    stack,
    interests,
    about,
    goal: body.goal as GoalId,
    lookingFor,
    slots: slots.length ? slots.sort() : [...SLOTS],
    telegram: /^[A-Za-z0-9_]{4,32}$/.test(telegram) ? telegram : undefined,
    lang: asLang(body.lang),
    createdAt: prev?.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Жаңа анкетаның эмбеддингі: 2 секундтан аспайды, әйтпесе TF-IDF жалғасады
async function embedOne(p: Profile) {
  if (!embedEnabled() || embedStatus === 'error') return;
  try {
    await embedBatch([docText(p)], 2000);
    saveEmbedCache();
  } catch (e) {
    console.warn('embed one failed:', (e as Error).message);
  }
}

function recommend(me: Profile, lang: Lang): RecResponse {
  const t0 = performance.now();
  const fb = store.feedbackOf(me.id);
  const exclude = new Set(fb.map((f) => f.targetId));
  const skipped = fb.filter((f) => f.verdict === 'skip').map((f) => store.getProfile(f.targetId)).filter((p): p is Profile => !!p);
  const { items, semSource } = matcher.recommend(me, lang, { exclude, skipped });
  const booths = recommendBooths(me, store.booths, lang);
  for (const it of items) it.profile = view(it.profile, me.id);
  return { items, booths, tookMs: Math.round((performance.now() - t0) * 10) / 10, semantic: semSource };
}

function meetingView(m: Meeting, me: string): MeetingView | null {
  const other = store.getProfile(m.a === me ? m.b : m.a);
  return other ? { ...m, other: view(other, me) } : null;
}

// Екеуі де бос әрі басқа кездесуі жоқ слоттар
function freeSlots(a: Profile, b: Profile): string[] {
  const busy = new Set(store.allMeetings().filter((x) => [x.a, x.b].some((id) => id === a.id || id === b.id)).map((x) => x.slot));
  return SLOTS.filter((s) => a.slots.includes(s) && b.slots.includes(s) && !busy.has(s));
}

function dashboard() {
  const ps = store.allProfiles();
  const count = <T extends string>(xs: T[]) => xs.reduce<Record<string, number>>((a, x) => ((a[x] = (a[x] ?? 0) + 1), a), {});
  const goals = count(ps.map((p) => p.goal));
  const interestByGoal: Record<string, Record<string, number>> = {};
  for (const p of ps) for (const i of p.interests) {
    interestByGoal[i] ??= {};
    interestByGoal[i][p.goal] = (interestByGoal[i][p.goal] ?? 0) + 1;
  }
  const interests = Object.entries(interestByGoal)
    .map(([id, byGoal]) => ({ id, total: Object.values(byGoal).reduce((a, b) => a + b, 0), byGoal }))
    .sort((a, b) => b.total - a.total);
  const stack = Object.entries(count(ps.flatMap((p) => p.stack))).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([name, n]) => ({ name, n }));
  const roles = Object.entries(count(ps.map((p) => p.role))).sort((a, b) => b[1] - a[1]).map(([id, n]) => ({ id, n }));
  const fb = store.allFeedback();
  const ms = store.allMeetings();
  const slotLoad = SLOTS.map((s) => ({ slot: s, n: ms.filter((m) => m.slot === s).length }));
  return {
    total: ps.length,
    real: store.userCount(),
    goals,
    balance: [
      { a: 'hire', b: 'job_seek', na: goals.hire ?? 0, nb: goals.job_seek ?? 0 },
      { a: 'mentor_offer', b: 'mentor_seek', na: goals.mentor_offer ?? 0, nb: goals.mentor_seek ?? 0 },
    ],
    interests,
    stack,
    roles,
    feedback: { met: fb.filter((f) => f.verdict === 'met').length, skip: fb.filter((f) => f.verdict === 'skip').length },
    meetings: ms.length,
    messages: store.messageCount(),
    slotLoad,
  };
}

// ── Нақты уақыт: Server-Sent Events ─────────────────────────────
// Браузер /api/me/events-ке fetch арқылы қосылады (токен тақырыпта, URL-де емес)
const subscribers = new Map<string, Set<ServerResponse>>();

function emit(userId: string, event: string, data: unknown) {
  for (const res of subscribers.get(userId) ?? []) res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function openEvents(req: IncomingMessage, res: ServerResponse, me: Profile) {
  res.writeHead(200, { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write(': connected\n\n');
  const set = subscribers.get(me.id) ?? new Set();
  set.add(res);
  subscribers.set(me.id, set);
  const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => {
    clearInterval(ping);
    set.delete(res);
    if (!set.size) subscribers.delete(me.id);
  });
}

function chatList(me: Profile): { chats: ChatSummary[]; unread: number } {
  const chats = store.chatsOf(me.id)
    .map((c) => ({ other: store.getProfile(c.otherId), last: c.last, unread: c.unread }))
    .filter((c): c is { other: Profile; last: Message; unread: number } => !!c.other)
    .map((c) => ({ ...c, other: view(c.other, me.id) }));
  return { chats, unread: chats.reduce((n, c) => n + c.unread, 0) };
}

// ── Маршруттар ─────────────────────────────────────────────────────
async function api(req: IncomingMessage, res: ServerResponse, url: URL) {
  const path = url.pathname;
  const m = req.method ?? 'GET';
  const seg = path.split('/').filter(Boolean); // ['api', ...]

  if (m === 'GET' && path === '/api/health') {
    return send(res, 200, { ok: true, profiles: store.allProfiles().length, embeddings: embedStatus, llm: llmEnabled() });
  }
  if (m === 'GET' && path === '/api/meta') {
    return send(res, 200, { event: EVENT, roles: ROLES, goals: GOALS, interests: INTERESTS, stack: STACK, slots: SLOTS, ai: { embeddings: embedStatus, llm: llmEnabled() } });
  }
  if (m === 'POST' && path === '/api/profiles') {
    limit(req, 'create', 30);
    const p = validateProfile(await readJson(req), randomUUID());
    const token = randomBytes(24).toString('base64url');
    store.upsertUser(p);
    store.setToken(p.id, token);
    matcher.index(store.allProfiles());
    await embedOne(p);
    return send(res, 201, { profile: p, token });
  }
  if (m === 'GET' && seg[1] === 'profiles' && seg[2]) {
    const p = store.getProfile(seg[2]);
    if (!p) throw new HttpError(404, 'profile_not_found');
    const viewer = bearer(req) ? store.userByToken(bearer(req)) : undefined;
    return send(res, 200, view(p, viewer?.id ?? null));
  }

  // ── /api/me/… — тек өз токенімен ──
  if (seg[1] === 'me') {
    const me = auth(req);
    const sub = seg.slice(2).join('/');
    if (m === 'GET' && sub === '') return send(res, 200, me);
    if (m === 'PUT' && sub === '') {
      limit(req, 'write', 60);
      const p = validateProfile(await readJson(req), me.id, me);
      store.upsertUser(p);
      matcher.index(store.allProfiles());
      await embedOne(p);
      return send(res, 200, p);
    }
    if (m === 'GET' && sub === 'events') return openEvents(req, res, me);
    if (m === 'GET' && sub === 'chats') return send(res, 200, chatList(me));
    if (seg[2] === 'chats' && seg[3]) {
      const other = store.getProfile(seg[3]);
      if (!other || other.id === me.id) throw new HttpError(404, 'target_not_found');
      if (m === 'GET' && !seg[4]) {
        const readAt = store.markRead(me.id, other.id);
        if (readAt) emit(other.id, 'read', { by: me.id, at: readAt });
        const thread: ChatThread = { other: view(other, me.id), messages: store.conversation(me.id, other.id), readByOther: store.lastRead(other.id, me.id) };
        return send(res, 200, thread);
      }
      if (m === 'POST' && seg[4] === 'read') {
        const readAt = store.markRead(me.id, other.id);
        if (readAt) emit(other.id, 'read', { by: me.id, at: readAt });
        return send(res, 200, { ok: true });
      }
      if (m === 'POST' && !seg[4]) {
        limit(req, 'message', 40);
        const text = String((await readJson(req)).text ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, 1000);
        if (!text) throw new HttpError(422, 'message_empty');
        const msg: Message = { id: randomUUID(), from: me.id, to: other.id, text, at: new Date().toISOString() };
        store.addMessage(msg);
        // Алушыға — хабарлама мен жіберуші; жіберушінің басқа құрылғыларына — тек хабарлама
        emit(other.id, 'message', { message: msg, from: view(me, other.id) });
        emit(me.id, 'message', { message: msg });
        return send(res, 201, msg);
      }
    }
    if (m === 'GET' && sub === 'recommendations') return send(res, 200, recommend(me, asLang(url.searchParams.get('lang'))));
    if (m === 'POST' && sub === 'icebreakers') {
      limit(req, 'llm', 20);
      const body = await readJson(req);
      const ids: string[] = Array.isArray(body.targetIds) ? body.targetIds.slice(0, 5).map(String) : [];
      const others = ids.map((id) => store.getProfile(id)).filter((p): p is Profile => !!p && p.id !== me.id);
      if (!llmEnabled() || !others.length) return send(res, 200, { lines: {}, source: 'template' });
      try {
        return send(res, 200, { lines: await aiIcebreakers(me, others, asLang(body.lang)), source: 'gemini' });
      } catch (e) {
        console.warn('icebreakers fallback:', (e as Error).message);
        return send(res, 200, { lines: {}, source: 'template' });
      }
    }
    if (m === 'POST' && sub === 'feedback') {
      limit(req, 'write', 120);
      const body = await readJson(req);
      const target = store.getProfile(String(body.targetId));
      if (!target || target.id === me.id) throw new HttpError(404, 'target_not_found');
      const verdict = body.verdict as Verdict | 'undo';
      if (verdict === 'undo') store.removeFeedback(me.id, target.id);
      else if (verdict === 'met' || verdict === 'skip') store.addFeedback({ userId: me.id, targetId: target.id, verdict, at: new Date().toISOString() });
      else throw new HttpError(422, 'bad_verdict');
      // Кері байланыстан кейін бірден қайта есептелген тізім
      return send(res, 200, recommend(me, asLang(body.lang)));
    }
    if (m === 'GET' && sub === 'contacts') {
      const met = store.feedbackOf(me.id).filter((f) => f.verdict === 'met')
        .map((f) => store.getProfile(f.targetId)).filter((p): p is Profile => !!p).map((p) => view(p, me.id));
      return send(res, 200, met);
    }
    if (m === 'GET' && sub === 'meetings') {
      const list = store.meetingsOf(me.id).map((x) => meetingView(x, me.id)).filter((x): x is MeetingView => !!x).sort((a, b) => a.slot.localeCompare(b.slot));
      return send(res, 200, list);
    }
    if (m === 'GET' && sub === 'free-slots') {
      const other = store.getProfile(url.searchParams.get('targetId') ?? '');
      if (!other || other.id === me.id) throw new HttpError(404, 'target_not_found');
      // Кездесу бұрыннан болса — слот таңдатпай, барын көрсетеміз
      const existing = store.allMeetings().find((x) => (x.a === me.id && x.b === other.id) || (x.a === other.id && x.b === me.id));
      return send(res, 200, { slots: existing ? [] : freeSlots(me, other), existing: existing ? meetingView(existing, me.id) : null });
    }
    if (m === 'POST' && sub === 'meetings') {
      limit(req, 'write', 120);
      const body = await readJson(req);
      const other = store.getProfile(String(body.targetId));
      if (!other || other.id === me.id) throw new HttpError(404, 'target_not_found');
      const all = store.allMeetings();
      if (all.some((x) => (x.a === me.id && x.b === other.id) || (x.a === other.id && x.b === me.id))) throw new HttpError(409, 'already_scheduled');
      const free = freeSlots(me, other);
      const slot = typeof body.slot === 'string' ? (free.includes(body.slot) ? body.slot : undefined) : free[0];
      if (!slot) throw new HttpError(409, 'no_common_slot');
      const usedTables = new Set(all.filter((x) => x.slot === slot).map((x) => x.table));
      let table = 1;
      while (usedTables.has(table) && table <= EVENT.tables) table++;
      if (table > EVENT.tables) throw new HttpError(409, 'no_tables');
      const mt: Meeting = { id: randomUUID(), a: me.id, b: other.id, slot, table, at: new Date().toISOString() };
      store.addMeeting(mt);
      return send(res, 201, meetingView(mt, me.id));
    }
    if (m === 'DELETE' && seg[2] === 'meetings' && seg[3]) {
      const mt = store.allMeetings().find((x) => x.id === seg[3]);
      if (!mt || (mt.a !== me.id && mt.b !== me.id)) throw new HttpError(404, 'meeting_not_found');
      store.removeMeeting(mt.id);
      return send(res, 200, { ok: true });
    }
    throw new HttpError(404, 'not_found');
  }
  if (m === 'GET' && path === '/api/dashboard') return send(res, 200, dashboard());
  if (m === 'GET' && path === '/api/booths') return send(res, 200, store.booths);
  throw new HttpError(404, 'not_found');
}

// ── Статика (web/dist) ─────────────────────────────────────────────
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json', '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
};

function serveStatic(res: ServerResponse, pathname: string) {
  const dir = CONFIG.webDir;
  if (!existsSync(dir)) {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8' });
    return res.end('Web UI is not built. Run: npm run build');
  }
  let rel = pathname;
  try { rel = decodeURIComponent(pathname); } catch { /* қате URI — index.html */ }
  let file = normalize(join(dir, rel));
  if (!file.startsWith(dir) || !existsSync(file) || statSync(file).isDirectory()) file = join(dir, 'index.html');
  const ext = extname(file);
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    'cache-control': file.includes(`${join('dist', 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
  });
  res.end(readFileSync(file));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'no-referrer');
  try {
    if (url.pathname.startsWith('/api/')) await api(req, res, url);
    else serveStatic(res, url.pathname);
  } catch (e) {
    if (e instanceof HttpError) return send(res, e.status, { error: e.code });
    console.error(e);
    send(res, 500, { error: 'internal' });
  }
});

server.listen(CONFIG.port, () => {
  console.log(`TezMeet: http://localhost:${CONFIG.port}  (profiles: ${store.allProfiles().length}, gemini: ${embedEnabled() ? 'on' : 'off'})`);
});

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    saveEmbedCache();
    store.flush();
    server.close();
    process.exit(0);
  });
}

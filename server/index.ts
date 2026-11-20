// TezMeet HTTP сервері: REST API + веб-интерфейстің статикалық файлдары.
// Сыртқы тәуелділік жоқ — тек Node.js (≥ 22.18, TypeScript-ті тікелей орындайды).
//   node server/index.ts

import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { EVENT, GOALS, INTERESTS, ROLES, SLOTS, STACK, type GoalId, type Lang, type RoleId } from '../shared/catalog.ts';
import type { Meeting, MeetingView, Profile, RecResponse, Verdict } from '../shared/types.ts';
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

// Қарапайым rate limit: бір IP-ден минутына 60 жазу сұранысы
const hits = new Map<string, { n: number; t: number }>();
function limit(req: IncomingMessage, max = 60) {
  const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.socket.remoteAddress || '?';
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60_000) hits.set(ip, { n: 1, t: now });
  else if (++h.n > max) throw new HttpError(429, 'rate_limited');
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
  };
}

function mustUser(id: string): Profile {
  const p = store.getProfile(id);
  if (!p || p.synthetic) throw new HttpError(404, 'profile_not_found');
  return p;
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

function recommend(userId: string, lang: Lang): RecResponse {
  const t0 = performance.now();
  const me = mustUser(userId);
  const fb = store.feedbackOf(userId);
  const exclude = new Set(fb.map((f) => f.targetId));
  const skipped = fb.filter((f) => f.verdict === 'skip').map((f) => store.getProfile(f.targetId)).filter((p): p is Profile => !!p);
  const { items, semSource } = matcher.recommend(me, lang, { exclude, skipped });
  const booths = recommendBooths(me, store.booths, lang);
  return { items, booths, tookMs: Math.round((performance.now() - t0) * 10) / 10, semantic: semSource };
}

function meetingView(m: Meeting, me: string): MeetingView | null {
  const other = store.getProfile(m.a === me ? m.b : m.a);
  return other ? { ...m, other } : null;
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
    slotLoad,
  };
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
    limit(req, 20);
    const p = validateProfile(await readJson(req), randomUUID());
    store.upsertUser(p);
    matcher.index(store.allProfiles());
    await embedOne(p);
    return send(res, 201, p);
  }
  if (seg[1] === 'profiles' && seg[2]) {
    if (m === 'GET') {
      const p = store.getProfile(seg[2]);
      if (!p) throw new HttpError(404, 'profile_not_found');
      return send(res, 200, p);
    }
    if (m === 'PUT') {
      limit(req, 30);
      const prev = mustUser(seg[2]);
      const p = validateProfile(await readJson(req), prev.id, prev);
      store.upsertUser(p);
      matcher.index(store.allProfiles());
      await embedOne(p);
      return send(res, 200, p);
    }
  }
  if (m === 'GET' && seg[1] === 'recommendations' && seg[2]) {
    return send(res, 200, recommend(seg[2], asLang(url.searchParams.get('lang'))));
  }
  if (m === 'POST' && path === '/api/icebreakers') {
    limit(req, 30);
    const body = await readJson(req);
    const me = mustUser(String(body.userId));
    const ids: string[] = Array.isArray(body.targetIds) ? body.targetIds.slice(0, 5).map(String) : [];
    const others = ids.map((id) => store.getProfile(id)).filter((p): p is Profile => !!p);
    if (!llmEnabled() || !others.length) return send(res, 200, { lines: {}, source: 'template' });
    try {
      return send(res, 200, { lines: await aiIcebreakers(me, others, asLang(body.lang)), source: 'gemini' });
    } catch (e) {
      console.warn('icebreakers fallback:', (e as Error).message);
      return send(res, 200, { lines: {}, source: 'template' });
    }
  }
  if (m === 'POST' && path === '/api/feedback') {
    limit(req);
    const body = await readJson(req);
    const me = mustUser(String(body.userId));
    const target = store.getProfile(String(body.targetId));
    if (!target || target.id === me.id) throw new HttpError(404, 'target_not_found');
    const verdict = body.verdict as Verdict | 'undo';
    if (verdict === 'undo') store.removeFeedback(me.id, target.id);
    else if (verdict === 'met' || verdict === 'skip') store.addFeedback({ userId: me.id, targetId: target.id, verdict, at: new Date().toISOString() });
    else throw new HttpError(422, 'bad_verdict');
    // Кері байланыстан кейін бірден қайта есептелген тізім
    return send(res, 200, recommend(me.id, asLang(body.lang)));
  }
  if (m === 'GET' && seg[1] === 'contacts' && seg[2]) {
    const me = mustUser(seg[2]);
    const met = store.feedbackOf(me.id).filter((f) => f.verdict === 'met').map((f) => store.getProfile(f.targetId)).filter(Boolean);
    return send(res, 200, met);
  }
  if (m === 'GET' && seg[1] === 'meetings' && seg[2]) {
    const me = mustUser(seg[2]);
    const list = store.meetingsOf(me.id).map((x) => meetingView(x, me.id)).filter(Boolean).sort((a, b) => a!.slot.localeCompare(b!.slot));
    return send(res, 200, list);
  }
  if (m === 'POST' && path === '/api/meetings') {
    limit(req);
    const body = await readJson(req);
    const me = mustUser(String(body.userId));
    const other = store.getProfile(String(body.targetId));
    if (!other || other.id === me.id) throw new HttpError(404, 'target_not_found');
    const all = store.allMeetings();
    if (all.some((x) => (x.a === me.id && x.b === other.id) || (x.a === other.id && x.b === me.id))) throw new HttpError(409, 'already_scheduled');
    const busy = (id: string) => new Set(all.filter((x) => x.a === id || x.b === id).map((x) => x.slot));
    const bm = busy(me.id), bo = busy(other.id);
    const wanted = typeof body.slot === 'string' ? [body.slot] : SLOTS;
    const slot = wanted.find((s) => me.slots.includes(s) && other.slots.includes(s) && !bm.has(s) && !bo.has(s));
    if (!slot) throw new HttpError(409, 'no_common_slot');
    const usedTables = new Set(all.filter((x) => x.slot === slot).map((x) => x.table));
    let table = 1;
    while (usedTables.has(table) && table <= EVENT.tables) table++;
    if (table > EVENT.tables) throw new HttpError(409, 'no_tables');
    const mt: Meeting = { id: randomUUID(), a: me.id, b: other.id, slot, table, at: new Date().toISOString() };
    store.addMeeting(mt);
    return send(res, 201, meetingView(mt, me.id));
  }
  if (m === 'DELETE' && seg[1] === 'meetings' && seg[2]) {
    const userId = url.searchParams.get('userId') ?? '';
    const mt = store.allMeetings().find((x) => x.id === seg[2]);
    if (!mt || (mt.a !== userId && mt.b !== userId)) throw new HttpError(404, 'meeting_not_found');
    store.removeMeeting(mt.id);
    return send(res, 200, { ok: true });
  }
  if (m === 'GET' && path === '/api/meetings-slots') {
    // Пайдаланушы мен адамның ортақ бос слоттары (кездесу парағы үшін)
    const me = mustUser(url.searchParams.get('userId') ?? '');
    const other = store.getProfile(url.searchParams.get('targetId') ?? '');
    if (!other) throw new HttpError(404, 'target_not_found');
    const all = store.allMeetings();
    const busy = new Set(all.filter((x) => [x.a, x.b].some((id) => id === me.id || id === other.id)).map((x) => x.slot));
    return send(res, 200, SLOTS.filter((s) => me.slots.includes(s) && other.slots.includes(s) && !busy.has(s)));
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
  let file = normalize(join(dir, decodeURIComponent(pathname)));
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

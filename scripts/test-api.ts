// API-дің толық сценарийлік тесті: бөлек порт пен уақытша деректер қалтасында сервер
// көтеріп, қатысушының бүкіл жолын тексереді. Gemini өшірулі — тест желіге тәуелсіз.
//   node scripts/test-api.ts

import assert from 'node:assert/strict';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GOAL_FIT, type GoalId } from '../shared/catalog.ts';
import type { MeetingView, Profile, RecResponse } from '../shared/types.ts';

const PORT = 18000 + Math.floor(Math.random() * 1000);
const BASE = `http://127.0.0.1:${PORT}`;
const dataDir = mkdtempSync(join(tmpdir(), 'tezmeet-test-'));
const root = new URL('..', import.meta.url);

let server: ChildProcess;
async function start() {
  server = spawn(process.execPath, ['server/index.ts'], {
    cwd: root,
    env: { ...process.env, PORT: String(PORT), DATA_DIR: dataDir, GEMINI_API_KEY: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (let i = 0; i < 50; i++) {
    try {
      if ((await fetch(`${BASE}/api/health`)).ok) return;
    } catch { /* әлі көтерілмеді */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('server did not start');
}
async function stop() {
  server.kill();
  await new Promise((r) => server.once('exit', r));
}

type Res<T> = { status: number; body: T; ms: number };
async function call<T = any>(method: string, path: string, opts: { token?: string; body?: unknown; raw?: string } = {}): Promise<Res<T>> {
  const t0 = performance.now();
  const res = await fetch(BASE + path, {
    method,
    headers: { 'content-type': 'application/json', ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.raw ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
  });
  const text = await res.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, body, ms: performance.now() - t0 };
}

let passed = 0;
async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    console.log(`  ✗ ${name}`);
    throw e;
  }
}

const base = {
  company: '', experience: 2, lookingFor: [], slots: [], telegram: '', lang: 'ru',
};
const seeker = { ...base, name: 'Тест Соискатель', role: 'backend', stack: ['Go', 'PostgreSQL', 'Docker'], interests: ['fintech', 'cloud'], about: 'Go-разработчик, ищу работу в финтехе', goal: 'job_seek', telegram: '@seeker_tz' };
const hirer = { ...base, name: 'Тест Рекрутер', role: 'recruiter', company: 'JuryCo', experience: 6, stack: ['Go', 'PostgreSQL', 'Kafka'], interests: ['fintech'], about: 'Нанимаем backend-разработчиков на Go в платёжный сервис', goal: 'hire', lookingFor: ['backend'], telegram: 'hirer_tz' };

function checkRecs(r: RecResponse, goal: GoalId) {
  assert.equal(r.items.length, 5, 'top-5');
  for (const it of r.items) {
    assert.ok(GOAL_FIT[goal][it.profile.goal] > 0, `goal ${goal} must not see ${it.profile.goal}`);
    assert.ok(it.explanation.length > 20, 'explanation present');
    const sentences = it.explanation.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    assert.ok(sentences >= 1 && sentences <= 2, `explanation is 1–2 sentences: ${it.explanation}`);
    assert.ok(it.icebreaker.length > 20, 'icebreaker present');
    assert.ok(it.score >= 0 && it.score <= 100);
  }
  assert.ok(r.tookMs < 3000, 'under 3 s');
  assert.equal(r.booths.length, 2, '2 booths');
}

async function main() {
  await start();
  console.log(`TezMeet API test → ${BASE}`);
  let A = { token: '', p: {} as Profile };
  let B = { token: '', p: {} as Profile };
  let C = { token: '', p: {} as Profile };

  await test('health and meta', async () => {
    const h = await call('GET', '/api/health');
    assert.equal(h.body.profiles, 120);
    const m = await call('GET', '/api/meta');
    assert.equal(m.body.goals.length, 6);
    assert.equal(m.body.slots.length, 18);
    assert.equal(m.body.ai.llm, false);
  });

  await test('validation: every required field', async () => {
    const cases: [object, string][] = [
      [{ ...seeker, name: 'x' }, 'name_required'],
      [{ ...seeker, role: 'wizard' }, 'role_required'],
      [{ ...seeker, goal: 'party' }, 'goal_required'],
      [{ ...seeker, stack: [] }, 'stack_required'],
      [{ ...seeker, interests: ['nope'] }, 'interests_required'],
      [{ ...seeker, about: 'short' }, 'about_required'],
    ];
    for (const [body, code] of cases) {
      const r = await call('POST', '/api/profiles', { body });
      assert.equal(r.status, 422);
      assert.equal(r.body.error, code);
    }
    assert.equal((await call('POST', '/api/profiles', { raw: '{bad' })).body.error, 'bad_json');
    assert.equal((await call('POST', '/api/profiles', { raw: JSON.stringify({ about: 'x'.repeat(40000) }) })).status, 413);
  });

  await test('create profile returns token; /api/me needs it', async () => {
    const r = await call<{ profile: Profile; token: string }>('POST', '/api/profiles', { body: seeker });
    assert.equal(r.status, 201);
    assert.ok(r.body.token.length >= 24);
    assert.equal(r.body.profile.telegram, 'seeker_tz', '@ stripped');
    assert.equal(r.body.profile.slots.length, 18, 'no slots = all day');
    A = { token: r.body.token, p: r.body.profile };
    assert.equal((await call('GET', '/api/me')).status, 401);
    assert.equal((await call('GET', '/api/me', { token: 'wrong' })).status, 401);
    assert.equal((await call('GET', '/api/me', { token: A.token })).body.id, A.p.id);
  });

  await test('top-5 for a job seeker: only compatible goals, < 3 s', async () => {
    const r = await call<RecResponse>('GET', '/api/me/recommendations?lang=ru', { token: A.token });
    assert.equal(r.status, 200);
    checkRecs(r.body, 'job_seek');
    assert.ok(r.ms < 3000);
    assert.ok(r.body.items.filter((i) => i.profile.goal === 'hire').length >= 3, 'mostly hirers');
    assert.ok(r.body.items[0].profile.stack.includes('Go'), 'best match hires Go');
  });

  await test('three languages', async () => {
    const kk = (await call<RecResponse>('GET', '/api/me/recommendations?lang=kk', { token: A.token })).body;
    const en = (await call<RecResponse>('GET', '/api/me/recommendations?lang=en', { token: A.token })).body;
    assert.match(kk.items[0].explanation, /іздейді|жалдайды|тәжірибе/);
    assert.match(kk.items[0].icebreaker, /Сәлем/);
    assert.match(en.items[0].explanation, /hiring|looking|share/);
    assert.match(en.items[0].icebreaker, /^Hi /);
  });

  await test('feedback: skip removes and recalculates, undo restores, met → contacts', async () => {
    const before = (await call<RecResponse>('GET', '/api/me/recommendations', { token: A.token })).body;
    const first = before.items[0].profile.id;
    const after = (await call<RecResponse>('POST', '/api/me/feedback', { token: A.token, body: { targetId: first, verdict: 'skip' } })).body;
    checkRecs(after, 'job_seek');
    assert.ok(!after.items.some((i) => i.profile.id === first), 'skipped person is gone');
    const undo = (await call<RecResponse>('POST', '/api/me/feedback', { token: A.token, body: { targetId: first, verdict: 'undo' } })).body;
    assert.ok(undo.items.some((i) => i.profile.id === first), 'undo restores');
    await call('POST', '/api/me/feedback', { token: A.token, body: { targetId: first, verdict: 'met' } });
    const contacts = (await call<Profile[]>('GET', '/api/me/contacts', { token: A.token })).body;
    assert.deepEqual(contacts.map((c) => c.id), [first]);
    assert.equal((await call('POST', '/api/me/feedback', { token: A.token, body: { targetId: first, verdict: 'love' } })).status, 422);
    assert.equal((await call('POST', '/api/me/feedback', { token: A.token, body: { targetId: A.p.id, verdict: 'met' } })).status, 404, 'not yourself');
  });

  await test('two real attendees find each other (hirer sees the seeker)', async () => {
    const r = await call<{ profile: Profile; token: string }>('POST', '/api/profiles', { body: hirer });
    B = { token: r.body.token, p: r.body.profile };
    const recs = (await call<RecResponse>('GET', '/api/me/recommendations', { token: B.token })).body;
    checkRecs(recs, 'hire');
    assert.ok(recs.items.some((i) => i.profile.id === A.p.id), 'seeker is in hirer top-5');
  });

  await test('privacy: Telegram only after the owner marks you as met', async () => {
    const hidden = (await call<Profile>('GET', `/api/profiles/${B.p.id}`, { token: A.token })).body;
    assert.equal(hidden.telegram, undefined);
    const anon = (await call<Profile>('GET', `/api/profiles/${A.p.id}`)).body;
    assert.equal(anon.telegram, undefined);
    await call('POST', '/api/me/feedback', { token: B.token, body: { targetId: A.p.id, verdict: 'met' } });
    const shown = (await call<Profile>('GET', `/api/profiles/${B.p.id}`, { token: A.token })).body;
    assert.equal(shown.telegram, 'hirer_tz');
    const bRecs = (await call<RecResponse>('GET', '/api/me/recommendations', { token: B.token })).body;
    assert.ok(!bRecs.items.some((i) => i.profile.id === A.p.id), 'met person leaves the list');
  });

  await test('1:1 meetings: common slot, table, no duplicates, cancel rules', async () => {
    const free = (await call<{ slots: string[]; existing: MeetingView | null }>('GET', `/api/me/free-slots?targetId=${B.p.id}`, { token: A.token })).body;
    assert.equal(free.slots.length, 18);
    assert.equal(free.existing, null);
    const m1 = await call<MeetingView>('POST', '/api/me/meetings', { token: A.token, body: { targetId: B.p.id, slot: '12:00' } });
    assert.equal(m1.status, 201);
    assert.equal(m1.body.slot, '12:00');
    assert.equal(m1.body.table, 1);
    assert.equal((await call('POST', '/api/me/meetings', { token: B.token, body: { targetId: A.p.id } })).body.error, 'already_scheduled');
    const bList = (await call<MeetingView[]>('GET', '/api/me/meetings', { token: B.token })).body;
    assert.equal(bList[0].other.id, A.p.id, 'other side sees it');
    const again = (await call<{ slots: string[]; existing: MeetingView | null }>('GET', `/api/me/free-slots?targetId=${B.p.id}`, { token: A.token })).body;
    assert.equal(again.existing?.slot, '12:00', 'existing meeting is reported instead of slots');
    assert.equal(again.slots.length, 0);

    const r = await call<{ profile: Profile; token: string }>('POST', '/api/profiles', { body: { ...seeker, name: 'Тест Третий', slots: ['12:00', '12:20'] } });
    C = { token: r.body.token, p: r.body.profile };
    const synthetic = (await call<RecResponse>('GET', '/api/me/recommendations', { token: C.token })).body.items.find((i) => i.profile.slots.includes('12:00'))!;
    const m2 = await call<MeetingView>('POST', '/api/me/meetings', { token: C.token, body: { targetId: synthetic.profile.id, slot: '12:00' } });
    assert.equal(m2.body.table, 2, 'second meeting in the same slot gets the next table');
    const noSlot = (await call<RecResponse>('GET', '/api/me/recommendations', { token: C.token })).body.items.find((i) => !i.profile.slots.some((s) => s === '12:20'));
    if (noSlot) assert.equal((await call('POST', '/api/me/meetings', { token: C.token, body: { targetId: noSlot.profile.id } })).body.error, 'no_common_slot');

    assert.equal((await call('DELETE', `/api/me/meetings/${m1.body.id}`, { token: C.token })).status, 404, 'stranger cannot cancel');
    assert.equal((await call('DELETE', `/api/me/meetings/${m1.body.id}`, { token: B.token })).status, 200, 'participant can cancel');
    assert.equal((await call<MeetingView[]>('GET', '/api/me/meetings', { token: A.token })).body.length, 0);
  });

  await test('editing the profile changes recommendations', async () => {
    const r = await call<Profile>('PUT', '/api/me', { token: A.token, body: { ...seeker, goal: 'mentor_seek', experience: 0 } });
    assert.equal(r.status, 200);
    assert.equal(r.body.goal, 'mentor_seek');
    assert.ok(r.body.updatedAt);
    const recs = (await call<RecResponse>('GET', '/api/me/recommendations', { token: A.token })).body;
    checkRecs(recs, 'mentor_seek');
    assert.ok(recs.items.filter((i) => i.profile.goal === 'mentor_offer').length >= 3, 'mostly mentors');
    assert.equal((await call('PUT', '/api/me', { body: seeker })).status, 401, 'no token, no edit');
  });

  await test('organizer dashboard reflects activity', async () => {
    const d = (await call('GET', '/api/dashboard')).body;
    assert.equal(d.total, 123);
    assert.equal(d.real, 3);
    assert.equal(d.meetings, 1);
    assert.ok(d.feedback.met >= 2);
    assert.ok(d.interests.length > 10);
    assert.equal(d.slotLoad.find((s: { slot: string }) => s.slot === '12:00').n, 1);
  });

  await test('static files and path traversal', async () => {
    const page = await call('GET', '/');
    assert.ok(page.status === 200 || page.status === 503);
    const trav = await call('GET', '/..%2f..%2fpackage.json');
    assert.ok(typeof trav.body !== 'object' || !('devDependencies' in trav.body), 'no file outside web/dist');
    assert.notEqual((await call('GET', '/%E0%A4%A')).status, 500, 'malformed URI handled');
    assert.equal((await call('GET', '/api/nope')).status, 404);
  });

  await test('data survives a restart', async () => {
    await new Promise((r) => setTimeout(r, 400)); // кешіктірілген жазу
    await stop();
    await start();
    const me = await call<Profile>('GET', '/api/me', { token: B.token });
    assert.equal(me.status, 200);
    assert.equal(me.body.name, hirer.name);
    assert.equal((await call<Profile[]>('GET', '/api/me/contacts', { token: B.token })).body.length, 1);
  });

  await stop();
  console.log(`\n${passed} passed`);
}

main()
  .catch(async (e) => {
    console.error(e);
    server?.kill();
    process.exitCode = 1;
  })
  .finally(() => rmSync(dataDir, { recursive: true, force: true }));

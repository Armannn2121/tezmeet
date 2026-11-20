// Деректер қоймасы: синтетикалық анкеталар (data/profiles.json, тек оқу) +
// қатысушылар енгізген анкеталар, кері байланыс, кездесулер, хабарламалар (var/state.json).
// 300+ адамдық митап үшін жадта ұстау жеткілікті; файлға атомарлы түрде жазылады.

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Booth, ChatSummary, Feedback, Meeting, Message, Profile } from '../shared/types.ts';
import { CONFIG } from './config.ts';

// tokens: userId → sha256(құпия токен). Токеннің өзі тек қатысушының браузерінде сақталады.
// reads: «оқырман:сұхбаттас» → соңғы оқылған хабарламаның уақыты
type State = {
  users: Profile[]; feedback: Feedback[]; meetings: Meeting[]; tokens: Record<string, string>;
  messages: Message[]; reads: Record<string, string>;
};

const stateFile = join(CONFIG.varDir, 'state.json');

export const seed: Profile[] = JSON.parse(readFileSync(join(CONFIG.dataDir, 'profiles.json'), 'utf8'));
export const booths: Booth[] = JSON.parse(readFileSync(join(CONFIG.dataDir, 'booths.json'), 'utf8'));

const empty = (): State => ({ users: [], feedback: [], meetings: [], tokens: {}, messages: [], reads: {} });
const state: State = existsSync(stateFile) ? { ...empty(), ...JSON.parse(readFileSync(stateFile, 'utf8')) } : empty();

const byId = new Map<string, Profile>();
for (const p of [...seed, ...state.users]) byId.set(p.id, p);

let timer: NodeJS.Timeout | undefined;
export function flush() {
  clearTimeout(timer);
  timer = undefined;
  const tmp = stateFile + '.tmp';
  writeFileSync(tmp, JSON.stringify(state));
  renameSync(tmp, stateFile);
}
function persist() {
  clearTimeout(timer);
  timer = setTimeout(flush, 200);
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const byToken = new Map(Object.entries(state.tokens).map(([id, h]) => [h, id]));

export function setToken(userId: string, token: string) {
  const h = sha(token);
  state.tokens[userId] = h;
  byToken.set(h, userId);
  persist();
}

export function userByToken(token: string): Profile | undefined {
  const id = byToken.get(sha(token));
  return id ? byId.get(id) : undefined;
}

// B адамы A-ны «Познакомились» деп белгіледі ме — сонда ғана A B-ның Telegram-ын көреді
export const markedMet = (owner: string, viewer: string) =>
  state.feedback.some((f) => f.userId === owner && f.targetId === viewer && f.verdict === 'met');

export const allProfiles = () => [...byId.values()];
export const getProfile = (id: string) => byId.get(id);
export const userCount = () => state.users.length;

export function upsertUser(p: Profile) {
  const i = state.users.findIndex((u) => u.id === p.id);
  if (i >= 0) state.users[i] = p;
  else state.users.push(p);
  byId.set(p.id, p);
  persist();
}

export function feedbackOf(userId: string) {
  return state.feedback.filter((f) => f.userId === userId);
}

export function addFeedback(f: Feedback) {
  // Бір жұпқа соңғы шешім ғана сақталады
  state.feedback = state.feedback.filter((x) => !(x.userId === f.userId && x.targetId === f.targetId));
  state.feedback.push(f);
  persist();
}

export function removeFeedback(userId: string, targetId: string) {
  state.feedback = state.feedback.filter((x) => !(x.userId === userId && x.targetId === targetId));
  persist();
}

export const allFeedback = () => state.feedback;
export const allMeetings = () => state.meetings;
export const meetingsOf = (id: string) => state.meetings.filter((m) => m.a === id || m.b === id);

export function addMeeting(m: Meeting) {
  state.meetings.push(m);
  persist();
}

export function removeMeeting(id: string) {
  state.meetings = state.meetings.filter((m) => m.id !== id);
  persist();
}

// ── Хабарламалар ───────────────────────────────────────────────
const between = (m: Message, a: string, b: string) => (m.from === a && m.to === b) || (m.from === b && m.to === a);

export function addMessage(m: Message) {
  state.messages.push(m);
  persist();
}

export function conversation(a: string, b: string, limit = 300): Message[] {
  const out = state.messages.filter((m) => between(m, a, b));
  return out.slice(-limit);
}

export const lastRead = (reader: string, other: string) => state.reads[`${reader}:${other}`] ?? null;

export function markRead(reader: string, other: string): string | null {
  const last = [...state.messages].reverse().find((m) => m.from === other && m.to === reader);
  if (!last) return null;
  const prev = state.reads[`${reader}:${other}`];
  if (prev && prev >= last.at) return null;
  state.reads[`${reader}:${other}`] = last.at;
  persist();
  return last.at;
}

// Қатысушының барлық сұхбаттары: соңғы хабарлама және оқылмағандар саны
export function chatsOf(userId: string): { otherId: string; last: Message; unread: number }[] {
  const byOther = new Map<string, { last: Message; unread: number }>();
  for (const m of state.messages) {
    if (m.from !== userId && m.to !== userId) continue;
    const other = m.from === userId ? m.to : m.from;
    const row = byOther.get(other) ?? { last: m, unread: 0 };
    row.last = m;
    if (m.to === userId) {
      const read = state.reads[`${userId}:${other}`];
      if (!read || m.at > read) row.unread++;
    }
    byOther.set(other, row);
  }
  return [...byOther].map(([otherId, r]) => ({ otherId, ...r })).sort((x, y) => y.last.at.localeCompare(x.last.at));
}

export const messageCount = () => state.messages.length;
export type { ChatSummary };

// Деректер қоймасы: синтетикалық анкеталар (data/profiles.json, тек оқу) +
// қатысушылар енгізген анкеталар, кері байланыс, кездесулер (var/state.json).
// 300+ адамдық митап үшін жадта ұстау жеткілікті; файлға атомарлы түрде жазылады.

import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Booth, Feedback, Meeting, Profile } from '../shared/types.ts';
import { CONFIG } from './config.ts';

type State = { users: Profile[]; feedback: Feedback[]; meetings: Meeting[] };

const stateFile = join(CONFIG.varDir, 'state.json');

export const seed: Profile[] = JSON.parse(readFileSync(join(CONFIG.dataDir, 'profiles.json'), 'utf8'));
export const booths: Booth[] = JSON.parse(readFileSync(join(CONFIG.dataDir, 'booths.json'), 'utf8'));

const state: State = existsSync(stateFile)
  ? { users: [], feedback: [], meetings: [], ...JSON.parse(readFileSync(stateFile, 'utf8')) }
  : { users: [], feedback: [], meetings: [] };

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

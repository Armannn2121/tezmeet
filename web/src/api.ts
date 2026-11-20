import type { EVENT, GOALS, INTERESTS, ROLES } from '../../shared/catalog.ts';
import type { MeetingView, Profile, ProfileInput, RecResponse, Verdict } from '../../shared/types.ts';
import type { Lang } from '../../shared/catalog.ts';

export class ApiError extends Error {
  code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
  }
}

// Қатысушының құпия токені: анкета жасалғанда сервер береді, тек осы браузерде сақталады
let token: string | null = null;
export const setApiToken = (t: string | null) => { token = t; };

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...init?.headers },
    });
  } catch {
    throw new ApiError('network');
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body.error ?? `http_${res.status}`);
  return body as T;
}

export type Meta = {
  event: typeof EVENT;
  roles: typeof ROLES;
  goals: typeof GOALS;
  interests: typeof INTERESTS;
  stack: string[];
  slots: string[];
  ai: { embeddings: 'off' | 'warming' | 'ready' | 'error'; llm: boolean };
};

export type Dashboard = {
  total: number;
  real: number;
  goals: Record<string, number>;
  balance: { a: string; b: string; na: number; nb: number }[];
  interests: { id: string; total: number; byGoal: Record<string, number> }[];
  stack: { name: string; n: number }[];
  roles: { id: string; n: number }[];
  feedback: { met: number; skip: number };
  meetings: number;
  slotLoad: { slot: string; n: number }[];
};

const json = (b: unknown) => JSON.stringify(b);

export const api = {
  meta: () => req<Meta>('/api/meta'),
  createProfile: (p: ProfileInput) => req<{ profile: Profile; token: string }>('/api/profiles', { method: 'POST', body: json(p) }),
  me: () => req<Profile>('/api/me'),
  updateProfile: (p: ProfileInput) => req<Profile>('/api/me', { method: 'PUT', body: json(p) }),
  recommendations: (lang: Lang) => req<RecResponse>(`/api/me/recommendations?lang=${lang}`),
  icebreakers: (targetIds: string[], lang: Lang) =>
    req<{ lines: Record<string, string>; source: 'gemini' | 'template' }>('/api/me/icebreakers', { method: 'POST', body: json({ targetIds, lang }) }),
  feedback: (targetId: string, verdict: Verdict | 'undo', lang: Lang) =>
    req<RecResponse>('/api/me/feedback', { method: 'POST', body: json({ targetId, verdict, lang }) }),
  contacts: () => req<Profile[]>('/api/me/contacts'),
  meetings: () => req<MeetingView[]>('/api/me/meetings'),
  freeSlots: (targetId: string) => req<{ slots: string[]; existing: MeetingView | null }>(`/api/me/free-slots?targetId=${encodeURIComponent(targetId)}`),
  book: (targetId: string, slot?: string) => req<MeetingView>('/api/me/meetings', { method: 'POST', body: json({ targetId, slot }) }),
  cancelMeeting: (id: string) => req<{ ok: true }>(`/api/me/meetings/${id}`, { method: 'DELETE' }),
  dashboard: () => req<Dashboard>('/api/dashboard'),
};

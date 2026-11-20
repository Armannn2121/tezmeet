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

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers: { 'content-type': 'application/json', ...init?.headers } });
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
  getProfile: (id: string) => req<Profile>(`/api/profiles/${id}`),
  createProfile: (p: ProfileInput) => req<Profile>('/api/profiles', { method: 'POST', body: json(p) }),
  updateProfile: (id: string, p: ProfileInput) => req<Profile>(`/api/profiles/${id}`, { method: 'PUT', body: json(p) }),
  recommendations: (id: string, lang: Lang) => req<RecResponse>(`/api/recommendations/${id}?lang=${lang}`),
  icebreakers: (userId: string, targetIds: string[], lang: Lang) =>
    req<{ lines: Record<string, string>; source: 'gemini' | 'template' }>('/api/icebreakers', { method: 'POST', body: json({ userId, targetIds, lang }) }),
  feedback: (userId: string, targetId: string, verdict: Verdict | 'undo', lang: Lang) =>
    req<RecResponse>('/api/feedback', { method: 'POST', body: json({ userId, targetId, verdict, lang }) }),
  contacts: (id: string) => req<Profile[]>(`/api/contacts/${id}`),
  meetings: (id: string) => req<MeetingView[]>(`/api/meetings/${id}`),
  freeSlots: (userId: string, targetId: string) => req<string[]>(`/api/meetings-slots?userId=${userId}&targetId=${targetId}`),
  book: (userId: string, targetId: string, slot?: string) => req<MeetingView>('/api/meetings', { method: 'POST', body: json({ userId, targetId, slot }) }),
  cancelMeeting: (id: string, userId: string) => req<{ ok: true }>(`/api/meetings/${id}?userId=${userId}`, { method: 'DELETE' }),
  dashboard: () => req<Dashboard>('/api/dashboard'),
};

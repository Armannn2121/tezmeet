import type { EVENT, GOALS, INTERESTS, ROLES } from '../../shared/catalog.ts';
import type { ChatSummary, ChatThread, MeetingView, Message, Profile, ProfileInput, RecResponse, Verdict } from '../../shared/types.ts';
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
  messages: number;
  slotLoad: { slot: string; n: number }[];
};

const json = (b: unknown) => JSON.stringify(b);

export const api = {
  meta: () => req<Meta>('/api/meta'),
  createProfile: (p: ProfileInput) => req<{ profile: Profile; token: string }>('/api/profiles', { method: 'POST', body: json(p) }),
  me: () => req<Profile>('/api/me'),
  deleteMe: () => req<{ ok: true }>('/api/me', { method: 'DELETE' }),
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
  chats: () => req<{ chats: ChatSummary[]; unread: number }>('/api/me/chats'),
  thread: (otherId: string) => req<ChatThread>(`/api/me/chats/${otherId}`),
  send: (otherId: string, text: string) => req<Message>(`/api/me/chats/${otherId}`, { method: 'POST', body: json({ text }) }),
  markRead: (otherId: string) => req<{ ok: true }>(`/api/me/chats/${otherId}/read`, { method: 'POST' }),
};

// Нақты уақыттағы оқиғалар (SSE) — fetch арқылы, токен URL-де емес, тақырыпта.
// Байланыс үзілсе, 1→2→4…→15 секундтан соң қайта қосылады.
export type LiveEvent =
  | { type: 'message'; message: Message; from?: Profile }
  | { type: 'read'; by: string; at: string }
  | { type: 'typing'; from: string };

export function connectEvents(onEvent: (e: LiveEvent) => void, onStatus?: (online: boolean) => void): () => void {
  let stopped = false;
  let ctrl: AbortController | null = null;
  let delay = 1000;
  const run = async () => {
    while (!stopped) {
      try {
        ctrl = new AbortController();
        const res = await fetch('/api/me/events', { headers: token ? { authorization: `Bearer ${token}` } : {}, signal: ctrl.signal });
        if (!res.ok || !res.body) throw new Error(`events ${res.status}`);
        onStatus?.(true);
        delay = 1000;
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i: number;
          while ((i = buf.indexOf('\n\n')) >= 0) {
            const block = buf.slice(0, i);
            buf = buf.slice(i + 2);
            const ev = block.match(/^event: (.+)$/m)?.[1];
            const data = block.match(/^data: (.+)$/m)?.[1];
            if (ev && data) {
              try { onEvent({ type: ev, ...JSON.parse(data) } as LiveEvent); } catch { /* бүлінген оқиға */ }
            }
          }
        }
      } catch {
        if (stopped) return;
      }
      onStatus?.(false);
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay * 2, 15000);
    }
  };
  run();
  return () => { stopped = true; ctrl?.abort(); };
}

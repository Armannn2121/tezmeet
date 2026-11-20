import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Lang } from '../../shared/catalog.ts';
import type { ChatSummary, Profile, ProfileInput } from '../../shared/types.ts';
import { api, ApiError, connectEvents, setApiToken, type LiveEvent, type Meta } from './api.ts';
import { IconChart, IconChats, IconHouse, IconPeople, IconPerson, Spinner } from './components/icons.tsx';
import { Avatar, ToastHost, haptic, toast } from './components/ui.tsx';
import { ERRORS, makeT, type T } from './i18n.ts';
import { Chat } from './screens/Chat.tsx';
import { Chats } from './screens/Chats.tsx';
import { ForYou } from './screens/ForYou.tsx';
import { Hall } from './screens/Hall.tsx';
import { Home } from './screens/Home.tsx';
import { Me } from './screens/Me.tsx';
import { ProfileForm } from './screens/ProfileForm.tsx';
import { Welcome } from './screens/Welcome.tsx';

export type Tab = 'home' | 'for-you' | 'chats' | 'hall' | 'me';
const TABS: Tab[] = ['home', 'for-you', 'chats', 'hall', 'me'];

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
  meta: Meta;
  user: Profile;
  setUser: (p: Profile | null, token?: string) => void;
  errorText: (e: unknown) => string;
  editProfile: () => void;
  go: (tab: Tab) => void;
  // Чаттар
  chats: ChatSummary[] | null;
  unread: number;
  online: boolean;
  refreshChats: () => void;
  openChat: (p: Profile, draft?: string) => void;
  takeDraft: (otherId: string) => string;
  onLive: (fn: (e: LiveEvent) => void) => () => void;
};
const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => useContext(AppCtx)!;

// localStorage жеке браузерде жоқ болуы мүмкін — әрқашан try/catch
const ls = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* ignore */ } },
};

function detectLang(): Lang {
  const saved = ls.get('tm.lang');
  if (saved === 'kk' || saved === 'ru' || saved === 'en') return saved;
  const nav = navigator.language.toLowerCase();
  return nav.startsWith('kk') ? 'kk' : nav.startsWith('en') ? 'en' : 'ru';
}

// #/home, #/for-you, #/chats, #/chats/<id>, #/hall, #/me — ашқанда әдепкі «Басты»
type Route = { tab: Tab; chatId: string | null };
function parseHash(): Route {
  const [first, second] = location.hash.replace(/^#\/?/, '').split('/');
  const tab = TABS.includes(first as Tab) ? (first as Tab) : 'home';
  return { tab, chatId: tab === 'chats' && second ? decodeURIComponent(second) : null };
}

export default function App() {
  const [lang, setLangState] = useState<Lang>(detectLang);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [user, setUserState] = useState<Profile | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState(false);
  const [form, setForm] = useState<null | { mode: 'create' | 'edit'; initial?: Partial<ProfileInput> }>(null);
  const t = useMemo(() => makeT(lang), [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    ls.set('tm.lang', l);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const boot = useCallback(async () => {
    setBooting(true);
    setBootError(false);
    try {
      const m = await api.meta();
      setMeta(m);
      const token = ls.get('tm.token');
      ls.set('tm.user', null); // ескі нұсқаның кілті
      if (token) {
        setApiToken(token);
        try {
          setUserState(await api.me());
        } catch (e) {
          if (e instanceof ApiError && e.code === 'unauthorized') { ls.set('tm.token', null); setApiToken(null); }
          else throw e;
        }
      }
    } catch {
      setBootError(true);
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => { boot(); }, [boot]);

  const setUser = useCallback((p: Profile | null, token?: string) => {
    setUserState(p);
    if (token) { ls.set('tm.token', token); setApiToken(token); }
    if (!p) { ls.set('tm.token', null); setApiToken(null); }
  }, []);

  const errorText = useCallback((e: unknown) => {
    const code = e instanceof ApiError ? e.code : 'network';
    if (code === 'network') return t('networkError');
    return ERRORS[code]?.[lang] ?? `${t('error')}: ${code}`;
  }, [lang, t]);

  if (booting) {
    return <div className="center" style={{ minHeight: '100dvh' }}><Spinner lg /></div>;
  }
  if (bootError || !meta) {
    return (
      <div className="center" style={{ minHeight: '100dvh', padding: 32, textAlign: 'center' }}>
        <p>{t('networkError')}</p>
        <button className="btn tinted" style={{ width: 200 }} onClick={boot}>{t('retry')}</button>
      </div>
    );
  }

  if (form || !user) {
    if (!form) {
      return (
        <>
          <Welcome lang={lang} setLang={setLang} t={t} meta={meta}
            onStart={() => setForm({ mode: 'create' })}
            onSample={(initial) => setForm({ mode: 'create', initial })} />
          <ToastHost />
        </>
      );
    }
    return (
      <div className="app">
        <ProfileForm
          lang={lang} t={t} meta={meta}
          mode={form.mode}
          initial={form.mode === 'edit' ? user ?? undefined : form.initial}
          onCancel={() => setForm(null)}
          // Жаңа анкетадан кейін — бірден топ-5 (жюри жолы «анкета → нәтиже»)
          onSaved={(p, token) => {
            const created = form.mode === 'create';
            setUser(p, token);
            setForm(null);
            if (created) location.hash = '/for-you';
          }}
          errorText={errorText}
        />
        <ToastHost />
      </div>
    );
  }

  return (
    <Shell key={user.id} lang={lang} setLang={setLang} t={t} meta={meta} user={user} setUser={setUser}
      errorText={errorText} editProfile={() => setForm({ mode: 'edit' })} />
  );
}

// Кірген қатысушының қабығы: вкладкалар, чаттар, нақты уақыттағы оқиғалар
function Shell(props: Pick<Ctx, 'lang' | 'setLang' | 't' | 'meta' | 'user' | 'setUser' | 'errorText' | 'editProfile'>) {
  const { t, user, lang } = props;
  const [route, setRoute] = useState<Route>(parseHash);
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [unread, setUnread] = useState(0);
  const [online, setOnline] = useState(true);
  const listeners = useRef(new Set<(e: LiveEvent) => void>());
  const drafts = useRef(new Map<string, string>());
  const routeRef = useRef(route);
  routeRef.current = route;

  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = useCallback((next: Tab) => {
    if (location.hash !== `#/${next}`) location.hash = `/${next}`;
    setRoute({ tab: next, chatId: null });
    window.scrollTo({ top: 0 });
  }, []);

  const refreshChats = useCallback(() => {
    api.chats().then((r) => { setChats(r.chats); setUnread(r.unread); }).catch(() => {});
  }, []);

  const openChat = useCallback((p: Profile, draft?: string) => {
    if (draft) drafts.current.set(p.id, draft);
    location.hash = `/chats/${encodeURIComponent(p.id)}`;
  }, []);

  const takeDraft = useCallback((otherId: string) => {
    const d = drafts.current.get(otherId) ?? '';
    drafts.current.delete(otherId);
    return d;
  }, []);

  const onLive = useCallback((fn: (e: LiveEvent) => void) => {
    listeners.current.add(fn);
    return () => { listeners.current.delete(fn); };
  }, []);

  // Бір ғана тұрақты байланыс: хабарлама келсе — тізім жаңарады, басқа беттеңіз болсаңыз — хабарландыру
  useEffect(() => {
    refreshChats();
    const stop = connectEvents((e) => {
      for (const fn of listeners.current) fn(e);
      if (e.type !== 'message') return;
      refreshChats();
      const incoming = e.message.to === user.id;
      const r = routeRef.current;
      if (incoming && e.from && r.chatId !== e.from.id) {
        haptic();
        const from = e.from;
        toast({
          text: `${from.name.split(' ')[0]}: ${e.message.text.slice(0, 60)}`,
          icon: <Avatar name={from.name} size="xs" />,
          action: { label: t('open'), run: () => { location.hash = `/chats/${encodeURIComponent(from.id)}`; } },
        });
      }
    }, (ok) => { setOnline(ok); if (ok) refreshChats(); });
    return stop;
  }, [refreshChats, user.id, t]);

  useEffect(() => {
    document.title = unread ? `(${unread}) TezMeet` : 'TezMeet';
  }, [unread]);

  const ctx: Ctx = { ...props, go, chats, unread, online, refreshChats, openChat, takeDraft, onLive };
  const inChat = route.tab === 'chats' && route.chatId;
  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">
        {route.tab === 'home' && <Home key={`${lang}-${user.updatedAt ?? ''}`} />}
        {route.tab === 'for-you' && <ForYou key={`${user.id}-${lang}-${user.updatedAt ?? ''}`} />}
        {route.tab === 'chats' && !route.chatId && <Chats />}
        {inChat && <Chat key={route.chatId} otherId={route.chatId!} />}
        {route.tab === 'hall' && <Hall />}
        {route.tab === 'me' && <Me />}
        {!inChat && (
          <nav className="tabbar" aria-label="tabs">
            <TabBtn active={route.tab === 'home'} onClick={() => go('home')} icon={<IconHouse />} label={t('home')} />
            <TabBtn active={route.tab === 'for-you'} onClick={() => go('for-you')} icon={<IconPeople />} label={t('forYou')} />
            <TabBtn active={route.tab === 'chats'} onClick={() => go('chats')} icon={<IconChats />} label={t('chats')} badge={unread} />
            <TabBtn active={route.tab === 'hall'} onClick={() => go('hall')} icon={<IconChart />} label={t('hall')} />
            <TabBtn active={route.tab === 'me'} onClick={() => go('me')} icon={<IconPerson />} label={t('me')} />
          </nav>
        )}
      </div>
      <ToastHost />
    </AppCtx.Provider>
  );
}

function TabBtn({ active, onClick, icon, label, badge }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <button type="button" className={`tab${active ? ' active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}
      aria-label={badge ? `${label}, ${badge}` : label}>
      {icon}
      <span>{label}</span>
      {!!badge && <span className="badge">{badge > 99 ? '99+' : badge}</span>}
    </button>
  );
}

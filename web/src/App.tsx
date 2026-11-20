import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Lang } from '../../shared/catalog.ts';
import type { Profile, ProfileInput } from '../../shared/types.ts';
import { api, ApiError, type Meta } from './api.ts';
import { IconCalendar, IconChart, IconPeople, IconPerson, Spinner } from './components/icons.tsx';
import { ToastHost } from './components/ui.tsx';
import { ERRORS, makeT, type T } from './i18n.ts';
import { ForYou } from './screens/ForYou.tsx';
import { Hall } from './screens/Hall.tsx';
import { Me } from './screens/Me.tsx';
import { Meetings } from './screens/Meetings.tsx';
import { ProfileForm } from './screens/ProfileForm.tsx';
import { Welcome } from './screens/Welcome.tsx';

type Tab = 'for-you' | 'meetings' | 'hall' | 'me';
const TABS: Tab[] = ['for-you', 'meetings', 'hall', 'me'];

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: T;
  meta: Meta;
  user: Profile;
  setUser: (p: Profile | null) => void;
  errorText: (e: unknown) => string;
  editProfile: () => void;
  go: (tab: Tab) => void;
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

const tabFromHash = (): Tab => {
  const h = location.hash.replace('#/', '') as Tab;
  return TABS.includes(h) ? h : 'for-you';
};

export default function App() {
  const [lang, setLangState] = useState<Lang>(detectLang);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [user, setUserState] = useState<Profile | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState(false);
  const [form, setForm] = useState<null | { mode: 'create' | 'edit'; initial?: Partial<ProfileInput> }>(null);
  const [tab, setTab] = useState<Tab>(tabFromHash);
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
      const id = ls.get('tm.user');
      if (id) {
        try {
          setUserState(await api.getProfile(id));
        } catch (e) {
          if (e instanceof ApiError && e.code === 'profile_not_found') ls.set('tm.user', null);
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

  useEffect(() => {
    const on = () => setTab(tabFromHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  const go = useCallback((next: Tab) => {
    if (location.hash !== `#/${next}`) location.hash = `/${next}`;
    setTab(next);
    window.scrollTo({ top: 0 });
  }, []);

  const setUser = useCallback((p: Profile | null) => {
    setUserState(p);
    ls.set('tm.user', p ? p.id : null);
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
          onSaved={(p) => { setUser(p); setForm(null); go('for-you'); }}
          errorText={errorText}
        />
        <ToastHost />
      </div>
    );
  }

  const ctx: Ctx = { lang, setLang, t, meta, user, setUser, errorText, editProfile: () => setForm({ mode: 'edit' }), go };
  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">
        {tab === 'for-you' && <ForYou key={`${user.id}-${lang}`} />}
        {tab === 'meetings' && <Meetings />}
        {tab === 'hall' && <Hall />}
        {tab === 'me' && <Me />}
        <nav className="tabbar" aria-label="tabs">
          <TabBtn active={tab === 'for-you'} onClick={() => go('for-you')} icon={<IconPeople />} label={t('forYou')} />
          <TabBtn active={tab === 'meetings'} onClick={() => go('meetings')} icon={<IconCalendar />} label={t('meetings')} />
          <TabBtn active={tab === 'hall'} onClick={() => go('hall')} icon={<IconChart />} label={t('hall')} />
          <TabBtn active={tab === 'me'} onClick={() => go('me')} icon={<IconPerson />} label={t('me')} />
        </nav>
      </div>
      <ToastHost />
    </AppCtx.Provider>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" className={`tab${active ? ' active' : ''}`} onClick={onClick} aria-current={active ? 'page' : undefined}>
      {icon}
      <span>{label}</span>
    </button>
  );
}

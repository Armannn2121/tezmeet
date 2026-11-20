import { useCallback, useEffect, useRef, useState } from 'react';
import { goalShort } from '../../../shared/catalog.ts';
import type { Profile, RecResponse, Recommendation, Verdict } from '../../../shared/types.ts';
import { useApp } from '../App.tsx';
import { api } from '../api.ts';
import { IconCalendar, IconChats, IconCheck, IconCopy, IconPeople, IconRefresh, IconSparkles, IconStore, IconX, Spinner } from '../components/icons.tsx';
import { MeetSheet, PersonSheet, metaLine } from '../components/people.tsx';
import { Avatar, GoalTag, NavBar, Ring, Section, copyText, haptic, toast } from '../components/ui.tsx';

export function ForYou() {
  const { t, lang, user, meta, errorText, openChat } = useApp();
  const [data, setData] = useState<RecResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ai, setAi] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [leaving, setLeaving] = useState<Record<string, 'left' | 'right'>>({});
  const [person, setPerson] = useState<Recommendation | null>(null);
  const [meetWith, setMeetWith] = useState<Profile | null>(null);
  const [booked, setBooked] = useState<Record<string, { slot: string; table: number }>>({}); // адам id → кездесу
  const aiAsked = useRef(new Set<string>());

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.recommendations(lang));
    } catch (e) {
      setError(errorText(e));
    }
  }, [lang, errorText]);

  useEffect(() => { load(); }, [load]);

  const loadMeetings = useCallback(() => {
    api.meetings().then((ms) => setBooked(Object.fromEntries(ms.map((m) => [m.other.id, { slot: m.slot, table: m.table }])))).catch(() => {});
  }, []);
  useEffect(() => { loadMeetings(); }, [loadMeetings]);

  // LLM алғашқы фразасы — фондық түрде, ұсыныстар бұрыннан экранда
  useEffect(() => {
    if (!data || !meta.ai.llm) return;
    const ids = data.items.map((i) => i.profile.id).filter((id) => !aiAsked.current.has(id));
    if (!ids.length) return;
    ids.forEach((id) => aiAsked.current.add(id));
    setAiLoading(true);
    api.icebreakers(ids, lang)
      .then((r) => setAi((prev) => ({ ...prev, ...r.lines })))
      .catch(() => {})
      .finally(() => setAiLoading(false));
  }, [data, meta.ai.llm, lang]);

  // Буфер жабық болса (кейбір браузерлер мен webview), мәтінді белгілеп, қолмен көшіруді ұсынамыз
  const copyLine = async (line: string, el: HTMLElement) => {
    haptic();
    if (await copyText(line)) {
      toast({ text: t('copied'), icon: <IconCopy style={{ color: 'var(--blue)' }} /> });
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    toast({ text: t('copyManual'), icon: <IconCopy style={{ color: 'var(--orange)' }} /> });
  };

  const feedback = async (rec: Recommendation, verdict: Verdict) => {
    haptic();
    const id = rec.profile.id;
    setLeaving((l) => ({ ...l, [id]: verdict === 'met' ? 'right' : 'left' }));
    try {
      const [next] = await Promise.all([api.feedback(id, verdict, lang), new Promise((r) => setTimeout(r, 320))]);
      setData(next);
      setLeaving({});
      toast({
        text: verdict === 'met' ? `${rec.profile.name.split(' ')[0]} → ${t('myContacts')}` : t('recalculated'),
        icon: verdict === 'met' ? <IconCheck style={{ color: 'var(--green)' }} /> : <IconRefresh style={{ color: 'var(--blue)' }} />,
        action: { label: t('undo'), run: async () => setData(await api.feedback(id, 'undo', lang)) },
      });
    } catch (e) {
      setLeaving({});
      toast({ text: errorText(e) });
    }
  };

  const sub = data ? (
    <>
      <span>{t('pickedIn', { n: data.items.length, ms: data.tookMs })}</span>
      <span className="sem-badge"><IconSparkles /> {data.semantic === 'gemini' ? t('semGemini') : t('semTfidf')}</span>
    </>
  ) : null;

  return (
    <div className="screen">
      <NavBar title={t('forYou')} sub={sub}
        right={<button className="nav-btn" onClick={() => { haptic(); setData(null); load(); }} aria-label={t('refresh')}><IconRefresh width={22} height={22} /></button>} />

      {error && (
        <div className="empty">
          <p>{error}</p>
          <button className="btn tinted small" style={{ marginTop: 12 }} onClick={load}>{t('retry')}</button>
        </div>
      )}

      {!data && !error && <SkeletonCards />}

      {data && data.items.length === 0 && (
        <div className="empty">
          <IconPeople className="glyph" />
          <h3>{t('noMore')}</h3>
          <p>{t('noMoreD')}</p>
        </div>
      )}

      {data?.items.map((rec) => {
        const p = rec.profile;
        const line = ai[p.id] ?? rec.icebreaker;
        const isAi = !!ai[p.id];
        const quality = rec.score >= 70 ? t('matchGreat') : rec.score >= 50 ? t('matchGood') : t('matchOk');
        return (
          <article key={p.id} className={`card${leaving[p.id] ? ` leaving-${leaving[p.id]}` : ''}`}>
            <button type="button" className="head" onClick={() => setPerson(rec)} aria-label={`${p.name}, ${t('details')}`}>
              <Avatar name={p.name} />
              <div className="who">
                <div className="name">{p.name}</div>
                <div className="meta">{metaLine(p, lang, t)}</div>
                <GoalTag goal={p.goal} label={goalShort(p.goal, lang)} />
                {booked[p.id] && <span className="meet-tag"><IconCalendar width={12} height={12} /> {booked[p.id].slot} · {t('table', { n: booked[p.id].table })}</span>}
              </div>
              <div title={quality}><Ring value={rec.score} /></div>
            </button>
            <p className="why">{rec.explanation}</p>
            <div className="bubble-wrap">
              <div className="bubble-label">
                {t('opener')}
                {isAi ? <span className="ai"><IconSparkles width={12} height={12} /> {t('aiOpener')}</span> : aiLoading && meta.ai.llm ? <Spinner /> : null}
              </div>
              <div style={{ position: 'relative' }}>
                <div className="bubble" role="button" tabIndex={0} title={t('copy')}
                  onClick={(e) => copyLine(line, e.currentTarget)}>
                  {line}
                </div>
                <button type="button" className="copy-btn" style={{ top: 'calc(50% - 14px)' }} aria-label={t('copy')}
                  onClick={(e) => copyLine(line, e.currentTarget.parentElement!.querySelector('.bubble') as HTMLElement)}>
                  <IconCopy />
                </button>
              </div>
            </div>
            {/* Негізгі әрекет — жазу: чат ашылады, ішінде алғашқы фраза дайын тұрады */}
            <div className="actions">
              <button type="button" className="pill-btn primary" onClick={() => openChat(p, line)}><IconChats /><span className="lbl">{t('write')}</span></button>
              <button type="button" className={`pill-btn${booked[p.id] ? ' blue' : ''}`} onClick={() => setMeetWith(p)}><IconCalendar /><span className="lbl">{booked[p.id]?.slot ?? t('meet')}</span></button>
            </div>
            {/* Кері байланыс — ТЗ бойынша «познакомились / не подошло», толық жазуымен */}
            <div className="actions">
              <button type="button" className="pill-btn green" onClick={() => feedback(rec, 'met')}><IconCheck /><span className="lbl">{t('met')}</span></button>
              <button type="button" className="pill-btn gray" onClick={() => feedback(rec, 'skip')}><IconX /><span className="lbl">{t('skip')}</span></button>
            </div>
          </article>
        );
      })}

      {data && data.booths.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <Section header={t('booths')} footer={t('boothsFooter')}>
            {data.booths.map(({ booth, why }) => (
              <div key={booth.id} className="row tall icon-row" style={{ alignItems: 'flex-start' }}>
                <div className="sq-icon" style={{ background: 'var(--orange)', marginTop: 2 }}><IconStore /></div>
                <div className="title">
                  <div style={{ fontWeight: 600 }}>{booth.name} <span style={{ color: 'var(--label-2)', fontWeight: 400 }}>· {booth.location}</span></div>
                  <div className="sub">{why}</div>
                </div>
              </div>
            ))}
          </Section>
        </div>
      )}

      <PersonSheet person={person?.profile ?? null} rec={person ?? undefined} me={user} onClose={() => setPerson(null)} onMeet={(p) => { setPerson(null); setMeetWith(p); }} />
      <MeetSheet person={meetWith} onClose={() => setMeetWith(null)} onChanged={loadMeetings} />
    </div>
  );
}

function SkeletonCards() {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <div key={i} className="card" aria-hidden>
          <div className="head">
            <div className="avatar skel" />
            <div className="who">
              <div className="skel" style={{ height: 16, width: '55%' }} />
              <div className="skel" style={{ height: 13, width: '75%', marginTop: 8 }} />
            </div>
          </div>
          <div className="skel" style={{ height: 13, marginTop: 16 }} />
          <div className="skel" style={{ height: 13, marginTop: 8, width: '80%' }} />
          <div className="skel" style={{ height: 52, marginTop: 14, borderRadius: 18, width: '85%' }} />
        </div>
      ))}
    </>
  );
}

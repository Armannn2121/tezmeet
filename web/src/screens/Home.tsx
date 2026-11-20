import { useCallback, useEffect, useState } from 'react';
import { roleLabel } from '../../../shared/catalog.ts';
import type { MeetingView, Profile, Recommendation } from '../../../shared/types.ts';
import { useApp } from '../App.tsx';
import { api } from '../api.ts';
import { IconCalendar, IconChevron, IconPeople, IconPin } from '../components/icons.tsx';
import { MeetSheet, PersonSheet, metaLine } from '../components/people.tsx';
import { Avatar, NavBar, Ring, Section } from '../components/ui.tsx';
import { fmtChatTime, fmtDate } from '../i18n.ts';

// Басты бет: іс-шара, топ-5 қысқаша, кездесулер, соңғы хабарламалар, таныстар
export function Home() {
  const { t, lang, user, meta, chats, go, refreshChats } = useApp();
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [meetings, setMeetings] = useState<MeetingView[] | null>(null);
  const [contacts, setContacts] = useState<Profile[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [contact, setContact] = useState<Profile | null>(null);
  const [meet, setMeet] = useState<Profile | null>(null);

  const load = useCallback(() => {
    api.recommendations(lang).then((r) => setRecs(r.items)).catch(() => setRecs([]));
    api.meetings().then(setMeetings).catch(() => setMeetings([]));
    api.contacts().then(setContacts).catch(() => {});
    api.dashboard().then((d) => setTotal(d.total)).catch(() => {});
    refreshChats();
  }, [lang, refreshChats]);
  useEffect(() => { load(); }, [load]);

  const recent = (chats ?? []).slice(0, 3);

  return (
    <div className="screen">
      {/* Аты-жөні ретін болжамаймыз («Куанишов Шингиз» не «Шингиз Куанишов») — толық атын жазамыз */}
      <NavBar title={t('home')} sub={<span>{t('hello', { name: user.name })}</span>} />

      <div className="event-card">
        <div className="event-name">{meta.event.name}</div>
        <div className="event-place"><IconPin width={14} height={14} /> {meta.event.venue[lang]} · {fmtDate(meta.event.date, lang)}</div>
        <div className="event-stats">
          <span><IconPeople width={18} height={18} /> {t('attendeesN', { n: total ?? '…' })}</span>
          <span><IconCalendar width={16} height={16} /> {t('meetingsN', { n: meetings?.length ?? 0 })}</span>
        </div>
      </div>

      <section className="section">
        <div className="section-header plain">
          <span>{t('topForYou')}</span>
          <button className="see-all" onClick={() => go('for-you')}>{t('seeAll')}</button>
        </div>
        <div className="hscroll">
          {recs === null && [0, 1, 2].map((i) => <div key={i} className="mini-card skel" style={{ height: 150 }} />)}
          {recs?.map((r) => (
            <button key={r.profile.id} type="button" className="mini-card" onClick={() => setRec(r)}>
              <div className="mini-top"><Avatar name={r.profile.name} size="sm" /><Ring value={r.score} /></div>
              <div className="mini-name">{r.profile.name}</div>
              <div className="mini-role">{roleLabel(r.profile.role, lang)}</div>
              <div className="mini-why">{r.explanation}</div>
            </button>
          ))}
        </div>
      </section>

      <Section header={t('upcoming')} footer={meetings?.length === 0 ? t('noMeetingsD') : undefined}>
        {meetings === null ? <div className="row"><span className="title" style={{ color: 'var(--label-2)' }}>{t('loading')}</span></div>
          : meetings.length === 0 ? <div className="row"><span className="title" style={{ color: 'var(--label-2)' }}>{t('noMeetings')}</span></div>
          : meetings.map((m) => (
            <div key={m.id} className="row-wrap" style={{ ['--inset' as string]: '92px' }}>
              <button type="button" className="row tall" onClick={() => setMeet(m.other)}>
                <div className="meeting-time">{m.slot}</div>
                <span className="title">
                  <div style={{ fontWeight: 600 }}>{m.other.name}</div>
                  <div className="sub">{t('table', { n: m.table })} · {metaLine(m.other, lang, t)}</div>
                </span>
                <IconChevron className="chev" />
              </button>
            </div>
          ))}
      </Section>

      <section className="section">
        <div className="section-header plain">
          <span>{t('recentChats')}</span>
          {recent.length > 0 && <button className="see-all" onClick={() => go('chats')}>{t('seeAll')}</button>}
        </div>
        {recent.length === 0 ? (
          <div className="list"><div className="row tall"><span className="title" style={{ color: 'var(--label-2)', fontSize: 15 }}>{t('noChatsShort')}</span></div></div>
        ) : (
          <div className="chat-list inset">
            {recent.map((c) => (
              <a key={c.other.id} className={`chat-row${c.unread ? ' unread' : ''}`} href={`#/chats/${encodeURIComponent(c.other.id)}`}>
                <Avatar name={c.other.name} size="sm" />
                <div className="chat-main">
                  <div className="chat-top">
                    <span className="chat-name">{c.other.name}</span>
                    <span className="chat-time">{fmtChatTime(c.last.at, lang, t)}</span>
                  </div>
                  <div className="chat-bottom">
                    <span className="chat-preview one">{c.last.from === user.id ? `${t('you')}: ` : ''}{c.last.text}</span>
                    {c.unread > 0 && <span className="unread-badge">{c.unread}</span>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {contacts.length > 0 && (
        <section className="section">
          <div className="section-header plain"><span>{t('myContacts')}</span></div>
          <div className="hscroll people">
            {contacts.map((p) => (
              <button key={p.id} type="button" className="person-chip" onClick={() => setContact(p)}>
                <Avatar name={p.name} />
                <span>{p.name.split(' ')[0]}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <PersonSheet person={rec?.profile ?? null} rec={rec ?? undefined} me={user} onClose={() => setRec(null)} onMeet={(p) => { setRec(null); setMeet(p); }} />
      <PersonSheet person={contact} me={user} onClose={() => setContact(null)} showContact onMeet={(p) => { setContact(null); setMeet(p); }} />
      <MeetSheet person={meet} onClose={() => setMeet(null)} onChanged={load} />
    </div>
  );
}

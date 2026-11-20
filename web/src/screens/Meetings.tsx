import { useCallback, useEffect, useState } from 'react';
import type { MeetingView, Profile } from '../../../shared/types.ts';
import { useApp } from '../App.tsx';
import { api } from '../api.ts';
import { IconCalendar, IconPeople, IconTelegram, Spinner } from '../components/icons.tsx';
import { PersonSheet, metaLine } from '../components/people.tsx';
import { Avatar, NavBar, Section, Segmented, haptic, toast } from '../components/ui.tsx';

export function Meetings() {
  const { t, lang, user, errorText, go } = useApp();
  const [view, setView] = useState<'schedule' | 'contacts'>('schedule');
  const [meetings, setMeetings] = useState<MeetingView[] | null>(null);
  const [contacts, setContacts] = useState<Profile[] | null>(null);
  const [person, setPerson] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    try {
      const [m, c] = await Promise.all([api.meetings(user.id), api.contacts(user.id)]);
      setMeetings(m);
      setContacts(c);
    } catch (e) {
      toast({ text: errorText(e) });
      setMeetings([]);
      setContacts([]);
    }
  }, [user.id, errorText]);

  useEffect(() => { load(); }, [load]);

  const cancel = async (m: MeetingView) => {
    haptic();
    try {
      await api.cancelMeeting(m.id, user.id);
      setMeetings((xs) => xs?.filter((x) => x.id !== m.id) ?? null);
    } catch (e) {
      toast({ text: errorText(e) });
    }
  };

  return (
    <div className="screen">
      <NavBar title={t('meetings')} />
      <div style={{ padding: '6px 16px 20px' }}>
        <Segmented value={view} onChange={setView} options={[{ value: 'schedule', label: t('myMeetings') }, { value: 'contacts', label: t('myContacts') }]} />
      </div>

      {view === 'schedule' && (
        meetings === null ? <div className="center"><Spinner lg /></div>
          : meetings.length === 0 ? (
            <div className="empty">
              <IconCalendar className="glyph" />
              <h3>{t('noMeetings')}</h3>
              <p>{t('noMeetingsD')}</p>
              <button className="btn tinted small" style={{ marginTop: 16 }} onClick={() => go('for-you')}>{t('forYou')}</button>
            </div>
          ) : (
            <Section>
              {meetings.map((m) => (
                <div key={m.id} className="row-wrap" style={{ ['--inset' as string]: '92px' }}>
                  <div className="row tall">
                    <div className="meeting-time">{m.slot}</div>
                    <button type="button" className="title" style={{ textAlign: 'left' }} onClick={() => setPerson(m.other)}>
                      <div style={{ fontWeight: 600 }}>{m.other.name}</div>
                      <div className="sub">{t('table', { n: m.table })} · {metaLine(m.other, lang, t)}</div>
                    </button>
                    <button type="button" className="nav-btn" style={{ color: 'var(--red)', fontSize: 15 }} onClick={() => cancel(m)} aria-label={t('cancelMeeting')}>
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              ))}
            </Section>
          )
      )}

      {view === 'contacts' && (
        contacts === null ? <div className="center"><Spinner lg /></div>
          : contacts.length === 0 ? (
            <div className="empty">
              <IconPeople className="glyph" />
              <h3>{t('noContacts')}</h3>
              <p>{t('noContactsD')}</p>
            </div>
          ) : (
            <Section>
              {contacts.map((p) => (
                <div key={p.id} className="row-wrap" style={{ ['--inset' as string]: '68px' }}>
                  <button type="button" className="row tall" onClick={() => setPerson(p)}>
                    <Avatar name={p.name} size="sm" />
                    <span className="title">
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      <div className="sub">{metaLine(p, lang, t)}</div>
                    </span>
                    {p.telegram && <IconTelegram width={22} height={22} style={{ color: 'var(--blue)' }} />}
                  </button>
                </div>
              ))}
            </Section>
          )
      )}

      <PersonSheet person={person} me={user} onClose={() => setPerson(null)} showContact />
    </div>
  );
}

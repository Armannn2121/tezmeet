import { useEffect, useState } from 'react';
import { goalShort, interestLabel, roleLabel } from '../../../shared/catalog.ts';
import type { MeetingView, Profile, Recommendation } from '../../../shared/types.ts';
import { useApp } from '../App.tsx';
import { api } from '../api.ts';
import { fmtYears, type Key } from '../i18n.ts';
import { IconCalendar, IconChats, IconCheck, IconClock, IconTelegram, Spinner } from './icons.tsx';
import { Avatar, GoalTag, Row, Section, Sheet, haptic, toast } from './ui.tsx';

export function metaLine(p: Profile, lang: 'kk' | 'ru' | 'en', t: (k: Key) => string) {
  const exp = fmtYears(p.experience, lang);
  return [roleLabel(p.role, lang), p.company, exp].filter(Boolean).join(' · ');
}

const PART_KEYS: Record<string, Key> = {
  goal: 'partGoal', role: 'partRole', stack: 'partStack', interests: 'partInterests', semantic: 'partSemantic', complement: 'partComplement', experience: 'partExperience',
};

// Адамның толық профилі + сәйкестік неден құралғаны
export function PersonSheet({ person, rec, me, onClose, showContact, onMeet }: {
  person: Profile | null; rec?: Recommendation; me: Profile; onClose: () => void; showContact?: boolean; onMeet?: (p: Profile) => void;
}) {
  const { t, lang, openChat } = useApp();
  const p = person;
  return (
    <Sheet open={!!p} onClose={onClose} right={<button className="nav-btn bold" onClick={onClose}>{t('done')}</button>}>
      {p && (
        <>
          <div className="person-hero">
            <Avatar name={p.name} size="lg" />
            <h2>{p.name}</h2>
            <p>{metaLine(p, lang, t)}</p>
            <GoalTag goal={p.goal} label={goalShort(p.goal, lang)} />
          </div>
          {p.id !== me.id && (
            <div className="contact-actions">
              {/* Жазу: чат ашылады, ұсыныстан келсе — алғашқы фраза дайын тұрады */}
              <button type="button" onClick={() => { onClose(); openChat(p, rec?.icebreaker); }}>
                <IconChats width={22} height={22} /><span>{t('write')}</span>
              </button>
              {onMeet && (
                <button type="button" onClick={() => onMeet(p)}>
                  <IconCalendar width={22} height={22} /><span>{t('meet')}</span>
                </button>
              )}
            </div>
          )}
          {rec && (
            <Section header={t('whyMatch')}>
              <div className="about-text">{rec.explanation}</div>
            </Section>
          )}
          <Section header={t('about')}>
            <div className="about-text">{p.about}</div>
          </Section>
          <Section header={t('stack')}>
            <div className="chips">
              {p.stack.map((s) => <span key={s} className={`chip static${me.stack.some((x) => x.toLowerCase() === s.toLowerCase()) ? ' shared' : ''}`}>{s}</span>)}
            </div>
          </Section>
          <Section header={t('interests')}>
            <div className="chips">
              {p.interests.map((i) => <span key={i} className={`chip static${me.interests.includes(i) ? ' shared' : ''}`}>{interestLabel(i, lang)}</span>)}
            </div>
          </Section>
          {rec && (
            <Section header={t('scoreParts')}>
              {rec.reasons.map((r) => (
                <Row key={r.kind}>
                  <span className="title">{t(PART_KEYS[r.kind])}{r.items?.length ? <div className="sub">{r.items.map((i) => (r.kind === 'interests' ? interestLabel(i, lang) : i)).join(', ')}</div> : null}</span>
                  {r.kind === 'goal' || r.kind === 'semantic' ? (
                    <div className="meter" style={{ maxWidth: 90 }}><div style={{ width: `${Math.round(Math.min(1, Math.abs(r.weight)) * 100)}%` }} /></div>
                  ) : r.kind === 'experience' ? (
                    <span className="value">{r.weight > 0 ? '+' : '−'}{fmtYears(Math.abs(r.weight), lang)}</span>
                  ) : (
                    <IconCheck className="check" style={{ color: 'var(--green)' }} />
                  )}
                </Row>
              ))}
            </Section>
          )}
          <Section header={t('freeAt')}>
            <div className="slot-grid">
              {p.slots.map((s) => <span key={s} className={`chip static${me.slots.includes(s) ? ' shared' : ''}`} style={{ justifyContent: 'center' }}>{s}</span>)}
            </div>
          </Section>
          {showContact && (
            <Section>
              {p.telegram ? (
                <a className="row link" href={`https://t.me/${p.telegram}`} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <IconTelegram width={20} height={20} /><span className="title">{t('writeTg')}</span><span className="value">@{p.telegram}</span>
                </a>
              ) : (
                <Row><span className="title" style={{ color: 'var(--label-2)' }}>{t('findAtTable')}</span></Row>
              )}
            </Section>
          )}
        </>
      )}
    </Sheet>
  );
}

// 1:1 кездесу белгілеу: ортақ бос слоттар
export function MeetSheet({ person, onClose, onChanged }: { person: Profile | null; onClose: () => void; onChanged?: () => void }) {
  const { t, errorText } = useApp();
  const [slots, setSlots] = useState<string[] | null>(null);
  const [existing, setExisting] = useState<MeetingView | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!person) return;
    setSlots(null);
    setExisting(null);
    setPick(null);
    api.freeSlots(person.id)
      .then((r) => { setSlots(r.slots); setExisting(r.existing); setPick(r.slots[0] ?? null); })
      .catch((e) => { setSlots([]); toast({ text: errorText(e) }); });
  }, [person, errorText]);
  const cancel = async () => {
    if (!existing) return;
    setBusy(true);
    try {
      await api.cancelMeeting(existing.id);
      haptic();
      onChanged?.();
      onClose();
    } catch (e) {
      toast({ text: errorText(e) });
    } finally {
      setBusy(false);
    }
  };
  const book = async () => {
    if (!person || !pick) return;
    setBusy(true);
    try {
      const m = await api.book(person.id, pick);
      haptic();
      toast({ text: `${t('scheduleTitle')}: ${m.slot}, ${t('table', { n: m.table })}`, icon: <IconCheck style={{ color: 'var(--green)' }} /> });
      onChanged?.();
      onClose();
    } catch (e) {
      toast({ text: errorText(e) });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={!!person} onClose={onClose} title={t('scheduleTitle')} left={<button className="nav-btn" onClick={onClose}>{t('cancel')}</button>}>
      {person && (
        <>
          <div className="person-hero" style={{ paddingBottom: 16 }}>
            <Avatar name={person.name} />
            <h2 style={{ fontSize: 20, marginTop: 8 }}>{person.name}</h2>
          </div>
          {existing ? (
            <>
              <Section header={t('scheduleTitle')}>
                <div className="row tall">
                  <div className="meeting-time">{existing.slot}</div>
                  <span className="title"><div style={{ fontWeight: 600 }}>{t('table', { n: existing.table })}</div><div className="sub">20 min</div></span>
                </div>
              </Section>
              <Section>
                <Row className="danger" onClick={cancel}>{busy ? <Spinner /> : t('cancelMeeting')}</Row>
              </Section>
            </>
          ) : (
          <>
          <Section header={t('pickSlot')} footer={slots?.length ? t('pickSlotFooter') : undefined}>
            {slots === null ? (
              <div className="center" style={{ minHeight: 80 }}><Spinner /></div>
            ) : slots.length === 0 ? (
              <div className="about-text" style={{ color: 'var(--label-2)' }}>{t('noSlots')}</div>
            ) : (
              <div className="slot-grid">
                {slots.map((s) => (
                  <button key={s} type="button" className={`chip${pick === s ? ' on' : ''}`} onClick={() => { haptic(); setPick(s); }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </Section>
          <div style={{ padding: '0 16px' }}>
            <button className="btn filled" disabled={!pick || busy} onClick={book}>
              {busy ? <Spinner /> : <><IconClock width={20} height={20} /> {t('book')}{pick ? ` · ${pick}` : ''}</>}
            </button>
          </div>
          </>
          )}
        </>
      )}
    </Sheet>
  );
}

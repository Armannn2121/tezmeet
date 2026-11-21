import { useState } from 'react';
import { goalLabel, interestLabel } from '../../../shared/catalog.ts';
import { api } from '../api.ts';
import { useApp } from '../App.tsx';
import { IconBolt, IconBubble, IconPin, IconRefresh, IconSparkles } from '../components/icons.tsx';
import { metaLine } from '../components/people.tsx';
import { fmtDate } from '../i18n.ts';
import { Alert, Avatar, NavBar, Row, Section, Segmented } from '../components/ui.tsx';

export function Me() {
  const { t, lang, setLang, user, meta, editProfile, setUser } = useApp();
  const embed = meta.ai.embeddings;
  const [confirmOut, setConfirmOut] = useState(false);
  return (
    <div className="screen">
      <NavBar title={t('me')} right={<button className="nav-btn" onClick={editProfile}>{t('edit')}</button>} />

      <Section>
        <button type="button" className="row tall" onClick={editProfile}>
          <Avatar name={user.name} />
          <span className="title">
            <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: 0.38 }}>{user.name}</div>
            <div className="sub" style={{ fontSize: 15 }}>{metaLine(user, lang, t)}</div>
          </span>
        </button>
        <Row value={goalLabel(user.goal, lang)}><span className="title">{t('goalSection')}</span></Row>
        <Row value={user.stack.join(', ')}><span className="title">{t('stack')}</span></Row>
        <Row value={user.interests.map((i) => interestLabel(i, lang)).join(', ')}><span className="title">{t('interests')}</span></Row>
      </Section>

      <Section header={t('language')}>
        <div style={{ padding: 12 }}>
          <Segmented value={lang} onChange={setLang} options={[{ value: 'kk', label: 'Қазақша' }, { value: 'ru', label: 'Русский' }, { value: 'en', label: 'English' }]} />
        </div>
      </Section>

      <Section header={t('event')}>
        <Row className="icon-row">
          <div className="sq-icon" style={{ background: 'var(--red)' }}><IconPin /></div>
          <span className="title">{meta.event.name}<div className="sub">{meta.event.venue[lang]} · {fmtDate(meta.event.date, lang)}</div></span>
        </Row>
      </Section>

      <Section header={t('aiStatus')}>
        <Row className="icon-row" value={embed === 'ready' ? t('on') : embed === 'warming' ? t('warming') : 'TF-IDF'}>
          <div className="sq-icon" style={{ background: 'var(--indigo)' }}><IconSparkles /></div>
          <span className="title">{t('embeddings')}</span>
        </Row>
        <Row className="icon-row" value={meta.ai.llm ? 'Gemini' : t('off')}>
          <div className="sq-icon" style={{ background: 'var(--purple)' }}><IconBubble /></div>
          <span className="title">{t('llm')}</span>
        </Row>
      </Section>

      <Section header={t('howItWorks')}>
        <Row className="icon-row tall"><div className="sq-icon" style={{ background: 'var(--green)' }}><IconBolt /></div><span className="title" style={{ fontSize: 15 }}>{t('how1')}</span></Row>
        <Row className="icon-row tall"><div className="sq-icon" style={{ background: 'var(--blue)' }}><IconSparkles /></div><span className="title" style={{ fontSize: 15 }}>{t('how2')}</span></Row>
        <Row className="icon-row tall"><div className="sq-icon" style={{ background: 'var(--orange)' }}><IconRefresh /></div><span className="title" style={{ fontSize: 15 }}>{t('how3')}</span></Row>
      </Section>

      <Section>
        <Row className="danger" onClick={() => setConfirmOut(true)}>{t('logout')}</Row>
      </Section>

      <Alert open={confirmOut} title={t('logoutTitle')} message={t('logoutConfirm')} onClose={() => setConfirmOut(false)}
        actions={[{ label: t('cancel'), style: 'cancel' }, { label: t('signOut'), style: 'destructive', run: () => api.deleteMe().catch(() => {}).finally(() => setUser(null)) }]} />
    </div>
  );
}

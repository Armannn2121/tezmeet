import type { Lang } from '../../../shared/catalog.ts';
import type { ProfileInput } from '../../../shared/types.ts';
import type { Meta } from '../api.ts';
import { IconBolt, IconBubble, IconCalendar, IconPin } from '../components/icons.tsx';
import { Segmented } from '../components/ui.tsx';
import type { T } from '../i18n.ts';

// Мысал анкета: жюри жолды 30 секундта көре алуы үшін (бәрін өзгертуге болады)
const SAMPLES: Record<Lang, Partial<ProfileInput>> = {
  ru: {
    name: 'Аружан Тестова', role: 'backend', experience: 2, stack: ['Go', 'PostgreSQL', 'Docker'], interests: ['fintech', 'cloud'],
    about: 'Бэкенд-разработчик на Go, 2 года в небольшом стартапе. Хочу перейти в финтех-команду с сильным код-ревью и высокими нагрузками.', goal: 'job_seek',
  },
  kk: {
    name: 'Аружан Тестова', role: 'backend', experience: 2, stack: ['Go', 'PostgreSQL', 'Docker'], interests: ['fintech', 'cloud'],
    about: 'Go тілінде бэкенд жазамын, шағын стартапта 2 жыл істедім. Код-ревьюі мықты, жүктемесі жоғары финтех командасына ауысқым келеді.', goal: 'job_seek',
  },
  en: {
    name: 'Aruzhan Testova', role: 'backend', experience: 2, stack: ['Go', 'PostgreSQL', 'Docker'], interests: ['fintech', 'cloud'],
    about: 'Go backend developer, 2 years at a small startup. Looking to join a fintech team with strong code review and high-load systems.', goal: 'job_seek',
  },
};

export function Welcome({ lang, setLang, t, meta, onStart, onSample }: {
  lang: Lang; setLang: (l: Lang) => void; t: T; meta: Meta; onStart: () => void; onSample: (p: Partial<ProfileInput>) => void;
}) {
  const date = new Date(meta.event.date + 'T00:00:00').toLocaleDateString(lang === 'kk' ? 'kk-KZ' : lang === 'en' ? 'en-GB' : 'ru-RU', { day: 'numeric', month: 'long' });
  return (
    <div className="app">
      <div className="welcome">
        <div className="top">
          <Segmented ariaLabel={t('language')} value={lang} onChange={setLang} options={[{ value: 'kk', label: 'ҚАЗ' }, { value: 'ru', label: 'РУС' }, { value: 'en', label: 'ENG' }]} />
        </div>
        <div className="hero">
          <img className="app-icon" src="/icon.svg" alt="" />
          <h1>TezMeet</h1>
          <p className="lead">{t('appTagline')}</p>
          <div className="event-pill"><IconPin width={13} height={13} /> {meta.event.name} · {date}</div>
        </div>
        <div className="features">
          <div className="feature">
            <div className="sq-icon" style={{ background: 'var(--blue)' }}><IconBolt /></div>
            <div><h4>{t('feat1')}</h4><p>{t('feat1d')}</p></div>
          </div>
          <div className="feature">
            <div className="sq-icon" style={{ background: 'var(--purple)' }}><IconBubble /></div>
            <div><h4>{t('feat2')}</h4><p>{t('feat2d')}</p></div>
          </div>
          <div className="feature">
            <div className="sq-icon" style={{ background: 'var(--green)' }}><IconCalendar /></div>
            <div><h4>{t('feat3')}</h4><p>{t('feat3d')}</p></div>
          </div>
        </div>
        <div className="bottom">
          <button className="btn filled" onClick={onStart}>{t('start')}</button>
          <button className="btn plain" onClick={() => onSample(SAMPLES[lang])}>{t('sample')}</button>
          <p className="fine">{t('privacy')}</p>
        </div>
      </div>
    </div>
  );
}

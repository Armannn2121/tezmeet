import { useMemo, useState } from 'react';
import { STACK_FAMILIES, roleLabel, type GoalId, type Lang, type RoleId } from '../../../shared/catalog.ts';
import type { Profile, ProfileInput } from '../../../shared/types.ts';
import { api, type Meta } from '../api.ts';
import { IconMinus, IconPlus, IconSearch, IconX, Spinner } from '../components/icons.tsx';
import { NavBar, Row, Section, Sheet, haptic, toast } from '../components/ui.tsx';
import { fmtYears, type T } from '../i18n.ts';

const ROLE_FAMILIES: Record<RoleId, string[]> = {
  frontend: ['frontend'], backend: ['backend_js', 'python', 'jvm', 'go', 'db'], fullstack: ['frontend', 'backend_js', 'db'],
  mobile: ['mobile'], data_scientist: ['ml', 'data'], ml_engineer: ['ml', 'infra'], data_analyst: ['data', 'product'],
  data_engineer: ['data', 'infra'], devops: ['infra'], qa: ['qa'], security: ['security'], gamedev: ['game'],
  designer: ['design'], product_manager: ['product'], project_manager: ['product'], cto: ['infra', 'go', 'python', 'db'],
  founder: ['product'], recruiter: ['people'], student: ['python', 'frontend', 'data'],
};

type Draft = {
  name: string; company: string; role: RoleId | ''; experience: number; stack: string[]; interests: string[];
  about: string; goal: GoalId | ''; lookingFor: RoleId[]; slots: string[]; telegram: string;
};

export function ProfileForm({ lang, t, meta, mode, initial, onCancel, onSaved, errorText }: {
  lang: Lang; t: T; meta: Meta; mode: 'create' | 'edit'; initial?: Partial<ProfileInput> | Profile;
  onCancel: () => void; onSaved: (p: Profile) => void; errorText: (e: unknown) => string;
}) {
  const [d, setD] = useState<Draft>(() => ({
    name: initial?.name ?? '', company: initial?.company ?? '', role: initial?.role ?? '', experience: initial?.experience ?? 1,
    stack: initial?.stack ?? [], interests: initial?.interests ?? [], about: initial?.about ?? '', goal: initial?.goal ?? '',
    lookingFor: initial?.lookingFor ?? [],
    slots: initial?.slots && initial.slots.length < meta.slots.length ? initial.slots : [],
    telegram: initial?.telegram ?? '',
  }));
  const [roleSheet, setRoleSheet] = useState(false);
  const [stackSheet, setStackSheet] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));
  const toggle = <K extends 'stack' | 'interests' | 'lookingFor' | 'slots'>(k: K, v: Draft[K][number]) => {
    haptic();
    setD((x) => {
      const arr = x[k] as string[];
      return { ...x, [k]: arr.includes(v) ? arr.filter((a) => a !== v) : [...arr, v] };
    });
  };

  const missing: string[] = [];
  if (!d.goal) missing.push(t('goalSection'));
  if (d.name.trim().length < 2) missing.push(t('name'));
  if (!d.role) missing.push(t('role'));
  if (!d.stack.length) missing.push(t('stack'));
  if (!d.interests.length) missing.push(t('interests'));
  if (d.about.trim().length < 10) missing.push(t('about'));

  const submit = async () => {
    if (missing.length || saving) return;
    setSaving(true);
    const body: ProfileInput = {
      name: d.name.trim(), company: d.company.trim() || undefined, role: d.role as RoleId, experience: d.experience,
      stack: d.stack, interests: d.interests, about: d.about.trim(), goal: d.goal as GoalId, lookingFor: d.lookingFor,
      slots: d.slots, telegram: d.telegram.trim() || undefined, lang,
    };
    try {
      const p = mode === 'edit' && initial && 'id' in initial ? await api.updateProfile(initial.id, body) : await api.createProfile(body);
      onSaved(p);
    } catch (e) {
      toast({ text: errorText(e) });
    } finally {
      setSaving(false);
    }
  };

  const expLabel = fmtYears(d.experience, lang) + (d.experience >= 15 ? '+' : '');

  return (
    <div className="screen" style={{ paddingBottom: 0 }}>
      <NavBar large={false} title={t('profile')}
        left={<button className="nav-btn" onClick={onCancel}>{t('cancel')}</button>}
        right={<button className="nav-btn bold" disabled={!!missing.length || saving} onClick={submit}>{mode === 'edit' ? t('save') : t('done')}</button>} />

      <div style={{ height: 8 }} />
      <Section header={t('goalSection')} footer={t('goalFooter')}>
        {meta.goals.map((g) => (
          <Row key={g.id} className="goal-row" onClick={() => { haptic(); set('goal', g.id); }} checked={d.goal === g.id}>
            <span className="emoji" aria-hidden>{g.icon}</span>
            <span className="title">{g.label[lang]}</span>
          </Row>
        ))}
      </Section>

      <Section header={t('aboutYou')}>
        <Row>
          <span className="label">{t('name')}</span>
          <input value={d.name} onChange={(e) => set('name', e.target.value)} placeholder={t('namePh')} maxLength={60} autoComplete="name" aria-label={t('name')} />
        </Row>
        <Row>
          <span className="label">{t('company')}</span>
          <input value={d.company} onChange={(e) => set('company', e.target.value)} placeholder={t('optional')} maxLength={60} aria-label={t('company')} />
        </Row>
        <Row onClick={() => setRoleSheet(true)} chevron value={d.role ? roleLabel(d.role, lang) : <span style={{ color: 'var(--label-3)' }}>{t('choose')}</span>}>
          <span className="title">{t('role')}</span>
        </Row>
        <Row>
          <span className="title">{t('experience')}</span>
          <span className="counter">{expLabel}</span>
          <span className="stepper">
            <button type="button" aria-label="−" disabled={d.experience <= 0} onClick={() => { haptic(); set('experience', Math.max(0, d.experience - 1)); }}><IconMinus /></button>
            <button type="button" aria-label="+" disabled={d.experience >= 15} onClick={() => { haptic(); set('experience', Math.min(15, d.experience + 1)); }}><IconPlus /></button>
          </span>
        </Row>
      </Section>

      <Section header={t('stack')} footer={t('stackFooter')}>
        {d.stack.length > 0 && (
          <div className="chips">
            {d.stack.map((s) => (
              <button key={s} type="button" className="chip on" onClick={() => toggle('stack', s)} aria-label={`${s} ×`}>
                {s} <span className="tag-x"><IconX /></span>
              </button>
            ))}
          </div>
        )}
        <Row onClick={() => setStackSheet(true)} className="link">
          <IconPlus width={18} height={18} /> <span className="title">{t('addStack')}</span>
        </Row>
      </Section>

      <Section header={t('interests')}>
        <div className="chips">
          {meta.interests.map((i) => (
            <button key={i.id} type="button" className={`chip${d.interests.includes(i.id) ? ' on' : ''}`} aria-pressed={d.interests.includes(i.id)} onClick={() => toggle('interests', i.id)}>
              {i.label[lang]}
            </button>
          ))}
        </div>
      </Section>

      <Section header={t('about')} footer={t('aboutFooter')}>
        <div className="row" style={{ alignItems: 'stretch' }}>
          <textarea value={d.about} onChange={(e) => set('about', e.target.value)} placeholder={t('aboutPh')} maxLength={600} aria-label={t('about')} />
          <span className="char-count">{d.about.length}/600</span>
        </div>
      </Section>

      <Section header={t('lookingFor')} footer={t('lookingForFooter')}>
        <div className="chips">
          {meta.roles.map((r) => (
            <button key={r.id} type="button" className={`chip${d.lookingFor.includes(r.id) ? ' on' : ''}`} aria-pressed={d.lookingFor.includes(r.id)} onClick={() => toggle('lookingFor', r.id)}>
              {r.label[lang]}
            </button>
          ))}
        </div>
      </Section>

      <Section header={t('slots')} footer={t('slotsFooter')}>
        <div className="slot-grid">
          <button type="button" className={`chip${d.slots.length === 0 ? ' on' : ''}`} onClick={() => set('slots', [])}>{t('allDay')}</button>
          {meta.slots.map((s) => (
            <button key={s} type="button" className={`chip${d.slots.includes(s) ? ' on' : ''}`} aria-pressed={d.slots.includes(s)} onClick={() => toggle('slots', s)}>{s}</button>
          ))}
        </div>
      </Section>

      <Section header={t('contacts')} footer={t('telegramFooter')}>
        <Row>
          <span className="label">{t('telegram')}</span>
          <input value={d.telegram} onChange={(e) => set('telegram', e.target.value.replace(/\s/g, ''))} placeholder={`@username · ${t('optional')}`} maxLength={33} aria-label={t('telegram')} />
        </Row>
      </Section>

      <div className="sticky-cta">
        <button className="btn filled" disabled={!!missing.length || saving} onClick={submit}>
          {saving ? <Spinner /> : mode === 'edit' ? t('save') : t('findPeople')}
        </button>
        {missing.length > 0 && <div className="missing">{t('missing')}: {missing.join(', ')}</div>}
      </div>

      <Sheet open={roleSheet} onClose={() => setRoleSheet(false)} title={t('role')} right={<button className="nav-btn bold" onClick={() => setRoleSheet(false)}>{t('done')}</button>}>
        <Section>
          {meta.roles.map((r) => (
            <Row key={r.id} checked={d.role === r.id} onClick={() => { haptic(); set('role', r.id); setTimeout(() => setRoleSheet(false), 180); }}>
              <span className="title">{r.label[lang]}</span>
            </Row>
          ))}
        </Section>
      </Sheet>

      <StackSheet open={stackSheet} onClose={() => setStackSheet(false)} t={t} all={meta.stack} role={d.role} selected={d.stack} toggle={(s) => toggle('stack', s)}
        add={(s) => setD((x) => (x.stack.some((y) => y.toLowerCase() === s.toLowerCase()) ? x : { ...x, stack: [...x.stack, s] }))} />
    </div>
  );
}

function StackSheet({ open, onClose, t, all, role, selected, toggle, add }: {
  open: boolean; onClose: () => void; t: T; all: string[]; role: RoleId | ''; selected: string[]; toggle: (s: string) => void; add: (s: string) => void;
}) {
  const [q, setQ] = useState('');
  const suggested = useMemo(() => (role ? [...new Set(ROLE_FAMILIES[role].flatMap((f) => STACK_FAMILIES[f] ?? []))].slice(0, 14) : []), [role]);
  const query = q.trim().toLowerCase();
  const list = query ? all.filter((s) => s.toLowerCase().includes(query)) : all;
  const exact = all.some((s) => s.toLowerCase() === query) || selected.some((s) => s.toLowerCase() === query);
  return (
    <Sheet open={open} onClose={onClose} title={t('stack')} right={<button className="nav-btn bold" onClick={onClose}>{t('done')}</button>}>
      <label className="search">
        <IconSearch />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchStack')} maxLength={30}
          onKeyDown={(e) => { if (e.key === 'Enter' && query && !exact) { add(q.trim()); setQ(''); } }} />
      </label>
      {query && !exact && (
        <Section>
          <Row className="link" onClick={() => { add(q.trim()); setQ(''); }}><IconPlus width={18} height={18} /><span className="title">{t('addCustom')} «{q.trim()}»</span></Row>
        </Section>
      )}
      {!query && suggested.length > 0 && (
        <Section header={t('suggested')}>
          <div className="chips">
            {suggested.map((s) => (
              <button key={s} type="button" className={`chip${selected.includes(s) ? ' on' : ''}`} onClick={() => toggle(s)}>{s}</button>
            ))}
          </div>
        </Section>
      )}
      <Section>
        {list.map((s) => (
          <Row key={s} checked={selected.includes(s)} onClick={() => toggle(s)}><span className="title">{s}</span></Row>
        ))}
      </Section>
    </Sheet>
  );
}

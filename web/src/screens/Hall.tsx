import { useEffect, useState } from 'react';
import { GOALS, goalLabel, interestLabel, type GoalId } from '../../../shared/catalog.ts';
import { useApp } from '../App.tsx';
import { api, type Dashboard } from '../api.ts';
import { IconRefresh, Spinner } from '../components/icons.tsx';
import { GOAL_COLORS, NavBar, Section, haptic } from '../components/ui.tsx';

export function Hall() {
  const { t, lang, errorText } = useApp();
  const [d, setD] = useState<Dashboard | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = () => api.dashboard().then((x) => { setD(x); setErr(null); }).catch((e) => setErr(errorText(e)));
  useEffect(() => {
    load();
    const id = setInterval(load, 15000); // зал тірі — 15 секунд сайын жаңарады
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fb = d ? d.feedback.met + d.feedback.skip : 0;
  const maxInterest = d ? Math.max(...d.interests.map((i) => i.total), 1) : 1;
  const maxSlot = d ? Math.max(...d.slotLoad.map((s) => s.n), 1) : 1;
  const maxStack = d ? Math.max(...d.stack.map((s) => s.n), 1) : 1;

  return (
    <div className="screen">
      <NavBar title={t('hall')} sub={<span>{t('hallSub')}</span>}
        right={<button className="nav-btn" aria-label={t('refresh')} onClick={() => { haptic(); load(); }}><IconRefresh width={22} height={22} /></button>} />
      {err && <div className="empty"><p>{err}</p></div>}
      {!d && !err && <div className="center"><Spinner lg /></div>}
      {d && (
        <>
          <div className="tiles">
            <div className="tile"><div className="k">{t('participants')}</div><div className="v">{d.total}</div><div className="f">{t('registered', { n: d.real })}</div></div>
            <div className="tile"><div className="k">{t('meetingsBooked')}</div><div className="v">{d.meetings}</div></div>
            <div className="tile"><div className="k">{t('metRate')}</div><div className="v">{fb ? Math.round((d.feedback.met / fb) * 100) : 0}<small>%</small></div></div>
            <div className="tile"><div className="k"><span className="dot" style={{ background: 'var(--green)' }} />{t('met')}</div><div className="v">{d.feedback.met}<small>/ {fb}</small></div></div>
          </div>

          <Section header={t('supplyDemand')} footer={t('supplyFooter')}>
            {d.balance.map((b) => {
              const total = b.na + b.nb || 1;
              return (
                <div key={b.a} className="balance">
                  <div className="lbls">
                    <span><b>{b.na}</b> {goalLabel(b.a as GoalId, lang)}</span>
                    <span>{goalLabel(b.b as GoalId, lang)} <b>{b.nb}</b></span>
                  </div>
                  <div className="bar2">
                    <div style={{ width: `${(b.na / total) * 100}%`, background: GOAL_COLORS[b.a as GoalId] }} />
                    <div style={{ width: `${(b.nb / total) * 100}%`, background: GOAL_COLORS[b.b as GoalId] }} />
                  </div>
                </div>
              );
            })}
          </Section>

          <Section header={t('interestMap')} footer={t('interestMapFooter')}>
            <div style={{ paddingTop: 6 }}>
              {d.interests.slice(0, 16).map((i) => (
                <div key={i.id} className="imap-row" title={`${interestLabel(i.id, lang)}: ${i.total}`}>
                  <span className="nm">{interestLabel(i.id, lang)}</span>
                  <div className="stack" style={{ width: `${(i.total / maxInterest) * 100}%` }}>
                    {GOALS.filter((g) => i.byGoal[g.id]).map((g) => (
                      <div key={g.id} style={{ flex: i.byGoal[g.id], background: GOAL_COLORS[g.id] }} title={`${g.label[lang]}: ${i.byGoal[g.id]}`} />
                    ))}
                  </div>
                  <span className="n">{i.total}</span>
                </div>
              ))}
            </div>
            <div className="legend">
              {GOALS.map((g) => <span key={g.id}><i style={{ background: GOAL_COLORS[g.id] }} />{g.label[lang]} · {d.goals[g.id] ?? 0}</span>)}
            </div>
          </Section>

          <Section header={t('topStack')}>
            <div style={{ padding: '6px 0' }}>
              {d.stack.slice(0, 10).map((s) => (
                <div key={s.name} className="imap-row">
                  <span className="nm">{s.name}</span>
                  <div className="stack" style={{ width: `${(s.n / maxStack) * 100}%` }}><div style={{ flex: 1, background: 'var(--indigo)' }} /></div>
                  <span className="n">{s.n}</span>
                </div>
              ))}
            </div>
          </Section>

          <Section header={t('slotLoad')}>
            <div className="cols" aria-label={t('slotLoad')}>
              {d.slotLoad.map((s) => <div key={s.slot} style={{ height: `${(s.n / maxSlot) * 100}%` }} title={`${s.slot}: ${s.n}`} />)}
            </div>
            <div className="cols-x">
              <span>{d.slotLoad[0]?.slot}</span><span>{d.slotLoad[Math.floor(d.slotLoad.length / 2)]?.slot}</span><span>{d.slotLoad[d.slotLoad.length - 1]?.slot}</span>
            </div>
          </Section>
        </>
      )}
    </div>
  );
}

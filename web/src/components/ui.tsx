import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { GOALS, type GoalId } from '../../../shared/catalog.ts';
import { IconCheck, IconChevron } from './icons.tsx';

// ── Үлкен тақырыпты навигация: айналдырғанда жинақы барға айналады ─────
export function NavBar({ title, left, right, large = true, sub }: { title: string; left?: ReactNode; right?: ReactNode; large?: boolean; sub?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > (large ? 38 : 2));
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [large]);
  return (
    <>
      <div className={`navbar${scrolled ? ' scrolled' : ''}${large ? '' : ' modal'}`}>
        <div>{left}</div>
        <div className="inline-title">{title}</div>
        <div>{right}</div>
      </div>
      {large && <h1 className="large-title">{title}</h1>}
      {large && sub && <div className="subtitle">{sub}</div>}
    </>
  );
}

export function Section({ header, footer, children, plain }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; plain?: boolean }) {
  return (
    <section className="section">
      {header && <div className={`section-header${plain ? ' plain' : ''}`}>{header}</div>}
      {plain ? children : <div className="list">{children}</div>}
      {footer && <div className="section-footer">{footer}</div>}
    </section>
  );
}

export function Row({ children, onClick, chevron, checked, className = '', value }: { children: ReactNode; onClick?: () => void; chevron?: boolean; checked?: boolean; className?: string; value?: ReactNode }) {
  const inner = (
    <>
      {children}
      {value !== undefined && <span className="value">{value}</span>}
      {checked && <IconCheck className="check" />}
      {chevron && <IconChevron className="chev" />}
    </>
  );
  return onClick ? (
    <button type="button" className={`row ${className}`} onClick={onClick}>{inner}</button>
  ) : (
    <div className={`row ${className}`}>{inner}</div>
  );
}

export function Segmented<T extends string>({ value, options, onChange, ariaLabel }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; ariaLabel?: string }) {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  return (
    <div className="segmented" role="tablist" aria-label={ariaLabel}>
      <div className="thumb" style={{ width: `calc((100% - 4px) / ${options.length})`, transform: `translateX(${idx * 100}%)`, left: 2 }} />
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => { haptic(); onChange(o.value); }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Төменнен шығатын парақ (UISheetPresentationController) ─────────
export function Sheet({ open, onClose, title, left, right, children }: { open: boolean; onClose: () => void; title?: string; left?: ReactNode; right?: ReactNode; children: ReactNode }) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useLayoutEffect(() => {
    if (open) { setMounted(true); setClosing(false); }
    else if (mounted) {
      setClosing(true);
      const t = setTimeout(() => { setMounted(false); setClosing(false); }, 320);
      return () => clearTimeout(t);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', esc); };
  }, [mounted, onClose]);
  if (!mounted) return null;
  return createPortal(
    <>
      <div className={`sheet-backdrop${closing ? ' closing' : ''}`} onClick={onClose} />
      <div className={`sheet${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="grabber" />
        {(title || left || right) && (
          <div className="navbar modal">
            <div>{left}</div>
            <div className="inline-title">{title}</div>
            <div>{right}</div>
          </div>
        )}
        <div className="sheet-body">{children}</div>
      </div>
    </>,
    document.body,
  );
}

// ── UIAlertController стиліндегі ескерту ─────────────────────────
type AlertAction = { label: string; style?: 'default' | 'cancel' | 'destructive'; run?: () => void };
export function Alert({ open, title, message, actions, onClose }: { open: boolean; title: string; message?: string; actions: AlertAction[]; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <>
      <div className="sheet-backdrop" style={{ zIndex: 70 }} onClick={onClose} />
      <div className="alert" role="alertdialog" aria-modal="true" aria-label={title}>
        <div className="alert-text">
          <div className="alert-title">{title}</div>
          {message && <div className="alert-msg">{message}</div>}
        </div>
        <div className={`alert-actions${actions.length > 2 ? ' stacked' : ''}`}>
          {actions.map((a) => (
            <button key={a.label} type="button" className={a.style ?? 'default'} onClick={() => { haptic(); onClose(); a.run?.(); }}>{a.label}</button>
          ))}
        </div>
      </div>
    </>,
    document.body,
  );
}

// ── Toast / HUD ────────────────────────────────────────────────
type ToastMsg = { id: number; text: string; icon?: ReactNode; action?: { label: string; run: () => void } };
let pushToast: (t: Omit<ToastMsg, 'id'>) => void = () => {};
export const toast = (t: Omit<ToastMsg, 'id'>) => pushToast(t);

export function ToastHost() {
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const timer = useRef<number>(undefined);
  useEffect(() => {
    pushToast = (t) => {
      window.clearTimeout(timer.current);
      setMsg({ ...t, id: Date.now() });
      timer.current = window.setTimeout(() => setMsg(null), t.action ? 4000 : 2200);
    };
  }, []);
  if (!msg) return null;
  return createPortal(
    <div className="toast" key={msg.id} role="status">
      {msg.icon}
      <span>{msg.text}</span>
      {msg.action && <button type="button" onClick={() => { msg.action!.run(); setMsg(null); }}>{msg.action.label}</button>}
    </div>,
    document.body,
  );
}

// ── Аватар: аты-жөнінің бас әріптері, түсі атқа байланысты ───────────
const AV_COLORS = [
  ['#FF9500', '#FF5E3A'], ['#5AC8FA', '#007AFF'], ['#4CD964', '#30B0C7'], ['#AF52DE', '#5856D6'],
  ['#FF2D55', '#FF6482'], ['#FFCC00', '#FF9500'], ['#5856D6', '#007AFF'], ['#34C759', '#00C7BE'],
];
export function Avatar({ name, size = '' }: { name: string; size?: '' | 'xs' | 'sm' | 'lg' }) {
  const initials = name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b] = AV_COLORS[h % AV_COLORS.length];
  return <div className={`avatar ${size}`} style={{ background: `linear-gradient(180deg, ${a}, ${b})` }} aria-hidden>{initials}</div>;
}

export function Ring({ value }: { value: number }) {
  const r = 20, c = 2 * Math.PI * r;
  const color = value >= 70 ? 'var(--green)' : value >= 50 ? 'var(--blue)' : 'var(--orange)';
  return (
    <div className="ring" title={`${value}%`}>
      <svg viewBox="0 0 46 46"><circle cx="23" cy="23" r={r} stroke="var(--fill)" strokeWidth="4" fill="none" />
        <circle cx="23" cy="23" r={r} stroke={color} strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} style={{ transition: 'stroke-dashoffset .8s cubic-bezier(.32,.72,0,1)' }} />
      </svg>
      <span>{value}</span>
    </div>
  );
}

export const GOAL_COLORS: Record<GoalId, string> = {
  job_seek: 'var(--blue)', hire: 'var(--green)', mentor_seek: 'var(--orange)', mentor_offer: 'var(--purple)', cofounder: 'var(--pink)', exchange: 'var(--teal)',
};

export function GoalTag({ goal, label }: { goal: GoalId; label: string }) {
  const c = GOAL_COLORS[goal];
  return (
    <span className="goal-tag" style={{ background: `color-mix(in srgb, ${c} 15%, transparent)`, color: c }}>
      {GOALS.find((g) => g.id === goal)?.icon} {label}
    </span>
  );
}

export function haptic() {
  try { navigator.vibrate?.(8); } catch { /* ignore */ }
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  }
}

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { roleLabel } from '../../../shared/catalog.ts';
import type { Message, Profile } from '../../../shared/types.ts';
import { useApp } from '../App.tsx';
import { api } from '../api.ts';
import { IconBack, IconCalendar, IconInfo, IconSendUp, Spinner } from '../components/icons.tsx';
import { MeetSheet, PersonSheet } from '../components/people.tsx';
import { Avatar, haptic, toast } from '../components/ui.tsx';
import { fmtSeparator } from '../i18n.ts';

type Local = Message & { status?: 'sending' | 'failed' };

const GROUP_GAP = 5 * 60_000; // 5 минут ішіндегі хабарламалар бір топқа
const SEPARATOR_GAP = 30 * 60_000;

// Бір сұхбат (iMessage стилінде)
export function Chat({ otherId }: { otherId: string }) {
  const { t, lang, user, takeDraft, onLive, refreshChats, errorText, online } = useApp();
  const [other, setOther] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Local[] | null>(null);
  const [readByOther, setReadByOther] = useState<string | null>(null);
  const [text, setText] = useState(() => takeDraft(otherId));
  const [person, setPerson] = useState<Profile | null>(null);
  const [meet, setMeet] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<number>(undefined);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const stick = useRef(true); // төменде тұрсақ — жаңа хабарламада төмен айналдырамыз

  const load = useCallback(async () => {
    try {
      const th = await api.thread(otherId);
      setOther(th.other);
      setMessages(th.messages);
      setReadByOther(th.readByOther);
      setError(null);
      refreshChats();
    } catch (e) {
      setError(errorText(e));
    }
  }, [otherId, refreshChats, errorText]);

  useEffect(() => { load(); }, [load]);

  // Нақты уақыт: жаңа хабарлама мен «оқылды» белгісі
  useEffect(() => onLive((e) => {
    if (e.type === 'read' && e.by === otherId) setReadByOther(e.at);
    if (e.type === 'typing' && e.from === otherId) {
      setTyping(true);
      window.clearTimeout(typingTimer.current);
      typingTimer.current = window.setTimeout(() => setTyping(false), 12000);
      stick.current = window.innerHeight + window.scrollY >= document.body.scrollHeight - 120;
    }
    if (e.type !== 'message') return;
    const m = e.message;
    const mine = m.from === user.id && m.to === otherId;
    const theirs = m.from === otherId && m.to === user.id;
    if (!mine && !theirs) return;
    if (theirs) { setTyping(false); window.clearTimeout(typingTimer.current); }
    setMessages((xs) => (xs && !xs.some((x) => x.id === m.id) ? [...xs, m] : xs));
    if (theirs && document.visibilityState === 'visible') api.markRead(otherId).then(refreshChats).catch(() => {});
  }), [onLive, otherId, user.id, refreshChats]);

  // Байланыс қалпына келгенде — өткізіп алғандарды жүктейміз
  const wasOnline = useRef(online);
  useEffect(() => {
    if (online && !wasOnline.current) load();
    wasOnline.current = online;
  }, [online, load]);

  useEffect(() => {
    const on = () => { stick.current = window.innerHeight + window.scrollY >= document.body.scrollHeight - 80; };
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  useLayoutEffect(() => {
    if (stick.current) window.scrollTo({ top: document.body.scrollHeight });
  }, [messages, typing]);

  useEffect(() => () => window.clearTimeout(typingTimer.current), []);

  // Мәтін өрісі 1–5 жолға дейін өседі
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  const deliver = async (local: Local) => {
    try {
      const saved = await api.send(otherId, local.text);
      setMessages((xs) => {
        const rest = (xs ?? []).filter((x) => x.id !== local.id && x.id !== saved.id);
        return [...rest, saved].sort((a, b) => a.at.localeCompare(b.at));
      });
      refreshChats();
    } catch (e) {
      setMessages((xs) => (xs ?? []).map((x) => (x.id === local.id ? { ...x, status: 'failed' } : x)));
      toast({ text: errorText(e) });
    }
  };

  const send = () => {
    const body = text.trim();
    if (!body || !messages) return;
    haptic();
    const local: Local = { id: `local-${Date.now()}`, from: user.id, to: otherId, text: body, at: new Date().toISOString(), status: 'sending' };
    stick.current = true;
    setMessages((xs) => [...(xs ?? []), local]);
    setText('');
    inputRef.current?.focus();
    deliver(local);
  };

  const retry = (m: Local) => {
    setMessages((xs) => (xs ?? []).map((x) => (x.id === m.id ? { ...x, status: 'sending' } : x)));
    deliver(m);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      send();
    }
  };

  const lastMine = messages ? [...messages].reverse().find((m) => m.from === user.id) : undefined;

  return (
    <div className="chat-screen">
      <header className="chat-header">
        <a className="nav-btn" href="#/chats" aria-label={t('back')}><IconBack width={11} height={19} /> <span className="hidden-sm">{t('chats')}</span></a>
        <button type="button" className="chat-peer" onClick={() => other && setPerson(other)} disabled={!other}>
          {other && <Avatar name={other.name} size="xs" />}
          <span className="chat-peer-text">
            <span className="chat-peer-name">{other?.name ?? ' '}</span>
            {other && (typing
              ? <span className="chat-peer-role typing">{t('typing')}</span>
              : <span className="chat-peer-role">{roleLabel(other.role, lang)}{other.company ? ` · ${other.company}` : ''}</span>)}
          </span>
        </button>
        <button type="button" className="nav-btn" aria-label={t('meet')} onClick={() => other && setMeet(other)} disabled={!other}>
          <IconCalendar width={24} height={24} />
        </button>
      </header>

      <main className="chat-body" aria-live="polite">
        {error && <div className="empty"><p>{error}</p><button className="btn tinted small" style={{ marginTop: 12 }} onClick={load}>{t('retry')}</button></div>}
        {!messages && !error && <div className="center"><Spinner lg /></div>}
        {other?.synthetic && <div className="chat-note subtle"><IconInfo width={13} height={13} /> <span>{t('syntheticNote')}</span></div>}
        {messages?.map((m, i) => {
          const prev = messages[i - 1];
          const next = messages[i + 1];
          const mine = m.from === user.id;
          const sep = !prev || new Date(m.at).getTime() - new Date(prev.at).getTime() > SEPARATOR_GAP;
          const lastInGroup = !next || next.from !== m.from || new Date(next.at).getTime() - new Date(m.at).getTime() > GROUP_GAP;
          const firstInGroup = sep || !prev || prev.from !== m.from || new Date(m.at).getTime() - new Date(prev.at).getTime() > GROUP_GAP;
          return (
            <div key={m.id}>
              {sep && <div className="chat-sep">{fmtSeparator(m.at, lang, t)}</div>}
              <div className={`msg-row ${mine ? 'mine' : 'theirs'}${firstInGroup ? ' first' : ''}`}>
                <div className={`msg${lastInGroup ? ' tail' : ''}${m.status === 'sending' ? ' sending' : ''}${m.status === 'failed' ? ' failed' : ''}`}
                  title={new Date(m.at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  onClick={m.status === 'failed' ? () => retry(m) : undefined}>
                  {m.text}
                </div>
              </div>
              {m.status === 'failed' && <div className="msg-status failed">{t('failed')}</div>}
              {m === lastMine && !m.status && (
                <div className="msg-status">{readByOther && readByOther >= m.at ? t('read') : t('delivered')}</div>
              )}
            </div>
          );
        })}
        {typing && (
          <div className="msg-row theirs first" aria-label={t('typing')}>
            <div className="msg tail typing-bubble"><span /><span /><span /></div>
          </div>
        )}
      </main>

      <footer className="composer">
        <textarea ref={inputRef} value={text} rows={1} maxLength={1000} placeholder={t('messagePh')} aria-label={t('messagePh')}
          onChange={(e) => setText(e.target.value)} onKeyDown={onKey} />
        <button type="button" className="send-btn" onClick={send} disabled={!text.trim() || !messages} aria-label={t('send')}>
          <IconSendUp width={18} height={18} />
        </button>
      </footer>

      <PersonSheet person={person} me={user} onClose={() => setPerson(null)} showContact />
      <MeetSheet person={meet} onClose={() => setMeet(null)} />
    </div>
  );
}

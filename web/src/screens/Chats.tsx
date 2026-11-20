import { useEffect, useState } from 'react';
import { useApp } from '../App.tsx';
import { IconChats, IconSearch, Spinner } from '../components/icons.tsx';
import { Avatar, NavBar } from '../components/ui.tsx';
import { fmtChatTime } from '../i18n.ts';

// Хабарламалар тізімі (Messages / Telegram стилінде)
export function Chats() {
  const { t, lang, user, chats, refreshChats, go, online } = useApp();
  const [q, setQ] = useState('');
  useEffect(() => { refreshChats(); }, [refreshChats]);

  const query = q.trim().toLowerCase();
  const list = (chats ?? []).filter((c) => !query || c.other.name.toLowerCase().includes(query) || c.last.text.toLowerCase().includes(query));

  return (
    <div className="screen">
      <NavBar title={t('chats')} sub={!online ? <span>{t('offline')}</span> : undefined} />
      {(chats?.length ?? 0) > 0 && (
        <label className="search" style={{ marginTop: 4 }}>
          <IconSearch />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('searchChats')} aria-label={t('searchChats')} />
        </label>
      )}

      {chats === null && <div className="center"><Spinner lg /></div>}

      {chats?.length === 0 && (
        <div className="empty">
          <IconChats className="glyph" />
          <h3>{t('noChats')}</h3>
          <p>{t('noChatsD')}</p>
          <button className="btn tinted small" style={{ marginTop: 16 }} onClick={() => go('for-you')}>{t('forYou')}</button>
        </div>
      )}

      {list.length > 0 && (
        <div className="chat-list">
          {list.map((c) => (
            <a key={c.other.id} className={`chat-row${c.unread ? ' unread' : ''}`} href={`#/chats/${encodeURIComponent(c.other.id)}`}>
              <Avatar name={c.other.name} />
              <div className="chat-main">
                <div className="chat-top">
                  <span className="chat-name">{c.other.name}</span>
                  <span className="chat-time">{fmtChatTime(c.last.at, lang, t)}</span>
                </div>
                <div className="chat-bottom">
                  <span className="chat-preview">{c.last.from === user.id ? `${t('you')}: ` : ''}{c.last.text}</span>
                  {c.unread > 0 && <span className="unread-badge">{c.unread}</span>}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

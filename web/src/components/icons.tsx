// SF Symbols стиліндегі иконкалар (қолмен салынған SVG, 24×24)
import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;
const S = (p: P & { children: React.ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p} />
);

export const IconSparkles = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path d="M10 2.5c.3 0 .5.2.6.5l1 3.6c.4 1.4 1.4 2.4 2.8 2.8l3.6 1c.3.1.5.3.5.6s-.2.5-.5.6l-3.6 1c-1.4.4-2.4 1.4-2.8 2.8l-1 3.6c-.1.3-.3.5-.6.5s-.5-.2-.6-.5l-1-3.6c-.4-1.4-1.4-2.4-2.8-2.8l-3.6-1c-.3-.1-.5-.3-.5-.6s.2-.5.5-.6l3.6-1c1.4-.4 2.4-1.4 2.8-2.8l1-3.6c.1-.3.3-.5.6-.5Z" />
    <path d="M18.5 1.5c.2 0 .3.1.4.3l.4 1.3c.1.5.5.9 1 1l1.3.4c.2.1.3.2.3.4s-.1.3-.3.4l-1.3.4c-.5.1-.9.5-1 1l-.4 1.3c-.1.2-.2.3-.4.3s-.3-.1-.4-.3l-.4-1.3c-.1-.5-.5-.9-1-1l-1.3-.4c-.2-.1-.3-.2-.3-.4s.1-.3.3-.4l1.3-.4c.5-.1.9-.5 1-1l.4-1.3c.1-.2.2-.3.4-.3Z" />
  </svg>
);
export const IconPeople = (p: P) => (
  <svg viewBox="0 0 28 28" fill="currentColor" aria-hidden {...p}>
    <circle cx="10.5" cy="9" r="4.2" />
    <path d="M2.8 21.6c0-3.9 3.5-6.6 7.7-6.6s7.7 2.7 7.7 6.6c0 .8-.6 1.4-1.4 1.4H4.2c-.8 0-1.4-.6-1.4-1.4Z" />
    <circle cx="19.5" cy="10" r="3.4" opacity=".55" />
    <path d="M19.6 15.6c3.3 0 5.9 2.2 5.9 5.2 0 .7-.5 1.2-1.2 1.2h-4.8c.3-.4.4-.9.4-1.4 0-1.9-.8-3.6-2.1-4.8.6-.1 1.2-.2 1.8-.2Z" opacity=".55" />
  </svg>
);
export const IconCalendar = (p: P) => (
  <svg viewBox="0 0 28 28" fill="currentColor" aria-hidden {...p}>
    <path fillRule="evenodd" d="M7.5 4.2c.6 0 1 .4 1 1V6h11v-.8a1 1 0 1 1 2 0V6h.3A3.2 3.2 0 0 1 25 9.2v12.6a3.2 3.2 0 0 1-3.2 3.2H6.2A3.2 3.2 0 0 1 3 21.8V9.2A3.2 3.2 0 0 1 6.2 6h.3v-.8c0-.6.4-1 1-1ZM5 11.5v10.3c0 .7.5 1.2 1.2 1.2h15.6c.7 0 1.2-.5 1.2-1.2V11.5H5Z" />
    <rect x="7.5" y="14" width="3" height="3" rx=".8" /><rect x="12.5" y="14" width="3" height="3" rx=".8" /><rect x="17.5" y="14" width="3" height="3" rx=".8" />
    <rect x="7.5" y="18.5" width="3" height="3" rx=".8" /><rect x="12.5" y="18.5" width="3" height="3" rx=".8" />
  </svg>
);
export const IconChart = (p: P) => (
  <svg viewBox="0 0 28 28" fill="currentColor" aria-hidden {...p}>
    <rect x="4" y="14" width="5" height="10" rx="1.5" /><rect x="11.5" y="8" width="5" height="16" rx="1.5" /><rect x="19" y="4" width="5" height="20" rx="1.5" />
  </svg>
);
export const IconPerson = (p: P) => (
  <svg viewBox="0 0 28 28" fill="currentColor" aria-hidden {...p}>
    <path fillRule="evenodd" d="M14 2.5a11.5 11.5 0 1 1 0 23 11.5 11.5 0 0 1 0-23Zm0 14.2c-3 0-5.6 1.3-7.1 3.4a9.3 9.3 0 0 0 14.2 0c-1.5-2.1-4.1-3.4-7.1-3.4Zm0-9.8a4.3 4.3 0 1 0 0 8.6 4.3 4.3 0 0 0 0-8.6Z" />
  </svg>
);
export const IconChevron = (p: P) => (
  <svg viewBox="0 0 8 13" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M1.5 1.5 6.5 6.5l-5 5" />
  </svg>
);
export const IconBack = (p: P) => (
  <svg viewBox="0 0 12 20" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M10 2 2 10l8 8" />
  </svg>
);
export const IconCheck = (p: P) => (
  <S strokeWidth={2.6} {...p}><path d="M4.5 12.5 9.5 17.5 19.5 6.5" /></S>
);
export const IconX = (p: P) => (
  <S strokeWidth={2.4} {...p}><path d="M6 6l12 12M18 6 6 18" /></S>
);
export const IconPlus = (p: P) => (
  <S strokeWidth={2.4} {...p}><path d="M12 5v14M5 12h14" /></S>
);
export const IconMinus = (p: P) => (
  <S strokeWidth={2.4} {...p}><path d="M5 12h14" /></S>
);
export const IconCopy = (p: P) => (
  <S strokeWidth={2} {...p}><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6.8c0-1.3-1-2.3-2.3-2.3H6.8c-1.3 0-2.3 1-2.3 2.3v6.4c0 1.3 1 2.3 2.3 2.3h1.7" /></S>
);
export const IconSearch = (p: P) => (
  <S strokeWidth={2.2} {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.8-4.8" /></S>
);
export const IconRefresh = (p: P) => (
  <S strokeWidth={2.2} {...p}><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4.5v4.5H15" /></S>
);
export const IconHandshake = (p: P) => (
  <S strokeWidth={2} {...p}><path d="M4 12.5 8 8.5l3.2 1.6c.7.3 1.5.2 2-.3l1.3-1.3" /><path d="m2.5 11 3 3M21.5 11l-3 3" /><path d="m7 15 2.5 2.5c.6.6 1.5.6 2 0l.5-.5M10 13l3 3c.6.6 1.5.6 2 0s.6-1.5 0-2l-1-1M13 11.5l2.5 2.5c.6.6 1.5.6 2 0s.6-1.5 0-2L13.5 8l-3-1.5" /></S>
);
export const IconClock = (p: P) => (
  <S strokeWidth={2} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></S>
);
export const IconPin = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}>
    <path fillRule="evenodd" d="M12 2.5c4 0 7 3 7 6.9 0 4.6-4.6 9.4-6.2 11a1.2 1.2 0 0 1-1.6 0C9.6 18.8 5 14 5 9.4c0-3.9 3-6.9 7-6.9Zm0 4.2a2.7 2.7 0 1 0 0 5.4 2.7 2.7 0 0 0 0-5.4Z" />
  </svg>
);
export const IconBolt = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M13.5 2 4.8 13.1c-.4.5 0 1.2.6 1.2h5.6L10 22l8.7-11.1c.4-.5 0-1.2-.6-1.2h-5.6L13.5 2Z" /></svg>
);
export const IconBubble = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M12 3.5c5 0 9 3.4 9 7.7s-4 7.7-9 7.7c-.9 0-1.8-.1-2.6-.3L5.3 20.4c-.5.2-1-.2-.9-.7l.7-3.2C3.8 15.1 3 13.2 3 11.2c0-4.3 4-7.7 9-7.7Z" /></svg>
);
export const IconStore = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M4.2 4h15.6l1.7 4.6c.5 1.6-.7 3.2-2.4 3.2-1.2 0-2.2-.8-2.4-1.9-.3 1.1-1.3 1.9-2.5 1.9s-2.1-.8-2.4-1.9c-.3 1.1-1.3 1.9-2.4 1.9-1.2 0-2.2-.8-2.5-1.9-.2 1.1-1.2 1.9-2.4 1.9-1.7 0-2.9-1.6-2.4-3.2L4.2 4Z" /><path d="M5 13.3c.6.2 1.2.2 1.8.1V19h3.4v-3.5c0-.6.4-1 1-1h1.6c.6 0 1 .4 1 1V19h3.4v-5.6c.6.1 1.2.1 1.8-.1V19c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2v-5.7Z" /></svg>
);
export const IconTelegram = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...p}><path d="M20.7 4.3 3.4 11c-1 .4-1 1.8.1 2.1l4.2 1.3 1.6 5.1c.2.7 1.1.9 1.6.4l2.4-2.3 4.3 3.2c.6.4 1.4.1 1.6-.6l3-14.3c.2-.9-.7-1.7-1.5-1.3Zm-3.3 3.6-7.3 6.7-.3 3-1.3-4.2 8.5-5.8c.3-.2.6.1.4.3Z" /></svg>
);

export const IconHouse = (p: P) => (
  <svg viewBox="0 0 28 28" fill="currentColor" aria-hidden {...p}>
    <path d="M12.6 3.6a2.2 2.2 0 0 1 2.8 0l9 7.4c.6.5.2 1.5-.6 1.5H22v9.8c0 1.2-1 2.2-2.2 2.2h-3.3v-6.3c0-.6-.4-1-1-1h-3c-.6 0-1 .4-1 1v6.3H8.2C7 24.5 6 23.5 6 22.3v-9.8H4.2c-.8 0-1.2-1-.6-1.5l9-7.4Z" />
  </svg>
);
export const IconChats = (p: P) => (
  <svg viewBox="0 0 28 28" fill="currentColor" aria-hidden {...p}>
    <path d="M11.5 3.5c5.2 0 9.5 3.5 9.5 7.9s-4.3 7.9-9.5 7.9c-.9 0-1.8-.1-2.6-.3l-3.8 2c-.6.3-1.2-.2-1.1-.8l.6-3C3 15.7 2 13.6 2 11.4c0-4.4 4.3-7.9 9.5-7.9Z" />
    <path d="M22.6 10.4c2.1 1.3 3.4 3.3 3.4 5.6 0 1.8-.8 3.4-2.1 4.6l.5 2.3c.1.6-.5 1-1 .7l-2.9-1.5c-.7.2-1.4.3-2.2.3-1.7 0-3.3-.4-4.6-1.2 4.9-.6 8.8-4.1 8.9-8.4v-2.4Z" opacity=".55" />
  </svg>
);
export const IconSendUp = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </svg>
);
export const IconInfo = (p: P) => (
  <S strokeWidth={2} {...p}><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></S>
);

// iOS UIActivityIndicator — 8 жолақ
export const Spinner = ({ lg }: { lg?: boolean }) => (
  <svg className={`spinner${lg ? ' lg' : ''}`} viewBox="0 0 24 24" aria-label="loading">
    {Array.from({ length: 8 }, (_, i) => (
      <rect key={i} x="11" y="2" width="2" height="6" rx="1" fill="currentColor" opacity={0.25 + (i / 8) * 0.75} transform={`rotate(${i * 45} 12 12)`} />
    ))}
  </svg>
);

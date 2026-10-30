import type { ReactNode } from 'react';

const drawings: Record<string, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>,
  pen: <><path d="m15 4 5 5M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z"/></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  heart: <><path d="M20.5 4.7a5.3 5.3 0 0 0-7.5 0l-1 1-1-1a5.3 5.3 0 1 0-7.5 7.5L12 21l8.5-8.8a5.3 5.3 0 0 0 0-7.5Z"/></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4"/></>,
  check: <><path d="m5 12 4 4L19 6"/><path d="M20 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8"/></>,
  status: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  smile: <><circle cx="12" cy="12" r="9"/><path d="M8 14s1 3 4 3 4-3 4-3M8 8h.01M16 8h.01"/></>,
  message: <><path d="M21 11a8.5 8.5 0 0 1-9 8H7l-5 3 2-6a8 8 0 0 1-1-4 9 9 0 0 1 18-1Z"/><path d="M8 11h8"/></>,
  code: <><path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-15-2 18"/></>,
  coffee: <><path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Zm13 1h2a3 3 0 0 1 0 6h-2M3 23h16M7 2v2m4-2v2m4-2v2"/></>,
  bookmark: <><path d="M6 3h12v18l-6-4-6 4V3Z"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  'arrow-right': <><path d="M4 12h16m-6-6 6 6-6 6"/></>,
  'arrow-up-right': <><path d="M6 18 18 6M6 6h12v12"/></>,
  'arrow-down-right': <><path d="m6 6 12 12M6 18h12V6"/></>,
  'chevron-down': <><path d="m6 9 6 6 6-6"/></>,
  sort: <><path d="M7 3v18m-4-4 4 4 4-4M13 5h8m-8 5h6m-6 5h4"/></>,
  x: <><path d="m6 6 12 12M6 18 18 6"/></>,
  rotate: <><path d="M3 10a9 9 0 1 1 2 8M3 3v7h7"/></>,
  shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/></>,
  package: <><path d="m12 2 9 5v10l-9 5-9-5V7l9-5Zm-9 5 9 5 9-5M12 12v10M7 4.8l9 5"/></>,
};

export default function Icon({ name }: { name: string }) {
  return <span data-icon={name}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{drawings[name] || drawings.grid}</svg></span>;
}

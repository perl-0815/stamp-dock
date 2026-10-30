import { STYLES, TEMPLATES } from '../../public/assets/templates.js';
import { DEFAULT, type Stamp } from './types';

export const CUSTOM_KEY = 'stampdock-custom-v1';
export const FAVORITES_KEY = 'stampdock-favorites-v1';

function validCustom(value: unknown): value is Stamp {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && /^custom-[\w-]{1,80}$/.test(item.id)
    && typeof item.text === 'string' && Boolean(item.text.trim()) && item.text.length <= 40
    && STYLES.some(style => style.id === item.style)
    && typeof item.color === 'string' && /^#[0-9a-f]{6}$/i.test(item.color);
}

// Called after hydration only. The existing v1 keys and shape stay compatible
// with stamps saved before the Next.js migration.
export function readPersonalStamps() {
  let failed = false;
  const read = (key: string): unknown => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { failed = true; return []; }
  };
  const storedCustom = read(CUSTOM_KEY), storedFavorites = read(FAVORITES_KEY);
  const customStamps: Stamp[] = Array.isArray(storedCustom) ? storedCustom.filter(validCustom).slice(0, 60).map(stamp => ({
    ...DEFAULT, ...stamp,
    name: stamp.text.replace(/\n/g, ' '), subtext: String(stamp.subtext || '').slice(0, 40), category: 'custom', tags: [],
    rotation: Math.max(-12, Math.min(12, Number(stamp.rotation) || 0)),
    textScale: Math.max(.7, Math.min(1.3, Number(stamp.textScale) || 1)),
    font: ['sans', 'rounded', 'mono', 'serif'].includes(stamp.font || '') ? stamp.font : 'rounded',
    background: ['transparent', 'white', 'color'].includes(stamp.background || '') ? stamp.background : 'transparent',
  })) : [];
  const validIds = new Set([...TEMPLATES, ...customStamps].map(stamp => stamp.id));
  const favorites: string[] = Array.isArray(storedFavorites) ? [...new Set(storedFavorites.filter((id): id is string => typeof id === 'string' && validIds.has(id)))] : [];
  return { customStamps, favorites, failed };
}

export function writePersonalStamps(key: string, value: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}

import type { CategoryId, Stamp, StyleId } from '../../src/lib/types';
export const CATEGORIES: { id: Exclude<CategoryId, 'custom'> | 'all'; label: string }[];
export const STYLES: { id: StyleId; label: string }[];
export const PALETTE: string[];
export const TEMPLATES: Stamp[];

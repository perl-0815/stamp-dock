export type StyleId = 'outline' | 'solid' | 'badge' | 'terminal' | 'pixel' | 'hand' | 'circle' | 'impact';
export type FontId = 'sans' | 'rounded' | 'mono' | 'serif';
export type Resolution = 128 | 256 | 512 | 1024 | 2048;
export type CategoryId = 'review' | 'status' | 'reaction' | 'communication' | 'dev' | 'fun' | 'custom';
export type View = 'library' | 'packs' | 'editor' | 'favorites' | 'mine';

export interface StampConfig {
  text: string;
  subtext: string;
  style: StyleId;
  color: string;
  rotation?: number;
  font?: FontId;
  background?: 'transparent' | 'white' | 'color';
  backgroundColor?: string;
  textScale?: number;
}
export interface Stamp extends StampConfig {
  id: string;
  name: string;
  category: CategoryId;
  tags: string[];
}
export interface StampPack {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  ids: string[];
}
export const DEFAULT: StampConfig = {
  text: 'LGTM!', subtext: 'LOOKS GOOD TO ME', style: 'outline', color: '#39775b',
  rotation: -5, font: 'rounded', background: 'transparent', backgroundColor: '#f5eee3', textScale: 1,
};
export const RESOLUTIONS: Resolution[] = [128, 256, 512, 1024, 2048];

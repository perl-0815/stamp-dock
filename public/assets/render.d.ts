import type { StampConfig } from '../../src/lib/types';
export function renderStamp(canvas: HTMLCanvasElement, config: StampConfig, size?: number): Promise<HTMLCanvasElement>;
export function createStampBlob(config: StampConfig, size?: number): Promise<Blob>;

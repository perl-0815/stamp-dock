import type { StampPack } from '../../src/lib/types';
export function createZip(files: { name: string; bytes: Uint8Array }[]): Blob;
export function createPackArchive(pack: StampPack, size: number, options?: { onProgress?: (done: number, total: number) => void; signal?: AbortSignal }): Promise<Blob>;

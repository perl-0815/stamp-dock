import { createStampBlob } from './render.js';
import { packStamps } from './packs.js';

const utf8 = new TextEncoder();
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});
function crc32(bytes) {
  let value = 0xffffffff;
  for (const byte of bytes) value = (value >>> 8) ^ crcTable[(value ^ byte) & 255];
  return (value ^ 0xffffffff) >>> 0;
}

// PNG files are already compressed. ZIP's STORE method avoids a second pass
// through a compression library and keeps archive creation entirely local.
export function createZip(files) {
  if (!files.length || files.length > 65535) throw new Error('ZIPに含めるファイル数が範囲外です。');
  const body = [], directory = [];
  let offset = 0, directorySize = 0;
  for (const file of files) {
    const name = utf8.encode(file.name);
    const bytes = file.bytes;
    if (!name.length || name.length > 65535 || !(bytes instanceof Uint8Array) || bytes.length > 0xffffffff || offset + bytes.length + 30 + name.length > 0xffffffff) throw new Error('ZIPに含めるファイルが大きすぎます。');
    const crc = crc32(bytes);
    const local = new Uint8Array(30 + name.length);
    const header = new DataView(local.buffer);
    header.setUint32(0, 0x04034b50, true);
    header.setUint16(4, 20, true);
    header.setUint16(6, 0x0800, true); // UTF-8 names
    header.setUint16(12, 0x0021, true); // 1980-01-01, valid fixed DOS date
    header.setUint32(14, crc, true);
    header.setUint32(18, bytes.length, true);
    header.setUint32(22, bytes.length, true);
    header.setUint16(26, name.length, true);
    local.set(name, 30);
    body.push(local, bytes);

    const central = new Uint8Array(46 + name.length);
    const entry = new DataView(central.buffer);
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(14, 0x0021, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, bytes.length, true);
    entry.setUint32(24, bytes.length, true);
    entry.setUint16(28, name.length, true);
    entry.setUint32(42, offset, true);
    central.set(name, 46);
    directory.push(central);
    directorySize += central.length;
    offset += local.length + bytes.length;
  }
  const end = new Uint8Array(22);
  const footer = new DataView(end.buffer);
  footer.setUint32(0, 0x06054b50, true);
  footer.setUint16(8, files.length, true);
  footer.setUint16(10, files.length, true);
  footer.setUint32(12, directorySize, true);
  footer.setUint32(16, offset, true);
  return new Blob([...body, ...directory, end], { type: 'application/zip' });
}

export async function createPackArchive(pack, size, { onProgress, signal } = {}) {
  if (![128, 256, 512, 1024, 2048].includes(size)) throw new Error('画像の解像度が正しくありません。');
  const stamps = packStamps(pack);
  const folder = `stampdock-${pack.id}-${size}px`;
  const files = [];
  const index = [];
  for (let i = 0; i < stamps.length; i++) {
    signal?.throwIfAborted();
    const stamp = stamps[i];
    const filename = `${String(i + 1).padStart(2, '0')}-${stamp.id}.png`;
    const blob = await createStampBlob(stamp, size);
    signal?.throwIfAborted();
    files.push({ name: `${folder}/${filename}`, bytes: new Uint8Array(await blob.arrayBuffer()) });
    index.push(`${filename} — ${stamp.name}`);
    onProgress?.(i + 1, stamps.length);
    // Allow progress, cancellation, and input to paint between large PNGs.
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  signal?.throwIfAborted();
  const readme = `STAMPDOCK / ${pack.name}パック\n\n${stamps.length}個の透過PNG / 各 ${size} × ${size} px\n個人・商用を問わず無料で利用できます。\n\n${index.join('\n')}\n\n画像はブラウザ内で生成され、作成内容の外部送信はありません。\n`;
  files.push({ name: `${folder}/README.txt`, bytes: utf8.encode(readme) });
  return createZip(files);
}

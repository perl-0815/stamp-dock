/**
 * Regenerate STAMPDOCK's checked-in share image and app icons.
 * Run: node scripts/generate-brand-assets.mjs
 * Optional visual QA: append --preview /tmp/stampdock-brand-icons.png
 * Requires the existing @playwright/test dev dependency and its Chromium browser.
 * All fonts, vectors and stamp drawings come from this checkout; no app server,
 * network assets, image-generation service or additional package is needed.
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const publicRoot = resolve(projectRoot, 'public');
const appRoot = resolve(projectRoot, 'src/app');
const svg = await readFile(resolve(publicRoot, 'assets/favicon.svg'), 'utf8');
const previewIndex = process.argv.indexOf('--preview');
const previewPath = previewIndex >= 0 ? process.argv[previewIndex + 1] : undefined;
if (previewIndex >= 0 && !previewPath) throw new Error('--preview requires an output PNG path.');

const mimeTypes = {
  '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png',
};
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/') {
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      response.end('<!doctype html><html lang="ja"><head><meta charset="utf-8"><link rel="stylesheet" href="/assets/fonts.css"></head><body></body></html>');
      return;
    }
    const path = resolve(publicRoot, '.' + decodeURIComponent(url.pathname));
    if (!path.startsWith(publicRoot + sep)) { response.writeHead(403).end(); return; }
    const data = await readFile(path);
    response.writeHead(200, { 'Content-Type': mimeTypes[extname(path)] || 'application/octet-stream' });
    response.end(data);
  } catch { response.writeHead(404).end('Not found'); }
});

function pngSize(buffer) {
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(buffer.subarray(12, 16).toString('ascii'), 'IHDR');
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}
function makeIco(frames) {
  const header = Buffer.alloc(6 + frames.length * 16);
  header.writeUInt16LE(1, 2); // ICO rather than a cursor.
  header.writeUInt16LE(frames.length, 4);
  let offset = header.length;
  for (const [index, frame] of frames.entries()) {
    assert.deepEqual(pngSize(frame.png), { width: frame.size, height: frame.size });
    const entry = 6 + index * 16;
    header.writeUInt8(frame.size, entry);
    header.writeUInt8(frame.size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(frame.png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += frame.png.length;
  }
  return Buffer.concat([header, ...frames.map(frame => frame.png)]);
}

let browser;
try {
  await new Promise((done, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', done);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  // Generation is deliberately restricted to its own local static assets.
  await page.route('**/*', route => route.request().url().startsWith(origin + '/')
    ? route.continue() : route.abort());
  await page.goto(origin);
  const output = await page.evaluate(async ({ svg }) => {
    const { renderStamp } = await import('/assets/render.js');
    const { TEMPLATES } = await import('/assets/templates.js');
    const { PACKS } = await import('/assets/packs.js');
    const colors = { paper: '#f8f8f4', ink: '#283c34', forest: '#39775b', orange: '#df8653', muted: '#788472' };
    await document.fonts.load('700 44px "StampRound"', 'STAMPDOCKことばを、ちょうどいいスタンプに。LGTM解決済みありがとうエンジニアのための工房0123456789');

    const canvas = document.createElement('canvas');
    canvas.width = 1200; canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is unavailable.');
    const decodeSvg = source => new Promise((done, reject) => {
      const image = new Image();
      image.onload = () => done(image); image.onerror = reject;
      image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    });
    const icon = await decodeSvg(svg);
    const trackedText = (text, x, y, spacing = 1) => {
      for (const char of text) { ctx.fillText(char, x, y); x += ctx.measureText(char).width + spacing; }
    };

    ctx.fillStyle = colors.paper; ctx.fillRect(0, 0, 1200, 630);
    ctx.save(); ctx.fillStyle = '#d9e1d2'; ctx.globalAlpha = .75;
    for (let y = 138; y <= 534; y += 22) for (let x = 676; x <= 1138; x += 22) {
      ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    // Header: the exact existing mark, with a self-hosted wordmark.
    ctx.drawImage(icon, 68, 60, 44, 44);
    ctx.fillStyle = colors.ink; ctx.font = '700 28px "StampRound"';
    ctx.fillText('STAMPDOCK', 127, 91);
    ctx.font = '700 11px "StampRound"'; ctx.fillStyle = colors.muted;
    ctx.textAlign = 'right'; ctx.fillText('YOUR EVERYDAY STAMP TOOL', 1132, 86); ctx.textAlign = 'left';

    // The headline stays in the left column, clear of the stamp collage.
    ctx.fillStyle = colors.ink; ctx.font = '700 43px "StampRound"';
    for (const [text, y] of [['ことばを、', 226], ['ちょうどいいスタンプに。', 291]]) {
      if (ctx.measureText(text).width > 550) throw new Error('Share-image headline exceeds its reserved column.');
      ctx.fillText(text, 68, y);
    }
    ctx.font = '700 19px "StampRound"'; ctx.fillStyle = colors.muted;
    ctx.fillText('LGTM・解決済み・ありがとう。', 68, 354);
    ctx.fillText('エンジニアのためのスタンプ工房。', 68, 387);
    ctx.fillStyle = colors.forest; ctx.font = '700 11px "StampRound"';
    trackedText(`${TEMPLATES.length} TEMPLATES  /  ${PACKS.length} PACKS  /  PNG DOWNLOAD`, 68, 477, .8);

    // These are the site's real, shared PNG-rendering templates, not mock text.
    const placements = [
      { stamp: TEMPLATES.find(stamp => stamp.id === 'lgtm'), x: 640, y: 20, size: 440 },
      { stamp: TEMPLATES.find(stamp => stamp.id === 'resolved'), x: 925, y: 295, size: 250 },
      { stamp: TEMPLATES.find(stamp => stamp.id === 'thanks'), x: 625, y: 264, size: 350 },
    ];
    for (const { stamp, x, y, size } of placements) {
      if (!stamp) throw new Error('A required share-image template is missing.');
      const layer = document.createElement('canvas');
      await renderStamp(layer, { ...stamp, background: 'transparent' }, 1024);
      ctx.drawImage(layer, x, y, size, size);
    }

    ctx.strokeStyle = '#dce3d6'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(68, 566.5); ctx.lineTo(1132, 566.5); ctx.stroke();
    ctx.font = '700 10px "StampRound"'; ctx.fillStyle = colors.muted;
    trackedText('SEARCH. MAKE. STAMP.', 68, 595, 1.4);
    ctx.textAlign = 'right'; ctx.fillText('A LITTLE STAMP, A BETTER DAY.', 1132, 595); ctx.textAlign = 'left';

    const toBase64 = target => target.toDataURL('image/png').split(',')[1];
    const frames = [];
    for (const size of [16, 32, 48]) {
      const frame = document.createElement('canvas'); frame.width = frame.height = size;
      frame.getContext('2d').drawImage(icon, 0, 0, size, size);
      frames.push({ size, png: toBase64(frame) });
    }
    const apple = document.createElement('canvas'); apple.width = apple.height = 180;
    const fullBleedSvg = svg.replace('rx="14"', 'rx="0"').replaceAll('#fffaf4', '#ffffff');
    apple.getContext('2d').drawImage(await decodeSvg(fullBleedSvg), 0, 0, 180, 180);
    const appleCorners = [[0,0], [179,0], [0,179], [179,179]]
      .map(([x,y]) => Array.from(apple.getContext('2d').getImageData(x,y,1,1).data));
    return { og: toBase64(canvas), apple: toBase64(apple), frames, appleCorners };
  }, { svg });

  const og = Buffer.from(output.og, 'base64');
  const apple = Buffer.from(output.apple, 'base64');
  const frames = output.frames.map(frame => ({ size: frame.size, png: Buffer.from(frame.png, 'base64') }));
  const ico = makeIco(frames);
  assert.deepEqual(pngSize(og), { width: 1200, height: 630 });
  assert.deepEqual(pngSize(apple), { width: 180, height: 180 });
  assert.equal(ico.readUInt16LE(4), 3);
  for (const pixel of output.appleCorners) assert.deepEqual(pixel, [223, 134, 83, 255]);
  await mkdir(appRoot, { recursive: true });
  await Promise.all([
    writeFile(resolve(publicRoot, 'og-image.png'), og),
    writeFile(resolve(appRoot, 'favicon.ico'), ico),
    writeFile(resolve(appRoot, 'icon.svg'), svg),
    writeFile(resolve(appRoot, 'apple-icon.png'), apple),
  ]);

  if (previewPath) {
    // Show the actual PNG frames both at native size and at a readable QA scale.
    await page.evaluate(({ frames, apple }) => {
      document.body.style = 'margin:0;padding:36px;background:#f8f8f4;font:14px sans-serif;color:#283c34';
      document.body.innerHTML = '<h1 style="font-size:22px;margin:0 0 24px">STAMPDOCK / app icon checks</h1>';
      const row = document.createElement('div'); row.style = 'display:flex;align-items:start;gap:36px';
      for (const frame of frames) {
        const card = document.createElement('div'); card.style = 'padding:20px;background:white;border:1px solid #dce3d6;border-radius:12px;min-width:180px';
        const label = document.createElement('p'); label.textContent = `${frame.size} × ${frame.size} px / ICO frame`; card.append(label);
        for (const scale of [1, 3]) { const image = document.createElement('img'); image.src = `data:image/png;base64,${frame.png}`; image.width = image.height = frame.size * scale; image.style = 'display:block;margin-top:20px'; card.append(image); }
        row.append(card);
      }
      const card = document.createElement('div'); card.style = 'padding:20px;background:white;border:1px solid #dce3d6;border-radius:12px';
      const label = document.createElement('p'); label.textContent = '180 × 180 px / Apple icon'; card.append(label);
      const image = document.createElement('img'); image.src = `data:image/png;base64,${apple}`; image.width = image.height = 180; card.append(image); row.append(card);
      document.body.append(row);
    }, output);
    await page.screenshot({ path: resolve(previewPath), fullPage: true });
  }
  console.log(JSON.stringify({
    generated: ['public/og-image.png', 'src/app/favicon.ico', 'src/app/icon.svg', 'src/app/apple-icon.png'],
    og: { ...pngSize(og), bytes: og.length }, apple: { ...pngSize(apple), bytes: apple.length },
    ico: { frames: frames.map(frame => frame.size), bytes: ico.length },
    ...(previewPath ? { preview: resolve(previewPath) } : {}),
  }));
} finally {
  try { await browser?.close(); }
  finally {
    if (server.listening) await new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
  }
}


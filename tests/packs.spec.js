import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const packIds = ['standard', 'code-review', 'progress', 'release-ops', 'team-chat', 'coffee-break'];
function inspectZip(path) {
  return JSON.parse(execFileSync('python3', ['-c', `
import json,sys,zipfile,struct
with zipfile.ZipFile(sys.argv[1]) as z:
    assert z.testzip() is None, 'CRC failure'
    names = z.namelist()
    pngs = [n for n in names if n.endswith('.png')]
    sizes = [list(struct.unpack('>II', z.read(n)[16:24])) for n in pngs]
    for n in pngs:
        assert z.read(n)[:8] == b'\\x89PNG\\r\\n\\x1a\\n'
    readme = z.read(next(n for n in names if n.endswith('README.txt'))).decode('utf-8')
    print(json.dumps(dict(names=names,pngs=pngs,sizes=sizes,readme=readme)))
`, path], { encoding: 'utf8' }));
}

test.beforeEach(async ({ page }) => { await page.goto('/'); await page.locator('[data-filter="packs"]').click(); });

test('six curated packs have valid unique stamps and can be previewed', async ({ page }) => {
  await expect(page.locator('.pack-card')).toHaveCount(6);
  const contents = await page.evaluate(async () => {
    const { PACKS, packStamps } = await import('/assets/packs.js');
    return PACKS.map(p => ({ id: p.id, count: p.ids.length, unique: new Set(p.ids).size, names: packStamps(p).map(s => s.name) }));
  });
  expect(contents.map(p => p.id)).toEqual(packIds);
  contents.forEach(p => { expect(p.count).toBe(16); expect(p.unique).toBe(16); });
  await page.locator('[data-pack-detail="standard"]').first().click();
  await expect(page.getByRole('dialog', { name: 'スタンダードパック' })).toBeVisible();
  await expect(page.locator('.pack-content-item')).toHaveCount(16);
  await expect(page.locator('.pack-content-item span')).toHaveText(contents[0].names);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-pack-detail="standard"]').first()).toBeFocused();
});

test('every pack downloads a real readable ZIP with all sixteen PNGs', async ({ page }) => {
  await page.locator('#pack-resolution').selectOption('128');
  for (const id of packIds) {
    const pending = page.waitForEvent('download');
    await page.locator(`#pack-grid [data-pack-download="${id}"]`).click();
    const download = await pending;
    expect(download.suggestedFilename()).toBe(`stampdock-${id}-128px.zip`);
    const archive = inspectZip(await download.path());
    expect(archive.names).toHaveLength(17);
    expect(new Set(archive.names).size).toBe(17);
    expect(archive.pngs).toHaveLength(16);
    expect(archive.sizes).toEqual(Array.from({ length: 16 }, () => [128, 128]));
    expect(archive.readme).toContain('16個の透過PNG / 各 128 × 128 px');
    archive.pngs.forEach(name => expect(archive.readme).toContain(name.split('/').at(-1)));
    await expect(page.locator('#pack-progress')).toBeHidden();
  }
});

test('pack detail honors selected high resolution and does not emit individual downloads', async ({ page }) => {
  const downloads = [];
  page.on('download', download => downloads.push(download));
  await page.locator('[data-pack-detail="standard"]').first().click();
  await page.locator('#pack-detail-resolution').selectOption('2048');
  const pending = page.waitForEvent('download');
  await page.locator('#pack-dialog-download').click();
  const download = await pending;
  const archive = inspectZip(await download.path());
  expect(archive.sizes).toEqual(Array.from({ length: 16 }, () => [2048, 2048]));
  expect(download.suggestedFilename()).toBe('stampdock-standard-2048px.zip');
  expect(downloads).toHaveLength(1);
  await expect(page.locator('#library-resolution')).toHaveValue('2048');
});

test('cancelled generation emits no ZIP and permits retry; job keeps its initial size', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  const downloads = [];
  page.on('download', d => downloads.push(d));
  await page.evaluate(() => {
    window.originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (...args) { setTimeout(() => window.originalToBlob.apply(this, args), 150); };
  });
  await page.locator('#pack-resolution').selectOption('128');
  await page.locator('#pack-grid [data-pack-download="coffee-break"]').click();
  await expect(page.locator('#pack-progress')).toBeVisible();
  await expect(page.locator('#pack-progress')).toBeInViewport();
  await expect(page.locator('#cancel-pack')).toBeFocused();
  await expect(page.locator('#pack-grid [data-pack-download="code-review"]')).toBeDisabled();
  await page.locator('#cancel-pack').click();
  await expect(page.locator('#toast')).toHaveText('パックの作成をキャンセルしました。');
  await expect(page.locator('#pack-grid [data-pack-download="coffee-break"]')).toBeFocused();
  await expect(page.locator('#pack-grid [data-pack-download="coffee-break"]')).toBeInViewport();
  expect(downloads).toHaveLength(0);
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.originalToBlob; });
  const pending = page.waitForEvent('download');
  await page.locator('#pack-grid [data-pack-download="standard"]').click();
  await page.locator('#pack-resolution').selectOption('512');
  const download = await pending;
  expect(download.suggestedFilename()).toBe('stampdock-standard-128px.zip');
  expect(downloads).toHaveLength(1);
  await expect(page.locator('#pack-grid [data-pack-download="standard"]')).toBeEnabled();
});

test('generation errors restore controls for retry', async ({ page }) => {
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = function (callback) { callback(null); }; });
  await page.locator('#pack-grid [data-pack-download="standard"]').click();
  await expect(page.locator('#toast')).toContainText('パックを作成できませんでした');
  await expect(page.locator('#pack-progress')).toBeHidden();
  await expect(page.locator('#pack-grid [data-pack-download="standard"]')).toBeEnabled();
});

test('pack layout and detail fit desktop and mobile widths', async ({ page }) => {
  await mkdir('docs', { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'docs/packs-desktop.png', fullPage: true });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 390) await page.screenshot({ path: 'docs/packs-mobile.png', fullPage: true });
    await page.locator('[data-pack-detail="standard"]').first().click();
    expect(await page.locator('#pack-dialog').evaluate(dialog => dialog.scrollWidth <= dialog.clientWidth)).toBe(true);
    await page.keyboard.press('Escape');
  }
});

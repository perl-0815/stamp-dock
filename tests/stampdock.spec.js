import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

test.beforeEach(async ({ page }) => { await page.goto('/'); await expect(page.locator('.stamp-card')).toHaveCount(24); });

test('128 templates, categories, normalized search, empty state, and pagination', async ({ page }) => {
  await expect(page.locator('#total-count')).toHaveText('128');
  await page.locator('#load-more').click();
  await expect(page.locator('.stamp-card')).toHaveCount(48);
  await page.locator('#search').fill('ｌｇｔｍ');
  await expect(page.locator('.card-name')).toHaveText(['LGTM']);
  await page.locator('#search').fill('解決');
  await expect(page.locator('.card-name')).toHaveText(['解決済み']);
  await page.locator('#search').fill('zz-no-stamp-zz');
  await expect(page.locator('#empty-state')).toBeVisible();
  await page.locator('#empty-action').click();
  await page.locator('[data-filter="dev"]').click();
  await expect(page.locator('.stamp-card')).toHaveCount(21);
  await expect(page.locator('.card-category')).toHaveText(Array(21).fill('開発・運用'));
});

test('favorites persist and can be removed from their collection', async ({ page }) => {
  await page.locator('[data-favorite="lgtm"]').click();
  await expect(page.locator('[data-favorite="lgtm"]')).toHaveAttribute('aria-pressed', 'true');
  await page.reload();
  await page.locator('[data-filter="favorites"]').click();
  await expect(page.locator('.card-name')).toHaveText(['LGTM']);
  await page.locator('[data-favorite="lgtm"]').click();
  await expect(page.locator('#empty-title')).toHaveText('まだお気に入りがありません');
});

test('actual card download honors selected PNG dimensions and transparency', async ({ page }) => {
  await page.locator('#library-resolution').selectOption('1024');
  const pending = page.waitForEvent('download');
  await page.locator('[data-download="lgtm"]').click();
  const download = await pending;
  expect(download.suggestedFilename()).toMatch(/1024px\.png$/);
  const file = await download.path();
  const bytes = await (await import('node:fs/promises')).readFile(file);
  expect(bytes.readUInt32BE(16)).toBe(1024);
  expect(bytes.readUInt32BE(20)).toBe(1024);
  expect(bytes.subarray(1, 4).toString()).toBe('PNG');
});

test('all PNG sizes, alpha, backgrounds, and renderer limits', async ({ page }) => {
  const report = await page.evaluate(async () => {
    const { createStampBlob, renderStamp } = await import('/assets/render.js');
    const { TEMPLATES, STYLES } = await import('/assets/templates.js');
    const sizes = [];
    for (const size of [128, 256, 512, 1024, 2048]) {
      const image = await createImageBitmap(await createStampBlob(TEMPLATES[0], size));
      sizes.push([image.width, image.height]); image.close();
    }
    const canvas = document.createElement('canvas');
    await renderStamp(canvas, TEMPLATES[0], 128);
    const alpha = canvas.getContext('2d').getImageData(0, 0, 1, 1).data[3];
    await renderStamp(canvas, { ...TEMPLATES[0], background: 'white' }, 128);
    const white = [...canvas.getContext('2d').getImageData(0, 0, 1, 1).data];
    const clipped = [];
    for (const style of STYLES) {
      await renderStamp(canvas, { text: '長いスタンプの文言も確認します ABCDEFGHIJKLMNOPQRST', subtext: 'LONG SUBTEXT FOR CHECKING SAFE IMAGE PADDING', style: style.id, color: '#39775b', rotation: 12, textScale: 1.3 }, 256);
      const data = canvas.getContext('2d').getImageData(0, 0, 256, 256).data;
      for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) if ((x < 2 || y < 2 || x > 253 || y > 253) && data[(y * 256 + x) * 4 + 3]) { clipped.push(style.id); y = 256; break; }
    }
    return { sizes, alpha, white, clipped };
  });
  expect(report.sizes).toEqual([128, 256, 512, 1024, 2048].map(s => [s, s]));
  expect(report.alpha).toBe(0);
  expect(report.white).toEqual([255, 255, 255, 255]);
  expect(report.clipped).toEqual([]);
});

test('editing a template preserves its image before any changes', async ({ page }) => {
  for (const id of ['lgtm', 'resolved', 'thanks', 'approved', 'wip', 'good-work', 'read-later', 'ship-it']) {
    await page.locator('[data-nav="library"]').click();
    await page.locator(`[data-detail="${id}"]`).click();
    await expect(page.locator('#stamp-dialog')).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect.poll(() => page.locator('#detail-canvas').evaluate(c => { const ctx = c.getContext('2d'); return ctx.getImageData(0, 0, c.width, c.height).data.some((v, i) => i % 4 === 3 && v > 0); })).toBe(true);
    const detail = await page.locator('#detail-canvas').evaluate(c => c.toDataURL());
    await page.locator('#detail-edit').click();
    await expect.poll(() => page.locator('#editor-canvas').evaluate(c => c.toDataURL())).toBe(detail);
  }
});

test('custom editing, persistence, update, and deletion', async ({ page }) => {
  await page.locator('[data-nav="editor"]').click();
  await page.locator('#stamp-text').fill('動作確認済み');
  await page.locator('#stamp-subtext').fill('ALL CHECKS PASSED');
  await page.locator('[data-style="circle"]').click();
  await page.locator('[data-color="#547fc4"]').click();
  await page.locator('#font-select').selectOption('sans');
  await page.locator('#background-select').selectOption('white');
  await page.locator('#rotation').fill('8');
  await page.locator('#save-custom').click();
  await expect(page.locator('#toast')).toContainText('保存しました');
  await page.reload();
  await page.locator('[data-filter="mine"]').click();
  await expect(page.locator('.card-name')).toHaveText(['動作確認済み']);
  await page.locator('.card-preview').click();
  await page.locator('#detail-edit').click();
  await expect(page.locator('#font-select')).toHaveValue('sans');
  await expect(page.locator('#background-select')).toHaveValue('white');
  await expect(page.locator('#rotation')).toHaveValue('8');
  await page.locator('#stamp-text').fill('確認完了');
  await page.locator('#save-custom').click();
  await page.locator('[data-filter="mine"]').click();
  await expect(page.locator('.card-name')).toHaveText(['確認完了']);
  await page.locator('.card-preview').click();
  await page.locator('#delete-custom').click();
  await expect(page.locator('#empty-title')).toHaveText('まだマイスタンプがありません');
});

test('empty text blocks export and save; keyboard shortcut and dialog escape work', async ({ page }) => {
  await page.locator('[data-filter="review"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-filter="review"]')).toBeFocused();
  await page.keyboard.press('/');
  await expect(page.locator('#search')).toBeFocused();
  await page.locator('[data-detail="lgtm"]').click();
  await page.keyboard.press('Escape');
  await expect(page.locator('#stamp-dialog')).not.toBeVisible();
  await expect(page.locator('[data-detail="lgtm"]')).toBeFocused();
  await page.locator('[data-nav="editor"]').click();
  await page.locator('#stamp-text').fill('   ');
  await expect(page.locator('#editor-download')).toBeDisabled();
  await expect(page.locator('#save-custom')).toBeDisabled();
  await expect(page.locator('#preview-empty')).toBeVisible();
});

test('corrupt storage does not break templates', async ({ page }) => {
  await page.evaluate(() => { localStorage.setItem('stampdock-custom-v1', '{invalid'); localStorage.setItem('stampdock-favorites-v1', '{}'); });
  await page.reload();
  await expect(page.locator('.stamp-card')).toHaveCount(24);
  await expect(page.locator('#toast')).toContainText('読み込めません');
});

test('responsive layouts and screenshot artifacts', async ({ page }) => {
  await mkdir('docs', { recursive: true });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'docs/desktop.png', fullPage: false });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('[data-nav="editor"]').click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.locator('#editor-download')).toBeVisible();
    if (width === 390) await page.screenshot({ path: 'docs/mobile-editor.png', fullPage: true });
    await page.locator('[data-nav="library"]').click();
    if (width === 390) await page.screenshot({ path: 'docs/mobile.png', fullPage: false });
  }
});

test('no uncaught errors or missing local assets during primary flows', async ({ page }) => {
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.reload();
  await page.locator('[data-nav="editor"]').click();
  await page.locator('#stamp-text').fill('検証ありがとうございます！');
  await page.locator('[data-style="hand"]').click();
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.locator('#editor-canvas').evaluate(c => c.width)).toBe(640);
  expect(errors).toEqual([]);
});

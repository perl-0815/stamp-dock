import { test, expect } from '@playwright/test';

test('Next.js renders the initial library and metadata without the legacy DOM script', async ({ request }) => {
  const response = await request.get('/');
  expect(response.ok()).toBe(true);
  const html = await response.text();
  expect(html).toContain('/_next/static/');
  expect(html).toContain('STAMPDOCK — エンジニアのスタンプ工房');
  expect(html).toContain('スタンプを見つける');
  expect(html).toContain('data-detail="lgtm"');
  expect(html).not.toContain('/assets/app.js');
  expect((await request.get('/assets/app.js')).status()).toBe(404);
});

test('saved v1 favorites and custom stamps survive the Next.js migration', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('stampdock-custom-v1')) return;
    localStorage.setItem('stampdock-custom-v1', JSON.stringify([{
      id: 'custom-before-next', name: '移行前のスタンプ', text: '移行前のスタンプ', subtext: 'SAVED BEFORE NEXT.JS',
      category: 'custom', tags: [], style: 'badge', color: '#547fc4', font: 'mono',
      rotation: 9, textScale: 1.15, background: 'color', backgroundColor: '#e0f3e1',
    }]));
    localStorage.setItem('stampdock-favorites-v1', JSON.stringify(['lgtm', 'custom-before-next']));
  });
  await page.goto('/');
  await expect(page.locator('#main-content')).toHaveAttribute('data-ready', 'true');
  await page.locator('[data-filter="favorites"]').click();
  await expect(page.locator('.card-name')).toHaveText(['LGTM', '移行前のスタンプ']);
  await page.locator('[data-detail="custom-before-next"]').click();
  await page.locator('#detail-edit').click();
  await expect(page.locator('#stamp-text')).toHaveValue('移行前のスタンプ');
  await expect(page.locator('#stamp-subtext')).toHaveValue('SAVED BEFORE NEXT.JS');
  await expect(page.locator('[data-style="badge"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#font-select')).toHaveValue('mono');
  await expect(page.locator('#rotation')).toHaveValue('9');
  await expect(page.locator('#text-scale')).toHaveValue('115');
  await expect(page.locator('#background-select')).toHaveValue('color');
  await expect(page.locator('#background-color')).toHaveValue('#e0f3e1');
  await page.locator('#stamp-text').fill('移行後に更新');
  await page.locator('#save-custom').click();
  await page.reload();
  await expect(page.locator('#main-content')).toHaveAttribute('data-ready', 'true');
  await page.locator('[data-filter="mine"]').click();
  await expect(page.locator('.card-name')).toHaveText(['移行後に更新']);
  await page.locator('[data-filter="favorites"]').click();
  await expect(page.locator('.card-name')).toHaveText(['LGTM', '移行後に更新']);
});

test('React keeps an unsaved editor draft across navigation and exports its latest render', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('#main-content')).toHaveAttribute('data-ready', 'true');
  await page.locator('[data-nav="editor"]').click();
  await page.locator('#stamp-text').fill('確認しました');
  await page.locator('[data-style="badge"]').click();
  await page.locator('#stamp-text').fill('次の変更も');
  await page.locator('[data-style="impact"]').click();
  await page.locator('#stamp-text').fill('最後の表示');
  await page.locator('#stamp-subtext').fill('LATEST PREVIEW');
  await page.locator('[data-filter="packs"]').click();
  await page.locator('[data-nav="editor"]').click();
  await expect(page.locator('#stamp-text')).toHaveValue('最後の表示');
  await expect(page.locator('[data-style="impact"]')).toHaveAttribute('aria-pressed', 'true');
  const expected = await page.evaluate(async () => {
    const { renderStamp } = await import('/assets/render.js');
    const canvas = document.createElement('canvas');
    await renderStamp(canvas, { text: '最後の表示', subtext: 'LATEST PREVIEW', style: 'impact', color: '#39775b',
      rotation: -5, font: 'rounded', background: 'transparent', backgroundColor: '#f5eee3', textScale: 1 }, 640);
    return canvas.toDataURL();
  });
  await expect.poll(() => page.locator('#editor-canvas').evaluate(canvas => canvas.toDataURL())).toBe(expected);
  const pending = page.waitForEvent('download');
  await page.locator('#editor-download').click();
  expect((await pending).suggestedFilename()).toContain('最後の表示-512px.png');
  expect(errors).toEqual([]);
});

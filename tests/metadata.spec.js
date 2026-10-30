import { test, expect } from '@playwright/test';

const origin = 'https://stamp-dock.kozyutu.work';

test('shared links include absolute Open Graph and large-image Twitter metadata in initial HTML', async ({ page }) => {
  await page.goto('/');
  expect(new URL(await page.locator('head link[rel="canonical"]').getAttribute('href')).href).toBe(origin + '/');
  const og = page.locator('head meta[property="og:image"]');
  await expect(og).toHaveAttribute('content', origin + '/og-image.png');
  await expect(page.locator('head meta[property="og:image:width"]')).toHaveAttribute('content', '1200');
  await expect(page.locator('head meta[property="og:image:height"]')).toHaveAttribute('content', '630');
  await expect(page.locator('head meta[property="og:image:alt"]')).toHaveAttribute('content', /LGTM.*解決済み/);
  await expect(page.locator('head meta[property="og:locale"]')).toHaveAttribute('content', 'ja_JP');
  expect(new URL(await page.locator('head meta[property="og:url"]').getAttribute('content')).href).toBe(origin + '/');
  await expect(page.locator('head meta[name="twitter:card"]')).toHaveAttribute('content', 'summary_large_image');
  await expect(page.locator('head meta[name="twitter:image"]')).toHaveAttribute('content', origin + '/og-image.png');
  await expect(page.locator('head meta[name="twitter:image:alt"]')).toHaveAttribute('content', /STAMPDOCK/);
});

test('preview PNG and all favicon variants are real static images with the declared size and MIME', async ({ page, request }) => {
  await page.goto('/');
  const image = await request.get('/og-image.png');
  expect(image.ok()).toBe(true);
  expect(image.headers()['content-type']).toContain('image/png');
  const png = await image.body();
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  expect(png.length).toBeLessThan(5 * 1024 * 1024);

  const icoLink = page.locator('head link[rel="icon"][href^="/favicon.ico"]');
  const svgLink = page.locator('head link[rel="icon"][type="image/svg+xml"]');
  const appleLink = page.locator('head link[rel="apple-touch-icon"]');
  await expect(icoLink).toHaveCount(1);
  await expect(svgLink).toHaveCount(1);
  await expect(appleLink).toHaveAttribute('sizes', '180x180');
  const ico = await request.get(await icoLink.getAttribute('href'));
  expect(ico.ok()).toBe(true);
  expect(ico.headers()['content-type']).toMatch(/image\/(x-icon|vnd\.microsoft\.icon)/);
  const bytes = await ico.body();
  expect(bytes.readUInt16LE(0)).toBe(0);
  expect(bytes.readUInt16LE(2)).toBe(1);
  expect(bytes.readUInt16LE(4)).toBe(3);
  expect([bytes[6], bytes[22], bytes[38]]).toEqual([16, 32, 48]);
  const svg = await request.get(await svgLink.getAttribute('href'));
  expect(svg.ok()).toBe(true);
  expect(svg.headers()['content-type']).toContain('image/svg+xml');
  expect(await svg.text()).toContain('<svg');
  const apple = await request.get(await appleLink.getAttribute('href'));
  expect(apple.ok()).toBe(true);
  expect(apple.headers()['content-type']).toContain('image/png');
  const applePng = await apple.body();
  expect(applePng.readUInt32BE(16)).toBe(180);
  expect(applePng.readUInt32BE(20)).toBe(180);
});

test('preview metadata is readable without JavaScript, as it is by link crawlers', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('http://127.0.0.1:5217/');
    await expect(page.locator('head meta[property="og:title"]')).toHaveAttribute('content', 'STAMPDOCK — エンジニアのスタンプ工房');
    await expect(page.locator('head meta[property="og:image"]')).toHaveAttribute('content', origin + '/og-image.png');
  } finally { await context.close(); }
});

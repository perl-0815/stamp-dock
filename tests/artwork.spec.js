import { test, expect } from '@playwright/test';

test('badge and impact keep text clear of outlines and decorations', async ({ page }) => {
  await page.goto('/');
  const failures = await page.evaluate(async () => {
    const { renderStamp } = await import('/assets/render.js');
    const cases = [
      { text: 'APPROVED', subtext: 'REVIEW COMPLETE' },
      { text: 'レビュー\nお願いします', subtext: 'READY FOR REVIEW' },
      { text: 'とても長い日本語のスタンプでも読みやすく整える', subtext: 'LONG JAPANESE SUBTITLE AND CAPTION' },
      { text: 'A' + '\n'.repeat(38) + 'B', subtext: 'BOTTOM CAPTION' },
    ];
    const proto = CanvasRenderingContext2D.prototype;
    const fill = proto.fill, fillText = proto.fillText;
    let omitBackgroundFill = false, inkLayer = null;
    const failures = [];
    // Rasterize text and foreground geometry separately to catch collisions
    // without baking coordinates or a particular seal shape into the test.
    proto.fill = function (...args) { if (!omitBackgroundFill || this.globalAlpha >= .5) return fill.apply(this, args); };
    proto.fillText = function (...args) {
      if (inkLayer && this.canvas !== inkLayer.canvas) {
        inkLayer.save(); inkLayer.setTransform(this.getTransform());
        inkLayer.font = this.font; inkLayer.textAlign = this.textAlign; inkLayer.textBaseline = this.textBaseline;
        fillText.apply(inkLayer, args); inkLayer.restore();
      }
      return fillText.apply(this, args);
    };
    try {
      for (const style of ['badge', 'impact']) for (const rotation of [-12, 0, 12]) {
        const geometry = document.createElement('canvas');
        omitBackgroundFill = true;
        await renderStamp(geometry, { style, rotation, text: '', subtext: '', color: '#39775b' }, 256);
        omitBackgroundFill = false;
        const outline = geometry.getContext('2d').getImageData(0, 0, 256, 256).data;
        for (const config of cases) for (const font of ['sans', 'rounded']) {
          const image = document.createElement('canvas'), text = document.createElement('canvas');
          text.width = text.height = 256;
          inkLayer = text.getContext('2d');
          await renderStamp(image, { ...config, style, rotation, font, color: '#39775b', textScale: 1.3 }, 256);
          inkLayer = null;
          const pixels = image.getContext('2d').getImageData(0, 0, 256, 256).data;
          const ink = text.getContext('2d').getImageData(0, 0, 256, 256).data;
          let collisions = 0, clipped = 0, visible = 0;
          for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
            const alpha = (y * 256 + x) * 4 + 3;
            if (ink[alpha] > 64) { visible++; if (outline[alpha] > 64) collisions++; }
            if ((x < 2 || y < 2 || x > 253 || y > 253) && pixels[alpha] > 8) clipped++;
          }
          if (collisions || clipped || !visible) failures.push({ style, rotation, font, text: config.text, collisions, clipped, visible });
        }
      }
    } finally { proto.fill = fill; proto.fillText = fillText; }
    return failures;
  });
  expect(failures).toEqual([]);
});

import { test, expect } from '@playwright/test';

const slugs = ['business-professional-skills', 'technology-innovation', 'arts-design-media',
  'wellbeing', 'lifestyle', 'education-academics', 'family-relationships', 'languages', 'soft-skills'];
const names = ['Business & Professional Skills', 'Technology & Innovation', 'Arts, Design & Media',
  'Wellbeing', 'Lifestyle', 'Education & Academics', 'Family & Relationships', 'Languages', 'Soft Skills'];
const arabicNames = ['الأعمال والمهارات المهنية', 'التكنولوجيا والابتكار', 'الفنون والتصميم والإعلام',
  'الصحة والعافية', 'أسلوب الحياة', 'التعليم والأكاديميات', 'العائلة والعلاقات', 'اللغات', 'المهارات الشخصية'];

for (const [language, width] of [['en', 1024], ['ar', 1024], ['en', 1280], ['ar', 1366], ['en', 1440], ['ar', 1920], ['en', 2560], ['ar', 768], ['en', 390], ['ar', 320]] as const) {
  test(`isometric categories: ${language}, ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1050 });
    await page.addInitScript((language) => {
      localStorage.setItem('tamkeenova-lang', language);
      localStorage.setItem('tamkeenova-theme', 'light');
    }, language);
    await page.route(/^https:\/\//, (route) => route.abort());
    await page.route('**/api/**', (route) => route.fulfill({ json: {
      data: new URL(route.request().url()).pathname.endsWith('/courses/categories')
        ? slugs.map((slug, index) => ({ id: slug, slug, name_en: names[index], name_ar: arabicNames[index], courses_count: 9 + index }))
        : [],
      meta: { total: 0, total_pages: 0, page: 1 },
    } }));
    await page.goto('/programs');

    expect(await page.locator('.category-section').evaluate(el => {
      const r = el.getBoundingClientRect();
      return Math.abs(r.left) < 1 && Math.abs(r.right - document.documentElement.clientWidth) < 1;
    })).toBe(true);
    const cards = page.locator('button.category-tile');
    await expect(cards).toHaveCount(9);
    if (width >= 1024) {
      const expectedColumns = width >= 1200 ? 5 : 4;
      const expectedCardWidth = Math.min(width / expectedColumns * .82, 300);
      expect((await cards.first().boundingBox())!.width).toBeGreaterThan(expectedCardWidth - 4);
    }
    await expect(page.locator('.sculpture-polish')).toHaveCount(9);
    await expect(cards.first()).toHaveAttribute('data-category', slugs[0]);
    await expect(cards.nth(4)).toHaveAttribute('data-category', 'education-academics');
    await expect(page.locator('.category-icon-badge svg').first()).toBeVisible();
    expect(await page.locator('.category-arrow svg').first().evaluate((el) => getComputedStyle(el).scale))
      .toBe(language === 'en' ? '1' : '-1 1');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    await expect(page.locator('.category-controls, .category-nav')).toHaveCount(0);

    const silhouettes = await page.locator('.sculpture-rim').evaluateAll((paths) => paths.map(p => p.getAttribute('d')));
    expect(new Set(silhouettes).size).toBe(6);
    await expect(page.locator('.category-setting')).toHaveCount(9);
    await expect(page.locator('.sculpture-reflection')).toHaveCount(9);

    const settings = await page.locator('.category-setting').evaluateAll((els) => els.map(el => {
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    }));
    for (let i = 0; i < settings.length; i++) {
      expect(settings[i].left).toBeGreaterThanOrEqual(0);
      expect(settings[i].right).toBeLessThanOrEqual(width);
      for (let j = i + 1; j < settings.length; j++) {
        const a = settings[i], b = settings[j];
        expect(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1).toBe(true);
      }
    }
    if (width >= 1024) {
      const first = cards.first();
      await first.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      const setting = first.locator('.category-setting');
      const sculpture = first.locator('.category-sculpture');
      const neon = first.locator('.sculpture-neon');
      const orbit = first.locator('.neon-core');
      const floorBefore = (await setting.boundingBox())!;
      const bodyBefore = (await sculpture.boundingBox())!;
      await first.locator('.category-name').hover();
      await expect.poll(async () => (await sculpture.boundingBox())!.width).toBeGreaterThan(bodyBefore.width * 1.03);
      await expect.poll(() => neon.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
      const floorAfter = (await setting.boundingBox())!;
      expect(floorAfter.x).toBeCloseTo(floorBefore.x, 1);
      expect(floorAfter.y).toBeCloseTo(floorBefore.y, 1);
      expect(floorAfter.width).toBeCloseTo(floorBefore.width, 1);
      expect(floorAfter.height).toBeCloseTo(floorBefore.height, 1);
      expect((await sculpture.boundingBox())!.y).toBeLessThan(bodyBefore.y - 5);

      await expect.poll(() => first.evaluate(card =>
        getComputedStyle(card.querySelector('.category-foreground')!).transform ===
        getComputedStyle(card.querySelector('.category-sculpture')!).transform,
      )).toBe(true);
      expect(await orbit.evaluate(el => getComputedStyle(el).animationPlayState)).toBe('running');
      const dashBefore = await orbit.evaluate(el => getComputedStyle(el).strokeDashoffset);
      await expect.poll(() => orbit.evaluate(el => getComputedStyle(el).strokeDashoffset)).not.toBe(dashBefore);
      expect(await orbit.getAttribute('d')).toBe(await first.locator('.sculpture-rim').getAttribute('d'));
      expect(await cards.nth(1).locator('.sculpture-neon').evaluate(el => getComputedStyle(el).opacity)).toBe('0');
      if (width === 1440) {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await expect.poll(() => sculpture.evaluate(el => getComputedStyle(el).transform)).toBe('none');
        expect(await orbit.evaluate(el => getComputedStyle(el).animationName)).toBe('none');
        expect(await orbit.evaluate(el => getComputedStyle(el).strokeDasharray)).toBe('none');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
      }
      await page.mouse.move(0, 0);
      await expect.poll(() => neon.evaluate(el => getComputedStyle(el).opacity)).toBe('0');
      expect(await orbit.evaluate(el => getComputedStyle(el).animationPlayState)).toBe('paused');
      await expect.poll(() => sculpture.evaluate(el => getComputedStyle(el).transform)).toBe('none');

      await first.focus();
      await expect.poll(() => neon.evaluate(el => getComputedStyle(el).opacity)).toBe('1');
      expect((await setting.boundingBox())!.y).toBeCloseTo(floorBefore.y, 1);
      await first.evaluate(el => (el as HTMLElement).blur());
    }

    for (let index = 0; index < 9; index++) {
      const arrow = cards.nth(index).locator('.category-arrow');
      expect(await cards.nth(index).evaluate((card) => {
        const a = card.querySelector('.category-arrow')!.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(card.querySelector('.category-name')!);
        return Array.from(range.getClientRects()).every(r => r.right <= a.left || a.right <= r.left || r.bottom <= a.top || a.bottom <= r.top);
      })).toBe(true);


      await cards.nth(index).focus();
      await expect.poll(() => arrow.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('.category-tile') === el.closest('.category-tile');
      })).toBe(true);
    }
    const ids = await page.locator('app-category-artwork [id]').evaluateAll((els) => els.map(el => el.id));
    expect(new Set(ids).size).toBe(ids.length);
    await cards.last().click();
    await expect(page.locator('#selected-category-heading')).toHaveText(language === 'en' ? names[8] : arabicNames[8]);
    await expect(page.locator('.category-detail-hero')).toBeVisible();
    const back = page.locator('.category-back-button .arrow-back');
    await expect(back).toHaveText('←');
    await expect(back).toHaveCSS('scale', language === 'ar' ? '-1 1' : '1');
    await expect(back).toHaveCSS('transform', 'none');
  });
}

import { test, expect } from '@playwright/test';

const slugs = ['business-professional-skills', 'technology-innovation', 'arts-design-media',
  'wellbeing', 'lifestyle', 'education-academics', 'family-relationships', 'languages', 'soft-skills'];
const names = ['Business & Professional Skills', 'Technology & Innovation', 'Arts, Design & Media',
  'Wellbeing', 'Lifestyle', 'Education & Academics', 'Family & Relationships', 'Languages', 'Soft Skills'];
const arabicNames = ['الأعمال والمهارات المهنية', 'التكنولوجيا والابتكار', 'الفنون والتصميم والإعلام',
  'الصحة والعافية', 'أسلوب الحياة', 'التعليم والأكاديميات', 'العائلة والعلاقات', 'اللغات', 'المهارات الشخصية'];

for (const [language, width] of [['en', 1568], ['ar', 1440], ['en', 390], ['ar', 320]] as const) {
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
    const cards = page.locator('button.category-tile');
    await expect(cards).toHaveCount(6);
    await expect(cards.first()).toHaveAttribute('data-category', slugs[0]);
    await expect(cards.nth(4)).toHaveAttribute('data-category', 'education-academics');
    await expect(page.locator('.category-icon-badge svg').first()).toBeVisible();
    expect(await page.locator('.category-arrow svg').first().evaluate((el) => getComputedStyle(el).transform))
      .toBe(language === 'en' ? 'none' : 'matrix(-1, 0, 0, 1, 0, 0)');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Both navigation directions work without removing any API categories.
    // Each category is a separate clipped-photo sculpture on its own small setting.
    const silhouettes = await page.locator('.sculpture-rim').evaluateAll((paths) => paths.map(p => p.getAttribute('d')));
    expect(new Set(silhouettes).size).toBe(6);
    await expect(page.locator('.category-setting')).toHaveCount(6);
    await expect(page.locator('.sculpture-reflection')).toHaveCount(6);
    // The stagger must not hide the top-row action behind a lower-row image.
    for (let index = 0; index < 6; index++) {
      const arrow = cards.nth(index).locator('.category-arrow');
      await arrow.scrollIntoViewIfNeeded();
      expect(await arrow.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest('.category-tile') === el.closest('.category-tile');
      })).toBe(true);
    }
    const nav = page.locator('.category-nav');
    await nav.nth(1).click();
    await expect(cards.first()).toHaveAttribute('data-category', 'wellbeing');
    await nav.nth(0).click();
    await expect(cards.first()).toHaveAttribute('data-category', slugs[0]);
    await page.locator('.category-controls .text-link').click();
    await expect(cards).toHaveCount(9);
    const ids = await page.locator('app-category-artwork [id]').evaluateAll((els) => els.map(el => el.id));
    expect(new Set(ids).size).toBe(ids.length);
    await expect(page.locator('.category-grid')).toHaveClass(/is-expanded/);
    await cards.last().click();
    await expect(page.locator('#selected-category-heading')).toHaveText(language === 'en' ? names[8] : arabicNames[8]);
    await expect(page.locator('.category-detail-hero')).toBeVisible();
  });
}

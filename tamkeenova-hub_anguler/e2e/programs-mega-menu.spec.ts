import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const demos = JSON.parse(readFileSync(join(process.cwd(), '../tamkeenova-api/prisma/demo-catalog/courses.json'), 'utf8'));
const names = [
  ['business-professional-skills', 'Business & Professional Skills', 'المهارات المهنية والأعمال'],
  ['technology-innovation', 'Technology & Innovation', 'التكنولوجيا والابتكار'],
  ['arts-design-media', 'Arts, Design & Media', 'الفنون والتصميم والإعلام'],
  ['wellbeing', 'Wellbeing', 'الصحة النفسية والجسدية'],
  ['lifestyle', 'Lifestyle', 'أسلوب الحياة'],
  ['education-academics', 'Education & Academics', 'التعليم والدراسات الأكاديمية'],
  ['family-relationships', 'Family & Relationships', 'الأسرة والعلاقات'],
  ['languages', 'Languages', 'اللغات'],
  ['soft-skills', 'Soft Skills', 'المهارات الشخصية'],
];
const categories = names.map(([slug, name_en, name_ar]) => ({ id: slug, slug, name_en, name_ar, image_url: `/assets/course-categories/${slug}.jpg`, courses_count: 3 }));
for (const [language, width, theme] of [['en', 1440, 'light'], ['ar', 1280, 'light'], ['en', 390, 'light'], ['ar', 320, 'light'], ['ar', 1440, 'dark']] as const) {
  test(`Programs menu: ${language}, ${width}px, ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(({language,theme}) => {
      localStorage.setItem('tamkeenova-lang',language); localStorage.setItem('tamkeenova-theme',theme);
    }, {language,theme});
    await page.route(/^https:\/\//, route => route.abort());
    const queries: string[] = [];
    await page.route('**/api/**', route => {
      const url = new URL(route.request().url());
      let data: unknown = [];
      if (url.pathname.endsWith('/courses/categories')) data = categories;
      else if (url.pathname.endsWith('/courses')) {
        queries.push(url.search);
        data = demos.filter((c: any) => !url.searchParams.get('category') || c.category === url.searchParams.get('category')).map((c: any) => ({
          id: `${c.category}-${c.position}`, slug: `demo-catalog-v1-${c.category}-${c.position}`,
          title_en: c.title_en, title_ar: c.title_ar, cover_image_url: c.cover, duration_minutes: c.duration_minutes,
          language: 'ar', is_free: true, average_rating: 0, ratings_count: 0,
        }));
      }
      return route.fulfill({json:{data, meta:{page:1,total:3,total_pages:1}}});
    });
    await page.goto('/login');
    if (width > 1040) await page.locator('#programs-menu-trigger').click();
    else {
      await page.locator('.menu-toggle').click();
      await page.locator('.mobile-programs-link').click();
    }
    const panel = page.locator('.programs-mega');
    await expect(panel).toBeVisible();
    await expect(panel.locator('.mega-category')).toHaveCount(9);
    await expect(panel.locator('.mega-course')).toHaveCount(3);
    await expect(panel.locator('.mega-rating')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath('programs-menu.png'), animations: 'disabled' });
    await panel.locator('.mega-tabs button').nth(1).click();
    await expect.poll(() => queries.some(q => q.includes('sort=newest'))).toBe(true);
    await panel.locator('.mega-category').nth(1).click();
    await expect(panel.locator('.mega-category').nth(1)).toHaveAttribute('aria-pressed','true');
    await expect(panel.locator('.mega-course').first()).toContainText(language === 'en' ? 'Python' : 'بايثون');
    await panel.locator('.mega-heading > a').click();
    await expect(page).toHaveURL(/\/programs\?category=technology-innovation/);
    await expect(page.locator('#selected-category-heading')).toHaveText(language === 'en' ? names[1][1] : names[1][2]);
    await expect(panel).toHaveCount(0);
    if (width > 1040) {
      // Keyboard and Escape preserve an accessible, predictable focus target.
      await page.locator('#programs-menu-trigger').focus();
      await page.keyboard.press('ArrowDown');
      await expect(panel).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(panel).toHaveCount(0);
      await expect(page.locator('#programs-menu-trigger')).toBeFocused();
      await page.locator('#programs-menu-trigger').hover();
      await expect(panel).toBeVisible();
      await page.mouse.click(width - 5, 950);
      await expect(panel).toHaveCount(0);
    }
  });
}

test('Programs menu distinguishes a failed category request from an empty catalog and retries', async ({page}) => {
  await page.addInitScript(() => localStorage.setItem('tamkeenova-lang', 'en'));
  let failed = true;
  await page.route(/^https:\/\//, route => route.abort());
  await page.route('**/api/**', route => {
    if (new URL(route.request().url()).pathname.endsWith('/courses/categories') && failed) return route.fulfill({status:503,json:{message:'offline'}});
    return route.fulfill({json:{data:[]}});
  });
  await page.goto('/login');
  await page.locator('#programs-menu-trigger').click();
  await expect(page.locator('.mega-rail')).toContainText('could not load');
  failed = false;
  await page.locator('.mega-rail .mega-retry').click();
  await expect(page.locator('.mega-rail')).toContainText('No categories');
});

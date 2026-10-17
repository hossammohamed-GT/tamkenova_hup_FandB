import { test, expect, Page } from '@playwright/test';

const family = 'Noto Kufi Arabic';
const arabic = 'التعلّم وتطوير المهارات';
const category = {
  id: '11111111-1111-4111-a111-111111111111',
  slug: 'soft-skills',
  name_ar: arabic,
  name_en: 'Soft skills',
  is_active: true,
  parent_id: null,
  display_order: 0,
  image_url: '/assets/course-categories/soft-skills.jpg',
  _count: { children: 0, course_links: 0, learning_programs: 0 },
  children: [],
};

async function setup(page: Page, role = '', language = 'ar') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(
    ({ role, language }) => {
      localStorage.setItem('tamkeenova-lang', language);
      localStorage.setItem('tamkeenova-theme', 'light');
      if (role) {
        localStorage.setItem('token', 'test-only');
        localStorage.setItem(
          'user',
          JSON.stringify({ id: 'user', role, full_name: 'مستخدم الاختبار' }),
        );
      }
    },
    { role, language },
  );
  // Font files must work without any third-party font/CDN being reachable.
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.route('**/api/**', (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api', '');
    let data: unknown = [];
    if (path === '/auth/me')
      data = {
        id: 'user',
        role,
        full_name: 'مستخدم الاختبار',
        email_verified: true,
        is_active: true,
      };
    else if (path.endsWith('/application-status') || path === '/auth/me/status')
      data = { status: 'APPROVED', role };
    else if (path === '/courses/categories' || path === '/admin/course-categories')
      data = [category];
    return route.fulfill({
      json: { success: true, data, meta: { total: 0, page: 1, total_pages: 1 } },
    });
  });
}

async function expectActualArabicFont(page: Page, selector: string) {
  const element = page.locator(selector).first();
  await expect(element).toBeVisible();
  await page.evaluate(async () => {
    await document.fonts.load('400 16px "Noto Kufi Arabic"', 'التعلّم');
    await document.fonts.load('700 32px "Noto Kufi Arabic"', 'المهارات');
    await document.fonts.ready;
  });
  expect(
    await element.evaluate((el) =>
      getComputedStyle(el).fontFamily.split(',')[0].replaceAll('"', '').trim(),
    ),
  ).toBe(family);
  // Computed font-family alone can pass while the file is missing. Check the
  // font Chromium actually used to draw the glyphs, as in Rendered Fonts.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  expect(fonts.some((f) => f.familyName === family && f.isCustomFont && f.glyphCount > 0)).toBe(
    true,
  );
  await cdp.detach();
}

for (const width of [320, 1440]) {
  for (const route of ['/', '/programs', '/login', '/portal/trainer/courses', '/my-courses']) {
    test(`self-hosted Arabic font renders headings, navigation and controls: ${route}, ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await setup(
        page,
        route.includes('/trainer/') ? 'TRAINER' : route === '/my-courses' ? 'STUDENT' : '',
      );
      const fonts: number[] = [];
      page.on('response', (response) => {
        if (response.url().includes('/fonts/noto-kufi-arabic/')) fonts.push(response.status());
      });
      await page.goto(route);
      await expectActualArabicFont(page, 'h1');
      await expectActualArabicFont(page, '.brand-word-sub');
      if (route === '/login') {
        await expectActualArabicFont(page, '.field-label');
        expect(
          await page.locator('#email').evaluate((el) => getComputedStyle(el).fontFamily),
        ).toContain(family);
        expect(
          await page
            .locator('.fa-solid')
            .first()
            .evaluate((el) => getComputedStyle(el).fontFamily),
        ).not.toContain(family);
      }
      expect(fonts.length).toBeGreaterThan(0);
      expect(fonts.every((status) => status === 200)).toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      if (route === '/')
        await page.screenshot({
          path: info.outputPath(`arabic-home-${width}.png`),
          fullPage: true,
          animations: 'disabled',
        });
    });
  }
  test(`Arabic admin editor, field feedback and native confirmation inherit typography: ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await setup(page, 'ADMIN');
    await page.goto('/portal/admin/course-categories');
    await expectActualArabicFont(page, '.category-admin h1');
    await expectActualArabicFont(page, '.category-info h2');
    await page.getByRole('button', { name: 'تصنيف جديد', exact: true }).click();
    await expectActualArabicFont(page, '.editor h2');
    await page.locator('[name=name_ar]').fill(arabic);
    expect(
      await page.locator('[name=name_ar]').evaluate((el) => getComputedStyle(el).fontFamily),
    ).toContain(family);
    await page.getByRole('button', { name: 'حفظ التصنيف', exact: true }).click();
    await expect(page.locator('.field-error').first()).toBeVisible();
    await expectActualArabicFont(page, '.field-error');
    await page.screenshot({
      path: info.outputPath(`arabic-editor-${width}.png`),
      fullPage: true,
      animations: 'disabled',
    });
    await page.getByRole('button', { name: 'إلغاء', exact: true }).click();
    await page.getByRole('button', { name: 'حذف', exact: true }).click();
    await expectActualArabicFont(page, '#delete-category-title');
    await expectActualArabicFont(page, '.delete-confirm button');
  });
}

test('switching locale restores English typography; Arabic glyph fallback remains available', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/login');
  await expectActualArabicFont(page, 'h1');
  const toggle = page.locator('.navbar-actions .control-btn').first();
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(
    await page
      .locator('body')
      .evaluate((el) => getComputedStyle(el).fontFamily.split(',')[0].replaceAll('"', '').trim()),
  ).toBe('IBM Plex Sans');
  expect(
    await page
      .locator('h1')
      .evaluate((el) => getComputedStyle(el).fontFamily.split(',')[0].replaceAll('"', '').trim()),
  ).toBe('IBM Plex Sans');
  await page.evaluate((text) => {
    const p = document.createElement('p');
    p.id = 'arabic-fallback-probe';
    p.textContent = text;
    document.body.append(p);
  }, arabic);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector: '#arabic-fallback-probe',
  });
  // The probe was just inserted: wait for Chromium to lay out and paint its
  // fallback glyphs, not merely for the node to exist in the DOM.
  await expect
    .poll(async () => {
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      return fonts.some((f) => f.familyName === family && f.isCustomFont && f.glyphCount > 0);
    })
    .toBe(true);
  await cdp.detach();
  await toggle.click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expectActualArabicFont(page, 'h1');
});

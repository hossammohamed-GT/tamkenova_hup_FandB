import { test, expect, Page } from '@playwright/test';

// Browser-only design fixtures. Never seeded into the database or public catalog.
const slugs = [
  'business-professional-skills',
  'technology-innovation',
  'arts-design-media',
  'wellbeing',
  'education-academics',
  'lifestyle',
  'family-relationships',
  'languages',
  'soft-skills',
];
const en = [
  'Business & Professional Skills',
  'Technology & Innovation',
  'Arts, Design & Media',
  'Wellbeing',
  'Education & Academics',
  'Lifestyle',
  'Family & Relationships',
  'Languages',
  'Soft Skills',
];
const ar = [
  'الأعمال والمهارات المهنية',
  'التكنولوجيا والابتكار',
  'الفنون والتصميم والإعلام',
  'الصحة والعافية',
  'التعليم والأكاديميات',
  'أسلوب الحياة',
  'العائلة والعلاقات',
  'اللغات',
  'المهارات الشخصية',
];
const titles = [
  'Strategic Planning for Modern Businesses',
  'Project Management Fundamentals',
  'Financial Literacy for Professionals',
  'Leadership and Team Management',
  'Business Communication Skills',
  'Entrepreneurship Essentials',
];
const titlesAr = [
  'التخطيط الاستراتيجي للأعمال الحديثة',
  'أساسيات إدارة المشروعات',
  'الثقافة المالية للمهنيين',
  'القيادة وإدارة فرق العمل',
  'مهارات التواصل في بيئة العمل',
  'أساسيات ريادة الأعمال',
];
const categories = slugs.map((slug, i) => ({
  id: `category-${i}`,
  slug,
  name_en: en[i],
  name_ar: ar[i],
  courses_count: 1,
}));
const courses = titles.map((title, i) => ({
  id: `course-${i}`,
  slug: `test-course-${i}`,
  title_en: title,
  title_ar: titlesAr[i],
  short_description_en: 'Build practical skills with a structured course and expert-led learning.',
  short_description_ar: 'طوّر مهاراتك العملية خطوة بخطوة مع محتوى منظّم وتعلّم يقوده الخبراء.',
  cover_image_url: `/assets/course-categories/${slugs[i]}.jpg`,
  language: 'ar',
  level: i % 2 ? 'BEGINNER' : 'INTERMEDIATE',
  content_type: 'VIDEO',
  is_free: i === 3,
  price: 150,
  duration_minutes: (i + 6) * 60,
  lessons_count: 12,
  average_rating: i === 5 ? 0 : 4.8 - i / 10,
  ratings_count: i === 5 ? 0 : 21 + i,
  enrollments_count: 0,
  published_at: i === 1 ? new Date().toISOString() : null,
  category_links: [{ is_primary: true, course_categories: categories[i] }],
  instructors: [
    {
      is_primary: true,
      trainers: {
        id: `trainer-${i}`,
        slug: `trainer-${i}`,
        users: {
          full_name: [
            'Dr. Ahmed Rashed',
            'Sarah Omar',
            'Mona Ibrahim',
            'Dr. Khaled Nasser',
            'Sara Ali',
            'Omar Hassan',
          ][i],
          profile_image: null,
        },
        specializations: { name_en: 'Professional development', name_ar: 'التطوير المهني' },
      },
    },
  ],
}));
async function setup(page: Page, language = 'en', theme = 'light', reduced = true) {
  await page.emulateMedia({ reducedMotion: reduced ? 'reduce' : 'no-preference' });
  await page.addInitScript(
    ({ language, theme }) => {
      localStorage.setItem('tamkeenova-lang', language);
      localStorage.setItem('tamkeenova-theme', theme);
    },
    { language, theme },
  );
  await page.route(/^https:\/\//, (route) => route.abort());
  const requests: string[] = [];
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    let data: unknown = [];
    if (url.pathname.endsWith('/courses/categories')) data = categories;
    if (url.pathname === '/api/courses') {
      requests.push(url.search);
      const slug = url.searchParams.get('category');
      const search = url.searchParams.get('search');
      data = courses.filter(
        (c) =>
          (!slug || c.category_links[0].course_categories.slug === slug) &&
          (!search || c.title_en.toLowerCase().includes(search.toLowerCase())),
      );
    }
    return route.fulfill({
      json: {
        success: true,
        data,
        meta: { page: 1, total: Array.isArray(data) ? data.length : 0, total_pages: 1 },
      },
    });
  });
  await page.goto('/programs');
  await expect(page.locator('app-geometric-course-card')).toHaveCount(6);
  await page.evaluate(() => document.fonts.ready);
  return { requests };
}
for (const [language, width, theme] of [
  ['en', 1440, 'light'],
  ['ar', 1440, 'light'],
  ['ar', 320, 'light'],
  ['en', 390, 'light'],
  ['ar', 768, 'light'],
  ['ar', 1440, 'dark'],
] as const) {
  test(`geometric catalog cards remain readable, distinct and operable: ${language} ${width}px ${theme}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1100 });
    await setup(page, language, theme);
    const section = page.locator('#course-list');
    await section.scrollIntoViewIfNeeded();
    const cards = section.locator('.geometric-course-card');
    await expect(cards).toHaveCount(6);
    expect(
      new Set(
        await cards
          .locator('.frame-fill')
          .evaluateAll((paths) => paths.map((p) => p.getAttribute('d'))),
      ).size,
    ).toBeGreaterThanOrEqual(4);
    const ids = await cards.locator('[id]').evaluateAll((elements) => elements.map((el) => el.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const card of await cards.all()) {
      await expect(card.locator('.course-title-link h3')).not.toBeEmpty();
      await expect(card.locator('.instructor-name')).not.toBeEmpty();
      await expect(card.locator('.emblem-icon')).toBeVisible();
      await expect(card.locator('.course-arrow')).toHaveAttribute(
        'href',
        /\/programs\/course\/test-course-/,
      );
      await expect(card.locator('.course-arrow svg')).toHaveCSS(
        'scale',
        language === 'ar' ? '-1 1' : '1',
      );
      expect(
        await card.evaluate((el) => {
          const a = el.querySelector('.course-arrow')!.getBoundingClientRect();
          const title = el.querySelector('h3')!.getBoundingClientRect();
          return title.bottom <= a.top;
        }),
      ).toBe(true);
    }
    await expect(cards.last().locator('.course-rating')).toHaveCount(0); // No fabricated rating.
    await expect(cards.nth(1).locator('.badge-new')).toBeVisible();
    await expect(cards.nth(2).locator('.badge-new')).toHaveCount(0);
    const bookmark = cards.first().locator('.bookmark-control');
    await bookmark.focus();
    await page.keyboard.press('Enter');
    await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
    await expect(cards.first().getByRole('status')).toContainText(
      language === 'ar' ? 'هذا الجهاز' : 'this device',
    );
    expect(new URL(page.url()).pathname).toBe('/programs');
    await page
      .getByRole('button', { name: language === 'ar' ? 'عرض قائمة' : 'List view', exact: true })
      .click();
    await expect(page.locator('.geometric-course-grid')).toHaveClass(/is-list/);
    await expect(bookmark).toHaveAttribute('aria-pressed', 'true');
    await page
      .getByRole('button', { name: language === 'ar' ? 'عرض شبكي' : 'Grid view', exact: true })
      .click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await section.screenshot({
      path: info.outputPath('geometric-catalog.png'),
      animations: 'disabled',
    });
    await section.evaluate((el) => {
      document.documentElement.style.scrollBehavior = 'auto';
      scrollTo(0, el.getBoundingClientRect().top + scrollY - 72);
    });
    await page.screenshot({
      path: info.outputPath('catalog-viewport.png'),
      animations: 'disabled',
    });
    await page.reload();
    await expect(
      page.locator('.geometric-course-card').first().locator('.bookmark-control'),
    ).toHaveAttribute('aria-pressed', 'true');
  });
}

test('catalog search, filters and sidebar use the live query without jumping out of the workspace', async ({
  page,
}) => {
  const { requests } = await setup(page);
  await page.locator('#course-list').scrollIntoViewIfNeeded();
  await page.locator('.catalog-search input').fill('Planning');
  await page.locator('.catalog-search button').click();
  await expect(page.locator('.geometric-course-card')).toHaveCount(1);
  expect(requests.at(-1)).toContain('search=Planning');
  await page.locator('.catalog-search input').fill('');
  await page.locator('.catalog-search button').click();
  await expect(page.locator('.geometric-course-card')).toHaveCount(6);
  const before = await page
    .locator('#course-list')
    .evaluate((el) => el.getBoundingClientRect().top);
  await page.locator('.catalog-directory button').filter({ hasText: en[1] }).click();
  await expect(page.locator('.geometric-course-card')).toHaveCount(1);
  await expect(page).toHaveURL(/category=technology-innovation/);
  expect(requests.at(-1)).toContain('category=technology-innovation');
  // scrollBy rounds to physical scroll pixels, while layout bounds retain
  // fractional CSS pixels. Preserve the same position within one CSS pixel.
  await expect
    .poll(async () =>
      Math.abs(
        (await page.locator('#course-list').evaluate((el) => el.getBoundingClientRect().top)) -
          before,
      ),
    )
    .toBeLessThanOrEqual(1);
  await page.locator('.sort-control select').selectOption('rating');
  await expect.poll(() => requests.at(-1)).toContain('sort=rating');
});

test('scroll hand-off really pins the previous section and lets the catalog cover it; reduced motion opts out', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await setup(page, 'en', 'light', false);
  await expect(page.locator('.programs-page')).toHaveClass(/stacking-ready/);
  const top = await page
    .locator('#course-list')
    .evaluate((el) => el.getBoundingClientRect().top + scrollY);
  await page.evaluate((y) => {
    document.documentElement.style.scrollBehavior = 'auto';
    scrollTo(0, y);
  }, top - 700);
  const pinned = await page
    .locator('.catalog-underlay')
    .evaluate((el) => el.getBoundingClientRect().top);
  const coverBefore = await page
    .locator('#course-list')
    .evaluate((el) => el.getBoundingClientRect().top);
  await page.evaluate(() => scrollBy(0, 180));
  await expect
    .poll(() => page.locator('.catalog-underlay').evaluate((el) => el.getBoundingClientRect().top))
    .toBeCloseTo(pinned, 0);
  expect(
    await page.locator('#course-list').evaluate((el) => el.getBoundingClientRect().top),
  ).toBeCloseTo(coverBefore - 180, 0);
  await page.evaluate((y) => scrollTo(0, y), top - 40);
  await expect
    .poll(() => page.locator('.catalog-underlay').evaluate((el) => (el as HTMLElement).inert))
    .toBe(true);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.catalog-underlay')).toHaveCSS('position', 'relative');
  await expect
    .poll(() => page.locator('.catalog-underlay').evaluate((el) => (el as HTMLElement).inert))
    .toBe(false);
  expect(
    await page
      .locator('.geometric-course-card')
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).transitionDuration)),
  ).toBeLessThanOrEqual(0.00001);
});

test('a real empty result and a failed request remain distinct, with working retry', async ({
  page,
}) => {
  await setup(page);
  await page.route(/\/api\/courses\?/, (route) =>
    route.fulfill({ status: 503, json: { message: 'Unavailable' } }),
  );
  await page.reload();
  await expect(page.locator('#course-list .error-state')).toBeVisible();
  await expect(page.locator('#course-list .empty-state')).toHaveCount(0);
  await expect(page.locator('.geometric-course-card')).toHaveCount(0);
  await page.unroute(/\/api\/courses\?/);
  await page.locator('#course-list .error-state button').click();
  await expect(page.locator('.geometric-course-card')).toHaveCount(6);
  await page.locator('.catalog-search input').fill('no-matching-course');
  await page.locator('.catalog-search button').click();
  await expect(page.locator('#course-list .empty-state')).toBeVisible();
  await expect(page.locator('#course-list .error-state')).toHaveCount(0);
});

test('load more appends real response rows without duplicate SVG IDs or losing saved state', async ({
  page,
}) => {
  await setup(page);
  await page.route(/\/api\/courses\?/, (route) => {
    const pageNumber = Number(new URL(route.request().url()).searchParams.get('page'));
    return route.fulfill({
      json: {
        data: pageNumber === 1 ? courses.slice(0, 3) : courses.slice(3),
        meta: { page: pageNumber, total: 6, total_pages: 2 },
      },
    });
  });
  await page.reload();
  await expect(page.locator('.geometric-course-card')).toHaveCount(3);
  await page.locator('.bookmark-control').first().click();
  await page.locator('.load-more-wrap button').click();
  await expect(page.locator('.geometric-course-card')).toHaveCount(6);
  await expect(page.locator('.bookmark-control').first()).toHaveAttribute('aria-pressed', 'true');
  const ids = await page
    .locator('.geometric-course-card [id]')
    .evaluateAll((els) => els.map((el) => el.id));
  expect(new Set(ids).size).toBe(ids.length);
  await expect(page.locator('.load-more-wrap')).toHaveCount(0);
});

test('unavailable photo and avatar degrade to designed category artwork and initials', async ({
  page,
}) => {
  await setup(page);
  await page.route('**/missing-cover.png', (route) => route.fulfill({ status: 404, body: '' }));
  await page.route(/\/api\/courses\?/, (route) =>
    route.fulfill({
      json: {
        data: [
          {
            ...courses[0],
            cover_image_url: '/missing-cover.png',
            instructors: [
              {
                is_primary: true,
                trainers: {
                  id: 'one',
                  slug: 'one',
                  users: { full_name: 'Test instructor', profile_image: '/missing-cover.png' },
                },
              },
            ],
          },
        ],
        meta: { page: 1, total: 1, total_pages: 1 },
      },
    }),
  );
  await page.reload();
  const card = page.locator('.geometric-course-card');
  await expect(card).toHaveCount(1);
  await expect(card.locator('image')).toHaveCount(0);
  await expect(card.locator('.instructor-placeholder')).toHaveText('T');
  await expect(card.locator('.course-title-link')).toHaveText(courses[0].title_en);
});

for (const width of [1440, 1920, 2560]) {
  test(`catalog uses the entire ${width}px workspace without oversized cards`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 });
    await setup(page);
    const workspace = page.locator('.catalog-workspace');
    const box = await workspace.boundingBox();
    expect(box!.width).toBeCloseTo(width, 0);
    expect(box!.x).toBeCloseTo(0, 0);
    const grid = page.locator('.geometric-course-grid');
    const columns = await grid.evaluate(
      (el) => getComputedStyle(el).gridTemplateColumns.split(' ').length,
    );
    expect(columns).toBe(width >= 2400 ? 5 : width >= 1900 ? 4 : 3);
    const card = page.locator('.geometric-course-card').first();
    expect((await card.boundingBox())!.width).toBeLessThan(440);
    const overlap = await card.evaluate((el) => {
      const photo = el.querySelector('.course-photo-area')!.getBoundingClientRect();
      const body = el.querySelector('.course-card-body')!.getBoundingClientRect();
      return photo.bottom - body.top;
    });
    expect(overlap).toBeGreaterThanOrEqual(47);
    await card.scrollIntoViewIfNeeded();
    for (const selector of ['.course-title-link', '.bookmark-control', '.course-arrow']) {
      const target = card.locator(selector);
      await target.scrollIntoViewIfNeeded();
      expect(
        await target.evaluate((el) => {
          const b = el.getBoundingClientRect();
          const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
          return !!hit && (el === hit || el.contains(hit));
        }),
      ).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
  });
}

for (const [language, height] of [
  ['en', 900],
  ['ar', 600],
] as const) {
  test(`category directory stays pinned below the header in both scroll directions: ${language} ${height}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height });
    await setup(page, language);
    const rows = Array.from({ length: 3 }, (_, batch) =>
      courses.map((course) => ({
        ...course,
        id: `${course.id}-${batch}`,
        slug: `${course.slug}-${batch}`,
      })),
    ).flat();
    await page.route('**/api/courses?**', (route) =>
      route.fulfill({
        json: {
          success: true,
          data: rows,
          meta: { page: 1, total: rows.length, total_pages: 1 },
        },
      }),
    );
    await page.locator('.sort-control select').selectOption('popular');
    await expect(page.locator('.geometric-course-card')).toHaveCount(18);
    const sidebar = page.locator('.catalog-sidebar');
    const workspaceTop = await page
      .locator('.catalog-workspace')
      .evaluate((el) => el.getBoundingClientRect().top + scrollY);
    await page.evaluate((y) => {
      document.documentElement.style.scrollBehavior = 'auto';
      scrollTo(0, y + 120);
    }, workspaceTop);
    await expect
      .poll(() => sidebar.evaluate((el) => el.getBoundingClientRect().top))
      .toBeCloseTo(72, 0);
    expect((await sidebar.boundingBox())!.height).toBeLessThanOrEqual(height - 88 + 1);
    const cardTop = await page
      .locator('.geometric-course-card')
      .first()
      .evaluate((el) => el.getBoundingClientRect().top);
    await page.evaluate(() => scrollBy(0, 220));
    await expect
      .poll(() => sidebar.evaluate((el) => el.getBoundingClientRect().top))
      .toBeCloseTo(72, 0);
    await expect
      .poll(() =>
        page
          .locator('.geometric-course-card')
          .first()
          .evaluate((el) => el.getBoundingClientRect().top),
      )
      .toBeCloseTo(cardTop - 220, 0);
    await page.evaluate(() => scrollBy(0, -140));
    await expect
      .poll(() => sidebar.evaluate((el) => el.getBoundingClientRect().top))
      .toBeCloseTo(72, 0);
    const headingTop = await sidebar.locator('h2').evaluate((el) => el.getBoundingClientRect().top);
    const nav = sidebar.locator('nav');
    const pageScroll = await page.evaluate(() => scrollY);
    await nav.hover();
    await page.mouse.wheel(0, 1600);
    await expect.poll(() => nav.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
    await expect
      .poll(() => sidebar.locator('h2').evaluate((el) => el.getBoundingClientRect().top))
      .toBeCloseTo(headingTop, 0);
    expect(await page.evaluate(() => scrollY)).toBeCloseTo(pageScroll, 0);
    // The last real category stays keyboard-reachable within the bounded list.
    await nav.locator('button').last().focus();
    await expect(nav.locator('button').last()).toBeFocused();
    expect(
      await nav.evaluate((el) => {
        const last = el.querySelector('button:last-child')!.getBoundingClientRect();
        const bounds = el.getBoundingClientRect();
        return last.top >= bounds.top - 1 && last.bottom <= bounds.bottom + 1;
      }),
    ).toBe(true);
  });
}

for (const count of [0, 1]) {
  test(`directory stays pinned after a delayed ${count}-course response shrinks the loading grid`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await setup(page, 'ar', 'light', false);
    // Hold a real query response while the taller loading grid is on screen.
    let release!: () => void;
    const responseReady = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/api/courses?**', async (route) => {
      await responseReady;
      await route.fulfill({
        json: {
          success: true,
          data: courses.slice(0, count),
          meta: { page: 1, total: count, total_pages: 1 },
        },
      });
    });
    await page.locator('.sort-control select').selectOption('popular');
    await expect(page.locator('.course-card-skeleton').first()).toBeVisible();
    const workspace = page.locator('.catalog-workspace');
    const top = await workspace.evaluate((el) => el.getBoundingClientRect().top + scrollY);
    await page.evaluate((y) => {
      document.documentElement.style.scrollBehavior = 'auto';
      scrollTo(0, y + 120);
    }, top);
    const sidebar = page.locator('.catalog-sidebar');
    await expect
      .poll(() => sidebar.evaluate((el) => el.getBoundingClientRect().top))
      .toBeCloseTo(72, 0);
    const loadingHeight = await workspace.evaluate((el) => el.getBoundingClientRect().height);
    // Exercise the reported timing, with actual animations enabled.
    await page.waitForTimeout(2200);
    release();
    await expect(page.locator('.catalog-results')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('.geometric-course-card')).toHaveCount(count);
    await expect
      .poll(() => workspace.evaluate((el) => el.getBoundingClientRect().height))
      .toBeLessThan(loadingHeight);
    await expect
      .poll(() => sidebar.evaluate((el) => el.getBoundingClientRect().top))
      .toBeCloseTo(72, 0);
    // Even at the actual document bottom the sidebar must clear the navbar.
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await expect
      .poll(() => sidebar.evaluate((el) => el.getBoundingClientRect().top))
      .toBeCloseTo(72, 0);
    await page.evaluate(() => scrollBy(0, -60));
    await expect
      .poll(() => sidebar.evaluate((el) => el.getBoundingClientRect().top))
      .toBeCloseTo(72, 0);
  });
}

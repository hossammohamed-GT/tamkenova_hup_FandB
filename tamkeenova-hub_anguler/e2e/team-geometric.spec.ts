import { test, expect, Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
// Design-only fixtures. Cropped reference portraits are served by this test route
// only; no invented instructors, reviews or portraits enter the public catalog.
const trainerId = '11111111-1111-4111-a111-111111111111';
const names = [
  'Ahmed Rashed',
  'Sarah Omar',
  'Khaled Nasser',
  'Mona Ibrahim',
  'Mostafa Saaly',
  'Sara Ali',
  'Islam Asal',
  'Nourhan Tarek',
];
const namesAr = [
  'أحمد راشد',
  'سارة عمر',
  'خالد ناصر',
  'منى إبراهيم',
  'مصطفى سعلي',
  'سارة علي',
  'إسلام عسل',
  'نورهان طارق',
];
const trainers = names.map((name, i) => ({
  id: i === 0 ? trainerId : `11111111-1111-4111-a111-11111111111${i + 1}`,
  slug: `test-instructor-${i}`,
  trainer_status: 'APPROVED',
  users: {
    id: `user-${i}`,
    full_name: name,
    profile_image: `/test-portraits/portrait-${i % 4}.png`,
    created_at: '2022-01-01T00:00:00Z',
  },
  bio_en: 'Practical, expert-led learning to help you build skills and create new opportunities.',
  bio_ar: 'تعلّم عملي يقوده الخبراء لبناء المهارات وتطوير مسارك المهني وصناعة فرص جديدة.',
  description_en:
    'I help learners build practical skills with thoughtful lessons, real-world applications and professional guidance. '.repeat(
      4,
    ),
  description_ar:
    'أساعد المتدربين على بناء مهارات عملية من خلال دروس واضحة وتطبيقات واقعية وإرشاد مهني متخصص. '.repeat(
      4,
    ),
  specialization_id: `specialty-${i % 4}`,
  specializations: {
    id: `specialty-${i % 4}`,
    name_en: ['Web Development', 'Data Science', 'Cyber Security', 'Design'][i % 4],
    name_ar: ['تطوير الويب', 'علوم البيانات', 'الأمن السيبراني', 'التصميم'][i % 4],
  },
  average_rating: String(4.9 - i * 0.1),
  ratings_count: 24 + i,
  years_of_experience: 10 - i,
  total_students: 1200 - i * 100,
  is_available: i % 2 === 0,
  is_featured: i === 0,
  _count: { training_programs: 12 - i, trainer_reviews: 2 },
  consultation_price_from: '200',
  consultation_price_to: '400',
  consultation_duration: 45,
  trainer_certificates: [
    {
      id: 'certificate',
      title: 'Professional qualification',
      certificate_url: 'https://example.test/certificate.pdf',
    },
  ],
  linkedin_url: 'https://example.test/profile',
  website_url: 'javascript:alert(1)',
  trainer_reviews: [
    {
      id: 'review-1',
      rating: 5,
      comment: 'Helpful practical guidance.',
      users: { full_name: 'Test learner' },
    },
    {
      id: 'review-2',
      rating: 4,
      comment: 'Clear and thoughtful lessons.',
      users: { full_name: 'Another learner' },
    },
  ],
  training_programs: [],
  course_instructors: [0, 1, 2].map((c) => ({
    courses: {
      id: `course-${c}`,
      slug: `real-course-${c}`,
      title_en: [
        'Full Stack Web Development',
        'Cloud Computing for Developers',
        'Advanced React Projects',
      ][c],
      title_ar: ['تطوير تطبيقات الويب', 'الحوسبة السحابية للمطورين', 'مشروعات React متقدمة'][c],
      cover_image_url: '/assets/course-categories/technology-innovation.jpg',
      duration_minutes: 120,
      level: 'INTERMEDIATE',
      average_rating: 4.8,
      ratings_count: 12,
    },
  })),
}));
async function setup(
  page: Page,
  { language = 'en', role = 'STUDENT', already = false, postError = 0, mineError = false } = {},
) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(
    ({ language, role }) => {
      localStorage.setItem('tamkeenova-lang', language);
      if (role) {
        localStorage.setItem('token', 'test-only');
        localStorage.setItem(
          'user',
          JSON.stringify({ id: 'learner', role, full_name: 'Test learner' }),
        );
      }
    },
    { language, role },
  );
  await page.route(/^https:\/\//, (r) => r.abort());
  await page.route('**/test-portraits/**', (r) =>
    r.fulfill({
      body: readFileSync(
        join(
          process.cwd(),
          'e2e/fixtures/instructors',
          new URL(r.request().url()).pathname.split('/').pop()!,
        ),
      ),
      contentType: 'image/png',
    }),
  );
  let previous = already,
    posts = 0,
    mineGets = 0;
  await page.route('**/api/**', async (r) => {
    const url = new URL(r.request().url());
    let data: any = [];
    if (url.pathname === '/api/trainers')
      data = [
        ...trainers,
        { ...trainers[0], id: 'pending', slug: 'not-approved', trainer_status: 'PENDING' },
      ];
    if (url.pathname.startsWith('/api/trainers/profile/')) {
      const found = trainers.find((t) => t.slug === url.pathname.split('/').pop());
      if (!found) return r.fulfill({ status: 404, json: { message: 'not found' } });
      data = found;
    }
    if (url.pathname === '/api/trainers/reviews/mine') {
      mineGets++;
      if (mineError) return r.fulfill({ status: 503, json: { message: 'offline' } });
      data = previous ? [{ trainer_id: trainerId, rating: 4 }] : [];
    }
    if (r.request().method() === 'POST' && url.pathname.endsWith('/reviews')) {
      posts++;
      if (postError) return r.fulfill({ status: postError, json: { message: 'failed' } });
      previous = true;
      data = {
        review: { rating: r.request().postDataJSON().rating },
        average_rating: 4.9,
        ratings_count: 25,
      };
    }
    if (url.pathname === '/api/auth/me')
      data = {
        id: 'learner',
        role,
        full_name: 'Test learner',
        email_verified: true,
        is_active: true,
      };
    return r.fulfill({ json: { success: true, data } });
  });
  return { posts: () => posts, mineGets: () => mineGets };
}
for (const [language, width, theme] of [
  ['en', 1536, 'light'],
  ['ar', 1440, 'light'],
  ['ar', 320, 'light'],
  ['en', 390, 'light'],
  ['ar', 768, 'dark'],
  ['en', 1440, 'dark'],
] as const) {
  test(`reference-inspired instructor directory and profile: ${language} ${width}px ${theme}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1050 });
    await page.addInitScript((theme) => localStorage.setItem('tamkeenova-theme', theme), theme);
    await setup(page, { language });
    await page.goto('/team');
    await expect(page.locator('.trainer-card')).toHaveCount(8);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await expect(page.locator('h1')).not.toContainText('team_ui');
    const card = page.locator('.trainer-card').first();
    await card.locator('.trainer-save').click();
    await expect(card.locator('.trainer-save')).toHaveAttribute('aria-pressed', 'true');
    await page.screenshot({
      path: info.outputPath('instructors.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await card.locator('.trainer-card-view-details').click();
    await expect(page).toHaveURL(/\/team\/test-instructor-0/);
    await expect(page.locator('h1')).toHaveText(names[0]);
    await expect(page.locator('.profile-course')).toHaveCount(3);
    await expect(page.locator('.profile-review-list article')).toHaveCount(2);
    await expect(page.locator('.profile-socials a')).toHaveCount(1);
    await page.locator('.profile-read-more').click();
    await expect(page.locator('.profile-long-copy')).toHaveClass(/expanded/);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath('instructor-profile.png'),
      fullPage: true,
      animations: 'disabled',
    });
    await page.locator('.profile-hero-action button').click();
    await expect(page.locator('app-booking-modal')).toContainText(names[0]);
  });
}
test('directory search, real filters, sorting, view toggle and saved state work', async ({
  page,
}) => {
  await setup(page);
  await page.goto('/team');
  await expect(page.locator('.trainer-card')).toHaveCount(8);
  await page.locator('.team-search input').fill('Sarah');
  await expect(page.locator('.trainer-card')).toHaveCount(1);
  await page.locator('.team-search input').fill('');
  await page.locator('.team-toolbar select').first().selectOption('specialty-0');
  await expect(page.locator('.trainer-card')).toHaveCount(2);
  await page.locator('.team-toolbar select').first().selectOption('');
  await page.getByRole('button', { name: 'List view', exact: true }).click();
  await expect(page.locator('.team-grid')).toHaveClass(/team-list/);
  await page.getByRole('button', { name: 'Grid view', exact: true }).click();
  await page.locator('.team-sort').selectOption('rating');
  await expect(page.locator('.trainer-card-name').first()).toHaveText(names[0]);
  await page.locator('.trainer-save').first().click();
  await page.reload();
  await expect(page.locator('.trainer-save').first()).toHaveAttribute('aria-pressed', 'true');
});
test('hover and keyboard reveal five stars; submission locks the persisted rating across reload and other cards', async ({
  page,
}) => {
  const api = await setup(page);
  await page.goto('/team');
  const zone = page.locator('app-trainer-rating').first();
  await zone.locator('.rating-trigger').hover();
  await expect(zone.locator('.rating-star-btn')).toHaveCount(5);
  await zone.locator('.rating-star-btn').first().focus();
  await page.keyboard.press('Escape');
  await expect(zone.locator('.rating-popover')).toHaveCount(0);
  await expect(zone.locator('.rating-trigger')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(zone.locator('.rating-star-btn').last()).toBeEnabled();
  await zone.locator('.rating-star-btn').last().focus();
  await page.keyboard.press('Enter');
  await expect(zone.locator('.already-rated')).toBeVisible();
  await expect(zone.locator('.rating-star-btn')).toHaveCount(0);
  expect(api.posts()).toBe(1);
  expect(api.mineGets()).toBe(1);
  await page.reload();
  await page.locator('app-trainer-rating').first().locator('.rating-trigger').click();
  await expect(page.locator('.already-rated')).toBeVisible();
  expect(api.posts()).toBe(1);
});
for (const status of [409, 503])
  test(`rating ${status} responses remain truthful and do not navigate the trainer card`, async ({
    page,
  }) => {
    await setup(page, { postError: status });
    await page.goto('/team');
    const zone = page.locator('app-trainer-rating').first();
    await zone.locator('.rating-trigger').click();
    await zone.locator('.rating-star-btn').last().click();
    await expect(zone.locator(status === 409 ? '.already-rated' : '.rating-error')).toBeVisible();
    await expect(page).toHaveURL(/\/team$/);
    if (status === 503) await expect(zone.locator('.rating-star-btn').last()).toBeEnabled();
  });
for (const role of ['', 'ADMIN'])
  test(`rating requires a learner account: ${role || 'guest'}`, async ({ page }) => {
    const api = await setup(page, { role });
    await page.goto('/team');
    await page.locator('.rating-trigger').first().click();
    await expect(page.locator('.rating-popover')).toBeVisible();
    await expect(page.locator('.rating-star-btn')).toHaveCount(0);
    expect(api.posts()).toBe(0);
    expect(api.mineGets()).toBe(0);
  });
test('rating status error blocks submitting, and a missing trainer is distinct from the directory', async ({
  page,
}) => {
  const api = await setup(page, { mineError: true });
  await page.goto('/team');
  await page.locator('.rating-trigger').first().click();
  await expect(page.locator('.rating-popover')).toContainText('Retry before submitting');
  await expect(page.locator('.rating-star-btn')).toHaveCount(0);
  expect(api.posts()).toBe(0);
  await page.goto('/team/not-found');
  await expect(page.locator('.profile-state')).toContainText('Trainer Not Found');
});

test('already-rated state is read-only before any new submission', async ({ page }) => {
  const api = await setup(page, { already: true });
  await page.goto('/team');
  const zone = page.locator('app-trainer-rating').first();
  await zone.locator('.rating-trigger').hover();
  await expect(zone.locator('.already-rated')).toBeVisible();
  await expect(zone.locator('.saved-stars .filled')).toHaveCount(4);
  await expect(zone.locator('.rating-star-btn')).toHaveCount(0);
  expect(api.posts()).toBe(0);
});
test('directory distinguishes a failed request, a real empty catalog, and image fallbacks', async ({
  page,
}) => {
  await setup(page);
  let failed = true;
  await page.route('**/api/trainers', (route) =>
    route.fulfill(
      failed
        ? { status: 503, json: { message: 'offline' } }
        : { json: { success: true, data: [] } },
    ),
  );
  await page.goto('/team');
  await expect(page.locator('.team-empty')).toContainText('could not load');
  failed = false;
  await page.locator('.team-empty button').click();
  await expect(page.locator('.team-empty')).toContainText('No instructors found');
  await page.unroute('**/api/trainers');
  await page.route('**/test-portraits/**', (route) => route.abort());
  await page.reload();
  await expect(page.locator('.trainer-photo-link img.is-default-portrait')).toHaveCount(8);
  await expect(page.locator('.hero-portrait img.is-default-portrait')).toHaveCount(4);
  await page.locator('.trainer-card-view-details').first().click();
  await expect(page.locator('.profile-portrait img')).toHaveAttribute(
    'src',
    '/assets/trainers/default-portrait.svg',
  );
  await expect(page.locator('.profile-message-image img.is-default-portrait')).toHaveCount(1);
});
test('the learner portal uses the same server-backed read-only rating state', async ({ page }) => {
  const api = await setup(page, { already: true });
  await page.route('**/api/specializations', (route) =>
    route.fulfill({ json: trainers.slice(0, 4).map((t) => t.specializations) }),
  );
  await page.route('**/api/students/trainers?**', (route) =>
    route.fulfill({
      json: {
        success: true,
        data: [{ ...trainers[0], users: { ...trainers[0].users, profile_image: null } }],
        meta: { total: 1, totalPages: 1 },
      },
    }),
  );
  await page.goto('/portal/student/trainers');
  await expect(page.locator('.trainer-avatar.is-default-portrait')).toHaveCount(1);
  const zone = page.locator('app-trainer-rating').first();
  await zone.locator('.rating-trigger').click();
  await expect(zone.locator('.already-rated')).toBeVisible();
  await expect(zone.locator('.rating-star-btn')).toHaveCount(0);
  expect(api.posts()).toBe(0);
});

for (const [language, width, theme] of [
  ['en', 1440, 'light'],
  ['ar', 320, 'light'],
  ['en', 390, 'dark'],
  ['ar', 1440, 'dark'],
] as const) {
  test(`default portraits and frosted glass remain complete: ${language} ${width}px ${theme}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript((theme) => localStorage.setItem('tamkeenova-theme', theme), theme);
    await setup(page, { language });
    const withoutPhotos = trainers.map((trainer, index) => ({
      ...trainer,
      users: { ...trainer.users, profile_image: index % 2 ? '' : null },
    }));
    await page.route('**/api/trainers', (route) =>
      route.fulfill({ json: { success: true, data: withoutPhotos } }),
    );
    await page.route('**/api/trainers/profile/**', (route) =>
      route.fulfill({ json: { success: true, data: withoutPhotos[0] } }),
    );
    await page.goto('/team');
    await expect(page.locator('.trainer-photo-link img.is-default-portrait')).toHaveCount(8);
    await expect(page.locator('.hero-portrait img.is-default-portrait')).toHaveCount(4);
    await expect
      .poll(() =>
        page
          .locator('.hero-portrait img')
          .evaluateAll((images) =>
            images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
          ),
      )
      .toBe(true);
    expect(
      await page.locator('.team-toolbar').evaluate((el) => getComputedStyle(el).backdropFilter),
    ).toContain('blur');
    expect(
      await page
        .locator('.trainer-card-body')
        .first()
        .evaluate((el) => getComputedStyle(el, '::before').backdropFilter),
    ).toContain('blur');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({
      path: info.outputPath('default-instructors.png'),
      fullPage: true,
      animations: 'disabled',
    });
    const card = page.locator('.trainer-card').first();
    await card.locator('.rating-trigger').click();
    await expect(card.locator('.rating-star-btn')).toHaveCount(5);
    const popup = await card.locator('.rating-popover').boundingBox();
    const trigger = await card.locator('.rating-trigger').boundingBox();
    expect(popup!.y + popup!.height).toBeLessThanOrEqual(trigger!.y);
    await card.locator('.rating-trigger').press('Escape');
    await card.locator('.trainer-card-view-details').click();
    await expect(page.locator('h1')).toHaveText(names[0]);
    await expect(page.locator('.profile-portrait img.is-default-portrait')).toHaveCount(1);
    await expect(page.locator('.profile-message-image img.is-default-portrait')).toHaveCount(1);
    if (width <= 600) {
      const side = await page.locator('.profile-side').boundingBox();
      const message = await page.locator('.profile-message').boundingBox();
      expect(message!.width).toBeGreaterThanOrEqual(side!.width - 2);
    }

    await expect
      .poll(() =>
        page
          .locator('.profile-portrait img')
          .evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);
    expect(
      await page
        .locator('.profile-panel')
        .first()
        .evaluate((el) => getComputedStyle(el).backdropFilter),
    ).toContain('blur');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath('default-instructor-profile.png'),
      fullPage: true,
      animations: 'disabled',
    });
  });
}

test('one real instructor keeps the decorative collage balanced without inventing instructor counts', async ({
  page,
}) => {
  await setup(page);
  await page.route('**/api/trainers', (route) =>
    route.fulfill({ json: { success: true, data: [trainers[0]] } }),
  );
  await page.goto('/team');
  await expect(page.locator('.trainer-card')).toHaveCount(1);
  await expect(page.locator('.hero-portrait img')).toHaveCount(4);
  await expect(page.locator('.hero-portrait img.is-default-portrait')).toHaveCount(3);
  await expect(page.locator('.team-hero-stats strong').first()).toHaveText('1');
});

test('reduced transparency preserves opaque, readable panels and functional ratings', async ({
  page,
}) => {
  await setup(page);
  // Playwright does not expose reduced-transparency in emulateMedia.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
  await page.goto('/team');
  await expect(page.locator('.trainer-card')).toHaveCount(8);
  expect(
    await page.locator('.team-toolbar').evaluate((el) => getComputedStyle(el).backdropFilter),
  ).toBe('none');
  expect(
    await page
      .locator('.trainer-card-body')
      .first()
      .evaluate((el) => getComputedStyle(el, '::before').backdropFilter),
  ).toBe('none');
  await page.locator('.rating-trigger').first().click();
  await expect(page.locator('.rating-star-btn')).toHaveCount(5);
  expect(
    await page.locator('.rating-popover').evaluate((el) => getComputedStyle(el).backdropFilter),
  ).toBe('none');
  await page.locator('.trainer-card-view-details').first().click();
  await expect(page.locator('h1')).toHaveText(names[0]);
  expect(
    await page
      .locator('.profile-panel')
      .first()
      .evaluate((el) => getComputedStyle(el).backdropFilter),
  ).toBe('none');
  await cdp.detach();
});

import { test, expect, Page } from '@playwright/test';
const preview = '11111111-1111-4111-a111-111111111111',
  privateId = '22222222-2222-4222-a222-222222222222';
const sample = {
  id: 'course',
  slug: 'demo-catalog-v1-stress',
  title_en: 'Managing Stress and Building Resilience',
  title_ar: 'إدارة الضغوط وبناء المرونة',
  short_description_en: 'A structured learning experience, one lesson at a time.',
  short_description_ar: 'تجربة تعلّم منظمة، خطوة بخطوة ودرسًا بعد درس.',
  description_en: 'Understand the foundations, then explore practical applications.',
  description_ar: 'تعرّف على الأساسيات ثم انتقل إلى التطبيقات العملية.',
  is_free: false,
  language: 'ar',
  level: 'ALL_LEVELS',
  content_type: 'VIDEO',
  duration_minutes: 120,
  lessons_count: 2,
  ratings_count: 0,
  average_rating: 0,
  preview_video_url: 'https://youtu.be/5BciHXh074k?list=RD5BciHXh074k',
  cover_image_url: '/assets/course-categories/wellbeing.jpg',
  instructors: [],
  sections: [
    {
      id: 'foundations',
      title_en: 'Understanding the foundations',
      title_ar: 'فهم الأساسيات',
      position: 0,
    },
    {
      id: 'practice',
      title_en: 'Putting learning into practice',
      title_ar: 'تحويل التعلّم إلى ممارسة',
      position: 1,
    },
  ],
  lessons: [
    {
      id: preview,
      section_id: 'foundations',
      title_en: 'A welcome and course roadmap',
      title_ar: 'الترحيب وخطة الكورس',
      duration_minutes: 3,
      position: 0,
      is_preview: true,
      media_url: 'https://youtu.be/M7lc1UVf-VE',
    },
    {
      id: privateId,
      section_id: 'practice',
      title_en: 'From understanding to action',
      title_ar: 'من الفهم إلى التطبيق',
      duration_minutes: 8,
      position: 1,
      is_preview: false,
      media_url: null,
    },
  ],
};
async function mock(page: Page, { member = false, invalid = false } = {}) {
  let playbackRequests = 0;
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.route('**/api/**', (route) => {
    const url = new URL(route.request().url());
    let data: unknown = [];
    if (url.pathname.endsWith('/access')) data = { can_watch: member };
    else if (url.pathname.endsWith('/playback')) {
      playbackRequests++;
      data = { id: privateId, media_url: 'https://www.youtube.com/watch?v=5BciHXh074k' };
    } else if (url.pathname.endsWith('/courses/' + sample.slug))
      data = {
        ...sample,
        preview_video_url: invalid ? 'https://evil.example.test/video' : sample.preview_video_url,
      };
    else if (url.pathname.endsWith('/auth/me'))
      data = { id: 'student', role: 'STUDENT', full_name: 'Demo Student' };
    return route.fulfill({ json: { success: true, data } });
  });
  return () => playbackRequests;
}
for (const [language, width, theme] of [
  ['en', 1440, 'light'],
  ['ar', 1280, 'light'],
  ['en', 390, 'light'],
  ['ar', 320, 'dark'],
] as const) {
  test(`YouTube introduction and chapters: ${language}, ${width}px, ${theme}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1050 });
    await page.addInitScript(
      ({ language, theme }) => {
        localStorage.setItem('tamkeenova-lang', language);
        localStorage.setItem('tamkeenova-theme', theme);
      },
      { language, theme },
    );
    const count = await mock(page);
    await page.goto('/programs/course/' + sample.slug);
    const player = page.locator('app-youtube-player');
    await expect(player.locator('iframe')).toHaveAttribute(
      'src',
      /youtube-nocookie.com\/embed\/5BciHXh074k\?/,
    );
    await expect(player.locator('iframe')).not.toHaveAttribute('src', /list=/);
    await expect(player.locator('.video-help span')).toHaveCount(0);
    await expect(player).not.toContainText(/فيديو من يوتيوب|YouTube video ·/);
    await expect(player.locator('.video-help a')).toHaveAttribute('href', /youtube.com\/watch\?v=/);
    await expect(player.locator('.video-brand img')).toHaveAttribute('src', '/images/logo.svg');
    const brand = await player.locator('.video-brand').boundingBox(),
      frame = await player.locator('iframe').boundingBox();
    expect(brand!.x).toBeLessThan(frame!.x + frame!.width / 2);
    await expect(page.locator('.chapter-toggle')).toHaveCount(2);
    await expect(page.locator('.chapter-toggle').first()).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.chapter-toggle').nth(1)).toHaveAttribute('aria-expanded', 'false');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath('course-introduction.png'),
      animations: 'disabled',
      fullPage: true,
    });
    await page.locator('.free-previews button').click();
    await expect(player.locator('iframe')).toHaveAttribute('src', /embed\/M7lc1UVf-VE/);
    await expect(player).not.toContainText(/فيديو من يوتيوب|YouTube video ·/);
    await expect(page.locator('.lesson-button').first()).toHaveAttribute('aria-current', 'true');
    await page.locator('.expand-all').click();
    await page.locator('.lesson-button.is-locked').click();
    await expect(page.locator('.access-notice')).toBeVisible();
    await expect(player.locator('iframe')).toHaveAttribute('src', /embed\/M7lc1UVf-VE/);
    expect(count()).toBe(0);
    await page.locator('.intro-button').click();
    await expect(player.locator('iframe')).toHaveAttribute('src', /embed\/5BciHXh074k/);
    await page.locator('.lesson-navigation button').last().click();
    await expect(player.locator('iframe')).toHaveAttribute('src', /embed\/M7lc1UVf-VE/);
  });
}
test('an enrolled viewer fetches protected lesson playback, not an exposed public URL', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('tamkeenova-lang', 'en');
    localStorage.setItem('token', 'test-token');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'student', role: 'STUDENT', full_name: 'Demo Student' }),
    );
  });
  const count = await mock(page, { member: true });
  await page.goto('/programs/course/' + sample.slug);
  await page.locator('.expand-all').click();
  await expect(page.locator('.lesson-button').nth(1)).not.toHaveClass(/is-locked/);
  await page.locator('.lesson-button').nth(1).click();
  await expect(page.locator('.playing-caption h2')).toHaveText('From understanding to action');
  expect(count()).toBe(1);
  await expect(page.locator('iframe')).toHaveAttribute('src', /embed\/5BciHXh074k/);
});
test('unsupported links never become trusted iframe sources', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tamkeenova-lang', 'en'));
  await mock(page, { invalid: true });
  await page.goto('/programs/course/' + sample.slug);
  await expect(page.locator('.video-unavailable')).toBeVisible();
  await expect(page.locator('app-youtube-player iframe')).toHaveCount(0);
  await page.locator('.free-previews button').click();
  await expect(page.locator('iframe')).toHaveAttribute('src', /youtube-nocookie.com/);
});

test('the real page CSP permits the inline YouTube document, not just an iframe src attribute', async ({
  page,
}) => {
  await mock(page);
  let embeddedRequests = 0;
  await page.route('https://www.youtube-nocookie.com/embed/**', (route) => {
    embeddedRequests++;
    // Explicit embedded-document fixture, NOT a claim of live YouTube playback.
    return route.fulfill({
      contentType: 'text/html',
      body: '<!doctype html><html><body><button>Embedded player ready</button></body></html>',
    });
  });
  await page.goto('/programs/course/' + sample.slug);
  await expect(
    page
      .locator('app-youtube-player iframe')
      .contentFrame()
      .getByRole('button', { name: 'Embedded player ready' }),
  ).toBeVisible();
  expect(embeddedRequests).toBe(1);
  await expect(page).toHaveURL(new RegExp('/programs/course/' + sample.slug + '$'));
});

for (const language of ['ar', 'en'] as const) {
  test(`logical previous/next arrows and player controls: ${language}`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await mock(page);
    await page.addInitScript(
      (language) => localStorage.setItem('tamkeenova-lang', language),
      language,
    );
    await page.goto('/programs/course/' + sample.slug);
    const back = page.locator('.back-link .arrow-back');
    const previous = page.locator('.lesson-navigation .arrow-back');
    const next = page.locator('.lesson-navigation .arrow-forward');
    for (const [arrow, glyph] of [
      [back, '←'],
      [previous, '←'],
      [next, '→'],
    ] as const) {
      await expect(arrow).toHaveText(glyph);
      await expect(arrow).toHaveCSS('scale', language === 'ar' ? '-1 1' : '1');
    }
    await page.addStyleTag({
      content:
        '*, *::before, *::after { animation: none !important; transition: none !important; }',
    });
    const buttons = await page.locator('.lesson-navigation button').all();
    for (const button of buttons) {
      const rect = await button.boundingBox();
      expect(rect!.height).toBeGreaterThanOrEqual(44);
    }
    const full = await page.locator('.video-brand-strip button').boundingBox();
    expect(full!.height).toBeGreaterThanOrEqual(44);
    expect(full!.width).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

test('changing language updates arrow direction in place, including after hover', async ({
  page,
}) => {
  await mock(page);
  await page.addInitScript(() => localStorage.setItem('tamkeenova-lang', 'en'));
  await page.goto('/programs/course/' + sample.slug);
  const arrow = page.locator('.back-link .directional-arrow');
  await expect(arrow).toHaveCSS('scale', '1');
  await page.locator('.desktop-only[aria-label="Change language"]').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(arrow).toHaveCSS('scale', '-1 1');
  await page.locator('.back-link').hover();
  await expect(arrow).toHaveCSS('scale', '-1 1');
});

test('allowing YouTube frames still blocks unrelated external iframes', async ({ page }) => {
  await mock(page);
  await page.goto('/programs/course/' + sample.slug);
  const violation = await page.evaluate(
    () =>
      new Promise<{ directive: string; url: string }>((resolve) => {
        const onViolation = (event: SecurityPolicyViolationEvent) => {
          if (event.effectiveDirective !== 'frame-src') return;
          document.removeEventListener('securitypolicyviolation', onViolation);
          resolve({ directive: event.effectiveDirective, url: event.blockedURI });
        };
        document.addEventListener('securitypolicyviolation', onViolation);
        const frame = document.createElement('iframe');
        frame.src = 'https://untrusted-frame.example.test/player';
        frame.hidden = true;
        document.body.append(frame);
      }),
  );
  expect(violation).toEqual({
    directive: 'frame-src',
    url: 'https://untrusted-frame.example.test',
  });
});

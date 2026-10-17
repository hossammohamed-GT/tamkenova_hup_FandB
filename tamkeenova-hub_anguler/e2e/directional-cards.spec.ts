import { test, expect } from '@playwright/test';


for (const language of ['ar', 'en'])
  for (const width of [320, 1440]) {
    test(`trainer card forward arrow survives hover without external fonts: ${language}, ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(
        (language) => localStorage.setItem('tamkeenova-lang', language),
        language,
      );
      await page.route(/^https:\/\//, (route) => route.abort());
      await page.route('**/api/**', (route) =>
        route.fulfill({
          json: {
            success: true,
            data: new URL(route.request().url()).pathname.endsWith('/trainers')
              ? [
                  {
                    id: 'trainer',
                    slug: 'test-trainer',
                    trainer_status: 'APPROVED',
                    users: { full_name: 'Test Trainer' },
                    bio_ar: 'مدرب',
                    bio_en: 'Trainer',
                    average_rating: '0',
                    ratings_count: 0,
                    years_of_experience: 3,
                    trainer_certificates: [],
                    _count: { training_programs: 1 },
                  },
                ]
              : [],
          },
        }),
      );
      await page.goto('/team');
      const card = page.locator('.trainer-card');
      await expect(card).toBeVisible();
      const arrow = card.locator('.trainer-card-view-details .arrow-forward');
      await expect(arrow).toHaveText('→');
      await expect(arrow).toHaveCSS('scale', language === 'ar' ? '-1 1' : '1');
      await card.hover();
      await expect(arrow).toHaveCSS('scale', language === 'ar' ? '-1 1' : '1');

      const transform = await arrow.evaluate((el) => getComputedStyle(el).transform);
      expect(transform === 'none' || transform.startsWith('matrix(1, 0, 0, 1,')).toBe(true);
      await expect(arrow).not.toHaveClass(/fa-/);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    });
  }

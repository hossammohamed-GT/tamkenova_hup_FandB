import { test, expect, Page } from '@playwright/test';

// Layout regression only. HTTP fixtures do not write to a database.
const certificate = {
  id: 'card-1',
  title: 'Leadership & Professional Development',
  title_ar: 'القيادة والتطوير المهني',
  certificate_type: 'TRAINING',
  template_version: '2026.3',
  certificate_language: 'ar',
  recipient_name: 'ليلى أحمد',
  program_name: 'القيادة والتطوير المهني',
  training_hours: 48,
  issued_at: '2026-09-22T00:00:00Z',
  verification_code: 'TAM-0123456789ABCDEF',
  is_valid: true,
  partner_logos: [],
  description: JSON.stringify({
    schema: 'tamkeenova.certificate/2026.3',
    recipient_name_ar: 'ليلى أحمد',
    recipient_name_en: 'Layla Ahmed',
    program_name_ar: 'القيادة والتطوير المهني',
    program_name_en: 'Leadership',
    signature_name: 'Ahmed Hassan',
  }),
};
async function setup(
  page: Page,
  language = 'en',
  theme = 'light',
  records: unknown[] = [certificate],
) {
  await page.addInitScript(
    ({ language, theme }) => {
      localStorage.setItem('token', 'test-only');
      localStorage.setItem(
        'user',
        JSON.stringify({ id: 'student', full_name: 'Layla Ahmed', role: 'STUDENT' }),
      );
      localStorage.setItem('tamkeenova-lang', language);
      localStorage.setItem('tamkeenova-theme', theme);
    },
    { language, theme },
  );
  await page.route('**/api/**', (route) =>
    route.fulfill({
      json:
        new URL(route.request().url()).pathname === '/api/students/certificates'
          ? { data: records, total: records.length }
          : { data: [] },
    }),
  );
}

for (const [language, theme, width] of [
  ['en', 'light', 1440],
  ['ar', 'light', 1440],
  ['ar', 'light', 390],
  ['en', 'dark', 320],
  ['ar', 'dark', 320],
] as const) {
  test(`certificate card actions fit and contrast: ${language} ${theme} ${width}px`, async ({
    page,
  }, info) => {
    await setup(page, language, theme, [
      {
        ...certificate,
        title:
          language === 'ar'
            ? 'القيادة والتطوير المهني وتنمية مهارات التواصل الفعّال في بيئة العمل'
            : certificate.title,
      },
    ]);
    await page.setViewportSize({ width, height: 1100 });
    await page.goto('/portal/student/certificates');
    await expect(page.locator('.cert-card')).toHaveCount(1);
    await expect(page.locator('.edition-downloads')).toHaveCount(2);
    await expect(page.locator('.cert-download')).toHaveCount(4);
    await expect(page.locator('.certificate-artwork')).toBeVisible();
    for (const button of await page.locator('.cert-download, .cert-copy, .cert-verify').all()) {
      await button.scrollIntoViewIfNeeded();
      await expect(button).toBeVisible();
      const result = await button.evaluate((element) => {
        const box = element.getBoundingClientRect(),
          card = element.closest('.cert-card')!.getBoundingClientRect();
        const style = getComputedStyle(element);
        const lum = (color: string) => {
          const channels = color
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map((n) => {
              const v = Number(n) / 255;
              return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
            });
          return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
        };
        const a = lum(style.color),
          b = lum(style.backgroundColor);
        return {
          inside: box.left >= card.left && box.right <= card.right && box.bottom <= card.bottom,
          height: box.height,
          overflow: element.scrollWidth > element.clientWidth + 1,
          contrast: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        };
      });
      expect(result.inside).toBe(true);
      expect(result.height).toBeGreaterThanOrEqual(44);
      expect(result.overflow).toBe(false);
      expect(result.contrast).toBeGreaterThanOrEqual(4.5);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const first = page.locator('.cert-download').first();
    await first.focus();
    await expect(first).toBeFocused();
    expect(await first.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
    await first.evaluate((el) => (el as HTMLElement).blur());
    await page.locator('.cert-card').screenshot({
      path: info.outputPath(`card-${language}-${theme}.png`),
      style: 'app-navbar, app-ai-assistant { visibility: hidden !important; }',
    });
    await expect(page.locator('.cert-verify')).toHaveAttribute(
      'href',
      '/verify?code=TAM-0123456789ABCDEF',
    );
  });
}

test('revoked and historical cards keep verification but do not offer unusable downloads', async ({
  page,
}) => {
  await setup(page, 'ar', 'dark', [
    { ...certificate, id: 'revoked', is_valid: false },
    {
      ...certificate,
      id: 'legacy',
      template_version: null,
      recipient_name: null,
      description: null,
    },
  ]);
  await page.goto('/portal/student/certificates');
  await expect(page.locator('.cert-card')).toHaveCount(2);
  await expect(page.locator('.cert-download')).toHaveCount(0);
  await expect(page.locator('.cert-verify')).toHaveCount(2);
  await expect(page.locator('.is-revoked')).toBeVisible();
  await expect(page.locator('.legacy-note')).toBeVisible();
});

test('download progress stays visible and buttons recover after a rendering failure', async ({
  page,
}) => {
  await setup(page);
  let release!: () => void;
  const pending = new Promise<void>((resolve) => (release = resolve));
  await page.route('**/certificates/fonts/*', async (route) => {
    await pending;
    await route.abort();
  });
  await page.goto('/portal/student/certificates');
  await page.getByRole('button', { name: 'Download PDF · Arabic edition', exact: true }).click();
  await expect(page.locator('.download-progress')).toBeVisible();
  await expect(page.locator('.cert-actions')).toHaveAttribute('aria-busy', 'true');
  for (const button of await page.locator('.cert-download').all())
    await expect(button).toBeDisabled();
  release();
  await expect(page.locator('.page-message[role=alert]')).toBeVisible();
  await expect(page.locator('.download-progress')).toHaveCount(0);
  for (const button of await page.locator('.cert-download').all())
    await expect(button).toBeEnabled();
});

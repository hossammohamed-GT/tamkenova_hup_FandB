import { readFileSync, writeFileSync } from 'node:fs';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { test, expect } from '@playwright/test';
import { CERTIFICATE_TEMPLATES } from '../src/core/certificates/certificate-template';

// HTTP fixtures only: these tests never write to a real organization's database.
const user = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  full_name: 'Layla Ahmed Hassan',
  email: 'layla@example.test',
  role: 'STUDENT',
  is_active: true,
};
const record = {
  id: 'certificate-1',
  student_id: user.id,
  users: user,
  title: 'Leadership & Professional Development',
  recipient_name: user.full_name,
  program_name: 'Leadership & Professional Development',
  training_hours: 32,
  issued_at: '2026-09-21T00:00:00Z',
  certificate_type: 'TRAINING',
  verification_code: 'TAM-0123456789ABCDEF',
  template_version: '2026.2',
  certificate_language: 'en',
  partner_logos: [],
  is_valid: true,
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('token', 'test-only');
    localStorage.setItem(
      'user',
      JSON.stringify({ id: 'admin', full_name: 'Test Administrator', role: 'ADMIN' }),
    );
    localStorage.setItem('tamkeenova-lang', 'en');
    localStorage.setItem('tamkeenova-theme', 'light');
  });
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    let response: unknown = { data: [] };
    if (path === '/api/admin/certificates')
      response =
        route.request().method() === 'POST'
          ? { certificate: { ...record, ...route.request().postDataJSON() } }
          : { data: [record] };
    if (path.startsWith('/api/admin/certificates/'))
      response = { certificate: { ...record, ...route.request().postDataJSON() } };
    if (path === '/api/partners/admin')
      response = Array.from({ length: 5 }, (_, i) => ({
        id: `550e8400-e29b-41d4-a716-44665544000${i + 1}`,
        name_en: `Sample partner ${i + 1}`,
        name_ar: `شريك تجريبي ${i + 1}`,
        logo_url: `/images/partners/partners${i + 1}.png`,
        is_active: true,
        display_order: i,
      }));
    if (path === '/api/admin/users') response = { data: [user] };
    if (path === '/api/students/certificates') response = { data: [record] };
    await route.fulfill({ json: response });
  });
});

test('training preview changes only designated rectangles; issue, edit and PDF export work', async ({
  page,
}, testInfo) => {
  await page.goto('/portal/admin/certificates');
  await expect(page.locator('.template-card')).toHaveCount(4);
  await page.locator('[data-template=TRAINING-en]').click();
  await page.locator('.user-picker input').fill('Layla');
  await page.locator('.user-picker-item').click();
  await page.locator('#cert-program').fill('Leadership & Professional Development');
  await page.locator('#cert-hours').fill('32');
  await page.locator('#cert-date').fill('2026-09-21');
  await expect(page.locator('.studio-preview img')).toBeVisible();
  await expect(page.locator('.studio-actions button[type=submit]')).toBeEnabled();
  await page.screenshot({ path: testInfo.outputPath('training-studio.png'), fullPage: true });

  const differences = await page.locator('.studio-preview img').evaluate(async (element, boxes) => {
    const preview = element as HTMLImageElement;
    const background = new Image();
    background.src = '/certificates/training-en-v2.png';
    await background.decode();
    const make = () => {
      const c = document.createElement('canvas');
      c.width = preview.naturalWidth;
      c.height = preview.naturalHeight;
      return c;
    };
    const a = make(),
      b = make();
    const ca = a.getContext('2d')!,
      cb = b.getContext('2d')!;
    ca.drawImage(preview, 0, 0);
    cb.scale(b.width / 1800, b.height / 1273);
    cb.drawImage(background, 0, 0, 1800, 1273);
    const pa = ca.getImageData(0, 0, a.width, a.height).data,
      pb = cb.getImageData(0, 0, b.width, b.height).data;
    let outside = 0,
      inside = 0;
    for (let y = 0; y < a.height; y++)
      for (let x = 0; x < a.width; x++) {
        const i = (y * a.width + x) * 4;
        if (pa[i] === pb[i] && pa[i + 1] === pb[i + 1] && pa[i + 2] === pb[i + 2]) continue;
        const dx = (x * 1800) / a.width,
          dy = (y * 1273) / a.height;
        if (
          boxes.some(
            (r) =>
              dx >= r.x - 2 && dx <= r.x + r.width + 2 && dy >= r.y - 2 && dy <= r.y + r.height + 2,
          )
        )
          inside++;
        else outside++;
      }
    return { inside, outside };
  }, Object.values(CERTIFICATE_TEMPLATES[1].fields));
  expect(differences.outside).toBe(0);
  expect(differences.inside).toBeGreaterThan(1000);

  const request = page.waitForRequest(
    (r) => r.url().endsWith('/api/admin/certificates') && r.method() === 'POST',
  );
  await page.locator('.studio-actions button[type=submit]').click();
  expect((await request).postDataJSON()).toEqual({
    user_id: user.id,
    certificate_type: 'TRAINING',
    certificate_language: 'en',
    partner_logos: [],
    recipient_name: user.full_name,
    program_name: record.program_name,
    training_hours: 32,
    issued_at: '2026-09-21',
  });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).first().click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('tamkeenova-training-en-TAM-0123456789ABCDEF.pdf');
  await download.saveAs(testInfo.outputPath('training.pdf'));

  await page.locator('.cell-actions button[aria-label]').first().click();
  await page.locator('#cert-recipient').fill('ليلى أحمد محمد عبد الرحمن');
  const patch = page.waitForRequest(
    (r) => r.method() === 'PATCH' && r.url().includes('/certificates/'),
  );
  await page.locator('.studio-actions button[type=submit]').click();
  expect((await patch).postDataJSON().recipient_name).toBe('ليلى أحمد محمد عبد الرحمن');
});

test('volunteer artwork has no program editor and handles Arabic on mobile', async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/portal/admin/certificates');
  await page.locator('[data-template=VOLUNTEER-ar]').click();
  await expect(page.locator('#cert-program')).toHaveCount(0);
  await page.locator('.user-picker input').fill('Layla');
  await page.locator('.user-picker-item').click();
  await page.locator('#cert-recipient').fill('ليلى أحمد محمد عبد الرحمن');
  await page.locator('#cert-hours').fill('80');
  await expect(page.locator('.studio-preview img')).toBeVisible();
  await expect(page.locator('.studio-actions button[type=submit]')).toBeEnabled();
  await page
    .locator('.studio-preview')
    .screenshot({ path: testInfo.outputPath('volunteer-mobile.png') });
  const artwork = await page.locator('.studio-preview img').getAttribute('src');
  const { writeFileSync } = await import('node:fs');
  writeFileSync(
    testInfo.outputPath('volunteer.png'),
    Buffer.from(artwork!.split(',')[1], 'base64'),
  );
  const request = page.waitForRequest(
    (r) => r.url().endsWith('/api/admin/certificates') && r.method() === 'POST',
  );
  await page.locator('.studio-actions button[type=submit]').click();
  expect((await request).postDataJSON()).toMatchObject({
    certificate_type: 'VOLUNTEER',
    certificate_language: 'ar',
    program_name: null,
    training_hours: 80,
  });
});

test('recipient downloads use the same versioned artwork and PNG renderer', async ({
  page,
}, testInfo) => {
  await page.goto('/portal/certificates');
  await expect(page.locator('.certificate-artwork')).toBeVisible();
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const download = await event;
  expect(download.suggestedFilename()).toBe('tamkeenova-training-en-TAM-0123456789ABCDEF.png');
  const file = testInfo.outputPath('training.png');
  await download.saveAs(file);
  const png = PNG.sync.read(readFileSync(file));
  expect(png.width).toBe(3508);
  const box = CERTIFICATE_TEMPLATES[1].fields.qr;
  const x = Math.floor((box.x * png.width) / 1800),
    y = Math.floor((box.y * png.height) / 1273);
  const size = Math.ceil((box.width * png.width) / 1800);
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const source = ((y + row) * png.width + x + col) * 4;
      pixels.set(png.data.subarray(source, source + 4), (row * size + col) * 4);
    }
  const qr = jsQR(pixels, size, size);
  expect(qr?.data).toBe(new URL('/verify?code=TAM-0123456789ABCDEF', page.url()).href);
});

test('RTL editor rejects overflowing text and contains keyboard focus', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('tamkeenova-lang', 'ar'));
  await page.goto('/portal/admin/certificates');
  await page.locator('.template-card').first().click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await page.locator('#cert-recipient').fill('W'.repeat(120));
  await expect(page.locator('.studio-preview [role=alert]')).toBeVisible();
  await expect(page.locator('.studio-actions button[type=submit]')).toBeDisabled();
  await page.locator('#cert-recipient').fill('أحمد محمد علي');
  await expect(page.locator('.studio-preview img')).toBeVisible();
  await expect(page.locator('.studio-actions button[type=submit]')).toBeEnabled();
  await page.locator('.studio-actions button[type=submit]').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.modal-head button').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.template-card').first()).toBeFocused();
});

for (const template of CERTIFICATE_TEMPLATES) {
  test(`${template.type} ${template.language}: partner snapshots, ordering and saved language`, async ({
    page,
  }, testInfo) => {
    await page.goto('/portal/admin/certificates');
    await page.locator(`[data-template=${template.type}-${template.language}]`).click();
    await page.locator('.user-picker input').fill('Layla');
    await page.locator('.user-picker-item').click();
    await page
      .locator('#cert-recipient')
      .fill(template.language === 'ar' ? 'ليلى أحمد محمد' : 'Layla Ahmed Hassan');
    if (template.type === 'TRAINING')
      await page
        .locator('#cert-program')
        .fill(
          template.language === 'ar'
            ? 'القيادة والتطوير المهني'
            : 'Leadership & Professional Development',
        );
    await page.locator('#cert-hours').fill('48');
    await page.locator('#cert-date').fill('2026-09-22');
    for (let i = 0; i < 4; i++) {
      await page.locator('.partner-choice').nth(i).click();
      await expect(page.locator('.selected-partners li')).toHaveCount(i + 1);
      await expect(page.locator('.studio-actions button[type=submit]')).toBeEnabled();
    }
    await expect(page.locator('.partner-choice').nth(4)).toBeDisabled();
    await page
      .locator('.selected-partners li')
      .first()
      .getByRole('button', { name: /Move logo later/ })
      .click();
    await expect(page.locator('.selected-partners li').first()).toContainText(
      template.language === 'ar' ? 'شريك تجريبي 2' : 'Sample partner 2',
    );
    await expect(page.locator('.studio-actions button[type=submit]')).toBeEnabled();
    const outside = await page.locator('.studio-preview img').evaluate(
      async (element, data) => {
        const img = element as HTMLImageElement;
        const bg = new Image();
        bg.src = data.artwork;
        await bg.decode();
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const actual = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        ctx.scale(canvas.width / 1800, canvas.height / 1273);
        ctx.drawImage(bg, 0, 0, 1800, 1273);
        const expected = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let differences = 0;
        for (let y = 0; y < canvas.height; y++)
          for (let x = 0; x < canvas.width; x++) {
            const dx = (x * 1800) / canvas.width,
              dy = (y * 1273) / canvas.height;
            if (
              data.boxes.some(
                (b) =>
                  dx >= b.x - 2 &&
                  dx <= b.x + b.width + 2 &&
                  dy >= b.y - 2 &&
                  dy <= b.y + b.height + 2,
              )
            )
              continue;
            const i = (y * canvas.width + x) * 4;
            if (
              actual[i] !== expected[i] ||
              actual[i + 1] !== expected[i + 1] ||
              actual[i + 2] !== expected[i + 2]
            )
              differences++;
          }
        return differences;
      },
      { artwork: template.partnerArtwork!, boxes: Object.values(template.fields) },
    );
    expect(outside).toBe(0);
    const preview = await page.locator('.studio-preview img').getAttribute('src');
    writeFileSync(
      testInfo.outputPath(`${template.type.toLowerCase()}-${template.language}-partners.png`),
      Buffer.from(preview!.split(',')[1], 'base64'),
    );
    const request = page.waitForRequest(
      (r) => r.url().endsWith('/api/admin/certificates') && r.method() === 'POST',
    );
    await page.locator('.studio-actions button[type=submit]').click();
    const payload = (await request).postDataJSON();
    expect(payload.certificate_language).toBe(template.language);
    expect(payload.partner_logos).toHaveLength(4);
    expect(payload.partner_logos[0].source_id).toBe('550e8400-e29b-41d4-a716-446655440002');
    for (const logo of payload.partner_logos) {
      expect(logo.data_url).toMatch(/^data:image\/png;base64,/);
      expect(logo.data_url.length).toBeLessThanOrEqual(90000);
    }
    expect(payload).not.toHaveProperty('template_version');
  });
}

test('direct logo uploads can be removed, and corrupt uploads block issue until dismissed', async ({
  page,
}) => {
  await page.goto('/portal/admin/certificates');
  await page.locator('[data-template=TRAINING-en]').click();
  const file = page.locator('#certificate-partner-files');
  await file.setInputFiles({
    name: 'Logo.png',
    mimeType: 'image/png',
    buffer: readFileSync('public/certificates/brand-mark.png'),
  });
  await expect(page.locator('.selected-partners li')).toHaveCount(1);
  await expect(page.locator('.studio-actions button[type=submit]')).toBeEnabled();
  await page
    .locator('.selected-partners')
    .getByRole('button', { name: /Remove logo/ })
    .click();
  await expect(page.locator('.selected-partners li')).toHaveCount(0);
  await file.setInputFiles({
    name: 'broken.png',
    mimeType: 'image/png',
    buffer: Buffer.from('not a png'),
  });
  await expect(page.locator('.studio-fields [role=alert]')).toBeVisible();
  await expect(page.locator('.studio-actions button[type=submit]')).toBeDisabled();
  await page.getByRole('button', { name: 'Skip this image' }).click();
  await expect(page.locator('.studio-actions button[type=submit]')).toBeEnabled();
});

test('the previous bilingual edition remains downloadable without adopting a new design', async ({
  page,
}, testInfo) => {
  await page.route('**/api/students/certificates', (route) =>
    route.fulfill({
      json: {
        data: [
          {
            ...record,
            template_version: '2026.1',
            certificate_language: null,
            partner_logos: null,
          },
        ],
      },
    }),
  );
  await page.goto('/portal/certificates');
  await expect(page.locator('.certificate-artwork')).toHaveAttribute(
    'src',
    '/certificates/training-v1-thumb.png',
  );
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const download = await event;
  expect(download.suggestedFilename()).toBe('tamkeenova-training-TAM-0123456789ABCDEF.png');
  await download.saveAs(testInfo.outputPath('legacy.png'));
});

test('unavailable library images never silently issue an incomplete partner selection', async ({
  page,
}) => {
  await page.route('**/images/partners/partners1.png', (route) => route.abort());
  await page.goto('/portal/admin/certificates');
  await page.locator('[data-template=TRAINING-en]').click();
  await page.locator('.partner-choice').first().click();
  await expect(page.locator('.studio-fields [role=alert]')).toContainText('could not be loaded');
  await expect(page.locator('.selected-partners li')).toHaveCount(0);
  await expect(page.locator('.studio-actions button[type=submit]')).toBeDisabled();
  await page.getByRole('button', { name: 'Skip this image' }).click();
  await expect(page.locator('.studio-actions button[type=submit]')).toBeEnabled();
});

test('recipient Arabic exports contain persisted partner pixels without consulting the live library', async ({
  page,
}, testInfo) => {
  const pngLogo = new PNG({ width: 120, height: 48 });
  for (let i = 0; i < pngLogo.data.length; i += 4) pngLogo.data.set([170, 20, 40, 255], i);
  const logo = {
    name: 'Saved partner',
    data_url: 'data:image/png;base64,' + PNG.sync.write(pngLogo).toString('base64'),
  };
  await page.route('**/api/students/certificates', (route) =>
    route.fulfill({
      json: { data: [{ ...record, certificate_language: 'ar', partner_logos: [logo] }] },
    }),
  );
  await page.goto('/portal/certificates');
  await expect(page.locator('.certificate-artwork')).toHaveAttribute(
    'src',
    '/certificates/training-ar-v2-thumb.png',
  );
  const pngEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PNG' }).click();
  const download = await pngEvent;
  expect(download.suggestedFilename()).toContain('-ar-');
  const file = testInfo.outputPath('persisted-arabic-partner.png');
  await download.saveAs(file);
  const result = PNG.sync.read(readFileSync(file));
  const band = CERTIFICATE_TEMPLATES[0].fields.partners!;
  const x = Math.round(((band.x + band.width / 2) * result.width) / 1800);
  const y = Math.round(((band.y + band.height / 2) * result.height) / 1273);
  const index = (y * result.width + x) * 4;
  expect([...result.data.subarray(index, index + 4)]).toEqual([170, 20, 40, 255]);
  const event = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).click();
  const pdf = await event;
  const pdfFile = testInfo.outputPath('persisted-arabic-partner.pdf');
  await pdf.saveAs(pdfFile);
  expect(readFileSync(pdfFile).subarray(0, 5).toString()).toBe('%PDF-');
});

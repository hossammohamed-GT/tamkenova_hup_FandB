import { readFileSync } from 'node:fs';
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
  template_version: '2026.1',
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
    if (path === '/api/admin/users') response = { data: [user] };
    if (path === '/api/students/certificates') response = { data: [record] };
    await route.fulfill({ json: response });
  });
});

test('training preview changes only designated rectangles; issue, edit and PDF export work', async ({
  page,
}, testInfo) => {
  await page.goto('/portal/admin/certificates');
  await expect(page.locator('.template-card')).toHaveCount(2);
  await page.locator('.template-card').first().click();
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
    background.src = '/certificates/training-v1.png';
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
  }, Object.values(CERTIFICATE_TEMPLATES[0].fields));
  expect(differences.outside).toBe(0);
  expect(differences.inside).toBeGreaterThan(1000);

  const request = page.waitForRequest(
    (r) => r.url().endsWith('/api/admin/certificates') && r.method() === 'POST',
  );
  await page.locator('.studio-actions button[type=submit]').click();
  expect((await request).postDataJSON()).toEqual({
    user_id: user.id,
    certificate_type: 'TRAINING',
    recipient_name: user.full_name,
    program_name: record.program_name,
    training_hours: 32,
    issued_at: '2026-09-21',
  });
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF' }).first().click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('tamkeenova-training-TAM-0123456789ABCDEF.pdf');
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
  await page.locator('.template-card').last().click();
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
  expect(download.suggestedFilename()).toBe('tamkeenova-training-TAM-0123456789ABCDEF.png');
  const file = testInfo.outputPath('training.png');
  await download.saveAs(file);
  const png = PNG.sync.read(readFileSync(file));
  expect(png.width).toBe(3508);
  const box = CERTIFICATE_TEMPLATES[0].fields.qr;
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

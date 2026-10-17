import { test, expect, Page } from '@playwright/test';
const names = [
  'business-professional-skills',
  'technology-innovation',
  'arts-design-media',
  'wellbeing',
  'lifestyle',
  'education-academics',
  'family-relationships',
  'languages',
  'soft-skills',
];
async function setup(page: Page, language = 'en', role = 'ADMIN') {
  await page.addInitScript(
    ({ language, role }) => {
      localStorage.setItem('tamkeenova-lang', language);
      localStorage.setItem('tamkeenova-theme', 'light');
      localStorage.setItem('token', 'test-only');
      localStorage.setItem('user', JSON.stringify({ id: 'user', role, full_name: 'Test Admin' }));
    },
    { language, role },
  );
  await page.route(/^https:\/\//, (r) => r.abort());
  let rows = names.map((slug, index) => ({
    id: `11111111-1111-4111-a111-${String(index + 1).padStart(12, '0')}`,
    slug,
    name_ar: `تصنيف ${index + 1}`,
    name_en: `Category ${index + 1}`,
    is_active: true,
    parent_id: null as string | null,
    display_order: index + 1,
    image_url: `/assets/course-categories/${slug}.jpg`,
    description_ar: '',
    description_en: '',
    _count: { course_links: index === 0 ? 1 : 0, children: 0, learning_programs: 0 },
  }));
  const writes: { method: string; path: string; body: any }[] = [];
  let invalid = false,
    failDelete = false;
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      p = new URL(req.url()).pathname.replace('/api', ''),
      method = req.method();
    const body = req.headers()['content-type']?.includes('application/json')
      ? req.postDataJSON()
      : null;
    let data: any = [];
    if (p.startsWith('/admin/course-categories')) {
      if (method === 'GET') data = rows;
      else {
        writes.push({ method, path: p, body });
        if (p.endsWith('/image'))
          data = { image_url: '/assets/course-categories/technology-innovation.jpg' };
        else if (method === 'POST') {
          if (invalid)
            return route.fulfill({
              status: 400,
              json: { field_errors: { slug: ['الرابط مستخدم / Slug already in use'] } },
            });
          const row = {
            ...body,
            id: '22222222-2222-4222-a222-222222222222',
            _count: { course_links: 0, children: 0, learning_programs: 0 },
          };
          rows.push(row);
          data = row;
        } else {
          const id = p.split('/')[3],
            row = rows.find((r) => r.id === id)!;
          if (method === 'DELETE') {
            if (failDelete)
              return route.fulfill({
                status: 409,
                json: { message: 'Category has references; hide instead' },
              });
            rows = rows.filter((r) => r.id !== id);
          } else {
            Object.assign(row, body);
            data = row;
          }
        }
      }
    } else if (p === '/courses/categories')
      data = rows
        .filter((r) => r.is_active && !r.parent_id)
        .sort((a, b) => a.display_order - b.display_order)
        .map((r) => ({ ...r, children: rows.filter((c) => c.parent_id === r.id && c.is_active) }));
    else if (p === '/auth/me')
      data = { id: 'user', role, full_name: 'Test Admin', email_verified: true, is_active: true };
    else if (p === '/auth/me/status') data = { status: 'APPROVED', role };
    return route.fulfill({
      json: { success: true, data, meta: { total: 0, total_pages: 1, page: 1 } },
    });
  });
  return {
    writes,
    getRows: () => rows,
    invalid: (v: boolean) => (invalid = v),
    failDelete: (v: boolean) => (failDelete = v),
  };
}
for (const [language, width] of [
  ['en', 1440],
  ['ar', 320],
] as const) {
  test(`admin adds category with image; mounted menu and public catalog update without a reload: ${language}, ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const { writes } = await setup(page, language);
    await page.goto('/portal/admin/course-categories');
    await expect(page.locator('.category-row')).toHaveCount(9);
    await page
      .getByRole('button', {
        name: language === 'ar' ? 'تصنيف جديد' : 'New category',
        exact: true,
      })
      .click();
    const form = page.locator('app-course-categories form');
    await form.locator('[name=name_ar]').fill('إدارة الغذاء');
    await form.locator('[name=name_en]').fill('Food management');
    await form.locator('[name=slug]').fill('food-management');
    await form.locator('[name=description_ar]').fill('وصف حقيقي');
    await form.locator('[name=description_en]').fill('A real category description');
    await form.locator('[name=image_url]').fill('/assets/course-categories/soft-skills.jpg');
    await form.locator('[name=display_order]').fill('0');
    await page.screenshot({ path: info.outputPath('category-editor.png'), fullPage: true, animations: 'disabled' });
    await form
      .getByRole('button', {
        name: language === 'ar' ? 'حفظ التصنيف' : 'Save category',
        exact: true,
      })
      .click();
    await expect(page.locator('.category-row')).toHaveCount(10);
    expect(writes[0].body).toMatchObject({
      slug: 'food-management',
      display_order: 0,
      image_url: '/assets/course-categories/soft-skills.jpg',
      name_ar: 'إدارة الغذاء',
    });
    if (width > 1040) await page.locator('#programs-menu-trigger').click();
    else {
      await page.locator('.menu-toggle').click();
      await page.locator('.mobile-programs-link').click();
    }
    const menu = page.locator('.programs-mega');
    await expect(menu.locator('.mega-category')).toHaveCount(10);
    await expect(menu.locator('.mega-category').first()).toContainText(
      language === 'ar' ? 'إدارة الغذاء' : 'Food management',
    );
    await menu.locator('.mega-category').first().click();
    await menu.locator('.mega-heading>a').click();
    await expect(page.locator('#selected-category-heading')).toHaveText(
      language === 'ar' ? 'إدارة الغذاء' : 'Food management',
    );
    await page.locator('.category-back-button').click();
    await expect(page.locator('button.category-tile')).toHaveCount(10);
    await expect(page.locator('button.category-tile').first()).toHaveAttribute(
      'data-category',
      'food-management',
    );
    await expect(
      page.locator('[data-category=food-management] app-category-artwork image').first(),
    ).toHaveAttribute('href', '/assets/course-categories/soft-skills.jpg');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath('managed-category-catalog.png'),
      fullPage: true,
      animations: 'disabled',
    });
  });
}
test('editing, hiding, showing and confirmed deletion preserve associations', async ({ page }) => {
  const state = await setup(page);
  await page.goto('/portal/admin/course-categories');
  const first = page.locator('.category-row').first();
  await expect(first.getByRole('button', { name: 'Delete', exact: true })).toBeDisabled();
  await first.getByRole('button', { name: 'Hide', exact: true }).click();
  await expect(first.locator('.status')).toHaveText('Hidden');
  expect(state.getRows()[0]._count.course_links).toBe(1);
  await first.getByRole('button', { name: 'Show', exact: true }).click();
  await expect(first.locator('.status')).toHaveText('Visible');
  const second = page.locator('.category-row').nth(1);
  await second.getByRole('button', { name: 'Edit', exact: true }).click();
  const form = page.locator('app-course-categories form');
  await form.locator('[name=name_en]').fill('Edited category');
  await form.getByRole('button', { name: 'Save category', exact: true }).click();
  await expect(second).toContainText('Edited category');
  await second.getByRole('button', { name: 'Delete', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.writes.some((w) => w.method === 'DELETE')).toBe(false);
  await second.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(dialog).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await second.getByRole('button', { name: 'Delete', exact: true }).click();
  await dialog.getByRole('button', { name: 'Confirm deletion', exact: true }).click();
  await expect(page.locator('.category-row')).toHaveCount(8);
  expect(state.writes.filter((w) => w.method === 'DELETE')).toHaveLength(1);
});
test('image upload and server field errors keep entries and show errors beside the field', async ({
  page,
}) => {
  const state = await setup(page);
  await page.goto('/portal/admin/course-categories');
  await page.getByRole('button', { name: 'New category', exact: true }).click();
  const form = page.locator('app-course-categories form');
  await form.locator('[name=name_ar]').fill('صورة');
  await form.locator('[name=name_en]').fill('Image');
  await form.locator('[name=slug]').fill('image-category');
  await form
    .locator('input[type=file]')
    .setInputFiles({ name: 'wrong.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') });
  await expect(form.locator('[name=image_url]')).toHaveAttribute('aria-invalid', 'true');
  expect(state.writes).toHaveLength(0);
  await form
    .locator('input[type=file]')
    .setInputFiles({
      name: 'image.png',
      mimeType: 'image/png',
      buffer: Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
        'base64',
      ),
    });
  await expect(form.locator('[name=image_url]')).toHaveValue(
    '/assets/course-categories/technology-innovation.jpg',
  );
  state.invalid(true);
  await form.getByRole('button', { name: 'Save category', exact: true }).click();
  await expect(form.locator('[name=slug]')).toHaveAttribute('aria-invalid', 'true');
  await expect(form.locator('[name=name_en]')).toHaveValue('Image');
  const errorId = await form.locator('[name=slug]').getAttribute('aria-describedby');
  await expect(form.locator(`[id="${errorId}"]`)).toContainText('Slug already in use');
  expect(state.writes[0].path).toBe('/admin/course-categories/image');
});
test('a concurrent delete conflict keeps the row and presents the actionable error', async ({
  page,
}) => {
  const state = await setup(page);
  state.failDelete(true);
  await page.goto('/portal/admin/course-categories');
  await page
    .locator('.category-row')
    .nth(1)
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Confirm deletion', exact: true })
    .click();
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.locator('.category-admin>.error')).toBeVisible();
  await expect(page.locator('.category-admin>.error')).toContainText('hide instead');
  await expect(page.locator('.category-row')).toHaveCount(9);
});
test('a learner cannot open category management even if their cached role is admin', async ({
  page,
}) => {
  await setup(page, 'en', 'STUDENT');
  await page.addInitScript(() =>
    localStorage.setItem('user', JSON.stringify({ id: 'user', role: 'ADMIN' })),
  );
  await page.goto('/portal/admin/course-categories');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('app-course-categories')).toHaveCount(0);
});

test('hiding a parent refreshes an already mounted menu and preserves its child records', async ({
  page,
}) => {
  const state = await setup(page),
    rows = state.getRows();
  rows[1].parent_id = rows[0].id;
  rows[0]._count.children = 1;
  await page.goto('/portal/admin/course-categories');
  await expect(page.locator('.programs-mega .mega-category')).toHaveCount(8);
  await page
    .locator('.category-row')
    .first()
    .getByRole('button', { name: 'Hide', exact: true })
    .click();
  await expect(page.locator('.programs-mega .mega-category')).toHaveCount(7);
  expect(state.getRows()).toHaveLength(9);
  expect(state.getRows()[1].parent_id).toBe(rows[0].id);
  const child = page.locator('.category-row').nth(1);
  await expect(child.locator('.status')).toHaveText('Hidden');
  await expect(child.getByRole('button', { name: 'Show', exact: true })).toHaveCount(0); // Child itself stays active; inherited hiding is reversible.
  await page
    .locator('.category-row')
    .first()
    .getByRole('button', { name: 'Show', exact: true })
    .click();
  await expect(page.locator('.programs-mega .mega-category')).toHaveCount(8);
  await expect(child.locator('.status')).toHaveText('Visible');
});

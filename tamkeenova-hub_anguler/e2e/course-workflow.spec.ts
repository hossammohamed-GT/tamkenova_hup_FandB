import { test, expect, Page } from '@playwright/test';
// Explicit local API fixtures: no actual bank transfers, publication or database writes.
const id = '11111111-1111-4111-a111-111111111111';
const sample = {
  id,
  slug: 'instructor-course',
  title_ar: 'القيادة العملية وتطوير المهارات',
  title_en: 'Practical Leadership',
  description_ar: 'شرح الكورس',
  description_en: 'Course description',
  is_free: false,
  price: 125.5,
  status: 'DRAFT',
  review_status: 'PENDING',
  revision: 3,
  duration_minutes: 90,
  lessons_count: 1,
  language: 'ar',
  level: 'BEGINNER',
  content_type: 'VIDEO',
  ratings_count: 0,
  average_rating: 0,
  preview_video_url: 'https://youtu.be/5BciHXh074k',
  cover_image_url: '/assets/course-categories/soft-skills.jpg',
  owner: { users: { full_name: 'Test Instructor' } },
  sections: [
    {
      id: 'section',
      title_ar: 'أساسيات القيادة',
      title_en: 'Leadership foundations',
      position: 0,
      lessons: [
        {
          id: 'lesson',
          title_ar: 'الدرس الأول',
          title_en: 'First lesson',
          media_url: 'https://youtu.be/5BciHXh074k',
          duration_minutes: 90,
          is_preview: false,
        },
      ],
    },
  ],
  lessons: [
    {
      id: 'lesson',
      section_id: 'section',
      title_ar: 'الدرس الأول',
      title_en: 'First lesson',
      media_url: null,
      duration_minutes: 90,
      is_preview: false,
      position: 0,
    },
  ],
};
const report = {
  id: 'payment',
  course_id: id,
  status: 'PENDING',
  method: 'INSTAPAY',
  recipient_account: 'test-only@instapay',
  expected_amount: 125.5,
  reported_amount: 125.5,
  sender_account: 'test-sender',
  transferred_at: '2026-10-17T07:00:00Z',
  transfer_reference: 'TEST-REF',
  created_at: '2026-10-17T07:00:00Z',
  users: { full_name: 'Test Learner', email: 'learner@example.test' },
  courses: sample,
};
const cert = {
  id: 'cert',
  recipient_name: 'ليلى أحمد',
  program_name: sample.title_ar,
  certificate_language: 'ar',
  title: 'Practical Leadership',
  template_version: '2026.3',
  certificate_type: 'TRAINING',
  issued_at: '2026-10-17',
  verification_code: 'TEST-VERIFY',
  is_valid: true,
  training_hours: 2,
  partner_logos: [],
  description: JSON.stringify({
    schema: 'tamkeenova.certificate/2026.3',
    recipient_name_ar: 'ليلى أحمد',
    recipient_name_en: 'Layla Ahmed',
    program_name_ar: sample.title_ar,
    program_name_en: sample.title_en,
    signature_name: 'Test Instructor',
  }),
};
async function setup(page: Page, role = 'STUDENT', language = 'en', enabled = true) {
  await page.addInitScript(
    ({ role, language }) => {
      localStorage.setItem('token', 'test-only');
      localStorage.setItem('user', JSON.stringify({ id: 'user', role, full_name: 'Test User' }));
      localStorage.setItem('tamkeenova-lang', language);
      localStorage.setItem('tamkeenova-theme', 'light');
    },
    { role, language },
  );
  const calls: { path: string; body: any }[] = [];
  const state = {
    review: 'PENDING',
    pending: false,
    enrolled: false,
    progress: 0,
    completion: 'NOT_REQUESTED',
    certificate: false,
    learning: false,
    free: false,
  };
  await page.route(/^https:\/\//, (route) => route.abort());
  await page.route('**/api/**', (route) => {
    const req = route.request(),
      p = new URL(req.url()).pathname.replace('/api', ''),
      body = req.method() === 'GET' ? null : req.postDataJSON();
    if (body) calls.push({ path: p, body });
    const course = {
      ...sample,
      review_status: state.review,
      is_free: state.free,
      price: state.free ? 0 : sample.price,
    };
    const enrollment = {
      id: 'enrollment',
      course_id: id,
      status: state.certificate ? 'COMPLETED' : 'ACTIVE',
      progress: state.progress,
      completion_state: state.completion,
      courses: course,
      users: report.users,
      recipient_name_ar: 'ليلى أحمد',
      recipient_name_en: 'Layla Ahmed',
      lesson_progress: state.progress ? [{ lesson_id: 'lesson' }] : [],
      certificate: state.certificate ? cert : null,
    };
    let data: any = { success: true, data: [] };
    if (p.endsWith('/application-status')) data = { success: true, data: { status: 'APPROVED' } };
    if (p === '/auth/me')
      data = { success: true, data: { id: 'user', role, full_name: 'Test User' } };
    if (p === '/courses/categories')
      data = {
        success: true,
        data: [
          {
            id: 'category',
            name_ar: 'المهارات الشخصية',
            name_en: 'Soft Skills',
            slug: 'soft-skills',
            children: [
              {
                id: 'child-category',
                name_ar: 'القيادة',
                name_en: 'Leadership',
                slug: 'leadership',
                parent_id: 'category',
              },
            ],
          },
        ],
      };
    if (p === '/courses/' + sample.slug)
      data = { success: true, data: { ...course, status: 'PUBLISHED' } };
    if (p.endsWith('/access'))
      data = { success: true, data: { can_watch: state.enrolled || state.learning } };
    if (p.endsWith('/playback'))
      data = { success: true, data: { id: 'lesson', media_url: 'https://youtu.be/5BciHXh074k' } };
    if (p.startsWith('/course-workflow')) {
      data = [];
      if (p.endsWith('/admin/settings'))
        data = {
          enabled,
          instapay: enabled ? 'test-only@instapay' : '',
          vodafone_cash: '',
          instructions_ar: '',
          instructions_en: '',
        };
      else if (p.endsWith('/trainer/courses'))
        data = req.method() === 'POST' ? { ...course, id } : [course];
      else if (p.includes('/trainer/courses/') && p.endsWith('/submit')) {
        state.review = 'PENDING';
        data = { submitted: true };
      } else if (p.includes('/admin/courses/') && p.endsWith('/review')) {
        state.review = body.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        data = { reviewed: true };
      } else if (p.endsWith('/admin/courses')) data = state.review === 'PENDING' ? [course] : [];
      else if (/\/(trainer|admin)\/courses\/[^/]+$/.test(p)) data = course;
      else if (p.endsWith('/trainer/completions'))
        data = [{ ...enrollment, progress: 100, completion_state: 'PENDING' }];
      else if (p.includes('/trainer/completions/')) {
        state.certificate = true;
        data = { certificate: cert };
      } else if (p.endsWith('/admin/payments')) data = [report];
      else if (p.includes('/admin/payments/')) {
        state.enrolled = true;
        data = { reviewed: true };
      } else if (p.includes('/checkout/') && p.endsWith('/report')) {
        state.pending = true;
        data = report;
      } else if (p.includes('/checkout/'))
        data = {
          course: { ...course, status: 'PUBLISHED' },
          enrollment: state.enrolled ? enrollment : null,
          requests: state.pending ? [report] : [],
          payment_enabled: enabled,
          methods: enabled ? [{ method: 'INSTAPAY', account: 'test-only@instapay' }] : [],
          quote_token: enabled ? 'signed-test-quote' : null,
        };
      else if (p.endsWith('/free')) {
        state.enrolled = true;
        data = enrollment;
      } else if (p.endsWith('/library/payments')) data = state.pending ? [report] : [];
      else if (p.endsWith('/library')) data = [enrollment];
      else if (p.includes('/lessons/')) {
        state.progress = 100;
        data = { progress: 100 };
      } else if (p.endsWith('/completion')) {
        state.completion = 'PENDING';
        data = { requested: true };
      } else if (p.includes('/learning/')) {
        if (!state.learning)
          return route.fulfill({ status: 403, json: { message: 'Enrollment required' } });
        data = enrollment;
      }
    }
    return route.fulfill({ json: data });
  });
  return { calls, state };
}
for (const [language, width] of [
  ['en', 1440],
  ['ar', 390],
  ['ar', 320],
] as const) {
  test(`checkout is responsive and reports exact transfer details: ${language} ${width}px`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width, height: 1000 });
    const { calls } = await setup(page, 'STUDENT', language);
    await page.goto('/programs/course/' + sample.slug + '/checkout');
    await expect(page.locator('.account')).toHaveText('test-only@instapay');
    await expect(page.locator('.amount')).toContainText('125.5');
    await page.locator('input[name=sender]').fill('sender-account');
    await page.locator('input[name=amount]').fill('125.49');
    await page.locator('input[name=time]').fill('2026-10-17T09:00');
    await page.locator('input[name=reference]').fill('TRANSFER-ONLY-TEST');
    await page.locator('input[name=confirmed]').check();
    await page.locator('app-course-checkout form button[type=submit]').click();
    await expect(page.locator('main form')).toHaveCount(0);
    expect(calls.find((c) => c.path.endsWith('/report'))?.body).toMatchObject({
      quote_token: 'signed-test-quote',
      reported_amount: 125.49,
      sender_account: 'sender-account',
      transfer_reference: 'TRANSFER-ONLY-TEST',
    });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
    await expect(page.locator('.app-loader')).toHaveClass(/is-hidden/);
    await page.screenshot({
      animations: 'disabled',
      path: info.outputPath('checkout.png'),
      fullPage: true,
    });
  });
}
test('disabled checkout never solicits a transfer', async ({ page }) => {
  const { calls } = await setup(page, 'STUDENT', 'en', false);
  await page.goto('/programs/course/' + sample.slug + '/checkout');
  await expect(
    page.getByRole('heading', { name: 'Payment is currently unavailable' }),
  ).toBeVisible();
  await expect(page.locator('main form,main .account')).toHaveCount(0);
  expect(calls.some((c) => c.path.endsWith('/report'))).toBe(false);
});
test('trainer authors a bilingual course and submits it separately from saving', async ({
  page,
}) => {
  const { calls, state } = await setup(page, 'TRAINER');
  state.review = 'DRAFT';
  await page.goto('/portal/trainer/courses');
  await page.getByRole('button', { name: 'New course' }).click();
  await page.locator('[name=title_ar]').fill('كورس جديد');
  await page.locator('[name=title_en]').fill('New instructor course');
  await page.locator('[name=description_ar]').fill('وصف الكورس');
  await page.locator('[name=description_en]').fill('Course description');
  await page.locator('[name=category]').selectOption('category');
  await page.locator('[name=price]').fill('125.50');
  await page.locator('[name=intro]').fill('https://youtu.be/5BciHXh074k');
  await page.getByLabel('Arabic chapter title', { exact: true }).fill('الجزء الأول');
  await page.getByLabel('English chapter title', { exact: true }).fill('First chapter');
  await page.getByLabel('Arabic title', { exact: true }).last().fill('الدرس الأول');
  await page.getByLabel('English title', { exact: true }).last().fill('First lesson');
  await page.getByLabel('YouTube URL', { exact: true }).fill('https://youtu.be/5BciHXh074k');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(page.locator('main form')).toHaveCount(0);
  const saved = calls.find((c) => c.path.endsWith('/trainer/courses'))?.body;
  expect(saved).toMatchObject({ title_en: 'New instructor course', price: 125.5 });
  expect(saved.sections[0].lessons[0].media_url).toContain('youtu.be');
  expect(calls.some((c) => c.path.endsWith('/submit'))).toBe(false);
  await page.getByRole('button', { name: 'Submit for review', exact: true }).click();
  await expect(page.getByText('Submitted and all active admins notified.')).toBeVisible();
});
test('admin inspects lesson content before publishing the reviewed revision', async ({ page }) => {
  const { calls } = await setup(page, 'ADMIN');
  await page.goto('/portal/admin/course-workflow');
  await page.getByRole('button', { name: 'Open content & review' }).click();
  await expect(page.locator('app-youtube-player iframe')).toHaveAttribute(
    'src',
    /embed\/5BciHXh074k/,
  );
  await page.getByRole('button', { name: 'Approve & publish' }).click();
  expect(calls.find((c) => c.path.endsWith('/review'))?.body).toMatchObject({
    decision: 'APPROVE',
    revision: 3,
  });
  await expect(page.getByText('Course review saved.')).toBeVisible();
});
test('payment approval requires deliberate actual-receipt confirmation, not the learner report', async ({
  page,
}) => {
  const { calls } = await setup(page, 'ADMIN');
  await page.goto('/portal/admin/course-workflow?tab=payments');
  await page.getByRole('button', { name: 'Review transfer', exact: true }).click();
  const approve = page.getByRole('button', { name: 'Approve & activate course' });
  await expect(approve).toBeDisabled();
  await page.getByLabel('Actual amount received in EGP').fill('125.50');
  await page.getByLabel('Confirmed reference from your account').fill('REAL-ACCOUNT-REF-TEST');
  await expect(approve).toBeDisabled();
  await page.getByLabel('I verified receipt in the correct actual account.').check();
  await approve.click();
  expect(calls.find((c) => c.path.endsWith('/review'))?.body).toMatchObject({
    confirmed_amount: 125.5,
    confirmed_reference: 'REAL-ACCOUNT-REF-TEST',
    decision: 'APPROVE',
  });
});
test('admin configures receiving accounts, with no fabricated wallet number', async ({ page }) => {
  const { calls } = await setup(page, 'ADMIN', 'en', false);
  await page.goto('/portal/admin/course-workflow');
  await page.getByRole('button', { name: 'Payment settings', exact: true }).click();
  await expect(page.getByLabel('Vodafone Cash number')).toHaveValue('');
  await page.getByLabel('InstaPay address or phone').fill('test-only@instapay');
  await page.getByLabel('Enable payment reporting').check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  expect(calls.find((c) => c.path.endsWith('/admin/settings'))?.body).toEqual({
    enabled: true,
    vodafone_cash: '',
    instapay: 'test-only@instapay',
    instructions_ar: '',
    instructions_en: '',
  });
});
test('learner marks a lesson then requests instructor confirmation without receiving a certificate yet', async ({
  page,
}) => {
  const { calls, state } = await setup(page);
  state.learning = true;
  await page.goto('/programs/course/' + sample.slug);
  await page.locator('.lesson-button').click();
  await page.getByRole('button', { name: 'Mark this lesson complete' }).click();
  await page.getByLabel('Arabic recipient name').fill('ليلى أحمد');
  await page.getByLabel('English recipient name').fill('Layla Ahmed');
  await page.getByRole('button', { name: 'Request instructor completion approval' }).click();
  await expect(
    page.getByText('Your completion request is awaiting instructor review.', { exact: false }),
  ).toBeVisible();
  expect(calls.find((c) => c.path.endsWith('/completion'))?.body).toEqual({
    recipient_name_ar: 'ليلى أحمد',
    recipient_name_en: 'Layla Ahmed',
  });
  await expect(page.getByText('View & download certificate')).toHaveCount(0);
});
test('instructor completion approval drives issuance, with optional signature', async ({
  page,
}) => {
  const { calls } = await setup(page, 'TRAINER');
  await page.goto('/portal/trainer/courses');
  await page.getByLabel('Signature name — defaults to your profile name').fill('Test Instructor');
  await page.getByRole('button', { name: 'Approve & issue certificate' }).click();
  await expect(page.getByText('Completion approved and certificate issued.')).toBeVisible();
  expect(calls.find((c) => c.path.includes('/trainer/completions/'))?.body).toMatchObject({
    decision: 'APPROVE',
    signature_name: 'Test Instructor',
  });
});
test('owned library supports bilingual PDF downloads and existing verification', async ({
  page,
}, info) => {
  const { state } = await setup(page);
  state.certificate = true;
  state.progress = 100;
  await page.goto('/my-courses');
  await expect(page.getByRole('button', { name: 'PDF · العربية' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Verify certificate', exact: true })).toHaveAttribute(
    'href',
    '/verify?code=TEST-VERIFY',
  );
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'PDF · English' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.pdf$/);
  await expect(page.locator('.app-loader')).toHaveClass(/is-hidden/);
  await page.screenshot({
    animations: 'disabled',
    path: info.outputPath('library.png'),
    fullPage: true,
  });
});
test('guests are redirected to login with the original checkout destination', async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.route('**/api/**', (route) => route.fulfill({ json: { data: [] } }));
  await page.goto('/programs/course/' + sample.slug + '/checkout');
  await expect(page).toHaveURL(/\/login\?returnUrl=/);
  expect(new URL(page.url()).searchParams.get('returnUrl')).toBe(
    '/programs/course/' + sample.slug + '/checkout',
  );
});

test('free enrollment requires no payment details and opens learning', async ({ page }) => {
  const { calls, state } = await setup(page);
  state.free = true;
  await page.goto('/programs/course/' + sample.slug + '/checkout');
  await expect(page.locator('main .account')).toHaveCount(0);
  await page.getByRole('button', { name: 'Enroll for free', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Start learning' })).toBeVisible();
  expect(calls.find((c) => c.path.endsWith('/free'))).toBeTruthy();
  expect(calls.some((c) => c.path.endsWith('/report'))).toBe(false);
});
for (const role of ['TRAINER', 'ADMIN'])
  test(`Arabic mobile operations layout: ${role}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await setup(page, role, 'ar');
    await page.goto(
      role === 'TRAINER' ? '/portal/trainer/courses' : '/portal/admin/course-workflow',
    );
    if (role === 'TRAINER')
      await page.getByRole('button', { name: 'كورس جديد', exact: false }).click();
    else await page.getByRole('button', { name: 'فتح المحتوى والمراجعة' }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
    await expect(page.locator('.app-loader')).toHaveClass(/is-hidden/);
    await page.screenshot({
      animations: 'disabled',
      path: info.outputPath('operations-mobile.png'),
      fullPage: true,
    });
  });

test('trainer dashboard add-program action opens the actual catalog authoring form, not legacy enrollment', async ({
  page,
}) => {
  await setup(page, 'TRAINER');
  await page.goto('/portal/trainer');
  await page.getByRole('link', { name: 'Add course / program', exact: true }).click();
  await expect(page).toHaveURL(/\/portal\/trainer\/courses\?new=1/);
  await expect(page.getByRole('heading', { name: 'Course content editor' })).toBeVisible();
  await expect(page.locator('main a[href="/my-courses"]')).toHaveCount(0);
  await expect(page.getByLabel('Main category', { exact: true })).toBeVisible();
});
test('old instructor programs URL and learner routes consistently lead trainers to their authoring studio', async ({
  page,
}) => {
  await setup(page, 'TRAINER');
  for (const path of [
    '/portal/trainer/programs',
    '/my-courses',
    '/programs/course/' + sample.slug + '/checkout',
  ]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/portal\/trainer\/courses$/);
    await expect(page.getByRole('heading', { name: 'Courses & programs I teach' })).toBeVisible();
  }
});
test('trainer public course view has management actions, never enrollment/payment/completion actions', async ({
  page,
}) => {
  await setup(page, 'TRAINER');
  const learnerRequests: string[] = [];
  page.on('request', (req) => {
    if (/course-workflow\/(learning|checkout|library|enroll)/.test(req.url()))
      learnerRequests.push(req.url());
  });
  await page.goto('/programs/course/' + sample.slug);
  await expect(page.locator('app-course-learning-actions')).toHaveCount(0);
  await expect(page.locator('main a[href="/portal/trainer/courses"]')).toBeVisible();
  expect(learnerRequests).toEqual([]);
});
test('instructor authors detailed categorized content, reorders lessons and saves/submits once', async ({
  page,
}) => {
  const { calls } = await setup(page, 'TRAINER');
  await page.goto('/portal/trainer/courses?new=1');
  await page.locator('[name=title_ar]').fill('كورس قيادة حقيقي');
  await page.locator('[name=title_en]').fill('Real leadership course');
  await page.locator('[name=description_ar]').fill('وصف تفصيلي للكورس');
  await page.locator('[name=description_en]').fill('Full course description');
  await page.locator('[name=short_ar]').fill('نبذة تظهر في كارت الكورس');
  await page.locator('[name=short_en]').fill('Summary for the existing catalog card');
  await page.getByLabel('Main category', { exact: true }).selectOption('category');
  await page.getByLabel('Subcategory', { exact: true }).selectOption('child-category');
  await page.getByLabel('Content type', { exact: true }).selectOption('PODCOURSE');
  await page.locator('[name=intro]').fill('https://youtu.be/5BciHXh074k');
  await page.getByLabel('Arabic chapter title').fill('أساسيات');
  await page.getByLabel('English chapter title').fill('Foundations');
  const first = page.locator('.lesson-editor').first();
  await first.getByLabel('Arabic title', { exact: true }).fill('الدرس الأول');
  await first.getByLabel('English title', { exact: true }).fill('First lesson');
  await first.getByLabel('YouTube URL', { exact: true }).fill('https://youtu.be/5BciHXh074k');
  await first.getByLabel('Arabic lesson description').fill('تفاصيل الدرس الأول');
  await page.getByRole('button', { name: 'Add lesson', exact: false }).click();
  await expect(page.locator('.lesson-editor')).toHaveCount(2);
  const second = page.locator('.lesson-editor').nth(1);
  await second.getByLabel('Arabic title', { exact: true }).fill('الدرس الثاني');
  await second.getByLabel('English title', { exact: true }).fill('Second lesson');
  await second.getByLabel('YouTube URL', { exact: true }).fill('https://youtu.be/M7lc1UVf-VE');
  await expect(
    page.getByRole('button', { name: 'Save & submit for review', exact: true }),
  ).toBeEnabled();
  await second.getByRole('button', { name: 'Move lesson up', exact: false }).click();
  await expect(
    page.locator('.lesson-editor').first().getByLabel('English title', { exact: true }),
  ).toHaveValue('Second lesson');
  await expect(
    page.getByRole('button', { name: 'Save & submit for review', exact: true }),
  ).toBeEnabled();
  await page.getByRole('button', { name: 'Save & submit for review', exact: true }).click();
  await expect(
    page.getByText('Saved and submitted for admin review.', { exact: true }),
  ).toBeVisible();
  const saved = calls.find((c) => c.path.endsWith('/trainer/courses'))?.body;
  expect(saved).toMatchObject({
    category_id: 'child-category',
    content_type: 'PODCOURSE',
    short_description_en: 'Summary for the existing catalog card',
  });
  expect(saved.sections[0].lessons.map((l: any) => l.title_en)).toEqual([
    'Second lesson',
    'First lesson',
  ]);
  expect(saved.sections[0].lessons.map((l: any) => l.title_ar)).toEqual([
    'الدرس الثاني',
    'الدرس الأول',
  ]);
  expect(saved.sections[0].lessons[1].description_ar).toBe('تفاصيل الدرس الأول');
  expect(calls.filter((c) => c.path.endsWith('/trainer/courses'))).toHaveLength(1);
  expect(calls.filter((c) => c.path.endsWith('/submit'))).toHaveLength(1);
});

test('instructor can retry catalog category loading without inventing local categories', async ({
  page,
}) => {
  await setup(page, 'TRAINER');
  let available = false;
  await page.route('**/api/courses/categories', (route) =>
    route.fulfill({
      status: available ? 200 : 503,
      contentType: 'application/json',
      body: JSON.stringify(
        available
          ? {
              success: true,
              data: [
                {
                  id: 'real-category',
                  slug: 'real-category',
                  name_ar: 'مجال حقيقي',
                  name_en: 'Real catalog category',
                  children: [],
                },
              ],
            }
          : { message: 'Catalog unavailable' },
      ),
    }),
  );
  await page.goto('/portal/trainer/courses?new=1');
  await expect(page.getByRole('button', { name: 'Reload categories', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save draft', exact: true })).toBeDisabled();
  available = true;
  await page.getByRole('button', { name: 'Reload categories', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reload categories', exact: true })).toHaveCount(0);
  await page.getByLabel('Main category', { exact: true }).selectOption('real-category');
  await expect(page.getByLabel('Main category', { exact: true })).toHaveValue('real-category');
  await expect(page.locator('app-trainer-course-studio [role=alert]')).toHaveCount(0);
});

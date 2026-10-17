const { test } = require('node:test');
const assert = require('node:assert/strict');
const { retireDemoCourses } = require('../prisma/demo-catalog/manage.cjs');
test('demo retirement deletes only unused dual-marker demos, archives protected history, and is repeatable', async () => {
  const demo = (id) => ({
    id,
    slug: 'demo-catalog-v1-' + id,
    description_en: '[TAMKEENOVA_DEMO_CATALOG_V1] temporary',
    owner_trainer_id: null,
    status: 'PUBLISHED',
    _count: { enrollments: 0, reviews: 0, payments: 0, certificates: 0 },
  });
  let rows = [
    demo('unused'),
    demo('student'),
    demo('payment'),
    demo('certificate'),
    demo('review'),
    { ...demo('real'), description_en: 'Real course' },
    { ...demo('real-slug'), slug: 'real-slug' },
    demo('authored'),
  ];
  rows[1]._count.enrollments = 1;
  rows[2]._count.payments = 1;
  rows[3]._count.certificates = 1;
  rows[4]._count.reviews = 1;
  rows[7].owner_trainer_id = 'teacher';
  const matches = (r, w) =>
    r.slug.startsWith(w.slug.startsWith) &&
    r.description_en.startsWith(w.description_en.startsWith) &&
    (!w.id || w.id.in.includes(r.id)) &&
    (!w.status || r.status !== w.status.not) &&
    (!('owner_trainer_id' in w) || r.owner_trainer_id === w.owner_trainer_id);
  const tx = {
    courses: {
      findMany: async ({ where }) => rows.filter((r) => matches(r, where)),
      updateMany: async ({ where, data }) => {
        const selected = rows.filter((r) => matches(r, where));
        for (const r of selected) Object.assign(r, data);
        return { count: selected.length };
      },
      deleteMany: async ({ where }) => {
        const count = rows.filter((r) => matches(r, where)).length;
        rows = rows.filter((r) => !matches(r, where));
        return { count };
      },
    },
  };
  const db = {
    $transaction: async (fn, options) => {
      assert.equal(options.isolationLevel, 'Serializable');
      return fn(tx);
    },
  };
  assert.deepEqual(await retireDemoCourses(db), {
    deleted: 1,
    archived: 5,
    protected: 5,
  });
  assert.equal(rows.find((r) => r.id === 'real').status, 'PUBLISHED');
  assert.equal(rows.find((r) => r.id === 'real-slug').status, 'PUBLISHED');
  assert.equal(rows.find((r) => r.id === 'student').status, 'ARCHIVED');
  assert.deepEqual(await retireDemoCourses(db), {
    deleted: 0,
    archived: 0,
    protected: 5,
  });
});
test('cleanup errors propagate instead of claiming a partial success', async () => {
  await assert.rejects(
    retireDemoCourses({
      $transaction: async () => {
        throw new Error('DB offline');
      },
    }),
    /DB offline/,
  );
});

test('both demo seed CLIs refuse before attempting a database connection unless explicitly opted in', () => {
  const { spawnSync } = require('node:child_process');
  const { join } = require('node:path');
  const env = { ...process.env };
  delete env.ALLOW_DEMO_CATALOG_SEED;
  delete env.DATABASE_URL;
  delete env.DEMO_DATABASE_URL;
  for (const [file, args] of [
    ['demo-catalog/manage.cjs', ['seed']],
    ['course-videos/seed-demo.cjs', []],
  ]) {
    const result = spawnSync(
      process.execPath,
      [join(__dirname, '../prisma', file), ...args],
      { env, encoding: 'utf8' },
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /retired/);
    assert.doesNotMatch(result.stdout, /Connecting|Inserted|Prepared/);
  }
});

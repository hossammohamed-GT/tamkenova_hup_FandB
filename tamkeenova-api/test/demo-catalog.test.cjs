const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const base = join(__dirname, '..', 'prisma');
const seed = readFileSync(join(base, 'demo-catalog/seed.sql'), 'utf8');
const remove = readFileSync(join(base, 'demo-catalog/remove.sql'), 'utf8');
const fixture = JSON.parse(readFileSync(join(base, 'demo-catalog/courses.json'), 'utf8'));
async function setup() {
  const db = new PGlite();

  const schema = readFileSync(join(base, 'course-catalog.sql'), 'utf8').split('CREATE TABLE IF NOT EXISTS course_lessons')[0];
  await db.exec(schema + `
    CREATE TABLE course_category_links (course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
      category_id uuid REFERENCES course_categories(id), is_primary boolean, display_order integer,
      PRIMARY KEY(course_id, category_id));
    CREATE TABLE course_enrollments (course_id uuid REFERENCES courses(id));
    CREATE TABLE course_reviews (course_id uuid REFERENCES courses(id));
    COMMIT;`);
  for (const slug of new Set(fixture.map(c => c.category))) {
    await db.query('INSERT INTO course_categories(slug,name_en,name_ar) VALUES ($1,$1,$1)', [slug]);
  }
  return db;
}
test('seeds exactly three courses per active category with real local cover paths; reruns are additive', async () => {
  const db = await setup();
  try {
    await db.exec("INSERT INTO courses(slug,title_en,title_ar) VALUES ('real-course','Real','حقيقي')");
    await db.exec(seed); await db.exec(seed);
    const result = await db.query('SELECT category_id, count(*)::int AS n FROM course_category_links GROUP BY category_id');
    assert.equal(result.rows.length, 9);
    assert.ok(result.rows.every(row => row.n === 3));
    assert.equal((await db.query('SELECT count(*)::int AS n FROM courses')).rows[0].n, 28);
    assert.equal((await db.query('SELECT sum(ratings_count)::int AS n FROM courses')).rows[0].n, 0);
    for (const row of (await db.query("SELECT cover_image_url FROM courses WHERE slug != 'real-course'")).rows) {
      assert.ok(readFileSync(join(__dirname, '../../tamkeenova-hub_anguler/public', row.cover_image_url)).length > 1000);
    }
    await db.exec(remove);
    assert.deepEqual((await db.query('SELECT slug FROM courses')).rows, [{ slug: 'real-course' }]);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM course_categories')).rows[0].n, 9);
  } finally { await db.close(); }
});
test('future active categories receive three fallback courses; inactive categories are not seeded', async () => {
  const db = await setup();
  try {
    await db.exec("INSERT INTO course_categories(slug,name_en,name_ar) VALUES ('future-field','Future','مستقبلي'); INSERT INTO course_categories(slug,name_en,name_ar,is_active) VALUES ('hidden','Hidden','مخفي',false)");
    await db.exec(seed);
    assert.equal((await db.query('SELECT count(*)::int AS n FROM courses')).rows[0].n, 30);
    assert.equal((await db.query("SELECT count(*)::int AS n FROM courses WHERE slug LIKE '%hidden%' ")).rows[0].n, 0);
  } finally { await db.close(); }
});
test('cleanup is transactional and refuses to remove courses with learner history', async () => {
  const db = await setup();
  try {
    await db.exec(seed);
    await db.exec('INSERT INTO course_enrollments(course_id) SELECT id FROM courses LIMIT 1');
    await assert.rejects(db.exec(remove), /learner data/);
    await db.exec('ROLLBACK');
    assert.equal((await db.query('SELECT count(*)::int AS n FROM courses')).rows[0].n, 27);
  } finally { await db.close(); }
});
test('a real course using a reserved-looking slug is neither modified, linked nor deleted', async () => {
  const db = await setup();
  try {
    const slug = 'demo-catalog-v1-business-professional-skills-1';
    await db.query("INSERT INTO courses(slug,title_en,title_ar,description_en) VALUES ($1,'Real','حقيقي','Not seed data')", [slug]);
    await db.exec(seed); await db.exec(remove);
    assert.deepEqual((await db.query('SELECT slug, description_en FROM courses')).rows, [{ slug, description_en: 'Not seed data' }]);
  } finally { await db.close(); }
});

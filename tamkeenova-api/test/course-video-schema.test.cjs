const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
const statements = require('../prisma/course-videos/schema-statements.cjs');
test('additive chapters preserve old lessons, enforce course ownership, and cascade on course cleanup', async () => {
  const db = new PGlite();
  const one = '00000000-0000-4000-a000-000000000001',
    two = '00000000-0000-4000-a000-000000000002',
    chapter = '00000000-0000-4000-a000-000000000003';
  try {
    const initial = readFileSync(
      join(__dirname, '../prisma/course-catalog.sql'),
      'utf8',
    ).split('CREATE TABLE IF NOT EXISTS course_instructors')[0];
    await db.exec(initial + 'COMMIT;');
    await db.query(
      "INSERT INTO courses(id,slug,title_ar,title_en) VALUES ($1,'one','أ','A'),($2,'two','ب','B')",
      [one, two],
    );
    await db.query(
      "INSERT INTO course_lessons(course_id,title_ar,title_en,position) VALUES ($1,'قديم','Legacy',0)",
      [one],
    );
    for (let i = 0; i < 2; i++) {
      await db.exec('BEGIN');
      for (const statement of statements) await db.exec(statement);
      await db.exec('COMMIT');
    }
    assert.equal(
      (await db.query('SELECT section_id FROM course_lessons')).rows[0]
        .section_id,
      null,
    );
    await db.query(
      "INSERT INTO course_sections(id,course_id,title_ar,title_en) VALUES ($1,$2,'جزء','Chapter')",
      [chapter, one],
    );
    await assert.rejects(
      db.query(
        "INSERT INTO course_lessons(course_id,section_id,title_ar,title_en,position) VALUES ($1,$2,'خطأ','Wrong',1)",
        [two, chapter],
      ),
      /foreign key/i,
    );
    await db.query(
      "INSERT INTO course_lessons(course_id,section_id,title_ar,title_en,position) VALUES ($1,$2,'درس','Lesson',1)",
      [one, chapter],
    );
    await db.query('DELETE FROM courses WHERE id=$1', [one]);
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM course_sections')).rows[0]
        .n,
      0,
    );
    assert.equal(
      (await db.query('SELECT count(*)::int AS n FROM course_lessons')).rows[0]
        .n,
      0,
    );
    assert.equal(
      (await db.query('SELECT slug FROM courses')).rows[0].slug,
      'two',
    );
  } finally {
    await db.close();
  }
});

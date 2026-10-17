const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const statements = require('../prisma/course-workflow/schema-statements.cjs');
const { applyWorkflow } = require('../prisma/course-workflow/apply.cjs');
const u = '00000000-0000-4000-a000-000000000001',
  u2 = '00000000-0000-4000-a000-000000000002',
  c = '00000000-0000-4000-a000-000000000003',
  e = '00000000-0000-4000-a000-000000000004';
test('additive workflow DDL reruns safely and enforces payment, lesson and certificate uniqueness in PostgreSQL', async () => {
  const db = new PGlite();
  try {
    await db.exec(
      'CREATE TABLE users(id uuid PRIMARY KEY);CREATE TABLE trainers(id uuid PRIMARY KEY);CREATE TABLE certificates(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),title text)',
    );
    await db.exec(
      readFileSync(join(__dirname, '../prisma/course-catalog.sql'), 'utf8'),
    );
    await db.query('INSERT INTO users(id) VALUES($1),($2)', [u, u2]);
    await db.query(
      "INSERT INTO courses(id,slug,title_ar,title_en,status) VALUES($1,'legacy','قديم','Legacy','PUBLISHED')",
      [c],
    );
    await db.query(
      "INSERT INTO certificates(title) VALUES('Legacy certificate')",
    );
    for (let run = 0; run < 2; run++) {
      await db.exec('BEGIN');
      for (const sql of statements) await db.exec(sql);
      await db.exec('COMMIT');
    }
    assert.equal(
      (await db.query('SELECT enabled FROM course_checkout_settings')).rows[0]
        .enabled,
      false,
    );
    assert.equal(
      (await db.query('SELECT title FROM certificates')).rows[0].title,
      'Legacy certificate',
    );
    assert.equal(
      (await db.query('SELECT status FROM courses')).rows[0].status,
      'PUBLISHED',
    );
    const insert =
      "INSERT INTO course_payment_requests(user_id,course_id,method,recipient_account,expected_amount,reported_amount,sender_account,transferred_at) VALUES($1,$2,'INSTAPAY','test-only@instapay',100,100,'sender',now()) RETURNING id";
    const first = (await db.query(insert, [u, c])).rows[0].id;
    await assert.rejects(db.query(insert, [u, c]), /unique/i);

    assert.equal(
      (await db.query('SELECT count(*)::int n FROM course_enrollments')).rows[0]
        .n,
      0,
    );
    await db.query(
      "UPDATE course_payment_requests SET status='REJECTED' WHERE id=$1",
      [first],
    );
    const second = (await db.query(insert, [u, c])).rows[0].id;
    const approve =
      "UPDATE course_payment_requests SET status='APPROVED',confirmed_reference='BANK-123',confirmed_amount=100 WHERE id=$1 AND status='PENDING' RETURNING id";
    assert.equal((await db.query(approve, [second])).rows.length, 1);
    assert.equal((await db.query(approve, [second])).rows.length, 0);
    const other = (await db.query(insert, [u2, c])).rows[0].id;
    await assert.rejects(db.query(approve, [other]), /unique/i);
    await assert.rejects(
      db.query(
        'UPDATE course_payment_requests SET reported_amount=-1 WHERE id=$1',
        [first],
      ),
      /check/i,
    );
    await assert.rejects(
      db.query("UPDATE course_payment_requests SET method='FAKE' WHERE id=$1", [
        first,
      ]),
      /check/i,
    );
    await db.query(
      'INSERT INTO course_enrollments(id,user_id,course_id) VALUES($1,$2,$3)',
      [e, u, c],
    );
    const lesson = (
      await db.query(
        "INSERT INTO course_lessons(course_id,title_ar,title_en,position) VALUES($1,'درس','Lesson',0) RETURNING id",
        [c],
      )
    ).rows[0].id;
    await db.query(
      'INSERT INTO course_lesson_progress(enrollment_id,lesson_id) VALUES($1,$2)',
      [e, lesson],
    );
    await assert.rejects(
      db.query(
        'INSERT INTO course_lesson_progress(enrollment_id,lesson_id) VALUES($1,$2)',
        [e, lesson],
      ),
      /unique/i,
    );
    await db.query(
      "INSERT INTO certificates(title,course_id,course_enrollment_id) VALUES('New certificate',$1,$2)",
      [c, e],
    );
    await assert.rejects(
      db.query(
        "INSERT INTO certificates(title,course_id,course_enrollment_id) VALUES('Duplicate',$1,$2)",
        [c, e],
      ),
      /unique/i,
    );

    await db.query(
      "UPDATE courses SET status='DRAFT',review_status='PENDING' WHERE id=$1",
      [c],
    );
    const review =
      "UPDATE courses SET status='PUBLISHED',review_status='APPROVED' WHERE id=$1 AND revision=1 AND review_status='PENDING' RETURNING id";
    assert.equal((await db.query(review, [c])).rows.length, 1);
    assert.equal((await db.query(review, [c])).rows.length, 0);
  } finally {
    await db.close();
  }
});
test('workflow helper uses one bounded atomic transaction and executes only constant DDL', async () => {
  let calls = 0;
  await applyWorkflow({
    $transaction: async (fn, options) => {
      assert.equal(options.timeout, 60000);
      await fn({
        $executeRawUnsafe: async (sql) => {
          assert.equal(sql, statements[calls++]);
        },
      });
    },
  });
  assert.equal(calls, statements.length);
});

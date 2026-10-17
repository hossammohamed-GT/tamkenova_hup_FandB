const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  seedDemoVideos,
  sampleRows,
} = require('../prisma/course-videos/seed-demo.cjs');
function setup() {
  const rows = [
    {
      id: 'demo',
      slug: 'demo-catalog-v1-demo-1',
      lessons: [],
      sections: [],
      preview_video_url: null,
    },
  ];
  const chapters = [];
  const lessons = [];
  const add = (target, data) => {
    let count = 0;
    for (const row of data)
      if (!target.some((old) => old.id === row.id)) {
        target.push(row);
        count++;
      }
    return { count };
  };
  const tx = {
    courses: {
      findMany: async () => rows,
      updateMany: async ({ where, data }) => {
        for (const row of rows)
          if (
            where.id.in.includes(row.id) &&
            (!where.OR || !row.preview_video_url)
          )
            Object.assign(row, data);
      },
    },
    course_sections: { createMany: async ({ data }) => add(chapters, data) },
    course_lessons: { createMany: async ({ data }) => add(lessons, data) },
  };
  return { rows, chapters, lessons, $transaction: async (fn) => fn(tx) };
}
test('video fixtures have stable IDs, ordered chapters/lessons and the supplied YouTube URL', () => {
  const a = sampleRows('course');
  assert.deepEqual(a, sampleRows('course'));
  assert.equal(a.sections.length, 2);
  assert.equal(a.lessons.length, 4);
  assert.deepEqual(
    a.lessons.map((l) => l.position),
    [0, 1, 2, 3],
  );
  assert.ok(
    a.lessons.every(
      (l) =>
        l.media_url.includes('5BciHXh074k') &&
        a.sections.some((s) => s.id === l.section_id),
    ),
  );
});
test('video seed is re-runnable and preserves existing introductions and authored lesson links', async () => {
  const db = setup();
  db.rows[0].preview_video_url = 'existing-intro';
  const first = await seedDemoVideos(db);
  assert.equal(first.lessons, 4);
  assert.equal(first.sections, 2);
  assert.equal(db.rows[0].lessons_count, 4);
  assert.equal(db.rows[0].preview_video_url, 'existing-intro');
  db.rows[0].lessons = db.lessons;
  db.rows[0].sections = db.chapters;
  db.lessons[0].media_url = 'edited';
  const second = await seedDemoVideos(db);
  assert.equal(second.lessons, 0);
  assert.equal(second.sections, 0);
  assert.equal(db.lessons[0].media_url, 'edited');
  db.rows.push({
    id: 'other',
    slug: 'demo-catalog-v1-other',
    sections: [],
    lessons: [{ id: 'authored' }],
  });
  assert.deepEqual((await seedDemoVideos(db)).skipped, [
    'demo-catalog-v1-other',
  ]);
});
test('video seed refuses to silently succeed without seeded courses', async () => {
  const db = setup();
  db.rows.splice(0);
  await assert.rejects(seedDemoVideos(db), /No marked demo courses/);
});

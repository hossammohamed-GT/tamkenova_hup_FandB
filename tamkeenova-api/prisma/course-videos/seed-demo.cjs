const { createHash } = require('node:crypto');
const fixture = require('./demo.json');
const {
  demoConnectionUrl,
  connectWithRetry,
} = require('../demo-catalog/manage.cjs');
const idFor = (key) => {
  const hash = createHash('sha256')
    .update(`tamkeenova-demo-video-v1:${key}`)
    .digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
};
function sampleRows(courseId) {
  let position = 0;
  const sections = fixture.sections.map((section, index) => ({
    id: idFor(`${courseId}:section:${index}`),
    course_id: courseId,
    title_ar: section.title_ar,
    title_en: section.title_en,
    position: index,
  }));
  const lessons = fixture.sections.flatMap((section, index) =>
    section.lessons.map((lesson) => ({
      id: idFor(`${courseId}:lesson:${position}`),
      course_id: courseId,
      section_id: sections[index].id,
      title_ar: lesson.title_ar,
      title_en: lesson.title_en,
      description_en:
        'Temporary display lesson using the supplied test video, not actual course content.',
      description_ar:
        'درس عرض مؤقت يستخدم فيديو الاختبار المُرسل، وليس المحتوى الحقيقي للكورس.',
      position: position++,
      media_url: fixture.youtube_url,
      is_preview: lesson.is_preview,
      is_active: true,
      duration_minutes: 0,
    })),
  );
  return { sections, lessons };
}
async function seedDemoVideos(prisma) {
  return prisma.$transaction(
    async (tx) => {
      const courses = await tx.courses.findMany({
        where: {
          slug: { startsWith: 'demo-catalog-v1-' },
          description_en: { startsWith: '[TAMKEENOVA_DEMO_CATALOG_V1]' },
        },
        select: {
          id: true,
          slug: true,
          lessons: { select: { id: true } },
          sections: { select: { id: true } },
        },
      });
      if (!courses.length)
        throw new Error(
          'No marked demo courses found. Run db:demo-courses first.',
        );
      const sections = [];
      const lessons = [];
      const ids = [];
      const skipped = [];
      for (const course of courses) {
        const sample = sampleRows(course.id);
        if (
          course.lessons.some(
            (row) => !sample.lessons.some((lesson) => lesson.id === row.id),
          ) ||
          course.sections.some(
            (row) => !sample.sections.some((section) => section.id === row.id),
          )
        ) {
          skipped.push(course.slug);
          continue;
        }
        ids.push(course.id);
        sections.push(...sample.sections);
        lessons.push(...sample.lessons);
      }
      if (!ids.length) return { courses: 0, sections: 0, lessons: 0, skipped };
      const createdSections = await tx.course_sections.createMany({
        data: sections,
        skipDuplicates: true,
      });
      const createdLessons = await tx.course_lessons.createMany({
        data: lessons,
        skipDuplicates: true,
      });
      await tx.courses.updateMany({
        where: {
          id: { in: ids },
          OR: [{ preview_video_url: null }, { preview_video_url: '' }],
        },
        data: { preview_video_url: fixture.youtube_url },
      });
      await tx.courses.updateMany({
        where: { id: { in: ids } },
        data: {
          lessons_count: fixture.sections.reduce(
            (count, section) => count + section.lessons.length,
            0,
          ),
        },
      });
      return {
        courses: ids.length,
        sections: createdSections.count,
        lessons: createdLessons.count,
        skipped,
      };
    },
    { maxWait: 60000, timeout: 60000 },
  );
}
async function main() {
  if(process.env.ALLOW_DEMO_CATALOG_SEED!=='true')throw new Error('Demo video seeding is retired. Use real instructor-authored lessons. Isolated tests only: ALLOW_DEMO_CATALOG_SEED=true.');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({
    datasources: { db: { url: demoConnectionUrl() } },
  });
  try {
    await connectWithRetry(prisma);
    const result = await seedDemoVideos(prisma);
    console.log(
      `Prepared ${result.courses} demo courses; inserted ${result.sections} chapters and ${result.lessons} lessons.`,
    );
    console.log(
      'The supplied YouTube video is TEST content only. Existing authored lesson links were not overwritten.',
    );
    if (result.skipped.length)
      console.warn(
        'Skipped demos with authored content:',
        result.skipped.join(', '),
      );
  } finally {
    await prisma.$disconnect();
  }
}
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = { seedDemoVideos, sampleRows };

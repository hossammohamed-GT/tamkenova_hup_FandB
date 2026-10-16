// Data only: uses the models in schema.prisma; never creates/alters tables.
const fixture = require('./courses.json');
const PREFIX = 'demo-catalog-v1-';
const MARKER = '[TAMKEENOVA_DEMO_CATALOG_V1]';
const marked = { slug: { startsWith: PREFIX }, description_en: { startsWith: MARKER } };

async function seedDemoCourses(prisma) {
  return prisma.$transaction(async tx => {
    const categories = await tx.course_categories.findMany({
      where: { is_active: true }, orderBy: [{ display_order: 'asc' }, { slug: 'asc' }],
      select: { id: true, slug: true, name_en: true, name_ar: true },
    });
    if (!categories.length) throw new Error('No active categories found. No courses inserted. Check the database and category records in Prisma Studio.');
    const rows = categories.flatMap(category => [1, 2, 3].map(position => {
      const sample = fixture.find(item => item.category === category.slug && item.position === position);
      return {
        slug: `${PREFIX}${category.slug}-${position}`,
        title_en: sample?.title_en ?? `${category.name_en}: Practice Workshop ${position}`,
        title_ar: sample?.title_ar ?? `${category.name_ar}: ورشة تطبيقية ${position}`,
        short_description_en: 'Temporary demo course for previewing the catalog. Not a real training offering.',
        short_description_ar: 'دورة تجريبية مؤقتة لمعاينة التصميم، وليست برنامجاً تدريبياً حقيقياً.',
        description_en: `${MARKER} Temporary display data. No lesson videos or instructor claims. Remove with db:demo-courses:remove.`,
        description_ar: 'بيانات عرض تجريبية مؤقتة. لا تحتوي على فيديوهات دروس أو مدرّبين حقيقيين.',
        cover_image_url: sample?.cover ?? `/assets/demo-courses/generic-${position}.jpg`,
        language: 'ar', level: 'BEGINNER', content_type: 'VIDEO', status: 'PUBLISHED',
        is_free: true, duration_minutes: sample?.duration_minutes ?? 60 + position * 30,
        published_at: new Date(),
      };
    }));
    const inserted = await tx.courses.createMany({ data: rows, skipDuplicates: true });
    // A slug collision with a non-demo course must never modify or link that course.
    const courses = await tx.courses.findMany({
      where: { ...marked, slug: { in: rows.map(row => row.slug) } }, select: { id: true, slug: true },
    });
    const ids = new Map(courses.map(course => [course.slug, course.id]));
    const links = categories.flatMap(category => [1, 2, 3].flatMap(position => {
      const course_id = ids.get(`${PREFIX}${category.slug}-${position}`);
      return course_id ? [{ course_id, category_id: category.id, is_primary: true, display_order: position }] : [];
    }));
    if (links.length) await tx.course_category_links.createMany({ data: links, skipDuplicates: true });
    return {
      inserted: inserted.count,
      categories: categories.map(category => ({
        category: category.slug,
        demo_courses: links.filter(link => link.category_id === category.id).length,
      })),
    };
  }, { timeout: 60000 });
}

async function removeDemoCourses(prisma) {
  return prisma.$transaction(async tx => {
    const courses = await tx.courses.findMany({
      where: marked, select: { id: true, _count: { select: { enrollments: true, reviews: true } } },
    });
    if (courses.some(course => course._count.enrollments || course._count.reviews)) {
      throw new Error('Demo courses have enrollments/reviews. Removal cancelled to protect learner data.');
    }
    // Delete by marker as well as id, so real courses cannot enter the cleanup set.
    return tx.courses.deleteMany({ where: { ...marked, id: { in: courses.map(course => course.id) } } });
  }, { timeout: 60000, isolationLevel: 'Serializable' });
}

async function main() {
  const action = process.argv[2];
  if (!['seed', 'remove'].includes(action)) throw new Error('Use seed or remove.');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  try {
    if (action === 'seed') {
      const result = await seedDemoCourses(prisma);
      console.table(result.categories);
      console.log(`Inserted ${result.inserted} new demo courses. Existing courses were not overwritten.`);
      if (result.categories.some(category => category.demo_courses < 3)) {
        console.warn('Some demo slugs belong to non-demo courses. These records were preserved; review the category counts above.');
      }
    } else {
      const result = await removeDemoCourses(prisma);
      console.log(`Removed ${result.count} marked demo courses. Real courses were preserved.`);
    }
  } catch (error) {
    if (['P2021', 'P2022'].includes(error.code)) {
      throw new Error('Catalog tables/columns are missing. Review schema.prisma against your database before applying a schema change. Do not reset the database.');
    }
    if (error.code === 'P1001') throw new Error('Cannot reach the database. Check your Neon connection and DATABASE_URL locally; do not share credentials.');
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { seedDemoCourses, removeDemoCourses };

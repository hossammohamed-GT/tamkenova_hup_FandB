
const fixture = require('./courses.json');
const PREFIX = 'demo-catalog-v1-';
const MARKER = '[TAMKEENOVA_DEMO_CATALOG_V1]';
const marked = { slug: { startsWith: PREFIX }, description_en: { startsWith: MARKER } };


function demoConnectionUrl(env = process.env) {
  const source = env.DEMO_DATABASE_URL || env.DATABASE_URL;
  if (!source) throw new Error('DATABASE_URL is missing. Configure it locally in .env.');
  let url;
  try { url = new URL(source); } catch { throw new Error('Invalid database URL. Copy the PostgreSQL connection string from Neon; do not share it in chat.'); }
  if (!['postgresql:', 'postgres:'].includes(url.protocol)) throw new Error('A PostgreSQL database URL is required.');
  url.searchParams.set('connection_limit', '1');
  url.searchParams.set('connect_timeout', '30');
  url.searchParams.set('pool_timeout', '60');
  return url.toString();
}

function errorCode(error) { return error?.code || error?.errorCode; }
async function connectWithRetry(prisma, {
  wait = ms => new Promise(resolve => setTimeout(resolve, ms)),
  log = message => console.log(message),
} = {}) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    log(`Connecting to database (${attempt}/3)...`);
    try {
      await prisma.$connect();
      return;
    } catch (error) {

      if (!['P1001', 'P1002', 'P2024'].includes(errorCode(error)) || attempt === 3) throw error;
      await prisma.$disconnect().catch(() => {});
      log('Connection is not ready; retrying before any data changes.');
      await wait(attempt * 2000);
    }
  }
}

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
  }, { maxWait: 60000, timeout: 60000 });
}

async function removeDemoCourses(prisma) {
  return prisma.$transaction(async tx => {
    const courses = await tx.courses.findMany({
      where: marked, select: { id: true, _count: { select: { enrollments: true, reviews: true } } },
    });
    if (courses.some(course => course._count.enrollments || course._count.reviews)) {
      throw new Error('Demo courses have enrollments/reviews. Removal cancelled to protect learner data.');
    }

    return tx.courses.deleteMany({ where: { ...marked, id: { in: courses.map(course => course.id) } } });
  }, { maxWait: 60000, timeout: 60000, isolationLevel: 'Serializable' });
}



async function retireDemoCourses(prisma) {
  return prisma.$transaction(
    async (tx) => {
      const courses = await tx.courses.findMany({
        where: marked,
        select: {
          id: true,
          owner_trainer_id: true,
          _count: {
            select: {
              enrollments: true,
              reviews: true,
              payments: true,
              certificates: true,
            },
          },
        },
      });
      const protectedIds = courses
        .filter(
          (c) =>
            c.owner_trainer_id || Object.values(c._count).some((n) => n > 0),
        )
        .map((c) => c.id);
      const disposableIds = courses
        .filter((c) => !protectedIds.includes(c.id))
        .map((c) => c.id);
      const archived = protectedIds.length
        ? await tx.courses.updateMany({
            where: {
              ...marked,
              id: { in: protectedIds },
              status: { not: "ARCHIVED" },
            },
            data: { status: "ARCHIVED" },
          })
        : { count: 0 };
      const deleted = disposableIds.length
        ? await tx.courses.deleteMany({
            where: {
              ...marked,
              id: { in: disposableIds },
              owner_trainer_id: null,
            },
          })
        : { count: 0 };
      return {
        deleted: deleted.count,
        archived: archived.count,
        protected: protectedIds.length,
      };
    },
    { maxWait: 60000, timeout: 60000, isolationLevel: "Serializable" },
  );
}

async function main() {
  const action = process.argv[2];
  if (!['seed', 'remove'].includes(action)) throw new Error('Use seed or remove.');
  if (action === 'seed' && process.env.ALLOW_DEMO_CATALOG_SEED !== 'true')
    throw new Error('Demo catalog is retired. Do not seed demo courses in production. Isolated tests only: ALLOW_DEMO_CATALOG_SEED=true.');
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({ datasources: { db: { url: demoConnectionUrl() } } });
  try {
    await connectWithRetry(prisma);
    console.log('Database connected. Starting data transaction.');
    if (action === 'seed') {
      const result = await seedDemoCourses(prisma);
      console.table(result.categories);
      console.log(`Inserted ${result.inserted} new demo courses. Existing courses were not overwritten.`);
      if (result.categories.some(category => category.demo_courses < 3)) {
        console.warn('Some demo slugs belong to non-demo courses. These records were preserved; review the category counts above.');
      }
    } else {
      const result = await retireDemoCourses(prisma);
      console.log(`Deleted ${result.deleted} unused marked demos; archived ${result.archived}; preserved history for ${result.protected}. Real courses and categories were preserved.`);
    }
  } catch (error) {
    if (['P2021', 'P2022'].includes(errorCode(error))) {
      throw new Error('Catalog tables/columns are missing. Review schema.prisma against your database before applying a schema change. Do not reset the database.');
    }
    if (['P1001', 'P1002', 'P2024'].includes(errorCode(error))) {
      throw new Error('Database connection unavailable after waiting. Check Neon availability/network. You can set DEMO_DATABASE_URL to the Direct connection string for the SAME database in .env, without changing the backend DATABASE_URL. Do not share credentials.');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { seedDemoCourses, removeDemoCourses, retireDemoCourses, demoConnectionUrl, connectWithRetry };

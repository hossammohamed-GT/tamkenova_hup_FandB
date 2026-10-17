const statements = require('./schema-statements.cjs');
const {
  demoConnectionUrl,
  connectWithRetry,
} = require('../demo-catalog/manage.cjs');
async function applyCourseVideoSchema(prisma) {
  return prisma.$transaction(
    async (tx) => {
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
    },
    { maxWait: 60000, timeout: 60000 },
  );
}
async function main() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient({
    datasources: { db: { url: demoConnectionUrl() } },
  });
  try {
    await connectWithRetry(prisma);
    await applyCourseVideoSchema(prisma);
    console.log(
      'Course video schema is ready. Added chapters and an optional lesson chapter relation only; existing courses and lessons were preserved.',
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
module.exports = { applyCourseVideoSchema };

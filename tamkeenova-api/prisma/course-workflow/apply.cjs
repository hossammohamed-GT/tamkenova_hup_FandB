const statements = require('./schema-statements.cjs');
const {
  demoConnectionUrl,
  connectWithRetry,
} = require('../demo-catalog/manage.cjs');
async function applyWorkflow(prisma) {
  return prisma.$transaction(
    async (tx) => {
      for (const sql of statements) await tx.$executeRawUnsafe(sql);
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
    await applyWorkflow(prisma);
    console.log(
      'Course workflow schema ready. Payments remain disabled until an admin configures real receiving accounts. Existing courses and records were preserved.',
    );
  } finally {
    await prisma.$disconnect();
  }
}
if (require.main === module)
  main().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
module.exports = { applyWorkflow };

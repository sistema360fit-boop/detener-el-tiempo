import { PrismaClient } from '@prisma/client';

async function checkReport() {
  const prisma = new PrismaClient();
  try {
    const reportes = await prisma.reporteTrimestral.findMany({
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    console.log('--- Latest ReporteTrimestral ---');
    console.log(JSON.stringify(reportes[0], null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkReport();

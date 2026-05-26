import { PrismaClient } from '@prisma/client';

async function reset() {
  const prisma = new PrismaClient();
  try {
    console.log('Resetting test state...');
    
    // Delete all report records
    await prisma.reporteTrimestral.deleteMany({});
    
    // Reset all states
    await prisma.venta.updateMany({
      data: { estado: 'ACTIVO' }
    });
    
    await prisma.gasto.updateMany({
      data: { estado: 'ACTIVO' }
    });
    
    await prisma.nomina.updateMany({
      data: { estado: 'PAGADO' }
    });
    
    await prisma.adelanto.updateMany({
      data: { estado: 'PENDIENTE' }
    });

    console.log('✅ Reset complete.');
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

reset();

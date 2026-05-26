import { PrismaClient } from '@prisma/client';

async function check() {
  const prisma = new PrismaClient();
  try {
    const comandasCount = await prisma.comanda.count();
    const ventasCount = await prisma.venta.count();
    const adelantosCount = await prisma.adelanto.count();
    const gastosCount = await prisma.gasto.count();
    const nominasCount = await prisma.nomina.count();

    console.log('--- Database Record Counts ---');
    console.log(`Comandas: ${comandasCount}`);
    console.log(`Ventas: ${ventasCount}`);
    console.log(`Adelantos: ${adelantosCount}`);
    console.log(`Gastos: ${gastosCount}`);
    console.log(`Nóminas: ${nominasCount}`);

    console.log('\n--- Date Ranges ---');
    if (ventasCount > 0) {
      const firstVenta = await prisma.venta.findFirst({ orderBy: { fecha_hora: 'asc' } });
      const lastVenta = await prisma.venta.findFirst({ orderBy: { fecha_hora: 'desc' } });
      console.log(`Ventas range: ${firstVenta.fecha_hora.toISOString()} to ${lastVenta.fecha_hora.toISOString()}`);
    }
    if (gastosCount > 0) {
      const firstGasto = await prisma.gasto.findFirst({ orderBy: { fecha: 'asc' } });
      const lastGasto = await prisma.gasto.findFirst({ orderBy: { fecha: 'desc' } });
      console.log(`Gastos range: ${firstGasto.fecha.toISOString()} to ${lastGasto.fecha.toISOString()}`);
    }
    if (nominasCount > 0) {
      const firstNomina = await prisma.nomina.findFirst({ orderBy: { fecha_pago: 'asc' } });
      const lastNomina = await prisma.nomina.findFirst({ orderBy: { fecha_pago: 'desc' } });
      console.log(`Nóminas range: ${firstNomina.fecha_pago.toISOString()} to ${lastNomina.fecha_pago.toISOString()}`);
    }
    if (adelantosCount > 0) {
      const firstAdelanto = await prisma.adelanto.findFirst({ orderBy: { fecha: 'asc' } });
      const lastAdelanto = await prisma.adelanto.findFirst({ orderBy: { fecha: 'desc' } });
      console.log(`Adelantos range: ${firstAdelanto.fecha.toISOString()} to ${lastAdelanto.fecha.toISOString()}`);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

check();

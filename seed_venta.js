import { PrismaClient } from '@prisma/client';

async function seed() {
  const prisma = new PrismaClient();
  try {
    console.log('Inserting dummy Ventas...');
    
    // Venta 1: Zelle (USD 100)
    const v1 = await prisma.venta.create({
      data: {
        total_venta: 100.0,
        metodo_pago: 'zelle_usd',
        fecha_hora: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
      }
    });

    // Venta 2: Efectivo USD (USD 50)
    const v2 = await prisma.venta.create({
      data: {
        total_venta: 50.0,
        metodo_pago: 'efectivo_usd',
        fecha_hora: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
      }
    });

    // Venta 3: Pago Móvil BS (Bs. 2000, which is approx USD 50 if rate is 40)
    const v3 = await prisma.venta.create({
      data: {
        total_venta: 50.0,
        monto_original: 2000.0,
        metodo_pago: 'pago_movil_bs',
        fecha_hora: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    });

    // Venta 4: Mixto (USD 30 Cash, USD 70 Zelle)
    const v4 = await prisma.venta.create({
      data: {
        total_venta: 100.0,
        metodo_pago: 'mixto',
        fecha_hora: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    });

    await prisma.pagoMixto.create({
      data: {
        ventaId: v4.id,
        monto: 30.0,
        monto_usd: 30.0,
        metodo_pago: 'efectivo_usd',
        fecha: v4.fecha_hora
      }
    });

    await prisma.pagoMixto.create({
      data: {
        ventaId: v4.id,
        monto: 70.0,
        monto_usd: 70.0,
        metodo_pago: 'zelle_usd',
        fecha: v4.fecha_hora
      }
    });

    console.log('✅ Dummy Ventas and PagoMixto inserted successfully.');

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

seed();

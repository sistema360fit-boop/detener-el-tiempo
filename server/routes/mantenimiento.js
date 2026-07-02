import express from 'express';
import { requireAdmin } from '../middlewares/auth.js';
import prisma from '../prisma.js';

const router = express.Router();

/**
 * Obtiene un resumen de lo que se va a depurar (datos de hace más de 3 meses)
 */
router.get('/resumen-depuracion', requireAdmin, async (req, res) => {
  try {
    const tresMesesAtras = new Date();
    tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
    const fechaLimite = tresMesesAtras;

    // Consultar totales con metodo_pago para separar monedas
    const [ventas, gastos, comandas, adelantos] = await Promise.all([
      prisma.venta.findMany({
        where: {
          fecha_hora: { lt: fechaLimite },
          estado: { not: 'ARCHIVADO' }
        },
        select: { total_venta: true, metodo_pago: true, monto_original: true, moneda_original: true }
      }),
      prisma.gasto.findMany({
        where: {
          fecha: { lt: fechaLimite },
          estado: { not: 'ARCHIVADO' }
        },
        select: { monto: true, metodo_pago: true, monto_original: true, moneda_original: true }
      }),
      prisma.comanda.findMany({
        where: {
          fecha_apertura: { lt: fechaLimite }
        },
        select: { total_comanda: true }
      }),
      prisma.adelanto.findMany({
        where: {
          fecha: { lt: fechaLimite },
          estado: { not: 'ARCHIVADO' }
        },
        select: { monto: true, metodo_pago: true, monto_original: true, moneda_original: true }
      })
    ]);

    const esBs = (m) => m && m.endsWith('_bs');
    const esCOP = (m) => m && m.endsWith('_cop');
    const esUSD = (m) => !esBs(m) && !esCOP(m);

    // Ventas separadas
    const ventasUSD = ventas.filter(v => esUSD(v.metodo_pago)).reduce((s, v) => s + (v.total_venta || 0), 0);
    const ventasBs = ventas.filter(v => esBs(v.metodo_pago)).reduce((s, v) => s + (v.monto_original || v.total_venta || 0), 0);

    // Gastos separados
    const gastosUSD = gastos.filter(g => esUSD(g.metodo_pago)).reduce((s, g) => s + (g.monto || 0), 0);
    const gastosBs = gastos.filter(g => esBs(g.metodo_pago)).reduce((s, g) => s + (g.monto_original || g.monto || 0), 0);

    // Adelantos separados
    const adelantosUSD = adelantos.filter(a => esUSD(a.metodo_pago)).reduce((s, a) => s + (a.monto || 0), 0);
    const adelantosBs = adelantos.filter(a => esBs(a.metodo_pago)).reduce((s, a) => s + (a.monto_original || a.monto || 0), 0);

    const totalComandas = comandas.reduce((acc, c) => acc + (c.total_comanda || 0), 0);

    res.json({
      fechaLimite: fechaLimite.toISOString(),
      conteos: {
        ventas: ventas.length,
        gastos: gastos.length,
        comandas: comandas.length,
        adelantos: adelantos.length
      },
      totales: {
        ventasUSD,
        ventasBs,
        gastosUSD,
        gastosBs,
        comandas: totalComandas,
        adelantosUSD,
        adelantosBs,
        utilidadUSD: ventasUSD - gastosUSD - adelantosUSD,
        utilidadBs: ventasBs - gastosBs - adelantosBs,
        // Legacy - para que no se rompa si algo usa los campos viejos
        ventas: ventasUSD,
        gastos: gastosUSD,
        adelantos: adelantosUSD,
        utilidadEstimada: ventasUSD - gastosUSD - adelantosUSD
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * Ejecuta la depuración borrando los registros antiguos
 */
router.post('/ejecutar-depuracion', requireAdmin, async (req, res) => {
  try {
    const { fechaLimite } = req.body;
    if (!fechaLimite) return res.status(400).json({ error: 'Se requiere fechaLimite' });

    const fechaLimitDate = new Date(fechaLimite);

    await prisma.$transaction(async (tx) => {
      // 1. Borrar detalles primero
      const vIds = await tx.venta.findMany({
        where: { fecha_hora: { lt: fechaLimitDate } },
        select: { id: true }
      });
      if (vIds.length > 0) {
        await tx.detalleVenta.deleteMany({
          where: { ventaId: { in: vIds.map(v => v.id) } }
        });
      }

      const cIds = await tx.comanda.findMany({
        where: { fecha_apertura: { lt: fechaLimitDate } },
        select: { id: true }
      });
      if (cIds.length > 0) {
        await tx.detalleComanda.deleteMany({
          where: { comandaId: { in: cIds.map(c => c.id) } }
        });
      }

      // 2. Borrar maestros
      await tx.venta.deleteMany({ where: { fecha_hora: { lt: fechaLimitDate } } });
      await tx.gasto.deleteMany({ where: { fecha: { lt: fechaLimitDate } } });
      await tx.comanda.deleteMany({ where: { fecha_apertura: { lt: fechaLimitDate } } });
      await tx.adelanto.deleteMany({ where: { fecha: { lt: fechaLimitDate } } });
      await tx.alertaStock.deleteMany({ where: { creadoEn: { lt: fechaLimitDate } } });
      await tx.pagoMixto.deleteMany({ where: { fecha: { lt: fechaLimitDate } } });
    });

    res.json({ ok: true, message: 'Depuración completada exitosamente' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

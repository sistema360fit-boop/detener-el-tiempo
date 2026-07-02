import express from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { explodirElemento, descontarDelInventario } from '../services/inventory.js';
import prisma from '../prisma.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.venta.findMany({
      where: {
        estado: { not: 'ARCHIVADO' }
      },
      include: { detalles: true },
      orderBy: { fecha_hora: 'desc' },
      take: 1000
    });
    res.json(data);
  } catch (e) {
    console.error('Error fetching ventas', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { total_venta, metodo_pago, detalles } = req.body;
    
    // Create venta and its detalles in a single transaction if we want,
    // but the original code created them separately. We can use create with include.
    
    const detallesData = (detalles || []).map(d => ({
      platoId: d.plato_id || d.platoId || null,
      platoNombre: d.plato_nombre || d.platoNombre || null,
      cantidad: parseFloat(d.cantidad) || 0,
      precioUnitario: parseFloat(d.precio_unitario || d.precioUnitario || 0),
      subtotal: parseFloat(d.subtotal || 0)
    }));

    const venta = await prisma.venta.create({
      data: {
        total_venta: parseFloat(total_venta),
        metodo_pago,
        detalles: {
          create: detallesData
        }
      },
      include: {
        detalles: true
      }
    });

    // Descontar stock automáticamente
    const consolidado = {};
    for (const detalle of venta.detalles) {
      if (detalle.platoId) {
        await explodirElemento(detalle.platoId, detalle.cantidad, consolidado);
      }
    }
    for (const [ingredienteId, cantidad] of Object.entries(consolidado)) {
      await descontarDelInventario(ingredienteId, cantidad);
    }

    res.json(venta);
  } catch (e) {
    console.error('Error creating venta', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

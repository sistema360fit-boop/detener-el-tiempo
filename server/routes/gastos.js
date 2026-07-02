import express from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import prisma from '../prisma.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.gasto.findMany({
      where: {
        estado: { not: 'ARCHIVADO' }
      },
      orderBy: { fecha: 'desc' },
      take: 1000
    });
    res.json(data);
  } catch (e) {
    console.error('Error fetching gastos', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { descripcion, monto, categoria, categoriaNombre, fecha, metodo_pago, metodoPago, monto_original, moneda_original } = req.body;
    const data = await prisma.gasto.create({
      data: {
        descripcion,
        monto: parseFloat(monto) || 0,
        monto_original: parseFloat(monto_original || monto) || 0,
        moneda_original: moneda_original || 'usd',
        metodo_pago: metodo_pago || metodoPago || 'efectivo_usd',
        categoriaNombre: categoriaNombre || categoria || null,
        fecha: fecha ? new Date(fecha) : new Date()
      }
    });
    res.json(data);
  } catch (e) {
    console.error('Error creating gasto', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.gasto.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting gasto', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

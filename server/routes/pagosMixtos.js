import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.pagoMixto.findMany({
      orderBy: { fecha: 'desc' },
      take: 500
    });
    res.json(data);
  } catch (e) {
    console.error('Error fetching pagos mixtos', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { ventaId, monto, monto_usd, monto_original, moneda, metodo_pago, fecha } = req.body;
    const data = await prisma.pagoMixto.create({
      data: {
        ventaId,
        monto: parseFloat(monto) || 0,
        monto_usd: parseFloat(monto_usd) || 0,
        monto_original: parseFloat(monto_original) || 0,
        moneda: moneda || 'usd',
        metodo_pago,
        fecha: fecha ? new Date(fecha) : new Date()
      }
    });
    res.json(data);
  } catch (e) {
    console.error('Error creating pago mixto', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

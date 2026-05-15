import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const prisma = new PrismaClient();
const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.tasaCambio.findMany({
      orderBy: { created_date: 'desc' },
      take: 30
    });
    res.json(data);
  } catch (e) {
    console.error('Get tasas error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { fecha, tasa_bs_usd, tasa_cop_usd, activa, empleado_nombre } = req.body;
    const data = await prisma.tasaCambio.create({
      data: {
        fecha,
        tasa_bs_usd: tasa_bs_usd ? parseFloat(tasa_bs_usd) : null,
        tasa_cop_usd: tasa_cop_usd ? parseFloat(tasa_cop_usd) : null,
        activa: activa !== false,
        empleado_nombre
      }
    });
    res.json(data);
  } catch (e) {
    console.error('Create tasa error', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, tasa_bs_usd, tasa_cop_usd, activa, empleado_nombre } = req.body;
    const data = await prisma.tasaCambio.update({
      where: { id },
      data: {
        fecha,
        tasa_bs_usd: tasa_bs_usd ? parseFloat(tasa_bs_usd) : null,
        tasa_cop_usd: tasa_cop_usd ? parseFloat(tasa_cop_usd) : null,
        activa,
        empleado_nombre
      }
    });
    res.json(data);
  } catch (e) {
    console.error('Update tasa error', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.tasaCambio.delete({
      where: { id }
    });
    res.json({ success: true });
  } catch (e) {
    console.error('Delete tasa error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

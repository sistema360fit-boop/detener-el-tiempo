import express from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import prisma from '../prisma.js';

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
    
    // Buscar si ya existe una tasa para esta fecha
    const existentes = await prisma.tasaCambio.findMany({
      where: { fecha },
      take: 1
    });

    if (existentes && existentes.length > 0) {
      // Actualizar la existente para no duplicar
      const existente = existentes[0];
      const updateData = {};
      if (tasa_bs_usd !== undefined) updateData.tasa_bs_usd = tasa_bs_usd ? parseFloat(tasa_bs_usd) : null;
      if (tasa_cop_usd !== undefined) updateData.tasa_cop_usd = tasa_cop_usd ? parseFloat(tasa_cop_usd) : null;
      if (activa !== undefined) updateData.activa = activa;
      if (empleado_nombre !== undefined) updateData.empleado_nombre = empleado_nombre;

      const data = await prisma.tasaCambio.update({
        where: { id: existente.id },
        data: updateData
      });
        
      return res.json(data);
    }

    // Si no existe, crear nueva
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
    
    const updateData = {};
    if (fecha !== undefined) updateData.fecha = fecha;
    if (tasa_bs_usd !== undefined) updateData.tasa_bs_usd = tasa_bs_usd ? parseFloat(tasa_bs_usd) : null;
    if (tasa_cop_usd !== undefined) updateData.tasa_cop_usd = tasa_cop_usd ? parseFloat(tasa_cop_usd) : null;
    if (activa !== undefined) updateData.activa = activa;
    if (empleado_nombre !== undefined) updateData.empleado_nombre = empleado_nombre;

    const data = await prisma.tasaCambio.update({
      where: { id },
      data: updateData
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
    await prisma.tasaCambio.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error('Delete tasa error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

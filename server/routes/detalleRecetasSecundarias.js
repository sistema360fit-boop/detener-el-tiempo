import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.detalleRecetaSecundaria.findMany();
    res.json(data);
  } catch (e) {
    console.error('Get detalles recetas secundarias error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { recetaSecundariaId, elementoId, elementoNombre, tipoElemento, cantidad, unidadMedida, costoElemento } = req.body;
    const data = await prisma.detalleRecetaSecundaria.create({
      data: {
        recetaSecundariaId, 
        elementoId, 
        elementoNombre,
        tipoElemento, 
        cantidad: parseFloat(cantidad) || 0, 
        unidadMedida,
        costoElemento: parseFloat(costoElemento) || 0
      }
    });
    res.json(data);
  } catch (e) {
    console.error('Create detalle receta secundaria error', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.detalleRecetaSecundaria.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error('Delete detalle receta secundaria error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

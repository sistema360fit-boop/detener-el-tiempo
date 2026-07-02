import express from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import prisma from '../prisma.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.detalleRecetaPrimaria.findMany();
    res.json(data);
  } catch (e) {
    console.error('Get detalles recetas primarias error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { recetaPrimariaId, ingredienteId, ingredienteNombre, tipoElemento, cantidad, unidadMedida, costoIngrediente } = req.body;
    const data = await prisma.detalleRecetaPrimaria.create({
      data: {
        recetaPrimariaId, 
        ingredienteId, 
        ingredienteNombre,
        tipoElemento, 
        cantidad: parseFloat(cantidad) || 0, 
        unidadMedida,
        costoIngrediente: parseFloat(costoIngrediente) || 0
      }
    });
    res.json(data);
  } catch (e) {
    console.error('Create detalle receta primaria error', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.detalleRecetaPrimaria.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error('Delete detalle receta primaria error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

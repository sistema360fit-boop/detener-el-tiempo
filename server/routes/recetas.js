import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.receta.findMany({
      include: { plato: true }
    });
    res.json(data);
  } catch (e) {
    console.error('Get recetas error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { platoId, ingredienteId, ingredienteNombre, cantidad_requerida, cantidadRequerida, costo_ingrediente, costoIngrediente, tipo, plato_nombre } = req.body;
    
    const finalCantidad = parseFloat(cantidad_requerida || cantidadRequerida) || 0;
    const finalCosto = parseFloat(costo_ingrediente || costoIngrediente) || 0;

    const data = await prisma.receta.create({
      data: {
        platoId: platoId || req.body.plato_id,
        ingredienteId: ingredienteId || req.body.ingrediente_id,
        ingredienteNombre: ingredienteNombre || req.body.ingrediente_nombre,
        tipo: tipo || 'ingrediente',
        cantidad_requerida: finalCantidad,
        costo_ingrediente: finalCosto,
        plato_nombre: plato_nombre
      }
    });
    res.json(data);
  } catch (e) {
    console.error('Create receta error', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.receta.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error('Delete receta error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

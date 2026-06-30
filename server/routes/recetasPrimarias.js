import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.recetaPrimaria.findMany({
      include: { detalles: true }
    });
    res.json(data);
  } catch (e) {
    console.error('Get recetas primarias error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { 
      nombre, descripcion, unidadMedida, cantidadResultante, 
      costoTotal, costoPorUnidad, tiempoPreparacion, 
      instrucciones, activa, detalles 
    } = req.body;
    
    let detallesData = [];
    if (detalles && Array.isArray(detalles) && detalles.length > 0) {
      detallesData = detalles.map(d => ({
        ingredienteId: d.ingrediente_id || d.ingredienteId || d.id,
        ingredienteNombre: d.ingrediente_nombre || d.ingredienteNombre || d.nombre,
        cantidad: parseFloat(d.cantidad_requerida || d.cantidad) || 0,
        unidadMedida: d.unidad_medida || d.unidadMedida,
        costoIngrediente: parseFloat(d.costo_ingrediente || d.costoIngrediente) || 0
      }));
    }

    const receta = await prisma.recetaPrimaria.create({
      data: {
        nombre,
        descripcion,
        unidadMedida,
        cantidadResultante: parseFloat(cantidadResultante) || 1,
        costoTotal: parseFloat(costoTotal) || 0,
        costoPorUnidad: parseFloat(costoPorUnidad) || 0,
        tiempoPreparacion,
        instrucciones,
        activa: activa !== false,
        detalles: {
          create: detallesData
        }
      },
      include: { detalles: true }
    });

    res.json(receta);
  } catch (e) {
    console.error('Create receta primaria error', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre, descripcion, unidadMedida, cantidadResultante, 
      costoTotal, costoPorUnidad, tiempoPreparacion, 
      instrucciones, activa, detalles 
    } = req.body;
    
    const recetaCompleta = await prisma.$transaction(async (tx) => {
      await tx.recetaPrimaria.update({
        where: { id },
        data: {
          nombre,
          descripcion,
          unidadMedida,
          cantidadResultante: parseFloat(cantidadResultante) || 1,
          costoTotal: parseFloat(costoTotal) || 0,
          costoPorUnidad: parseFloat(costoPorUnidad) || 0,
          tiempoPreparacion,
          instrucciones,
          activa
        }
      });

      if (detalles && Array.isArray(detalles)) {
        await tx.detalleRecetaPrimaria.deleteMany({ where: { recetaPrimariaId: id } });
        
        if (detalles.length > 0) {
          const detallesData = detalles.map(d => ({
            recetaPrimariaId: id,
            ingredienteId: d.ingrediente_id || d.ingredienteId || d.id,
            ingredienteNombre: d.ingrediente_nombre || d.ingredienteNombre || d.nombre,
            cantidad: parseFloat(d.cantidad_requerida || d.cantidad) || 0,
            unidadMedida: d.unidad_medida || d.unidadMedida,
            costoIngrediente: parseFloat(d.costo_ingrediente || d.costoIngrediente) || 0
          }));
          await tx.detalleRecetaPrimaria.createMany({ data: detallesData });
        }
      }

      return tx.recetaPrimaria.findUnique({
        where: { id },
        include: { detalles: true }
      });
    });

    res.json(recetaCompleta);
  } catch (e) {
    console.error('Update receta primaria error', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction([
      prisma.detalleRecetaPrimaria.deleteMany({ where: { recetaPrimariaId: id } }),
      prisma.recetaPrimaria.delete({ where: { id } })
    ]);
    res.json({ success: true });
  } catch (e) {
    console.error('Delete receta primaria error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

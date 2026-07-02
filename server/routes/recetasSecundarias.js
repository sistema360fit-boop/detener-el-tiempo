import express from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import prisma from '../prisma.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.recetaSecundaria.findMany({
      include: { detalles: true }
    });
    res.json(data);
  } catch (e) {
    console.error('Get recetas secundarias error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { 
      nombre, descripcion, unidadMedida, cantidadResultante, 
      costoTotal, costoPorUnidad, activa, detalles 
    } = req.body;
    
    let detallesData = [];
    if (detalles && Array.isArray(detalles) && detalles.length > 0) {
      detallesData = detalles.map(d => ({
        elementoId: d.elementoId || d.elemento_id || d.id,
        elementoNombre: d.elementoNombre || d.elemento_nombre || d.nombre,
        tipoElemento: d.tipoElemento || d.tipo_elemento || 'ingrediente',
        cantidad: parseFloat(d.cantidad) || 0,
        costoElemento: parseFloat(d.costoElemento || d.costo_elemento) || 0
      }));
    }

    const receta = await prisma.recetaSecundaria.create({
      data: {
        nombre,
        descripcion,
        unidadMedida,
        cantidadResultante: parseFloat(cantidadResultante) || 1,
        costoTotal: parseFloat(costoTotal) || 0,
        costoPorUnidad: parseFloat(costoPorUnidad) || 0,
        activa: activa !== false,
        detalles: {
          create: detallesData
        }
      },
      include: { detalles: true }
    });

    res.json(receta);
  } catch (e) {
    console.error('Create receta secundaria error', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      nombre, descripcion, unidadMedida, cantidadResultante, 
      costoTotal, costoPorUnidad, activa, detalles 
    } = req.body;
    
    const recetaCompleta = await prisma.$transaction(async (tx) => {
      await tx.recetaSecundaria.update({
        where: { id },
        data: {
          nombre,
          descripcion,
          unidadMedida,
          cantidadResultante: parseFloat(cantidadResultante) || 1,
          costoTotal: parseFloat(costoTotal) || 0,
          costoPorUnidad: parseFloat(costoPorUnidad) || 0,
          activa
        }
      });

      if (detalles && Array.isArray(detalles)) {
        await tx.detalleRecetaSecundaria.deleteMany({ where: { recetaSecundariaId: id } });
        
        if (detalles.length > 0) {
          const detallesData = detalles.map(d => ({
            recetaSecundariaId: id,
            elementoId: d.elementoId || d.elemento_id || d.id,
            elementoNombre: d.elementoNombre || d.elemento_nombre || d.nombre,
            tipoElemento: d.tipoElemento || d.tipo_elemento || 'ingrediente',
            cantidad: parseFloat(d.cantidad) || 0,
            costoElemento: parseFloat(d.costoElemento || d.costo_elemento) || 0
          }));
          await tx.detalleRecetaSecundaria.createMany({ data: detallesData });
        }
      }

      return tx.recetaSecundaria.findUnique({
        where: { id },
        include: { detalles: true }
      });
    });

    res.json(recetaCompleta);
  } catch (e) {
    console.error('Update receta secundaria error', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction([
      prisma.detalleRecetaSecundaria.deleteMany({ where: { recetaSecundariaId: id } }),
      prisma.recetaSecundaria.delete({ where: { id } })
    ]);
    res.json({ success: true });
  } catch (e) {
    console.error('Delete receta secundaria error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

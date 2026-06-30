import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Helper: extraer valor de campo con múltiples nombres posibles
const pick = (obj, ...keys) => {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return undefined;
};

// Obtener todos los platos con sus recetas
router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.plato.findMany({
      include: { recetas: true }
    });
    res.json(data);
  } catch (e) {
    console.error('Get platos error', e);
    res.status(500).json({ error: e.message });
  }
});

// Crear plato con receta
router.post('/', requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    
    const nombre = body.nombre;
    const descripcion = body.descripcion;
    const precio = parseFloat(pick(body, 'precio')) || 0;
    const categoria = body.categoria;
    const activo = pick(body, 'activo') !== false;
    const tiene_piezas = pick(body, 'tiene_piezas', 'tienePiezas') || false;
    const precio_6 = parseFloat(pick(body, 'precio_6', 'precio6')) || 0;
    const precio_12 = parseFloat(pick(body, 'precio_12', 'precio12')) || 0;
    const costo_total = parseFloat(pick(body, 'costo_total', 'costoTotal')) || 0;
    const precio_sugerido = parseFloat(pick(body, 'precio_sugerido', 'precioSugerido')) || 0;
    const permitir_merma = pick(body, 'permitir_merma', 'permitirMerma') || false;
    const permitir_credito_empleado = pick(body, 'permitir_credito_empleado', 'permitirCreditoEmpleado') || false;
    const recetas = body.recetas;
    
    let recetasData = [];
    if (recetas && Array.isArray(recetas) && recetas.length > 0) {
      recetasData = recetas.map(r => ({
        ingredienteId: pick(r, 'ingredienteId', 'ingrediente_id', 'id'),
        ingredienteNombre: pick(r, 'ingredienteNombre', 'ingrediente_nombre', 'nombre') || 'Sin nombre',
        tipo: r.tipo || 'ingrediente',
        cantidad_requerida: parseFloat(pick(r, 'cantidad_requerida', 'cantidadRequerida', 'cantidad')) || 0,
        costo_ingrediente: parseFloat(pick(r, 'costo_ingrediente', 'costoIngrediente')) || 0
      }));
    }

    const plato = await prisma.plato.create({
      data: {
        nombre,
        descripcion,
        precio,
        categoria,
        activo,
        tiene_piezas,
        precio_6,
        precio_12,
        costo_total,
        precio_sugerido,
        permitir_merma,
        permitir_credito_empleado,
        recetas: {
          create: recetasData
        }
      },
      include: {
        recetas: true
      }
    });

    res.json(plato);
  } catch (e) {
    console.error('Create plato error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Actualizar plato
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const nombre = body.nombre;
    const descripcion = body.descripcion;
    const precio = parseFloat(pick(body, 'precio')) || 0;
    const categoria = body.categoria;
    const activo = pick(body, 'activo') !== false;
    const tiene_piezas = pick(body, 'tiene_piezas', 'tienePiezas') || false;
    const precio_6 = parseFloat(pick(body, 'precio_6', 'precio6')) || 0;
    const precio_12 = parseFloat(pick(body, 'precio_12', 'precio12')) || 0;
    const costo_total = parseFloat(pick(body, 'costo_total', 'costoTotal')) || 0;
    const precio_sugerido = parseFloat(pick(body, 'precio_sugerido', 'precioSugerido')) || 0;
    const permitir_merma = pick(body, 'permitir_merma', 'permitirMerma') || false;
    const permitir_credito_empleado = pick(body, 'permitir_credito_empleado', 'permitirCreditoEmpleado') || false;
    const recetas = body.recetas;

    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (descripcion !== undefined) updateData.descripcion = descripcion;
    if (precio !== undefined) updateData.precio = precio;
    if (categoria !== undefined) updateData.categoria = categoria;
    if (activo !== undefined) updateData.activo = activo;
    if (tiene_piezas !== undefined) updateData.tiene_piezas = tiene_piezas;
    if (precio_6 !== undefined) updateData.precio_6 = precio_6;
    if (precio_12 !== undefined) updateData.precio_12 = precio_12;
    if (costo_total !== undefined) updateData.costo_total = costo_total;
    if (precio_sugerido !== undefined) updateData.precio_sugerido = precio_sugerido;
    if (permitir_merma !== undefined) updateData.permitir_merma = permitir_merma;
    if (permitir_credito_empleado !== undefined) updateData.permitir_credito_empleado = permitir_credito_empleado;

    const platoCompleto = await prisma.$transaction(async (tx) => {
      let plato = await tx.plato.update({
        where: { id },
        data: updateData
      });

      if (recetas && Array.isArray(recetas)) {
        await tx.receta.deleteMany({ where: { platoId: id } });
        if (recetas.length > 0) {
          const recetasData = recetas.map(r => ({
            platoId: id,
            ingredienteId: pick(r, 'ingredienteId', 'ingrediente_id', 'id'),
            ingredienteNombre: pick(r, 'ingredienteNombre', 'ingrediente_nombre', 'nombre') || 'Sin nombre',
            tipo: r.tipo || 'ingrediente',
            cantidad_requerida: parseFloat(pick(r, 'cantidad_requerida', 'cantidadRequerida', 'cantidad')) || 0,
            costo_ingrediente: parseFloat(pick(r, 'costo_ingrediente', 'costoIngrediente')) || 0
          }));
          await tx.receta.createMany({ data: recetasData });
        }
      }

      return tx.plato.findUnique({
        where: { id },
        include: { recetas: true }
      });
    });

    res.json(platoCompleto);
  } catch (e) {
    console.error('Update plato error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ELIMINAR PLATO
router.delete('/:id', requireAdmin, async (req, res) => {
  const platoId = req.params.id;
  try {
    await prisma.$transaction([
      prisma.receta.deleteMany({ where: { platoId } }),
      prisma.receta.deleteMany({ where: { ingredienteId: platoId } }),
      prisma.detalleComanda.updateMany({ where: { platoId }, data: { platoId: null } }),
      prisma.detalleVenta.updateMany({ where: { platoId }, data: { platoId: null } }),
      prisma.detalleRecetaPrimaria.deleteMany({ where: { ingredienteId: platoId } }),
      prisma.detalleRecetaSecundaria.deleteMany({ where: { elementoId: platoId } }),
      prisma.plato.delete({ where: { id: platoId } })
    ]);

    res.json({ success: true });
  } catch (e) {
    console.error('Error crítico al eliminar plato:', e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;

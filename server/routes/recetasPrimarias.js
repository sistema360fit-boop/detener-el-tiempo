import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('RecetaPrimaria')
      .select('*, detalles:DetalleRecetaPrimaria(*)');
    if (error) throw error;
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
    
    const recipeId = crypto.randomUUID();
    
    const { data: receta, error: rError } = await supabase
      .from('RecetaPrimaria')
      .insert({
        id: recipeId,
        nombre,
        descripcion,
        unidadMedida,
        cantidadResultante: parseFloat(cantidadResultante) || 1,
        costoTotal: parseFloat(costoTotal) || 0,
        costoPorUnidad: parseFloat(costoPorUnidad) || 0,
        tiempoPreparacion,
        instrucciones,
        activa: activa !== false
      })
      .select().single();
    if (rError) throw rError;

    if (detalles && Array.isArray(detalles) && detalles.length > 0) {
      const detallesData = detalles.map(d => ({
        id: crypto.randomUUID(),
        recetaPrimariaId: recipeId,
        ingredienteId: d.ingrediente_id || d.ingredienteId || d.id,
        ingredienteNombre: d.ingrediente_nombre || d.ingredienteNombre || d.nombre,
        cantidad: parseFloat(d.cantidad_requerida || d.cantidad) || 0,
        unidadMedida: d.unidad_medida || d.unidadMedida,
        costoIngrediente: parseFloat(d.costo_ingrediente || d.costoIngrediente) || 0
      }));
      
      const { error: dError } = await supabase.from('DetalleRecetaPrimaria').insert(detallesData);
      if (dError) {
        await supabase.from('RecetaPrimaria').delete().eq('id', recipeId);
        throw dError;
      }
    }

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
    
    const { data: receta, error: rError } = await supabase
      .from('RecetaPrimaria')
      .update({
        nombre,
        descripcion,
        unidadMedida,
        cantidadResultante: parseFloat(cantidadResultante) || 1,
        costoTotal: parseFloat(costoTotal) || 0,
        costoPorUnidad: parseFloat(costoPorUnidad) || 0,
        tiempoPreparacion,
        instrucciones,
        activa
      })
      .eq('id', id)
      .select().single();
    if (rError) throw rError;

    if (detalles && Array.isArray(detalles)) {
      await supabase.from('DetalleRecetaPrimaria').delete().eq('recetaPrimariaId', id);
      
      if (detalles.length > 0) {
        const detallesData = detalles.map(d => ({
          id: crypto.randomUUID(),
          recetaPrimariaId: id,
          ingredienteId: d.ingrediente_id || d.ingredienteId || d.id,
          ingredienteNombre: d.ingrediente_nombre || d.ingredienteNombre || d.nombre,
          cantidad: parseFloat(d.cantidad_requerida || d.cantidad) || 0,
          unidadMedida: d.unidad_medida || d.unidadMedida,
          costoIngrediente: parseFloat(d.costo_ingrediente || d.costoIngrediente) || 0
        }));
        const { error: dError } = await supabase.from('DetalleRecetaPrimaria').insert(detallesData);
        if (dError) throw dError;
      }
    }

    res.json(receta);
  } catch (e) {
    console.error('Update receta primaria error', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.from('DetalleRecetaPrimaria').delete().eq('recetaPrimariaId', id);
    const { error } = await supabase.from('RecetaPrimaria').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('Delete receta primaria error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

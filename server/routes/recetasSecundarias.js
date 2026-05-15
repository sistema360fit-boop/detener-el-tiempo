import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('RecetaSecundaria')
      .select('*, detalles:DetalleRecetaSecundaria(*)');
    if (error) throw error;
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
    
    const recipeId = crypto.randomUUID();
    
    const { data: receta, error: rError } = await supabase
      .from('RecetaSecundaria')
      .insert({
        id: recipeId,
        nombre,
        descripcion,
        unidadMedida,
        cantidadResultante: parseFloat(cantidadResultante) || 1,
        costoTotal: parseFloat(costoTotal) || 0,
        costoPorUnidad: parseFloat(costoPorUnidad) || 0,
        activa: activa !== false
      })
      .select().single();
    if (rError) throw rError;

    if (detalles && Array.isArray(detalles) && detalles.length > 0) {
      const detallesData = detalles.map(d => ({
        id: crypto.randomUUID(),
        recetaSecundariaId: recipeId,
        elementoId: d.elementoId || d.elemento_id || d.id,
        elementoNombre: d.elementoNombre || d.elemento_nombre || d.nombre,
        tipoElemento: d.tipoElemento || d.tipo_elemento || 'ingrediente',
        cantidad: parseFloat(d.cantidad) || 0,
        costoElemento: parseFloat(d.costoElemento || d.costo_elemento) || 0
      }));
      
      const { error: dError } = await supabase.from('DetalleRecetaSecundaria').insert(detallesData);
      if (dError) {
        await supabase.from('RecetaSecundaria').delete().eq('id', recipeId);
        throw dError;
      }
    }

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
    
    const { data: receta, error: rError } = await supabase
      .from('RecetaSecundaria')
      .update({
        nombre,
        descripcion,
        unidadMedida,
        cantidadResultante: parseFloat(cantidadResultante) || 1,
        costoTotal: parseFloat(costoTotal) || 0,
        costoPorUnidad: parseFloat(costoPorUnidad) || 0,
        activa
      })
      .eq('id', id)
      .select().single();
    if (rError) throw rError;

    if (detalles && Array.isArray(detalles)) {
      await supabase.from('DetalleRecetaSecundaria').delete().eq('recetaSecundariaId', id);
      
      if (detalles.length > 0) {
        const detallesData = detalles.map(d => ({
          id: crypto.randomUUID(),
          recetaSecundariaId: id,
          elementoId: d.elementoId || d.elemento_id || d.id,
          elementoNombre: d.elementoNombre || d.elemento_nombre || d.nombre,
          tipoElemento: d.tipoElemento || d.tipo_elemento || 'ingrediente',
          cantidad: parseFloat(d.cantidad) || 0,
          costoElemento: parseFloat(d.costoElemento || d.costo_elemento) || 0
        }));
        const { error: dError } = await supabase.from('DetalleRecetaSecundaria').insert(detallesData);
        if (dError) throw dError;
      }
    }

    res.json(receta);
  } catch (e) {
    console.error('Update receta secundaria error', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await supabase.from('DetalleRecetaSecundaria').delete().eq('recetaSecundariaId', id);
    const { error } = await supabase.from('RecetaSecundaria').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('Delete receta secundaria error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

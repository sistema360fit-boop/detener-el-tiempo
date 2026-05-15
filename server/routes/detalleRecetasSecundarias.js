import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('DetalleRecetaSecundaria').select('*');
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Get detalles recetas secundarias error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { recetaSecundariaId, elementoId, elementoNombre, tipoElemento, cantidad, unidadMedida, costoElemento } = req.body;
    const { data, error } = await supabase
      .from('DetalleRecetaSecundaria')
      .insert({
        id: crypto.randomUUID(),
        recetaSecundariaId, elementoId, elementoNombre,
        tipoElemento, cantidad, unidadMedida,
        costoElemento: costoElemento || 0
      })
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Create detalle receta secundaria error', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('DetalleRecetaSecundaria').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('Delete detalle receta secundaria error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('DetalleRecetaPrimaria').select('*');
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Get detalles recetas primarias error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { recetaPrimariaId, ingredienteId, ingredienteNombre, tipoElemento, cantidad, unidadMedida, costoIngrediente } = req.body;
    const { data, error } = await supabase
      .from('DetalleRecetaPrimaria')
      .insert({
        id: crypto.randomUUID(),
        recetaPrimariaId, ingredienteId, ingredienteNombre,
        tipoElemento, cantidad, unidadMedida,
        costoIngrediente: costoIngrediente || 0
      })
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Create detalle receta primaria error', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('DetalleRecetaPrimaria').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('Delete detalle receta primaria error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

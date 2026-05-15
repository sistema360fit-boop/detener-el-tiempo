import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('CategoriaGasto').select('*');
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Get categorias error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const { data, error } = await supabase
      .from('CategoriaGasto')
      .insert({ id: crypto.randomUUID(), nombre, descripcion })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Create categoria error', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    const { data, error } = await supabase
      .from('CategoriaGasto')
      .update({ nombre, descripcion })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Update categoria error', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('CategoriaGasto').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('Delete categoria error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

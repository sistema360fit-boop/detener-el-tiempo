import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth } from '../middlewares/auth.js';
import crypto from 'crypto';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('AlertaStock').select('*').order('creadoEn', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Get alertas stock error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { 
      ingredienteId, ingrediente_id, 
      ingredienteNombre, nombre_ingrediente, 
      cantidad_actual, cantidad_minima, 
      fecha_alerta, resuelta 
    } = req.body;
    
    const id = req.body.id || crypto.randomUUID();
    const dataToInsert = {
      id,
      ingredienteId: ingredienteId || ingrediente_id,
      ingredienteNombre: ingredienteNombre || nombre_ingrediente,
      cantidad_actual,
      cantidad_minima,
      creadoEn: fecha_alerta || req.body.creadoEn || new Date().toISOString(),
      resuelta: resuelta || false
    };

    const { data, error } = await supabase.from('AlertaStock').insert(dataToInsert).select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (e) {
    console.error('Post alerta stock error', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { resuelta } = req.body;
    
    const { data, error } = await supabase
      .from('AlertaStock')
      .update({ resuelta })
      .eq('id', id)
      .select();
      
    if (error) throw error;
    res.json(data[0]);
  } catch (e) {
    console.error('Put alerta stock error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

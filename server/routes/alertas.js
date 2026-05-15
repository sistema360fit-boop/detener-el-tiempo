import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase.from('AlertaStock').select('*');
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Get alertas stock error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

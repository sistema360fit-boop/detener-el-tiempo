import express from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

// Get all users (for admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Usuario')
      .select('id, email, nombre, rol, activo, createdAt');
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Update user (admin only)
router.put('/', requireAdmin, async (req, res) => {
  try {
    const { id, email, password, nombre, rol, activo } = req.body;
    if (!id || !email || !nombre) {
      return res.status(400).json({ error: 'ID, email y nombre son requeridos' });
    }
    
    const updateData = {
      email: email.toLowerCase(),
      nombre,
      rol: rol || 'mesero',
      activo: activo !== false,
    };
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    const { data, error } = await supabase
      .from('Usuario')
      .update(updateData)
      .eq('id', id)
      .select('id, email, nombre, rol')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Update user error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

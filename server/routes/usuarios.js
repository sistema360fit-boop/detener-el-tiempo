import express from 'express';
import bcrypt from 'bcryptjs';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import prisma from '../prisma.js';

const router = express.Router();

// Get all users (for admin)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const data = await prisma.usuario.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        activo: true,
        createdAt: true
      }
    });
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
    
    const data = await prisma.usuario.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true
      }
    });
    res.json(data);
  } catch (e) {
    console.error('Update user error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.categoriaGasto.findMany();
    res.json(data);
  } catch (e) {
    console.error('Get categorias error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    const data = await prisma.categoriaGasto.create({
      data: { nombre, descripcion }
    });
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
    const data = await prisma.categoriaGasto.update({
      where: { id },
      data: { nombre, descripcion }
    });
    res.json(data);
  } catch (e) {
    console.error('Update categoria error', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.categoriaGasto.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error('Delete categoria error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

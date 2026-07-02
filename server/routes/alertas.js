import express from 'express';
import { requireAuth } from '../middlewares/auth.js';
import prisma from '../prisma.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.alertaStock.findMany({
      orderBy: { creadoEn: 'desc' }
    });
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
    
    const data = await prisma.alertaStock.create({
      data: {
        ingredienteId: ingredienteId || ingrediente_id,
        ingredienteNombre: ingredienteNombre || nombre_ingrediente,
        cantidad_actual: parseFloat(cantidad_actual) || 0,
        cantidad_minima: parseFloat(cantidad_minima) || 0,
        creadoEn: fecha_alerta || req.body.creadoEn ? new Date(fecha_alerta || req.body.creadoEn) : new Date(),
        resuelta: resuelta || false
      }
    });
    res.status(201).json(data);
  } catch (e) {
    console.error('Post alerta stock error', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { resuelta } = req.body;
    
    const data = await prisma.alertaStock.update({
      where: { id },
      data: { resuelta }
    });
      
    res.json(data);
  } catch (e) {
    console.error('Put alerta stock error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

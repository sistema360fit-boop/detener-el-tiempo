import express from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import prisma from '../prisma.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.cuentaPorCobrar.findMany({
      orderBy: { fecha_creacion: 'desc' }
    });
    
    // Normalize data for frontend
    const normalizedData = data.map(item => ({
      ...item,
      cliente_nombre: item.clienteNombre,
      empleado_id: item.empleadoId,
      fecha_vencimiento: item.vencimiento
    }));
    
    res.json(normalizedData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    const insertData = {
      clienteNombre: body.clienteNombre || body.cliente_nombre || 'Cliente sin nombre',
      empleadoId: body.empleadoId || body.empleado_id || null,
      monto: parseFloat(body.monto || body.monto_total || 0),
      monto_total: parseFloat(body.monto_total || body.monto || 0),
      monto_pendiente: parseFloat(body.monto_pendiente || body.monto_total || body.monto || 0),
      monto_descontado: parseFloat(body.monto_descontado || 0),
      estado: body.estado || 'pendiente',
      comanda_numero: body.comanda_numero || null,
      cliente_telefono: body.cliente_telefono || null,
      vencimiento: body.vencimiento || body.fecha_vencimiento ? new Date(body.vencimiento || body.fecha_vencimiento) : null,
      fecha_creacion: body.fecha_creacion ? new Date(body.fecha_creacion) : new Date()
    };

    const data = await prisma.cuentaPorCobrar.create({
      data: insertData
    });
    
    // Normalize for frontend
    const normalized = {
      ...data,
      cliente_nombre: data.clienteNombre,
      empleado_id: data.empleadoId,
      fecha_vencimiento: data.vencimiento
    };
    
    res.json(normalized);
  } catch (e) {
    console.error('[CuentasPorCobrar] Error creando:', e.message);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    if (updateData.vencimiento) updateData.vencimiento = new Date(updateData.vencimiento);
    if (updateData.fecha_creacion) updateData.fecha_creacion = new Date(updateData.fecha_creacion);

    const data = await prisma.cuentaPorCobrar.update({
      where: { id },
      data: updateData
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.cuentaPorCobrar.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

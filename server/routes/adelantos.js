import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.adelanto.findMany({
      where: { estado: { not: 'ARCHIVADO' } },
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    res.json(data);
  } catch (e) {
    console.error('Error fetching adelantos', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { empleado_id, empleadoId, empleado, empleado_nombre, monto, monto_original, montoOriginal, moneda_original, monedaOriginal, tasa_cambio, descripcion, notas, fecha, fecha_adelanto, metodo_pago, metodoPago, estado } = req.body;
    const finalEmpleadoId = empleadoId || empleado_id || null;
    const finalEstado = (estado || 'PENDIENTE').toUpperCase();
    
    const data = await prisma.adelanto.create({
      data: {
        empleadoId: finalEmpleadoId,
        empleado: empleado || empleado_nombre || 'Sin nombre',
        monto: parseFloat(monto) || 0,
        monto_pendiente: parseFloat(monto) || 0,
        monto_descontado: 0,
        monto_original: monto_original || montoOriginal ? parseFloat(monto_original || montoOriginal) : null,
        moneda_original: moneda_original || monedaOriginal || null,
        tasa_cambio: tasa_cambio ? parseFloat(tasa_cambio) : null,
        metodo_pago: metodo_pago || metodoPago || null,
        descripcion: notas || descripcion || null,
        estado: finalEstado,
        fecha: fecha_adelanto ? new Date(fecha_adelanto) : (fecha ? new Date(fecha) : new Date())
      }
    });
    res.json(data);
  } catch (e) {
    console.error('Error creating avance', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.adelanto.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting avance', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { empleado_id, empleadoId, empleado, empleado_nombre, monto, monto_original, montoOriginal, moneda_original, monedaOriginal, tasa_cambio, descripcion, notas, fecha, fecha_adelanto, metodo_pago, metodoPago, estado, fecha_descuento } = req.body;
    
    const updateData = {};
    const finalEmpleadoId = empleadoId !== undefined ? empleadoId : empleado_id;
    if (finalEmpleadoId !== undefined) updateData.empleadoId = finalEmpleadoId;
    if (empleado || empleado_nombre) updateData.empleado = empleado || empleado_nombre;
    if (monto !== undefined) updateData.monto = parseFloat(monto);
    if (monto_original || montoOriginal !== undefined) updateData.monto_original = parseFloat(monto_original || montoOriginal);
    if (moneda_original || monedaOriginal !== undefined) updateData.moneda_original = moneda_original || monedaOriginal;
    if (tasa_cambio !== undefined) updateData.tasa_cambio = parseFloat(tasa_cambio);
    if (metodo_pago || metodoPago !== undefined) updateData.metodo_pago = metodo_pago || metodoPago;
    if (notas || descripcion !== undefined) updateData.descripcion = notas || descripcion;
    if (fecha_adelanto || fecha) updateData.fecha = fecha_adelanto ? new Date(fecha_adelanto) : new Date(fecha);
    
    // Campos de estado para integración con nómina
    if (estado !== undefined) updateData.estado = estado.toUpperCase();
    if (fecha_descuento !== undefined) updateData.fecha_descuento = fecha_descuento ? new Date(fecha_descuento) : null;
    
    const data = await prisma.adelanto.update({
      where: { id },
      data: updateData
    });
      
    res.json(data);
  } catch (e) {
    console.error('Error updating avance', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

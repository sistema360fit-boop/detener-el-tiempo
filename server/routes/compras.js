import express from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import prisma from '../prisma.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.compra.findMany({
      orderBy: { fecha_compra: 'desc' },
      take: 1000
    });
    res.json(data);
  } catch (e) {
    console.error('Error fetching compras', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const { 
      ingrediente_id, ingredienteId, 
      ingrediente_nombre, ingredienteNombre, 
      cantidad, 
      unidad_medida, unidadMedida, 
      costo_unitario, costoUnitario, 
      costo_total, costoTotal, 
      proveedor, numero_factura, numeroFactura,
      fecha_compra, fechaCompra, 
      fecha_entrega_estimada, fechaEntregaEstimada, 
      tipo_compra, tipoCompra, 
      estado, 
      empleado_nombre, empleadoNombre, 
      notas 
    } = req.body;

    const data = await prisma.compra.create({
      data: {
        ingrediente_id: ingrediente_id || ingredienteId,
        ingrediente_nombre: ingrediente_nombre || ingredienteNombre,
        cantidad: parseFloat(cantidad) || 0,
        unidad_medida: unidad_medida || unidadMedida,
        costo_unitario: parseFloat(costo_unitario || costoUnitario) || 0,
        costo_total: parseFloat(costo_total || costoTotal) || 0,
        proveedor,
        numero_factura: numero_factura || numeroFactura,
        fecha_compra: (fecha_compra || fechaCompra) ? new Date(fecha_compra || fechaCompra) : new Date(),
        fecha_entrega_estimada: (fecha_entrega_estimada || fechaEntregaEstimada) ? new Date(fecha_entrega_estimada || fechaEntregaEstimada) : null,
        tipo_compra: tipo_compra || tipoCompra,
        estado,
        empleado_nombre: empleado_nombre || empleadoNombre,
        notas
      }
    });
      
    res.json(data);
  } catch (e) {
    console.error('Error creating compra', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.compra.delete({ where: { id } });
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting compra', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.pagoCuentaPorCobrar.findMany({
      orderBy: { fecha_pago: 'desc' }
    });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const body = req.body;
    const metodo_pago = body.metodo_pago || body.metodoPago || 'efectivo_usd';

    const insertData = {
      cuenta_id: body.cuenta_id || body.cuentaId || null,
      cuentaId: body.cuenta_id || body.cuentaId || null,
      monto: parseFloat(body.monto_pagado ?? body.montoPagado ?? 0),
      monto_pagado: parseFloat(body.monto_pagado ?? body.montoPagado ?? 0),
      metodo: metodo_pago,
      metodo_pago,
      fecha: body.fecha_pago || body.fechaPago ? new Date(body.fecha_pago || body.fechaPago) : new Date(),
      fecha_pago: body.fecha_pago || body.fechaPago ? new Date(body.fecha_pago || body.fechaPago) : new Date(),
      tasa_bs_aplicada: parseFloat(body.tasa_bs_aplicada ?? body.tasaBsAplicada ?? 0),
      notas: body.notas ?? body.descripcion ?? '',
      empleado_nombre: body.empleado_nombre || body.empleadoNombre || 'Sistema'
    };

    const data = await prisma.pagoCuentaPorCobrar.create({
      data: insertData
    });
    res.json(data);
  } catch (e) {
    console.error('[PagosCuentas] Error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

export default router;

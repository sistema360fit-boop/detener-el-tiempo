import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import { explodirElemento, descontarDelInventario } from '../services/inventory.js';
import { broadcastCocina } from '../services/cocinaEvents.js';

const router = express.Router();
const prisma = new PrismaClient();

// Obtener todas las comandas
router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.comanda.findMany({
      include: { detalles: true },
      orderBy: { fecha_apertura: 'desc' },
      take: 1000
    });
    res.json(data);
  } catch (e) {
    console.error('Error fetching comandas', e);
    res.status(500).json({ error: e.message });
  }
});

// Crear comanda con detalles en una sola transacción lógica
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { 
      numero_comanda, mesa_numero, mesero_nombre, fecha_apertura, 
      estado, total_comanda, detalles, tipo_movimiento, 
      empleado_id, empleado_nombre, motivo_merma, admin_password 
    } = req.body;
    console.log('Body recibido en backend:', req.body);
    
    const movType = tipo_movimiento || 'VENTA';
    
    // 0. Validar contraseña si es MERMA o CREDITO_EMPLEADO
    if (movType === 'MERMA' || movType === 'CREDITO_EMPLEADO') {
      if (!admin_password) {
        return res.status(401).json({ error: 'Contraseña de administrador requerida para esta operación' });
      }
      const storedPassword = req.user.password || req.user.contrasena;
      const valid = await bcrypt.compare(admin_password, storedPassword);
      if (!valid) {
        return res.status(401).json({ error: 'Contraseña de administrador incorrecta' });
      }
    }

    const finalTotal = movType === 'MERMA' ? 0 : (parseFloat(total_comanda) || 0);
    const finalEstado = (movType === 'MERMA' || movType === 'CREDITO_EMPLEADO') ? 'pagada' : (estado || 'abierta');
    const finalFechaCierre = (movType === 'MERMA' || movType === 'CREDITO_EMPLEADO') ? new Date() : null;
    
    const detallesData = (detalles || []).map(d => ({
      platoId: d.plato_id || d.platoId || null,
      platoNombre: d.plato_nombre || d.platoNombre || null,
      cantidad: parseFloat(d.cantidad) || 0,
      precio: movType === 'MERMA' ? 0 : parseFloat(d.precio_unitario || d.precio || 0),
      estado_plato: finalEstado === 'pagada' ? 'completado' : (d.estado_plato || 'pendiente'),
      notas_plato: d.notas_plato || d.notas || null,
      variante: d.variante || null
    }));

    // 1 & 2. Insertar Comanda y Detalles
    const comanda = await prisma.comanda.create({
      data: {
        numero_comanda,
        mesa_numero: mesa_numero !== undefined ? String(mesa_numero) : null,
        mesero_nombre,
        fecha_apertura: fecha_apertura ? new Date(fecha_apertura) : new Date(),
        fecha_cierre: finalFechaCierre,
        estado: finalEstado,
        tipo_movimiento: movType,
        empleado_id: empleado_id || null,
        motivo_merma: motivo_merma || null,
        total_comanda: finalTotal,
        detalles: {
          create: detallesData
        }
      },
      include: { detalles: true }
    });
    
    // 3. Lógica Especial: Descuento Inmediato y Crédito
    if (movType === 'MERMA' || movType === 'CREDITO_EMPLEADO') {
      const consolidado = {};
      for (const detalle of comanda.detalles) {
        if (detalle.platoId) {
          await explodirElemento(detalle.platoId, detalle.cantidad, consolidado);
        }
      }
      for (const [ingredienteId, cantidad] of Object.entries(consolidado)) {
        await descontarDelInventario(ingredienteId, cantidad);
      }

      if (movType === 'CREDITO_EMPLEADO') {
        // Crear Adelanto en lugar de Cuenta por Cobrar
        await prisma.adelanto.create({
          data: {
            empleadoId: empleado_id,
            empleado: empleado_nombre || 'Desconocido',
            monto: finalTotal,
            monto_pendiente: finalTotal,
            monto_descontado: 0,
            descripcion: `Consumo interno (Comanda #${numero_comanda})`,
            estado: 'PENDIENTE',
            fecha: new Date()
          }
        });
      }
      
      return res.json({ ...comanda, isSpecialMode: true });
    }

    res.json(comanda);

    // 🔔 Notificar a la cocina en tiempo real SOLO si es VENTA
    if (movType === 'VENTA') {
      broadcastCocina('nueva_comanda', {
        id: comanda.id,
        numero_comanda,
        mesa_numero: mesa_numero !== undefined ? String(mesa_numero) : null,
        mesero_nombre,
        platos: comanda.detalles
      });
    }
  } catch (e) {
    console.error('Error creating comanda', e);
    res.status(500).json({ error: e.message });
  }
});

// Endpoint unificado para pagar y cerrar comanda
router.post('/:id/pagar', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      metodoPago, 
      tasaBs, 
      pagosMixtos, 
      descuentoMonto = 0,
      totalUSD,
      totalVES,
      totalCOP,
      datosCuenta
    } = req.body;

    // 1. Obtener la comanda y sus detalles
    const comanda = await prisma.comanda.findUnique({
      where: { id },
      include: { detalles: true }
    });
    if (!comanda) throw new Error('Comanda no encontrada');
    if (comanda.estado === 'pagada') throw new Error('La comanda ya ha sido pagada');

    const esMetodoBolivares = metodoPago && metodoPago.endsWith('_bs');

    await prisma.$transaction(async (tx) => {
      // 2. Crear la Venta
      const venta = await tx.venta.create({
        data: {
          fecha_hora: new Date(),
          total_venta: parseFloat(totalUSD) || 0,
          metodo_pago: metodoPago,
          total_cop: parseFloat(totalCOP) || 0,
          total_ves: parseFloat(totalVES) || 0,
          monto_original: esMetodoBolivares ? parseFloat(totalVES) || 0 : parseFloat(totalUSD) || 0,
          moneda_original: esMetodoBolivares ? 'VES' : 'USD'
        }
      });
      const ventaId = venta.id;

      // 3. Crear detalles de venta a partir de los de la comanda
      const detallesVenta = comanda.detalles.map(d => ({
        ventaId,
        platoId: d.platoId,
        platoNombre: d.platoNombre,
        cantidad: d.cantidad,
        precioUnitario: d.precio,
        subtotal: d.cantidad * d.precio
      }));

      if (detallesVenta.length > 0) {
        await tx.detalleVenta.createMany({ data: detallesVenta });
      }

      // 4. Manejar Pagos Mixtos si existen
      if (metodoPago === 'mixto' && pagosMixtos && pagosMixtos.length > 0) {
        const pagosData = pagosMixtos.map(p => ({
          ventaId,
          monto: parseFloat(p.monto_usd || p.monto || p.monto_original || 0),
          monto_usd: parseFloat(p.monto_usd || 0),
          monto_original: parseFloat(p.monto_original || 0),
          metodo_pago: p.metodo_pago,
          moneda: p.moneda || 'usd',
          fecha: new Date()
        }));
        await tx.pagoMixto.createMany({ data: pagosData });
      }

      // 4.5 Crear Cuenta por Cobrar si aplica
      if (metodoPago === 'cuentas_por_cobrar' && datosCuenta) {
        await tx.cuentaPorCobrar.create({
          data: {
            clienteNombre: datosCuenta.cliente_nombre || 'Cliente sin nombre',
            cliente_telefono: datosCuenta.cliente_telefono || null,
            vencimiento: datosCuenta.fecha_vencimiento ? new Date(datosCuenta.fecha_vencimiento) : null,
            monto: parseFloat(totalUSD) || 0,
            monto_total: parseFloat(totalUSD) || 0,
            monto_pendiente: parseFloat(totalUSD) || 0,
            monto_descontado: 0,
            estado: 'pendiente',
            comanda_numero: comanda.numero_comanda,
            fecha_creacion: new Date()
          }
        });
      }

      // 6. Cerrar Comanda
      await tx.comanda.update({
        where: { id },
        data: {
          estado: 'pagada',
          fecha_cierre: new Date(),
          total_comanda: parseFloat(totalUSD) || 0
        }
      });
    });

    // 5. 🔥 DESCONTAR INVENTARIO (No en transacción porque es recursivo y complejo)
    const consolidado = {};
    for (const detalle of comanda.detalles) {
      if (detalle.platoId) {
        await explodirElemento(detalle.platoId, detalle.cantidad, consolidado);
      }
    }
    for (const [ingredienteId, cantidad] of Object.entries(consolidado)) {
      await descontarDelInventario(ingredienteId, cantidad);
    }

    res.json({ ok: true }); // We don't have ventaId strictly passed back easily if we don't fetch it, but let's just say ok.

    // 🔔 Notificar a la cocina que la comanda fue pagada
    broadcastCocina('comanda_pagada', { id });
  } catch (e) {
    console.error('Error procesando pago comanda', e);
    res.status(500).json({ error: e.message });
  }
});

// Actualizar comanda
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { numero_comanda, mesa_numero, mesero_nombre, fecha_apertura, fecha_cierre, estado, total_comanda, detalles } = req.body;
    
    const updateData = {};
    if (numero_comanda !== undefined) updateData.numero_comanda = numero_comanda;
    if (mesa_numero !== undefined) updateData.mesa_numero = String(mesa_numero);
    if (mesero_nombre !== undefined) updateData.mesero_nombre = mesero_nombre;
    if (fecha_apertura) updateData.fecha_apertura = new Date(fecha_apertura);
    if (fecha_cierre) updateData.fecha_cierre = new Date(fecha_cierre);
    if (estado !== undefined) updateData.estado = estado;
    if (total_comanda !== undefined) updateData.total_comanda = parseFloat(total_comanda);
    
    // Usar transacción para actualizar comanda y reemplazar detalles
    const comanda = await prisma.$transaction(async (tx) => {
      let cmd = await tx.comanda.update({
        where: { id },
        data: updateData
      });

      if (detalles && Array.isArray(detalles)) {
        await tx.detalleComanda.deleteMany({ where: { comandaId: id } });
        const detallesData = detalles.map(d => ({
          comandaId: id,
          platoId: d.platoId || d.plato_id || null,
          platoNombre: d.platoNombre || d.plato_nombre || null,
          cantidad: parseFloat(d.cantidad) || 0,
          precio: parseFloat(d.precio || d.precio_unitario || 0),
          estado_plato: d.estado_plato || 'pendiente',
          notas_plato: d.notas_plato || d.notas || null,
          variante: d.variante || null
        }));
        if (detallesData.length > 0) {
          await tx.detalleComanda.createMany({ data: detallesData });
        }
        cmd = await tx.comanda.findUnique({ where: { id }, include: { detalles: true } });
      }
      return cmd;
    });
    
    res.json(comanda);

    // 🔔 Notificar a la cocina de la actualización
    broadcastCocina('comanda_actualizada', { id: req.params.id, ...comanda });
  } catch (e) {
    console.error('Error updating comanda', e);
    res.status(500).json({ error: e.message });
  }
});

// Agregar platos a comanda existente (con notificación a cocina)
router.post('/:id/detalles', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { platos } = req.body; // array de platos

    if (!platos || !platos.length) {
      return res.status(400).json({ error: 'No se enviaron platos' });
    }

    const detallesData = platos.map(d => ({
      comandaId: id,
      platoId: d.plato_id || d.platoId || null,
      platoNombre: d.plato_nombre || d.platoNombre || null,
      cantidad: parseFloat(d.cantidad) || 0,
      precio: parseFloat(d.precio_unitario || d.precio || 0),
      estado_plato: 'pendiente',
      notas_plato: d.notas_plato || d.notas || '',
      variante: d.variante || null
    }));

    await prisma.detalleComanda.createMany({ data: detallesData });
    // Fetch newly created ones based on comandaId? We can just fetch all for this comanda
    // but the original code returned just the new ones. Prisma createMany doesn't return created rows.
    // So we'll just fetch them based on some criteria, or just return ok.
    
    res.json({ success: true, count: detallesData.length });

    // 🔔 Notificar a la cocina: nuevos platos (sending the request body representation is fine)
    broadcastCocina('plato_agregado', { comanda_id: id, platos: detallesData });
  } catch (e) {
    console.error('Error adding detalles to comanda', e);
    res.status(500).json({ error: e.message });
  }
});

// Actualizar estado de un plato (DetalleComanda)
router.put('/detalles/:detalleId', requireAuth, async (req, res) => {
  try {
    const { detalleId } = req.params;
    const updateData = {};
    if (req.body.estado_plato) updateData.estado_plato = req.body.estado_plato;
    if (req.body.notas_plato !== undefined) updateData.notas_plato = req.body.notas_plato;
    if (req.body.cantidad !== undefined) updateData.cantidad = parseFloat(req.body.cantidad);

    const data = await prisma.detalleComanda.update({
      where: { id: detalleId },
      data: updateData
    });

    res.json(data);

    // 🔔 Notificar a la cocina del cambio de estado
    broadcastCocina('comanda_actualizada', { detalle: data });
  } catch (e) {
    console.error('Error updating detalle comanda', e);
    res.status(500).json({ error: e.message });
  }
});

// Eliminar comanda
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.$transaction([
      prisma.detalleComanda.deleteMany({ where: { comandaId: id } }),
      prisma.comanda.delete({ where: { id } })
    ]);
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting comanda', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

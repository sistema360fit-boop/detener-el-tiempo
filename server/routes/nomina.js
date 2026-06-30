import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// ─── GET /api/nomina ── Listar todas las nóminas ─────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.nomina.findMany({
      where: {
        estado: { not: 'ARCHIVADO' }
      },
      orderBy: { fecha_pago: 'desc' },
      take: 500
    });
    res.json(data ?? []);
  } catch (e) {
    console.error('Error fetching nominas', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/nomina/preview/:empleadoId ── Preview de nómina ────────────
// Calcula el neto sin persistir: salario_base − adelantos PENDIENTES
router.get('/preview/:empleadoId', requireAuth, async (req, res) => {
  try {
    const { empleadoId } = req.params;

    // 1. Obtener empleado
    const empleado = await prisma.empleado.findUnique({
      where: { id: empleadoId }
    });
    if (!empleado) return res.status(404).json({ error: 'Empleado no encontrado' });

    // 2. Obtener adelantos PENDIENTES, PARCIALES o POSPUESTOS de este empleado
    const adelantos = await prisma.adelanto.findMany({
      where: {
        empleadoId,
        estado: { in: ['PENDIENTE', 'PARCIAL', 'POSPUESTO'] }
      },
      orderBy: { fecha: 'asc' }
    });

    const totalAdelantos = (adelantos ?? []).reduce((sum, a) => sum + (a.monto_pendiente ?? a.monto ?? 0), 0);
    const salarioBase = empleado.salario_base ?? 0;
    
    // 2.5 Obtener cuentas por cobrar (créditos) PENDIENTES, PARCIALES o POSPUESTOS de este empleado
    const cuentas = await prisma.cuentaPorCobrar.findMany({
      where: {
        empleadoId,
        estado: { in: ['pendiente', 'PARCIAL', 'POSPUESTO'] }
      },
      orderBy: { fecha_creacion: 'asc' }
    });

    const totalCuentas = (cuentas ?? []).reduce((sum, c) => sum + (c.monto_pendiente ?? c.monto ?? 0), 0);
    const salarioNeto = salarioBase - totalAdelantos - totalCuentas;

    // 3. Obtener tasa de cambio activa más reciente
    const tasas = await prisma.tasaCambio.findMany({
      where: { activa: true },
      orderBy: { created_date: 'desc' },
      take: 1
    });
    const tasaActual = tasas?.[0] ?? null;

    res.json({
      empleado: {
        id: empleado.id,
        nombre: empleado.nombre,
        cargo: empleado.cargo,
        salario_base: salarioBase,
        cedula: empleado.cedula,
        telefono: empleado.telefono,
      },
      adelantos: adelantos ?? [],
      totalAdelantos,
      cuentas: cuentas ?? [],
      totalCuentas,
      salarioNeto,
      tasa: tasaActual ? {
        tasa_bs_usd: tasaActual.tasa_bs_usd,
        tasa_cop_usd: tasaActual.tasa_cop_usd,
        fecha: tasaActual.fecha,
      } : null,
    });
  } catch (e) {
    console.error('Error preview nómina', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/nomina/pagar ── Ejecutar pago de nómina ───────────────────
router.post('/pagar', requireAdmin, async (req, res) => {
  try {
    const {
      empleado_id,
      empleado_nombre,
      salario_base,
      adelantos_a_descontar = [], // Array de objetos { id, monto_a_descontar, monto_pendiente_original }
      total_adelantos,
      cuentas_a_descontar = [], // Array de objetos { id, monto_a_descontar, monto_pendiente_original }
      total_cuentas,
      salario_neto,
      metodo_pago,             // efectivo_usd, zelle, binance, nequi, pago_movil, etc.
      moneda_pago = 'USD',     // USD, BS, COP
      tasa_cambio = 1,
      monto_convertido,
      periodo_inicio,
      periodo_fin,
      notas,
      pagos_mixtos = [],
    } = req.body;

    // Validaciones
    if (!empleado_id) return res.status(400).json({ error: 'empleado_id es requerido' });
    if (salario_neto === undefined) return res.status(400).json({ error: 'salario_neto es requerido' });
    if (!metodo_pago) return res.status(400).json({ error: 'metodo_pago es requerido' });

    const nomina = await prisma.$transaction(async (tx) => {
      const now = new Date();

      // 1. Crear registro de Nómina
      const nominaRecord = await tx.nomina.create({
        data: {
          empleado_id,
          empleado_nombre: empleado_nombre ?? 'Sin nombre',
          periodo_inicio: periodo_inicio ? new Date(periodo_inicio) : null,
          periodo_fin: periodo_fin ? new Date(periodo_fin) : null,
          salario_base: parseFloat(salario_base) ?? 0,
          total_adelantos: parseFloat(total_adelantos) ?? 0,
          total_cuentas: parseFloat(total_cuentas) ?? 0,
          salario_neto: parseFloat(salario_neto) ?? 0,
          metodo_pago,
          moneda_pago,
          tasa_cambio: parseFloat(tasa_cambio) ?? 1,
          monto_convertido: parseFloat(monto_convertido) ?? parseFloat(salario_neto) ?? 0,
          estado: 'PAGADO',
          notas: notas ?? null,
          fecha_pago: now,
        }
      });
      const nominaId = nominaRecord.id;

      // 2. Actualizar adelantos según el pago parcial o total
      if (adelantos_a_descontar.length > 0) {
        for (const ad of adelantos_a_descontar) {
          const monto_descontado_ahora = parseFloat(ad.monto_a_descontar) || 0;
          const monto_pendiente_anterior = parseFloat(ad.monto_pendiente_original) || 0;
          
          let nuevo_estado;
          let nuevo_monto_pendiente = monto_pendiente_anterior - monto_descontado_ahora;
          
          const currentAd = await tx.adelanto.findUnique({ where: { id: ad.id }, select: { monto_descontado: true } });
          const monto_descontado_previo = currentAd?.monto_descontado || 0;
          const nuevo_monto_descontado_total = monto_descontado_previo + monto_descontado_ahora;

          if (monto_descontado_ahora === 0) {
            nuevo_estado = 'POSPUESTO';
            nuevo_monto_pendiente = monto_pendiente_anterior;
          } else if (nuevo_monto_pendiente <= 0) {
            nuevo_estado = 'DESCONTADO';
            nuevo_monto_pendiente = 0;
          } else {
            nuevo_estado = 'PARCIAL';
          }

          await tx.adelanto.update({
            where: { id: ad.id },
            data: {
              estado: nuevo_estado,
              monto_pendiente: nuevo_monto_pendiente,
              monto_descontado: nuevo_monto_descontado_total,
              fecha_descuento: now,
              nomina_id: nominaId,
            }
          });
        }
      }

      // 2.5 Marcar cuentas por cobrar según pago parcial o total
      if (cuentas_a_descontar.length > 0) {
        for (const cta of cuentas_a_descontar) {
          const monto_descontado_ahora = parseFloat(cta.monto_a_descontar) || 0;
          const monto_pendiente_anterior = parseFloat(cta.monto_pendiente_original) || 0;
          
          let nuevo_estado;
          let nuevo_monto_pendiente = monto_pendiente_anterior - monto_descontado_ahora;
          
          const currentCta = await tx.cuentaPorCobrar.findUnique({ where: { id: cta.id }, select: { monto_descontado: true } });
          const monto_descontado_previo = currentCta?.monto_descontado || 0;
          const nuevo_monto_descontado_total = monto_descontado_previo + monto_descontado_ahora;

          if (monto_descontado_ahora === 0) {
            nuevo_estado = 'POSPUESTO';
            nuevo_monto_pendiente = monto_pendiente_anterior;
          } else if (nuevo_monto_pendiente <= 0) {
            nuevo_estado = 'pagada';
            nuevo_monto_pendiente = 0;
          } else {
            nuevo_estado = 'PARCIAL';
          }

          await tx.cuentaPorCobrar.update({
            where: { id: cta.id },
            data: {
              estado: nuevo_estado,
              monto_pendiente: nuevo_monto_pendiente,
              monto_descontado: nuevo_monto_descontado_total
            }
          });
            
          if (monto_descontado_ahora > 0) {
            await tx.pagoCuentaPorCobrar.create({
              data: {
                cuenta_id: cta.id,
                cuentaId: cta.id,
                monto: monto_descontado_ahora,
                monto_pagado: monto_descontado_ahora,
                metodo: 'descuento_nomina',
                metodo_pago: 'descuento_nomina',
                fecha: now,
                fecha_pago: now,
                notas: `Descuento por nómina (Nomina ID: ${nominaId})`,
                empleado_nombre: empleado_nombre ?? 'Sistema'
              }
            });
          }
        }
      }

      // 3. Integración con Arqueo de Caja: Registrar pago como EGRESO
      if (metodo_pago === 'mixto' && pagos_mixtos && pagos_mixtos.length > 0) {
        for (const p of pagos_mixtos) {
          const montoGastoUSD = parseFloat(p.monto_usd);
          let montoOriginal = montoGastoUSD;
          if (p.moneda === 'ves') {
            montoOriginal = parseFloat(p.monto_ves) || (montoGastoUSD * p.tasa_cambio_aplicada);
          } else if (p.moneda === 'cop') {
            montoOriginal = parseFloat(p.monto_cop) || (montoGastoUSD * p.tasa_cambio_aplicada);
          }

          await tx.gasto.create({
            data: {
              descripcion: `Nómina Mixto: ${empleado_nombre ?? 'Empleado'} (${p.metodo_pago})`,
              monto: montoGastoUSD,
              monto_original: montoOriginal,
              moneda_original: p.moneda.toUpperCase(),
              metodo_pago: p.metodo_pago,
              categoriaNombre: 'Nómina',
              fecha: now,
            }
          });
        }
      } else {
        const montoEgresoUSD = parseFloat(salario_neto) ?? 0;

        await tx.gasto.create({
          data: {
            descripcion: `Nómina: ${empleado_nombre ?? 'Empleado'} (${periodo_inicio ?? 'N/A'} - ${periodo_fin ?? 'N/A'})`,
            monto: montoEgresoUSD,
            monto_original: parseFloat(monto_convertido) ?? montoEgresoUSD,
            moneda_original: moneda_pago ?? 'USD',
            metodo_pago: metodo_pago,
            categoriaNombre: 'Nómina',
            fecha: now,
          }
        });
      }

      return nominaRecord;
    });

    res.json({
      success: true,
      nomina,
      adelantos_descontados: adelantos_a_descontar.length,
      egreso_registrado: true,
    });
  } catch (e) {
    console.error('Error procesando pago de nómina', e);
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE /api/nomina/:id ── Anular nómina ─────────────────────────────
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const nomina = await prisma.nomina.findUnique({ where: { id } });

    if (nomina) {
      const adelantosRevert = await prisma.adelanto.findMany({ where: { nomina_id: id } });
      if (adelantosRevert.length > 0) {
        for (const ad of adelantosRevert) {
          await prisma.adelanto.update({
            where: { id: ad.id },
            data: {
              estado: 'PENDIENTE',
              monto_pendiente: ad.monto_pendiente + (ad.monto_descontado || 0),
              monto_descontado: 0,
              fecha_descuento: null,
              nomina_id: null
            }
          });
        }
      }
    }

    await prisma.nomina.update({
      where: { id },
      data: { estado: 'ANULADO' }
    });

    res.json({ success: true });
  } catch (e) {
    console.error('Error anulando nómina', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

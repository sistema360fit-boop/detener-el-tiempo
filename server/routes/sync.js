import express from 'express';
import { requireAdmin } from '../middlewares/auth.js';
import prisma from '../prisma.js';

const router = express.Router();

// Whitelist de entidades permitidas para sincronización
const ALLOWED_ENTITIES = [
  'venta', 'detalleVenta', 'comanda', 'detalleComanda',
  'ingrediente', 'plato', 'receta', 'gasto', 'adelanto',
  'categoriaGasto', 'tasaCambio', 'empleado', 'alertaStock',
  'recetaPrimaria', 'recetaSecundaria', 'detalleRecetaPrimaria',
  'detalleRecetaSecundaria', 'compra', 'cuentaPorCobrar', 'pagoMixto'
];

// Endpoint para sincronizar datos desde el frontend (bulk sync desde localStorage)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const payload = req.body || {};
    const entities = payload.entities || {};

    const toProp = (name) => {
      const first = name.charAt(0).toLowerCase();
      return first + name.slice(1);
    };

    const results = {};

    for (const [entityName, items] of Object.entries(entities)) {
      const prop = toProp(entityName);
      
      if (!ALLOWED_ENTITIES.includes(prop) || !prisma[prop]) {
        console.warn('Entidad no permitida o no encontrada en Prisma:', prop);
        continue;
      }

      results[entityName] = [];
      for (const item of items) {
        try {
          const normalizedData = { ...item };
          
          // Normalizar campos de relaciones
          if (normalizedData.created_date && !normalizedData.createdAt) {
            normalizedData.createdAt = normalizedData.created_date;
            delete normalizedData.created_date;
          }
          if (normalizedData.comanda_id && !normalizedData.comandaId) {
            normalizedData.comandaId = normalizedData.comanda_id;
            delete normalizedData.comanda_id;
          }
          if (normalizedData.plato_id && !normalizedData.platoId) {
            normalizedData.platoId = normalizedData.plato_id;
            delete normalizedData.plato_id;
          }
          if (normalizedData.venta_id && !normalizedData.ventaId) {
            normalizedData.ventaId = normalizedData.venta_id;
            delete normalizedData.venta_id;
          }
          if (normalizedData.ingrediente_id && !normalizedData.ingredienteId) {
            normalizedData.ingredienteId = normalizedData.ingrediente_id;
            delete normalizedData.ingrediente_id;
          }
          if (normalizedData.empleado_id && !normalizedData.empleadoId) {
            normalizedData.empleadoId = normalizedData.empleado_id;
            delete normalizedData.empleado_id;
          }

          // Convertir fechas a objetos Date
          const dateFields = ['fecha', 'fecha_hora', 'fecha_apertura', 'fecha_cierre', 'createdAt', 'updatedAt', 'creadoEn', 'fecha_pago', 'fecha_creacion', 'vencimiento'];
          for (const df of dateFields) {
            if (normalizedData[df] && typeof normalizedData[df] === 'string') {
              normalizedData[df] = new Date(normalizedData[df]);
            }
          }

          // Asegurar que tenga ID
          if (!normalizedData.id) {
            normalizedData.id = crypto.randomUUID();
          }

          const upserted = await prisma[prop].upsert({
            where: { id: normalizedData.id },
            update: normalizedData,
            create: normalizedData
          });
          
          results[entityName].push(upserted);
        } catch (e) {
          console.warn('Error syncing item for', entityName, e.message);
        }
      }
    }

    res.json({ ok: true, results });
  } catch (e) {
    console.error('Sync error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

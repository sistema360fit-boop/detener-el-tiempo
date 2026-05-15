import express from 'express';
import supabase from '../config/supabase.js';
import { requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

// Whitelist de entidades permitidas para sincronización
const ALLOWED_ENTITIES = [
  'venta', 'detalleVenta', 'comanda', 'detalleComanda',
  'ingrediente', 'plato', 'receta', 'gasto', 'adelanto',
  'categoriaGasto', 'tasaCambio', 'empleado', 'alertaStock',
  'recetaPrimaria', 'recetaSecundaria', 'detalleRecetaPrimaria',
  'detalleRecetaSecundaria', 'compra', 'cuentaPorCobrar', 'pagoMixto'
];

// Mapeo de nombres de entidad a nombres de tabla en Supabase (PascalCase)
const TABLE_MAP = {
  'venta': 'Venta', 'detalleVenta': 'DetalleVenta',
  'comanda': 'Comanda', 'detalleComanda': 'DetalleComanda',
  'ingrediente': 'Ingrediente', 'plato': 'Plato', 'receta': 'Receta',
  'gasto': 'Gasto', 'adelanto': 'Adelanto',
  'categoriaGasto': 'CategoriaGasto', 'tasaCambio': 'TasaCambio',
  'empleado': 'Empleado', 'alertaStock': 'AlertaStock',
  'recetaPrimaria': 'RecetaPrimaria', 'recetaSecundaria': 'RecetaSecundaria',
  'detalleRecetaPrimaria': 'DetalleRecetaPrimaria',
  'detalleRecetaSecundaria': 'DetalleRecetaSecundaria',
  'compra': 'Compra', 'cuentaPorCobrar': 'CuentaPorCobrar',
  'pagoMixto': 'PagoMixto'
};

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
      const tableName = TABLE_MAP[prop];
      
      if (!ALLOWED_ENTITIES.includes(prop) || !tableName) {
        console.warn('Entidad no permitida o no encontrada:', prop);
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

          // Asegurar que tenga ID
          if (!normalizedData.id) {
            normalizedData.id = crypto.randomUUID();
          }

          const { data, error } = await supabase
            .from(tableName)
            .upsert(normalizedData)
            .select()
            .single();
          
          if (error) {
            console.warn('Error syncing item for', entityName, error.message);
          } else {
            results[entityName].push(data);
          }
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

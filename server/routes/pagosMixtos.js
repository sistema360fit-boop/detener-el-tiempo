import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('PagoMixto')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(500); // Límite más amplio para reportes
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Error fetching pagos mixtos', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { ventaId, monto, monto_usd, monto_original, moneda, metodo_pago, fecha } = req.body;
    const { data, error } = await supabase
      .from('PagoMixto')
      .insert({
        id: crypto.randomUUID(),
        ventaId,
        monto,
        monto_usd,
        monto_original,
        moneda,
        metodo_pago,
        fecha: fecha ? new Date(fecha).toISOString() : new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Error creating pago mixto', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

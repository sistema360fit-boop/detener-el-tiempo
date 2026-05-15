import express from 'express';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Adelanto').select('*')
      .order('createdAt', { ascending: false })
      .limit(200);
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Error fetching adelantos', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { empleado_id, empleado, empleado_nombre, monto, monto_original, montoOriginal, moneda_original, monedaOriginal, tasa_cambio, descripcion, notas, fecha, fecha_adelanto, metodo_pago, metodoPago } = req.body;
    const { data, error } = await supabase
      .from('Adelanto')
      .insert({
        id: crypto.randomUUID(),
        empleadoId: empleado_id || null,
        empleado: empleado || empleado_nombre || 'Sin nombre',
        monto: monto || 0,
        monto_original: monto_original || montoOriginal || null,
        moneda_original: moneda_original || monedaOriginal || null,
        tasa_cambio: tasa_cambio || null,
        metodo_pago: metodo_pago || metodoPago || null,
        descripcion: notas || descripcion || null,
        fecha: fecha_adelanto ? new Date(fecha_adelanto).toISOString() : (fecha ? new Date(fecha).toISOString() : new Date().toISOString())
      })
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Error creating avance', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('Adelanto').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting avance', e);
    res.status(500).json({ error: e.message });
  }
});
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { empleado_id, empleado, empleado_nombre, monto, monto_original, montoOriginal, moneda_original, monedaOriginal, tasa_cambio, descripcion, notas, fecha, fecha_adelanto, metodo_pago, metodoPago, estado, fecha_descuento } = req.body;
    
    const updateData = {};
    if (empleado_id !== undefined) updateData.empleadoId = empleado_id;
    if (empleado || empleado_nombre) updateData.empleado = empleado || empleado_nombre;
    if (monto !== undefined) updateData.monto = monto;
    if (monto_original || montoOriginal !== undefined) updateData.monto_original = monto_original || montoOriginal;
    if (moneda_original || monedaOriginal !== undefined) updateData.moneda_original = moneda_original || monedaOriginal;
    if (tasa_cambio !== undefined) updateData.tasa_cambio = tasa_cambio;
    if (metodo_pago || metodoPago !== undefined) updateData.metodo_pago = metodo_pago || metodoPago;
    if (notas || descripcion !== undefined) updateData.descripcion = notas || descripcion;
    if (fecha_adelanto || fecha) updateData.fecha = fecha_adelanto ? new Date(fecha_adelanto).toISOString() : new Date(fecha).toISOString();
    
    // Add estado if it's sent (even though it's not in the DB, wait, we don't have 'estado' in DB!)
    
    const { data, error } = await supabase
      .from('Adelanto')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
      
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Error updating avance', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

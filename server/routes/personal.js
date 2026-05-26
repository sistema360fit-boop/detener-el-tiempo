import express from 'express';
import bcrypt from 'bcryptjs';
import supabase from '../config/supabase.js';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('Empleado')
      .select('*')
      .order('createdAt', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e) {
    console.error('Get personal error', e);
    res.status(500).json({ error: e.message });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { nombre, usuario, password, rol, activo, salario_base, cargo, cedula, telefono } = req.body;
    
    if (!nombre || !usuario || !password) {
      return res.status(400).json({ error: 'Nombre, usuario y contraseña son requeridos' });
    }
    
    const { data: existingUser } = await supabase
      .from('Empleado').select('id').eq('usuario', usuario.toLowerCase()).maybeSingle();
    
    if (existingUser) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { data, error } = await supabase
      .from('Empleado')
      .insert({
        id: crypto.randomUUID(),
        nombre,
        usuario: usuario.toLowerCase(),
        password: hashedPassword,
        rol: rol || 'mesero',
        activo: activo !== false,
        salario_base: salario_base ?? 0,
        cargo: cargo ?? null,
        cedula: cedula ?? null,
        telefono: telefono ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    
    const { password: _, ...personaSinPassword } = data;
    res.json(personaSinPassword);
  } catch (e) {
    console.error('Create personal error', e);
    res.status(500).json({ error: e.message });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, usuario, password, rol, activo, salario_base, cargo, cedula, telefono } = req.body;
    
    if (!nombre || !usuario) {
      return res.status(400).json({ error: 'Nombre y usuario son requeridos' });
    }
    
    const { data: existingUser } = await supabase
      .from('Empleado').select('id')
      .eq('usuario', usuario.toLowerCase())
      .neq('id', id)
      .maybeSingle();
    
    if (existingUser) {
      return res.status(400).json({ error: 'El nombre de usuario ya está en uso' });
    }
    
    const updateData = {
      nombre,
      usuario: usuario.toLowerCase(),
      rol,
      activo: activo !== false
    };
    
    // Include optional payroll fields if provided
    if (salario_base !== undefined) updateData.salario_base = salario_base;
    if (cargo !== undefined) updateData.cargo = cargo;
    if (cedula !== undefined) updateData.cedula = cedula;
    if (telefono !== undefined) updateData.telefono = telefono;
    
    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    const { data, error } = await supabase
      .from('Empleado')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    
    const { password: _, ...personaSinPassword } = data;
    res.json(personaSinPassword);
  } catch (e) {
    console.error('Update personal error', e);
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('Empleado').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (e) {
    console.error('Delete personal error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

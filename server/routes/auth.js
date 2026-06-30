import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '24h';

// Register new user (SOLO ADMINISTRADORES pueden crear usuarios)
router.post('/register', requireAdmin, async (req, res) => {
  try {
    const { email, password, nombre, rol, usuario } = req.body;
    if (!password || !nombre) {
      return res.status(400).json({ error: 'Password y nombre son requeridos' });
    }
    
    const emailToUse = email || usuario;
    if (!emailToUse) {
      return res.status(400).json({ error: 'Email o usuario son requeridos' });
    }
    if (emailToUse.trim() === '') {
      return res.status(400).json({ error: 'Email o usuario no pueden estar vacíos' });
    }
    if (email && email.trim() !== '' && email !== usuario) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Formato de email inválido' });
      }
    }
    if (usuario && usuario.trim() === '') {
      return res.status(400).json({ error: 'Usuario no puede estar vacío' });
    }
    if (nombre.trim() === '') {
      return res.status(400).json({ error: 'Nombre no puede estar vacío' });
    }
    if (password.trim() === '') {
      return res.status(400).json({ error: 'Password no puede estar vacío' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }
    
    const emailLower = emailToUse.toLowerCase();
    const usuarioLower = (usuario || emailToUse).toLowerCase();
    
    // Verificar duplicados en ambas tablas
    const existingUsuario = await prisma.usuario.findUnique({
      where: { email: emailLower },
      select: { id: true }
    });
    
    const existingEmpleado = await prisma.empleado.findUnique({
      where: { usuario: usuarioLower },
      select: { id: true }
    });
    
    if (existingUsuario) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email en el sistema' });
    }
    if (existingEmpleado) {
      return res.status(400).json({ error: 'Ya existe un empleado con ese usuario' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Intentar crear en Usuario
    try {
      const usuarioCreado = await prisma.usuario.create({
        data: {
          email: emailLower,
          password: hashedPassword,
          nombre,
          rol: rol || 'administrador',
        },
        select: {
          id: true,
          email: true,
          nombre: true,
          rol: true
        }
      });
      return res.json(usuarioCreado);
    } catch (userError) {
      // Si falla, intentar en Empleado
      try {
        const empleadoCreado = await prisma.empleado.create({
          data: {
            nombre,
            usuario: usuarioLower,
            password: hashedPassword,
            rol: rol || 'mesero',
            activo: true
          },
          select: {
            id: true,
            usuario: true,
            nombre: true,
            rol: true
          }
        });
        
        return res.json({
          id: empleadoCreado.id,
          email: empleadoCreado.usuario,
          nombre: empleadoCreado.nombre,
          rol: empleadoCreado.rol
        });
      } catch (empError) {
        return res.status(500).json({ error: 'Error al crear usuario: ' + empError.message });
      }
    }
  } catch (e) {
    console.error('Register error', e);
    res.status(500).json({ error: e.message });
  }
});

// Verificar token
router.get('/verify', requireAuth, async (req, res) => {
  try {
    res.json({ 
      valid: true, 
      user: {
        id: req.user.id,
        nombre: req.user.nombre,
        usuario: req.user.usuario || req.user.email,
        rol: req.user.rol,
        activo: req.user.activo
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { usuario, password } = req.body;
    if (!usuario || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }
    
    // Buscar en Usuario
    let user = await prisma.usuario.findUnique({
      where: { email: usuario.toLowerCase() }
    });
    
    if (!user) {
      // Buscar en Empleado
      const empleado = await prisma.empleado.findUnique({
        where: { usuario: usuario.toLowerCase() }
      });
      user = empleado;
      
      if (user && user.activo === false) {
        return res.status(401).json({ error: 'Usuario inactivo' });
      }
    } else if (user.activo === false) {
      return res.status(401).json({ error: 'Usuario inactivo' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    const storedPassword = user.password || user.contrasena;
    const valid = await bcrypt.compare(password, storedPassword);
    if (!valid) {
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    
    const tokenPayload = {
      id: user.id,
      email: user.email || user.usuario,
      nombre: user.nombre || user.nombre_completo,
      rol: user.rol
    };
    
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    
    res.json({ 
      token,
      user: {
        id: user.id, 
        email: user.email || user.usuario, 
        nombre: user.nombre || user.nombre_completo, 
        rol: user.rol 
      }
    });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: 'Error del servidor: ' + e.message });
  }
});

export default router;

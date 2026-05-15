import jwt from 'jsonwebtoken';
import supabase from '../config/supabase.js';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ ERROR CRÍTICO: JWT_SECRET environment variable is required');
  process.exit(1);
}

export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No autorizado: falta token JWT' });
    }
    
    const token = authHeader.substring(7);
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'No autorizado: token expirado' });
      }
      return res.status(401).json({ error: 'No autorizado: token inválido' });
    }
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'No autorizado: token sin ID de usuario' });
    }
    
    let usuario = null;
    
    const { data: empleado } = await supabase
      .from('Empleado')
      .select('*')
      .eq('id', decoded.id)
      .single();
    
    if (empleado) {
      usuario = empleado;
    }
    
    if (!usuario) {
      const { data: user } = await supabase
        .from('Usuario')
        .select('*')
        .eq('id', decoded.id)
        .single();
      
      if (user) {
        usuario = user;
      }
    }
    
    if (!usuario) {
      return res.status(401).json({ error: 'No autorizado: usuario no encontrado' });
    }
    
    if (usuario.activo === false) {
      return res.status(401).json({ error: 'No autorizado: usuario inactivo' });
    }
    
    req.user = usuario;
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Error de autenticación' });
  }
};

export const requireAdmin = async (req, res, next) => {
  await requireAuth(req, res, async () => {
    const rolUsuario = req.user.rol?.toLowerCase();
    if (rolUsuario !== 'administrador') {
      return res.status(403).json({ error: 'No autorizado: se requiere rol de administrador' });
    }
    next();
  });
};

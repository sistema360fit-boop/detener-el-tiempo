import express from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.js';
import prisma from '../prisma.js';

const router = express.Router();

// GET /api/menu-del-dia — Listar menús (últimos 30)
router.get('/', requireAuth, async (req, res) => {
  try {
    const data = await prisma.menuDelDia.findMany({
      include: { items: { orderBy: { orden: 'asc' } } },
      orderBy: { fecha: 'desc' },
      take: 30
    });
    res.json(data);
  } catch (e) {
    console.error('Get menus error', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/menu-del-dia/hoy — Menú activo de hoy (para meseros)
router.get('/hoy', requireAuth, async (req, res) => {
  try {
    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    
    const menu = await prisma.menuDelDia.findUnique({
      where: { fecha: fechaHoy },
      include: { items: { orderBy: { orden: 'asc' } } }
    });

    if (!menu || !menu.activo) {
      return res.json(null);
    }

    res.json(menu);
  } catch (e) {
    console.error('Get menu hoy error', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/menu-del-dia/:id — Un menú específico
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const menu = await prisma.menuDelDia.findUnique({
      where: { id: req.params.id },
      include: { items: { orderBy: { orden: 'asc' } } }
    });
    if (!menu) return res.status(404).json({ error: 'Menú no encontrado' });
    res.json(menu);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/menu-del-dia — Crear menú del día (admin)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { fecha, precio, notas, items } = req.body;

    if (!fecha) return res.status(400).json({ error: 'La fecha es requerida' });
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Debe agregar al menos un plato al menú' });
    }

    // Verificar si ya existe un menú para esa fecha
    const existente = await prisma.menuDelDia.findUnique({ where: { fecha } });
    if (existente) {
      return res.status(400).json({ error: `Ya existe un menú para la fecha ${fecha}. Edítelo o elimínelo primero.` });
    }

    const menu = await prisma.menuDelDia.create({
      data: {
        fecha,
        precio: parseFloat(precio) || 0,
        notas: notas || null,
        activo: true,
        items: {
          create: items.map((item, idx) => ({
            categoria: item.categoria || 'Principal',
            nombre: item.nombre,
            descripcion: item.descripcion || null,
            orden: item.orden ?? idx
          }))
        }
      },
      include: { items: { orderBy: { orden: 'asc' } } }
    });

    res.status(201).json(menu);
  } catch (e) {
    console.error('Create menu error', e);
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/menu-del-dia/:id — Actualizar menú (admin)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { precio, notas, activo, items } = req.body;

    // Actualizar datos del menú
    const updateData = {};
    if (precio !== undefined) updateData.precio = parseFloat(precio) || 0;
    if (notas !== undefined) updateData.notas = notas;
    if (activo !== undefined) updateData.activo = activo;

    // Si se envían items, reemplazar todos
    if (items && Array.isArray(items)) {
      // Eliminar items anteriores
      await prisma.menuDelDiaItem.deleteMany({ where: { menuId: req.params.id } });

      // Crear nuevos
      await prisma.menuDelDiaItem.createMany({
        data: items.map((item, idx) => ({
          menuId: req.params.id,
          categoria: item.categoria || 'Principal',
          nombre: item.nombre,
          descripcion: item.descripcion || null,
          orden: item.orden ?? idx
        }))
      });
    }

    const menu = await prisma.menuDelDia.update({
      where: { id: req.params.id },
      data: updateData,
      include: { items: { orderBy: { orden: 'asc' } } }
    });

    res.json(menu);
  } catch (e) {
    console.error('Update menu error', e);
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/menu-del-dia/:id — Eliminar menú (admin)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.menuDelDia.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete menu error', e);
    res.status(500).json({ error: e.message });
  }
});

export default router;

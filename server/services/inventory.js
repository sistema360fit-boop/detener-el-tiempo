import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Explode an element recursively to find all base ingredients.
 * @param {string} elementoId - UUID of the element
 * @param {number} cantidad - Quantity to explode
 * @param {object} consolidado - Accumulated ingredient quantities
 * @param {string|null} tipoHint - Optional type hint ('ingrediente', 'receta_primaria', 'receta_secundaria', 'plato')
 *                                  When provided, searches in the hinted table FIRST for efficiency and correctness.
 */
export async function explodirElemento(elementoId, cantidad, consolidado = {}, tipoHint = null) {
  if (!elementoId) return consolidado;
  
  const qty = parseFloat(cantidad);
  if (isNaN(qty) || qty <= 0) {
    console.log(`[INVENTARIO] ⚠️ Cantidad inválida para elemento ${elementoId}: ${cantidad} → parseFloat=${qty}`);
    return consolidado;
  }
  console.log(`[INVENTARIO] 🔍 Explorando elemento ${elementoId} con cantidad=${qty}${tipoHint ? ` (tipo: ${tipoHint})` : ''}`);

  // --- Helper functions for each entity type ---
  const buscarIngrediente = async () => {
    const ingrediente = await prisma.ingrediente.findUnique({
      where: { id: elementoId }
    });
    if (ingrediente) {
      if (!consolidado[elementoId]) consolidado[elementoId] = 0;
      consolidado[elementoId] += qty;
      console.log(`[INVENTARIO] 🟢 Ingrediente "${ingrediente.nombre}" += ${qty} → total acumulado: ${consolidado[elementoId]}`);
      return true;
    }
    return false;
  };

  const buscarRecetaPrimaria = async () => {
    const recetaPrimaria = await prisma.recetaPrimaria.findUnique({
      where: { id: elementoId },
      include: { detalles: true }
    });
    if (recetaPrimaria) {
      const factor = parseFloat(recetaPrimaria.cantidadResultante) || 1;
      console.log(`[INVENTARIO] 🔵 RecetaPrimaria "${recetaPrimaria.nombre}" (factor=${factor})`);
      for (const detalle of recetaPrimaria.detalles) {
        if (!detalle.ingredienteId) continue;
        const cantHijo = (qty * parseFloat(detalle.cantidad)) / factor;
        const subTipo = detalle.tipoElemento || null;
        console.log(`[INVENTARIO]   └─ Detalle: ${detalle.ingredienteId} (${subTipo || 'auto'}) × ${detalle.cantidad} / ${factor} = ${cantHijo}`);
        await explodirElemento(detalle.ingredienteId, cantHijo, consolidado, subTipo);
      }
      return true;
    }
    return false;
  };

  const buscarRecetaSecundaria = async () => {
    const recetaSecundaria = await prisma.recetaSecundaria.findUnique({
      where: { id: elementoId },
      include: { detalles: true }
    });
    if (recetaSecundaria) {
      const factor = parseFloat(recetaSecundaria.cantidadResultante) || 1;
      console.log(`[INVENTARIO] 🟣 RecetaSecundaria "${recetaSecundaria.nombre}" (factor=${factor})`);
      for (const detalle of recetaSecundaria.detalles) {
        if (!detalle.elementoId) continue;
        const cantHijo = (qty * parseFloat(detalle.cantidad)) / factor;
        const subTipo = detalle.tipoElemento || null;
        console.log(`[INVENTARIO]   └─ Detalle: ${detalle.elementoId} (${subTipo || 'auto'}) × ${detalle.cantidad} / ${factor} = ${cantHijo}`);
        await explodirElemento(detalle.elementoId, cantHijo, consolidado, subTipo);
      }
      return true;
    }
    return false;
  };

  const buscarPlato = async () => {
    const plato = await prisma.plato.findUnique({
      where: { id: elementoId },
      include: { recetas: true }
    });
    if (plato) {
      console.log(`[INVENTARIO] 🟡 Plato "${plato.nombre}" con ${plato.recetas.length} componentes`);
      for (const receta of plato.recetas) {
        const subId = receta.ingredienteId;
        if (!subId) continue;
        const subQty = qty * parseFloat(receta.cantidad_requerida);
        const subTipo = receta.tipo || null;
        console.log(`[INVENTARIO]   └─ Receta: ${receta.ingredienteNombre || subId} (${subTipo || 'auto'}) × ${receta.cantidad_requerida} = ${subQty}`);
        // Pass the tipo from Receta so the recursive call searches in the correct table first
        await explodirElemento(subId, subQty, consolidado, subTipo);
      }
      return true;
    }
    return false;
  };

  // --- Search order based on tipoHint ---
  // When tipoHint is provided, search in that table FIRST.
  // This prevents an ID from being matched in the wrong table.
  const searchOrder = {
    'ingrediente':        [buscarIngrediente, buscarRecetaPrimaria, buscarRecetaSecundaria, buscarPlato],
    'receta_primaria':    [buscarRecetaPrimaria, buscarIngrediente, buscarRecetaSecundaria, buscarPlato],
    'receta_secundaria':  [buscarRecetaSecundaria, buscarIngrediente, buscarRecetaPrimaria, buscarPlato],
    'plato':              [buscarPlato, buscarIngrediente, buscarRecetaPrimaria, buscarRecetaSecundaria],
  };

  // Default order: ingrediente → recetaPrimaria → recetaSecundaria → plato
  const searches = searchOrder[tipoHint] || [buscarIngrediente, buscarRecetaPrimaria, buscarRecetaSecundaria, buscarPlato];

  for (const searchFn of searches) {
    if (await searchFn()) return consolidado;
  }

  console.log(`[INVENTARIO] ⚠️ Elemento ${elementoId} no encontrado en ninguna tabla`);
  return consolidado;
}

export async function descontarDelInventario(ingredienteId, cantidadTotal) {
  if (!ingredienteId || isNaN(cantidadTotal) || cantidadTotal <= 0) {
    console.log(`[INVENTARIO] ⚠️ descontarDelInventario: saltando (id=${ingredienteId}, cantidadTotal=${cantidadTotal})`);
    return;
  }

  const ingrediente = await prisma.ingrediente.findUnique({
    where: { id: ingredienteId }
  });

  if (!ingrediente) {
    console.log(`[INVENTARIO] ⚠️ Ingrediente ${ingredienteId} no encontrado`);
    return;
  }

  const factorConversion = parseFloat(ingrediente.factor_conversion) || 1;
  const cantidadEnUnidadInventario = parseFloat(cantidadTotal) * factorConversion;
  const stockAnterior = parseFloat(ingrediente.cantidad_disponible) || 0;
  const nuevoStock = stockAnterior - cantidadEnUnidadInventario;
  
  console.log(`[INVENTARIO] 💸 Descontando "${ingrediente.nombre}": stock=${stockAnterior} - (${cantidadTotal} × factor ${factorConversion}) = ${nuevoStock}`);
  
  await prisma.ingrediente.update({
    where: { id: ingredienteId },
    data: { cantidad_disponible: nuevoStock }
  });

  // Crear alerta de stock mínimo si corresponde
  if (nuevoStock <= (ingrediente.cantidad_minima || 0)) {
    const existente = await prisma.alertaStock.findFirst({
      where: { ingredienteId }
    });
    
    if (!existente) {
      await prisma.alertaStock.create({
        data: {
          ingredienteId,
          ingredienteNombre: ingrediente.nombre,
          cantidad_actual: nuevoStock,
          cantidad_minima: ingrediente.cantidad_minima || 0
        }
      });
    }
  }
}

/**
 * Recalcula recursivamente los costos de platos y recetas que dependen de un ingrediente
 */
export async function recalcularCostosEnCascada(ingredienteId) {
  try {
    // 1. Obtener el ingrediente actualizado
    const ing = await prisma.ingrediente.findUnique({
      where: { id: ingredienteId }
    });
    if (!ing) return;

    // 2. Actualizar DetalleRecetaPrimaria
    const detPrim = await prisma.detalleRecetaPrimaria.findMany({
      where: { ingredienteId }
    });
    if (detPrim.length > 0) {
      for (const d of detPrim) {
        await prisma.detalleRecetaPrimaria.update({
          where: { id: d.id },
          data: { costoIngrediente: d.cantidad * (ing.costo_por_unidad || 0) }
        });
        
        // Recalcular el costo de la receta primaria padre
        await actualizarCostoRecetaPrimaria(d.recetaPrimariaId);
      }
    }

    // 3. Actualizar DetalleRecetaSecundaria (donde es ingrediente)
    const detSec = await prisma.detalleRecetaSecundaria.findMany({
      where: { elementoId: ingredienteId }
    });
    if (detSec.length > 0) {
      for (const d of detSec) {
        await prisma.detalleRecetaSecundaria.update({
          where: { id: d.id },
          data: { costoElemento: d.cantidad * (ing.costo_por_unidad || 0) }
        });
        
        // Recalcular el costo de la receta secundaria padre
        await actualizarCostoRecetaSecundaria(d.recetaSecundariaId);
      }
    }

    // 4. Actualizar Receta (Platos)
    const recetas = await prisma.receta.findMany({
      where: { ingredienteId }
    });
    if (recetas.length > 0) {
      for (const r of recetas) {
        await prisma.receta.update({
          where: { id: r.id },
          data: { costo_ingrediente: r.cantidad_requerida * (ing.costo_por_unidad || 0) }
        });
        
        // Recalcular el costo del plato padre
        await actualizarCostoPlato(r.platoId);
      }
    }
  } catch (err) {
    console.error('Error en recálculo en cascada:', err);
  }
}

async function actualizarCostoRecetaPrimaria(id) {
  const rp = await prisma.recetaPrimaria.findUnique({
    where: { id },
    include: { detalles: true }
  });
  if (!rp) return;
  const costoTotal = rp.detalles.reduce((acc, d) => acc + (d.costoIngrediente || 0), 0);
  const costoPorUnidad = rp.cantidadResultante > 0 ? costoTotal / rp.cantidadResultante : 0;
  
  await prisma.recetaPrimaria.update({
    where: { id },
    data: { costoTotal, costoPorUnidad }
  });
  
  // Si esta receta primaria se usa en otros platos o recetas secundarias, seguir la cadena...
  // (Añadir lógica similar si es necesario)
}

async function actualizarCostoRecetaSecundaria(id) {
  const rs = await prisma.recetaSecundaria.findUnique({
    where: { id },
    include: { detalles: true }
  });
  if (!rs) return;
  const costoTotal = rs.detalles.reduce((acc, d) => acc + (d.costoElemento || 0), 0);
  const costoPorUnidad = rs.cantidadResultante > 0 ? costoTotal / rs.cantidadResultante : 0;
  
  await prisma.recetaSecundaria.update({
    where: { id },
    data: { costoTotal, costoPorUnidad }
  });
  
  // Seguir la cadena...
  await actualizarPlatosQueUsanElemento(id, costoPorUnidad);
}

async function actualizarCostoPlato(id) {
  const plato = await prisma.plato.findUnique({
    where: { id },
    include: { recetas: true }
  });
  if (!plato) return;
  const costoTotal = plato.recetas.reduce((acc, r) => acc + (r.costo_ingrediente || 0), 0);
  await prisma.plato.update({
    where: { id },
    data: { costo_total: costoTotal, precio_sugerido: costoTotal * 1.7 }
  });
}

async function actualizarPlatosQueUsanElemento(elementoId, nuevoCostoUnidad) {
  const recetas = await prisma.receta.findMany({
    where: { ingredienteId: elementoId }
  });
  if (recetas.length > 0) {
    for (const r of recetas) {
      await prisma.receta.update({
        where: { id: r.id },
        data: { costo_ingrediente: r.cantidad_requerida * nuevoCostoUnidad }
      });
      await actualizarCostoPlato(r.platoId);
    }
  }
}

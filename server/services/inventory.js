import supabase from '../config/supabase.js';

export async function explodirElemento(elementoId, cantidad, consolidado = {}) {
  if (!elementoId) return consolidado;
  
  const qty = parseFloat(cantidad);
  if (isNaN(qty) || qty <= 0) return consolidado;

  // Primero buscar como ingrediente
  const { data: ingrediente } = await supabase
    .from('Ingrediente').select('*').eq('id', elementoId).maybeSingle();

  if (ingrediente) {
    if (!consolidado[elementoId]) consolidado[elementoId] = 0;
    consolidado[elementoId] += qty;
    return consolidado;
  }

  // Buscar como receta primaria
  const { data: recetaPrimaria } = await supabase
    .from('RecetaPrimaria')
    .select('*, detalles:DetalleRecetaPrimaria(*)')
    .eq('id', elementoId).maybeSingle();

  if (recetaPrimaria) {
    const factor = parseFloat(recetaPrimaria.cantidadResultante) || 1;
    for (const detalle of recetaPrimaria.detalles) {
      await explodirElemento(detalle.ingredienteId, (qty * parseFloat(detalle.cantidad)) / factor, consolidado);
    }
    return consolidado;
  }

  // Buscar como receta secundaria
  const { data: recetaSecundaria } = await supabase
    .from('RecetaSecundaria')
    .select('*, detalles:DetalleRecetaSecundaria(*)')
    .eq('id', elementoId).maybeSingle();

  if (recetaSecundaria) {
    const factor = parseFloat(recetaSecundaria.cantidadResultante) || 1;
    for (const detalle of recetaSecundaria.detalles) {
      await explodirElemento(detalle.elementoId, (qty * parseFloat(detalle.cantidad)) / factor, consolidado);
    }
    return consolidado;
  }

  // Buscar como plato
  const { data: plato } = await supabase
    .from('Plato')
    .select('*, recetas:Receta(*)')
    .eq('id', elementoId).maybeSingle();

  if (plato) {
    for (const receta of plato.recetas) {
      await explodirElemento(receta.ingredienteId || receta.ingrediente_id, qty * parseFloat(receta.cantidad_requerida), consolidado);
    }
    return consolidado;
  }

  return consolidado;
}

export async function descontarDelInventario(ingredienteId, cantidadTotal) {
  if (!ingredienteId || isNaN(cantidadTotal) || cantidadTotal <= 0) return;

  const { data: ingrediente } = await supabase
    .from('Ingrediente').select('*').eq('id', ingredienteId).maybeSingle();

  if (!ingrediente) return;

  const factorConversion = parseFloat(ingrediente.factor_conversion) || 1;
  const cantidadEnUnidadInventario = parseFloat(cantidadTotal) * factorConversion;
  const stockAnterior = parseFloat(ingrediente.cantidad_disponible) || 0;
  const nuevoStock = stockAnterior - cantidadEnUnidadInventario;
  
  await supabase.from('Ingrediente')
    .update({ cantidad_disponible: nuevoStock })
    .eq('id', ingredienteId);

  // Crear alerta de stock mínimo si corresponde
  if (nuevoStock <= (ingrediente.cantidad_minima || 0)) {
    const { data: existente } = await supabase
      .from('AlertaStock').select('id')
      .eq('ingredienteId', ingredienteId).limit(1).maybeSingle();
    
    if (!existente) {
      await supabase.from('AlertaStock').insert({
        id: crypto.randomUUID(),
        ingredienteId,
        ingredienteNombre: ingrediente.nombre,
        cantidad_actual: nuevoStock,
        cantidad_minima: ingrediente.cantidad_minima || 0
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
    const { data: ing } = await supabase.from('Ingrediente').select('*').eq('id', ingredienteId).maybeSingle();
    if (!ing) return;

    // 2. Actualizar DetalleRecetaPrimaria
    const { data: detPrim } = await supabase.from('DetalleRecetaPrimaria').select('*').eq('ingredienteId', ingredienteId);
    if (detPrim) {
      for (const d of detPrim) {
        await supabase.from('DetalleRecetaPrimaria').update({
          costo_ingrediente: d.cantidad * ing.costo_por_unidad
        }).eq('id', d.id);
        
        // Recalcular el costo de la receta primaria padre
        await actualizarCostoRecetaPrimaria(d.receta_primaria_id);
      }
    }

    // 3. Actualizar DetalleRecetaSecundaria (donde es ingrediente)
    const { data: detSec } = await supabase.from('DetalleRecetaSecundaria').select('*').eq('elementoId', ingredienteId);
    if (detSec) {
      for (const d of detSec) {
        await supabase.from('DetalleRecetaSecundaria').update({
          costo_elemento: d.cantidad * ing.costo_por_unidad
        }).eq('id', d.id);
        
        // Recalcular el costo de la receta secundaria padre
        await actualizarCostoRecetaSecundaria(d.receta_secundaria_id);
      }
    }

    // 4. Actualizar Receta (Platos)
    const { data: recetas } = await supabase.from('Receta').select('*').eq('ingredienteId', ingredienteId);
    if (recetas) {
      for (const r of recetas) {
        await supabase.from('Receta').update({
          costo_ingrediente: r.cantidad_requerida * ing.costo_por_unidad
        }).eq('id', r.id);
        
        // Recalcular el costo del plato padre
        await actualizarCostoPlato(r.platoId || r.plato_id);
      }
    }
  } catch (err) {
    console.error('Error en recálculo en cascada:', err);
  }
}

async function actualizarCostoRecetaPrimaria(id) {
  const { data: rp } = await supabase.from('RecetaPrimaria').select('*, detalles:DetalleRecetaPrimaria(*)').eq('id', id).maybeSingle();
  if (!rp) return;
  const costoTotal = rp.detalles.reduce((acc, d) => acc + (d.costo_ingrediente || 0), 0);
  const costoPorUnidad = rp.cantidadResultante > 0 ? costoTotal / rp.cantidadResultante : 0;
  
  await supabase.from('RecetaPrimaria').update({ costoTotal, costoPorUnidad }).eq('id', id);
  
  // Si esta receta primaria se usa en otros platos o recetas secundarias, seguir la cadena...
  // (Añadir lógica similar si es necesario)
}

async function actualizarCostoRecetaSecundaria(id) {
  const { data: rs } = await supabase.from('RecetaSecundaria').select('*, detalles:DetalleRecetaSecundaria(*)').eq('id', id).maybeSingle();
  if (!rs) return;
  const costoTotal = rs.detalles.reduce((acc, d) => acc + (d.costo_elemento || 0), 0);
  const costoPorUnidad = rs.cantidadResultante > 0 ? costoTotal / rs.cantidadResultante : 0;
  
  await supabase.from('RecetaSecundaria').update({ costoTotal, costoPorUnidad }).eq('id', id);
  
  // Seguir la cadena...
  await actualizarPlatosQueUsanElemento(id, costoPorUnidad);
}

async function actualizarCostoPlato(id) {
  const { data: plato } = await supabase.from('Plato').select('*, recetas:Receta(*)').eq('id', id).maybeSingle();
  if (!plato) return;
  const costoTotal = plato.recetas.reduce((acc, r) => acc + (r.costo_ingrediente || 0), 0);
  await supabase.from('Plato').update({ costo_total: costoTotal, precio_sugerido: costoTotal * 1.7 }).eq('id', id);
}

async function actualizarPlatosQueUsanElemento(elementoId, nuevoCostoUnidad) {
  const { data: recetas } = await supabase.from('Receta').select('*').eq('ingredienteId', elementoId);
  if (recetas) {
    for (const r of recetas) {
      await supabase.from('Receta').update({ costo_ingrediente: r.cantidad_requerida * nuevoCostoUnidad }).eq('id', r.id);
      await actualizarCostoPlato(r.platoId || r.plato_id);
    }
  }
}

import supabase from '../config/supabase.js';

export async function explodirElemento(elementoId, cantidad, consolidado = {}) {
  // Primero buscar como ingrediente
  const { data: ingrediente } = await supabase
    .from('Ingrediente').select('*').eq('id', elementoId).single();

  if (ingrediente) {
    if (!consolidado[elementoId]) consolidado[elementoId] = 0;
    consolidado[elementoId] += cantidad;
    return consolidado;
  }

  // Buscar como receta primaria
  const { data: recetaPrimaria } = await supabase
    .from('RecetaPrimaria')
    .select('*, detalles:DetalleRecetaPrimaria(*)')
    .eq('id', elementoId).single();

  if (recetaPrimaria) {
    const factor = recetaPrimaria.cantidadResultante || 1;
    for (const detalle of recetaPrimaria.detalles) {
      await explodirElemento(detalle.ingredienteId, (cantidad * detalle.cantidad) / factor, consolidado);
    }
    return consolidado;
  }

  // Buscar como receta secundaria
  const { data: recetaSecundaria } = await supabase
    .from('RecetaSecundaria')
    .select('*, detalles:DetalleRecetaSecundaria(*)')
    .eq('id', elementoId).single();

  if (recetaSecundaria) {
    const factor = recetaSecundaria.cantidadResultante || 1;
    for (const detalle of recetaSecundaria.detalles) {
      await explodirElemento(detalle.elementoId, (cantidad * detalle.cantidad) / factor, consolidado);
    }
    return consolidado;
  }

  // Buscar como plato
  const { data: plato } = await supabase
    .from('Plato')
    .select('*, recetas:Receta(*)')
    .eq('id', elementoId).single();

  if (plato) {
    for (const receta of plato.recetas) {
      await explodirElemento(receta.ingredienteId || receta.ingrediente_id, cantidad * receta.cantidad_requerida, consolidado);
    }
    return consolidado;
  }

  return consolidado;
}

export async function descontarDelInventario(ingredienteId, cantidadTotal) {
  const { data: ingrediente } = await supabase
    .from('Ingrediente').select('*').eq('id', ingredienteId).single();

  if (!ingrediente) return;

  const factorConversion = ingrediente.factor_conversion || 1;
  const cantidadEnUnidadInventario = cantidadTotal * factorConversion;
  const stockAnterior = ingrediente.cantidad_disponible || 0;
  const nuevoStock = Math.max(0, stockAnterior - cantidadEnUnidadInventario);
  
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
    const { data: ing } = await supabase.from('Ingrediente').select('*').eq('id', ingredienteId).single();
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
  const { data: rp } = await supabase.from('RecetaPrimaria').select('*, detalles:DetalleRecetaPrimaria(*)').eq('id', id).single();
  if (!rp) return;
  const costoTotal = rp.detalles.reduce((acc, d) => acc + (d.costo_ingrediente || 0), 0);
  const costoPorUnidad = rp.cantidadResultante > 0 ? costoTotal / rp.cantidadResultante : 0;
  
  await supabase.from('RecetaPrimaria').update({ costoTotal, costoPorUnidad }).eq('id', id);
  
  // Si esta receta primaria se usa en otros platos o recetas secundarias, seguir la cadena...
  // (Añadir lógica similar si es necesario)
}

async function actualizarCostoRecetaSecundaria(id) {
  const { data: rs } = await supabase.from('RecetaSecundaria').select('*, detalles:DetalleRecetaSecundaria(*)').eq('id', id).single();
  if (!rs) return;
  const costoTotal = rs.detalles.reduce((acc, d) => acc + (d.costo_elemento || 0), 0);
  const costoPorUnidad = rs.cantidadResultante > 0 ? costoTotal / rs.cantidadResultante : 0;
  
  await supabase.from('RecetaSecundaria').update({ costoTotal, costoPorUnidad }).eq('id', id);
  
  // Seguir la cadena...
  await actualizarPlatosQueUsanElemento(id, costoPorUnidad);
}

async function actualizarCostoPlato(id) {
  const { data: plato } = await supabase.from('Plato').select('*, recetas:Receta(*)').eq('id', id).single();
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

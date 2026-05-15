// scripts/test_final_deduction.js

// Mock de window ANTES de importar apiAdapter
global.window = {
  location: { pathname: '/test' }
};

// Mock de serverFetch para simular el servidor
const DB = {};
global.fetch = async (url, options) => {
  const parts = url.split('/');
  // Obtener la entidad del endpoint (ej: /api/ingredientes -> ingredientes)
  const entityPart = parts.find(p => p !== '' && p !== 'api');
  const entity = entityPart || 'unknown';
  const method = options.method || 'GET';
  
  if (method === 'POST') {
    const data = JSON.parse(options.body);
    data.id = data.id || Math.random().toString(36).substring(7);
    if (!DB[entity]) DB[entity] = [];
    DB[entity].push(data);
    return { ok: true, text: async () => JSON.stringify(data) };
  }
  
  if (method === 'GET') {
    const data = DB[entity] || [];
    return { ok: true, text: async () => JSON.stringify(data) };
  }

  return { ok: true, text: async () => "{}" };
};

// Polyfill localStorage para el apiAdapter
global.localStorage = (function () {
  let store = {
    'jwt_token': 'test-token',
    'empleado_sesion': JSON.stringify({ nombre: 'Tester', rol: 'administrador' })
  };
  return {
    getItem(key) { return store[key] || null; },
    setItem(key, value) { store[key] = String(value); },
    removeItem(key) { delete store[key]; },
    clear() { store = {}; }
  };
})();

import { api as base44 } from '../src/api/apiAdapter.js';

async function explodirPlato(platoId, cantidad, consolidado, nombrePlato = '') {
  const recetas = await base44.entities.Receta.filter({ plato_id: platoId });
  console.log(`📋 Plato ${platoId} tiene ${recetas.length} componentes en la tabla Receta`);
  
  for (const receta of recetas) {
    const cantidadTotal = receta.cantidad_requerida * cantidad;
    await explodirElemento(receta.ingrediente_id, cantidadTotal, consolidado, '    ', nombrePlato, receta.tipo);
  }
}

async function explodirElemento(elementoId, cantidad, consolidado, indent = '', nombrePlatoOrigen = '', tipoSugerido = null) {
    const esRecetaPrimaria = tipoSugerido === 'receta_primaria';
    const recetasPrimarias = esRecetaPrimaria 
      ? await base44.entities.RecetaPrimaria.filter({ id: elementoId })
      : (tipoSugerido ? [] : await base44.entities.RecetaPrimaria.filter({ id: elementoId }));

    if (recetasPrimarias.length > 0) {
        const receta = recetasPrimarias[0];
        const detalles = await base44.entities.DetalleRecetaPrimaria.filter({ receta_primaria_id: elementoId });
        for (const detalle of detalles) {
          // APLICANDO LA CORRECCIÓN: usar .cantidad
          const cantDetalle = detalle.cantidad || detalle.cantidad_requerida || 0;
          const cantidadHijo = cantidad * cantDetalle;
          await explodirElemento(detalle.ingrediente_id, cantidadHijo, consolidado, indent + '   │  ', nombrePlatoOrigen, detalle.tipo_elemento);
        }
        return;
    }
    
    const esRecetaSecundaria = tipoSugerido === 'receta_secundaria';
    const recetasSecundarias = esRecetaSecundaria
      ? await base44.entities.RecetaSecundaria.filter({ id: elementoId })
      : (tipoSugerido ? [] : await base44.entities.RecetaSecundaria.filter({ id: elementoId }));

    if (recetasSecundarias.length > 0) {
        const receta = recetasSecundarias[0];
        const detalles = await base44.entities.DetalleRecetaSecundaria.filter({ receta_secundaria_id: elementoId });
        for (const detalle of detalles) {
          // APLICANDO LA CORRECCIÓN: usar .cantidad
          const cantDetalle = detalle.cantidad || detalle.cantidad_requerida || 0;
          const cantidadHijo = cantidad * cantDetalle;
          await explodirElemento(detalle.elemento_id, cantidadHijo, consolidado, indent + '   │  ', nombrePlatoOrigen, detalle.tipo_elemento);
        }
        return;
    }
    
    const esPlato = tipoSugerido === 'plato';
    const platos = esPlato
      ? await base44.entities.Plato.filter({ id: elementoId })
      : (tipoSugerido ? [] : await base44.entities.Plato.filter({ id: elementoId }));

    if (platos.length > 0) {
      await explodirPlato(elementoId, cantidad, consolidado, platos[0].nombre);
      return;
    }
    
    const esIngrediente = tipoSugerido === 'ingrediente';
    const ingredientes = esIngrediente
      ? await base44.entities.Ingrediente.filter({ id: elementoId })
      : (tipoSugerido ? [] : await base44.entities.Ingrediente.filter({ id: elementoId }));

    if (ingredientes.length > 0) {
      if (!consolidado[elementoId]) consolidado[elementoId] = 0;
      consolidado[elementoId] += cantidad;
      return;
    }
    console.error(`Elemento ${elementoId} (${tipoSugerido}) no encontrado`);
}

async function test() {
  console.log("🚀 Iniciando Test de Desconteo de Stock...");
  
  try {
    // 1. Crear Ingrediente Base
    const arroz = await base44.entities.Ingrediente.create({
      nombre: "Arroz",
      cantidad_disponible: 10,
      unidad_medida: "kg",
      factor_conversion: 1
    });

    // 2. Crear Receta Primaria (Arroz Cocido)
    const arrozCocido = await base44.entities.RecetaPrimaria.create({
      nombre: "Arroz Cocido",
      cantidad_resultante: 2,
      unidad_medida: "kg"
    });
    // Detalle: usamos el campo 'cantidad' como en la DB real
    await base44.entities.DetalleRecetaPrimaria.create({
      receta_primaria_id: arrozCocido.id,
      ingrediente_id: arroz.id,
      cantidad: 0.5, 
      tipo_elemento: "ingrediente"
    });

    // 3. Crear Receta Secundaria (Base Sushi)
    const baseSushi = await base44.entities.RecetaSecundaria.create({
      nombre: "Base Sushi",
      cantidad_resultante: 1,
      unidad_medida: "kg"
    });
    await base44.entities.DetalleRecetaSecundaria.create({
      receta_secundaria_id: baseSushi.id,
      elemento_id: arrozCocido.id,
      cantidad: 1,
      tipo_elemento: "receta_primaria"
    });

    // 4. Crear Plato (Sushi Roll)
    const sushiRoll = await base44.entities.Plato.create({
      nombre: "Sushi Roll",
      precio: 15
    });
    // En Receta el campo es 'cantidad_requerida'
    await base44.entities.Receta.create({
      plato_id: sushiRoll.id,
      ingrediente_id: baseSushi.id,
      ingrediente_nombre: "Base Sushi",
      cantidad_requerida: 0.2,
      tipo: "receta_secundaria"
    });

    // 5. Simular Venta de 10 Rolls
    console.log("\n🔥 Simulando venta de 10 Sushi Rolls...");
    const consolidado = {};
    await explodirPlato(sushiRoll.id, 10, consolidado);
    
    console.log("📊 Resultado de la explosión (Consolidado):", consolidado);
    
    // El cálculo debería ser: 10 * 0.2 (base sushi) * 1 (arroz cocido) * 0.5 (arroz crudo) = 1kg
    const arrozUsado = consolidado[arroz.id];
    console.log(`\n🌾 Arroz total a descontar: ${arrozUsado}kg`);

    if (arrozUsado === 1) {
      console.log("✨ ¡EL CÁLCULO ES CORRECTO! (1kg esperado)");
      console.log("✅ El sistema de explosión de materiales funciona correctamente con sub-recetas.");
    } else {
      console.error(`❌ ERROR EN EL CÁLCULO: Se esperaba 1kg, se obtuvo ${arrozUsado}kg`);
    }

  } catch (error) {
    console.error("❌ Error durante el test:", error);
  }
}

test();

import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, TrendingUp, TrendingDown, Eye, Calendar, AlertTriangle } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import MigracionMetodosPago from "../components/estados-cuenta/MigracionMetodosPago";
import DiagnosticoPesos from "../components/estados-cuenta/DiagnosticoPesos";
import MigracionForzada from "../components/estados-cuenta/MigracionForzada";

export default function EstadosCuenta() {
  const [fechaInicio, setFechaInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fechaFin, setFechaFin] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [mostrarMigracion, setMostrarMigracion] = useState(false);
  const [mostrarDiagnostico, setMostrarDiagnostico] = useState(false);
  const [mostrarMigracionForzada, setMostrarMigracionForzada] = useState(false);

  const { data: ventas = [], isLoading: loadingVentas } = useQuery({
    queryKey: ['ventas'],
    queryFn: () => base44.entities.Venta.list('-created_date', 500),
  });

  const { data: pagosMixtos = [], isLoading: loadingPagos } = useQuery({
    queryKey: ['pagos-mixtos'],
    queryFn: () => base44.entities.PagoMixto.list('-created_date', 1000),
  });

  const { data: gastos = [], isLoading: loadingGastos } = useQuery({
    queryKey: ['gastos'],
    queryFn: () => base44.entities.Gasto.list('-created_date', 500),
  });

  const { data: tasasCambio = [] } = useQuery({
    queryKey: ['tasas-cambio'],
    queryFn: () => base44.entities.TasaCambio.list('-created_date', 10),
  });

  const { data: pagosCuentasPorCobrar = [] } = useQuery({
    queryKey: ['pagos-cuentas-por-cobrar'],
    queryFn: () => base44.entities.PagoCuentaPorCobrar.list('-created_date', 1000),
  });

  const tasaActual = tasasCambio.find(t => t.activa)?.tasa_bs_usd || 50;

  // Cuentas consolidadas
  const metodosConfig = {
    efectivo: { label: "💵 Efectivo Dólares", icono: "💵", grupo: "USD" },
    bolivares: { label: "🇻🇪 Bolívares", icono: "💳", grupo: "VES" },
    binance_usd: { label: "📱 Binance", icono: "📱", grupo: "USD" },
    zinli_usd: { label: "📱 Zinli", icono: "📱", grupo: "USD" },
    paypal_usd: { label: "🌐 PayPal", icono: "🌐", grupo: "USD" },
    zelle_usd: { label: "🏦 Zelle", icono: "🏦", grupo: "USD" },
    nequi_cop: { label: "📱 Nequi", icono: "📱", grupo: "COP" },
    cuentas_por_cobrar: { label: "📋 Cuentas por Cobrar", icono: "📋", grupo: "USD" }
  };

  // Mapeo: método individual → cuenta consolidada
  const metodoMap = {
    efectivo_usd: 'efectivo',
    efectivo_cop: 'efectivo',
    efectivo: 'efectivo',
    tarjeta_bs: 'bolivares',
    pago_movil_bs: 'bolivares',
    bolivares: 'bolivares',
    binance_usd: 'binance_usd',
    zinli_usd: 'zinli_usd',
    paypal_usd: 'paypal_usd',
    zelle_usd: 'zelle_usd',
    nequi_cop: 'nequi_cop',
    cuentas_por_cobrar: 'cuentas_por_cobrar'
  };

  const ventasFiltradas = ventas.filter(v => {
    try {
      const fechaVenta = parseISO(v.fecha_hora);
      const inicio = startOfDay(parseISO(fechaInicio + 'T00:00:00'));
      const fin = endOfDay(parseISO(fechaFin + 'T23:59:59'));
      return fechaVenta >= inicio && fechaVenta <= fin;
    } catch (error) {
      console.error('Error filtrando venta:', v.id, error);
      return false;
    }
  });

  const gastosFiltrados = gastos.filter(g => {
    try {
      const fechaGasto = parseISO(g.fecha_gasto);
      const inicio = startOfDay(parseISO(fechaInicio + 'T00:00:00'));
      const fin = endOfDay(parseISO(fechaFin + 'T23:59:59'));
      return fechaGasto >= inicio && fechaGasto <= fin && g.afecta_caja !== false;
    } catch (error) {
      console.error('Error filtrando gasto:', g.id, error);
      return false;
    }
  });

  // Calcular estado de cada cuenta
  const calcularEstadoCuentas = () => {
    const cuentas = {};
    const getCuenta = (mp) => metodoMap[mp] || mp;
    
    // Inicializar cuentas consolidadas
    Object.keys(metodosConfig).forEach(metodo => {
      cuentas[metodo] = { 
        metodo,
        ...metodosConfig[metodo],
        entradas: 0, 
        salidas: 0,
        entradas_moneda_local: 0,
        salidas_moneda_local: 0,
        cantidad_entradas: 0,
        cantidad_salidas: 0
      };
    });

    // Entradas: Ventas simples
    ventasFiltradas.forEach(venta => {
      if (venta.metodo_pago === 'mixto' || venta.metodo_pago === 'cuentas_por_cobrar') return;
      const key = getCuenta(venta.metodo_pago);
      if (!cuentas[key]) return;

      cuentas[key].entradas += venta.total_venta;
      cuentas[key].cantidad_entradas += 1;
      
      if (key === 'bolivares') {
        cuentas[key].entradas_moneda_local += (venta.total_ves || 0);
      }
      if (key === 'nequi_cop') {
        cuentas[key].entradas_moneda_local += (venta.total_cop || 0);
      }
    });

    // Entradas: Pagos mixtos
    const ventasIds = ventasFiltradas.map(v => v.id);
    pagosMixtos.forEach(pago => {
      if (!ventasIds.includes(pago.venta_id)) return;
      if (pago.metodo_pago === 'cuentas_por_cobrar') return;
      const key = getCuenta(pago.metodo_pago);
      if (!cuentas[key]) return;

      const monto = pago.monto_usd || pago.monto || 0;
      cuentas[key].entradas += monto;
      cuentas[key].cantidad_entradas += 1;
      
      if (key === 'bolivares') {
        if (pago.moneda === 'ves' && pago.monto_original) {
          cuentas[key].entradas_moneda_local += pago.monto_original;
        } else {
          cuentas[key].entradas_moneda_local += (monto * tasaActual);
        }
      }
      if (key === 'nequi_cop') {
        if (pago.moneda === 'cop' && pago.monto_original) {
          cuentas[key].entradas_moneda_local += pago.monto_original;
        } else {
          cuentas[key].entradas_moneda_local += (monto * 4000);
        }
      }
    });

    // Entradas: Pagos de Cuentas por Cobrar
    const pagosCuentasFiltrados = pagosCuentasPorCobrar.filter(p => {
      try {
        const fechaPago = parseISO(p.fecha_pago);
        const inicio = startOfDay(parseISO(fechaInicio + 'T00:00:00'));
        const fin = endOfDay(parseISO(fechaFin + 'T23:59:59'));
        return fechaPago >= inicio && fechaPago <= fin;
      } catch {
        return false;
      }
    });

    pagosCuentasFiltrados.forEach(pago => {
      const key = getCuenta(pago.metodo_pago);
      if (!cuentas[key]) return;

      const monto = pago.monto_pagado;
      cuentas[key].entradas += monto;
      cuentas[key].cantidad_entradas += 1;
      
      if (key === 'bolivares') {
        cuentas[key].entradas_moneda_local += (monto * tasaActual);
      }
      if (key === 'nequi_cop') {
        cuentas[key].entradas_moneda_local += (monto * 4000);
      }
    });

    // Salidas: Gastos
    gastosFiltrados.forEach(gasto => {
      const key = getCuenta(gasto.metodo_pago);
      if (!cuentas[key]) return;

      const monto = gasto.monto;
      cuentas[key].salidas += monto;
      cuentas[key].cantidad_salidas += 1;
      
      if (key === 'bolivares') {
        if (gasto.moneda_original === 'VES' && gasto.monto_original) {
          cuentas[key].salidas_moneda_local += gasto.monto_original;
        } else {
          cuentas[key].salidas_moneda_local += (monto * tasaActual);
        }
      }
      if (key === 'nequi_cop') {
        if (gasto.moneda_original === 'COP' && gasto.monto_original) {
          cuentas[key].salidas_moneda_local += gasto.monto_original;
        } else {
          cuentas[key].salidas_moneda_local += (monto * 4000);
        }
      }
    });

    // Calcular saldos
    Object.keys(cuentas).forEach(metodo => {
      const cuenta = cuentas[metodo];
      cuenta.saldo = cuenta.entradas - cuenta.salidas;
      cuenta.total_movimientos = cuenta.cantidad_entradas + cuenta.cantidad_salidas;
    });
    
    const cuentasActivas = Object.values(cuentas).filter(c => c.total_movimientos > 0);
    console.log(`\n📊 Total cuentas activas: ${cuentasActivas.length}`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    
    return cuentasActivas;
  };

  const cuentas = calcularEstadoCuentas();

  const queryClient = useQueryClient();

  // Detectar si hay métodos antiguos (excluir mixto y cuentas_por_cobrar)
  const metodosEnVentas = [...new Set(ventasFiltradas.map(v => v.metodo_pago))];
  const metodosEnGastos = [...new Set(gastosFiltrados.map(g => g.metodo_pago).filter(Boolean))];
  const todosMetodos = [...new Set([...metodosEnVentas, ...metodosEnGastos])];
  const hayMetodosAntiguos = todosMetodos.some(m => !metodosConfig[m] && m !== 'mixto' && m !== 'cuentas_por_cobrar');

  const handleMigracionCompleta = () => {
    queryClient.invalidateQueries({ queryKey: ['ventas'] });
    queryClient.invalidateQueries({ queryKey: ['gastos'] });
    setMostrarMigracion(false);
  };

  // Agrupar por moneda
  const cuentasUSD = cuentas.filter(c => c.grupo === "USD");
  const cuentasCOP = cuentas.filter(c => c.grupo === "COP");
  const cuentasVES = cuentas.filter(c => c.grupo === "VES");

  // Solo efectivo USD en el total general
  const totalEntradasGeneral = cuentas
    .filter(c => c.metodo === 'efectivo')
    .reduce((sum, c) => sum + c.entradas, 0);
  const totalSalidasGeneral = cuentas
    .filter(c => c.metodo === 'efectivo')
    .reduce((sum, c) => sum + c.salidas, 0);
  const saldoGeneral = totalEntradasGeneral - totalSalidasGeneral;

  const isLoading = loadingVentas || loadingPagos || loadingGastos;

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Card className="shadow-lg">
            <CardContent className="p-12 text-center">
              <p className="text-gray-500">Cargando estados de cuenta...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
            <span className="leading-tight">Estados de Cuenta por Método</span>
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Vista de cuenta bancaria de cada método de pago
          </p>
        </div>

        {/* Migración */}
        {hayMetodosAntiguos && !mostrarMigracion && (
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-red-900 mb-1">⚠️ Métodos de Pago Desactualizados Detectados</h3>
                  <p className="text-sm text-red-800 mb-2">
                    Se detectaron ventas o gastos con métodos de pago antiguos que no coinciden con la configuración actual.
                    Esto impide que aparezcan en el estado de cuenta.
                  </p>
                  <p className="text-xs text-red-700">
                    Métodos detectados: {todosMetodos.filter(m => !metodosConfig[m] && m !== 'mixto' && m !== 'cuentas_por_cobrar').join(', ')}
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setMostrarMigracion(true)}
                className="bg-red-600 hover:bg-red-700 whitespace-nowrap"
              >
                Solucionar Ahora
              </Button>
            </div>
          </div>
        )}

        {mostrarMigracion && (
          <MigracionMetodosPago onComplete={handleMigracionCompleta} />
        )}

        {/* Diagnóstico específico para pesos/bolívares */}
        {((cuentasCOP.length === 0 && ventasFiltradas.some(v => metodoMap[v.metodo_pago] === 'nequi_cop')) || 
          (cuentasVES.length === 0 && ventasFiltradas.some(v => metodoMap[v.metodo_pago] === 'bolivares'))) && 
         !mostrarDiagnostico && (
          <div className="bg-purple-50 border-2 border-purple-500 rounded-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-purple-100 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-purple-900 mb-1">🇨🇴 Diagnóstico para Pesos y Bolívares</h3>
                  <p className="text-sm text-purple-800 mb-2">
                    Hay transacciones en COP/VES pero no se reflejan en las cuentas. Ejecuta el diagnóstico para resolver.
                  </p>
                </div>
              </div>
              <Button 
                onClick={() => setMostrarDiagnostico(true)}
                className="bg-purple-600 hover:bg-purple-700 whitespace-nowrap"
              >
                Diagnosticar
              </Button>
            </div>
          </div>
        )}

        {mostrarDiagnostico && (
          <DiagnosticoPesos onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['ventas'] });
            queryClient.invalidateQueries({ queryKey: ['gastos'] });
            queryClient.invalidateQueries({ queryKey: ['pagos-mixtos'] });
            setMostrarDiagnostico(false);
          }} />
        )}

        {mostrarMigracionForzada && (
          <MigracionForzada onComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['ventas'] });
            queryClient.invalidateQueries({ queryKey: ['gastos'] });
            queryClient.invalidateQueries({ queryKey: ['pagos-mixtos'] });
            setMostrarMigracionForzada(false);
          }} />
        )}

        {/* Filtros */}
        <Card className="shadow-lg border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Período de Consulta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha Inicio</Label>
                <Input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha Fin</Label>
                <Input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen General - Solo Efectivo USD */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">💰 Entradas Efectivo USD</p>
                  <h3 className="text-2xl font-bold text-green-600">
                    ${totalEntradasGeneral.toFixed(2)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Solo efectivo físico</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg bg-gradient-to-br from-red-50 to-rose-50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">💸 Salidas Efectivo USD</p>
                  <h3 className="text-2xl font-bold text-red-600">
                    ${totalSalidasGeneral.toFixed(2)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Solo efectivo físico</p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-gray-600 mb-1">✅ Saldo Efectivo USD</p>
                  <h3 className={`text-2xl font-bold ${saldoGeneral >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    ${saldoGeneral.toFixed(2)}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Caja física</p>
                </div>
                <Building2 className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cuentas en USD - Separadas por método */}
        {cuentasUSD.length > 0 && (
          <div className="space-y-6">
            {/* Efectivo Dólares (incluye USD + COP convertido) */}
            {cuentasUSD.filter(c => c.metodo === 'efectivo').map(cuenta => {
              const saldoPositivo = cuenta.saldo >= 0;
              return (
                <Card key={cuenta.metodo} className="shadow-lg border-2 border-green-500">
                  <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <span className="text-3xl">{cuenta.icono}</span>
                        {cuenta.label}
                      </CardTitle>
                      <span className={`text-2xl font-bold ${saldoPositivo ? 'text-green-700' : 'text-red-700'}`}>
                        ${cuenta.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-1">💰 Entradas</p>
                        <p className="text-xl font-bold text-green-600">
                          ${cuenta.entradas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-1">💸 Salidas</p>
                        <p className="text-xl font-bold text-red-600">
                          ${cuenta.salidas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className={`rounded-lg p-4 text-center ${saldoPositivo ? 'bg-green-100' : 'bg-red-100'}`}>
                        <p className="text-sm text-gray-600 mb-1">✅ Saldo</p>
                        <p className={`text-xl font-bold ${saldoPositivo ? 'text-green-700' : 'text-red-700'}`}>
                          ${cuenta.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-1">📊 Movimientos</p>
                        <p className="text-xl font-bold text-gray-700">
                          {cuenta.total_movimientos}
                        </p>
                      </div>
                    </div>
                    <Link to={createPageUrl(`EstadoCuentaDetalle?metodo=${cuenta.metodo}&inicio=${fechaInicio}&fin=${fechaFin}`)}>
                      <Button className="w-full bg-green-600 hover:bg-green-700">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Extracto Completo
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}

            {/* Métodos Digitales USD */}
            <Card className="shadow-lg border-none">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
                <CardTitle className="text-lg">💳 Métodos Digitales USD</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {cuentasUSD.filter(c => ['zelle_usd', 'binance_usd', 'zinli_usd', 'paypal_usd'].includes(c.metodo)).map(cuenta => {
                    const saldoPositivo = cuenta.saldo >= 0;
                    return (
                      <Card key={cuenta.metodo} className={`shadow-md border-2 ${saldoPositivo ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-bold text-gray-900">{cuenta.label}</h3>
                            <span className="text-2xl">{cuenta.icono}</span>
                          </div>
                          
                          <div className="bg-white rounded-lg p-3 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">💰 Entradas:</span>
                              <span className="font-semibold text-green-600">
                                ${cuenta.entradas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">💸 Salidas:</span>
                              <span className="font-semibold text-red-600">
                                ${cuenta.salidas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t">
                              <span className="font-bold text-gray-700">Saldo:</span>
                              <span className={`font-bold text-lg ${saldoPositivo ? 'text-blue-700' : 'text-red-700'}`}>
                                ${cuenta.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500">
                              <span>Movimientos:</span>
                              <span>{cuenta.total_movimientos}</span>
                            </div>
                          </div>

                          <Link to={createPageUrl(`EstadoCuentaDetalle?metodo=${cuenta.metodo}&inicio=${fechaInicio}&fin=${fechaFin}`)}>
                            <Button className="w-full" size="sm" variant="outline">
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Extracto
                            </Button>
                          </Link>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Cuentas por Cobrar */}
            {cuentasUSD.filter(c => c.metodo === 'cuentas_por_cobrar').map(cuenta => {
              const saldoPositivo = cuenta.saldo >= 0;
              return (
                <Card key={cuenta.metodo} className="shadow-lg border-2 border-purple-500">
                  <CardHeader className="bg-gradient-to-r from-purple-100 to-pink-100">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <span className="text-3xl">{cuenta.icono}</span>
                        {cuenta.label}
                      </CardTitle>
                      <span className={`text-2xl font-bold ${saldoPositivo ? 'text-purple-700' : 'text-red-700'}`}>
                        ${cuenta.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-green-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-1">💰 Entradas</p>
                        <p className="text-xl font-bold text-green-600">
                          ${cuenta.entradas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-1">💸 Salidas</p>
                        <p className="text-xl font-bold text-red-600">
                          ${cuenta.salidas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className={`rounded-lg p-4 text-center ${saldoPositivo ? 'bg-purple-100' : 'bg-red-100'}`}>
                        <p className="text-sm text-gray-600 mb-1">✅ Saldo</p>
                        <p className={`text-xl font-bold ${saldoPositivo ? 'text-purple-700' : 'text-red-700'}`}>
                          ${cuenta.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-sm text-gray-600 mb-1">📊 Movimientos</p>
                        <p className="text-xl font-bold text-gray-700">
                          {cuenta.total_movimientos}
                        </p>
                      </div>
                    </div>
                    <Link to={createPageUrl(`EstadoCuentaDetalle?metodo=${cuenta.metodo}&inicio=${fechaInicio}&fin=${fechaFin}`)}>
                      <Button className="w-full bg-purple-600 hover:bg-purple-700">
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Extracto Completo
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Cuentas en COP */}
        {cuentasCOP.length > 0 && (
          <Card className="shadow-lg border-none">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50">
              <CardTitle className="text-lg">🇨🇴 Cuentas en Pesos (COP)</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cuentasCOP.map(cuenta => {
                  const saldoPositivo = cuenta.saldo >= 0;
                  return (
                    <Card key={cuenta.metodo} className={`shadow-md border-2 ${saldoPositivo ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}`}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-gray-900">{cuenta.label}</h3>
                          <span className="text-2xl">{cuenta.icono}</span>
                        </div>
                        
                        <div className="bg-white rounded-lg p-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">💰 Entradas:</span>
                            <span className="font-semibold text-green-600">
                              ${cuenta.entradas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">💸 Salidas:</span>
                            <span className="font-semibold text-red-600">
                              ${cuenta.salidas.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="font-bold text-gray-700">Saldo:</span>
                            <span className={`font-bold text-lg ${saldoPositivo ? 'text-blue-700' : 'text-red-700'}`}>
                              ${cuenta.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>Movimientos:</span>
                            <span>{cuenta.total_movimientos}</span>
                          </div>
                        </div>

                        <Link to={createPageUrl(`EstadoCuentaDetalle?metodo=${cuenta.metodo}&inicio=${fechaInicio}&fin=${fechaFin}`)}>
                          <Button className="w-full" size="sm" variant="outline">
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Extracto Completo
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cuenta Bolívares (consolidada: tarjeta + pago móvil) */}
        {cuentasVES.length > 0 && cuentasVES.map(cuenta => {
          const saldoPositivo = cuenta.saldo >= 0;
          return (
            <Card key={cuenta.metodo} className="shadow-lg border-2 border-amber-500">
              <CardHeader className="bg-gradient-to-r from-amber-100 to-orange-100">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <span className="text-3xl">{cuenta.icono}</span>
                    {cuenta.label}
                  </CardTitle>
                  <span className={`text-2xl font-bold ${saldoPositivo ? 'text-amber-700' : 'text-red-700'}`}>
                    ${cuenta.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                   <p className="text-sm text-gray-600 mb-1">💰 Entradas</p>
                   <p className="text-xl font-bold text-green-600">
                     Bs {cuenta.entradas_moneda_local.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                   </p>
                   <p className="text-xs text-gray-500 mt-1">
                     ≈ ${cuenta.entradas.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                   </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                   <p className="text-sm text-gray-600 mb-1">💸 Salidas</p>
                   <p className="text-xl font-bold text-red-600">
                     Bs {cuenta.salidas_moneda_local.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                   </p>
                   <p className="text-xs text-gray-500 mt-1">
                     ≈ ${cuenta.salidas.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                   </p>
                  </div>
                  <div className={`rounded-lg p-4 text-center ${saldoPositivo ? 'bg-amber-100' : 'bg-red-100'}`}>
                   <p className="text-sm text-gray-600 mb-1">✅ Saldo</p>
                   <p className={`text-xl font-bold ${saldoPositivo ? 'text-amber-700' : 'text-red-700'}`}>
                     Bs {(cuenta.entradas_moneda_local - cuenta.salidas_moneda_local).toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                   </p>
                   <p className="text-xs text-gray-500 mt-1">
                     ≈ ${cuenta.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2 })} USD
                   </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600 mb-1">📊 Movimientos</p>
                    <p className="text-xl font-bold text-gray-700">
                      {cuenta.total_movimientos}
                    </p>
                  </div>
                </div>
                <Link to={createPageUrl(`EstadoCuentaDetalle?metodo=${cuenta.metodo}&inicio=${fechaInicio}&fin=${fechaFin}`)}>
                  <Button className="w-full bg-amber-600 hover:bg-amber-700">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Extracto Completo
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}

        {cuentas.length === 0 && (ventasFiltradas.filter(v => v.metodo_pago !== 'cuentas_por_cobrar' && v.metodo_pago !== 'mixto').length > 0 || gastosFiltrados.length > 0) && (
          <Card className="shadow-lg border-2 border-red-500">
            <CardContent className="p-8 space-y-6">
              <div className="text-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-3" />
                <p className="text-lg font-semibold text-red-700">⚠️ Hay transacciones pero no se detectan cuentas</p>
                <p className="text-sm text-gray-500 mt-2">Esto indica que los métodos de pago necesitan ser migrados o corregidos</p>
              </div>
              
              {/* Diagnóstico */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-blue-900 flex items-center gap-2">
                  🔍 DIAGNÓSTICO DEL SISTEMA
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total Ventas en Sistema:</span>
                    <span className="font-bold text-blue-600">{ventas.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Ventas en Período Seleccionado:</span>
                    <span className="font-bold text-green-600">{ventasFiltradas.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Total Gastos en Sistema:</span>
                    <span className="font-bold text-blue-600">{gastos.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Gastos en Período Seleccionado:</span>
                    <span className="font-bold text-red-600">{gastosFiltrados.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-700">Pagos Mixtos en Sistema:</span>
                    <span className="font-bold text-purple-600">{pagosMixtos.length}</span>
                  </div>
                </div>
              </div>

              {ventasFiltradas.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-green-900">✅ Métodos de pago en ventas:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[...new Set(ventasFiltradas.map(v => v.metodo_pago))].map(metodo => (
                      <div key={metodo} className="bg-white rounded px-2 py-1">
                        <span className="font-mono text-xs">{metodo}</span>
                        <span className="ml-2 text-gray-600">
                          ({ventasFiltradas.filter(v => v.metodo_pago === metodo).length})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {gastosFiltrados.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                  <h4 className="font-semibold text-red-900">✅ Métodos de pago en gastos:</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {[...new Set(gastosFiltrados.map(g => g.metodo_pago).filter(Boolean))].map(metodo => (
                      <div key={metodo} className="bg-white rounded px-2 py-1">
                        <span className="font-mono text-xs">{metodo}</span>
                        <span className="ml-2 text-gray-600">
                          ({gastosFiltrados.filter(g => g.metodo_pago === metodo).length})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Solo mostrar diagnóstico si realmente hay métodos que no coinciden */}
              {(ventasFiltradas.length > 0 || gastosFiltrados.length > 0) && 
               todosMetodos.some(m => !metodosConfig[m] && m !== 'mixto' && m !== 'cuentas_por_cobrar') && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
                  <p className="font-semibold mb-2">🔧 PROBLEMA DETECTADO:</p>
                  <div className="space-y-3">
                    <div className="bg-white rounded p-3">
                      <p className="font-semibold text-red-700 mb-2">❌ Métodos de pago NO coinciden</p>
                      <p className="text-xs mb-2">Métodos configurados en el sistema:</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {Object.keys(metodosConfig).map(m => (
                          <span key={m} className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-mono">
                            {m}
                          </span>
                        ))}
                      </div>
                      
                      {ventasFiltradas.length > 0 && (
                        <>
                          <p className="text-xs mb-2">Métodos encontrados en VENTAS del período:</p>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {[...new Set(ventasFiltradas.map(v => v.metodo_pago))].map(metodo => {
                              const coincide = metodosConfig[metodo] !== undefined;
                              return (
                                <span 
                                  key={metodo} 
                                  className={`px-2 py-1 rounded text-xs font-mono ${
                                    coincide ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {metodo} {!coincide && '⚠️'}
                                </span>
                              );
                            })}
                          </div>
                        </>
                      )}
                      
                      {gastosFiltrados.length > 0 && (
                        <>
                          <p className="text-xs mb-2">Métodos encontrados en GASTOS del período:</p>
                          <div className="flex flex-wrap gap-1">
                            {[...new Set(gastosFiltrados.map(g => g.metodo_pago).filter(Boolean))].map(metodo => {
                              const coincide = metodosConfig[metodo] !== undefined;
                              return (
                                <span 
                                  key={metodo} 
                                  className={`px-2 py-1 rounded text-xs font-mono ${
                                    coincide ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {metodo} {!coincide && '⚠️'}
                                </span>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="bg-blue-100 rounded p-3">
                      <p className="font-bold text-blue-900 mb-2">✅ SOLUCIÓN:</p>
                      <p className="text-xs">
                        Los métodos de pago marcados con ⚠️ necesitan actualizarse. 
                        Ve a las páginas de Ventas, Comandas o Gastos y actualiza los métodos de pago 
                        para usar los nuevos valores configurados.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {cuentas.length === 0 && ventasFiltradas.length === 0 && gastosFiltrados.length === 0 && (
          <Card className="shadow-lg border-2 border-gray-300">
            <CardContent className="p-12 text-center">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-lg font-semibold text-gray-700">No hay movimientos en el período seleccionado</p>
              <p className="text-sm text-gray-500 mt-2">Selecciona un rango de fechas con transacciones registradas</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

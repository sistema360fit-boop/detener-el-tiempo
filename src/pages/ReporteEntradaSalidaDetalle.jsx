import { useState, useEffect } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileSpreadsheet, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const metodosConfig = {
  efectivo_usd: { label: "💵 Efectivo USD", moneda: "usd", simbolo: "$" },
  binance_usd: { label: "📱 Binance", moneda: "usd", simbolo: "$" },
  zinli_usd: { label: "📱 Zinli", moneda: "usd", simbolo: "$" },
  paypal_usd: { label: "🌐 PayPal", moneda: "usd", simbolo: "$" },
  zelle_usd: { label: "🏦 Zelle", moneda: "usd", simbolo: "$" },
  efectivo_cop: { label: "💵 Efectivo COP", moneda: "cop", simbolo: "₡" },
  nequi_cop: { label: "📱 Nequi", moneda: "cop", simbolo: "₡" },
  tarjeta_bs: { label: "💳 Tarjeta Bs", moneda: "ves", simbolo: "Bs" },
  pago_movil_bs: { label: "📱 Pago Móvil", moneda: "ves", simbolo: "Bs" }
};

export default function ReporteEntradaSalidaDetalle() {
  const [metodo, setMetodo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setMetodo(urlParams.get('metodo') || "");
    setFechaInicio(urlParams.get('inicio') || format(new Date(), 'yyyy-MM-dd'));
    setFechaFin(urlParams.get('fin') || format(new Date(), 'yyyy-MM-dd'));
  }, []);

  const { data: ventas = [], isLoading: loadingVentas } = useQuery({
    queryKey: ['ventas'],
    queryFn: async () => {
      const data = await base44.entities.Venta.list('-created_date', 500);
      console.log(`✅ Ventas para ${metodo}:`, data.filter(v => v.metodo_pago === metodo).length);
      return data;
    },
    enabled: !!metodo,
  });

  const { data: pagosMixtos = [], isLoading: loadingPagos } = useQuery({
    queryKey: ['pagos-mixtos'],
    queryFn: () => base44.entities.PagoMixto.list('-created_date', 1000),
    enabled: !!metodo,
  });

  const { data: gastos = [], isLoading: loadingGastos } = useQuery({
    queryKey: ['gastos'],
    queryFn: () => base44.entities.Gasto.list('-created_date', 500),
    enabled: !!metodo,
  });

  const { data: adelantos = [], isLoading: loadingAdelantos } = useQuery({
    queryKey: ['adelantos'],
    queryFn: () => base44.entities.Adelanto.list('-created_date', 1000),
    enabled: !!metodo,
  });

  if (!metodo || !metodosConfig[metodo]) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        <p className="text-red-400 text-lg mb-4">Método de pago no válido</p>
        <Link to={createPageUrl("ReportesEntradaSalida")}>
          <Button className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700">Volver a Reportes</Button>
        </Link>
      </div>
    );
  }

  const metodoDef = metodosConfig[metodo];
  
  const ventasFiltradas = ventas.filter(v => {
    try {
      const fechaVenta = parseISO(v.fecha_hora);
      const inicio = startOfDay(new Date(fechaInicio));
      const fin = endOfDay(new Date(fechaFin));
      return fechaVenta >= inicio && fechaVenta <= fin;
    } catch {
      return false;
    }
  });

  const gastosFiltrados = gastos.filter(g => {
    try {
      const fechaGasto = parseISO(g.fecha_gasto || g.fecha);
      const inicio = startOfDay(new Date(fechaInicio));
      const fin = endOfDay(new Date(fechaFin));
      return fechaGasto >= inicio && fechaGasto <= fin && g.afecta_caja !== false;
    } catch {
      return false;
    }
  });

  const adelantosFiltrados = adelantos.filter(a => {
    try {
      const fechaA = parseISO(a.fecha_adelanto || a.fecha || a.createdAt);
      const inicio = startOfDay(new Date(fechaInicio));
      const fin = endOfDay(new Date(fechaFin));
      return fechaA >= inicio && fechaA <= fin;
    } catch {
      return false;
    }
  });

  // Construir movimientos
  const movimientos = [];

  // ENTRADAS: Ventas simples
  ventasFiltradas.forEach(venta => {
    if (venta.metodo_pago === metodo) {
      const esBs = metodo.endsWith('_bs');
      const monto = esBs ? (venta.total_ves || 0) : venta.total_venta;
      movimientos.push({
        id: venta.id,
        fecha: venta.fecha_hora,
        tipo: 'entrada',
        subtipo: 'venta_simple',
        concepto: 'Venta completa',
        monto: monto,
        referencia: venta.id.substring(0, 8)
      });
    }
  });

  // ENTRADAS: Pagos mixtos
  const ventasIds = ventasFiltradas.map(v => v.id);
  pagosMixtos.forEach(pago => {
    if (ventasIds.includes(pago.venta_id) && pago.metodo_pago === metodo) {
      const esBs = metodo.endsWith('_bs');
      const monto = esBs ? (pago.monto_original || 0) : (pago.monto_usd || 0);
      movimientos.push({
        id: pago.id,
        fecha: ventasFiltradas.find(v => v.id === pago.venta_id)?.fecha_hora,
        tipo: 'entrada',
        subtipo: 'pago_mixto',
        concepto: 'Pago mixto (parte de venta)',
        monto: monto,
        referencia: pago.venta_id.substring(0, 8)
      });
    }
  });

  // SALIDAS: Gastos y Adelantos
  const todosGastosYAdelantos = [
    ...gastosFiltrados,
    ...adelantosFiltrados.map(a => ({
      id: a.id,
      descripcion: `Adelanto: ${a.empleado || a.empleadoId || 'Empleado'}${a.descripcion ? ' - ' + a.descripcion : ''}`,
      monto: a.monto || 0,
      monto_original: a.monto_original || 0,
      moneda_original: a.moneda_original,
      metodo_pago: a.metodo_pago,
      fecha_gasto: a.fecha_adelanto || a.fecha || a.createdAt,
      categoria: 'Adelanto a Personal'
    }))
  ];

  todosGastosYAdelantos.forEach(gasto => {
    if (gasto.metodo_pago === metodo) {
      const esBs = metodo.endsWith('_bs');
      const monto = esBs ? (gasto.monto_original || gasto.monto || 0) : (gasto.monto || 0);
      movimientos.push({
        id: gasto.id,
        fecha: gasto.fecha_gasto,
        tipo: 'salida',
        subtipo: 'gasto',
        concepto: gasto.descripcion || 'Gasto no especificado',
        monto: monto,
        referencia: gasto.comprobante || gasto.id.substring(0, 8),
        categoria: gasto.categoria
      });
    }
  });

  // Ordenar por fecha descendente
  movimientos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const esBs = metodo.endsWith('_bs');
  const formatMonto = (val) => esBs 
    ? `Bs ${val.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` 
    : `$${val.toFixed(2)}`;

  const totalEntradas = movimientos.filter(m => m.tipo === 'entrada').reduce((sum, m) => sum + m.monto, 0);
  const totalSalidas = movimientos.filter(m => m.tipo === 'salida').reduce((sum, m) => sum + m.monto, 0);
  const saldoFinal = totalEntradas - totalSalidas;
  const cantidadEntradas = movimientos.filter(m => m.tipo === 'entrada').length;
  const cantidadSalidas = movimientos.filter(m => m.tipo === 'salida').length;

  const exportarExcel = () => {
    const rows = [
      [`REPORTE ENTRADA/SALIDA - ${metodoDef.label}`],
      [`Período: ${format(new Date(fechaInicio), "dd/MM/yyyy", { locale: es })} - ${format(new Date(fechaFin), "dd/MM/yyyy", { locale: es })}`],
      [],
      ["RESUMEN FINANCIERO"],
      [`Total Entradas: $${totalEntradas.toFixed(2)}`],
      [`Total Salidas: $${totalSalidas.toFixed(2)}`],
      [`Saldo Final: $${saldoFinal.toFixed(2)}`],
      [`Entradas: ${cantidadEntradas} transacciones`],
      [`Salidas: ${cantidadSalidas} transacciones`],
      [],
      ["Fecha y Hora", "Tipo", "Concepto", "Monto", "Referencia"],
    ];

    movimientos.forEach(m => {
      rows.push([
        format(parseISO(m.fecha), "dd/MM/yyyy HH:mm", { locale: es }),
        m.tipo === 'entrada' ? 'ENTRADA' : 'SALIDA',
        m.concepto,
        `$${m.monto_usd.toFixed(2)}`,
        m.referencia
      ]);
    });

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_entrada_salida_${metodo}_${fechaInicio}_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Reporte exportado exitosamente");
  };

  const isLoading = loadingVentas || loadingPagos || loadingGastos || loadingAdelantos;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header Premium */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("ReportesEntradaSalida")}>
              <Button variant="outline" size="icon" className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">
                {metodoDef.label}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {format(new Date(fechaInicio), "dd MMM yyyy", { locale: es })} - {format(new Date(fechaFin), "dd MMM yyyy", { locale: es })}
              </p>
            </div>
          </div>
          <Button onClick={exportarExcel} className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 w-full sm:w-auto">
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-wider">💰 Entradas</p>
            <p className="text-3xl font-black mt-1 text-emerald-400">{formatMonto(totalEntradas)}</p>
            <p className="text-xs text-slate-400 mt-1">{cantidadEntradas} transacciones</p>
            <ArrowUpCircle className="absolute top-4 right-4 w-12 h-12 text-emerald-500/20" />
          </div>

          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.05))', border: '1px solid rgba(239,68,68,0.2)' }}>
            <p className="text-red-400/70 text-xs font-bold uppercase tracking-wider">💸 Salidas</p>
            <p className="text-3xl font-black mt-1 text-red-400">{formatMonto(totalSalidas)}</p>
            <p className="text-xs text-slate-400 mt-1">{cantidadSalidas} transacciones</p>
            <ArrowDownCircle className="absolute top-4 right-4 w-12 h-12 text-red-500/20" />
          </div>

          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: saldoFinal >= 0 ? 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(147,51,234,0.05))' : 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.05))', border: `1px solid ${saldoFinal >= 0 ? 'rgba(168,85,247,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
            <p className={`${saldoFinal >= 0 ? 'text-purple-400/70' : 'text-red-400/70'} text-xs font-bold uppercase tracking-wider`}>✅ Saldo Final</p>
            <p className={`text-3xl font-black mt-1 ${saldoFinal >= 0 ? 'text-purple-400' : 'text-red-400'}`}>{formatMonto(saldoFinal)}</p>
            {saldoFinal >= 0 ? (
              <TrendingUp className="absolute top-4 right-4 w-12 h-12 text-purple-500/20" />
            ) : (
              <TrendingDown className="absolute top-4 right-4 w-12 h-12 text-red-500/20" />
            )}
          </div>

          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p className="text-slate-400/70 text-xs font-bold uppercase tracking-wider">📊 Movimientos</p>
            <p className="text-3xl font-black mt-1 text-white">{movimientos.length}</p>
          </div>
        </div>

        {/* Tabla de Movimientos */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="p-4 sm:p-6 border-b border-white/5">
            <h3 className="text-lg font-bold text-white">📋 Detalle de Movimientos</h3>
          </div>
          <div className="p-0">
            {isLoading ? (
              <div className="p-6"><Skeleton className="h-64 w-full bg-white/5" /></div>
            ) : movimientos.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-slate-400">Fecha y Hora</TableHead>
                      <TableHead className="text-slate-400">Tipo</TableHead>
                      <TableHead className="text-slate-400">Concepto</TableHead>
                      <TableHead className="text-right text-slate-400">Monto</TableHead>
                      <TableHead className="text-slate-400">Referencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movimientos.map((m, index) => (
                      <TableRow key={`${m.id}-${index}`} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="text-sm text-slate-300">
                          {format(parseISO(m.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge className={m.tipo === 'entrada' ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-0 flex items-center gap-1 w-fit' : 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border-0 flex items-center gap-1 w-fit'}>
                            {m.tipo === 'entrada' ? (
                              <>
                                <ArrowUpCircle className="w-3 h-3" />
                                ENTRADA
                              </>
                            ) : (
                              <>
                                <ArrowDownCircle className="w-3 h-3" />
                                SALIDA
                              </>
                            )}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-white">
                          {m.concepto}
                          {m.categoria && (
                            <Badge className="ml-2 text-xs bg-white/10 text-slate-300 hover:bg-white/20 border-0">{m.categoria}</Badge>
                          )}
                        </TableCell>
                        <TableCell className={`text-right font-bold ${m.tipo === 'entrada' ? 'text-emerald-400' : 'text-red-400'}`}>
                          {m.tipo === 'entrada' ? '+' : '-'}{formatMonto(m.monto)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-500">
                          {m.referencia}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-white/10 bg-white/5 font-bold hover:bg-white/5">
                      <TableCell colSpan={3} className="text-white">SALDO FINAL</TableCell>
                      <TableCell className={`text-right text-lg ${saldoFinal >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                        {formatMonto(saldoFinal)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingDown className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No hay movimientos en este período para {metodoDef.label}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileSpreadsheet, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const metodosConfig = {
  efectivo_usd: { label: "💵 Efectivo USD", moneda: "usd", simbolo: "$", grupo: "dólares" },
  binance_usd: { label: "📱 Binance", moneda: "usd", simbolo: "$", grupo: "dólares" },
  zinli_usd: { label: "📱 Zinli", moneda: "usd", simbolo: "$", grupo: "dólares" },
  paypal_usd: { label: "🌐 PayPal", moneda: "usd", simbolo: "$", grupo: "dólares" },
  zelle_usd: { label: "🏦 Zelle", moneda: "usd", simbolo: "$", grupo: "dólares" },
  efectivo_cop: { label: "💵 Efectivo COP", moneda: "cop", simbolo: "₡", grupo: "pesos" },
  nequi_cop: { label: "📱 Nequi", moneda: "cop", simbolo: "₡", grupo: "pesos" },
  tarjeta_bs: { label: "💳 Tarjeta Bs", moneda: "ves", simbolo: "Bs", grupo: "bolívares" },
  pago_movil_bs: { label: "📱 Pago Móvil", moneda: "ves", simbolo: "Bs", grupo: "bolívares" }
};

export default function ReporteDetalle() {
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
      console.log('✅ Ventas cargadas para reporte:', data.length);
      return data;
    },
    enabled: !!metodo,
  });

  const { data: pagosMixtos = [], isLoading: loadingPagos } = useQuery({
    queryKey: ['pagos-mixtos'],
    queryFn: async () => {
      const data = await base44.entities.PagoMixto.list('-created_date', 1000);
      console.log('✅ Pagos mixtos cargados para reporte:', data.length);
      return data;
    },
    enabled: !!metodo,
  });

  if (!metodo || !metodosConfig[metodo]) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
        <p className="text-red-400 text-lg mb-4">Método de pago no válido</p>
        <Link to={createPageUrl("ReportesMetodosPago")}>
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

  // Obtener transacciones del método
  const transacciones = [];
  const esBs = metodo.endsWith('_bs');
  const formatMonto = (val) => esBs 
    ? `Bs ${val.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` 
    : `${metodoDef.simbolo}${val.toFixed(2)}`;

  // Ventas simples
  ventasFiltradas.forEach(venta => {
    if (venta.metodo_pago === metodo) {
      const montoNativo = esBs ? (venta.total_ves || 0) :
                           metodoDef.moneda === 'cop' ? (venta.total_cop || venta.total_venta * 4000) :
                           venta.total_venta;
      
      transacciones.push({
        id: venta.id,
        fecha: venta.fecha_hora,
        tipo: 'venta_simple',
        monto_usd: venta.total_venta,
        monto_nativo: montoNativo,
        tasa: esBs ? (venta.tasa_bs_aplicada || 0) : (metodoDef.moneda === 'cop' ? 4000 : 1)
      });
    }
  });

  // Pagos mixtos
  const ventasIds = ventasFiltradas.map(v => v.id);
  pagosMixtos.forEach(pago => {
    if (ventasIds.includes(pago.venta_id) && pago.metodo_pago === metodo) {
      transacciones.push({
        id: pago.id,
        fecha: ventasFiltradas.find(v => v.id === pago.venta_id)?.fecha_hora,
        tipo: 'pago_mixto',
        monto_usd: pago.monto_usd,
        monto_nativo: esBs ? (pago.monto_original || 0) : (pago.monto_original || pago.monto_usd),
        tasa: pago.tasa_cambio_aplicada || 1,
        venta_id: pago.venta_id
      });
    }
  });

  // Ordenar por fecha descendente
  transacciones.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const totalUSD = transacciones.reduce((sum, t) => sum + t.monto_usd, 0);
  const totalNativo = transacciones.reduce((sum, t) => sum + t.monto_nativo, 0);
  const promedio = transacciones.length > 0 ? (esBs ? totalNativo / transacciones.length : totalUSD / transacciones.length) : 0;

  const exportarExcel = () => {
    const rows = [
      [`REPORTE DETALLADO - ${metodoDef.label}`],
      [`Período: ${format(new Date(fechaInicio), "dd/MM/yyyy", { locale: es })} - ${format(new Date(fechaFin), "dd/MM/yyyy", { locale: es })}`],
      [],
      ["RESUMEN"],
      [`Total USD: $${totalUSD.toFixed(2)}`],
      [`Total ${metodoDef.simbolo}: ${totalOriginal.toFixed(2)}`],
      [`Cantidad de Transacciones: ${transacciones.length}`],
      [`Promedio por Transacción: $${promedio.toFixed(2)}`],
      [],
      ["Fecha y Hora", "Tipo", "Monto USD", `Monto ${metodoDef.simbolo}`, "Tasa"],
    ];

    transacciones.forEach(t => {
      rows.push([
        format(parseISO(t.fecha), "dd/MM/yyyy HH:mm", { locale: es }),
        t.tipo === 'venta_simple' ? 'Venta Completa' : 'Pago Mixto',
        `$${t.monto_usd.toFixed(2)}`,
        `${metodoDef.simbolo} ${t.monto_original.toFixed(2)}`,
        t.tasa.toFixed(2)
      ]);
    });

    const csvContent = rows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_${metodo}_${fechaInicio}_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Reporte exportado exitosamente");
  };

  const isLoading = loadingVentas || loadingPagos;

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header Premium */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 py-2">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("ReportesMetodosPago")}>
              <Button variant="outline" size="icon" className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
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

        {/* Resumen General */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.05))', border: '1px solid rgba(16,185,129,0.2)' }}>
            <p className="text-emerald-400/70 text-xs font-bold uppercase tracking-wider">Total USD</p>
            <p className="text-3xl font-black mt-1 text-emerald-400">{esBs ? formatMonto(totalNativo) : `$${totalUSD.toFixed(2)}`}</p>
            <DollarSign className="absolute top-4 right-4 w-12 h-12 text-emerald-500/20" />
          </div>

          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(37,99,235,0.05))', border: '1px solid rgba(59,130,246,0.2)' }}>
            <p className="text-blue-400/70 text-xs font-bold uppercase tracking-wider">Total {esBs ? 'Bs' : metodoDef.simbolo}</p>
            <p className="text-3xl font-black mt-1 text-blue-400">{esBs ? `($ ${totalUSD.toFixed(2)} equiv.)` : totalNativo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
            <Calendar className="absolute top-4 right-4 w-12 h-12 text-blue-500/20" />
          </div>

          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(147,51,234,0.05))', border: '1px solid rgba(168,85,247,0.2)' }}>
            <p className="text-purple-400/70 text-xs font-bold uppercase tracking-wider">Transacciones</p>
            <p className="text-3xl font-black mt-1 text-purple-400">{transacciones.length}</p>
            <TrendingUp className="absolute top-4 right-4 w-12 h-12 text-purple-500/20" />
          </div>

          <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(217,119,6,0.05))', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-amber-400/70 text-xs font-bold uppercase tracking-wider">Promedio</p>
            <p className="text-3xl font-black mt-1 text-amber-400">{formatMonto(promedio)}</p>
            <DollarSign className="absolute top-4 right-4 w-12 h-12 text-amber-500/20" />
          </div>
        </div>

        {/* Tabla de Transacciones */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className="p-4 sm:p-6 border-b border-white/5">
            <h3 className="text-lg font-bold text-white">Detalle de Transacciones</h3>
          </div>
          <div className="p-0">
            {isLoading ? (
              <div className="p-6"><Skeleton className="h-64 w-full bg-white/5" /></div>
            ) : transacciones.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-slate-400">Fecha y Hora</TableHead>
                      <TableHead className="text-slate-400">Tipo</TableHead>
                      <TableHead className="text-right text-slate-400">Monto USD</TableHead>
                      <TableHead className="text-right text-slate-400">Monto {metodoDef.simbolo}</TableHead>
                      <TableHead className="text-right text-slate-400">Tasa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transacciones.map((t, index) => (
                      <TableRow key={`${t.id}-${index}`} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell className="text-sm text-slate-300">
                          {format(parseISO(t.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                        </TableCell>
                        <TableCell>
                          <Badge className={t.tipo === 'venta_simple' ? 'bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border-0' : 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border-0'}>
                            {t.tipo === 'venta_simple' ? '💰 Venta Completa' : '🔄 Pago Mixto'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold text-emerald-400">
                          {formatMonto(esBs ? t.monto_nativo : t.monto_usd)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-blue-400">
                          {esBs ? `$${t.monto_usd.toFixed(2)}` : `${metodoDef.simbolo} ${t.monto_nativo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
                        </TableCell>
                        <TableCell className="text-right text-slate-500 text-sm">
                          {t.tasa.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 border-white/10 bg-white/5 font-bold hover:bg-white/5">
                      <TableCell colSpan={2} className="text-white">TOTAL</TableCell>
                      <TableCell className="text-right text-emerald-400 text-lg">
                        {formatMonto(esBs ? totalNativo : totalUSD)}
                      </TableCell>
                      <TableCell className="text-right text-blue-400 text-lg">
                        {esBs ? `$${totalUSD.toFixed(2)}` : `${metodoDef.simbolo} ${totalNativo.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400">No hay transacciones en este período para {metodoDef.label}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

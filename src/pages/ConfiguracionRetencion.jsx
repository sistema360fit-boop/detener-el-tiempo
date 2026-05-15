import { useState } from "react";
import { api } from "@/api/apiAdapter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, Trash2, Calendar, Database, AlertTriangle,
  CheckCircle, Loader2, History, RefreshCw, Printer,
  FileText, TrendingDown, TrendingUp, DollarSign
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ConfiguracionRetencion() {
  const [limpiando, setLimpiando] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [reporteListo, setReporteListo] = useState(false);
  const queryClient = useQueryClient();

  const { data: resumen, isLoading: loadingResumen, refetch: refetchResumen } = useQuery({
    queryKey: ['resumen-depuracion'],
    queryFn: () => api.mantenimiento.getResumen(),
  });

  const { data: logLimpiezas = [], isLoading: loadingLogs, refetch: refetchLogs } = useQuery({
    queryKey: ['log-limpiezas'],
    queryFn: () => api.entities.LogLimpieza.list(),
  });

  const ejecutarLimpieza = async () => {
    if (!reporteListo) {
      toast.error("Por favor, imprima o genere el reporte antes de borrar los datos.");
      return;
    }
    setMostrarConfirmacion(false);
    setLimpiando(true);
    try {
      await api.mantenimiento.ejecutarDepuracion(resumen.fechaLimite);
      await api.entities.LogLimpieza.create({
        ubicacion: 'Sistema',
        realizadoPor: 'Administrador',
        fecha: new Date().toISOString(),
        notas: `Depuración trimestral exitosa. Registros eliminados: ${resumen.conteos.ventas + resumen.conteos.gastos + resumen.conteos.comandas}.`
      });
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      refetchResumen();
      refetchLogs();
      toast.success("✅ Depuración completada exitosamente");
      setReporteListo(false);
    } catch (error) {
      console.error("Error en limpieza:", error);
      toast.error("Error durante la limpieza: " + error.message);
    } finally {
      setLimpiando(false);
    }
  };

  const handlePrint = () => {
    setReporteListo(true);
    window.print();
  };

  if (loadingResumen) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-4" />
        <p className="text-gray-500 animate-pulse">Analizando base de datos...</p>
      </div>
    );
  }

  const t = resumen?.totales || {};
  const totalRegistros = resumen?.conteos ? Object.values(resumen.conteos).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gray-50">
      {/* Estilos para impresión */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #printable-report, #printable-report * { visibility: visible; }
            #printable-report { 
              position: absolute; left: 0; top: 0; width: 100%; 
              padding: 40px; background: white;
            }
            .no-print { display: none !important; }
          }
        `}
      </style>

      <div className="max-w-5xl mx-auto space-y-6 no-print">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Settings className="w-8 h-8 text-purple-600" />
              Depuración del Sistema
            </h1>
            <p className="text-gray-500 mt-1">Mantenimiento trimestral y limpieza de registros históricos</p>
          </div>
          <Badge variant="outline" className="text-purple-700 bg-purple-50 border-purple-200 py-1.5 px-4 text-sm font-semibold self-start">
            Retención: 3 meses
          </Badge>
        </div>

        {/* Resumen de Depuración */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="shadow-md border-t-4 border-t-blue-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 uppercase">Periodo a Depurar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-lg font-bold text-gray-900">Anterior a</p>
                  <p className="text-sm text-blue-600 font-semibold">
                    {resumen?.fechaLimite ? format(parseISO(resumen.fechaLimite), "dd 'de' MMMM, yyyy", { locale: es }) : '--'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-t-4 border-t-amber-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 uppercase">Registros Detectados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Database className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalRegistros}</p>
                  <p className="text-xs text-gray-500">Transacciones históricas</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border-t-4 border-t-emerald-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500 uppercase">Balance Histórico (USD)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${(t.utilidadUSD || t.utilidadEstimada || 0) >= 0 ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {(t.utilidadUSD || t.utilidadEstimada || 0) >= 0 ? <TrendingUp className="w-6 h-6 text-emerald-600" /> : <TrendingDown className="w-6 h-6 text-red-600" />}
                </div>
                <div>
                  <p className={`text-lg font-bold ${(t.utilidadUSD || t.utilidadEstimada || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    ${(t.utilidadUSD || t.utilidadEstimada || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">Utilidad del periodo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones de Depuración */}
        <Card className="shadow-xl border-2 border-purple-100 overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6">
            <CardTitle className="flex items-center gap-2 text-xl">
              <FileText className="w-6 h-6" />
              Proceso de Cierre Trimestral
            </CardTitle>
            <p className="text-purple-100 text-sm mt-1">Sigue los pasos para depurar el sistema de forma segura.</p>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold shrink-0">1</div>
                  <div>
                    <h3 className="font-bold text-gray-900">Generar Reporte de Cierre</h3>
                    <p className="text-sm text-gray-600 mt-1">Obtén un resumen imprimible con los totales de ventas y gastos de los últimos 3 meses.</p>
                    <Button variant="outline" className="mt-3 border-purple-200 text-purple-700 hover:bg-purple-50" onClick={handlePrint}>
                      <Printer className="w-4 h-4 mr-2" />
                      Imprimir Reporte Trimestral
                    </Button>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 ${reporteListo ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-400'}`}>2</div>
                  <div>
                    <h3 className={`font-bold ${reporteListo ? 'text-gray-900' : 'text-gray-400'}`}>Ejecutar Depuración Técnica</h3>
                    <p className="text-sm text-gray-500 mt-1">Borra los registros individuales para optimizar la base de datos.</p>
                    <Button className="mt-3 bg-red-600 hover:bg-red-700" disabled={!reporteListo || limpiando} onClick={() => setMostrarConfirmacion(true)}>
                      {limpiando ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                      Borrar Datos Históricos
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Detalle de Registros a Borrar
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm text-gray-600">Ventas</span>
                    <span className="font-bold text-gray-900">{resumen?.conteos?.ventas}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm text-gray-600">Gastos</span>
                    <span className="font-bold text-gray-900">{resumen?.conteos?.gastos}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm text-gray-600">Comandas Pagadas</span>
                    <span className="font-bold text-gray-900">{resumen?.conteos?.comandas}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm">
                    <span className="text-sm text-gray-600">Adelantos</span>
                    <span className="font-bold text-gray-900">{resumen?.conteos?.adelantos}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm border-t-2 border-dashed mt-2">
                    <span className="text-sm font-bold text-purple-700">Total Registros</span>
                    <span className="font-black text-purple-700 text-lg">{totalRegistros}</span>
                  </div>
                </div>

                {/* Desglose por moneda */}
                <h4 className="text-sm font-bold text-gray-700 mt-6 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Desglose Financiero por Moneda
                </h4>
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-700 uppercase">USD</p>
                    <p className="text-sm mt-1">Ventas: <span className="font-bold">${(t.ventasUSD || t.ventas || 0).toFixed(2)}</span></p>
                    <p className="text-sm">Gastos: <span className="font-bold text-red-600">-${(t.gastosUSD || t.gastos || 0).toFixed(2)}</span></p>
                    <p className="text-sm">Adelantos: <span className="font-bold text-red-600">-${(t.adelantosUSD || t.adelantos || 0).toFixed(2)}</span></p>
                    <p className="text-sm font-black mt-1 border-t pt-1">Utilidad: ${(t.utilidadUSD || t.utilidadEstimada || 0).toFixed(2)}</p>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-xs font-bold text-amber-700 uppercase">Bolívares (Bs)</p>
                    <p className="text-sm mt-1">Ventas: <span className="font-bold">Bs {(t.ventasBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></p>
                    <p className="text-sm">Gastos: <span className="font-bold text-red-600">-Bs {(t.gastosBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></p>
                    <p className="text-sm">Adelantos: <span className="font-bold text-red-600">-Bs {(t.adelantosBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span></p>
                    <p className="text-sm font-black mt-1 border-t pt-1">Utilidad: Bs {(t.utilidadBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historial de Limpiezas */}
        <Card className="shadow-md">
          <CardHeader className="bg-gray-50">
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2 text-gray-700">
                <History className="w-5 h-5" />
                Logs de Mantenimiento
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => refetchLogs()}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100 max-h-[300px] overflow-auto">
              {logLimpiezas.length > 0 ? (
                logLimpiezas.map((log) => (
                  <div key={log.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{log.notas || 'Depuración del sistema'}</p>
                        <p className="text-xs text-gray-500">Por: {log.realizadoPor || 'Admin'} • {log.ubicacion || 'Sistema'}</p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 font-medium">
                      {format(parseISO(log.fecha), "dd/MM/yyyy HH:mm", { locale: es })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-400 text-sm italic">No se registran depuraciones previas.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* REPORTE PARA IMPRESIÓN */}
      <div id="printable-report" className="hidden">
        <div className="text-center border-b-2 border-black pb-6 mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tight">Stop Time - Restaurante</h1>
          <h2 className="text-xl font-bold mt-2">Reporte de Cierre y Depuración Trimestral</h2>
          <p className="text-sm mt-2 font-medium">Generado el: {format(new Date(), "dd 'de' MMMM, yyyy HH:mm", { locale: es })}</p>
        </div>

        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-8">
            <div className="border p-4 rounded">
              <h3 className="text-sm font-bold uppercase text-gray-600 mb-2">Periodo Depurado</h3>
              <p className="text-lg font-bold">Anterior al {resumen?.fechaLimite ? format(parseISO(resumen.fechaLimite), "dd/MM/yyyy", { locale: es }) : '--'}</p>
            </div>
            <div className="border p-4 rounded bg-gray-50">
              <h3 className="text-sm font-bold uppercase text-gray-600 mb-2">Resumen de Registros</h3>
              <p className="text-sm">Ventas: <span className="font-bold">{resumen?.conteos?.ventas}</span></p>
              <p className="text-sm">Gastos: <span className="font-bold">{resumen?.conteos?.gastos}</span></p>
              <p className="text-sm">Comandas: <span className="font-bold">{resumen?.conteos?.comandas}</span></p>
              <p className="text-sm">Adelantos: <span className="font-bold">{resumen?.conteos?.adelantos}</span></p>
              <p className="text-sm mt-1 border-t pt-1 font-bold">Total: {totalRegistros}</p>
            </div>
          </div>

          {/* Tabla USD */}
          <div className="border-2 border-black rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-4 border-b-2 border-black">
              <h3 className="font-black text-center uppercase">Consolidado Financiero — USD ($)</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-4 font-bold">Concepto</th>
                  <th className="p-4 font-bold text-right">Monto (USD)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-4">Ingresos Totales (Ventas)</td>
                  <td className="p-4 text-right font-bold text-emerald-700">${(t.ventasUSD || t.ventas || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-4">Gastos Operativos</td>
                  <td className="p-4 text-right font-bold text-red-700">-${(t.gastosUSD || t.gastos || 0).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="p-4">Adelantos de Personal</td>
                  <td className="p-4 text-right font-bold text-red-700">-${(t.adelantosUSD || t.adelantos || 0).toFixed(2)}</td>
                </tr>
                <tr className="bg-gray-100 text-lg">
                  <td className="p-4 font-black">UTILIDAD NETA USD</td>
                  <td className="p-4 text-right font-black">${(t.utilidadUSD || t.utilidadEstimada || 0).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tabla Bs */}
          <div className="border-2 border-black rounded-lg overflow-hidden">
            <div className="bg-gray-100 p-4 border-b-2 border-black">
              <h3 className="font-black text-center uppercase">Consolidado Financiero — Bolívares (Bs)</h3>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="p-4 font-bold">Concepto</th>
                  <th className="p-4 font-bold text-right">Monto (Bs)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="p-4">Ingresos Totales (Ventas Bs)</td>
                  <td className="p-4 text-right font-bold text-emerald-700">Bs {(t.ventasBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td className="p-4">Gastos Operativos (Bs)</td>
                  <td className="p-4 text-right font-bold text-red-700">-Bs {(t.gastosBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr>
                  <td className="p-4">Adelantos de Personal (Bs)</td>
                  <td className="p-4 text-right font-bold text-red-700">-Bs {(t.adelantosBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                </tr>
                <tr className="bg-gray-100 text-lg">
                  <td className="p-4 font-black">UTILIDAD NETA Bs</td>
                  <td className="p-4 text-right font-black">Bs {(t.utilidadBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="pt-20 grid grid-cols-2 gap-20 text-center">
            <div>
              <div className="border-t border-black w-full pt-2"></div>
              <p className="text-sm font-bold">Firma Administrador</p>
            </div>
            <div>
              <div className="border-t border-black w-full pt-2"></div>
              <p className="text-sm font-bold">Sello del Establecimiento</p>
            </div>
          </div>

          <div className="text-[10px] text-gray-400 text-center mt-12 italic">
            Este documento certifica que los datos individuales han sido eliminados del sistema para optimización de almacenamiento.
          </div>
        </div>
      </div>

      {/* Diálogo de Confirmación */}
      <AlertDialog open={mostrarConfirmacion} onOpenChange={setMostrarConfirmacion}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              ¿Estás absolutamente seguro?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-4">
                <p className="text-gray-900 font-medium">
                  Se eliminarán permanentemente <strong>{totalRegistros} registros</strong> del servidor.
                </p>
                <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-red-800 text-sm">
                  ⚠️ Esta acción no se puede deshacer. Los datos individuales dejarán de estar disponibles en los reportes detallados.
                </div>
                <p className="text-xs text-gray-500">
                  Asegúrate de haber guardado el reporte que acabas de imprimir.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={ejecutarLimpieza} className="bg-red-600 hover:bg-red-700">
              Sí, Borrar Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
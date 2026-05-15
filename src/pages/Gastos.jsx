import { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, DollarSign, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

import GastoForm from "../components/gastos/GastoForm";
import GastosList from "../components/gastos/GastosList";
import ResumenGastos from "../components/gastos/ResumenGastos";

export default function Gastos() {
  const [showForm, setShowForm] = useState(false);
  const [editingGasto, setEditingGasto] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todos");

  const queryClient = useQueryClient();

  const { data: gastos = [], isLoading } = useQuery({
    queryKey: ['gastos'],
    queryFn: () => base44.entities.Gasto.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Gasto.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      setShowForm(false);
      setEditingGasto(null);
      toast.success("Gasto registrado exitosamente");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Gasto.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      setShowForm(false);
      setEditingGasto(null);
      toast.success("Gasto actualizado exitosamente");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Gasto.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      toast.success("Gasto eliminado exitosamente");
    },
  });

  const handleSubmit = (data) => {
    if (editingGasto) {
      updateMutation.mutate({ id: editingGasto.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (gasto) => {
    setEditingGasto(gasto);
    setShowForm(true);
  };

  const handleDelete = (gasto) => {
    if (confirm(`¿Estás seguro de eliminar el gasto "${gasto.descripcion}"?`)) {
      deleteMutation.mutate(gasto.id);
    }
  };

  // Filtros
  const filteredGastos = gastos.filter(gasto => {
    const matchesSearch = gasto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         gasto.comprobante?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = categoriaFiltro === "todos" || gasto.categoria === categoriaFiltro;
    return matchesSearch && matchesCategoria;
  });

  // Calcular estadísticas del mes actual
  const today = new Date();
  const inicioMes = startOfMonth(today);
  const finMes = endOfMonth(today);
  
  const gastosDelMes = gastos.filter(g => {
    const fecha = new Date(g.fecha_gasto);
    return fecha >= inicioMes && fecha <= finMes;
  });

  const metodosBolivares = (metodo) => metodo && metodo.endsWith('_bs');
  const metodosCOP = (metodo) => metodo && metodo.endsWith('_cop');
  const metodosEfectivoUSD = (metodo) => metodo === 'efectivo_usd';
  const metodosDigitalesUSD = (metodo) => metodo && !metodo.endsWith('_bs') && !metodo.endsWith('_cop') && metodo !== 'efectivo_usd' && !['cuentas_por_cobrar', 'mixto'].includes(metodo);

  const mesEfectivoUSD = gastosDelMes.filter(g => metodosEfectivoUSD(g.metodo_pago)).reduce((sum, g) => sum + (g.monto || 0), 0);
  const mesDigitalesUSD = gastosDelMes.filter(g => metodosDigitalesUSD(g.metodo_pago)).reduce((sum, g) => sum + (g.monto || 0), 0);
  const mesBolivares = gastosDelMes.filter(g => metodosBolivares(g.metodo_pago)).reduce((sum, g) => sum + (g.monto_original || g.monto || 0), 0);
  const mesCOP = gastosDelMes.filter(g => metodosCOP(g.metodo_pago)).reduce((sum, g) => sum + (g.monto || 0), 0);

  const totalGeneralUSD = gastos.filter(g => !metodosBolivares(g.metodo_pago) && !metodosCOP(g.metodo_pago)).reduce((sum, g) => sum + (g.monto || 0), 0);

  return (
    <div className="w-full">
      <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-red-600 flex-shrink-0" />
              <span className="leading-tight">Gastos Operativos</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">Registra y controla los gastos del restaurante</p>
          </div>
          <Button
            onClick={() => {
              console.log('🔴 Botón Registrar Gasto clickeado');
              console.log('Estado actual showForm:', showForm);
              setEditingGasto(null);
              setShowForm(!showForm);
              console.log('Nuevo estado showForm:', !showForm);
            }}
            className="bg-red-600 hover:bg-red-700 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Registrar Gasto
          </Button>
        </div>

        {/* Stats Cards - Desglose de Gastos del Mes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Efectivo USD */}
          <div className="rounded-2xl p-5 relative overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.02))', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Efectivo USD</p>
            <p className="text-3xl font-black mt-2 text-emerald-600">${mesEfectivoUSD.toFixed(2)}</p>
            <p className="text-xs text-emerald-600/70 mt-2 font-medium">Gastos del mes en efectivo</p>
          </div>

          {/* Divisas Digitales */}
          <div className="rounded-2xl p-5 relative overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(79,70,229,0.02))', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <p className="text-indigo-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Divisas Digitales</p>
            <p className="text-3xl font-black mt-2 text-indigo-600">${mesDigitalesUSD.toFixed(2)}</p>
            <p className="text-xs text-indigo-600/70 mt-2 font-medium">Zelle, Binance, Zinli, PayPal</p>
          </div>

          {/* Bolívares */}
          <div className="rounded-2xl p-5 relative overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.02))', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <p className="text-amber-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Bolívares (Bs)</p>
            <p className="text-3xl font-black mt-2 text-amber-600">Bs {mesBolivares.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-amber-600/70 mt-2 font-medium">Pago Móvil, Transferencias</p>
          </div>

          {/* Total Acumulado General */}
          <div className="rounded-2xl p-5 relative overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(220,38,38,0.02))', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(239,68,68,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <p className="text-red-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Total Acumulado (USD)</p>
            <p className="text-3xl font-black mt-2 text-red-600">${totalGeneralUSD.toFixed(2)}</p>
            <p className="text-xs text-red-600/70 mt-2 font-medium">Histórico general en USD</p>
          </div>
        </div>

        {/* Resumen por Categoría */}
        <ResumenGastos gastos={gastosDelMes} />

        {/* Search and Filter */}
        <Card className="shadow-lg border-none">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <Input
                  placeholder="Buscar gastos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 sm:pl-10 text-sm sm:text-base"
                />
              </div>
              <select
                value={categoriaFiltro}
                onChange={(e) => setCategoriaFiltro(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm sm:text-base"
              >
                <option value="todos">Todas las categorías</option>
                <option value="Alquiler">Alquiler</option>
                <option value="Servicios Básicos">Servicios Básicos</option>
                <option value="Nómina">Nómina</option>
                <option value="Marketing">Marketing</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Impuestos">Impuestos</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        {showForm && (
          <div className="animate-in fade-in duration-300">
            <GastoForm
              gasto={editingGasto}
              onSubmit={handleSubmit}
              onCancel={() => {
                console.log('❌ Cancelando formulario de gasto');
                setShowForm(false);
                setEditingGasto(null);
              }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        )}

        {/* List */}
        <GastosList
          gastos={filteredGastos}
          onEdit={handleEdit}
          onDelete={handleDelete}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
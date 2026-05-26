import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Search, DollarSign, Users, Wallet, CheckCircle2, 
  Clock, BadgeDollarSign, TrendingDown, CalendarDays,
  Receipt
} from "lucide-react";
import { toast } from "sonner";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";
import ModalPagarNomina from "@/components/nomina/ModalPagarNomina";
import HistorialNomina from "@/components/nomina/HistorialNomina";

// Helper para fetch autenticado
const serverFetch = async (endpoint, options = {}) => {
  const token = localStorage.getItem('jwt_token');
  const url = `/api${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }
  return response.json();
};

export default function Nomina() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [vista, setVista] = useState("empleados"); // empleados | historial

  const queryClient = useQueryClient();

  // ─── QUERIES ────────────────────────────────────────────────────────
  const { data: empleados = [], isLoading: loadingEmpleados } = useQuery({
    queryKey: ['personal-nomina'],
    queryFn: () => serverFetch('/personal'),
  });

  const { data: adelantos = [] } = useQuery({
    queryKey: ['adelantos-nomina'],
    queryFn: () => serverFetch('/adelantos'),
  });

  const { data: nominas = [], isLoading: loadingNominas } = useQuery({
    queryKey: ['nominas'],
    queryFn: () => serverFetch('/nomina'),
  });

  // ─── MUTATIONS ──────────────────────────────────────────────────────
  const pagarMutation = useMutation({
    mutationFn: (payload) => serverFetch('/nomina/pagar', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['nominas'] });
      queryClient.invalidateQueries({ queryKey: ['adelantos-nomina'] });
      queryClient.invalidateQueries({ queryKey: ['adelantos'] });
      queryClient.invalidateQueries({ queryKey: ['gastos'] });
      setShowModal(false);
      setSelectedEmpleado(null);
      setPreviewData(null);
      toast.success(`✅ Nómina pagada a ${data.nomina?.empleado_nombre}`, {
        description: data.egreso_registrado 
          ? 'Egreso registrado en arqueo de caja' 
          : 'Pago digital registrado',
      });
    },
    onError: (error) => {
      toast.error("Error al procesar el pago: " + error.message);
    },
  });

  // ─── HANDLERS ───────────────────────────────────────────────────────
  const handleSelectEmpleado = async (empleado) => {
    setSelectedEmpleado(empleado);
    setLoadingPreview(true);
    try {
      const preview = await serverFetch(`/nomina/preview/${empleado.id}`);
      setPreviewData(preview);
      setShowModal(true);
    } catch (err) {
      toast.error("Error al cargar preview: " + err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleConfirmarPago = (payload) => {
    pagarMutation.mutate(payload);
  };

  // ─── COMPUTED ───────────────────────────────────────────────────────
  const empleadosActivos = useMemo(() => {
    return empleados
      .filter(e => e.activo !== false)
      .filter(e => {
        const term = searchTerm.toLowerCase();
        return (
          e.nombre?.toLowerCase().includes(term) ||
          e.cargo?.toLowerCase().includes(term) ||
          e.rol?.toLowerCase().includes(term)
        );
      });
  }, [empleados, searchTerm]);

  // Calcular adelantos pendientes por empleado
  const adelantosPorEmpleado = useMemo(() => {
    const map = {};
    adelantos.forEach(a => {
      const estado = a.estado ?? 'PENDIENTE';
      const empId = a.empleado_id || a.empleadoId;
      if (estado === 'PENDIENTE' && empId) {
        if (!map[empId]) map[empId] = { total: 0, count: 0 };
        map[empId].total += (a.monto ?? 0);
        map[empId].count += 1;
      }
    });
    return map;
  }, [adelantos]);

  // Estadísticas
  const stats = useMemo(() => {
    const hoy = new Date();
    const inicioMes = startOfMonth(hoy);
    const finMes = endOfMonth(hoy);
    const nominasMes = nominas.filter(n => {
      const f = new Date(n.fecha_pago);
      return f >= inicioMes && f <= finMes && n.estado !== 'ANULADO';
    });
    const totalPagadoMes = nominasMes.reduce((s, n) => s + (n.salario_neto ?? 0), 0);
    const totalAdelantosMes = nominasMes.reduce((s, n) => s + (n.total_adelantos ?? 0), 0);
    const totalAdelantosPendientes = Object.values(adelantosPorEmpleado).reduce((s, a) => s + a.total, 0);

    return {
      totalPagadoMes,
      totalAdelantosMes,
      totalAdelantosPendientes,
      empleadosConSalario: empleadosActivos.filter(e => (e.salario_base ?? 0) > 0).length,
      pagosMes: nominasMes.length,
    };
  }, [nominas, adelantosPorEmpleado, empleadosActivos]);

  return (
    <div className="w-full">
      <div className="p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6">
        {/* ─── HEADER ──────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <BadgeDollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-violet-600 flex-shrink-0" />
              <span className="leading-tight">Nómina</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Automatización de pagos y descuento de adelantos
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={vista === "empleados" ? "default" : "outline"}
              onClick={() => setVista("empleados")}
              className={vista === "empleados" ? "bg-violet-600 hover:bg-violet-700" : ""}
            >
              <Users className="w-4 h-4 mr-2" />
              Empleados
            </Button>
            <Button
              variant={vista === "historial" ? "default" : "outline"}
              onClick={() => setVista("historial")}
              className={vista === "historial" ? "bg-violet-600 hover:bg-violet-700" : ""}
            >
              <Receipt className="w-4 h-4 mr-2" />
              Historial
            </Button>
          </div>
        </div>

        {/* ─── STATS CARDS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pagado este mes */}
          <div className="rounded-2xl p-5 relative overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(109,40,217,0.04))', border: '1px solid rgba(139,92,246,0.25)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <p className="text-violet-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Pagado Este Mes
            </p>
            <p className="text-3xl font-black mt-2 text-violet-600">${stats.totalPagadoMes.toFixed(2)}</p>
            <p className="text-xs text-violet-600/70 mt-2 font-medium">{stats.pagosMes} pagos realizados</p>
          </div>

          {/* Adelantos descontados */}
          <div className="rounded-2xl p-5 relative overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(5,150,105,0.02))', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <p className="text-emerald-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" /> Descontado Este Mes
            </p>
            <p className="text-3xl font-black mt-2 text-emerald-600">${stats.totalAdelantosMes.toFixed(2)}</p>
            <p className="text-xs text-emerald-600/70 mt-2 font-medium">En descuentos de adelantos</p>
          </div>

          {/* Pendientes por descontar */}
          <div className="rounded-2xl p-5 relative overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(217,119,6,0.02))', border: '1px solid rgba(245,158,11,0.2)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <p className="text-amber-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> Adelantos Pendientes
            </p>
            <p className="text-3xl font-black mt-2 text-amber-600">${stats.totalAdelantosPendientes.toFixed(2)}</p>
            <p className="text-xs text-amber-600/70 mt-2 font-medium">Por descontar en próxima nómina</p>
          </div>

          {/* Empleados con salario */}
          <div className="rounded-2xl p-5 relative overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(79,70,229,0.02))', border: '1px solid rgba(99,102,241,0.2)' }}>
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }} />
            <p className="text-indigo-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Con Salario Asignado
            </p>
            <p className="text-3xl font-black mt-2 text-indigo-600">{stats.empleadosConSalario}</p>
            <p className="text-xs text-indigo-600/70 mt-2 font-medium">de {empleadosActivos.length} empleados activos</p>
          </div>
        </div>

        {/* ─── VISTAS ──────────────────────────────────────────────── */}
        {vista === "empleados" ? (
          <>
            {/* Search */}
            <Card className="shadow-lg border-none">
              <CardContent className="p-4 sm:p-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    placeholder="Buscar empleado por nombre, cargo o rol..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-sm sm:text-base"
                    id="search-nomina"
                  />
                </div>
              </CardContent>
            </Card>

            {/* ─── TABLA DE EMPLEADOS ────────────────────────────────── */}
            <Card className="shadow-lg border-none overflow-hidden">
              <CardContent className="p-0">
                {loadingEmpleados ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
                  </div>
                ) : empleadosActivos.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="font-medium">No hay empleados activos</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" id="tabla-nomina">
                      <thead>
                        <tr className="bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100">
                          <th className="text-left px-6 py-4 font-semibold text-violet-800 uppercase text-xs tracking-wider">Empleado</th>
                          <th className="text-left px-6 py-4 font-semibold text-violet-800 uppercase text-xs tracking-wider">Cargo</th>
                          <th className="text-right px-6 py-4 font-semibold text-violet-800 uppercase text-xs tracking-wider">Salario Base</th>
                          <th className="text-right px-6 py-4 font-semibold text-violet-800 uppercase text-xs tracking-wider">Adelantos Pend.</th>
                          <th className="text-right px-6 py-4 font-semibold text-violet-800 uppercase text-xs tracking-wider">Neto Estimado</th>
                          <th className="text-center px-6 py-4 font-semibold text-violet-800 uppercase text-xs tracking-wider">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {empleadosActivos.map((emp) => {
                          const salario = emp.salario_base ?? 0;
                          const adel = adelantosPorEmpleado[emp.id] ?? { total: 0, count: 0 };
                          const neto = salario - adel.total;
                          const tieneAdelantos = adel.count > 0;

                          return (
                            <tr key={emp.id} className="hover:bg-violet-50/50 transition-colors group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-md">
                                    {emp.nombre?.charAt(0)?.toUpperCase() ?? '?'}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">{emp.nombre}</p>
                                    <p className="text-xs text-gray-400">{emp.rol ?? 'Sin rol'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-gray-600">
                                {emp.cargo ?? <span className="text-gray-300 italic">Sin cargo</span>}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {salario > 0 ? (
                                  <span className="font-bold text-gray-900">${salario.toFixed(2)}</span>
                                ) : (
                                  <span className="text-gray-300 italic text-xs">No asignado</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {tieneAdelantos ? (
                                  <div>
                                    <span className="font-bold text-amber-600">-${adel.total.toFixed(2)}</span>
                                    <p className="text-xs text-amber-500">{adel.count} adelanto{adel.count !== 1 ? 's' : ''}</p>
                                  </div>
                                ) : (
                                  <span className="text-emerald-500 text-xs flex items-center justify-end gap-1">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Sin adelantos
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                {salario > 0 ? (
                                  <span className={`font-black text-lg ${neto < 0 ? 'text-red-600' : 'text-violet-700'}`}>
                                    ${neto.toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <Button
                                  size="sm"
                                  disabled={salario <= 0 || loadingPreview}
                                  onClick={() => handleSelectEmpleado(emp)}
                                  className="bg-violet-600 hover:bg-violet-700 text-white shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-40"
                                  id={`btn-pagar-${emp.id}`}
                                >
                                  {loadingPreview && selectedEmpleado?.id === emp.id ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                  ) : (
                                    <DollarSign className="w-4 h-4 mr-1" />
                                  )}
                                  Pagar
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          <HistorialNomina 
            nominas={nominas} 
            adelantos={adelantos} 
            isLoading={loadingNominas} 
          />
        )}

        {/* ─── MODAL DE PAGO ───────────────────────────────────────── */}
        {showModal && previewData && (
          <ModalPagarNomina
            open={showModal}
            onClose={() => { setShowModal(false); setPreviewData(null); }}
            previewData={previewData}
            onConfirmar={handleConfirmarPago}
            isPaying={pagarMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}

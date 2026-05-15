import { useState, useMemo, useEffect } from "react";
import { api } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, UtensilsCrossed, TrendingUp, DollarSign, Package, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import PlatoForm from "../components/platos/PlatoForm";
import PlatosList from "../components/platos/PlatosList";

export default function Platos() {
  const [showForm, setShowForm] = useState(false);
  const [editingPlato, setEditingPlato] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("todos");

  const queryClient = useQueryClient();

  // --- Data Fetching ---
  const { data: platos = [], isLoading: loadingPlatos } = useQuery({
    queryKey: ['platos'],
    queryFn: () => api.entities.Plato.list(),
  });

  const { data: ingredientes = [] } = useQuery({
    queryKey: ['ingredientes'],
    queryFn: () => api.entities.Ingrediente.list(),
  });

  const { data: recetasPrimarias = [] } = useQuery({
    queryKey: ['recetas-primarias'],
    queryFn: () => api.entities.RecetaPrimaria.list(),
  });

  const { data: recetasSecundarias = [] } = useQuery({
    queryKey: ['recetas-secundarias'],
    queryFn: () => api.entities.RecetaSecundaria.list(),
  });

  const [empleadoSesion, setEmpleadoSesion] = useState(null);
  useEffect(() => {
    const sesion = localStorage.getItem('empleado_sesion');
    if (sesion) setEmpleadoSesion(JSON.parse(sesion));
  }, []);

  // --- Mutations ---
  const savePlatoMutation = useMutation({
    mutationFn: async ({ id, platoData, recetas }) => {
      if (id) {
        return api.entities.Plato.update(id, { ...platoData, recetas });
      } else {
        return api.entities.Plato.create({ ...platoData, recetas });
      }
    },
    onSuccess: (plato) => {
      queryClient.invalidateQueries({ queryKey: ['platos'] });
      setShowForm(false);
      setEditingPlato(null);
      toast.success(`Plato "${plato.nombre}" guardado con éxito`);
    },
    onError: (error) => {
      toast.error("Error al guardar el plato: " + error.message);
    }
  });

  const deletePlatoMutation = useMutation({
    mutationFn: (id) => api.entities.Plato.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platos'] });
      toast.success("Plato eliminado correctamente");
    },
    onError: (error) => {
      toast.error("Error al eliminar: " + error.message);
    }
  });

  // --- Handlers ---
  const handleSave = (data) => {
    savePlatoMutation.mutate({ 
      id: editingPlato?.id, 
      platoData: data.platoData, 
      recetas: data.recetas 
    });
  };

  const handleEdit = (plato) => {
    setEditingPlato(plato);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    if (window.confirm("¿Estás seguro? Esta acción desvinculará el plato de ventas antiguas pero mantendrá los registros históricos.")) {
      deletePlatoMutation.mutate(id);
    }
  };

  // --- Filtering ---
  const filteredPlatos = useMemo(() => {
    return platos.filter(plato => {
      const matchesSearch = plato.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === "todos" || plato.categoria === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [platos, searchTerm, activeTab]);

  const categorias = ["Entradas", "Bebidas", "Stop Premium", "Ramen", "Recetas Virales", "Menú Infantil", "Adicionales", "Rolls Tempura", "Rolls Frescos"];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50/50">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Elegante */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
              <div className="p-3 bg-amber-500 rounded-2xl shadow-lg shadow-amber-200">
                <UtensilsCrossed className="w-8 h-8 text-white" />
              </div>
              Catálogo de Platos
            </h1>
            <p className="text-slate-500 font-medium">Gestión profesional de costos, recetas y márgenes</p>
          </div>
          
          {!showForm && (
            <Button
              onClick={() => { setEditingPlato(null); setShowForm(true); }}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-14 rounded-2xl shadow-xl shadow-slate-200 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-5 h-5 mr-2" /> Nuevo Plato
            </Button>
          )}
        </div>

        {/* Formulario Reconstruido */}
        {showForm && (
          <div className="animate-in fade-in slide-in-from-top-8 duration-500">
            <PlatoForm 
              plato={editingPlato}
              ingredientes={ingredientes}
              recetasPrimarias={recetasPrimarias}
              recetasSecundarias={recetasSecundarias}
              platos={platos}
              onSubmit={handleSave}
              onCancel={() => { setShowForm(false); setEditingPlato(null); }}
              isLoading={savePlatoMutation.isPending}
            />
          </div>
        )}

        {/* Dash de Stats Rápidas */}
        {!showForm && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardContent className="p-6 flex items-center gap-5">
                <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600"><Package className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Menú</p>
                  <p className="text-3xl font-black text-slate-900">{platos.length} Items</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardContent className="p-6 flex items-center gap-5">
                <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600"><DollarSign className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Costo Promedio</p>
                  <p className="text-3xl font-black text-slate-900">
                    ${(platos.reduce((acc, p) => acc + (p.costo_total || 0), 0) / (platos.length || 1)).toFixed(2)}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-white rounded-3xl overflow-hidden">
              <CardContent className="p-6 flex items-center gap-5">
                <div className="p-4 bg-amber-50 rounded-2xl text-amber-600"><TrendingUp className="w-6 h-6" /></div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Margen Sugerido</p>
                  <p className="text-3xl font-black text-slate-900">70%</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Buscador y Tabs */}
        {!showForm && (
          <div className="space-y-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <Input 
                placeholder="Buscar plato por nombre o descripción..." 
                className="pl-12 h-14 bg-white border-none shadow-sm rounded-2xl text-lg focus-visible:ring-amber-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="flex flex-wrap h-auto bg-transparent gap-2 p-0">
                <TabsTrigger value="todos" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white rounded-xl border-none shadow-sm bg-white px-6 py-2.5 font-bold transition-all">Todos</TabsTrigger>
                {categorias.map(cat => (
                  <TabsTrigger key={cat} value={cat} className="data-[state=active]:bg-amber-500 data-[state=active]:text-white rounded-xl border-none shadow-sm bg-white px-6 py-2.5 font-bold transition-all">{cat}</TabsTrigger>
                ))}
              </TabsList>
              
              <TabsContent value={activeTab} className="mt-8">
                {loadingPlatos ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                    <p className="text-slate-500 font-medium">Cargando catálogo...</p>
                  </div>
                ) : (
                  <PlatosList 
                    platos={filteredPlatos}
                    onEdit={handleEdit} 
                    onDelete={handleDelete}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
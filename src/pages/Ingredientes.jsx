import { useState, useEffect } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Pencil, Package, DollarSign, History, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

// Importación de Modales
import ModalNuevoCosto from "../components/ingredientes/ModalNuevoCosto";
import HistorialCostos from "../components/ingredientes/HistorialCostos";
import ModalEditarIngrediente from "../components/ingredientes/ModalEditarIngrediente";
import ModalNuevoIngrediente from "../components/ingredientes/ModalNuevoIngrediente";

// --- LISTADO DE INGREDIENTES ---
function IngredientesList({ ingredientes, onEdit, onNuevoCosto, onVerHistorial, onDelete, isLoading }) {
  if (isLoading) return <Card className="p-6"><Skeleton className="h-64 w-full" /></Card>;
  if (ingredientes.length === 0) return <Card className="p-12 text-center text-gray-500">No se encontraron ingredientes.</Card>;

  return (
    <Card className="shadow-lg border-none overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Costo/Unidad</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredientes.map((ing) => {
              const bajoStock = ing.cantidad_disponible <= ing.cantidad_minima;
              return (
                <TableRow key={ing.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{ing.nombre}</TableCell>
                  <TableCell><Badge variant="outline">{ing.unidad_medida}</Badge></TableCell>
                  <TableCell>${Number(ing.costo_por_unidad).toFixed(2)}</TableCell>
                  <TableCell className={bajoStock ? "text-red-600 font-bold" : "text-green-600 font-medium"}>
                    {ing.cantidad_disponible} {ing.unidad_medida}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(ing)} title="Editar"><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onNuevoCosto(ing)} className="text-green-600" title="Actualizar Costo"><DollarSign className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onVerHistorial(ing)} className="text-blue-600" title="Ver Historial"><History className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => onDelete(ing)} className="text-red-500 hover:bg-red-50" title="Eliminar"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

// --- COMPONENTE PRINCIPAL ---
export default function Ingredientes() {
  const [showModalNuevo, setShowModalNuevo] = useState(false);
  const [ingredienteParaEditar, setIngredienteParaEditar] = useState(null);
  const [ingredienteParaCosto, setIngredienteParaCosto] = useState(null);
  const [ingredienteParaHistorial, setIngredienteParaHistorial] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [empleadoActual, setEmpleadoActual] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const empleadoSesion = localStorage.getItem('empleado_sesion');
    if (empleadoSesion) setEmpleadoActual(JSON.parse(empleadoSesion));
  }, []);

  // Consultas
  const { data: ingredientes = [], isLoading } = useQuery({
    queryKey: ['ingredientes'],
    queryFn: () => base44.entities.Ingrediente.list(),
  });

  const { data: historialCostos = [] } = useQuery({
    queryKey: ['historial-costos', ingredienteParaHistorial?.id],
    queryFn: () => base44.entities.HistorialCostoIngrediente.filter({ ingrediente_id: ingredienteParaHistorial.id }, '-created_date', 50),
    enabled: !!ingredienteParaHistorial
  });
  // --- MUTACIÓN: ACTUALIZAR COSTO (Simplificada) ---
  const actualizarCostoMutation = useMutation({
    mutationFn: async ({ ingrediente, nuevoCosto }) => {
      const costoNuevoVal = Number(nuevoCosto.costo_nuevo);

      // 1. Actualizar ingrediente (el servidor registrará el historial y recalculará costos)
      const updated = await base44.entities.Ingrediente.update(ingrediente.id, {
        costo_por_unidad: costoNuevoVal,
        proveedor: nuevoCosto.proveedor || ingrediente.proveedor
      });

      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
      queryClient.invalidateQueries({ queryKey: ['recetas'] });
      queryClient.invalidateQueries({ queryKey: ['platos'] });
      queryClient.invalidateQueries({ queryKey: ['recetas-primarias'] });
      queryClient.invalidateQueries({ queryKey: ['recetas-secundarias'] });
      queryClient.invalidateQueries({ queryKey: ['historial-costos'] });
      setIngredienteParaCosto(null);
      toast.success("✅ Costo actualizado. Los platos se están recalculando en el servidor.");
    },
    onError: () => toast.error("Error al actualizar el costo")
  });

  // --- OTRAS MUTACIONES ---
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Ingrediente.create(data),
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['ingredientes'], refetchType: 'all' }); 
      setShowModalNuevo(false); 
      toast.success("Creado correctamente"); 
    },
    onError: (e) => toast.error("Error al crear: " + e.message)
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const updated = await base44.entities.Ingrediente.update(id, data);
      return updated;
    },
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['ingredientes'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['recetas'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['platos'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['recetas-primarias'], refetchType: 'all' });
      queryClient.invalidateQueries({ queryKey: ['recetas-secundarias'], refetchType: 'all' });
      setIngredienteParaEditar(null); 
      toast.success("Actualizado y costos recalculados"); 
    },
    onError: (e) => toast.error("Error al actualizar: " + e.message)
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Ingrediente.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['ingredientes'] }); toast.success("Eliminado"); },
    onError: () => toast.error("No se puede eliminar: ingrediente en uso")
  });

  // Handlers
  const handleConfirmarNuevo = (data) => {
    console.log('[DEBUG] Enviando ingrediente:', JSON.stringify(data));
    createMutation.mutate({ ...data, costo_por_unidad: Number(data.costo_por_unidad), cantidad_disponible: Number(data.cantidad_disponible), cantidad_minima: Number(data.cantidad_minima) });
  }
  
  const handleConfirmarEdicion = (data) => updateMutation.mutate({ id: ingredienteParaEditar.id, data: { ...data, costo_por_unidad: Number(data.costo_por_unidad), cantidad_disponible: Number(data.cantidad_disponible), cantidad_minima: Number(data.cantidad_minima) } });

  const handleDelete = (ing) => { if (window.confirm(`¿Eliminar ${ing.nombre}?`)) deleteMutation.mutate(ing.id); };

  const filtered = ingredientes.filter(i => i.nombre.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-3"><Package className="text-amber-600" /> Gestión de Ingredientes</h1>
        <Button onClick={() => setShowModalNuevo(true)} className="bg-amber-600 hover:bg-amber-700"><Plus className="mr-2 h-4 w-4" /> Nuevo Ingrediente</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        <Input placeholder="Buscar por nombre o proveedor..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <IngredientesList 
        ingredientes={filtered} 
        isLoading={isLoading} 
        onEdit={setIngredienteParaEditar} 
        onNuevoCosto={setIngredienteParaCosto}
        onVerHistorial={setIngredienteParaHistorial}
        onDelete={handleDelete}
      />

      {/* --- TODOS LOS MODALES REINSTALADOS Y FUNCIONALES --- */}
      
      <ModalNuevoIngrediente 
        open={showModalNuevo} 
        onConfirm={handleConfirmarNuevo} 
        onCancel={() => setShowModalNuevo(false)} 
        isLoading={createMutation.isPending} 
      />

      <ModalEditarIngrediente 
        ingrediente={ingredienteParaEditar} 
        onConfirm={handleConfirmarEdicion} 
        onCancel={() => setIngredienteParaEditar(null)} 
        isLoading={updateMutation.isPending} 
      />

      <ModalNuevoCosto
        ingrediente={ingredienteParaCosto}
        onConfirm={(nuevoCosto) => actualizarCostoMutation.mutate({ ingrediente: ingredienteParaCosto, nuevoCosto })}
        onCancel={() => setIngredienteParaCosto(null)}
        isLoading={actualizarCostoMutation.isPending}
      />

      {ingredienteParaHistorial && (
        <Dialog open={!!ingredienteParaHistorial} onOpenChange={() => setIngredienteParaHistorial(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Historial de Costos</DialogTitle>
              <DialogDescription>{ingredienteParaHistorial.nombre}</DialogDescription>
            </DialogHeader>
            <HistorialCostos historial={historialCostos} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

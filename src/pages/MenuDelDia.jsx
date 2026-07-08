import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Sparkles,
  Plus,
  Trash2,
  Save,
  Loader2,
  CalendarDays,
  UtensilsCrossed,
  Wine,
  IceCreamCone,
  Salad,
  Eye,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
  History,
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CATEGORIAS = [
  { key: "Entrada", label: "Entradas", icon: Salad, color: "emerald" },
  { key: "Principal", label: "Platos Principales", icon: UtensilsCrossed, color: "amber" },
  { key: "Postre", label: "Postres", icon: IceCreamCone, color: "pink" },
  { key: "Bebida", label: "Bebidas", icon: Wine, color: "blue" },
];

const colorMap = {
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-800", icon: "text-emerald-600" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", badge: "bg-amber-100 text-amber-800", icon: "text-amber-600" },
  pink: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", badge: "bg-pink-100 text-pink-800", icon: "text-pink-600" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", badge: "bg-blue-100 text-blue-800", icon: "text-blue-600" },
};

const fetchMenus = async () => {
  const token = localStorage.getItem("jwt_token");
  const res = await fetch("/api/menu-del-dia", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Error al cargar menús");
  return res.json();
};

const fetchMenuHoy = async () => {
  const token = localStorage.getItem("jwt_token");
  const res = await fetch("/api/menu-del-dia/hoy", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Error al cargar menú de hoy");
  return res.json();
};

export default function MenuDelDia() {
  const queryClient = useQueryClient();
  const hoy = format(new Date(), "yyyy-MM-dd");

  // State
  const [showForm, setShowForm] = useState(false);
  const [fecha, setFecha] = useState(hoy);
  const [precio, setPrecio] = useState("");
  const [notas, setNotas] = useState("");
  const [items, setItems] = useState(
    CATEGORIAS.reduce((acc, cat) => ({ ...acc, [cat.key]: [] }), {})
  );
  const [editingId, setEditingId] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Queries
  const { data: menus = [], isLoading } = useQuery({
    queryKey: ["menus-del-dia"],
    queryFn: fetchMenus,
  });

  const { data: menuHoy } = useQuery({
    queryKey: ["menu-hoy"],
    queryFn: fetchMenuHoy,
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      const token = localStorage.getItem("jwt_token");
      const url = editingId
        ? `/api/menu-del-dia/${editingId}`
        : "/api/menu-del-dia";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Error al guardar");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus-del-dia"] });
      queryClient.invalidateQueries({ queryKey: ["menu-hoy"] });
      resetForm();
      toast.success(editingId ? "Menú actualizado ✨" : "Menú del día creado ✨");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const token = localStorage.getItem("jwt_token");
      const res = await fetch(`/api/menu-del-dia/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Error al eliminar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menus-del-dia"] });
      queryClient.invalidateQueries({ queryKey: ["menu-hoy"] });
      toast.success("Menú eliminado");
    },
    onError: (err) => toast.error(err.message),
  });

  // Helpers
  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFecha(hoy);
    setPrecio("");
    setNotas("");
    setItems(CATEGORIAS.reduce((acc, cat) => ({ ...acc, [cat.key]: [] }), {}));
  };

  const addItem = (categoria) => {
    setItems((prev) => ({
      ...prev,
      [categoria]: [...prev[categoria], { nombre: "", descripcion: "" }],
    }));
  };

  const updateItem = (categoria, index, field, value) => {
    setItems((prev) => ({
      ...prev,
      [categoria]: prev[categoria].map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const removeItem = (categoria, index) => {
    setItems((prev) => ({
      ...prev,
      [categoria]: prev[categoria].filter((_, i) => i !== index),
    }));
  };

  const handleEdit = (menu) => {
    setEditingId(menu.id);
    setFecha(menu.fecha);
    setPrecio(String(menu.precio));
    setNotas(menu.notas || "");

    const newItems = CATEGORIAS.reduce(
      (acc, cat) => ({ ...acc, [cat.key]: [] }),
      {}
    );
    menu.items.forEach((item) => {
      const cat = item.categoria || "Principal";
      if (newItems[cat]) {
        newItems[cat].push({
          nombre: item.nombre,
          descripcion: item.descripcion || "",
        });
      } else {
        newItems["Principal"].push({
          nombre: item.nombre,
          descripcion: item.descripcion || "",
        });
      }
    });
    setItems(newItems);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDuplicate = (menu) => {
    setEditingId(null);
    setFecha(hoy);
    setPrecio(String(menu.precio));
    setNotas(menu.notas || "");

    const newItems = CATEGORIAS.reduce(
      (acc, cat) => ({ ...acc, [cat.key]: [] }),
      {}
    );
    menu.items.forEach((item) => {
      const cat = item.categoria || "Principal";
      if (newItems[cat]) {
        newItems[cat].push({
          nombre: item.nombre,
          descripcion: item.descripcion || "",
        });
      } else {
        newItems["Principal"].push({
          nombre: item.nombre,
          descripcion: item.descripcion || "",
        });
      }
    });
    setItems(newItems);
    setShowForm(true);
    toast.info("Menú duplicado. Modifica lo que necesites y guarda.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const allItems = [];
    let orden = 0;
    CATEGORIAS.forEach((cat) => {
      items[cat.key].forEach((item) => {
        if (item.nombre.trim()) {
          allItems.push({
            categoria: cat.key,
            nombre: item.nombre.trim(),
            descripcion: item.descripcion?.trim() || null,
            orden: orden++,
          });
        }
      });
    });

    if (allItems.length === 0) {
      toast.error("Agrega al menos un plato al menú");
      return;
    }

    if (!precio || parseFloat(precio) <= 0) {
      toast.error("Ingresa el precio del menú");
      return;
    }

    saveMutation.mutate({
      fecha,
      precio: parseFloat(precio),
      notas: notas || null,
      items: allItems,
    });
  };

  const totalItems = useMemo(() => {
    return Object.values(items).reduce((sum, arr) => sum + arr.filter(i => i.nombre.trim()).length, 0);
  }, [items]);

  const menuExisteHoy = menus.some((m) => m.fecha === hoy);

  return (
    <div className="p-4 md:p-8 min-h-screen bg-slate-50/50">
      <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-black text-slate-900 flex items-center gap-4 tracking-tight">
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-200">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              Menú Gourmet del Día
            </h1>
            <p className="text-slate-500 font-medium ml-1">
              Crea y administra el menú especial que cambia cada día
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
              className="rounded-2xl h-12 px-5 font-bold border-slate-200"
            >
              <History className="w-4 h-4 mr-2" />
              Historial
            </Button>
            {!showForm && (
              <Button
                onClick={() => { resetForm(); setShowForm(true); }}
                className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-2xl h-12 px-6 font-bold shadow-lg shadow-violet-200/50 hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Plus className="w-5 h-5 mr-2" />
                {menuExisteHoy ? "Nuevo Menú" : "Crear Menú de Hoy"}
              </Button>
            )}
          </div>
        </div>

        {/* Status Card: Menu de hoy */}
        {menuHoy ? (
          <Card className="border-0 shadow-xl rounded-[2rem] bg-gradient-to-br from-violet-50 via-white to-purple-50 overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-violet-100 to-transparent rounded-bl-full opacity-50" />
            <CardContent className="p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800 font-bold px-3 py-1 text-xs">
                      ✅ ACTIVO HOY
                    </Badge>
                    <span className="text-sm text-slate-500">{menuHoy.fecha}</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">Menú Gourmet — ${parseFloat(menuHoy.precio).toFixed(2)}</h2>
                  <p className="text-sm text-slate-500">{menuHoy.items.length} opciones en el menú</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowPreview(true)}
                    className="rounded-xl"
                  >
                    <Eye className="w-4 h-4 mr-1" /> Ver
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(menuHoy)}
                    className="rounded-xl"
                  >
                    Editar
                  </Button>
                </div>
              </div>

              {/* Quick preview of items */}
              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                {CATEGORIAS.map((cat) => {
                  const catItems = menuHoy.items.filter(
                    (i) => i.categoria === cat.key
                  );
                  if (catItems.length === 0) return null;
                  const colors = colorMap[cat.color];
                  return (
                    <div key={cat.key} className={`${colors.bg} ${colors.border} border rounded-xl p-3`}>
                      <p className={`text-xs font-bold uppercase tracking-wider ${colors.text} mb-1`}>
                        {cat.label}
                      </p>
                      {catItems.map((item) => (
                        <p key={item.id} className="text-sm font-medium text-slate-800 truncate">
                          {item.nombre}
                        </p>
                      ))}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-lg rounded-[2rem] bg-white overflow-hidden">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No hay menú para hoy</h3>
              <p className="text-slate-500 mb-4">Crea el menú gourmet del día para que los meseros puedan facturarlo en las comandas</p>
              {!showForm && (
                <Button
                  onClick={() => { resetForm(); setShowForm(true); }}
                  className="bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl px-6 font-bold"
                >
                  <Plus className="w-4 h-4 mr-2" /> Crear Menú de Hoy
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* ============== FORMULARIO ============== */}
        {showForm && (
          <form onSubmit={handleSubmit}>
            <Card className="border-0 shadow-xl rounded-[2rem] bg-white overflow-hidden">
              <CardHeader className="pb-2 px-8 pt-8">
                <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-violet-600" />
                  {editingId ? "Editar Menú" : "Nuevo Menú del Día"}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">

                {/* Fecha y Precio */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Fecha
                    </Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <Input
                        type="date"
                        value={fecha}
                        onChange={(e) => setFecha(e.target.value)}
                        className="pl-11 h-12 bg-slate-50 border-none rounded-xl font-semibold"
                        disabled={!!editingId}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Precio del Menú (USD)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="15.00"
                      value={precio}
                      onChange={(e) => setPrecio(e.target.value)}
                      className="h-12 bg-slate-50 border-none rounded-xl font-bold text-lg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Notas (opcional)
                    </Label>
                    <Input
                      placeholder="Ej: Menú especial feriado..."
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      className="h-12 bg-slate-50 border-none rounded-xl font-medium"
                    />
                  </div>
                </div>

                {/* Categorías de items */}
                <div className="space-y-6">
                  {CATEGORIAS.map((cat) => {
                    const colors = colorMap[cat.color];
                    const Icon = cat.icon;
                    return (
                      <div
                        key={cat.key}
                        className={`${colors.bg} ${colors.border} border-2 rounded-2xl p-6 space-y-4`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg bg-white/80 ${colors.icon}`}>
                              <Icon className="w-5 h-5" />
                            </div>
                            <h3 className={`font-bold text-lg ${colors.text}`}>{cat.label}</h3>
                            {items[cat.key].length > 0 && (
                              <Badge className={`${colors.badge} font-bold`}>
                                {items[cat.key].length}
                              </Badge>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addItem(cat.key)}
                            className={`rounded-xl bg-white/80 hover:bg-white ${colors.text} font-bold`}
                          >
                            <Plus className="w-4 h-4 mr-1" /> Agregar
                          </Button>
                        </div>

                        {items[cat.key].length === 0 ? (
                          <p className="text-sm text-slate-400 italic text-center py-2">
                            Sin opciones. Presiona "Agregar" para añadir.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {items[cat.key].map((item, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-3 bg-white/70 rounded-xl p-3 shadow-sm"
                              >
                                <div className="flex-1 space-y-2">
                                  <Input
                                    placeholder={`Nombre del plato (ej: Crema de Tomate)`}
                                    value={item.nombre}
                                    onChange={(e) =>
                                      updateItem(cat.key, idx, "nombre", e.target.value)
                                    }
                                    className="h-10 bg-white border-slate-200 rounded-lg font-semibold"
                                  />
                                  <Input
                                    placeholder="Descripción breve (opcional)"
                                    value={item.descripcion}
                                    onChange={(e) =>
                                      updateItem(cat.key, idx, "descripcion", e.target.value)
                                    }
                                    className="h-9 bg-white border-slate-200 rounded-lg text-sm text-slate-600"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeItem(cat.key, idx)}
                                  className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg mt-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <p className="text-sm text-slate-500">
                    {totalItems > 0
                      ? `${totalItems} plato${totalItems > 1 ? "s" : ""} en el menú`
                      : "Agrega platos al menú"}
                  </p>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetForm}
                      className="rounded-xl h-12 px-6 font-bold"
                    >
                      <X className="w-4 h-4 mr-2" /> Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={saveMutation.isPending}
                      className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white rounded-xl h-12 px-8 font-bold shadow-lg shadow-violet-200/50"
                    >
                      {saveMutation.isPending ? (
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-5 h-5 mr-2" />
                      )}
                      {editingId ? "Actualizar Menú" : "Guardar Menú"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </form>
        )}

        {/* ============== HISTORIAL ============== */}
        {showHistory && (
          <Card className="border-0 shadow-xl rounded-[2rem] bg-white overflow-hidden">
            <CardHeader className="px-8 pt-8 pb-4">
              <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-3">
                <History className="w-5 h-5 text-violet-600" />
                Historial de Menús
              </CardTitle>
            </CardHeader>
            <CardContent className="px-8 pb-8">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                </div>
              ) : menus.length === 0 ? (
                <p className="text-center text-slate-500 py-8">
                  No hay menús creados aún.
                </p>
              ) : (
                <div className="space-y-4">
                  {menus.map((menu) => (
                    <MenuHistoryCard
                      key={menu.id}
                      menu={menu}
                      isToday={menu.fecha === hoy}
                      onEdit={() => handleEdit(menu)}
                      onDuplicate={() => handleDuplicate(menu)}
                      onDelete={() => {
                        if (window.confirm("¿Eliminar este menú?")) {
                          deleteMutation.mutate(menu.id);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ============== PREVIEW MODAL ============== */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-lg rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-violet-600" />
                Vista Previa del Menú
              </DialogTitle>
            </DialogHeader>
            {menuHoy && <MenuPreview menu={menuHoy} />}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

// ============== COMPONENTES AUXILIARES ==============

function MenuHistoryCard({ menu, isToday, onEdit, onDuplicate, onDelete }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border rounded-2xl overflow-hidden transition-all ${isToday ? "border-violet-300 bg-violet-50/30" : "border-slate-200 bg-slate-50/50"}`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className={`p-2 rounded-xl ${isToday ? "bg-violet-100" : "bg-slate-100"}`}>
            <CalendarDays className={`w-5 h-5 ${isToday ? "text-violet-600" : "text-slate-500"}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900">{menu.fecha}</span>
              {isToday && (
                <Badge className="bg-violet-100 text-violet-700 text-[10px] font-bold">HOY</Badge>
              )}
              {!menu.activo && (
                <Badge variant="outline" className="text-[10px] text-slate-400">INACTIVO</Badge>
              )}
            </div>
            <p className="text-sm text-slate-500">
              ${parseFloat(menu.precio).toFixed(2)} · {menu.items.length} opciones
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="rounded-lg text-slate-500 hover:text-violet-600">
            <Copy className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onEdit(); }} className="rounded-lg text-slate-500 hover:text-amber-600">
            Editar
          </Button>
          <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded-lg text-slate-500 hover:text-red-600">
            <Trash2 className="w-4 h-4" />
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {CATEGORIAS.map((cat) => {
              const catItems = menu.items.filter((i) => i.categoria === cat.key);
              if (catItems.length === 0) return null;
              const colors = colorMap[cat.color];
              return (
                <div key={cat.key} className={`${colors.bg} ${colors.border} border rounded-xl p-3`}>
                  <p className={`text-xs font-bold uppercase tracking-wider ${colors.text} mb-1`}>
                    {cat.label}
                  </p>
                  {catItems.map((item) => (
                    <div key={item.id} className="mb-1">
                      <p className="text-sm font-medium text-slate-800">{item.nombre}</p>
                      {item.descripcion && (
                        <p className="text-xs text-slate-500">{item.descripcion}</p>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
          {menu.notas && (
            <p className="text-xs text-slate-400 mt-3 italic">📝 {menu.notas}</p>
          )}
        </div>
      )}
    </div>
  );
}

function MenuPreview({ menu }) {
  return (
    <div className="space-y-6 py-2">
      <div className="text-center pb-4 border-b border-slate-100">
        <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">MENÚ GOURMET</p>
        <p className="text-3xl font-black text-slate-900">${parseFloat(menu.precio).toFixed(2)}</p>
        <p className="text-sm text-slate-500 mt-1">{menu.fecha}</p>
      </div>

      {CATEGORIAS.map((cat) => {
        const catItems = menu.items.filter((i) => i.categoria === cat.key);
        if (catItems.length === 0) return null;
        const colors = colorMap[cat.color];
        const Icon = cat.icon;
        return (
          <div key={cat.key}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className={`w-4 h-4 ${colors.icon}`} />
              <h4 className={`text-xs font-bold uppercase tracking-widest ${colors.text}`}>
                {cat.label}
              </h4>
            </div>
            <div className="space-y-2 pl-6">
              {catItems.map((item) => (
                <div key={item.id}>
                  <p className="font-semibold text-slate-900">{item.nombre}</p>
                  {item.descripcion && (
                    <p className="text-sm text-slate-500">{item.descripcion}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {menu.notas && (
        <p className="text-xs text-slate-400 italic text-center pt-4 border-t border-slate-100">
          {menu.notas}
        </p>
      )}
    </div>
  );
}

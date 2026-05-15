import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit3, ChevronRight, Utensils, AlertTriangle, TrendingUp, DollarSign } from "lucide-react";

export default function PlatosList({ platos, onEdit, onDelete }) {
  if (platos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl border-2 border-dashed border-slate-100">
        <Utensils className="w-16 h-16 text-slate-200 mb-4" />
        <p className="text-xl font-bold text-slate-400">No se encontraron platos</p>
        <p className="text-slate-300 text-sm">Prueba ajustando los filtros o crea uno nuevo</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
      {platos.map((plato) => {
        const hasReceta = plato.recetas && plato.recetas.length > 0;
        const costoTotal = plato.costo_total || 0;
        const precio = plato.tiene_piezas ? (plato.precio_12 / 12) : (plato.precio || 0);
        const margen = precio > 0 ? ((precio - costoTotal) / precio * 100) : 0;

        return (
          <Card key={plato.id} className="group border-none shadow-sm hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] bg-white overflow-hidden flex flex-col">
            <CardContent className="p-0 flex-1 flex flex-col">
              {/* Top Section */}
              <div className="p-8 space-y-4">
                <div className="flex justify-between items-start">
                  <Badge className={`rounded-xl px-4 py-1 font-black tracking-tight ${plato.activo ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                    {plato.activo ? 'DISPONIBLE' : 'INACTIVO'}
                  </Badge>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(plato)} className="h-10 w-10 bg-slate-50 hover:bg-amber-100 text-amber-600 rounded-2xl">
                      <Edit3 className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(plato.id)} className="h-10 w-10 bg-slate-50 hover:bg-red-100 text-red-600 rounded-2xl">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-800 leading-tight group-hover:text-amber-600 transition-colors">{plato.nombre}</h3>
                  <p className="text-slate-400 text-sm font-medium line-clamp-2 min-h-[2.5rem]">
                    {plato.descripcion || "Sin descripción disponible"}
                  </p>
                </div>
              </div>

              {/* Pricing Grid */}
              <div className="px-8 pb-6 grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-3xl space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio Venta</p>
                  <p className="text-xl font-black text-slate-900">
                    {plato.tiene_piezas ? `$${(plato.precio_12 || 0).toFixed(2)} (12)` : `$${(plato.precio || 0).toFixed(2)}`}
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-3xl space-y-1">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Costo Real</p>
                  <p className="text-xl font-black text-indigo-600">${costoTotal.toFixed(2)}</p>
                </div>
              </div>

              {/* Profitability Meter */}
              <div className="px-8 pb-8 space-y-3">
                <div className="flex justify-between items-center text-xs font-black uppercase tracking-tighter">
                  <span className="text-slate-400 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Margen Bruto</span>
                  <span className={margen >= 60 ? 'text-emerald-600' : 'text-orange-500'}>{margen.toFixed(1)}%</span>
                </div>
                <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${margen >= 60 ? 'bg-emerald-500' : 'bg-orange-500'}`}
                    style={{ width: `${Math.min(Math.max(margen, 0), 100)}%` }}
                  />
                </div>
              </div>

              {/* Bottom Recipe Bar */}
              <div className={`mt-auto p-6 flex justify-between items-center ${hasReceta ? 'bg-slate-900' : 'bg-amber-500'}`}>
                <div className="flex items-center gap-3">
                  {hasReceta ? (
                    <div className="p-2 bg-white/10 rounded-xl"><Utensils className="w-4 h-4 text-white" /></div>
                  ) : (
                    <div className="p-2 bg-white/20 rounded-xl"><AlertTriangle className="w-4 h-4 text-white" /></div>
                  )}
                  <span className="text-white text-xs font-black uppercase tracking-widest">
                    {hasReceta ? `${plato.recetas.length} Ingredientes` : "Sin Receta Configurada"}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => onEdit(plato)} className="text-white hover:bg-white/10 rounded-xl">
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
import React, { useState } from "react";
import { api as base44 } from "@/api/apiAdapter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Receipt, Filter, Calendar } from "lucide-react";
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

import ComandaForm from "../components/comandas/ComandaForm";
import ComandasList from "../components/comandas/ComandasList";
import ComandaDetalle from "../components/comandas/ComandaDetalle";
import { descontarStock } from "../components/utils/descontarStock";

export default function Comandas() {
  const [showForm, setShowForm] = useState(false);
  const [comandaSeleccionada, setComandaSeleccionada] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("abierta");
  const [fechaFiltro, setFechaFiltro] = useState(format(new Date(), 'yyyy-MM-dd'));

  const queryClient = useQueryClient();

  const { data: comandas = [], isLoading: loadingComandas } = useQuery({
    queryKey: ['comandas'],
    queryFn: () => base44.entities.Comanda.list('-created_date', 200),
  });

  const { data: detallesComandas = [] } = useQuery({
    queryKey: ['detalles-comandas'],
    queryFn: () => base44.entities.DetalleComanda.list('-created_date', 500),
  });

  const { data: platos = [] } = useQuery({
    queryKey: ['platos'],
    queryFn: () => base44.entities.Plato.list(),
  });

  // Obtener empleado en sesión
  const [empleadoSesion, setEmpleadoSesion] = React.useState(null);

  React.useEffect(() => {
    const sesion = localStorage.getItem('empleado_sesion');
    if (sesion) {
      setEmpleadoSesion(JSON.parse(sesion));
    }
  }, []);

  // Generar próximo número de comanda
  const generarNumeroComanda = () => {
    const ultimaComanda = comandas.reduce((max, c) => {
      const num = parseInt(c.numero_comanda.replace('C-', ''));
      return num > max ? num : max;
    }, 0);
    return `C-${String(ultimaComanda + 1).padStart(3, '0')}`;
  };

  // Mutation para crear comanda con detalles
  const crearComandaMutation = useMutation({
    mutationFn: async ({ comandaData, platosSeleccionados }) => {
      const numeroComanda = generarNumeroComanda();
      const total = platosSeleccionados.reduce((sum, p) => sum + (p.precio * p.cantidad), 0);

      const comanda = await base44.entities.Comanda.create({
        numero_comanda: numeroComanda,
        mesa_numero: comandaData.mesa_numero,
        mesero_nombre: empleadoSesion?.nombre_completo || 'Mesero',
        fecha_apertura: new Date().toISOString(),
        estado: 'abierta',
        total_comanda: total,
        notas: comandaData.notas || '',
        detalles: platosSeleccionados.map(p => ({
          plato_id: p.id,
          plato_nombre: p.nombre,
          cantidad: p.cantidad,
          precio_unitario: p.precio
        }))
      });

      return comanda;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-comandas'] });
      setShowForm(false);
      toast.success("Comanda creada exitosamente");
    },
    onError: () => {
      toast.error("Error al crear la comanda");
    }
  });

  // Mutation para agregar platos a comanda existente
  const agregarPlatosMutation = useMutation({
    mutationFn: async ({ comandaId, platosNuevos, totalActual }) => {
      // Usar endpoint dedicado que notifica a la cocina en tiempo real
      const result = await fetch(`/api/comandas/${comandaId}/detalles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        },
        body: JSON.stringify({
          platos: platosNuevos.map(p => ({
            plato_id: p.id,
            plato_nombre: p.nombre,
            cantidad: p.cantidad,
            precio_unitario: p.precio,
            notas_plato: p.notas || '',
            variante: p.variante || null
          }))
        })
      });
      if (!result.ok) throw new Error('Error agregando platos');

      // Actualizar el total de la comanda
      let nuevoTotal = totalActual;
      for (const plato of platosNuevos) {
        nuevoTotal += plato.precio * plato.cantidad;
      }
      await base44.entities.Comanda.update(comandaId, {
        total_comanda: nuevoTotal
      });

      return nuevoTotal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-comandas'] });
      toast.success("Platos agregados a la comanda");
    }
  });

  // Mutation para actualizar estado de plato
  const actualizarEstadoPlatoMutation = useMutation({
    mutationFn: ({ detalleId, nuevoEstado }) => 
      base44.entities.DetalleComanda.update(detalleId, { estado_plato: nuevoEstado }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['detalles-comandas'] });
      toast.success("Estado actualizado");
    }
  });

  // Mutation para cerrar comanda y procesar pago
  const cerrarComandaMutation = useMutation({
    mutationFn: async ({ comandaId, metodoPago, tasaBs, pagosMixtos, datosCuenta, descuentoMonto = 0 }) => {
      const comanda = comandas.find(c => c.id === comandaId);
      
      // Obtener tasas desde localStorage o valores por defecto
      const tasaCOPActual = parseFloat(localStorage.getItem('tasa_cop_actual') || '4000');
      const tasaUSDFinal = parseFloat(localStorage.getItem('tasa_usd_final')) || tasaBs;

      const subtotalUSD = comanda.total_comanda;
      const totalUSD = subtotalUSD - descuentoMonto;
      const totalCOP = totalUSD * tasaCOPActual;
      const totalVES = totalUSD * tasaUSDFinal;

      // Llamar al endpoint unificado del servidor
      const result = await base44.custom.pagarComanda(comandaId, {
        metodoPago,
        tasaBs: tasaUSDFinal,
        pagosMixtos,
        descuentoMonto,
        totalUSD,
        totalVES,
        totalCOP
      });

      return { 
        ...result,
        total: totalUSD,
        descuento: descuentoMonto
      };
    },
    onSuccess: (data) => {
      console.log("🎉 Proceso completado exitosamente");
      
      // Invalidar TODAS las queries relacionadas
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-comandas'] });
      queryClient.invalidateQueries({ queryKey: ['ventas'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-ventas'] });
      queryClient.invalidateQueries({ queryKey: ['ingredientes'] });
      queryClient.invalidateQueries({ queryKey: ['alertas'] });
      queryClient.invalidateQueries({ queryKey: ['platos'] });
      queryClient.invalidateQueries({ queryKey: ['cuentas-por-cobrar'] });
      
      setComandaSeleccionada(null);
      
      const mensajeDescuento = data.descuento > 0 ? ` | Descuento: -$${data.descuento.toFixed(2)}` : '';
      toast.success(
        `✅ Pago procesado: $${data.total.toFixed(2)}${mensajeDescuento} | ${data.ingredientesActualizados} ingredientes actualizados${data.alertasCreadas > 0 ? ` | ${data.alertasCreadas} alertas generadas` : ''}`
      );
    },
    onError: (error) => {
      console.error("❌ Error en proceso de pago:", error);
      toast.error(`❌ Error al procesar el pago: ${error.message}`);
    }
  });

  // Mutation para eliminar comanda (solo administrador)
  const eliminarComandaMutation = useMutation({
    mutationFn: async (comandaId) => {
      // Eliminar detalles primero
      const detalles = detallesComandas.filter(d => d.comanda_id === comandaId);
      for (const detalle of detalles) {
        await base44.entities.DetalleComanda.delete(detalle.id);
      }
      // Eliminar comanda
      await base44.entities.Comanda.delete(comandaId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comandas'] });
      queryClient.invalidateQueries({ queryKey: ['detalles-comandas'] });
      setComandaSeleccionada(null);
      toast.success("Comanda eliminada exitosamente");
    },
    onError: () => {
      toast.error("Error al eliminar la comanda");
    }
  });

  const handleCrearComanda = (data) => {
    crearComandaMutation.mutate(data);
  };

  const handleEliminarComanda = (comandaId) => {
    eliminarComandaMutation.mutate(comandaId);
  };

  const handleAgregarPlatos = (comandaId, platosNuevos) => {
    const comanda = comandas.find(c => c.id === comandaId);
    agregarPlatosMutation.mutate({
      comandaId,
      platosNuevos,
      totalActual: comanda.total_comanda
    });
  };

  const handleVerDetalle = (comanda) => {
    setComandaSeleccionada(comanda);
  };

  const handleCerrarDetalle = () => {
    setComandaSeleccionada(null);
  };

  // Obtener tasa de cambio actual
  const { data: tasas = [] } = useQuery({
    queryKey: ['tasas-cambio'],
    queryFn: () => base44.entities.TasaCambio.list('-created_date', 5),
  });

  const comandasFiltradas = comandas.filter(comanda => {
    const matchesEstado = estadoFiltro === "todas" || comanda.estado === estadoFiltro;
    const matchesSearch = 
      comanda.numero_comanda.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comanda.mesa_numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comanda.mesero_nombre.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filtro por fecha
    let matchesFecha = true;
    if (fechaFiltro) {
      try {
        const fechaComanda = parseISO(comanda.fecha_apertura);
        const inicioFiltro = startOfDay(parseISO(fechaFiltro + 'T00:00:00'));
        const finFiltro = endOfDay(parseISO(fechaFiltro + 'T23:59:59'));
        matchesFecha = fechaComanda >= inicioFiltro && fechaComanda <= finFiltro;
      } catch {
        matchesFecha = true;
      }
    }
    
    return matchesEstado && matchesSearch && matchesFecha;
  });

  const comandasAbiertas = comandas.filter(c => c.estado === 'abierta').length;
  const comandasCerradas = comandas.filter(c => c.estado === 'cerrada').length;
  const comandasPagadas = comandas.filter(c => c.estado === 'pagada').length;

  const platosActivos = platos.filter(p => p.activo);

  return (
    <div className="p-4 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
              <Receipt className="w-6 h-6 sm:w-8 sm:h-8 text-amber-600 flex-shrink-0" />
              <span className="leading-tight">Comandas</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-1">
              Gestiona las comandas del restaurante
            </p>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-amber-600 hover:bg-amber-700 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Comanda
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Abiertas</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-green-600">{comandasAbiertas}</h3>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-green-100 flex-shrink-0">
                  <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-none">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-gray-500 mb-1">Pagadas</p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-blue-600">{comandasPagadas}</h3>
                </div>
                <div className="p-2 sm:p-3 rounded-xl bg-blue-100 flex-shrink-0">
                  <Receipt className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <Card className="shadow-lg border-none">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <Input
                  placeholder="Buscar por número, mesa o mesero..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 sm:pl-10 text-sm sm:text-base"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <Input
                  type="date"
                  value={fechaFiltro}
                  onChange={(e) => setFechaFiltro(e.target.value)}
                  className="flex-1 text-sm sm:text-base"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                <select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md text-sm sm:text-base"
                >
                  <option value="abierta">Comandas Abiertas</option>
                  <option value="pagada">Comandas Pagadas</option>
                  <option value="todas">Todas las Comandas</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form */}
        {showForm && (
          <ComandaForm
            platos={platosActivos}
            onSubmit={handleCrearComanda}
            onCancel={() => setShowForm(false)}
            isLoading={crearComandaMutation.isPending}
          />
        )}

        {/* Detalle de Comanda */}
        {comandaSeleccionada && (
          <ComandaDetalle
            comanda={comandaSeleccionada}
            detalles={detallesComandas.filter(d => d.comanda_id === comandaSeleccionada.id)}
            platos={platosActivos}
            onAgregarPlatos={handleAgregarPlatos}
            onActualizarEstado={actualizarEstadoPlatoMutation.mutate}
            onCerrarComanda={cerrarComandaMutation.mutate}
            onEliminarComanda={handleEliminarComanda}
            onCerrar={handleCerrarDetalle}
            isLoading={agregarPlatosMutation.isPending || cerrarComandaMutation.isPending || eliminarComandaMutation.isPending}
            empleado={empleadoSesion}
          />
        )}

        {/* Lista de Comandas */}
        <ComandasList
          comandas={comandasFiltradas}
          detalles={detallesComandas}
          onVerDetalle={handleVerDetalle}
          isLoading={loadingComandas}
        />
      </div>
    </div>
  );
}
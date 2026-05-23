import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { api as base44 } from "@/api/apiAdapter";

export default function AdelantoForm({ adelanto, onSubmit, onCancel, isLoading }) {
  const [metodoPago, setMetodoPago] = useState(adelanto?.metodo_pago || "");
  const [empleadoId, setEmpleadoId] = useState(adelanto?.empleado_id || "");

  const { data: empleados = [], isLoading: loadingEmpleados } = useQuery({
    queryKey: ['personal'],
    queryFn: () => base44.entities.Empleado.list()
  });

  const esMetodoBs = metodoPago === 'tarjeta_bs' || metodoPago === 'pago_movil_bs';

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    if (!empleadoId) {
      alert("Por favor selecciona un empleado");
      return;
    }

    const empleadoSeleccionado = empleados.find(emp => emp.id === empleadoId);
    const empleado_nombre = empleadoSeleccionado ? empleadoSeleccionado.nombre_completo : adelanto?.empleado_nombre || "Desconocido";

    const montoForm = parseFloat(formData.get("monto") || "0");
    const tasaBs = formData.get("tasa_bs") ? parseFloat(formData.get("tasa_bs")) : null;

    let montoUSD = montoForm;
    let montoOriginal = montoForm;
    let monedaOriginal = 'USD';

    if (esMetodoBs) {
      monedaOriginal = 'BS';
      if (tasaBs && tasaBs > 0) {
        montoUSD = montoForm / tasaBs;
      }
    } else if (metodoPago.includes('cop')) {
      monedaOriginal = 'COP';
    }

    const data = {
      empleado_id: empleadoId,
      empleado_nombre: empleado_nombre,
      monto: montoUSD,
      monto_original: montoOriginal,
      moneda_original: monedaOriginal,
      tasa_cambio: tasaBs,
      fecha_adelanto: formData.get("fecha_adelanto"),
      metodo_pago: metodoPago,
      notas: formData.get("notas") || ""
    };
    
    // Si es método Bs, agregar tasa a las notas
    if (esMetodoBs && tasaBs) {
      data.notas = `Tasa Bs: ${tasaBs}${data.notas ? ' | ' + data.notas : ''}`;
    }
    
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Empleado</Label>
        <Select value={empleadoId} onValueChange={setEmpleadoId} required disabled={loadingEmpleados}>
          <SelectTrigger>
            <SelectValue placeholder={loadingEmpleados ? "Cargando empleados..." : "Seleccionar empleado"} />
          </SelectTrigger>
          <SelectContent>
            {empleados.map((emp) => (
              <SelectItem key={emp.id} value={emp.id}>
                {emp.nombre_completo} ({emp.cargo || 'Sin cargo'})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Método de Pago</Label>
        <Select value={metodoPago} onValueChange={setMetodoPago} required>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar método" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="efectivo_usd">Efectivo USD</SelectItem>
            <SelectItem value="tarjeta_bs">Tarjeta Bs</SelectItem>
            <SelectItem value="pago_movil_bs">Pago Móvil</SelectItem>
            <SelectItem value="binance_usd">Binance</SelectItem>
            <SelectItem value="zinli_usd">Zinli</SelectItem>
            <SelectItem value="efectivo_cop">Efectivo COP</SelectItem>
            <SelectItem value="nequi_cop">Nequi</SelectItem>
            <SelectItem value="paypal_usd">PayPal</SelectItem>
            <SelectItem value="zelle_usd">Zelle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Monto ({esMetodoBs ? 'Bs' : '$'})</Label>
          <Input
            name="monto"
            type="number"
            step="0.01"
            defaultValue={adelanto?.monto_original || adelanto?.monto}
            required
            placeholder="0.00"
            className={esMetodoBs ? 'bg-yellow-50 border-yellow-300' : ''}
          />
        </div>
        <div>
          <Label>Fecha</Label>
          <Input
            name="fecha_adelanto"
            type="date"
            defaultValue={adelanto?.fecha_adelanto || new Date().toISOString().split('T')[0]}
            required
          />
        </div>
      </div>

      {esMetodoBs && (
        <div>
          <Label>Tasa Bs del día</Label>
          <Input
            name="tasa_bs"
            type="number"
            step="0.01"
            defaultValue={adelanto?.tasa_cambio}
            placeholder="Ej: 55.50"
            className="bg-yellow-50 border-yellow-300"
          />
          <p className="text-xs text-gray-500 mt-1">Esta tasa se guardará en la descripción del adelanto</p>
        </div>
      )}

      <div>
        <Label>Notas</Label>
        <Textarea
          name="notas"
          defaultValue={adelanto?.notas}
          placeholder="Notas adicionales..."
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || loadingEmpleados} className="flex-1">
          {isLoading ? "Guardando..." : adelanto ? "Actualizar" : "Crear Adelanto"}
        </Button>
      </div>
    </form>
  );
}
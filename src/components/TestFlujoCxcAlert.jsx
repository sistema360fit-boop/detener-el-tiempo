import React, { useState, useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

/**
 * Componente Aislado para Prueba de Fuego
 *
 * Puedes importar y renderizar este componente en App.jsx o cualquier Layout
 * sin alterar el flujo principal.
 * 
 * Ejemplo de uso en cualquier parte:
 * <TestFlujoCxcAlert />
 * 
 * NOTA: Para activarlo visualmente, simplemente puedes despachar el evento global:
 * window.dispatchEvent(new CustomEvent('prueba-fuego-exito', { detail: { mensaje: "¡Prueba de Cuentas por Cobrar finalizada!" } }))
 */
export default function TestFlujoCxcAlert() {
  const [visible, setVisible] = useState(false);
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    // Escucha un evento global para no acoplarse con ninguna página específica
    const handlePruebaExito = (e) => {
      setMensaje(e.detail?.mensaje || "🔥 ¡Prueba de fuego completada con éxito!");
      setVisible(true);

      // Auto-ocultar después de 5 segundos
      setTimeout(() => {
        setVisible(false);
      }, 5000);
    };

    window.addEventListener('prueba-fuego-exito', handlePruebaExito);
    return () => window.removeEventListener('prueba-fuego-exito', handlePruebaExito);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-emerald-950 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl shadow-emerald-900/20 max-w-sm flex items-start gap-4 backdrop-blur-xl">
        <div className="p-2 bg-emerald-500/20 rounded-xl flex-shrink-0">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
        </div>
        
        <div className="flex-1 min-w-0 pt-0.5">
          <h4 className="text-sm font-bold text-emerald-50">Prueba de Sistema Aprobada</h4>
          <p className="text-xs text-emerald-300/80 mt-1 leading-relaxed">
            {mensaje}
          </p>
          <div className="mt-2 flex gap-2 text-[10px] font-semibold text-emerald-400/60 uppercase tracking-wider">
            <span>✅ Divisas (Zelle)</span>
            <span>•</span>
            <span>✅ Banco Bolívares</span>
          </div>
        </div>

        <button 
          onClick={() => setVisible(false)}
          className="text-emerald-500 hover:text-emerald-300 transition-colors p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Toaster } from "sonner";
import RoleProtectedRoute from "@/components/RoleProtectedRoute";

// --- ERROR BOUNDARY GLOBAL PARA EVITAR PANTALLA EN BLANCO ---
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Runtime error:", error, info);
  }
  limpiarSesion = () => {
    try {
      localStorage.removeItem('empleado_sesion');
    } catch {}
    window.location.href = '/';
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ fontSize: 20, marginBottom: 12 }}>Se produjo un error en la aplicación</h1>
          <p style={{ color: '#475569', marginBottom: 12 }}>
            Si estabas autenticado, la sesión pudo quedar en un estado inválido.
          </p>
          <button onClick={this.limpiarSesion} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#ef4444', color: 'white', border: 0, borderRadius: 6,
            padding: '8px 12px', cursor: 'pointer'
          }}>Limpiar sesión y volver al inicio</button>
          <pre style={{
            marginTop: 16, background: '#f8fafc', color: '#0f172a',
            padding: 12, borderRadius: 6, overflow: 'auto', maxHeight: 300
          }}>{String(this.state.error?.stack || this.state.error)}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// --- IMPORTACIÓN DE PÁGINAS ---
import Acceso from "./pages/Acceso";
import Dashboard from "./pages/Dashboard";
import Platos from "./pages/Platos";
import Ventas from "./pages/Ventas";
import Comandas from "./pages/Comandas";
import ProcesarVenta from "./pages/ProcesarVenta";
import Ingredientes from "./pages/Ingredientes";
import Gastos from "./pages/Gastos";

import Adelantos from './pages/Adelantos';
import Alertas from './pages/Alertas';
import CategoriasGastos from './pages/CategoriasGastos';
import Cocina from './pages/Cocina';
import ComprasIngredientes from './pages/ComprasIngredientes';
import ConfiguracionRetencion from './pages/ConfiguracionRetencion';
import CuentasPorCobrar from './pages/CuentasPorCobrar';
import EstadoCuentaDetalle from './pages/EstadoCuentaDetalle';
import EstadosCuenta from './pages/EstadosCuenta';
import GestionTasas from './pages/GestionTasas';
import Home from './pages/Home';
import ImprimirComanda from './pages/ImprimirComanda';
import RecetasPrimarias from './pages/RecetasPrimarias';
import RecetasSecundarias from './pages/RecetasSecundarias';
import ReporteDetalle from './pages/ReporteDetalle';
import ReporteEntradaSalidaDetalle from './pages/ReporteEntradaSalidaDetalle';
import ReporteMensual from './pages/ReporteMensual';
import Reportes from './pages/Reportes';
import ReportesDiarios from './pages/ReportesDiarios';
import ReportesEntradaSalida from './pages/ReportesEntradaSalida';
import ReportesMetodosPago from './pages/ReportesMetodosPago';
import Personal from './pages/Personal';
import CalculadoraTasas from './components/CalculadoraTasas';

// --- COMPONENTE DE DISEÑO PROTEGIDO ---
const ProtectedLayout = ({ children }) => {
  // Verificamos si hay un usuario en el LocalStorage
  const isAuthenticated = localStorage.getItem("empleado_sesion");

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50/50">
        {/* Tu nuevo AppSidebar arreglado */}
        <AppSidebar />
        
        <SidebarInset className="flex flex-col flex-1">
          {/* Barra Superior (Header) */}
          <header className="flex h-16 items-center gap-4 border-b bg-white/80 backdrop-blur-md px-6 sticky top-0 z-10">
            <SidebarTrigger className="-ml-1" />
            <div className="h-4 w-[1px] bg-slate-200" />
            <div className="flex-1">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
                Sistema de Gestión - Stop Time Sushi
              </h2>
            </div>
          </header>
          
          {/* Contenido de la página */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </SidebarInset>
        
        {/* Calculadora de Tasas global como botón flotante */}
        <CalculadoraTasas />
      </div>
    </SidebarProvider>
  );
};

// --- COMPONENTE PRINCIPAL ---
function App() {
  return (
    <ErrorBoundary>
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      {/* Notificaciones globales */}
      <Toaster position="top-right" richColors closeButton />
      
      <Routes>
        {/* Ruta Pública */}
        <Route path="/" element={<Acceso />} />

        {/* Rutas Privadas (Protegidas por rol) */}
        <Route path="/dashboard" element={<RoleProtectedRoute pageName="Dashboard"><ProtectedLayout><Dashboard /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/ventas" element={<RoleProtectedRoute pageName="Dashboard"><ProtectedLayout><Ventas /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/comandas" element={<RoleProtectedRoute pageName="Comandas"><ProtectedLayout><Comandas /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/procesarventa" element={<RoleProtectedRoute pageName="ProcesarVenta"><ProtectedLayout><ProcesarVenta /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/platos" element={<RoleProtectedRoute pageName="Platos"><ProtectedLayout><Platos /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/ingredientes" element={<RoleProtectedRoute pageName="Ingredientes"><ProtectedLayout><Ingredientes /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/gastos" element={<RoleProtectedRoute pageName="Gastos"><ProtectedLayout><Gastos /></ProtectedLayout></RoleProtectedRoute>} />

        <Route path="/adelantos" element={<RoleProtectedRoute pageName="Adelantos"><ProtectedLayout><Adelantos /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/recetas-primarias" element={<RoleProtectedRoute pageName="RecetasPrimarias"><ProtectedLayout><RecetasPrimarias /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/recetas-secundarias" element={<RoleProtectedRoute pageName="RecetasSecundarias"><ProtectedLayout><RecetasSecundarias /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/reportes" element={<RoleProtectedRoute pageName="Reportes"><ProtectedLayout><Reportes /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/reportes-diarios" element={<RoleProtectedRoute pageName="ReportesDiarios"><ProtectedLayout><ReportesDiarios /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/reportes-mensuales" element={<RoleProtectedRoute pageName="ReporteMensual"><ProtectedLayout><ReporteMensual /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/reportes-entrada-salida" element={<RoleProtectedRoute pageName="Reportes"><ProtectedLayout><ReportesEntradaSalida /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/reportes-metodos-pago" element={<RoleProtectedRoute pageName="Reportes"><ProtectedLayout><ReportesMetodosPago /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/cuentas-por-cobrar" element={<RoleProtectedRoute pageName="CuentasPorCobrar"><ProtectedLayout><CuentasPorCobrar /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/categorias-gastos" element={<RoleProtectedRoute pageName="CategoriasGastos"><ProtectedLayout><CategoriasGastos /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/compras-ingredientes" element={<RoleProtectedRoute pageName="ComprasIngredientes"><ProtectedLayout><ComprasIngredientes /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/cocina" element={<RoleProtectedRoute pageName="Cocina"><ProtectedLayout><Cocina /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/alertas" element={<RoleProtectedRoute pageName="Alertas"><ProtectedLayout><Alertas /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/gestion-tasas" element={<RoleProtectedRoute pageName="GestionTasas"><ProtectedLayout><GestionTasas /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/configuracion-retencion" element={<RoleProtectedRoute pageName="ConfiguracionRetencion"><ProtectedLayout><ConfiguracionRetencion /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/personal" element={<RoleProtectedRoute pageName="Personal"><ProtectedLayout><Personal /></ProtectedLayout></RoleProtectedRoute>} />
        {/* Rutas sin sidebar */}
        <Route path="/estado-cuenta-detalle" element={<RoleProtectedRoute pageName="EstadoCuentaDetalle"><ProtectedLayout><EstadoCuentaDetalle /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/estados-cuenta" element={<RoleProtectedRoute pageName="EstadosCuenta"><ProtectedLayout><EstadosCuenta /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/home" element={<RoleProtectedRoute pageName="Home"><ProtectedLayout><Home /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/imprimir-comanda" element={<RoleProtectedRoute pageName="Comandas"><ProtectedLayout><ImprimirComanda /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/reporte-detalle" element={<RoleProtectedRoute pageName="Reportes"><ProtectedLayout><ReporteDetalle /></ProtectedLayout></RoleProtectedRoute>} />
        <Route path="/reporte-entrada-salida-detalle" element={<RoleProtectedRoute pageName="Reportes"><ProtectedLayout><ReporteEntradaSalidaDetalle /></ProtectedLayout></RoleProtectedRoute>} />

        {/* Si no encuentra la ruta, vuelve al acceso */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
    </ErrorBoundary>
  );
}

export default App;
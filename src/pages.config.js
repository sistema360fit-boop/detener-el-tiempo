/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 */
import Acceso from './pages/Acceso';
import Adelantos from './pages/Adelantos';
import Alertas from './pages/Alertas';
import CategoriasGastos from './pages/CategoriasGastos';
import Cocina from './pages/Cocina';
import Comandas from './pages/Comandas';
import ComprasIngredientes from './pages/ComprasIngredientes';
import ConfiguracionRetencion from './pages/ConfiguracionRetencion';
import CuentasPorCobrar from './pages/CuentasPorCobrar';
import Dashboard from './pages/Dashboard';

import EstadoCuentaDetalle from './pages/EstadoCuentaDetalle';
import EstadosCuenta from './pages/EstadosCuenta';
import Gastos from './pages/Gastos';
import GestionTasas from './pages/GestionTasas';
import Home from './pages/Home';
import ImprimirComanda from './pages/ImprimirComanda';
import Ingredientes from './pages/Ingredientes';
import Personal from './pages/Personal';
import Nomina from './pages/Nomina';
import Platos from './pages/Platos';
import ProcesarVenta from './pages/ProcesarVenta';
import RecetasPrimarias from './pages/RecetasPrimarias';
import RecetasSecundarias from './pages/RecetasSecundarias';
import ReporteDetalle from './pages/ReporteDetalle';
import ReporteEntradaSalidaDetalle from './pages/ReporteEntradaSalidaDetalle';
import ReporteMensual from './pages/ReporteMensual';
import Reportes from './pages/Reportes';
import ReportesDiarios from './pages/ReportesDiarios';
import ReportesEntradaSalida from './pages/ReportesEntradaSalida';
import ReportesMetodosPago from './pages/ReportesMetodosPago';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Acceso": Acceso,
    "Adelantos": Adelantos,
    "Alertas": Alertas,
    "CategoriasGastos": CategoriasGastos,
    "Cocina": Cocina,
    "Comandas": Comandas,
    "ComprasIngredientes": ComprasIngredientes,
    "ConfiguracionRetencion": ConfiguracionRetencion,
    "CuentasPorCobrar": CuentasPorCobrar,
    "Dashboard": Dashboard,

    "EstadoCuentaDetalle": EstadoCuentaDetalle,
    "EstadosCuenta": EstadosCuenta,
    "Gastos": Gastos,
    "GestionTasas": GestionTasas,
    "Home": Home,
    "ImprimirComanda": ImprimirComanda,
    "Ingredientes": Ingredientes,
    "Personal": Personal,
    "Nomina": Nomina,
    "Platos": Platos,
    "ProcesarVenta": ProcesarVenta,
    "RecetasPrimarias": RecetasPrimarias,
    "RecetasSecundarias": RecetasSecundarias,
    "ReporteDetalle": ReporteDetalle,
    "ReporteEntradaSalidaDetalle": ReporteEntradaSalidaDetalle,
    "ReporteMensual": ReporteMensual,
    "Reportes": Reportes,
    "ReportesDiarios": ReportesDiarios,
    "ReportesEntradaSalida": ReportesEntradaSalida,
    "ReportesMetodosPago": ReportesMetodosPago,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};

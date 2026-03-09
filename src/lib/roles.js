/**
 * Sistema de Control de Roles y Permisos
 * 
 * Definiciones de roles y páginas permitidas para cada uno.
 * Solo el administrador tiene acceso completo.
 */

// Página designada por cada rol (a donde será redirigido después del login)
export const ROLE_DEFAULT_PAGE = {
  administrador: 'Dashboard',
  mesero: 'Comandas',
  cocinero: 'Cocina',
  cajero: 'ProcesarVenta'
};

// Permisos por página - define qué roles pueden acceder a cada página
export const PAGE_PERMISSIONS = {
  // Páginas principales
  'Dashboard': ['administrador'],
  'Comandas': ['mesero', 'administrador'],
  'Cocina': ['cocinero', 'administrador'],
  'ProcesarVenta': ['cajero', 'administrador'],
  
  // Gestión (solo administrador)
  'Ingredientes': ['administrador'],
  'Platos': ['administrador'],
  'RecetasPrimarias': ['administrador'],
  'RecetasSecundarias': ['administrador'],
  'Empleados': ['administrador'],
  'Gastos': ['administrador'],
  'Adelantos': ['administrador'],
  'ComprasIngredientes': ['administrador'],
  
  // Reportes (solo administrador)
  'Reportes': ['administrador'],
  'ReportesDiarios': ['administrador'],
  'ReporteMensual': ['administrador'],
  'ReportePlatosTop': ['administrador'],
  'ReporteRentabilidad': ['administrador'],
  'ReporteVentas': ['administrador'],
  'ReporteDetalle': ['administrador'],
  'ReporteEntradaSalidaDetalle': ['administrador'],
  
  // Finanzas (solo administrador)
  'EstadosCuenta': ['administrador'],
  'EstadoCuentaDetalle': ['administrador'],
  'CuentasPorCobrar': ['administrador'],
  'PagoCuentaPorCobrar': ['administrador'],
  
  // Alertas y configuración (solo administrador)
  'Alertas': ['administrador'],
  'GestionTasas': ['administrador'],
  'CategoriasGastos': ['administrador'],
  'ConfiguracionRetencion': ['administrador'],
  'AdminReset': ['administrador'],
  
  // Otras páginas
  'Home': ['administrador'],
  'Acceso': ['administrador', 'mesero', 'cocinero', 'cajero']
};

// Función para obtener la página designada según el rol
export function getDefaultPage(rol) {
  return ROLE_DEFAULT_PAGE[rol?.toLowerCase()] || 'Dashboard';
}

// Función para verificar si un rol puede acceder a una página
export function canAccessPage(pageName, rol) {
  const allowedRoles = PAGE_PERMISSIONS[pageName];
  if (!allowedRoles) {
    // Si la página no está definida, solo el administrador puede acceder
    return rol?.toLowerCase() === 'administrador';
  }
  return allowedRoles.includes(rol?.toLowerCase());
}

// Función para obtener el usuario actual de la sesión
export function getCurrentUser() {
  try {
    const session = localStorage.getItem('empleado_sesion');
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
}

// Función para verificar si el usuario actual es administrador
export function isAdmin() {
  const user = getCurrentUser();
  return user?.rol?.toLowerCase() === 'administrador';
}

// Función para verificar si el usuario actual tiene acceso a una página
export function canAccess(pageName) {
  const user = getCurrentUser();
  if (!user) return false;
  return canAccessPage(pageName, user.rol);
}

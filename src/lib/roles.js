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
  cajero: 'Reportes'
};

// Permisos por página - define qué roles pueden acceder a cada página
export const PAGE_PERMISSIONS = {
  // Páginas principales
  'Dashboard': ['administrador'],
  'Comandas': ['administrador', 'mesero', 'cajero'],
  'Cocina': ['administrador', 'cocinero'],
  'ProcesarVenta': ['administrador', 'cajero', 'mesero'],
  
  // Reportes (solo administrador)
  'Reportes': ['administrador'],
  'ReportesDiarios': ['administrador'],
  'ReporteMensual': ['administrador'],
  'ReportePlatosTop': ['administrador'],
  'ReporteRentabilidad': ['administrador'],
  'ReporteVentas': ['administrador'],
  'ReporteDetalle': ['administrador'],
  'ReporteEntradaSalidaDetalle': ['administrador'],
  
  // Gestión (solo administrador)
  'Ingredientes': ['administrador'],
  'Platos': ['administrador'],
  'RecetasPrimarias': ['administrador'],
  'RecetasSecundarias': ['administrador'],
  'Personal': ['administrador'],
  'Gastos': ['administrador'],
  'Adelantos': ['administrador'],
  'ComprasIngredientes': ['administrador'],
  
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
  'Home': ['administrador', 'mesero', 'cocinero', 'cajero'],
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
  
  const rolLower = rol?.toLowerCase();
  const hasAccess = allowedRoles.includes(rolLower);
  
  return hasAccess;
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

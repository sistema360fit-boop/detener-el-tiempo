-- =====================================================
-- SCRIPT SQL PARA CREAR TODAS LAS TABLAS DEL SISTEMA
-- Base de datos: SQLite
-- Generado desde: prisma/schema.prisma
-- =====================================================

-- Habilitar claves foráneas en SQLite
PRAGMA foreign_keys = ON;

-- =====================================================
-- TABLA: Usuario
-- Almacena los usuarios del sistema (administradores, empleados)
-- =====================================================
CREATE TABLE IF NOT EXISTS Usuario (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    nombre TEXT NOT NULL,
    rol TEXT DEFAULT 'administrador',
    activo INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- TABLA: Empleado
-- Almacena información de los empleados del restaurante
-- =====================================================
CREATE TABLE IF NOT EXISTS Empleado (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    usuario TEXT,  -- Username para login
    rol TEXT,
    activo INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- TABLA: SesionUsuario
-- Almacena las sesiones activas de los usuarios
-- =====================================================
CREATE TABLE IF NOT EXISTS SesionUsuario (
    id TEXT PRIMARY KEY,
    usuarioId TEXT,
    token TEXT,
    creadoEn TEXT DEFAULT (datetime('now')),
    expiracion TEXT,
    FOREIGN KEY (usuarioId) REFERENCES Usuario(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLA: Ingrediente
-- Almacena los ingredientes del inventario
-- =====================================================
CREATE TABLE IF NOT EXISTS Ingrediente (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    cantidad_disponible REAL DEFAULT 0,
    cantidad_minima REAL DEFAULT 0,
    unidad_medida TEXT,
    unidad_receta TEXT,
    factor_conversion REAL DEFAULT 1,
    costo_por_unidad REAL,
    createdAt TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- TABLA: HistorialCostoIngrediente
-- Registra cambios en el costo de los ingredientes
-- =====================================================
CREATE TABLE IF NOT EXISTS HistorialCostoIngrediente (
    id TEXT PRIMARY KEY,
    ingredienteId TEXT NOT NULL,
    costoAnterior REAL,
    costoNuevo REAL,
    fecha TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (ingredienteId) REFERENCES Ingrediente(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLA: AlertaStock
-- Almacena alertas de stock bajo
-- =====================================================
CREATE TABLE IF NOT EXISTS AlertaStock (
    id TEXT PRIMARY KEY,
    ingredienteId TEXT,
    ingredienteNombre TEXT,
    cantidad_actual REAL,
    cantidad_minima REAL,
    creadoEn TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (ingredienteId) REFERENCES Ingrediente(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLA: Plato
-- Almacena los platos del menú
-- =====================================================
CREATE TABLE IF NOT EXISTS Plato (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    activo INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- TABLA: Receta
-- Relaciona platos con ingredientes (receta básica)
-- =====================================================
CREATE TABLE IF NOT EXISTS Receta (
    id TEXT PRIMARY KEY,
    platoId TEXT NOT NULL,
    ingredienteId TEXT NOT NULL,
    ingredienteNombre TEXT,
    tipo TEXT DEFAULT 'ingrediente',
    cantidad_requerida REAL NOT NULL,
    costo_ingrediente REAL DEFAULT 0,
    FOREIGN KEY (platoId) REFERENCES Plato(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredienteId) REFERENCES Ingrediente(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLA: RecetaPrimaria
-- Almacena recetas primarias (preparaciones base)
-- =====================================================
CREATE TABLE IF NOT EXISTS RecetaPrimaria (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    unidadMedida TEXT,  -- kg, g, l, ml, unidad, porcion
    cantidadResultante REAL DEFAULT 1,
    costoTotal REAL DEFAULT 0,
    costoPorUnidad REAL DEFAULT 0,
    tiempoPreparacion INTEGER,
    instrucciones TEXT,
    activa INTEGER DEFAULT 1
);

-- =====================================================
-- TABLA: DetalleRecetaPrimaria
-- Ingredientes/componentes de una receta primaria
-- =====================================================
CREATE TABLE IF NOT EXISTS DetalleRecetaPrimaria (
    id TEXT PRIMARY KEY,
    recetaPrimariaId TEXT NOT NULL,
    ingredienteId TEXT,
    ingredienteNombre TEXT,
    tipoElemento TEXT,  -- ingrediente, receta_primaria
    cantidad REAL NOT NULL,
    unidadMedida TEXT,
    costoIngrediente REAL DEFAULT 0,
    FOREIGN KEY (recetaPrimariaId) REFERENCES RecetaPrimaria(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLA: RecetaSecundaria
-- Almacena recetas secundarias (preparaciones compuestas)
-- =====================================================
CREATE TABLE IF NOT EXISTS RecetaSecundaria (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    unidadMedida TEXT,  -- kg, g, l, ml, unidad, porcion
    cantidadResultante REAL DEFAULT 1,
    costoTotal REAL DEFAULT 0,
    costoPorUnidad REAL DEFAULT 0,
    tiempoPreparacion INTEGER,
    instrucciones TEXT,
    activa INTEGER DEFAULT 1
);

-- =====================================================
-- TABLA: DetalleRecetaSecundaria
-- Ingredientes/componentes de una receta secundaria
-- =====================================================
CREATE TABLE IF NOT EXISTS DetalleRecetaSecundaria (
    id TEXT PRIMARY KEY,
    recetaSecundariaId TEXT NOT NULL,
    elementoId TEXT,
    elementoNombre TEXT,
    tipoElemento TEXT,  -- ingrediente, receta_primaria
    cantidad REAL NOT NULL,
    unidadMedida TEXT,
    costoElemento REAL DEFAULT 0,
    FOREIGN KEY (recetaSecundariaId) REFERENCES RecetaSecundaria(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLA: Comanda
-- Almacena las comandas del restaurante
-- =====================================================
CREATE TABLE IF NOT EXISTS Comanda (
    id TEXT PRIMARY KEY,
    numero_comanda TEXT NOT NULL,
    mesa_numero TEXT,
    mesero_nombre TEXT,
    fecha_apertura TEXT DEFAULT (datetime('now')),
    fecha_cierre TEXT,
    estado TEXT DEFAULT 'abierta',
    total_comanda REAL DEFAULT 0
);

-- =====================================================
-- TABLA: DetalleComanda
-- Detalles de cada comanda (platos pedidos)
-- =====================================================
CREATE TABLE IF NOT EXISTS DetalleComanda (
    id TEXT PRIMARY KEY,
    comandaId TEXT NOT NULL,
    platoId TEXT,
    platoNombre TEXT,
    cantidad REAL NOT NULL,
    precio REAL NOT NULL,
    FOREIGN KEY (comandaId) REFERENCES Comanda(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLA: Venta
-- Almacena las ventas realizadas
-- =====================================================
CREATE TABLE IF NOT EXISTS Venta (
    id TEXT PRIMARY KEY,
    fecha_hora TEXT DEFAULT (datetime('now')),
    total_venta REAL NOT NULL,
    metodo_pago TEXT,
    total_cop REAL,
    total_ves REAL,
    monto_original REAL,
    moneda_original TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- TABLA: DetalleVenta
-- Detalles de cada venta (platos vendidos)
-- =====================================================
CREATE TABLE IF NOT EXISTS DetalleVenta (
    id TEXT PRIMARY KEY,
    ventaId TEXT NOT NULL,
    platoId TEXT,
    platoNombre TEXT,
    cantidad REAL NOT NULL,
    precioUnitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (ventaId) REFERENCES Venta(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLA: PagoMixto
-- Registra pagos con múltiples métodos de pago
-- =====================================================
CREATE TABLE IF NOT EXISTS PagoMixto (
    id TEXT PRIMARY KEY,
    ventaId TEXT,
    monto REAL NOT NULL,
    metodo TEXT,
    fecha TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (ventaId) REFERENCES Venta(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLA: Gasto
-- Almacena los gastos del restaurante
-- =====================================================
CREATE TABLE IF NOT EXISTS Gasto (
    id TEXT PRIMARY KEY,
    categoriaId TEXT,
    categoriaNombre TEXT,
    monto REAL NOT NULL,
    descripcion TEXT,
    fecha TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- TABLA: CategoriaGasto
-- Categorías para clasificar los gastos
-- =====================================================
CREATE TABLE IF NOT EXISTS CategoriaGasto (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- TABLA: Adelanto
-- Registra adelantos de sueldo a empleados
-- =====================================================
CREATE TABLE IF NOT EXISTS Adelanto (
    id TEXT PRIMARY KEY,
    empleadoId TEXT,
    empleado TEXT,
    monto REAL NOT NULL,
    fecha TEXT DEFAULT (datetime('now')),
    descripcion TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (empleadoId) REFERENCES Empleado(id) ON DELETE SET NULL
);

-- =====================================================
-- TABLA: Compra
-- Registra compras de ingredientes
-- =====================================================
CREATE TABLE IF NOT EXISTS Compra (
    id TEXT PRIMARY KEY,
    proveedor TEXT,
    total REAL NOT NULL,
    fecha TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- TABLA: CuentaPorCobrar
-- Registra cuentas por cobrar
-- =====================================================
CREATE TABLE IF NOT EXISTS CuentaPorCobrar (
    id TEXT PRIMARY KEY,
    clienteNombre TEXT,
    monto REAL NOT NULL,
    estado TEXT DEFAULT 'pendiente',
    vencimiento TEXT
);

-- =====================================================
-- TABLA: PagoCuentaPorCobrar
-- Registra pagos de cuentas por cobrar
-- =====================================================
CREATE TABLE IF NOT EXISTS PagoCuentaPorCobrar (
    id TEXT PRIMARY KEY,
    cuentaId TEXT NOT NULL,
    monto REAL NOT NULL,
    fecha TEXT DEFAULT (datetime('now')),
    metodo TEXT,
    FOREIGN KEY (cuentaId) REFERENCES CuentaPorCobrar(id) ON DELETE CASCADE
);

-- =====================================================
-- TABLA: TasaCambio
-- Almacena las tasas de cambio entre monedas
-- =====================================================
CREATE TABLE IF NOT EXISTS TasaCambio (
    id TEXT PRIMARY KEY,
    monedaOrigen TEXT NOT NULL,
    monedaDestino TEXT NOT NULL,
    tasa REAL NOT NULL,
    fecha TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- TABLA: LogLimpieza
-- Registra actividades de limpieza
-- =====================================================
CREATE TABLE IF NOT EXISTS LogLimpieza (
    id TEXT PRIMARY KEY,
    ubicacion TEXT,
    realizadoPor TEXT,
    fecha TEXT DEFAULT (datetime('now')),
    notas TEXT
);

-- =====================================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- =====================================================

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_venta_fecha ON Venta(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_comanda_estado ON Comanda(estado);
CREATE INDEX IF NOT EXISTS idx_comanda_fecha ON Comanda(fecha_apertura);
CREATE INDEX IF NOT EXISTS idx_gasto_fecha ON Gasto(fecha);
CREATE INDEX IF NOT EXISTS idx_adelanto_empleado ON Adelanto(empleadoId);
CREATE INDEX IF NOT EXISTS idx_receta_plato ON Receta(platoId);
CREATE INDEX IF NOT EXISTS idx_detalle_venta ON DetalleVenta(ventaId);
CREATE INDEX IF NOT EXISTS idx_detalle_comanda ON DetalleComanda(comandaId);
CREATE INDEX IF NOT EXISTS idx_sesion_usuario ON SesionUsuario(usuarioId);

-- =====================================================
-- DATOS INICIALES (SEED)
-- =====================================================

-- NOTA: El usuario administrador se crea mediante el script seed.js
-- que genera el hash bcrypt dinámicamente desde la variable de entorno ADMIN_PASSWORD

-- Insertar empleado administrador por defecto
INSERT OR IGNORE INTO Empleado (id, nombre, usuario, rol, activo)
VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Administrador',
    'admin',
    'administrador',
    1
);

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

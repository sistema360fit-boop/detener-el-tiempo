-- =====================================================
-- SCRIPT SQL PARA TABLAS DE EMPLEADOS Y ADELANTOS
-- Sistema de Gestión de Restaurante
-- =====================================================
-- Habilitar claves foráneas en SQLite
PRAGMA foreign_keys = ON;
-- =====================================================
-- TABLA: Empleado
-- Almacena información de los empleados del restaurante
-- Relaciones: Adelanto (1:N), Usuario (opcional)
-- =====================================================
CREATE TABLE IF NOT EXISTS Empleado (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    usuario TEXT,  -- Username para login (puede ser NULL si no tiene acceso al sistema)
    rol TEXT,  -- administrador, mesero, cocinero, cajero
    activo INTEGER DEFAULT 1,  -- 1=activo, 0=inactivo
    createdAt TEXT DEFAULT (datetime('now'))
);

-- Índice para búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_empleado_usuario ON Empleado(usuario);
CREATE INDEX IF NOT EXISTS idx_empleado_rol ON Empleado(rol);

-- =====================================================
-- TABLA: Adelanto
-- Registra adelantos de sueldo a empleados
-- Relaciones: Empleado (N:1)
-- =====================================================
CREATE TABLE IF NOT EXISTS Adelanto (
    id TEXT PRIMARY KEY,
    empleadoId TEXT,  -- FK a Empleado (puede ser NULL si el empleado fue eliminado)
    empleado TEXT,  -- Nombre del empleado (denormalizado para histórico)
    monto REAL NOT NULL,
    fecha TEXT DEFAULT (datetime('now')),
    descripcion TEXT,  -- Motivo o descripción del adelanto
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (empleadoId) REFERENCES Empleado(id) ON DELETE SET NULL
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_adelanto_empleado ON Adelanto(empleadoId);
CREATE INDEX IF NOT EXISTS idx_adelanto_fecha ON Adelanto(fecha);

-- =====================================================
-- TABLA: Usuario
-- Almacena usuarios del sistema (para autenticación)
-- Relaciones: SesionUsuario (1:N)
-- =====================================================
CREATE TABLE IF NOT EXISTS Usuario (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,  -- Hash bcrypt
    nombre TEXT NOT NULL,
    rol TEXT DEFAULT 'administrador',  -- administrador, mesero, cocinero, cajero
    activo INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now'))
);

-- Índice para login
CREATE INDEX IF NOT EXISTS idx_usuario_email ON Usuario(email);

-- =====================================================
-- TABLA: SesionUsuario
-- Almacena sesiones activas de usuarios
-- Relaciones: Usuario (N:1)
-- =====================================================
CREATE TABLE IF NOT EXISTS SesionUsuario (
    id TEXT PRIMARY KEY,
    usuarioId TEXT,
    token TEXT,
    creadoEn TEXT DEFAULT (datetime('now')),
    expiracion TEXT,
    FOREIGN KEY (usuarioId) REFERENCES Usuario(id) ON DELETE SET NULL
);

-- Índice para buscar sesiones por usuario
CREATE INDEX IF NOT EXISTS idx_sesion_usuario ON SesionUsuario(usuarioId);

-- =====================================================
-- TABLA: Gasto
-- Almacena los gastos del restaurante
-- Relaciones: CategoriaGasto (N:1)
-- =====================================================
CREATE TABLE IF NOT EXISTS Gasto (
    id TEXT PRIMARY KEY,
    categoriaId TEXT,  -- FK a CategoriaGasto
    categoriaNombre TEXT,  -- Nombre de categoría (denormalizado)
    monto REAL NOT NULL,
    descripcion TEXT,
    fecha TEXT DEFAULT (datetime('now'))
);

-- Índice para reportes por fecha
CREATE INDEX IF NOT EXISTS idx_gasto_fecha ON Gasto(fecha);
CREATE INDEX IF NOT EXISTS idx_gasto_categoria ON Gasto(categoriaId);

-- =====================================================
-- TABLA: CategoriaGasto
-- Categorías para clasificar los gastos
-- Relaciones: Gasto (1:N)
-- =====================================================
CREATE TABLE IF NOT EXISTS CategoriaGasto (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
);

-- =====================================================
-- TABLA: Venta
-- Almacena las ventas realizadas
-- Relaciones: DetalleVenta (1:N), PagoMixto (1:N)
-- =====================================================
CREATE TABLE IF NOT EXISTS Venta (
    id TEXT PRIMARY KEY,
    fecha_hora TEXT DEFAULT (datetime('now')),
    total_venta REAL NOT NULL,
    metodo_pago TEXT,  -- efectivo, tarjeta, transferencia, mixto
    total_cop REAL,  -- Total en pesos colombianos
    total_ves REAL,  -- Total en bolívares
    monto_original REAL,
    moneda_original TEXT,  -- COP, VES
    createdAt TEXT DEFAULT (datetime('now'))
);

-- Índices para reportes
CREATE INDEX IF NOT EXISTS idx_venta_fecha ON Venta(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_venta_metodo ON Venta(metodo_pago);

-- =====================================================
-- TABLA: DetalleVenta
-- Detalles de cada venta (platos vendidos)
-- Relaciones: Venta (N:1)
-- =====================================================
CREATE TABLE IF NOT EXISTS DetalleVenta (
    id TEXT PRIMARY KEY,
    ventaId TEXT NOT NULL,
    platoId TEXT,
    platoNombre TEXT,  -- Nombre del plato (denormalizado)
    cantidad REAL NOT NULL,
    precioUnitario REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (ventaId) REFERENCES Venta(id) ON DELETE CASCADE
);

-- Índice para buscar detalles por venta
CREATE INDEX IF NOT EXISTS idx_detalle_venta ON DetalleVenta(ventaId);

-- =====================================================
-- TABLA: Comanda
-- Almacena las comandas del restaurante
-- Relaciones: DetalleComanda (1:N)
-- =====================================================
CREATE TABLE IF NOT EXISTS Comanda (
    id TEXT PRIMARY KEY,
    numero_comanda TEXT NOT NULL,
    mesa_numero TEXT,
    mesero_nombre TEXT,
    fecha_apertura TEXT DEFAULT (datetime('now')),
    fecha_cierre TEXT,
    estado TEXT DEFAULT 'abierta',  -- abierta, cerrada, cancelada
    total_comanda REAL DEFAULT 0
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_comanda_estado ON Comanda(estado);
CREATE INDEX IF NOT EXISTS idx_comanda_fecha ON Comanda(fecha_apertura);
CREATE INDEX IF NOT EXISTS idx_comanda_mesa ON Comanda(mesa_numero);

-- =====================================================
-- TABLA: DetalleComanda
-- Detalles de cada comanda (platos pedidos)
-- Relaciones: Comanda (N:1)
-- =====================================================
CREATE TABLE IF NOT EXISTS DetalleComanda (
    id TEXT PRIMARY KEY,
    comandaId TEXT NOT NULL,
    platoId TEXT,
    platoNombre TEXT,  -- Nombre del plato (denormalizado)
    cantidad REAL NOT NULL,
    precio REAL NOT NULL,
    FOREIGN KEY (comandaId) REFERENCES Comanda(id) ON DELETE CASCADE
);

-- Índice para buscar detalles por comanda
CREATE INDEX IF NOT EXISTS idx_detalle_comanda ON DetalleComanda(comandaId);

-- =====================================================
-- TABLA: Ingrediente
-- Almacena los ingredientes del inventario
-- Relaciones: Receta (1:N), HistorialCostoIngrediente (1:N), AlertaStock (1:N)
-- =====================================================
CREATE TABLE IF NOT EXISTS Ingrediente (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    cantidad_disponible REAL DEFAULT 0,
    cantidad_minima REAL DEFAULT 0,  -- Para alertas de stock bajo
    unidad_medida TEXT,  -- kg, g, l, ml, unidad
    unidad_receta TEXT,  -- Unidad usada en recetas
    factor_conversion REAL DEFAULT 1,  -- Factor de conversión entre unidades
    costo_por_unidad REAL,
    createdAt TEXT DEFAULT (datetime('now'))
);

-- Índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_ingrediente_nombre ON Ingrediente(nombre);

-- =====================================================
-- TABLA: HistorialCostoIngrediente
-- Registra cambios en el costo de los ingredientes
-- Relaciones: Ingrediente (N:1)
-- =====================================================
CREATE TABLE IF NOT EXISTS HistorialCostoIngrediente (
    id TEXT PRIMARY KEY,
    ingredienteId TEXT NOT NULL,
    costoAnterior REAL,
    costoNuevo REAL,
    fecha TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (ingredienteId) REFERENCES Ingrediente(id) ON DELETE CASCADE
);

-- Índice para buscar historial por ingrediente
CREATE INDEX IF NOT EXISTS idx_historial_ingrediente ON HistorialCostoIngrediente(ingredienteId);

-- =====================================================
-- TABLA: AlertaStock
-- Almacena alertas de stock bajo
-- Relaciones: Ingrediente (N:1)
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
-- Relaciones: Receta (1:N)
-- =====================================================
CREATE TABLE IF NOT EXISTS Plato (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio REAL NOT NULL,
    activo INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now'))
);

-- Índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_plato_nombre ON Plato(nombre);

-- =====================================================
-- TABLA: Receta
-- Relaciona platos con ingredientes (receta básica)
-- Relaciones: Plato (N:1), Ingrediente (N:1)
-- =====================================================
CREATE TABLE IF NOT EXISTS Receta (
    id TEXT PRIMARY KEY,
    platoId TEXT NOT NULL,
    ingredienteId TEXT NOT NULL,
    ingredienteNombre TEXT,
    cantidad_requerida REAL NOT NULL,
    costo_ingrediente REAL DEFAULT 0,
    FOREIGN KEY (platoId) REFERENCES Plato(id) ON DELETE CASCADE,
    FOREIGN KEY (ingredienteId) REFERENCES Ingrediente(id) ON DELETE CASCADE
);

-- Índices para búsquedas
CREATE INDEX IF NOT EXISTS idx_receta_plato ON Receta(platoId);
CREATE INDEX IF NOT EXISTS idx_receta_ingrediente ON Receta(ingredienteId);

-- =====================================================
-- TABLA: RecetaPrimaria
-- Almacena recetas primarias (preparaciones base)
-- Relaciones: DetalleRecetaPrimaria (1:N)
-- =====================================================
CREATE TABLE IF NOT EXISTS RecetaPrimaria (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    unidadMedida TEXT,  -- kg, g, l, ml, unidad, porcion
    cantidadResultante REAL DEFAULT 1,
    costoTotal REAL DEFAULT 0,
    costoPorUnidad REAL DEFAULT 0,
    tiempoPreparacion INTEGER,  -- en minutos
    instrucciones TEXT,
    activa INTEGER DEFAULT 1
);

-- =====================================================
-- TABLA: DetalleRecetaPrimaria
-- Ingredientes/componentes de una receta primaria
-- Relaciones: RecetaPrimaria (N:1)
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

-- Índice para buscar detalles por receta
CREATE INDEX IF NOT EXISTS idx_detalle_receta_primaria ON DetalleRecetaPrimaria(recetaPrimariaId);

-- =====================================================
-- TABLA: RecetaSecundaria
-- Almacena recetas secundarias (preparaciones compuestas)
-- Relaciones: DetalleRecetaSecundaria (1:N)
-- =====================================================
CREATE TABLE IF NOT EXISTS RecetaSecundaria (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    unidadMedida TEXT,  -- kg, g, l, ml, unidad, porcion
    cantidadResultante REAL DEFAULT 1,
    costoTotal REAL DEFAULT 0,
    costoPorUnidad REAL DEFAULT 0,
    tiempoPreparacion INTEGER,  -- en minutos
    instrucciones TEXT,
    activa INTEGER DEFAULT 1
);

-- =====================================================
-- TABLA: DetalleRecetaSecundaria
-- Ingredientes/componentes de una receta secundaria
-- Relaciones: RecetaSecundaria (N:1)
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

-- Índice para buscar detalles por receta
CREATE INDEX IF NOT EXISTS idx_detalle_receta_secundaria ON DetalleRecetaSecundaria(recetaSecundariaId);

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
-- Relaciones: PagoCuentaPorCobrar (1:N)
-- =====================================================
CREATE TABLE IF NOT EXISTS CuentaPorCobrar (
    id TEXT PRIMARY KEY,
    clienteNombre TEXT,
    monto REAL NOT NULL,
    estado TEXT DEFAULT 'pendiente',  -- pendiente, pagada, vencida
    vencimiento TEXT
);

-- =====================================================
-- TABLA: PagoCuentaPorCobrar
-- Registra pagos de cuentas por cobrar
-- Relaciones: CuentaPorCobrar (N:1)
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
-- TABLA: PagoMixto
-- Registra pagos con múltiples métodos de pago
-- Relaciones: Venta (N:1)
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
-- DATOS INICIALES (SEED)
-- =====================================================

-- Insertar usuario administrador por defecto
-- Contraseña: admin123 (hash bcrypt)
INSERT OR IGNORE INTO Usuario (id, email, password, nombre, rol, activo)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'admin',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'Administrador',
    'administrador',
    1
);

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
-- VERIFICACIÓN DE TABLAS CREADAS
-- =====================================================
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================

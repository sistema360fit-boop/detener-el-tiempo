-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha_hora" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_venta" REAL NOT NULL,
    "metodo_pago" TEXT,
    "total_cop" REAL,
    "total_ves" REAL,
    "monto_original" REAL,
    "moneda_original" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DetalleVenta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventaId" TEXT NOT NULL,
    "platoId" TEXT,
    "platoNombre" TEXT,
    "cantidad" REAL NOT NULL,
    "precioUnitario" REAL NOT NULL,
    "subtotal" REAL NOT NULL,
    CONSTRAINT "DetalleVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ingrediente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "cantidad_disponible" REAL NOT NULL DEFAULT 0,
    "cantidad_minima" REAL NOT NULL DEFAULT 0,
    "unidad_medida" TEXT,
    "unidad_receta" TEXT,
    "factor_conversion" REAL NOT NULL DEFAULT 1,
    "costo_por_unidad" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Plato" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "precio" REAL NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Receta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platoId" TEXT NOT NULL,
    "ingredienteId" TEXT NOT NULL,
    "ingredienteNombre" TEXT,
    "cantidad_requerida" REAL NOT NULL,
    "costo_ingrediente" REAL DEFAULT 0,
    CONSTRAINT "Receta_platoId_fkey" FOREIGN KEY ("platoId") REFERENCES "Plato" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comanda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero_comanda" TEXT NOT NULL,
    "mesa_numero" TEXT,
    "mesero_nombre" TEXT,
    "fecha_apertura" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_cierre" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "total_comanda" REAL NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "DetalleComanda" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comandaId" TEXT NOT NULL,
    "platoId" TEXT,
    "platoNombre" TEXT,
    "cantidad" REAL NOT NULL,
    "precio" REAL NOT NULL,
    CONSTRAINT "DetalleComanda_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Adelanto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empleadoId" TEXT,
    "empleado" TEXT,
    "monto" REAL NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AlertaStock" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ingredienteId" TEXT,
    "ingredienteNombre" TEXT,
    "cantidad_actual" REAL,
    "cantidad_minima" REAL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CategoriaGasto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DetalleRecetaPrimaria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recetaPrimariaId" TEXT NOT NULL,
    "ingredienteId" TEXT,
    "ingredienteNombre" TEXT,
    "tipoElemento" TEXT,
    "cantidad" REAL NOT NULL,
    "unidadMedida" TEXT,
    "costoIngrediente" REAL DEFAULT 0,
    CONSTRAINT "DetalleRecetaPrimaria_recetaPrimariaId_fkey" FOREIGN KEY ("recetaPrimariaId") REFERENCES "RecetaPrimaria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DetalleRecetaSecundaria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recetaSecundariaId" TEXT NOT NULL,
    "elementoId" TEXT,
    "elementoNombre" TEXT,
    "tipoElemento" TEXT,
    "cantidad" REAL NOT NULL,
    "unidadMedida" TEXT,
    "costoElemento" REAL DEFAULT 0,
    CONSTRAINT "DetalleRecetaSecundaria_recetaSecundariaId_fkey" FOREIGN KEY ("recetaSecundariaId") REFERENCES "RecetaSecundaria" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SesionUsuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" TEXT,
    "token" TEXT,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiracion" DATETIME,
    CONSTRAINT "SesionUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "proveedor" TEXT,
    "total" REAL NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CuentaPorCobrar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "clienteNombre" TEXT,
    "monto" REAL NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "vencimiento" DATETIME
);

-- CreateTable
CREATE TABLE "Empleado" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "rol" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoriaId" TEXT,
    "categoriaNombre" TEXT,
    "monto" REAL NOT NULL,
    "descripcion" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "HistorialCostoIngrediente" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ingredienteId" TEXT NOT NULL,
    "costoAnterior" REAL,
    "costoNuevo" REAL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LogLimpieza" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ubicacion" TEXT,
    "realizadoPor" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT
);

-- CreateTable
CREATE TABLE "PagoCuentaPorCobrar" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cuentaId" TEXT NOT NULL,
    "monto" REAL NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" TEXT
);

-- CreateTable
CREATE TABLE "PagoMixto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ventaId" TEXT,
    "monto" REAL NOT NULL,
    "metodo" TEXT,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RecetaPrimaria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidadMedida" TEXT,
    "cantidadResultante" REAL NOT NULL DEFAULT 1,
    "costoTotal" REAL NOT NULL DEFAULT 0,
    "costoPorUnidad" REAL NOT NULL DEFAULT 0,
    "tiempoPreparacion" INTEGER,
    "instrucciones" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "RecetaSecundaria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidadMedida" TEXT,
    "cantidadResultante" REAL NOT NULL DEFAULT 1,
    "costoTotal" REAL NOT NULL DEFAULT 0,
    "costoPorUnidad" REAL NOT NULL DEFAULT 0,
    "tiempoPreparacion" INTEGER,
    "instrucciones" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "TasaCambio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "monedaOrigen" TEXT NOT NULL,
    "monedaDestino" TEXT NOT NULL,
    "tasa" REAL NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'administrador',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

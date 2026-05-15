-- CreateTable
CREATE TABLE "Venta" (
    "id" TEXT NOT NULL,
    "fecha_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_venta" DOUBLE PRECISION NOT NULL,
    "metodo_pago" TEXT,
    "total_cop" DOUBLE PRECISION,
    "total_ves" DOUBLE PRECISION,
    "monto_original" DOUBLE PRECISION,
    "moneda_original" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Venta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleVenta" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT NOT NULL,
    "platoId" TEXT,
    "platoNombre" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precioUnitario" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DetalleVenta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ingrediente" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cantidad_disponible" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cantidad_minima" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unidad_medida" TEXT,
    "unidad_receta" TEXT,
    "factor_conversion" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "costo_por_unidad" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ingrediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plato" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Receta" (
    "id" TEXT NOT NULL,
    "platoId" TEXT NOT NULL,
    "ingredienteId" TEXT NOT NULL,
    "ingredienteNombre" TEXT,
    "cantidad_requerida" DOUBLE PRECISION NOT NULL,
    "costo_ingrediente" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "Receta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comanda" (
    "id" TEXT NOT NULL,
    "numero_comanda" TEXT NOT NULL,
    "mesa_numero" TEXT,
    "mesero_nombre" TEXT,
    "fecha_apertura" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fecha_cierre" TIMESTAMP(3),
    "estado" TEXT NOT NULL DEFAULT 'abierta',
    "total_comanda" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "Comanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleComanda" (
    "id" TEXT NOT NULL,
    "comandaId" TEXT NOT NULL,
    "platoId" TEXT,
    "platoNombre" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "DetalleComanda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Adelanto" (
    "id" TEXT NOT NULL,
    "empleadoId" TEXT,
    "empleado" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Adelanto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertaStock" (
    "id" TEXT NOT NULL,
    "ingredienteId" TEXT,
    "ingredienteNombre" TEXT,
    "cantidad_actual" DOUBLE PRECISION,
    "cantidad_minima" DOUBLE PRECISION,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertaStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoriaGasto" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoriaGasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleRecetaPrimaria" (
    "id" TEXT NOT NULL,
    "recetaPrimariaId" TEXT NOT NULL,
    "ingredienteId" TEXT,
    "ingredienteNombre" TEXT,
    "tipoElemento" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "unidadMedida" TEXT,
    "costoIngrediente" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "DetalleRecetaPrimaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetalleRecetaSecundaria" (
    "id" TEXT NOT NULL,
    "recetaSecundariaId" TEXT NOT NULL,
    "elementoId" TEXT,
    "elementoNombre" TEXT,
    "tipoElemento" TEXT,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "unidadMedida" TEXT,
    "costoElemento" DOUBLE PRECISION DEFAULT 0,

    CONSTRAINT "DetalleRecetaSecundaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SesionUsuario" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT,
    "token" TEXT,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiracion" TIMESTAMP(3),

    CONSTRAINT "SesionUsuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compra" (
    "id" TEXT NOT NULL,
    "proveedor" TEXT,
    "total" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Compra_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuentaPorCobrar" (
    "id" TEXT NOT NULL,
    "clienteNombre" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'pendiente',
    "vencimiento" TIMESTAMP(3),

    CONSTRAINT "CuentaPorCobrar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empleado" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "usuario" TEXT,
    "password" TEXT,
    "rol" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Empleado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT,
    "categoriaNombre" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistorialCostoIngrediente" (
    "id" TEXT NOT NULL,
    "ingredienteId" TEXT NOT NULL,
    "costoAnterior" DOUBLE PRECISION,
    "costoNuevo" DOUBLE PRECISION,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialCostoIngrediente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogLimpieza" (
    "id" TEXT NOT NULL,
    "ubicacion" TEXT,
    "realizadoPor" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,

    CONSTRAINT "LogLimpieza_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoCuentaPorCobrar" (
    "id" TEXT NOT NULL,
    "cuentaId" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" TEXT,

    CONSTRAINT "PagoCuentaPorCobrar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoMixto" (
    "id" TEXT NOT NULL,
    "ventaId" TEXT,
    "monto" DOUBLE PRECISION NOT NULL,
    "metodo" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoMixto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecetaPrimaria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidadMedida" TEXT,
    "cantidadResultante" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "costoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoPorUnidad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tiempoPreparacion" INTEGER,
    "instrucciones" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RecetaPrimaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecetaSecundaria" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "unidadMedida" TEXT,
    "cantidadResultante" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "costoTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costoPorUnidad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tiempoPreparacion" INTEGER,
    "instrucciones" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RecetaSecundaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TasaCambio" (
    "id" TEXT NOT NULL,
    "monedaOrigen" TEXT NOT NULL,
    "monedaDestino" TEXT NOT NULL,
    "tasa" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TasaCambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "rol" TEXT NOT NULL DEFAULT 'administrador',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- AddForeignKey
ALTER TABLE "DetalleVenta" ADD CONSTRAINT "DetalleVenta_ventaId_fkey" FOREIGN KEY ("ventaId") REFERENCES "Venta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Receta" ADD CONSTRAINT "Receta_platoId_fkey" FOREIGN KEY ("platoId") REFERENCES "Plato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleComanda" ADD CONSTRAINT "DetalleComanda_comandaId_fkey" FOREIGN KEY ("comandaId") REFERENCES "Comanda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleRecetaPrimaria" ADD CONSTRAINT "DetalleRecetaPrimaria_recetaPrimariaId_fkey" FOREIGN KEY ("recetaPrimariaId") REFERENCES "RecetaPrimaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetalleRecetaSecundaria" ADD CONSTRAINT "DetalleRecetaSecundaria_recetaSecundariaId_fkey" FOREIGN KEY ("recetaSecundariaId") REFERENCES "RecetaSecundaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SesionUsuario" ADD CONSTRAINT "SesionUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

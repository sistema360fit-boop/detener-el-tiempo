# Scripts SQL para el Sistema de Gestión de Restaurante

Este directorio contiene scripts SQL para crear y gestionar la base de datos del sistema.

## 📁 Archivos

### 1. `create_tables.sql`
Script completo que crea **todas las tablas** del sistema con sus relaciones e índices.

**Tablas incluidas:**
- Usuario
- Empleado
- SesionUsuario
- Ingrediente
- HistorialCostoIngrediente
- AlertaStock
- Plato
- Receta
- RecetaPrimaria
- DetalleRecetaPrimaria
- RecetaSecundaria
- DetalleRecetaSecundaria
- Comanda
- DetalleComanda
- Venta
- DetalleVenta
- PagoMixto
- Gasto
- CategoriaGasto
- Adelanto
- Compra
- CuentaPorCobrar
- PagoCuentaPorCobrar
- TasaCambio
- LogLimpieza

### 2. `create_empleados_adelantos_tables.sql`
Script enfocado en las tablas de **empleados, adelantos y entidades relacionadas**.

**Tablas incluidas:**
- Empleado
- Adelanto
- Usuario
- SesionUsuario
- Gasto
- CategoriaGasto
- Venta
- DetalleVenta
- Comanda
- DetalleComanda
- Ingrediente
- HistorialCostoIngrediente
- AlertaStock
- Plato
- Receta
- RecetaPrimaria
- DetalleRecetaPrimaria
- RecetaSecundaria
- DetalleRecetaSecundaria
- Compra
- CuentaPorCobrar
- PagoCuentaPorCobrar
- PagoMixto
- TasaCambio
- LogLimpieza

### 3. `run_sql_scripts.js`
Script Node.js para ejecutar los scripts SQL en la base de datos SQLite.

## 🚀 Uso

### Ejecutar con Node.js
```bash
node scripts/run_sql_scripts.js
```

### Ejecutar directamente con SQLite
```bash
sqlite3 prisma/dev.db < scripts/create_tables.sql
```

### Ejecutar solo tablas de empleados y adelantos
```bash
sqlite3 prisma/dev.db < scripts/create_empleados_adelantos_tables.sql
```

## 📊 Estructura de Datos

### Empleado
```sql
CREATE TABLE Empleado (
    id TEXT PRIMARY KEY,
    nombre TEXT NOT NULL,
    usuario TEXT,  -- Username para login
    rol TEXT,  -- administrador, mesero, cocinero, cajero
    activo INTEGER DEFAULT 1,
    createdAt TEXT DEFAULT (datetime('now'))
);
```

### Adelanto
```sql
CREATE TABLE Adelanto (
    id TEXT PRIMARY KEY,
    empleadoId TEXT,  -- FK a Empleado
    empleado TEXT,  -- Nombre del empleado (denormalizado)
    monto REAL NOT NULL,
    fecha TEXT DEFAULT (datetime('now')),
    descripcion TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (empleadoId) REFERENCES Empleado(id) ON DELETE SET NULL
);
```

### Relaciones Principales

```
Usuario (1) ──────┬──── SesionUsuario (N)
                  │
Empleado (1) ─────┼──── Adelanto (N)
                  │
Plato (1) ────────┼──── Receta (N)
                  │
Ingrediente (1) ──┼──── Receta (N)
                  │
Comanda (1) ──────┼──── DetalleComanda (N)
                  │
Venta (1) ────────┼──── DetalleVenta (N)
                  │
RecetaPrimaria (1) ── DetalleRecetaPrimaria (N)
                  │
RecetaSecundaria (1) ── DetalleRecetaSecundaria (N)
```

## 🔐 Datos Iniciales (Seed)

Los scripts incluyen datos iniciales:

- **Usuario administrador:**
  - Email: `admin`
  - Contraseña: `admin123` (hash bcrypt)
  - Rol: `administrador`

- **Empleado administrador:**
  - Nombre: `Administrador`
  - Usuario: `admin`
  - Rol: `administrador`

## 📝 Notas

1. **Claves foráneas:** SQLite requiere `PRAGMA foreign_keys = ON` para habilitar las restricciones de clave foránea.

2. **Denormalización:** Algunos campos como `empleado` en la tabla `Adelanto` están denormalizados para mantener el histórico aunque el empleado sea eliminado.

3. **Índices:** Se crean índices en campos frecuentemente consultados para mejorar el rendimiento.

4. **UUIDs:** Todas las claves primarias usan UUIDs generados por la aplicación.

5. **Fechas:** Las fechas se almacenan como texto en formato ISO 8601 usando `datetime('now')` de SQLite.

## 🛠️ Mantenimiento

### Verificar tablas existentes
```sql
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
```

### Verificar índices
```sql
SELECT name FROM sqlite_master WHERE type='index' ORDER BY name;
```

### Backup de la base de datos
```bash
cp prisma/dev.db prisma/dev.db.backup
```

### Restaurar backup
```bash
cp prisma/dev.db.backup prisma/dev.db
```

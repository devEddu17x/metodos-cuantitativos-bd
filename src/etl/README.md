# ETL Pipeline - Modelo Estrella

Este directorio contiene el proceso completo de **Extract, Transform, Load (ETL)** que puebla el modelo estrella (star schema) a partir del modelo entidad-relación (ER).

## 📋 Requisitos Previos

Antes de ejecutar el ETL, asegúrate de:

1. ✅ La base de datos **`dumi`** (ER) debe estar poblada con datos
2. ✅ La base de datos **`star_schema_dumi`** debe existir con su estructura creada
3. ✅ Las variables de entorno deben estar configuradas (`.env`)

## 🚀 Ejecución

⚠️ **NOTA**: El ETL está parcialmente implementado. Las **9 dimensiones** funcionan correctamente, pero la **tabla de hechos h_venta** requiere refactorización. Ver [`docs/ETL_PENDING_REFACTOR.md`](../../docs/ETL_PENDING_REFACTOR.md) para detalles.

Para ejecutar el proceso ETL completo:

```bash
pnpm etl
```

**Estado actual**:

- ✅ Carga de dimensiones (9 dimensiones) - FUNCIONA
- ❌ Carga de tabla de hechos (h_venta) - PENDIENTE

Este comando orquesta automáticamente:

1. **Carga de dimensiones** (9 dimensiones) ✅
2. **Carga de la tabla de hechos** (h_venta) ❌

### 🧹 Limpiar el Modelo Estrella

Si necesitas reiniciar el proceso ETL (por ejemplo, después de un error):

```bash
# Limpiar todas las tablas del modelo estrella
pnpm clean:star

# Luego volver a ejecutar el ETL
pnpm etl
```

El comando `clean:star` ejecuta `TRUNCATE` en todas las tablas del star schema, respetando las foreign keys.

## 🗂️ Estructura

```
src/etl/
├── etl-master.ts              # Orquestador principal
├── dimensions/                # ETL de dimensiones
│   ├── tiempo.etl.ts         # Calendario 2020-2030
│   ├── empleado.etl.ts       # Empleados
│   ├── cliente.etl.ts        # Clientes (JOIN natural + juridico)
│   ├── proveedor.etl.ts      # Proveedores
│   ├── material.etl.ts       # Materiales
│   ├── prenda.etl.ts         # Prendas (JOIN prenda + talla)
│   ├── direccion.etl.ts      # Direcciones
│   ├── metodo-pago.etl.ts    # Métodos de pago (DISTINCT)
│   └── estado-pedido.etl.ts  # Estados (DISTINCT)
└── facts/
    └── h-venta.etl.ts        # Hechos de venta con métricas calculadas
```

## 📊 Dimensiones

### 1. `d_tiempo` (Calendario)

- **Tipo**: Generación de calendario
- **Rango**: 2020-01-01 a 2030-12-31 (~4,018 días)
- **Campos generados**:
  - fecha_completa, ano, trimestre, mes, nombre_mes
  - dia_del_mes, dia_de_la_semana, semana_del_ano, es_fin_de_semana
- **Role-playing**: 8 claves foráneas en `h_venta`

### 2. `d_empleado`

- **Mapeo**: 1:1 desde `empleado`
- **Transformaciones**: Concatena `nombres + apellidos`
- **Role-playing**: 3 claves (vendedor, despachador, cobrador)

### 3. `d_cliente`

- **Mapeo**: N:1 desde `cliente` + `cliente_natural/juridico`
- **Transformaciones**: Crea `nombre_completo_cliente` según tipo

### 4. `d_proveedor`

- **Mapeo**: 1:1 desde `proveedor`

### 5. `d_material`

- **Mapeo**: 1:1 desde `material`
- **Incluye**: precio de compra, unidad de medida

### 6. `d_prenda`

- **Mapeo**: N:1 desde `prenda + prenda_talla + talla`
- **Granularidad**: Cada prenda-talla es una fila
- **Incluye**: precio de venta por talla

### 7. `d_direccion`

- **Mapeo**: 1:1 desde `direccion`

### 8. `d_metodo_pago`

- **Tipo**: `SELECT DISTINCT metodo_pago FROM pago`
- **Role-playing**: 2 claves (pago1, pago2)

### 9. `d_estado_pedido`

- **Tipo**: `SELECT DISTINCT estado FROM pedido`

## 💰 Tabla de Hechos: `h_venta`

### Granularidad

Una fila por cada `detalle_cotizacion` de cotizaciones **APROBADAS** que generaron pedido.

### Métricas Calculadas

#### Montos

- **monto_total_linea** = `cantidad × precio_unitario`
- **costo_unitario_material** = `Σ(precio_material/cantidad_base × cantidad_usada)`
- **costo_total_linea** = `costo_unitario_material × cantidad`
- **margen_bruto** = `monto_total_linea - costo_total_linea`

#### Prorrateo de Pagos

```typescript
porcentaje_linea = monto_total_linea / total_pedido
monto_pago1_prorrateado = monto_pago1 × porcentaje_linea
monto_pago2_prorrateado = monto_pago2 × porcentaje_linea
```

#### Días Transcurridos

- **dias_cotizacion_a_pedido** = `DATEDIFF(fecha_pedido, fecha_cotizacion)`
- **dias_pedido_a_entrega** = `DATEDIFF(fecha_entrega_real, fecha_pedido)`

### Query Principal

El ETL de `h_venta` realiza un JOIN complejo:

```sql
SELECT ...
FROM detalle_cotizacion dc
INNER JOIN cotizacion c ON dc.cotizacion_id = c.id
INNER JOIN pedido ped ON c.id = ped.cotizacion_id
INNER JOIN pago pag1 ON ped.id = pag1.pedido_id AND pag1.numero_pago_pedido = 1
INNER JOIN pago pag2 ON ped.id = pag2.pedido_id AND pag2.numero_pago_pedido = 2
WHERE c.estado = 'APROBADA'
```

### Optimizaciones

1. **Maps para lookup de IDs**:

   - Carga todas las dimensiones en memoria como `Map<natural_key, surrogate_key>`
   - Evita N queries de lookup por cada registro

2. **Cálculo de costos con JSON**:

   - Usa `JSON_ARRAYAGG` en MySQL para obtener todos los materiales en 1 query
   - Procesa el JSON en TypeScript para calcular costo total

3. **Batch inserts**:
   - Inserta en lotes de 500 registros
   - Reduce sobrecarga de conexiones

## 🔄 Orden de Ejecución

El orquestador (`etl-master.ts`) ejecuta en este orden:

```
FASE 1: Dimensiones
  1. d_tiempo (secuencial, genera calendario)
  2. Paralelo: d_empleado, d_proveedor, d_material, d_direccion
  3. Paralelo: d_cliente, d_prenda (requieren JOINs)
  4. Paralelo: d_metodo_pago, d_estado_pedido (DISTINCT)

FASE 2: Hechos
  5. h_venta (secuencial, depende de todas las dimensiones)
```

## 📈 Volumen de Datos Esperado

Asumiendo seeds default:

- **d_tiempo**: ~4,018 registros (11 años)
- **d_empleado**: 24 registros
- **d_cliente**: 30 registros
- **d_proveedor**: 50 registros
- **d_material**: 100 registros
- **d_prenda**: ~700 registros (100 prendas × 7 tallas)
- **d_direccion**: 100 registros
- **d_metodo_pago**: 5 registros (EFECTIVO, YAPE, PLIN, TRANSFERENCIA, TARJETA)
- **d_estado_pedido**: 1 registro (EN_PROCESO)
- **h_venta**: ~2,736 registros (456 pedidos × ~6 detalles promedio)

## 🛠️ Troubleshooting

### Error: "Duplicate entry" o datos duplicados

- El ETL detectó datos existentes en el star schema
- Solución: `pnpm clean:star` y luego `pnpm etl`

### Error: "No hay ventas para cargar"

- Verifica que existan cotizaciones **APROBADAS** en el ER
- Ejecuta: `pnpm seed:quotation`

### Error: "Cannot find module..."

- Verifica que todas las dimensiones existan en `src/etl/dimensions/`
- Ejecuta: `pnpm install`

### Error de conexión a bases de datos

- Verifica `.env` tiene `MYSQL_DATABASE` y `MYSQL_STAR_SCHEMA`
- Verifica que ambas bases de datos existan en MySQL

### Performance lento

- Verifica que las tablas del ER tengan índices apropiados
- El ETL completo debería tomar entre 10-30 segundos con volumen default

## 📚 Documentación Relacionada

- [`docs/STAR_SCHEMA.md`](../docs/STAR_SCHEMA.md): Documentación completa del modelo estrella
- [`docs/SEEDING_STAR_SCHEMA.md`](../docs/SEEDING_STAR_SCHEMA.md): Guía detallada del proceso ETL (si existe)

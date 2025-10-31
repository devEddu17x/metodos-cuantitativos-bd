# Modelo Estrella - Star Schema

Este directorio contiene el esquema de base de datos dimensional (modelo estrella) para análisis OLAP.

## Estructura

### Tabla de Hechos (Fact Table)

**`h_venta`** - Registra cada venta con todas sus métricas y relaciones

- Métricas de negocio: cantidad, precio_unitario, monto_total_linea, margen_bruto
- Métricas de pagos: monto_primer_pago_prorrateado, monto_segundo_pago_prorrateado
- Métricas de tiempo: dias_cotizacion_a_pedido, dias_pedido_a_entrega
- Foreign Keys a todas las dimensiones

### Tablas de Dimensión (Dimension Tables)

1. **`d_tiempo`** - Dimensión temporal

   - Granularidad: día
   - Atributos: año, trimestre, mes, día, semana, es_fin_de_semana
   - Permite análisis temporal de ventas

2. **`d_cliente`** - Dimensión de clientes

   - Información del cliente (natural o jurídico)
   - Documento de identidad, tipo de cliente
   - Datos de contacto y referidos

3. **`d_empleado`** - Dimensión de empleados

   - Información completa del empleado
   - Email, cargo
   - Usado para ventas, cotizaciones y pagos

4. **`d_prenda`** - Dimensión de prendas

   - Información de la prenda con talla
   - Nombre, descripción, diseño
   - Categoría y talla

5. **`d_material`** - Dimensión de materiales

   - Materiales usados en producción
   - Precio de compra, unidad de medida
   - Categoría

6. **`d_proveedor`** - Dimensión de proveedores

   - Información del proveedor
   - Razón social, representante, contacto

7. **`d_direccion`** - Dimensión geográfica

   - Jerarquía: Departamento → Provincia → Distrito → Calle
   - Permite análisis por ubicación

8. **`d_metodo_pago`** - Dimensión de métodos de pago

   - EFECTIVO, YAPE, PLIN, TRANSFERENCIA, TARJETA

9. **`d_estado_pedido`** - Dimensión de estados
   - Estados del pedido
   - Tipo de estado

## Configuración

### Variables de Entorno

Agregar al archivo `.env`:

```env
MYSQL_STAR_SCHEMA=star_schema_dumi
```

### Crear el Schema

```bash
npm run seed:star-schema
```

## Análisis Posibles

Con este modelo estrella puedes realizar:

1. **Análisis de Ventas**

   - Ventas por tiempo (día, mes, trimestre, año)
   - Ventas por cliente, prenda, región
   - Tendencias de ventas

2. **Análisis de Rentabilidad**

   - Margen bruto por producto
   - Costos de materiales vs precio de venta
   - Rentabilidad por cliente/región

3. **Análisis de Pagos**

   - Métodos de pago más utilizados
   - Distribución de pagos por empleado
   - Análisis de adelantos vs cancelaciones

4. **Análisis de Operaciones**

   - Tiempos de entrega (estimado vs real)
   - Días desde cotización hasta pedido
   - Días desde pedido hasta entrega
   - Eficiencia operativa

5. **Análisis de Proveedores**
   - Materiales por proveedor
   - Costos de materiales
   - Análisis de cadena de suministro

## Ejemplo de Consultas

### Ventas por mes

```sql
SELECT
  t.ano,
  t.mes,
  t.nombre_mes,
  SUM(v.monto_total_linea) as total_ventas,
  COUNT(DISTINCT v.cliente_id) as num_clientes
FROM h_venta v
JOIN d_tiempo t ON v.tiempo_pedido_id = t.tiempo_id
GROUP BY t.ano, t.mes, t.nombre_mes
ORDER BY t.ano, t.mes;
```

### Margen bruto por prenda

```sql
SELECT
  p.nombre_prenda,
  p.talla_prenda,
  AVG(v.margen_bruto) as margen_promedio,
  SUM(v.cantidad) as cantidad_vendida
FROM h_venta v
JOIN d_prenda p ON v.prenda_id = p.prenda_id
GROUP BY p.nombre_prenda, p.talla_prenda
ORDER BY margen_promedio DESC;
```

### Ventas por región

```sql
SELECT
  d.departamento,
  d.provincia,
  COUNT(*) as num_ventas,
  SUM(v.monto_total_linea) as total_ventas
FROM h_venta v
JOIN d_direccion d ON v.direccion_id = d.direccion_id
GROUP BY d.departamento, d.provincia
ORDER BY total_ventas DESC;
```

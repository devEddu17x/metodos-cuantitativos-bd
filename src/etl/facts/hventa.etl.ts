import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";
import { RowDataPacket, PoolConnection } from "mysql2/promise";

interface VentaPacket extends RowDataPacket {
    cotizacion_id: number;
    prenda_id: number;
    talla_id: number;
    cantidad: number;
    precio_unitario: number;
    cliente_id: number;
    empleado_vendedor_id: number;
    fecha_cotizacion: string;
    pedido_id: number;
    direccion_id: number;
    total_pedido: number;
    fecha_pedido: string;
    fecha_entrega_estimada: string;
    fecha_entrega_real: string;
    estado_pedido: string;
    pago1_id: number;
    numero_pago1: number;
    empleado_cobrador_id: number;
    fecha_pago1: string;
    monto_pago1: number;
    pago2_id: number;
    numero_pago2: number;
    empleado_cobrador2_id: number;
    fecha_pago2: string;
    monto_pago2: number;
    material_id: number | null;
    proveedor_id: number | null;
    cantidad_material: number | null;
    precio_material: number | null;
    cantidad_base_material: number | null;
}

export async function loadFactHVenta() {
    const oltp = await pool.getConnection();
    const olap = await starSchemaPool.getConnection();
    console.log("💰 Cargando tabla de hechos h_venta...");

    try {
        const query = `
      SELECT 
        dc.cotizacion_id,
        dc.prenda_id,
        dc.talla_id,
        dc.cantidad,
        dc.precio_unitario,
        c.cliente_id,
        c.empleado_id as empleado_vendedor_id,
        DATE(c.fecha_cotizacion) as fecha_cotizacion,
        ped.id as pedido_id,
        ped.direccion_id,
        ped.total as total_pedido,
        DATE(ped.fecha_emision) as fecha_pedido,
        DATE(ped.fecha_entrega_estimada) as fecha_entrega_estimada,
        DATE(ped.fecha_entrega_real) as fecha_entrega_real,
        ped.estado as estado_pedido,
        pag1.id as pago1_id,
        pag1.numero_pago_pedido as numero_pago1,
        pag1.empleado_id as empleado_cobrador_id,
        DATE(pag1.fecha) as fecha_pago1,
        pag1.monto as monto_pago1,
        pag2.id as pago2_id,
        pag2.numero_pago_pedido as numero_pago2,
        pag2.empleado_id as empleado_cobrador2_id,
        DATE(pag2.fecha) as fecha_pago2,
        pag2.monto as monto_pago2,
        (SELECT m.id FROM prenda_talla_material ptm
         INNER JOIN material m ON ptm.material_id = m.id
         WHERE ptm.prenda_id = dc.prenda_id AND ptm.talla_id = dc.talla_id
         LIMIT 1) as material_id,
        (SELECT pm.proveedor_id FROM prenda_talla_material ptm
         INNER JOIN material m ON ptm.material_id = m.id
         INNER JOIN proveedor_material pm ON m.id = pm.material_id
         WHERE ptm.prenda_id = dc.prenda_id AND ptm.talla_id = dc.talla_id
         LIMIT 1) as proveedor_id,
        (SELECT ptm.cantidad FROM prenda_talla_material ptm
         WHERE ptm.prenda_id = dc.prenda_id AND ptm.talla_id = dc.talla_id
         LIMIT 1) as cantidad_material,
        (SELECT m.precio FROM prenda_talla_material ptm
         INNER JOIN material m ON ptm.material_id = m.id
         WHERE ptm.prenda_id = dc.prenda_id AND ptm.talla_id = dc.talla_id
         LIMIT 1) as precio_material,
        (SELECT m.cantidad_base FROM prenda_talla_material ptm
         INNER JOIN material m ON ptm.material_id = m.id
         WHERE ptm.prenda_id = dc.prenda_id AND ptm.talla_id = dc.talla_id
         LIMIT 1) as cantidad_base_material
      FROM detalle_cotizacion dc
      INNER JOIN cotizacion c ON dc.cotizacion_id = c.id
      INNER JOIN pedido ped ON c.id = ped.cotizacion_id
      INNER JOIN pago pag1 ON ped.id = pag1.pedido_id AND pag1.numero_pago_pedido = 1
      INNER JOIN pago pag2 ON ped.id = pag2.pedido_id AND pag2.numero_pago_pedido = 2
      WHERE c.estado = 'APROBADA'
    `;

        const [ventas] = await oltp.query<VentaPacket[]>(query);

        if (ventas.length === 0) {
            console.log("   ⚠️ No hay ventas para cargar");
            return;
        }

        console.log(`   🔄 Procesando ${ventas.length} registros de venta...`);

        const tiempoMap = await createTiempoMap(olap);
        const estadoPedidoMap = await createEstadoPedidoMap(olap);
        const prendaMap = await createPrendaMap(olap);

        const records: any[] = [];
        let skippedFechas = 0;
        let skippedEstado = 0;
        let skippedPrenda = 0;

        for (const v of ventas) {
            const tiempoIdCotizacion = tiempoMap.get(formatDate(v.fecha_cotizacion));
            const tiempoIdPedido = tiempoMap.get(formatDate(v.fecha_pedido));
            const tiempoIdEntregaEstimada = tiempoMap.get(formatDate(v.fecha_entrega_estimada));
            const tiempoIdEntregaReal = tiempoMap.get(formatDate(v.fecha_entrega_real));
            const tiempoIdPago1 = tiempoMap.get(formatDate(v.fecha_pago1));
            const tiempoIdPago2 = tiempoMap.get(formatDate(v.fecha_pago2));

            if (!tiempoIdCotizacion || !tiempoIdPedido || !tiempoIdEntregaEstimada ||
                !tiempoIdEntregaReal || !tiempoIdPago1 || !tiempoIdPago2) {
                skippedFechas++;
                continue;
            }

            const metodoPago1Id = `${v.pago1_id}-${v.numero_pago1}`;
            const metodoPago2Id = `${v.pago2_id}-${v.numero_pago2}`;

            const estadoPedidoKey = `${v.estado_pedido}_PEDIDO`;
            const estadoPedidoId = estadoPedidoMap.get(estadoPedidoKey);
            if (!estadoPedidoId) {
                skippedEstado++;
                continue;
            }

            const prendaKey = `${v.prenda_id}_${v.talla_id}`;
            const prendaIdStarSchema = prendaMap.get(prendaKey);
            if (!prendaIdStarSchema) {
                skippedPrenda++;
                continue;
            }

            const montoTotalLinea = v.cantidad * v.precio_unitario;

            let costoUnitarioMaterial = 0;
            if (v.cantidad_material && v.precio_material && v.cantidad_base_material) {
                const precioUnitario = v.precio_material / v.cantidad_base_material;
                costoUnitarioMaterial = precioUnitario * v.cantidad_material;
            }

            const margenBruto = montoTotalLinea - (costoUnitarioMaterial * v.cantidad);
            const porcentajeLinea = montoTotalLinea / v.total_pedido;
            const montoPago1Prorrateado = v.monto_pago1 * porcentajeLinea;
            const montoPago2Prorrateado = v.monto_pago2 * porcentajeLinea;
            const diasCotizacionAPedido = dateDiff(formatDate(v.fecha_cotizacion), formatDate(v.fecha_pedido));
            const diasPedidoAEntrega = dateDiff(formatDate(v.fecha_pedido), formatDate(v.fecha_entrega_real));

            records.push([
                v.empleado_vendedor_id, tiempoIdCotizacion, tiempoIdPedido,
                tiempoIdEntregaEstimada, tiempoIdEntregaReal, tiempoIdPago1, tiempoIdPago2,
                metodoPago1Id, metodoPago2Id, v.empleado_cobrador_id, v.empleado_cobrador2_id,
                v.cliente_id, prendaIdStarSchema, v.direccion_id, estadoPedidoId,
                v.proveedor_id || 1, v.material_id || 1, v.cantidad, v.precio_unitario,
                montoTotalLinea, montoPago1Prorrateado, montoPago2Prorrateado,
                costoUnitarioMaterial, margenBruto, diasCotizacionAPedido, diasPedidoAEntrega
            ]);
        }

        if (records.length === 0) {
            console.log("   ⚠️ No se generaron registros válidos");
            console.log(`   - Saltados por fechas: ${skippedFechas}`);
            console.log(`   - Saltados por estado: ${skippedEstado}`);
            console.log(`   - Saltados por prenda: ${skippedPrenda}`);
            return;
        }

        const batchSize = 500;
        let insertedCount = 0;

        for (let i = 0; i < records.length; i += batchSize) {
            const batch = records.slice(i, i + batchSize);
            await olap.query(`
        INSERT INTO h_venta (
          cotizacion_empleado_id, tiempo_cotizacion_id, tiempo_pedido_id,
          tiempo_entrega_estimado_id, tiempo_entrega_real_id,
          tiempo_primer_pago_id, tiempo_segundo_pago_id,
          metodo_primer_pago_id, metodo_segundo_pago_id,
          primer_pago_empleado_id, segundo_pago_empleado_id,
          cliente_id, prenda_id, direccion_id, estado_pedido_id,
          proveedor_id, material_id, cantidad, precio_unitario,
          monto_total_linea, monto_primer_pago_prorrateado,
          monto_segundo_pago_prorrateado, costo_unitario_material,
          margen_bruto, dias_cotizacion_a_pedido, dias_pedido_a_entrega
        ) VALUES ?`, [batch]);
            insertedCount += batch.length;
        }

        console.log(`   ✅ ${insertedCount} registros insertados en h_venta`);
    } catch (error) {
        console.error("   ❌ Error cargando h_venta:", error);
        throw error;
    } finally {
        oltp.release();
        olap.release();
    }
}

async function createTiempoMap(conn: PoolConnection): Promise<Map<string, number>> {
    const [rows] = await conn.query<RowDataPacket[]>(`SELECT tiempo_id, fecha_completa FROM d_tiempo`);
    const map = new Map<string, number>();
    for (const row of rows) {
        const fechaFormateada = formatDate(row.fecha_completa);
        map.set(fechaFormateada, row.tiempo_id);
    }
    return map;
} async function createEstadoPedidoMap(conn: PoolConnection): Promise<Map<string, number>> {
    const [rows] = await conn.query<RowDataPacket[]>(`SELECT estado_pedido_id, descripcion_estado, tipo_estado FROM d_estado_pedido`);
    const map = new Map<string, number>();
    for (const row of rows) {
        const key = `${row.descripcion_estado}_${row.tipo_estado}`;
        map.set(key, row.estado_pedido_id);
    }
    return map;
}

async function createPrendaMap(conn: PoolConnection): Promise<Map<string, string>> {
    const oltpConn = await pool.getConnection();
    const [prendasER] = await oltpConn.query<RowDataPacket[]>(`SELECT prenda_id, talla_id FROM prenda_talla ORDER BY prenda_id, talla_id`);
    oltpConn.release();
    const map = new Map<string, string>();
    for (const pt of prendasER) {
        const key = `${pt.prenda_id}_${pt.talla_id}`;
        const value = `${pt.prenda_id}-${pt.talla_id}`;
        map.set(key, value);
    }
    return map;
}

function formatDate(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function dateDiff(from: string | Date, to: string | Date): number {
    const fromDate = typeof from === 'string' ? new Date(from) : from;
    const toDate = typeof to === 'string' ? new Date(to) : to;
    const diff = toDate.getTime() - fromDate.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}
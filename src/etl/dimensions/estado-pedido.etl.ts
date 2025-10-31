import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";
import { RowDataPacket } from "mysql2/promise";

interface EstadoPedidoPacket extends RowDataPacket {
    d_estado: string;
    tipo_origen: string;
}

export async function loadDimensionEstadoPedido() {
    const oltp = await pool.getConnection();
    const olap = await starSchemaPool.getConnection();
    console.log("📦 Cargando dimensión d_estado_pedido...");

    try {
        // Obtener estados DISTINTOS de pedido y cotización
        const [estados] = await oltp.query<EstadoPedidoPacket[]>(
            `SELECT DISTINCT d_estado, tipo_origen
             FROM (
                 SELECT estado as d_estado, 'PEDIDO' as tipo_origen FROM pedido
                 UNION
                 SELECT estado as d_estado, 'COTIZACION' as tipo_origen FROM cotizacion
             ) as estados_union
             ORDER BY tipo_origen, d_estado`
        );

        if (estados.length === 0) {
            console.log("   ⚠️ No hay estados para cargar");
            return;
        }

        const records = estados.map(e => [
            e.d_estado,      // descripcion_estado
            e.tipo_origen    // tipo_estado (PEDIDO o COTIZACION)
        ]);

        await olap.query(
            `INSERT INTO d_estado_pedido (descripcion_estado, tipo_estado) VALUES ?`,
            [records]
        );

        console.log(`   ✅ ${records.length} estados insertados (pedido + cotización)`);
    } catch (error) {
        console.error("   ❌ Error cargando d_estado_pedido:", error);
        throw error;
    } finally {
        oltp.release();
        olap.release();
    }
}

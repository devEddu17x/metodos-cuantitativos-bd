import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";
import { RowDataPacket } from "mysql2/promise";

interface EstadoPedidoPacket extends RowDataPacket {
    estado: string;
}

export async function loadDimensionEstadoPedido() {
    const oltp = await pool.getConnection();
    const olap = await starSchemaPool.getConnection();
    console.log("📦 Cargando dimensión d_estado_pedido...");

    try {
        const [estados] = await oltp.query<EstadoPedidoPacket[]>(
            `SELECT DISTINCT estado FROM pedido ORDER BY estado`
        );

        if (estados.length === 0) {
            console.log("   ⚠️ No hay estados de pedido para cargar");
            return;
        }

        const records = estados.map(e => [e.estado, e.estado]); // descripcion y tipo son iguales

        await olap.query(
            `INSERT INTO d_estado_pedido (descripcion_estado, tipo_estado) VALUES ?`,
            [records]
        );

        console.log(`   ✅ ${records.length} estados de pedido insertados`);
    } catch (error) {
        console.error("   ❌ Error cargando d_estado_pedido:", error);
        throw error;
    } finally {
        oltp.release();
        olap.release();
    }
}

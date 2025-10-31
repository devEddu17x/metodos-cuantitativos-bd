import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";
import { RowDataPacket } from "mysql2/promise";

interface MetodoPagoPacket extends RowDataPacket {
    metodo_pago: string;
}

export async function loadDimensionMetodoPago() {
    const oltp = await pool.getConnection();
    const olap = await starSchemaPool.getConnection();
    console.log("💳 Cargando dimensión d_metodo_pago...");

    try {
        const [metodos] = await oltp.query<MetodoPagoPacket[]>(
            `SELECT DISTINCT metodo_pago FROM pago ORDER BY metodo_pago`
        );

        if (metodos.length === 0) {
            console.log("   ⚠️ No hay métodos de pago para cargar");
            return;
        }

        const records = metodos.map(m => [m.metodo_pago]);

        await olap.query(
            `INSERT INTO d_metodo_pago (descripcion) VALUES ?`,
            [records]
        );

        console.log(`   ✅ ${records.length} métodos de pago insertados`);
    } catch (error) {
        console.error("   ❌ Error cargando d_metodo_pago:", error);
        throw error;
    } finally {
        oltp.release();
        olap.release();
    }
}

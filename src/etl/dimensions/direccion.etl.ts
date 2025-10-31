import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";
import { RowDataPacket } from "mysql2/promise";

interface DireccionPacket extends RowDataPacket {
    id: number;
    departamento: string;
    provincia: string;
    distrito: string;
    calle: string;
}

export async function loadDimensionDireccion() {
    const oltp = await pool.getConnection();
    const olap = await starSchemaPool.getConnection();
    console.log("📍 Cargando dimensión d_direccion...");

    try {
        const [direcciones] = await oltp.query<DireccionPacket[]>(
            `SELECT id, departamento, provincia, distrito, calle FROM direccion`
        );

        if (direcciones.length === 0) {
            console.log("   ⚠️ No hay direcciones para cargar");
            return;
        }

        const records = direcciones.map(dir => [
            dir.id,
            dir.departamento,
            dir.provincia,
            dir.distrito,
            dir.calle
        ]);

        await olap.query(
            `INSERT INTO d_direccion (direccion_id, departamento, provincia, distrito, calle_direccion)
       VALUES ?`,
            [records]
        );

        console.log(`   ✅ ${records.length} direcciones insertadas`);
    } catch (error) {
        console.error("   ❌ Error cargando d_direccion:", error);
        throw error;
    } finally {
        oltp.release();
        olap.release();
    }
}

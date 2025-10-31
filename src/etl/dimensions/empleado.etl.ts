import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";
import { RowDataPacket } from "mysql2/promise";

interface EmpleadoPacket extends RowDataPacket {
    id: number;
    nombres: string;
    apellidos: string;
    email: string;
}

export async function loadDimensionEmpleado() {
    const oltp = await pool.getConnection();
    const olap = await starSchemaPool.getConnection();
    console.log("👤 Cargando dimensión d_empleado...");

    try {
        // Extraer de ER
        const [empleados] = await oltp.query<EmpleadoPacket[]>(
            `SELECT id, nombres, apellidos, email FROM empleado`
        );

        if (empleados.length === 0) {
            console.log("   ⚠️ No hay empleados para cargar");
            return;
        }

        // Transformar y cargar a Star Schema
        const records = empleados.map(emp => [
            emp.id,
            `${emp.nombres} ${emp.apellidos}`, // nombre_completo_empleado
            emp.email,
        ]);

        await olap.query(
            `INSERT INTO d_empleado (empleado_id, nombre_completo_empleado, email_empleado)
       VALUES ?`,
            [records]
        );

        console.log(`   ✅ ${records.length} empleados insertados`);
    } catch (error) {
        console.error("   ❌ Error cargando d_empleado:", error);
        throw error;
    } finally {
        oltp.release();
        olap.release();
    }
}

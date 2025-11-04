import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";
import { RowDataPacket } from "mysql2/promise";

interface MaterialProveedorPacket extends RowDataPacket {
    material_id: number;
    proveedor_id: number;
}

export async function loadDimensionMaterialProveedor() {
    const oltp = await pool.getConnection();
    const olap = await starSchemaPool.getConnection();
    console.log("🧵🏭 Cargando tabla intermedia d_material_proveedor...");

    try {
        const [materialProveedores] = await oltp.query<MaterialProveedorPacket[]>(
            `SELECT 
                material_id,
                proveedor_id
             FROM proveedor_material
             ORDER BY material_id, proveedor_id`
        );

        if (materialProveedores.length === 0) {
            console.log("   ⚠️ No hay relaciones material-proveedor para cargar");
            return;
        }

        const records = materialProveedores.map(mp => [
            mp.material_id,
            mp.proveedor_id
        ]);

        await olap.query(
            `INSERT INTO d_material_proveedor 
             (material_id, proveedor_id)
             VALUES ?`,
            [records]
        );

        console.log(`   ✅ ${records.length} relaciones material-proveedor insertadas`);
    } catch (error) {
        console.error("   ❌ Error cargando d_material_proveedor:", error);
        throw error;
    } finally {
        oltp.release();
        olap.release();
    }
}

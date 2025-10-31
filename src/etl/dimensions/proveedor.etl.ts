import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";
import { RowDataPacket } from "mysql2/promise";

interface ProveedorPacket extends RowDataPacket {
    id: number;
    razon_social: string;
    representante: string;
    telefono: string;
}

export async function loadDimensionProveedor() {
    const oltp = await pool.getConnection();
    const olap = await starSchemaPool.getConnection();
    console.log("🏭 Cargando dimensión d_proveedor...");

    try {
        const [proveedores] = await oltp.query<ProveedorPacket[]>(
            `SELECT id, razon_social, representante, telefono FROM proveedor`
        );

        if (proveedores.length === 0) {
            console.log("   ⚠️ No hay proveedores para cargar");
            return;
        }

        const records = proveedores.map(prov => [
            prov.id,
            prov.razon_social,
            prov.representante,
            prov.telefono
        ]);

        await olap.query(
            `INSERT INTO d_proveedor (proveedor_id, razon_social_proveedor, representante_proveedor, telefono_proveedor)
       VALUES ?`,
            [records]
        );

        console.log(`   ✅ ${records.length} proveedores insertados`);
    } catch (error) {
        console.error("   ❌ Error cargando d_proveedor:", error);
        throw error;
    } finally {
        oltp.release();
        olap.release();
    }
}

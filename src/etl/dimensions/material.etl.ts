import { pool } from "../../config";
import { starSchemaPool } from "../../star-schema.config";
import { RowDataPacket } from "mysql2/promise";

interface MaterialPacket extends RowDataPacket {
    id: number;
    nombre: string;
    categoria: string;
    unidad_medida: string;
    precio: number;
}

export async function loadDimensionMaterial() {
    const oltp = await pool.getConnection();
    const olap = await starSchemaPool.getConnection();
    console.log("🧵 Cargando dimensión d_material...");

    try {
        const [materiales] = await oltp.query<MaterialPacket[]>(
            `SELECT id, nombre, categoria, unidad_medida, precio FROM material`
        );

        if (materiales.length === 0) {
            console.log("   ⚠️ No hay materiales para cargar");
            return;
        }

        const records = materiales.map(mat => [
            mat.id,
            mat.nombre,
            mat.categoria,
            mat.unidad_medida,
            mat.precio
        ]);

        await olap.query(
            `INSERT INTO d_material (material_id, nombre_material, categoria_material, unidad_medida, precio_compra_material)
       VALUES ?`,
            [records]
        );

        console.log(`   ✅ ${records.length} materiales insertados`);
    } catch (error) {
        console.error("   ❌ Error cargando d_material:", error);
        throw error;
    } finally {
        oltp.release();
        olap.release();
    }
}
